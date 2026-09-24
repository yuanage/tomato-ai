import { ref, computed } from 'vue'
import { genId, getTasks, saveTasks } from '../utils/storage'

/**
 * 任务清单（模块级单例）—— 回退到路线A之前的形态
 *
 * 设计：
 * 1. 单例：任务状态全局共享；
 * 2. 所有写操作先改内存再落库（IndexedDB 一次写整表）；
 * 3. 排序：置顶（pinnedAt 新→旧）→ 未完成（createdAt 新→旧）→ 已完成（completedAt 新→旧）。
 */

const tasks = ref([])
/** 跨模块快捷入口：任务页"开始专注"携带的任务 ID（专注页读取后清空） */
export const pendingFocusTaskId = ref(null)
let loadPromise = null

/** 确保任务数据已加载（共享 Promise：并发调用只读一次库，避免旧数据覆盖内存修改） */
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

/**
 * 任务输入净化（纯函数，便于测试）：
 * 标题去空格、转字符串；标题为空返回 null（调用方跳过，不打断批量导入）。
 */
export function normalizeTaskInput(title, estPomodoros = null) {
  const safeTitle = String(title ?? '').trim()
  if (!safeTitle) return null
  return { title: safeTitle, estPomodoros: estPomodoros || null }
}

/** 新增任务，返回任务对象；标题为空返回 null */
export async function addTask(title, estPomodoros = null) {
  const input = normalizeTaskInput(title, estPomodoros)
  if (!input) return null
  await ensureLoaded()
  const task = {
    id: genId(),
    title: input.title,
    done: false,
    pinned: false,
    pinnedAt: null,
    estPomodoros: input.estPomodoros,
    consumedPomodoros: 0, // 已消耗番茄数（绑定任务完成番茄时累加）
    createdAt: Date.now(),
    completedAt: null
  }
  tasks.value.push(task)
  try {
    await persist()
    return task
  } catch (e) {
    // 双通道落库都失败：回滚内存，避免"界面有、磁盘无"的幽灵任务
    tasks.value = tasks.value.filter((t) => t.id !== task.id)
    throw e
  }
}

/** 任务已消耗番茄数累加（绑定任务完成一个番茄时调用） */
export async function incrementTaskPomodoros(id, n = 1) {
  await ensureLoaded()
  const t = tasks.value.find((x) => x.id === id)
  if (!t) return
  t.consumedPomodoros = (t.consumedPomodoros || 0) + n
  await persist()
}

/** 切换完成状态 */
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

/** 局部更新任务 */
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

/**
 * 任务排序纯函数：
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
  return {
    tasks,
    sortedTasks,
    ensureLoaded,
    addTask,
    incrementTaskPomodoros, // 防回归：专注页绑定任务依赖此方法（曾因未暴露导致计数失效）
    toggleDone,
    togglePin,
    updateTask,
    removeTask,
    clearAllTasks
  }
}
