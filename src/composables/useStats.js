import { ref, computed } from 'vue'
import { getPomodoroRecords } from '../utils/storage'
import { useTasks } from './useTasks'
import { startOfDay, startOfWeek, isSameDay, weekdayLabel } from '../utils/date'

// 复用任务单例（只读其状态）
const { tasks: tasksRef, ensureLoaded: ensureTasksLoaded } = useTasks()

/**
 * 统计聚合（页面级，不做全局单例）：
 * 每次进入统计页 load() 重新读取 IndexedDB，保证数据最新。
 */

const records = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    records.value = await getPomodoroRecords()
    await ensureTasksLoaded()
  } finally {
    loading.value = false
  }
}

function sumMinutes(list) {
  return Math.round(list.reduce((sum, r) => sum + (r.durationSec || 0), 0) / 60)
}

/** 今日番茄数与专注分钟数 */
const today = computed(() => {
  const now = Date.now()
  const list = records.value.filter((r) => isSameDay(r.completedAt, now))
  return { count: list.length, minutes: sumMinutes(list) }
})

/** 本周（周一起）番茄数与专注分钟数 */
const week = computed(() => {
  const now = Date.now()
  const list = records.value.filter((r) => r.completedAt >= startOfWeek(now))
  return { count: list.length, minutes: sumMinutes(list) }
})

/** 累计番茄数 */
const total = computed(() => records.value.length)

/** 累计专注分钟数 */
const totalMinutes = computed(() => sumMinutes(records.value))

/** 近 7 天每日番茄数（用于柱状图） */
const last7Days = computed(() => {
  const now = Date.now()
  const arr = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(day.getDate() - i)
    const start = startOfDay(day.getTime())
    const count = records.value.filter(
      (r) => r.completedAt >= start && r.completedAt < start + 86400000
    ).length
    arr.push({ label: weekdayLabel(day.getTime()), count })
  }
  return arr
})

/** 任务完成情况 */
const taskStats = computed(() => {
  const totalCount = tasksRef.value.length
  const doneCount = tasksRef.value.filter((t) => t.done).length
  return {
    total: totalCount,
    done: doneCount,
    rate: totalCount ? Math.round((doneCount / totalCount) * 100) : 0
  }
})

export function useStats() {
  return { loading, today, week, total, totalMinutes, last7Days, taskStats, load }
}
