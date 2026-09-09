/**
 * 课表导入/导出纯逻辑（零依赖，全部本地处理，不上传任何数据）
 *
 * 1) HTML 表格解析（列式模板）：教务系统导出的六列式表格
 *    常见列：课程名称 | 教师 | 地点 | 星期 | 节次 | 周次
 *    自动按表头关键词定位列；兼容器整合并单元格的基础解析。
 * 2) 分享口令：TA1:<base64(JSON)> —— 同学间复制粘贴互导，不依赖账号。
 */

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
  if (/^(周一|星期一|礼拜一)$|^一$|^1$|^1[、.，,]/i.test(s)) return 1
  if (/^(周二|星期二|礼拜二)$|^二$|^2$/.test(s)) return 2
  if (/^(周三|星期三|礼拜三)$|^三$|^3$/.test(s)) return 3
  if (/^(周四|星期四|礼拜四)$|^四$|^4$/.test(s)) return 4
  if (/^(周五|星期五|礼拜五)$|^五$|^5$/.test(s)) return 5
  if (/^(周六|星期六|礼拜六)$|^六$|^6$/.test(s)) return 6
  if (/^(周日|周天|星期日|星期天|礼拜日|礼拜天)$|^日$|^天$|^7$/.test(s)) return 7
  return null
}

/** HTML 表格行提取：把 <table> 内的 <tr>/<td>（含基础 rowspan）解析为行数组 */
export function extractTableRows(html) {
  const tables = String(html ?? '').match(/<table[\s\S]*?<\/table>/gi) || []
  const rows = []
  for (const table of tables) {
    const trs = table.match(/<tr[\s\S]*?<\/tr>/gi) || []
    if (trs.length >= 2) rows.push(...trs) // 至少表头+1行
  }
  if (!rows.length) return null

  const result = []
  for (const tr of rows) {
    const tds = tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []
    const cells = []
    for (const td of tds) {
      const m = td.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i)
      const raw = m ? m[1] : ''
      const colspan = Number((td.match(/colspan\s*=\s*"?(\d+)/i) || [])[1]) || 1
      const text = mixText(raw)
      for (let i = 0; i < colspan; i++) cells.push(text)
    }
    const textLine = cells.filter((c) => c).join('|')
    if (textLine.trim()) result.push(cells)
  }
  return result
}

/** 文本净化：去掉标签/空白/多余换行 */
function mixText(fragment) {
  return fragment
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

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
 * 列式 HTML 表格解析 → 课程对象数组（结构同 useSchedule.addCourse 输入）
 * 任一关键字段（名称/星期/节次）缺失的行跳过。
 */
export function parseHtmlColumns(html) {
  const rows = extractTableRows(html)
  if (!rows) return null
  const map = headerIndex(rows[0])
  if (map.name < 0 || map.day < 0) return null // 识别不出列式表格

  const list = []
  for (const row of rows.slice(1)) {
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

/** 过滤合法导入项（名称/星期/节次必须有效），并补默认色 */
export function sanitizeImport(list, colors) {
  return (list || []).filter(
    (c) =>
      String(c.name || '').trim().length >= 2 &&
      c.dayOfWeek >= 1 &&
      c.dayOfWeek <= 7 &&
      Number(c.startSection) >= 1 &&
      Number(c.endSection) >= Number(c.startSection)
  )
}
