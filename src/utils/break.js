/**
 * 休息规则（纯函数，便于单测）：
 * 每完成 every 个番茄，进入一次长休息；其余为短休息。
 */
export function nextBreakMinutes(completedCount, { shortMinutes = 5, longMinutes = 15, every = 4 } = {}) {
  const everyN = Math.max(1, every)
  return completedCount % everyN === 0 ? longMinutes : shortMinutes
}
