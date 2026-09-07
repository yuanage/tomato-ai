import localforage from 'localforage'
import { invoke } from '@tauri-apps/api/core'
import { pushLog } from './logger'

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

/** 文件镜像信封：{ v: 1, savedAt, data }（savedAt 供审计与未来合并决策；v 便于格式演进） */
function wrap(value) {
  return { v: 1, savedAt: Date.now(), data: value }
}

/** 解信封：兼容早期无信封的镜像文件（整体即数据） */
function unwrap(parsed) {
  if (parsed && typeof parsed === 'object' && parsed.v === 1 && 'data' in parsed) {
    return parsed.data
  }
  return parsed
}

/** 双写存储核心（纯逻辑，后端可注入）：
 * - write：两侧并行落盘，仅当两侧都失败才抛错（单侧失败静默，另一侧仍可用）；
 * - read：IndexedDB 优先并顺带刷新镜像；IndexedDB 为空/报错时从镜像恢复并回写；
 * - remove：两侧清除；
 * - 写队列：全部写操作串行执行（enqueue），flush() 可等待队列排空；
 * - idbTimeoutMs > 0：IndexedDB 操作加超时保护（进程被杀后 leveldb 损坏可能挂起，
 *   超时即视为该侧不可用，读走镜像、写由镜像兜底，避免整个应用卡死）。 */
export function createDualStore({
  idbGet,
  idbSet,
  idbRemove,
  fsGet,
  fsSet,
  fsRemove,
  idbTimeoutMs = 0
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

  return {
    enqueue,
    /** 双写：仅当 IndexedDB 与文件镜像都失败（含超时）时抛错。
     * IndexedDB 存原始数据（兼容早期版本）；文件镜像存信封 {v, savedAt, data} */
    async write(key, value) {
      await enqueue(async () => {
        const results = await Promise.allSettled([
          guardIdb(() => idbSet(key, value)),
          fsSet(key, wrap(value))
        ])
        if (results.every((r) => r.status === 'rejected')) {
          throw new Error(`本地存储写入失败（双通道均不可用）：${key}`)
        }
      })
    },
    /** 双读：IndexedDB 优先；缺失/报错/超时从镜像恢复；镜像刷新与回写走队列后台执行 */
    async read(key, fallback) {
      let idbValue = null
      try {
        idbValue = await guardIdb(() => idbGet(key))
      } catch {
        idbValue = null
      }
      if (idbValue !== null && idbValue !== undefined) {
        enqueue(() => fsSet(key, wrap(idbValue))) // 顺带刷新镜像（不阻塞读取）
        return idbValue
      }
      let backup = null
      try {
        backup = await fsGet(key)
      } catch {
        backup = null
      }
      if (backup !== null && backup !== undefined) {
        const data = unwrap(backup)
        enqueue(() => guardIdb(() => idbSet(key, data))) // 回写 IndexedDB（不阻塞读取）
        return data
      }
      return fallback
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

function fsFail(op, key, e) {
  pushLog({ at: Date.now(), type: 'storage-fs', msg: `${op}(${key}) 失败: ${e?.message || e}` })
}

async function fsSet(key, value) {
  if (!IS_TAURI || !FS_KEYS.includes(key)) return
  try {
    await invoke('fs_save', { key, value: JSON.stringify(value) })
  } catch (e) {
    fsFail('save', key, e)
    throw e
  }
}

async function fsGet(key) {
  if (!IS_TAURI || !FS_KEYS.includes(key)) return null
  try {
    const s = await invoke('fs_load', { key })
    return s ? JSON.parse(s) : null
  } catch (e) {
    fsFail('load', key, e)
    throw e
  }
}

async function fsRemove(key) {
  if (!IS_TAURI || !FS_KEYS.includes(key)) return
  try {
    await invoke('fs_remove', { key })
  } catch (e) {
    fsFail('remove', key, e)
    throw e
  }
}

/** 应用级双写实例：IndexedDB（localforage，3s 超时保护）+ 文件镜像（Tauri 原生命令） */
const dual = createDualStore({
  idbGet: (key) => localforage.getItem(key),
  idbSet: (key, value) => localforage.setItem(key, value),
  idbRemove: (key) => localforage.removeItem(key),
  fsGet,
  fsSet,
  fsRemove,
  idbTimeoutMs: 3000
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

// ==================== 存储自检（设置页诊断用） ====================

/**
 * 存储自检：向双通道写探针并直接读回比对，验证两端读写链路。
 * 探针用独立键 __selfcheck__（Rust 白名单已放行），写完即删，不触碰业务数据。
 * 返回 { idbOk, fsOk, fsEnvelopeOk, errors }；非 Tauri 环境 fsOk 为 'skip'。
 */
export async function runStorageSelfCheck() {
  const PROBE_KEY = '__selfcheck__'
  const probe = { t: Date.now(), tag: genId() }
  const result = { idbOk: false, fsOk: false, fsEnvelopeOk: false, errors: [] }

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
      await invoke('fs_save', { key: PROBE_KEY, value: envelope })
      const raw = await invoke('fs_load', { key: PROBE_KEY })
      const parsed = raw ? JSON.parse(raw) : null
      result.fsOk = !!(parsed && parsed.data && parsed.data.tag === probe.tag)
      result.fsEnvelopeOk = !!(parsed && parsed.v === 1 && typeof parsed.savedAt === 'number')
      await invoke('fs_remove', { key: PROBE_KEY })
    } catch (e) {
      result.errors.push(`文件镜像: ${e?.message || e}`)
    }
  }
  return result
}
