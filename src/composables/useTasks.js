import { ref, computed } from 'vue'
import { genId, getTasks, saveTasks } from '../utils/storage'

/**
 * 任务清单（模块级单例）
 *
 * 设计：
 * 1. 单例：任务状态全局共享，任务页、AI 导入页（阶段6）读写同一份数据；
 * 2. 所有写操作都先改内存再落库（IndexedDB 一次写整表，本应用数据量小，足够）；
 * 3. 排序规则：置顶（pinnedAt 新→旧）→ 未完成（createdAt 新→旧）→ 已完成（completedAt 新→旧）。
 */

const tasks = ref([])
let loadPromise = null

/**
 * 确保任务数据已加载【修复：共享 Promise，防并发重复加载】
 * 并发调用只发起一次 IndexedDB 读取；避免"后完成的读取用旧数据覆盖内存中已修改数据"
 * 导致绑定任务计数等内存修改丢失。读取失败时重置，允许下次重试。
 */
function ensureLoaded() {
  if (!loadPromise) {
    loadPromise = getTasks()
      .then((list) => {
        tasks.value = list
      })
      .catch((e) => {
        loadPromise = null
        throw e
      })
  }
  return loadPromise
}

async function persist() {
  await saveTasks(tasks.value)
}

/** 新增任务，返回任务对象 */
export async function addTask(title, estPomodoros = null) {
  await ensureLoaded()
  const task = {
    id: genId(),
    title: title.trim(),
    done: false,
    pinned: false,
    pinnedAt: null,
    estPomodoros: estPomodoros || null,
    consumedPomodoros: 0, // 已消耗番茄数（完成绑定的番茄时累加）
    createdAt: Date.now(),
    completedAt: null
  }
  tasks.value.push(task)
  await persist()
  return task
}

/** 任务已消耗番茄数累加（绑定任务完成一个番茄时调用） */
export async function incrementTaskPomodoros(id, n = 1) {
  await ensureLoaded()
  const t = tasks.value.find((x) => x.id === id)
  if (!t) return
  t.consumedPomodoros = (t.consumedPomodoros || 0) + n
  await persist()
}

/**
 * AI 导入去重（纯函数）：按标题（去空格）过滤掉与现有任务重复的项，
 * 同时过滤空标题；保持原始顺序。
 */
export function dedupeByTitle(existingTitles, incoming) {
  const seen = new Set(existingTitles.map((t) => String(t || '').trim()))
  return incoming.filter((item) => {
    const title = String(item.title || '').trim()
    if (!title || seen.has(title)) return false
    seen.add(title)
    return true
  })
}

/** 切换完成状态（勾选时记录 completedAt，取消勾选时清空） */
export async function toggleDone(id) {
  await ensureLoaded()
  const t = tasks.value.find((x) => x.id === id)
  if (!t) return
  t.done = !t.done
  t.completedAt = t.done ? Date.now() : null
  await persist()
}

/** 置顶 / 取消置顶 */
export async function togglePin(id) {
  await ensureLoaded()
  const t = tasks.value.find((x) => x.id === id)
  if (!t) return
  t.pinned = !t.pinned
  t.pinnedAt = t.pinned ? Date.now() : null
  await persist()
}

/** 局部更新任务（编辑标题、预估番茄数等） */
export async function updateTask(id, patch) {
  await ensureLoaded()
  const t = tasks.value.find((x) => x.id === id)
  if (!t) return
  if (typeof patch.title === 'string') patch.title = patch.title.trim()
  Object.assign(t, patch)
  await persist()
}

/** 删除任务 */
export async function removeTask(id) {
  await ensureLoaded()
  tasks.value = tasks.value.filter((x) => x.id !== id)
  await persist()
}

/** 清空全部任务（设置页使用，同时重置内存状态） */
export async function clearAllTasks() {
  tasks.value = []
  await saveTasks([])
}

/** 从存储重新加载任务（导入备份后调用；重置共享加载 Promise 强制重新读取） */
export async function reloadTasks() {
  loadPromise = null
  await ensureLoaded()
}

/**
 * 任务排序纯函数（独立导出便于测试）：
 * 置顶（pinnedAt 新→旧）→ 未完成（createdAt 新→旧）→ 已完成（completedAt 新→旧）
 */
export function sortTasks(list) {
  const sorted = [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.pinned && b.pinned) return (b.pinnedAt || 0) - (a.pinnedAt || 0)
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.done) return (b.completedAt || 0) - (a.completedAt || 0)
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
  return sorted
}

/** 排序后的任务列表（模板直接遍历） */
const sortedTasks = computed(() => sortTasks(tasks.value))

export function useTasks() {
  return { tasks, sortedTasks, ensureLoaded, addTask, toggleDone, togglePin, updateTask, removeTask }
}
