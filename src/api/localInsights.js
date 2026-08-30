import { startOfDay, isSameDay } from '../utils/date'

/**
 * 本地离线洞察引擎（Tier 1）：零依赖、零网络
 * 输入本地番茄记录与任务数据，输出结构化洞察。全部为纯函数，可单测。
 */

const DAY_MS = 86400000

/**
 * 今日最佳专注时段（2 小时桶）
 * 返回 { window: '14:00-16:00', count } 或 null（今日无记录）
 */
export function bestFocusWindow(records, now = Date.now()) {
  const dayStart = startOfDay(now)
  const buckets = Array(12).fill(0) // 12 个 2 小时桶
  for (const r of records) {
    const at = r.completedAt ?? 0
    if (at >= dayStart && at <= now) {
      buckets[Math.floor(new Date(at).getHours() / 2)]++
    }
  }
  let best = -1
  let bestCount = 0
  buckets.forEach((c, i) => {
    if (c > bestCount) {
      bestCount = c
      best = i
    }
  })
  if (best < 0 || bestCount === 0) return null
  const fmt = (h) => String(h).padStart(2, '0')
  return { window: `${fmt(best * 2)}:00-${fmt(best * 2 + 2)}:00`, count: bestCount }
}

/**
 * 连续专注天数（截至今天；今天尚无记录则从昨天起算）
 */
export function focusStreakDays(records, now = Date.now()) {
  const days = new Set(records.map((r) => startOfDay(r.completedAt ?? 0)))
  let cursor = startOfDay(now)
  if (!days.has(cursor)) cursor -= DAY_MS
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor -= DAY_MS
  }
  return streak
}

/**
 * 超载任务：未完成且已消耗番茄数超过预估
 */
export function overloadTasks(tasks) {
  return tasks.filter(
    (t) => !t.done && t.estPomodoros && (t.consumedPomodoros || 0) > t.estPomodoros
  )
}

/**
 * 每日一句话总结（模板 + 数据插值）
 */
export function dailySummary(records, tasks, now = Date.now()) {
  const todayCount = records.filter((r) => isSameDay(r.completedAt, now)).length
  const doneCount = tasks.filter((t) => t.done).length
  const activeCount = tasks.length - doneCount
  if (todayCount === 0 && tasks.length === 0) return '今天还没有开始——添加一个任务，完成第一个番茄吧。'
  if (todayCount === 0) return `今天还没有专注记录，有 ${activeCount} 个任务等你，从25分钟开始就好。`
  return `今天已完成 ${todayCount} 个番茄、${doneCount} 个任务，保持节奏，专注继续。`
}

/**
 * 汇总全部离线洞察（AI 页离线洞察卡片的数据源）
 */
export function buildInsights(records, tasks, now = Date.now()) {
  const best = bestFocusWindow(records, now)
  const streak = focusStreakDays(records, now)
  const overload = overloadTasks(tasks)
  const insights = []
  if (best) {
    insights.push({
      icon: '⏰',
      title: '今日最佳专注时段',
      body: `${best.window}（完成 ${best.count} 个番茄），重要任务优先安排在这个时段。`
    })
  }
  if (streak > 0) {
    insights.push({
      icon: '🔥',
      title: '连续专注',
      body: `已连续 ${streak} 天有专注记录，别断链子。`
    })
  }
  for (const t of overload.slice(0, 3)) {
    insights.push({
      icon: '⚠️',
      title: '任务超载提醒',
      body: `「${t.title}」已消耗 ${(t.consumedPomodoros || 0)} 个番茄，超出预估 ${t.estPomodoros}——建议拆分或调整预估。`
    })
  }
  insights.push({ icon: '📝', title: '今日总结', body: dailySummary(records, tasks, now) })
  return insights
}
