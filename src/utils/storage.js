import localforage from 'localforage'
import { invoke } from '@tauri-apps/api/core'

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

// ==================== 文件镜像层 ====================

/** 允许镜像到文件的键白名单（与 Rust 侧保持一致，防注入） */
const FS_KEYS = ['tasks', 'pomodoro_records', 'settings', 'ai_agent_state']

async function fsWrite(key, value) {
  if (!FS_KEYS.includes(key)) return
  try {
    await invoke('fs_save', { key, value: JSON.stringify(value) })
  } catch {
    /* 非 Tauri 环境（网页预览）或写入失败：静默，IndexedDB 仍是主通道 */
  }
}

async function fsRead(key) {
  if (!FS_KEYS.includes(key)) return null
  try {
    const s = await invoke('fs_load', { key })
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

async function fsRemove(key) {
  if (!FS_KEYS.includes(key)) return
  try {
    await invoke('fs_remove', { key })
  } catch {
    /* 静默 */
  }
}

/** 双写：IndexedDB 失败不阻断文件镜像（各自独立尝试，全部落定后才返回） */
async function dualWrite(key, value) {
  await Promise.allSettled([localforage.setItem(key, value), fsWrite(key, value)])
}

/** 双读：IndexedDB 优先；为空/报错时从文件镜像恢复并回写 IndexedDB */
async function dualRead(key, fallback) {
  let value = null
  try {
    value = await localforage.getItem(key)
  } catch {
    value = null
  }
  if (value !== null && value !== undefined) {
    await fsWrite(key, value) // IndexedDB 正常：顺带刷新文件镜像
    return value
  }
  const backup = await fsRead(key)
  if (backup !== null && backup !== undefined) {
    try {
      await localforage.setItem(key, backup)
    } catch {
      /* 回写失败不阻断，文件镜像仍可用 */
    }
    return backup
  }
  return fallback
}

// ==================== 番茄记录 ====================
// 记录结构：{ id, startTime, endTime, durationSec, completedAt }（时间均为毫秒时间戳）

const RECORDS_KEY = 'pomodoro_records'

async function readRecords() {
  const records = await dualRead(RECORDS_KEY, null)
  return Array.isArray(records) ? records : []
}

/** 追加一条番茄记录（完成一个番茄时调用） */
export async function addPomodoroRecord(record) {
  const records = await readRecords()
  records.push(record)
  await dualWrite(RECORDS_KEY, records)
  return record
}

/** 读取全部番茄记录（统计页使用，按时间排序） */
export async function getPomodoroRecords() {
  const records = await readRecords()
  return records.sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
}

/** 清空全部番茄记录（设置页"清空本地数据"使用） */
export async function clearPomodoroRecords() {
  await Promise.allSettled([localforage.removeItem(RECORDS_KEY), fsRemove(RECORDS_KEY)])
}

// ==================== 任务清单 ====================
// 任务结构：
// { id, title, done, pinned, pinnedAt, estPomodoros, createdAt, completedAt }
// pinnedAt / completedAt 为毫秒时间戳或 null，用于稳定排序

const TASKS_KEY = 'tasks'

/** 读取全部任务 */
export async function getTasks() {
  const list = await dualRead(TASKS_KEY, null)
  return Array.isArray(list) ? list : []
}

/** 整体保存任务列表 */
export async function saveTasks(list) {
  await dualWrite(TASKS_KEY, list)
}

/** 清空全部任务（设置页"清空本地数据"使用） */
export async function clearTasks() {
  await Promise.allSettled([localforage.removeItem(TASKS_KEY), fsRemove(TASKS_KEY)])
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
  const saved = await dualRead(SETTINGS_KEY, null)
  return { ...DEFAULT_SETTINGS, ...(saved || {}) }
}

/** 保存设置（局部更新，未传字段保留原值） */
export async function saveSettings(patch) {
  const current = await getSettings()
  await dualWrite(SETTINGS_KEY, { ...current, ...patch })
}

// ==================== AI 助手状态 ====================

const AI_STATE_KEY = 'ai_agent_state'

/** 保存 AI 助手状态快照（结果/输入；与任务同走双写，重启不丢） */
export async function saveAiState(state) {
  await dualWrite(AI_STATE_KEY, state)
}

/** 读取 AI 助手状态；无数据返回 null */
export async function loadAiState() {
  return dualRead(AI_STATE_KEY, null)
}
