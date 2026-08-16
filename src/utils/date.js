/** 日期工具：全部基于本地时区，统计页使用 */

/** 当天 00:00:00 的时间戳 */
export function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 本周一 00:00:00 的时间戳（以周一为一周起点） */
export function startOfWeek(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7 // 周日=6，周一=0
  d.setDate(d.getDate() - day)
  return d.getTime()
}

/** 两个时间戳是否在同一天 */
export function isSameDay(a, b) {
  return startOfDay(a) === startOfDay(b)
}

/** 周几中文标签（一~日） */
export function weekdayLabel(ts) {
  return ['日', '一', '二', '三', '四', '五', '六'][new Date(ts).getDay()]
}
