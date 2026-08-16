import localforage from 'localforage'

/**
 * 本地存储统一入口：localForage 封装 IndexedDB
 *
 * 设计约定（所有阶段必须遵守）：
 * 1. 所有任务、番茄记录、设置项只允许通过本模块读写，禁止直接使用 localStorage；
 * 2. 数据默认只存本地、不上云；AI 调用时仅把"当前任务文本"发给模型；
 * 3. 阶段2：番茄记录；阶段3：任务清单；阶段4：统计查询；阶段7：设置项。
 *
 * 文档：https://localforage.github.io/localForage/
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

/** 读取全部番茄记录（阶段4 统计页使用，按时间排序） */
export async function getPomodoroRecords() {
  const records = await readRecords()
  return records.sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
}

/** 清空全部番茄记录（阶段7 设置页"清空本地数据"使用） */
export async function clearPomodoroRecords() {
  await localforage.removeItem(RECORDS_KEY)
}

// ==================== 任务清单 ====================
// 任务结构：
// { id, title, done, pinned, pinnedAt, estPomodoros, createdAt, completedAt }
// pinnedAt / completedAt 为毫秒时间戳或 null，用于稳定排序

const TASKS_KEY = 'tasks'

/** 读取全部任务（阶段3 任务页 / 阶段6 AI 导入使用） */
export async function getTasks() {
  const list = await localforage.getItem(TASKS_KEY)
  return Array.isArray(list) ? list : []
}

/** 整体保存任务列表（配合 useTasks 的业务逻辑） */
export async function saveTasks(list) {
  await localforage.setItem(TASKS_KEY, list)
}

/** 清空全部任务（阶段7 设置页使用） */
export async function clearTasks() {
  await localforage.removeItem(TASKS_KEY)
}

// ==================== 设置 ====================

const SETTINGS_KEY = 'settings'
const DEFAULT_SETTINGS = {
  pomodoroMinutes: 25, // 单次番茄时长（分钟）
  shortBreakMinutes: 5, // 短休息（分钟）
  longBreakMinutes: 15, // 长休息（分钟）
  longBreakEvery: 4, // 每几个番茄进入长休息
  vibrateOnComplete: true, // 完成时震动
  notifyOnComplete: true, // 完成时浏览器通知
  soundOnComplete: true // 完成时提示音
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

/** 清空设置（恢复默认） */
export async function clearSettings() {
  await localforage.removeItem(SETTINGS_KEY)
}

// ==================== 备份 ====================

/**
 * 解析并校验备份 JSON（纯函数，便于测试）。
 * 返回 { tasks, pomodoroRecords, events, settings }；不合法时抛出中文错误。
 */
export function parseBackup(text) {
  let backup
  try {
    backup = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON')
  }
  if (!backup || backup.app !== 'tomato-ai') {
    throw new Error('不是番茄AI的备份文件')
  }
  const { tasks = [], pomodoroRecords = [], events = [], settings = {} } = backup.data || {}
  if (!Array.isArray(tasks) || !Array.isArray(pomodoroRecords) || !Array.isArray(events)) {
    throw new Error('备份文件结构不完整')
  }
  return { tasks, pomodoroRecords, events, settings }
}

/** 导出完整备份对象（含任务、番茄记录、会话事件、设置） */
export async function exportBackup() {
  const [tasks, pomodoroRecords, events, settings] = await Promise.all([
    getTasks(),
    getPomodoroRecords(),
    getPomodoroEvents(),
    getSettings()
  ])
  return {
    app: 'tomato-ai',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { tasks, pomodoroRecords, events, settings }
  }
}

/** 从备份文本恢复数据（覆盖当前任务、记录与事件） */
export async function importBackup(text) {
  const { tasks, pomodoroRecords, events, settings } = parseBackup(text)
  await localforage.setItem(TASKS_KEY, tasks)
  await localforage.setItem(RECORDS_KEY, pomodoroRecords)
  await localforage.setItem(EVENTS_KEY, events)
  await saveSettings(settings)
}

// ==================== 番茄会话事件（放弃/暂停记录，供状态检测 Agent） ====================
// 事件结构：{ id, type: 'abandoned' | 'paused', at, plannedSec? }

const EVENTS_KEY = 'pomodoro_events'
const EVENTS_MAX = 500 // 只保留最近 500 条，防止无限增长

/** 读取全部会话事件（按时间升序） */
export async function getPomodoroEvents() {
  const list = await localforage.getItem(EVENTS_KEY)
  const events = Array.isArray(list) ? list : []
  return events.sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
}

/** 追加一条会话事件（超过上限时丢弃最旧的） */
export async function addPomodoroEvent(event) {
  const list = await getPomodoroEvents()
  list.push(event)
  if (list.length > EVENTS_MAX) list.splice(0, list.length - EVENTS_MAX)
  await localforage.setItem(EVENTS_KEY, list)
  return event
}

/** 清空全部会话事件（设置页清空数据时调用） */
export async function clearPomodoroEvents() {
  await localforage.removeItem(EVENTS_KEY)
}
