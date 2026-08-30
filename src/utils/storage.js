import localforage from 'localforage'

/**
 * 本地存储统一入口：localForage 封装 IndexedDB —— 回退到路线A之前的形态
 *
 * 设计约定（所有阶段必须遵守）：
 * 1. 所有任务、番茄记录、设置项只允许通过本模块读写，禁止直接使用 localStorage；
 * 2. 数据默认只存本地、不上云；AI 调用时仅把"当前任务文本"发给模型。
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

// ==================== 番茄记录 ====================
// 记录结构：{ id, startTime, endTime, durationSec, completedAt }（时间均为毫秒时间戳）

const RECORDS_KEY = 'pomodoro_records'

async function readRecords() {
  const records = await localforage.getItem(RECORDS_KEY)
  return Array.isArray(records) ? records : []
}

/** 追加一条番茄记录（完成一个番茄时调用） */
export async function addPomodoroRecord(record) {
  const records = await readRecords()
  records.push(record)
  await localforage.setItem(RECORDS_KEY, records)
  return record
}

/** 读取全部番茄记录（统计页使用，按时间排序） */
export async function getPomodoroRecords() {
  const records = await readRecords()
  return records.sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
}

/** 清空全部番茄记录（设置页"清空本地数据"使用） */
export async function clearPomodoroRecords() {
  await localforage.removeItem(RECORDS_KEY)
}

// ==================== 任务清单 ====================
// 任务结构：
// { id, title, done, pinned, pinnedAt, estPomodoros, createdAt, completedAt }
// pinnedAt / completedAt 为毫秒时间戳或 null，用于稳定排序

const TASKS_KEY = 'tasks'

/** 读取全部任务 */
export async function getTasks() {
  const list = await localforage.getItem(TASKS_KEY)
  return Array.isArray(list) ? list : []
}

/** 整体保存任务列表 */
export async function saveTasks(list) {
  await localforage.setItem(TASKS_KEY, list)
}

/** 清空全部任务（设置页"清空本地数据"使用） */
export async function clearTasks() {
  await localforage.removeItem(TASKS_KEY)
}

// ==================== 设置 ====================

const SETTINGS_KEY = 'settings'
const DEFAULT_SETTINGS = {
  pomodoroMinutes: 25, // 单次番茄时长（分钟）
  lastDurationMinutes: 25, // 上次使用的时长（专注页记忆）
  vibrateOnComplete: true // 完成时震动提醒
}

/** 读取设置（缺省项回落默认值） */
export async function getSettings() {
  const saved = await localforage.getItem(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...(saved || {}) }
}

/** 保存设置（局部更新，未传字段保留原值） */
export async function saveSettings(patch) {
  const current = await getSettings()
  await localforage.setItem(SETTINGS_KEY, { ...current, ...patch })
}
