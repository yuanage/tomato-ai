/**
 * 零依赖单元测试：通过 Vite SSR 打包真实源码，在 Node 中运行。
 * 运行：npm run test（等价于 vite build --ssr 打包本文件后 node 执行）
 *
 * 覆盖范围（纯逻辑层）：
 * - utils/date.js：日期边界
 * - api/ai.js：extractJSON 容错
 * - composables/useTasks.js：sortTasks 排序
 * - api/mock.js：四大 Agent 样例结构
 */
import assert from 'node:assert/strict'
import { startOfDay, startOfWeek, isSameDay, weekdayLabel } from '../src/utils/date'
import { extractJSON, AIError } from '../src/api/ai'
import { sortTasks, dedupeByTitle } from '../src/composables/useTasks'
import { mockResponse } from '../src/api/mock'
import { nextBreakMinutes } from '../src/utils/break'
import { parseBackup } from '../src/utils/storage'
import { AI_PRESETS } from '../src/api/config'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log('  ✓', name)
  } catch (e) {
    failed++
    console.error('  ✗', name, '→', e.message)
  }
}

function section(title) {
  console.log('\n■', title)
}

// ==================== date.js ====================
section('date.js 日期工具')

test('startOfDay 归零到当天 00:00', () => {
  const t = new Date(2026, 7, 16, 14, 30, 45).getTime()
  assert.equal(startOfDay(t), new Date(2026, 7, 16, 0, 0, 0, 0).getTime())
})

// 星期锚点（2024-01-01 周一 → 2025-01-01 周三 → 2026-01-01 周四）：
// 2026-08-16 周日；08-17 周一；08-19 周三；08-15 周六；08-10 周一（均为本地时间）
test('startOfWeek：周三归属本周一（08-17）', () => {
  assert.equal(startOfWeek(new Date(2026, 7, 19, 10, 0).getTime()), startOfDay(new Date(2026, 7, 17).getTime()))
})

test('startOfWeek：周日归属本周一（08-10）', () => {
  assert.equal(startOfWeek(new Date(2026, 7, 16, 23, 0).getTime()), startOfDay(new Date(2026, 7, 10).getTime()))
})

test('startOfWeek：周一当天归属自身', () => {
  assert.equal(startOfWeek(new Date(2026, 7, 17, 6, 0).getTime()), startOfDay(new Date(2026, 7, 17).getTime()))
})

test('isSameDay：同天为真、跨天为假', () => {
  const a = new Date(2026, 7, 16, 23, 59).getTime()
  assert.equal(isSameDay(a, new Date(2026, 7, 16, 0, 1).getTime()), true)
  assert.equal(isSameDay(a, new Date(2026, 7, 17, 0, 1).getTime()), false)
})

test('weekdayLabel：一~日', () => {
  assert.equal(weekdayLabel(new Date(2026, 7, 16).getTime()), '日') // 周日
  assert.equal(weekdayLabel(new Date(2026, 7, 15).getTime()), '六') // 周六
})

// ==================== ai.js extractJSON ====================
section('ai.js extractJSON 容错解析')

test('纯 JSON 直接解析', () => {
  const r = extractJSON('{"tasks":[{"title":"a","estPomodoros":1}]}')
  assert.equal(r.tasks[0].title, 'a')
})

test('markdown 围栏剥离', () => {
  const r = extractJSON('```json\n{"a":1}\n```')
  assert.deepEqual(r, { a: 1 })
})

test('前后有解释文字也能提取', () => {
  const r = extractJSON('好的，这是结果：{"summary":"测试"} 希望对你有帮助')
  assert.deepEqual(r, { summary: '测试' })
})

test('非法 JSON 抛出 AIError(invalid_json)', () => {
  assert.throws(() => extractJSON('{"a":'), (e) => e instanceof AIError && e.code === 'invalid_json')
})

test('无 JSON 对象抛出 AIError(invalid_json)', () => {
  assert.throws(() => extractJSON('抱歉，我无法回答'), (e) => e instanceof AIError && e.code === 'invalid_json')
})

test('空内容抛出 AIError(empty)', () => {
  assert.throws(() => extractJSON('   '), (e) => e instanceof AIError && e.code === 'empty')
})

// ==================== useTasks sortTasks ====================
section('useTasks.js sortTasks 排序')

const mk = (id, patch = {}) => ({
  id,
  title: `t${id}`,
  done: false,
  pinned: false,
  pinnedAt: null,
  createdAt: 1000 + id,
  completedAt: null,
  ...patch
})

test('置顶任务排最前', () => {
  const list = [mk('a'), mk('b', { pinned: true, pinnedAt: 2000 })]
  assert.deepEqual(sortTasks(list).map((t) => t.id), ['b', 'a'])
})

test('置顶任务按 pinnedAt 新→旧', () => {
  const list = [
    mk('old', { pinned: true, pinnedAt: 1000 }),
    mk('new', { pinned: true, pinnedAt: 3000 }),
    mk('n', {})
  ]
  assert.deepEqual(sortTasks(list).map((t) => t.id), ['new', 'old', 'n'])
})

test('未完成在前、已完成沉底', () => {
  const list = [mk('done1', { done: true, completedAt: 5000 }), mk('active', {})]
  assert.deepEqual(sortTasks(list).map((t) => t.id), ['active', 'done1'])
})

test('未完成按 createdAt 新→旧', () => {
  const list = [mk('older', { createdAt: 100 }), mk('newer', { createdAt: 200 })]
  assert.deepEqual(sortTasks(list).map((t) => t.id), ['newer', 'older'])
})

test('已完成按 completedAt 新→旧', () => {
  const list = [
    mk('olddone', { done: true, completedAt: 100 }),
    mk('newdone', { done: true, completedAt: 200 })
  ]
  assert.deepEqual(sortTasks(list).map((t) => t.id), ['newdone', 'olddone'])
})

test('不修改原数组', () => {
  const list = [mk('a'), mk('b')]
  const copy = [...list]
  sortTasks(list)
  assert.deepEqual(list, copy)
})

// ==================== mock.js ====================
section('mock.js 四大 Agent 样例结构')

test('task_split 返回 tasks 数组', async () => {
  const r = await mockResponse('AGENT_ID: task_split', 'x')
  assert.ok(Array.isArray(r.tasks) && r.tasks.length > 0)
  assert.ok(typeof r.tasks[0].title === 'string' && typeof r.tasks[0].estPomodoros === 'number')
})

test('schedule 返回 schedule 数组与 tip', async () => {
  const r = await mockResponse('AGENT_ID: schedule', 'x')
  assert.ok(Array.isArray(r.schedule) && r.schedule.length > 0)
  assert.ok(typeof r.tip === 'string')
  assert.ok(typeof r.schedule[0].time === 'string')
})

test('review 返回四段式字段', async () => {
  const r = await mockResponse('AGENT_ID: review', 'x')
  for (const key of ['summary', 'highlights', 'problems', 'suggestions']) {
    assert.ok(key in r, `缺少字段 ${key}`)
  }
  assert.ok(Array.isArray(r.highlights))
})

test('focus 返回状态诊断字段', async () => {
  const r = await mockResponse('AGENT_ID: focus', 'x')
  assert.ok(['focused', 'normal', 'distracted'].includes(r.state))
  assert.ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100)
  assert.ok(typeof r.analysis === 'string' && typeof r.advice === 'string')
})

// ==================== dedupeByTitle 去重 ====================
section('useTasks.js dedupeByTitle 导入去重')

test('与现有任务重复的标题被过滤', () => {
  const incoming = [{ title: '写周报' }, { title: '写周报' }, { title: '读文档' }]
  const out = dedupeByTitle(['写周报'], incoming)
  assert.deepEqual(out.map((i) => i.title), ['读文档'])
})

test('空标题被过滤', () => {
  const out = dedupeByTitle([], [{ title: '   ' }, { title: '有效任务' }])
  assert.deepEqual(out.map((i) => i.title), ['有效任务'])
})

test('标题去空格后比较且保持顺序', () => {
  const out = dedupeByTitle(['a'], [{ title: ' a ' }, { title: 'b' }, { title: 'a' }])
  assert.deepEqual(out.map((i) => i.title), ['b'])
})

// ==================== parseBackup 备份解析 ====================
section('storage.js parseBackup 备份解析')

test('有效备份返回数据结构', () => {
  const r = parseBackup(
    JSON.stringify({
      app: 'tomato-ai',
      version: 1,
      data: {
        tasks: [{ id: 't1' }],
        pomodoroRecords: [{ id: 'r1' }],
        settings: { pomodoroMinutes: 30 }
      }
    })
  )
  assert.equal(r.tasks.length, 1)
  assert.equal(r.pomodoroRecords.length, 1)
  assert.equal(r.settings.pomodoroMinutes, 30)
})

test('缺失字段回落空数组', () => {
  const r = parseBackup(JSON.stringify({ app: 'tomato-ai', data: {} }))
  assert.deepEqual(r.tasks, [])
  assert.deepEqual(r.pomodoroRecords, [])
  assert.deepEqual(r.events, [])
})

test('非 JSON 内容抛错', () => {
  assert.throws(() => parseBackup('not a json'), /JSON/)
})

test('非番茄AI备份抛错', () => {
  assert.throws(() => parseBackup(JSON.stringify({ app: 'other' })), /备份/)
})

test('结构不完整抛错', () => {
  assert.throws(() => parseBackup(JSON.stringify({ app: 'tomato-ai', data: { tasks: 'x' } })), /结构/)
})

// ==================== AI_PRESETS 预设 ====================
section('config.js AI_PRESETS 服务商预设')

test('包含国内主流服务商且值唯一', () => {
  const labels = AI_PRESETS.map((p) => p.label)
  assert.ok(labels.includes('DeepSeek'))
  assert.ok(labels.includes('豆包（火山方舟）'))
  assert.ok(labels.includes('通义千问'))
  assert.equal(new Set(AI_PRESETS.map((p) => p.value)).size, AI_PRESETS.length)
})

test('预设地址均为 https 且模型非空（custom 除外）', () => {
  for (const p of AI_PRESETS) {
    if (p.value === 'custom') continue
    assert.ok(p.baseURL.startsWith('https://'), `${p.label} 地址需为 https`)
    assert.ok(p.model.length > 0, `${p.label} 模型不能为空`)
  }
})

// ==================== break.js 休息规则 ====================
section('break.js 休息切换规则')

test('第 1~3 个番茄后为短休息（5 分钟）', () => {
  assert.equal(nextBreakMinutes(1), 5)
  assert.equal(nextBreakMinutes(2), 5)
  assert.equal(nextBreakMinutes(3), 5)
})

test('第 4 个番茄后为长休息（15 分钟）', () => {
  assert.equal(nextBreakMinutes(4), 15)
})

test('长休息后重新计数', () => {
  assert.equal(nextBreakMinutes(5), 5)
  assert.equal(nextBreakMinutes(8), 15)
})

test('自定义阈值与时长生效', () => {
  assert.equal(nextBreakMinutes(2, { every: 2, longMinutes: 20 }), 20)
  assert.equal(nextBreakMinutes(3, { every: 2, longMinutes: 20 }), 5)
})

// ==================== 汇总 ====================
console.log(`\n结果：${passed} 通过，${failed} 失败`)
process.exitCode = failed > 0 ? 1 : 0
