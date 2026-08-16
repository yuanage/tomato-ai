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
    createdAt: Date.now(),
    completedAt: null
  }
  tasks.value.push(task)
  await persist()
  return task
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
    toggleDone,
    togglePin,
    updateTask,
    removeTask,
    clearAllTasks
  }
}
