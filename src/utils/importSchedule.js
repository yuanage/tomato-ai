/**
 * 课表导入/导出纯逻辑（零依赖，全部本地处理，不上传任何数据）
 *
 * 1) HTML 表格解析：
 *    - parseTableGrid：把 <table> 还原为等宽二维网格（完整处理 rowspan/colspan）；
 *    - parseHtmlColumns：列式模板（课程名称|教师|地点|星期|节次|周次 六列表）；
 *    - parseHtmlMatrix：矩阵式课表（星期为列头、节次为行头，教务系统常见格式）。
 * 2) 分享口令：TA1:<base64(JSON)> —— 设备间复制粘贴互导，不依赖账号。
 * 3) 导入去重：dedupeAgainst（名称+星期+节次+周次规则为判重键）。
 */
import { COURSE_COLORS } from './schedule'

// ==================== 基础解析 ====================

/** 解析 "1-8周" / "1-16(单)" / "1,3,5-9(双)" / "1-8,10-14" → {type:'every'|'odd'|'even'|'custom', weeks:[]} */
export function parseWeekRule(text) {
  const s = String(text ?? '').replace(/周/g, '').trim().toLowerCase()
  if (!s) return { type: 'every', weeks: [] }
  let type = 'every'
  if (/(单|odd)/.test(s)) type = 'odd'
  if (/(双|even)/.test(s)) type = 'even'
  // 剥离单双周标记字符后提取数字区间
  const clean = s.replace(/单|双|odd|even|[()（）]/g, ' ')
  const nums = []
  for (const part of clean.split(/[,,、，;；\s]+/)) {
    const m = part.match(/^(\d{1,2})(?:\s*[-~到]\s*(\d{1,2}))?$/)
    if (!m) continue
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    if (b >= a && b <= 99) {
      for (let w = a; w <= b; w++) nums.push(w)
    }
  }
  if (!nums.length) return { type: 'every', weeks: [] }
  let uniq = [...new Set(nums)].sort((a, b) => a - b)
  if (type === 'odd') uniq = uniq.filter((w) => w % 2 === 1)
  if (type === 'even') uniq = uniq.filter((w) => w % 2 === 0)
  if (type === 'every') {
    // 全周数字段视为 explicit 周次（更接近原文语义）
    return uniq.length <= 1 || uniq.length < 6 ? { type: 'custom', weeks: uniq } : { type: 'every', weeks: [] }
  }
  return { type, weeks: uniq }
}

/** 解析节次串 "1-2" / "3,4" / "1,2,3" → { startSection, endSection } */
export function parseSectionRange(text) {
  const nums = String(text ?? '')
    .replace(/[节课]/g, '')
    .split(/[,,、，,\s-~]+/)
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 15)
  if (!nums.length) return null
  return { startSection: Math.min(...nums), endSection: Math.max(...nums) }
}

/** 星期文本 → 1-7（一=1 … 日/天=7）；识别失败返回 null */
export function parseDayOfWeek(text) {
  const s = String(text ?? '').trim()
  if (/^(周一|星期一|礼拜一)$|^一$|^1$/.test(s)) return 1
  if (/^(周二|星期二|礼拜二)$|^二$|^2$/.test(s)) return 2
  if (/^(周三|星期三|礼拜三)$|^三$|^3$/.test(s)) return 3
  if (/^(周四|星期四|礼拜四)$|^四$|^4$/.test(s)) return 4
  if (/^(周五|星期五|礼拜五)$|^五$|^5$/.test(s)) return 5
  if (/^(周六|星期六|礼拜六)$|^六$|^6$/.test(s)) return 6
  if (/^(周日|周天|星期日|星期天|礼拜日|礼拜天)$|^日$|^天$|^7$/.test(s)) return 7
  return null
}

/** 文本净化：去标签/空白 */
function mixText(fragment) {
  return fragment
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|tr|td|th)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** HTML 实体/全角空格清理后的行内文本辅助 */
function cellText(html) {
  return mixText(html).replace(/[\u3000]/g, ' ').trim()
}

// ==================== 表格 → 等宽二维网格（rowspan/colspan） ====================

/**
 * 把第一个（面积最大的）表格还原为等宽二维网格：
 * 合并单元格的文本填充其覆盖的全部格位；被 rowspan 占用的位置补空串占位。
 * 返回 null 表示没有可用表格。
 */
export function parseTableGrid(html) {
  const tables = String(html ?? '').match(/<table[\s\S]*?<\/table>/gi) || []
  let best = null
  for (const table of tables) {
    const grid = tableToGrid(table)
    if (grid && grid.length >= 2 && grid[0].length >= 2) {
      if (!best || grid.length * grid[0].length > best.length * best[0].length) best = grid
    }
  }
  return best
}

function tableToGrid(tableHtml) {
  const trs = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || []
  if (!trs.length) return null
  const grid = []
  const inherited = new Map() // "r,c" → 被上方 rowspan 覆盖时应填充的文本

  for (let r = 0; r < trs.length; r++) {
    const tds = trs[r].match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []
    const row = []
    let c = 0
    for (const td of tds) {
      let guard = 0
      while (inherited.has(`${r},${c}`) && guard++ < 50) {
        if (row[c] === undefined) row[c] = inherited.get(`${r},${c}`)
        c++
      }
      const text = cellText((td.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i) || [])[1] || '')
      const cs = Math.min(Math.max(Number((td.match(/colspan\s*=\s*"?(\d+)/i) || [])[1]) || 1, 1), 20)
      const rs = Math.min(Math.max(Number((td.match(/rowspan\s*=\s*"?(\d+)/i) || [])[1]) || 1, 1), 60)
      for (let dc = 0; dc < cs; dc++) row[c + dc] = text
      for (let dr = 1; dr < rs; dr++) {
        for (let dc = 0; dc < cs; dc++) inherited.set(`${r + dr},${c + dc}`, text)
      }
      c += cs
    }
    // 补齐本行剩余被覆盖位置（该行后面没有更多单元格时）
    let cc = c
    let guard2 = 0
    while (guard2++ < 50 && [...inherited.keys()].some((k) => k.startsWith(`${r},`) && Number(k.split(',')[1]) >= cc)) {
      if (inherited.has(`${r},${cc}`) && row[cc] === undefined) row[cc] = inherited.get(`${r},${cc}`)
      cc++
    }
    grid.push(row)
  }

  // 归一化列数（等宽）
  const width = grid.reduce((m, row) => Math.max(m, row.length), 0)
  if (!width) return null
  return grid.map((row) => {
    const out = row.slice()
    while (out.length < width) out.push('')
    return out
  })
}

// ==================== 列式表格（六列模板） ====================

/** 表头关键词 → 列索引映射 */
function headerIndex(row) {
  const map = { name: -1, teacher: -1, location: -1, day: -1, sections: -1, weeks: -1 }
  row.forEach((cell, i) => {
    const s = String(cell || '').replace(/\s/g, '')
    if (!s) return
    if (map.name < 0 && /课程名称|课程名|^课程$|^课程|名称/.test(s)) map.name = i
    if (map.teacher < 0 && /教师|任课|讲师/.test(s)) map.teacher = i
    if (map.location < 0 && /教室|地点|上课地点|场地/.test(s)) map.location = i
    if (map.day < 0 && /星期|周几|上课日/.test(s)) map.day = i
    if (map.sections < 0 && /节次|上课节次|节数|堂数|时间.*(节|堂)/.test(s)) map.sections = i
    if (map.weeks < 0 && /周次|起止周|上课周|周数/.test(s)) map.weeks = i
  })
  return map
}

/**
 * 列式 HTML 表格解析 → 课程对象数组（结构同 addCourse 输入）
 * 任一关键字段（名称/星期）缺失的行跳过。
 */
export function parseHtmlColumns(html) {
  const grid = parseTableGrid(html)
  if (!grid) return null
  const map = headerIndex(grid[0])
  if (map.name < 0 || map.day < 0) return null // 不是列式模板

  const list = []
  for (const row of grid.slice(1)) {
    const name = String(row[map.name] || '').trim()
    const dow = parseDayOfWeek(String(row[map.day] || '').trim())
    const sec = map.sections >= 0 ? parseSectionRange(String(row[map.sections] || '').trim()) : null
    if (!name || name.length < 2 || !dow) continue
    list.push({
      name,
      location: map.location >= 0 ? String(row[map.location] || '').trim() : '',
      teacher: map.teacher >= 0 ? String(row[map.teacher] || '').trim() : '',
      dayOfWeek: dow,
      startSection: sec?.startSection || 1,
      endSection: sec?.endSection || 1,
      weekRule: map.weeks >= 0 ? parseWeekRule(String(row[map.weeks] || '').trim()) : { type: 'every', weeks: [] }
    })
  }
  return list
}

// ==================== 矩阵式课表（星期为列、节次为行） ====================

/** 矩阵单元格文本 → 课程片段 { name, location, teacher, weekRule }（启发式） */
export function parseMatrixCell(cell) {
  let text = String(cell ?? '').replace(/非本周/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return null

  // 提取周次片段（含"周/单/双"或纯数字区间），并从主文本中移除
  const tokens = text.split(' ').filter(Boolean)
  let weekRule = { type: 'every', weeks: [] }
  const kept = []
  for (const t of tokens) {
    if (/(周|单|双)/.test(t) && /\d/.test(t)) {
      weekRule = parseWeekRule(t)
    } else if (/^\d{1,2}([-~到,，、]\d{1,2})*$/.test(t)) {
      weekRule = parseWeekRule(t)
    } else {
      kept.push(t)
    }
  }
  text = kept.join(' ').trim()
  if (!text) return null

  let name = ''
  let location = ''
  let teacher = ''

  if (text.includes('@')) {
    // 常见格式：课程名@地点（如 数据库系统@立园楼301(A-B)）
    const [before, ...rest] = text.split('@')
    name = before.trim()
    location = rest.join(' ').trim()
  } else {
    const segs = text.split(' ').filter(Boolean)
    const locRe = /楼|室|场|馆|校区|号|机房|田径|实验/
    const locIdx = segs.findIndex((s) => locRe.test(s))
    if (locIdx >= 0) location = segs[locIdx]
    const others = segs.filter((_, i) => i !== locIdx)
    // 课程名取最长片段；教师取剩余中最短的 2-5 字中文片段
    const sorted = [...others].sort((a, b) => b.length - a.length)
    name = sorted[0] || ''
    const teacherCand = others.find((s) => s !== name && s.length >= 2 && s.length <= 5 && /^[\u4e00-\u9fa5.]+$/.test(s))
    if (teacherCand) teacher = teacherCand
    // 课程名与教师重名保护
    if (name && name === teacher) teacher = ''
  }

  name = name.replace(/[（(][^）)]*[）)]\s*$/, '').trim()
  if (!name || name.length < 2) return null
  return { name, location, teacher, weekRule }
}

/**
 * 矩阵式课表解析 → 课程对象数组。
 * 连堂（rowspan 跨行/同文本连续行）自动合并为 startSection~endSection 的单门课程。
 */
export function parseHtmlMatrix(html) {
  const grid = parseTableGrid(html)
  if (!grid) return null

  // 找列头行：某行含 ≥3 个可识别的星期
  let headerRow = -1
  let dayCols = []
  for (let r = 0; r < Math.min(grid.length, 5); r++) {
    const cols = []
    grid[r].forEach((cell, c) => {
      const d = parseDayOfWeek(String(cell).trim())
      if (d) cols.push({ col: c, day: d })
    })
    if (cols.length >= 3) {
      headerRow = r
      dayCols = cols.filter((x, i, arr) => arr.findIndex((y) => y.day === x.day) === i)
      break
    }
  }
  if (headerRow < 0) return null
  dayCols.sort((a, b) => a.col - b.col)
  const firstDayCol = dayCols[0].col

  const courses = []
  const colState = {} // col → { course, lastRow } 用于连堂合并

  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r]
    // 行头节次：取星期列左侧的所有非空文本
    const leftText = row.slice(0, firstDayCol).filter(Boolean).join(' ')
    const sec = parseSectionRange(leftText)
    if (!sec) continue

    for (const { col, day } of dayCols) {
      const cell = String(row[col] ?? '').trim()
      if (!cell) continue
      const parsed = parseMatrixCell(cell)
      if (!parsed) continue

      const st = colState[col]
      // 与上一行同列文本一致且行号连续 → 连堂合并（扩展节次范围）
      if (st && st.text === cell && st.lastRow === r - 1) {
        st.course.endSection = Math.max(st.course.endSection, sec.endSection)
        st.lastRow = r
        continue
      }
      const course = {
        name: parsed.name,
        location: parsed.location,
        teacher: parsed.teacher,
        dayOfWeek: day,
        startSection: sec.startSection,
        endSection: sec.endSection,
        weekRule: parsed.weekRule
      }
      courses.push(course)
      colState[col] = { text: cell, course, lastRow: r }
    }
  }
  return courses.length ? courses : null
}

// ==================== 导入去重 ====================

/** 判重键：名称 + 星期 + 起止节次 + 周次规则 */
export function courseKey(c) {
  const rule = c?.weekRule || { type: 'every', weeks: [] }
  const weeks = Array.isArray(rule.weeks) ? [...rule.weeks].sort((a, b) => a - b).join(',') : ''
  return [
    String(c?.name || '').trim(),
    Number(c?.dayOfWeek) || 0,
    Number(c?.startSection) || 0,
    Number(c?.endSection) || 0,
    rule.type || 'every',
    weeks
  ].join('|')
}

/** 去重：与已有课程及同批导入项对比；返回 { fresh, duplicates } */
export function dedupeAgainst(existing, incoming) {
  const seen = new Set((existing || []).map(courseKey))
  const fresh = []
  const duplicates = []
  for (const c of incoming || []) {
    const key = courseKey(c)
    if (seen.has(key)) duplicates.push(c)
    else {
      fresh.push(c)
      seen.add(key)
    }
  }
  return { fresh, duplicates }
}

// ==================== 分享口令（本地生成/导入，无账号） ====================

const SHARE_HEADER = 'TA1:'

/** 生成分享口令：TA1:<base64(JSON)>（unicode 安全） */
export function encodeShare(courses) {
  const json = JSON.stringify({ v: 1, courses: courses || [] })
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return SHARE_HEADER + b64
}

/** 解析分享口令 → 课程对象数组；非法返回 null */
export function decodeShare(text) {
  const s = String(text ?? '').trim()
  if (!s.startsWith(SHARE_HEADER)) return null
  try {
    const json = decodeURIComponent(escape(atob(s.slice(SHARE_HEADER.length))))
    const data = JSON.parse(json)
    const list = Array.isArray(data?.courses) ? data.courses : null
    if (!list || !list.length) return null
    return list.map((c) => ({
      name: String(c.name || '').trim(),
      location: String(c.location || ''),
      teacher: String(c.teacher || ''),
      dayOfWeek: Number(c.dayOfWeek) || 1,
      startSection: Number(c.startSection) || 1,
      endSection: Number(c.endSection) || 1,
      weekRule: c?.weekRule || { type: 'every', weeks: [] },
      color: typeof c.color === 'string' ? c.color : undefined
    }))
  } catch {
    return null
  }
}

/** 导入入口嗅探：HTML 表格 / 分享口令 / 无法识别 */
export function sniffImport(text) {
  const s = String(text ?? '').trim()
  if (s.startsWith(SHARE_HEADER)) return 'share'
  if (/<table[\s\S]*<\/table>/i.test(s)) return 'html'
  return 'unknown'
}

/** 解析 HTML 课表（列式优先，失败回退矩阵式）；无法识别返回 null */
export function parseHtmlCourseTable(html) {
  return parseHtmlColumns(html) || parseHtmlMatrix(html)
}

/** 过滤合法导入项（名称/星期/节次有效），并按色盘为缺色项补色 */
export function sanitizeImport(list, colors = COURSE_COLORS, baseIndex = 0) {
  const palette = Array.isArray(colors) && colors.length ? colors : COURSE_COLORS
  return (list || [])
    .filter(
      (c) =>
        String(c.name || '').trim().length >= 2 &&
        c.dayOfWeek >= 1 &&
        c.dayOfWeek <= 7 &&
        Number(c.startSection) >= 1 &&
        Number(c.endSection) >= Number(c.startSection)
    )
    .map((c, i) => ({
      ...c,
      color: typeof c.color === 'string' && c.color ? c.color : palette[(baseIndex + i) % palette.length]
    }))
}
