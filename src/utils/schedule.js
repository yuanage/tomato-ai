/**
 * 课程表纯逻辑（无副作用，全部可测）
 * 周次锚点：学期起始日所在周一 = 第 1 周（周一为一周之始，与 utils/date.js 一致）
 */

/** 缺省节次时间表（中国高校常见 12 节；P1 允许自定义） */
export const DEFAULT_SECTIONS = [
  { index: 1, start: '08:00', end: '08:45' },
  { index: 2, start: '08:55', end: '09:40' },
  { index: 3, start: '10:00', end: '10:45' },
  { index: 4, start: '10:55', end: '11:40' },
  { index: 5, start: '14:00', end: '14:45' },
  { index: 6, start: '14:55', end: '15:40' },
  { index: 7, start: '16:00', end: '16:45' },
  { index: 8, start: '16:55', end: '17:40' },
  { index: 9, start: '19:00', end: '19:45' },
  { index: 10, start: '19:55', end: '20:40' },
  { index: 11, start: '20:50', end: '21:35' },
  { index: 12, start: '21:45', end: '22:30' }
]

/** 课程色盘（预置 8 色，均适配实色块白字；自动分配可改） */
export const COURSE_COLORS = [
  '#D03050', // 番茄红（主）
  '#E05A1F', // 橙
  '#C78600', // 琥珀（加深保证白字可读）
  '#2E7D32', // 叶绿
  '#0E7C7B', // 青碧
  '#2E5B9F', // 靛蓝
  '#7B4FA6', // 紫
  '#5F6368' // 中性灰
]

/** 本地时间归一到当天 00:00 的毫秒时间戳 */
function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 所在周的周一 00:00（周一为一周之始）；入参支持时间戳/Date */
export function mondayOf(input) {
  const ts = input instanceof Date ? input.getTime() : Number(input)
  const day = new Date(ts).getDay() // 0=周日
  const diff = day === 0 ? -6 : 1 - day
  return startOfDay(ts + diff * 86400000)
}

/** 'YYYY-MM-DD' → 本地时间戳（避免 UTC 解析偏移） */
function parseDateStr(s) {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1).getTime()
}

/** 计算 date（时间戳/Date/'YYYY-MM-DD'）落在学期第几周（1 起；早于学期开始按第 1 周） */
export function weekNumberFor(dateInput, semesterStartStr) {
  const t = typeof dateInput === 'number' || dateInput instanceof Date ? +dateInput : parseDateStr(String(dateInput))
  const start = parseDateStr(semesterStartStr)
  const diff = mondayOf(t) - mondayOf(start)
  return Math.max(1, Math.floor(diff / 86400000 / 7) + 1)
}

/** 课程在第 weekNo 周是否上课 */
export function courseInWeek(course, weekNo) {
  const rule = course?.weekRule || { type: 'every', weeks: [] }
  switch (rule.type) {
    case 'odd':
      return weekNo % 2 === 1
    case 'even':
      return weekNo % 2 === 0
    case 'custom':
      return Array.isArray(rule.weeks) && rule.weeks.includes(weekNo)
    default:
      return true // every
  }
}

/** 某周 7 天明细：{ date(时间戳), dow(1-7), label, isToday } */
export function buildWeekDays(weekNo, semesterStartStr) {
  const start = mondayOf(parseDateStr(semesterStartStr)) + (weekNo - 1) * 7 * 86400000
  const names = ['一', '二', '三', '四', '五', '六', '日']
  const today = startOfDay(Date.now())
  return names.map((n, i) => {
    const date = start + i * 86400000
    return { date, dow: i + 1, label: `周${n}`, isToday: date === today }
  })
}

/** 'YYYY-MM-DD' 格式化（本地时间） */
export function fmtDate(ts) {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 缺省学期元数据：学期起始 = 本周一，共 20 周 */
export function defaultMeta() {
  return { semesterStart: fmtDate(mondayOf(Date.now())), totalWeeks: 20 }
}

/** 周区间文案：'第 12 周 (09.14-09.20)' */
export function weekRangeLabel(weekNo, semesterStartStr, totalWeeks) {
  const start = mondayOf(parseDateStr(semesterStartStr)) + (weekNo - 1) * 7 * 86400000
  const pad = (n) => String(n).padStart(2, '0')
  const a = new Date(start)
  const b = new Date(start + 6 * 86400000)
  return `第 ${weekNo} 周 (${pad(a.getMonth() + 1)}.${pad(a.getDate())}-${pad(b.getMonth() + 1)}.${pad(b.getDate())})`
}
