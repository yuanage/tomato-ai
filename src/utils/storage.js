import localforage from 'localforage'
import { invoke } from '@tauri-apps/api/core'
import { pushLog } from './logger'
import { emit } from './events'

/**
 * 本地存储统一入口：localForage（IndexedDB）+ Tauri 文件镜像 双写
 *
 * 设计约定（所有阶段必须遵守）：
 * 1. 所有任务、番茄记录、设置项只允许通过本模块读写，禁止直接使用 localStorage；
 * 2. 数据默认只存本地、不上云；AI 调用时仅把"当前任务文本"发给模型。
 *
 * 为什么双写：
 * 安卓 WebView 在进程被杀（从后台划掉）后 IndexedDB 存在数据丢失/损坏风险（已知问题类）。
 * 每次写入同时落一份 JSON 到应用数据目录（Tauri 原生命令，纯文件系统，不随 WebView 重置）；
 * 读取时 IndexedDB 优先，为空/报错时自动从文件镜像恢复并回写 IndexedDB。
 *
 * 详见 docs/数据持久化方案.md（选型对比、读写同步机制、异常恢复、后台清理策略）。
 */
localforage.config({
  name: 'tomato-ai',
  storeName: 'tomato_ai_data',
  description: '番茄AI 本地数据（IndexedDB），默认不上云'
})

/** 生成短唯一 ID（crypto.randomUUID 在 http 局域网等非安全上下文不可用，做降级） */
export function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// ==================== 双写核心（可注入，便于单元测试） ====================

/** 数据信封：{ v: 1, savedAt, data }（savedAt 供新鲜度比较，v 便于格式演进） */
function wrap(value) {
  return { v: 1, savedAt: Date.now(), data: value }
}

/** 解析单侧读回值 → { data, savedAt, legacy }；旧格式（无信封）标记 legacy 供迁移决策 */
export function parseSide(raw) {
  if (raw === null || raw === undefined) return { data: null, savedAt: null, legacy: false }
  if (raw && typeof raw === 'object' && raw.v === 1 && 'data' in raw && 'savedAt' in raw) {
    return { data: raw.data, savedAt: raw.savedAt, legacy: false }
  }
  return { data: raw, savedAt: null, legacy: true }
}

/**
 * 双通道比较选新（纯函数，便于测试）：
 * - 两侧都是信封 → savedAt 新者胜；相同取先者（IndexedDB）；
 * - 信封 + 遗留（旧版原始值）→ 遗留方胜：遗留数据可能含旧版本最后一次写入
 *   （旧版曾出现单侧写入失败，时间戳不可考），优先保护它；
 * - 两侧都是遗留 → 取先者（IndexedDB）。
 */
export function chooseSide(a, b) {
  const aEnv = !a.legacy
  const bEnv = !b.legacy
  if (aEnv && bEnv) {
    if (a.savedAt !== b.savedAt) return a.savedAt > b.savedAt ? a : b
    return a
  }
  if (aEnv !== bEnv) return a.legacy ? a : b
  return a
}

/**
 * 双写存储核心（纯逻辑，后端可注入）：
 * - write：两侧并行写信封，仅当两侧都失败才抛错；恰一侧失败经 onPartialFailure(side) 上报；
 * - read：并行读两侧 → savedAt 比较取新者（含旧格式迁移规则）→
 *   缺失/输家一侧由赢家数据后台修复，格式收敛为信封（杜绝"文件优先读到旧数据覆盖新数据"）；
 * - remove：两侧清除；
 * - 写队列：全部写操作串行执行（enqueue），flush() 可等待队列排空；
 * - idbTimeoutMs > 0：IndexedDB 操作加超时保护（进程被杀后 leveldb 损坏可能挂起，
 *   超时即视为该侧不可用，由另一侧兜底，避免整个应用卡死）。
 */
export function createDualStore({
  idbGet,
  idbSet,
  idbRemove,
  fsGet,
  fsSet,
  fsRemove,
  idbTimeoutMs = 0,
  onPartialFailure = null
}) {
  let queue = Promise.resolve()

  function enqueue(task) {
    const next = queue.then(task)
    queue = next.catch(() => {}) // 单次失败不阻断后续写
    return next
  }

  /** 带超时的 IndexedDB 操作（超时=抛错，由调用方按"该侧不可用"处理） */
  const guardIdb = (op) => {
    const p = op()
    return idbTimeoutMs > 0 ? withTimeout(p, idbTimeoutMs) : p
  }

  /** 单侧修复写入（走队列，失败静默——另一侧仍可用） */
  const repair = (task) => {
    enqueue(() => task().catch(() => {}))
  }

  return {
    enqueue,
    /** 双写：信封同时落两侧；仅当两侧都失败（含超时）时抛错 */
    async write(key, value) {
      await enqueue(async () => {
        const envelope = wrap(value)
        const results = await Promise.allSettled([
          guardIdb(() => idbSet(key, envelope)),
          fsSet(key, envelope)
        ])
        if (results.every((r) => r.status === 'rejected')) {
          throw new Error(`本地存储写入失败（双通道均不可用）：${key}`)
        }
        if (results[0].status === 'rejected' && results[1].status === 'fulfilled') {
          onPartialFailure?.('idb')
        } else if (results[0].status === 'fulfilled' && results[1].status === 'rejected') {
          onPartialFailure?.('fs')
        }
      })
    },
    /** 双读：并行取两侧，信封比较取新者；缺失方/输家由赢家后台修复 */
    async read(key, fallback) {
      let idbRaw = null
      let fsRaw = null
      try {
        idbRaw = await guardIdb(() => idbGet(key))
      } catch {
        idbRaw = null
        onPartialFailure?.('idb')
      }
      try {
        fsRaw = await fsGet(key)
      } catch {
        fsRaw = null
        onPartialFailure?.('fs')
      }
      const idbSide = parseSide(idbRaw)
      const fsSide = parseSide(fsRaw)
      const hasIdb = idbSide.data !== null
      const hasFs = fsSide.data !== null
      if (!hasIdb && !hasFs) return fallback
      if (hasIdb && hasFs) {
        const winner = chooseSide(idbSide, fsSide)
        if (winner === idbSide) repair(() => fsSet(key, wrap(idbSide.data)))
        else repair(() => guardIdb(() => idbSet(key, wrap(fsSide.data))))
        return winner.data
      }
      if (hasIdb) {
        repair(() => fsSet(key, wrap(idbSide.data))) // 镜像缺失/损坏：回填
        return idbSide.data
      }
      repair(() => guardIdb(() => idbSet(key, wrap(fsSide.data)))) // IndexedDB 丢失：恢复回写
      return fsSide.data
    },
    /** 删除（清空本地数据时双通道同步清除） */
    async remove(key) {
      await enqueue(() =>
        Promise.allSettled([guardIdb(() => idbRemove(key)), fsRemove(key)])
      )
    },
    /** 等待队列中所有写操作完成（生命周期钩子调用） */
    flush() {
      return queue
    }
  }
}

/** Promise 超时包装：超时拒绝并清理定时器（不取消底层操作，仅解除等待） */
function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('IndexedDB 响应超时')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// ==================== 文件镜像实现（真实 Tauri 后端） ====================

/** 运行环境是否 Tauri（Tauri v2 注入 __TAURI_INTERNALS__）。网页预览无文件镜像通道 */
const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** 允许镜像到文件的键白名单（与 Rust 侧保持一致，防注入） */
const FS_KEYS = ['tasks', 'pomodoro_records', 'settings', 'ai_agent_state', 'ai_config']

/** 文件通道调用超时：invoke 永不返回会卡死写队列，必须限时 */
const FS_TIMEOUT_MS = 5000

function fsFail(op, key, e) {
  pushLog({ at: Date.now(), type: 'storage-fs', msg: `${op}(${key}) 失败: ${e?.message || e}` })
}

async function fsSet(key, value) {
  if (!IS_TAURI || !FS_KEYS.includes(key)) return
  try {
    await withTimeout(invoke('fs_save', { key, value: JSON.stringify(value) }), FS_TIMEOUT_MS)
  } catch (e) {
    fsFail('save', key, e)
    throw e
  }
}

async function fsGet(key) {
  if (!IS_TAURI || !FS_KEYS.includes(key)) return null
  try {
    const s = await withTimeout(invoke('fs_load', { key }), FS_TIMEOUT_MS)
    return s ? JSON.parse(s) : null
  } catch (e) {
    fsFail('load', key, e)
    throw e
  }
}

async function fsRemove(key) {
  if (!IS_TAURI || !FS_KEYS.includes(key)) return
  try {
    await withTimeout(invoke('fs_remove', { key }), FS_TIMEOUT_MS)
  } catch (e) {
    fsFail('remove', key, e)
    throw e
  }
}

/** 应用级双写实例：IndexedDB（localforage，3s 超时保护）+ 文件镜像（Tauri 原生命令）。
 * 单侧失败不再静默：经 storage:issue 事件通知界面（节流 60s，避免刷屏）。 */
let lastIssueAt = 0

function notifyIssue(msg) {
  const now = Date.now()
  if (now - lastIssueAt < 60000) return
  lastIssueAt = now
  try {
    emit('storage:issue', msg)
  } catch {
    /* 无监听者时静默 */
  }
}

const dual = createDualStore({
  idbGet: (key) => localforage.getItem(key),
  idbSet: (key, value) => localforage.setItem(key, value),
  idbRemove: (key) => localforage.removeItem(key),
  fsGet,
  fsSet,
  fsRemove,
  idbTimeoutMs: 3000,
  onPartialFailure(side) {
    // 文件通道失败仅在 Tauri 环境提示（网页预览本就没有该通道）；
    // IndexedDB 失败任何环境都提示（网页环境它是唯一通道）。
    if (side === 'fs' && !IS_TAURI) return
    const msg =
      side === 'fs'
        ? '文件备份通道写入失败，数据当前只保存在 IndexedDB（进程被杀后可能丢失）。请到 设置→数据管理→检测本地数据通道 排查'
        : 'IndexedDB 通道异常，已改用文件备份通道读写（功能不受影响）。请到 设置→数据管理→检测本地数据通道 排查'
    notifyIssue(msg)
  }
})

// ==================== 后台清理优化：生命周期冲刷 ====================

/**
 * 页面进入后台/被销毁时冲刷写队列（尽力而为）：
 * 安卓硬杀进程（从最近任务划掉）不保证触发任何 JS 回调，因此持久化正确性
 * 依赖"每次变更立即双写完成"（见 write 语义），此钩子只是额外保险。
 */
export function hookLifecycleFlush() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const flush = () => {
    dual.flush()
  }
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}
hookLifecycleFlush()

/** 等待所有在途写操作落盘（诊断/测试用） */
export function flushPendingWrites() {
  return dual.flush()
}

// ==================== 番茄记录 ====================
// 记录结构：{ id, startTime, endTime, durationSec, completedAt }（时间均为毫秒时间戳）

const RECORDS_KEY = 'pomodoro_records'

async function readRecords() {
  const records = await dual.read(RECORDS_KEY, null)
  return Array.isArray(records) ? records : []
}

/** 追加一条番茄记录（完成一个番茄时调用） */
export async function addPomodoroRecord(record) {
  const records = await readRecords()
  records.push(record)
  await dual.write(RECORDS_KEY, records)
  return record
}

/** 读取全部番茄记录（统计页使用，按时间排序） */
export async function getPomodoroRecords() {
  const records = await readRecords()
  return records.sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
}

/** 清空全部番茄记录（设置页"清空本地数据"使用） */
export async function clearPomodoroRecords() {
  await dual.remove(RECORDS_KEY)
}

// ==================== 任务清单 ====================
// 任务结构：
// { id, title, done, pinned, pinnedAt, estPomodoros, createdAt, completedAt }
// pinnedAt / completedAt 为毫秒时间戳或 null，用于稳定排序

const TASKS_KEY = 'tasks'

/** 读取全部任务 */
export async function getTasks() {
  const list = await dual.read(TASKS_KEY, null)
  return Array.isArray(list) ? list : []
}

/** 整体保存任务列表 */
export async function saveTasks(list) {
  await dual.write(TASKS_KEY, list)
}

/** 清空全部任务（设置页"清空本地数据"使用） */
export async function clearTasks() {
  await dual.remove(TASKS_KEY)
}

// ==================== 设置 ====================

const SETTINGS_KEY = 'settings'
const DEFAULT_SETTINGS = {
  pomodoroMinutes: 25, // 单次番茄时长（分钟）
  lastDurationMinutes: 25, // 上次使用的时长（专注页记忆）
  vibrateOnComplete: true, // 完成时震动提醒
  themeMode: 'light' // 主题：light（默认亮色）| dark
}

/** 读取设置（缺省项回落默认值） */
export async function getSettings() {
  const saved = await dual.read(SETTINGS_KEY, null)
  return { ...DEFAULT_SETTINGS, ...(saved || {}) }
}

/** 保存设置（局部更新，未传字段保留原值） */
export async function saveSettings(patch) {
  const current = await getSettings()
  await dual.write(SETTINGS_KEY, { ...current, ...patch })
}

// ==================== AI 助手状态 ====================

const AI_STATE_KEY = 'ai_agent_state'

/** 保存 AI 助手状态快照（结果/输入；与任务同走双写，重启不丢） */
export async function saveAiState(state) {
  await dual.write(AI_STATE_KEY, state)
}

/** 读取 AI 助手状态；无数据返回 null */
export async function loadAiState() {
  return dual.read(AI_STATE_KEY, null)
}

// ==================== AI 配置 ====================

const AI_CONFIG_KEY = 'ai_config'

/** 持久化 AI 配置（config.js 的 localStorage 仅作同步缓存，真正落库走这里） */
export async function persistAIConfig(cfg) {
  await dual.write(AI_CONFIG_KEY, cfg)
}

/** 读取持久化的 AI 配置；无数据返回 null */
export async function readPersistedAIConfig() {
  return dual.read(AI_CONFIG_KEY, null)
}

// ==================== 通道探测 / 启动预热（自动激活存储通道） ====================

/** 探针键：独立于业务键，写完即删（Rust 白名单已放行） */
const PROBE_KEY = '__selfcheck__'

/**
 * 探测双通道读写链路（原始通道直连，不经写队列）。
 * 返回 { idbOk, fsOk, fsEnvelopeOk, errors }；非 Tauri 环境 fsOk 为 'skip'。
 * 该探测本身会完成一次 IndexedDB 打开与文件读写——即"激活"通道，
 * 这正是手动自检后功能恢复的原因，现改为启动时自动执行。
 */
async function probeChannels() {
  const result = { idbOk: false, fsOk: false, fsEnvelopeOk: false, errors: [] }
  const probe = { t: Date.now(), tag: genId() }

  try {
    await localforage.setItem(PROBE_KEY, probe)
    const back = await localforage.getItem(PROBE_KEY)
    result.idbOk = !!(back && back.tag === probe.tag)
    await localforage.removeItem(PROBE_KEY)
  } catch (e) {
    result.errors.push(`IndexedDB: ${e?.message || e}`)
  }

  if (!IS_TAURI) {
    result.fsOk = 'skip'
    result.fsEnvelopeOk = 'skip'
  } else {
    try {
      const envelope = JSON.stringify({ v: 1, savedAt: Date.now(), data: probe })
      await withTimeout(invoke('fs_save', { key: PROBE_KEY, value: envelope }), FS_TIMEOUT_MS)
      const raw = await withTimeout(invoke('fs_load', { key: PROBE_KEY }), FS_TIMEOUT_MS)
      const parsed = raw ? JSON.parse(raw) : null
      result.fsOk = !!(parsed && parsed.data && parsed.data.tag === probe.tag)
      result.fsEnvelopeOk = !!(parsed && parsed.v === 1 && typeof parsed.savedAt === 'number')
      await withTimeout(invoke('fs_remove', { key: PROBE_KEY }), FS_TIMEOUT_MS)
    } catch (e) {
      result.errors.push(`文件镜像: ${e?.message || e}`)
    }
  }
  return result
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 通道健康判定：IndexedDB 正常 且（文件通道正常或非 Tauri 环境） */
function isHealthy(r) {
  return r.idbOk === true && (r.fsOk === true || r.fsOk === 'skip')
}

/**
 * 启动预热：自动探测双通道，失败按 600ms/1.5s/3s 退避重试，
 * 确保用户开始操作前通道已激活——应用一打开即可正常保存任务，无需手动检测。
 * 幂等：多次调用共享同一 Promise；重试仍失败则记日志并弹告警（节流）。
 */
let warmupPromise = null
export function warmUpStorage() {
  if (!warmupPromise) {
    warmupPromise = (async () => {
      const backoffs = [600, 1500, 3000]
      let result = null
      for (let i = 0; i <= backoffs.length; i++) {
        if (i > 0) await sleep(backoffs[i - 1])
        result = await probeChannels()
        if (isHealthy(result)) return result
      }
      pushLog({
        at: Date.now(),
        type: 'storage-warmup',
        msg: `启动自检未通过: ${(result?.errors || []).join('; ')}`
      })
      notifyIssue('本地存储通道启动自检未通过，请到 设置→数据管理→检测本地数据通道 复核')
      return result
    })()
    warmupPromise.catch(() => {}) // 永不向外抛错
  }
  return warmupPromise
}

// 应用启动自动预热（延迟 400ms，待页面与 Tauri IPC 就绪）；SSR/测试环境跳过
if (typeof window !== 'undefined') {
  setTimeout(warmUpStorage, 400)
}

/** 手动自检（设置页按钮）：与启动预热共用同一探测逻辑 */
export async function runStorageSelfCheck() {
  return probeChannels()
}
