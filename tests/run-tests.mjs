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
import { sortTasks, normalizeTaskInput } from '../src/composables/useTasks'
import { sanitizeSavedState } from '../src/utils/aiState'
import { buildInsights, bestFocusWindow, focusStreakDays, overloadTasks } from '../src/api/localInsights'
import { mockResponse } from '../src/api/mock'
import { createDualStore, chooseSide, parseSide } from '../src/utils/storage'
import {
  weekNumberFor,
  courseInWeek,
  mondayOf,
  buildWeekDays,
  weekRangeLabel,
  fmtDate,
  defaultMeta,
  normalizeSections,
  weeksOf,
  findConflicts,
  COURSE_COLORS
} from '../src/utils/schedule'
import {
  parseWeekRule,
  parseSectionRange,
  parseDayOfWeek,
  parseHtmlColumns,
  parseHtmlMatrix,
  parseTableGrid,
  parseMatrixCell,
  parseHtmlCourseTable,
  parseEamsScript,
  weeksToRule,
  courseKey,
  dedupeAgainst,
  encodeShare,
  decodeShare,
  sniffImport,
  sanitizeImport
} from '../src/utils/importSchedule'
import { useTasks } from '../src/composables/useTasks'

let passed = 0
let failed = 0
/** 异步用例的 Promise 列表：汇总前统一等待，失败也能被计入 */
const pendingTests = []

function test(name, fn) {
  try {
    const r = fn()
    if (r && typeof r.then === 'function') {
      pendingTests.push(
        r.then(
          () => {
            passed++
            console.log('  ✓', name)
          },
          (e) => {
            failed++
            console.error('  ✗', name, '→', e.message || e)
          }
        )
      )
      return
    }
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

// ==================== normalizeTaskInput 标题净化 ====================
section('useTasks.js normalizeTaskInput 批量导入健壮性')

test('正常标题去空格并保留预估番茄数', () => {
  assert.deepEqual(normalizeTaskInput('  写周报  ', 3), { title: '写周报', estPomodoros: 3 })
})

test('空标题返回 null（批量导入时跳过该条）', () => {
  assert.equal(normalizeTaskInput('   '), null)
})

test('undefined/null 标题返回 null（AI 输出缺字段时不抛异常）', () => {
  assert.equal(normalizeTaskInput(undefined), null)
  assert.equal(normalizeTaskInput(null, 2), null)
})

test('数字等非字符串标题转为字符串', () => {
  assert.deepEqual(normalizeTaskInput(123), { title: '123', estPomodoros: null })
})

test('预估番茄数 0 或空转为 null', () => {
  assert.deepEqual(normalizeTaskInput('任务', 0), { title: '任务', estPomodoros: null })
})

// ==================== sanitizeSavedState AI状态恢复 ====================
section('aiState.js sanitizeSavedState 状态恢复净化')

test('空/非法输入返回默认结构', () => {
  const d = sanitizeSavedState(null)
  assert.equal(d.split.result, null)
  assert.equal(d.split.input, '')
  assert.equal(d.sched.result, null)
  assert.equal(d.review.result, null)
  assert.deepEqual(sanitizeSavedState('bad'), d)
})

test('合法的 result 与 input 被保留', () => {
  const r = sanitizeSavedState({
    split: { result: { tasks: [{ title: 'a' }] }, input: '大任务' },
    review: { result: { summary: 'ok' } }
  })
  assert.equal(r.split.result.tasks.length, 1)
  assert.equal(r.split.input, '大任务')
  assert.equal(r.review.result.summary, 'ok')
})

test('遗留的 reasoning 字段被丢弃', () => {
  const r = sanitizeSavedState({ split: { reasoning: '1. 解析\n2. 拆解' }, focus: { reasoning: 42 } })
  assert.equal(r.split.reasoning, undefined)
  assert.equal(r.focus.reasoning, undefined)
  assert.equal(r.split.result, null)
})

test('非对象 result 被丢弃', () => {
  const r = sanitizeSavedState({ sched: { result: 'not-object' } })
  assert.equal(r.sched.result, null)
})

test('非字符串 input 被丢弃', () => {
  const r = sanitizeSavedState({ focus: { input: 123 } })
  assert.equal(r.focus.input, '')
})

// ==================== localInsights 离线洞察 ====================
section('localInsights.js 离线洞察引擎')

const NOW = new Date(2026, 7, 17, 18, 0).getTime() // 2026-08-17 18:00（周一）
const at = (dayOffset, hour) => new Date(2026, 7, 17 + dayOffset, hour, 0).getTime()

test('最佳专注时段：取当日记录最多的2小时桶', () => {
  const records = [
    { completedAt: at(0, 9) },
    { completedAt: at(0, 9) },
    { completedAt: at(0, 10) },
    { completedAt: at(0, 15) }
  ]
  const r = bestFocusWindow(records, NOW)
  assert.equal(r.window, '08:00-10:00')
  assert.ok(r.count >= 2)
})

test('无当日记录返回 null', () => {
  assert.equal(bestFocusWindow([{ completedAt: at(-1, 9) }], NOW), null)
})

test('连续天数：今天有记录连续计数', () => {
  const records = [{ completedAt: at(0, 9) }, { completedAt: at(-1, 9) }, { completedAt: at(-2, 9) }]
  assert.equal(focusStreakDays(records, NOW), 3)
})

test('连续天数：今天没有则从昨天起算', () => {
  const records = [{ completedAt: at(-1, 9) }, { completedAt: at(-2, 9) }]
  assert.equal(focusStreakDays(records, NOW), 2)
})

test('超载任务：消耗超过预估且未完成', () => {
  const tasks = [
    { title: 'a', done: false, estPomodoros: 2, consumedPomodoros: 3 },
    { title: 'b', done: true, estPomodoros: 1, consumedPomodoros: 5 },
    { title: 'c', done: false, estPomodoros: 3, consumedPomodoros: 1 }
  ]
  assert.equal(overloadTasks(tasks).length, 1)
})

test('汇总洞察：包含今日总结且结构完整', () => {
  const r = buildInsights([{ completedAt: at(0, 9) }], [{ title: 't', done: false }], NOW)
  assert.ok(r.length > 0)
  assert.ok(r.some((i) => i.title === '今日总结'))
  for (const i of r) assert.ok(i.icon && i.title && i.body)
})

test('性能验收：2000条记录的7天聚合+洞察计算 <50ms', () => {
  const records = []
  for (let i = 0; i < 2000; i++) {
    records.push({ completedAt: NOW - (i % 90) * 86400000 - (i % 24) * 3600000 })
  }
  const t0 = Date.now()
  // 与 useStats.last7Days 相同的聚合逻辑
  for (let i = 6; i >= 0; i--) {
    const start = startOfDay(NOW - i * 86400000)
    records.filter((r) => r.completedAt >= start && r.completedAt < start + 86400000)
  }
  buildInsights(records, [], NOW)
  const elapsed = Date.now() - t0
  assert.ok(elapsed < 50, `耗时 ${elapsed}ms，超出 50ms 预算`)
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

// ==================== storage.js 双写持久化核心 ====================
section('storage.js createDualStore 双写/恢复逻辑')

/** 内存版双后端：可模拟 IndexedDB 宕机或永久挂起；idbTimeoutMs 注入超时保护；onPartialFailure 观察单侧失败 */
function makeFake({ hang = false, idbTimeoutMs = 0, onPartialFailure = null } = {}) {
  const idb = new Map()
  const fs = new Map()
  let idbBroken = false
  const hangOp = () => new Promise(() => {}) // 永不 resolve/reject，模拟 leveldb 损坏卡死
  const store = createDualStore({
    idbTimeoutMs,
    onPartialFailure,
    idbGet: async (k) => {
      if (idbBroken) throw new Error('idb down')
      if (hang) return hangOp()
      return idb.has(k) ? idb.get(k) : null
    },
    idbSet: async (k, v) => {
      if (idbBroken) throw new Error('idb down')
      if (hang) return hangOp()
      idb.set(k, v)
    },
    idbRemove: async (k) => {
      if (idbBroken) throw new Error('idb down')
      if (hang) return hangOp()
      idb.delete(k)
    },
    fsGet: async (k) => (fs.has(k) ? JSON.parse(fs.get(k)) : null),
    fsSet: async (k, v) => fs.set(k, JSON.stringify(v)),
    fsRemove: async (k) => fs.delete(k)
  })
  return { idb, fs, store, breakIdb: () => { idbBroken = true } }
}

/** 信封数据读取辅助：断言某侧信封内的 data（兼容 fs 侧 JSON 字符串存储） */
function envData(map, key) {
  let raw = map.get(key)
  if (raw === undefined) raw = null
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      raw = null
    }
  }
  return parseSide(raw).data
}

test('写入：两侧都落一份，均为信封格式', async () => {
  const { idb, fs, store } = makeFake()
  await store.write('tasks', [{ id: 1 }])
  for (const raw of [idb.get('tasks'), JSON.parse(fs.get('tasks'))]) {
    assert.equal(raw.v, 1)
    assert.deepEqual(raw.data, [{ id: 1 }])
    assert.ok(typeof raw.savedAt === 'number' && raw.savedAt > 0)
  }
})

test('写入：单侧失败经 onPartialFailure 上报，另一侧仍可用', async () => {
  const reported = []
  const half = createDualStore({
    idbGet: async () => null,
    idbSet: async () => {},
    idbRemove: async () => {},
    fsGet: async () => null,
    fsSet: async () => {
      throw new Error('fs down')
    },
    fsRemove: async () => {},
    onPartialFailure: (side) => reported.push(side)
  })
  await half.write('tasks', [1]) // 不抛：IndexedDB 成功即视为已持久化
  assert.deepEqual(reported, ['fs']) // 文件侧失败已上报，不再静默
  const ok = makeFake()
  await ok.store.write('tasks', [1])
  assert.deepEqual(envData(ok.idb, 'tasks'), [1]) // IndexedDB 侧信封数据
})

test('写入：两侧都失败才抛错', async () => {
  const broken = createDualStore({
    idbGet: async () => null,
    idbSet: async () => {
      throw new Error('idb down')
    },
    idbRemove: async () => {},
    fsGet: async () => null,
    fsSet: async () => {
      throw new Error('fs down')
    },
    fsRemove: async () => {}
  })
  await assert.rejects(() => broken.write('tasks', [1]))
})

test('读取：IndexedDB 有数据（旧版遗留格式）时优先并刷新镜像', async () => {
  const { idb, fs, store } = makeFake()
  idb.set('tasks', [{ id: 1 }]) // 旧版原始格式
  const r = await store.read('tasks', null)
  assert.deepEqual(r, [{ id: 1 }])
  await store.flush() // 等待后台修复
  assert.ok(fs.has('tasks')) // 镜像被回填为信封
  assert.deepEqual(JSON.parse(fs.get('tasks')).data, [{ id: 1 }])
})

test('读取：IndexedDB 丢失时从镜像恢复并回写', async () => {
  const { idb, fs, store } = makeFake()
  fs.set('tasks', JSON.stringify({ v: 1, savedAt: 1, data: [{ id: 9 }] }))
  const r = await store.read('tasks', null)
  assert.deepEqual(r, [{ id: 9 }])
  await store.flush()
  assert.deepEqual(envData(idb, 'tasks'), [{ id: 9 }]) // 回写 IndexedDB（信封格式）
})

test('读取：IndexedDB 报错时回退镜像（进程被杀后存储损坏的场景）', async () => {
  const { fs, store, breakIdb } = makeFake()
  fs.set('tasks', JSON.stringify({ v: 1, savedAt: 2, data: [{ id: 9 }] }))
  breakIdb() // 模拟 IndexedDB 宕机
  const r = await store.read('tasks', null)
  assert.deepEqual(r, [{ id: 9 }])
})

test('读取：文件镜像较新时取镜像并回修 IndexedDB（防文件优先读到旧数据）', async () => {
  const { idb, fs, store } = makeFake()
  idb.set('tasks', { v: 1, savedAt: 100, data: [{ id: 'old' }] })
  fs.set('tasks', JSON.stringify({ v: 1, savedAt: 200, data: [{ id: 'new' }] }))
  const r = await store.read('tasks', null)
  assert.deepEqual(r, [{ id: 'new' }]) // 取新者
  await store.flush()
  assert.deepEqual(envData(idb, 'tasks'), [{ id: 'new' }]) // IndexedDB 被修复为较新数据
})

test('读取：升级场景遗留 IndexedDB 数据胜于信封镜像（保护旧版最后一次写入）', async () => {
  const { idb, fs, store } = makeFake()
  idb.set('tasks', [{ id: 'legacy-newest' }]) // v0.1.8 遗留：可能是最后一次成功写入
  fs.set('tasks', JSON.stringify({ v: 1, savedAt: 999999999, data: [{ id: 'fs-older' }] }))
  const r = await store.read('tasks', null)
  assert.deepEqual(r, [{ id: 'legacy-newest' }]) // 遗留方胜
  await store.flush()
  assert.deepEqual(envData(fs, 'tasks'), [{ id: 'legacy-newest' }]) // 镜像收敛为遗留数据
})

test('读取：兼容早期无信封的镜像文件', async () => {
  const { fs, store } = makeFake()
  fs.set('tasks', JSON.stringify([{ id: 5 }]))
  assert.deepEqual(await store.read('tasks', null), [{ id: 5 }])
})

test('读取：两侧都无数据返回 fallback', async () => {
  const { store } = makeFake()
  assert.equal(await store.read('tasks', null), null)
})

test('删除：两侧都清除', async () => {
  const { idb, fs, store } = makeFake()
  idb.set('tasks', { v: 1, savedAt: 1, data: [1] })
  fs.set('tasks', JSON.stringify({ v: 1, savedAt: 1, data: [1] }))
  await store.remove('tasks')
  assert.equal(idb.has('tasks'), false)
  assert.equal(fs.has('tasks'), false)
})

test('chooseSide：信封取 savedAt 新者，相同时取先者', () => {
  const oldSide = parseSide({ v: 1, savedAt: 100, data: [1] })
  const newSide = parseSide({ v: 1, savedAt: 200, data: [2] })
  assert.equal(chooseSide(oldSide, newSide), newSide)
  assert.equal(chooseSide(newSide, oldSide), newSide)
  assert.equal(chooseSide(oldSide, parseSide({ v: 1, savedAt: 100, data: [1] })), oldSide)
})

test('chooseSide：遗留与信封混合时遗留方胜（保护升级前最新写入）', () => {
  const legacy = parseSide([{ id: 'x' }]) // 无信封 → legacy
  const env = parseSide({ v: 1, savedAt: 999999999, data: [{ id: 'y' }] })
  assert.equal(legacy.legacy, true)
  assert.equal(chooseSide(env, legacy), legacy)
  assert.equal(chooseSide(legacy, env), legacy)
})

test('chooseSide：两侧都遗留时取先者（IndexedDB）', () => {
  const a = parseSide([1])
  const b = parseSide([2])
  assert.equal(chooseSide(a, b), a)
})

test('写队列：串行执行，单次失败不阻断后续写入', async () => {
  const { store } = makeFake()
  const order = []
  await store.write('tasks', [1])
  store.enqueue(async () => order.push('a'))
  store.enqueue(async () => {
    throw new Error('boom')
  })
  store.enqueue(async () => order.push('b'))
  await store.flush()
  assert.deepEqual(order, ['a', 'b']) // 中间失败不影响后面的任务
})

test('读取：IndexedDB 永久挂起时超时降级到镜像（损坏卡死场景）', async () => {
  const { fs, store } = makeFake({ hang: true, idbTimeoutMs: 30 })
  fs.set('tasks', JSON.stringify({ v: 1, savedAt: 1, data: [{ id: 7 }] }))
  const started = Date.now()
  const r = await store.read('tasks', null)
  assert.deepEqual(r, [{ id: 7 }]) // 从镜像恢复
  assert.ok(Date.now() - started < 2000) // 未被挂起卡死
})

test('写入：IndexedDB 永久挂起时超时不卡死，文件镜像成功即视为已持久化', async () => {
  const { fs, store } = makeFake({ hang: true, idbTimeoutMs: 30 })
  await store.write('tasks', [{ id: 3 }]) // 不抛、不卡死
  const env = JSON.parse(fs.get('tasks'))
  assert.deepEqual(env.data, [{ id: 3 }]) // 镜像侧已落盘
})

test('删除：IndexedDB 永久挂起时超时后仍清除镜像侧', async () => {
  const { fs, store } = makeFake({ hang: true, idbTimeoutMs: 30 })
  fs.set('tasks', JSON.stringify({ v: 1, savedAt: 1, data: [1] }))
  await store.remove('tasks')
  assert.equal(fs.has('tasks'), false)
})

test('序列化：中文与 emoji 内容经 JSON 双通道往返无损', async () => {
  const { idb, fs, store } = makeFake()
  const payload = [
    { id: 'a', title: '准备产品发布会 🍅 番茄工作法', done: false, createdAt: 1735000000000 },
    { id: 'b', title: '写周报：完成度 50%（含引号 " 与换行\n 测试）', done: true }
  ]
  await store.write('tasks', payload)
  // 双通道各自经真实 JSON.stringify/parse 往返，信封内数据一致
  assert.deepEqual(JSON.parse(JSON.stringify(idb.get('tasks'))).data, payload)
  assert.deepEqual(JSON.parse(fs.get('tasks')).data, payload)
  const readBack = await store.read('tasks', null)
  assert.deepEqual(readBack, payload)
})

// ==================== schedule.js 课程表纯逻辑 ====================
section('schedule.js 周次/课程规则')
// 锚点：2026-09-07 周一（第 1 周起点）

test('weekNumberFor：周一为第 1 周起点，周日仍在第 1 周', () => {
  assert.equal(weekNumberFor('2026-09-07', '2026-09-07'), 1)
  assert.equal(weekNumberFor('2026-09-13', '2026-09-07'), 1)
})

test('weekNumberFor：下一周递进，早于学期按第 1 周', () => {
  assert.equal(weekNumberFor('2026-09-14', '2026-09-07'), 2)
  assert.equal(weekNumberFor('2026-09-21', '2026-09-07'), 3)
  assert.equal(weekNumberFor('2026-08-10', '2026-09-07'), 1)
})

test('mondayOf：周中与周日都归到本周一', () => {
  assert.equal(fmtDate(mondayOf(new Date(2026, 8, 10))), '2026-09-07') // 周四
  assert.equal(fmtDate(mondayOf(new Date(2026, 8, 13))), '2026-09-07') // 周日
})

test('courseInWeek：每周/单周/双周/自定义规则', () => {
  assert.equal(courseInWeek({ weekRule: { type: 'every' } }, 5), true)
  assert.equal(courseInWeek({ weekRule: { type: 'odd' } }, 3), true)
  assert.equal(courseInWeek({ weekRule: { type: 'odd' } }, 4), false)
  assert.equal(courseInWeek({ weekRule: { type: 'even' } }, 2), true)
  assert.equal(courseInWeek({ weekRule: { type: 'even' } }, 1), false)
  assert.equal(courseInWeek({ weekRule: { type: 'custom', weeks: [2, 5] } }, 5), true)
  assert.equal(courseInWeek({ weekRule: { type: 'custom', weeks: [2, 5] } }, 3), false)
})

test('courseInWeek：缺省规则按每周上课', () => {
  assert.equal(courseInWeek({}, 7), true)
  assert.equal(courseInWeek({ weekRule: null }, 7), true)
})

test('buildWeekDays：一周 7 天、周一至周日、今日标记存在', () => {
  const days = buildWeekDays(2, '2026-09-07')
  assert.equal(days.length, 7)
  assert.equal(days[0].label, '周一')
  assert.equal(days[0].dow, 1)
  assert.equal(days[6].label, '周日')
  assert.equal(fmtDate(days[0].date), '2026-09-14')
  assert.equal(fmtDate(days[6].date), '2026-09-20')
  assert.equal(typeof days[0].isToday, 'boolean')
})

test('weekRangeLabel：周区间文案正确', () => {
  assert.equal(weekRangeLabel(1, '2026-09-07', 20), '第 1 周 (09.07-09.13)')
  assert.equal(weekRangeLabel(2, '2026-09-07', 20), '第 2 周 (09.14-09.20)')
})

test('defaultMeta 与色盘：结构完整', () => {
  const m = defaultMeta()
  assert.equal(typeof m.semesterStart, 'string')
  assert.equal(m.totalWeeks, 20)
  assert.equal(m.showWeekend, true)
  assert.equal(fmtDate(mondayOf(new Date())), m.semesterStart) // 起始日 = 本周一
  assert.equal(COURSE_COLORS.length, 8)
})

test('normalizeSections：非法/缺失回退内置表，合法排序', () => {
  assert.equal(normalizeSections(null).length, 12)
  assert.equal(normalizeSections([{ index: 1, start: 'x', end: 'y' }]).length, 12) // 字段非法
  const custom = normalizeSections([
    { index: 2, start: '09:00', end: '09:45' },
    { index: 1, start: '08:00', end: '08:45' }
  ])
  assert.equal(custom.length, 2)
  assert.equal(custom[0].index, 1) // 按 index 排序
})

test('weeksOf：每周/单周/双周/自定义周次集合', () => {
  assert.deepEqual(weeksOf({ weekRule: { type: 'every' } }, 5), [1, 2, 3, 4, 5])
  assert.deepEqual(weeksOf({ weekRule: { type: 'odd' } }, 5), [1, 3, 5])
  assert.deepEqual(weeksOf({ weekRule: { type: 'even' } }, 5), [2, 4])
  assert.deepEqual(weeksOf({ weekRule: { type: 'custom', weeks: [3, 99, -1] } }, 5), [3]) // 越界过滤
  assert.deepEqual(weeksOf({}, 3), [1, 2, 3]) // 缺省规则
})

test('findConflicts：同日 + 节次重叠 + 周次相交才冲突', () => {
  const list = [
    { id: 'a', name: '高数', dayOfWeek: 1, startSection: 1, endSection: 2, weekRule: { type: 'every' } },
    { id: 'b', name: '英语', dayOfWeek: 1, startSection: 3, endSection: 4, weekRule: { type: 'every' } },
    { id: 'c', name: '体育', dayOfWeek: 1, startSection: 1, endSection: 2, weekRule: { type: 'odd' } }
  ]
  const base = { id: 'x', name: '新课程', dayOfWeek: 1, startSection: 2, endSection: 3, weekRule: { type: 'every' } }
  const r1 = findConflicts(base, list, 20) // 2-3 节与高数(1-2)/英语(3-4) 边界重叠
  assert.deepEqual(r1.map((x) => x.course.name), ['高数', '英语', '体育'])
  // 与单周课(体育)同节次：每周课任何周都冲突
  const r2 = findConflicts({ ...base, startSection: 1, endSection: 2 }, list, 20)
  assert.deepEqual(r2.map((x) => x.course.name).sort(), ['体育', '高数'])
  // 双周课 vs 单周课：同节次但不冲突（周次不相交）
  const r3 = findConflicts({ ...base, weekRule: { type: 'even' }, startSection: 1, endSection: 2 }, list, 20)
  assert.deepEqual(r3.map((x) => x.course.name), ['高数'])
  // 编辑自身不与自己冲突（英语 3-4 节与自身外课程无重叠）
  const r4 = findConflicts({ ...list[1], id: 'b' }, list, 20)
  assert.deepEqual(r4, [])
  // 不同天不冲突
  const r5 = findConflicts({ ...base, dayOfWeek: 2 }, list, 20)
  assert.deepEqual(r5, [])
})

// ==================== importSchedule.js 课表导入/导出 ====================
section('importSchedule.js 导入解析/分享口令')

test('parseWeekRule：连续/单双/自定义周次', () => {
  assert.equal(parseWeekRule('1-16周').type, 'every')
  assert.deepEqual(parseWeekRule('1-8(单)'), { type: 'odd', weeks: [1, 3, 5, 7] })
  assert.deepEqual(parseWeekRule('1-8双'), { type: 'even', weeks: [2, 4, 6, 8] })
  assert.deepEqual(parseWeekRule('3,5,7'), { type: 'custom', weeks: [3, 5, 7] })
  assert.deepEqual(parseWeekRule('1-3,9-10'), { type: 'custom', weeks: [1, 2, 3, 9, 10] })
  assert.deepEqual(parseWeekRule(''), { type: 'every', weeks: [] })
})

test('parseSectionRange / parseDayOfWeek：常见表述', () => {
  assert.deepEqual(parseSectionRange('1-2'), { startSection: 1, endSection: 2 })
  assert.deepEqual(parseSectionRange('3,4节'), { startSection: 3, endSection: 4 })
  assert.equal(parseSectionRange(''), null)
  assert.equal(parseDayOfWeek('周一'), 1)
  assert.equal(parseDayOfWeek('星期四'), 4)
  assert.equal(parseDayOfWeek('日'), 7)
  assert.equal(parseDayOfWeek('周六'), 6)
  assert.equal(parseDayOfWeek('随便'), null)
})

test('parseHtmlColumns：列式课表表格解析', () => {
  const html = `
  <table>
    <tr><th>课程名称</th><th>教师</th><th>上课地点</th><th>星期</th><th>节次</th><th>周次</th></tr>
    <tr><td>大学高数</td><td>李明</td><td>南104</td><td>周一</td><td>1-2</td><td>1-16周</td></tr>
    <tr><td>体育3</td><td>王强</td><td>田径场</td><td>周三</td><td>5-6</td><td>1-8(单)</td></tr>
    <tr><td></td><td>赵</td><td>无</td><td>周五</td><td>7-8</td><td>1-16周</td></tr>
  </table>`
  const list = parseHtmlColumns(html)
  assert.ok(list && list.length === 2, '缺少名称/星期的行被跳过')
  assert.equal(list[0].name, '大学高数')
  assert.equal(list[0].location, '南104')
  assert.equal(list[0].dayOfWeek, 1)
  assert.deepEqual(list[0].weekRule, { type: 'every', weeks: [] })
  assert.equal(list[1].weekRule.type, 'odd')
  assert.deepEqual(list[1].weekRule.weeks, [1, 3, 5, 7])
})

test('parseHtmlColumns：无表格/列头不匹配返回 null', () => {
  assert.equal(parseHtmlColumns('普通文本'), null)
  assert.equal(parseHtmlColumns('<table><tr><td>a</td><td>b</td></tr></table>'), null)
})

test('分享口令：encode/decode 往返无损（含中文与 emoji）', () => {
  const courses = [{ name: '离散数学 🎓', dayOfWeek: 3, startSection: 1, endSection: 2, weekRule: { type: 'odd', weeks: [1, 3] } }]
  const share = encodeShare(courses)
  assert.ok(share.startsWith('TA1:'))
  const back = decodeShare(share)
  assert.equal(back.length, 1)
  assert.equal(back[0].name, '离散数学 🎓')
  assert.deepEqual(back[0].weekRule, { type: 'odd', weeks: [1, 3] })
  assert.equal(decodeShare('错误内容'), null)
})

test('sniffImport：识别 html / 口令 / 未知', () => {
  assert.equal(sniffImport('<table><tr>x</tr></table>'), 'html')
  assert.equal(sniffImport('TA1:abc'), 'share')
  assert.equal(sniffImport('随便写点什么'), 'unknown')
})

test('sanitizeImport：过滤无效条目', () => {
  const list = [
    { name: '课程A', dayOfWeek: 3, startSection: 1, endSection: 2 },
    { name: 'x', dayOfWeek: 3, startSection: 1, endSection: 2 }, // 名称太短
    { name: '课程B', dayOfWeek: 9, startSection: 1, endSection: 2 } // 星期非法
  ]
  const valid = sanitizeImport(list, COURSE_COLORS)
  assert.equal(valid.length, 1)
  assert.equal(valid[0].name, '课程A')
})

test('sanitizeImport：缺色项按色盘循环补色', () => {
  const list = [
    { name: '课程A', dayOfWeek: 1, startSection: 1, endSection: 2 },
    { name: '课程B', dayOfWeek: 2, startSection: 1, endSection: 2 },
    { name: '课程C', dayOfWeek: 3, startSection: 1, endSection: 2, color: '#123456' }
  ]
  const valid = sanitizeImport(list, COURSE_COLORS, 0)
  assert.equal(valid[0].color, COURSE_COLORS[0])
  assert.equal(valid[1].color, COURSE_COLORS[1])
  assert.equal(valid[2].color, '#123456') // 已带色保留
})

test('parseTableGrid：rowspan/colspan 还原为等宽网格', () => {
  const html = `
  <table>
    <tr><td rowspan="2">左侧</td><td>a</td><td>b</td></tr>
    <tr><td colspan="2">宽格</td></tr>
  </table>`
  const grid = parseTableGrid(html)
  assert.equal(grid.length, 2)
  assert.equal(grid[0].length, 3)
  assert.equal(grid[1].length, 3) // 等宽归一化
  assert.equal(grid[0][0], '左侧')
  assert.equal(grid[1][0], '左侧') // rowspan 覆盖行保留文本
  assert.equal(grid[1][1], '宽格') // colspan 复制
  assert.equal(grid[1][2], '宽格')
})

test('parseMatrixCell：@地点/周次/教师启发式', () => {
  const a = parseMatrixCell('数据库系统@立园楼301(A-B) 1-16周')
  assert.equal(a.name, '数据库系统')
  assert.ok(a.location.includes('立园楼301'))
  assert.deepEqual(a.weekRule, { type: 'every', weeks: [] })
  const b = parseMatrixCell('大学体育3 王强 田径场 1-8(单)')
  assert.equal(b.name, '大学体育3')
  assert.equal(b.location, '田径场')
  assert.equal(b.teacher, '王强')
  assert.deepEqual(b.weekRule, { type: 'odd', weeks: [1, 3, 5, 7] })
  assert.equal(parseMatrixCell('非本周'), null)
})

test('parseHtmlMatrix：矩阵课表（含连堂合并与单双周）', () => {
  const html = `
  <table>
    <tr><th>节次</th><th>周一</th><th>周三</th><th>周五</th></tr>
    <tr><td>1</td><td rowspan="2">大学高数@南104</td><td></td><td></td></tr>
    <tr><td>2</td><td></td><td></td></tr>
    <tr><td>3</td><td></td><td>体育3 田径场 1-8(单)</td><td></td></tr>
  </table>`
  const list = parseHtmlMatrix(html)
  assert.ok(list && list.length === 2, `矩阵解析应得 2 门课，实际 ${list && list.length}`)
  const math = list.find((c) => c.name === '大学高数')
  assert.ok(math)
  assert.equal(math.dayOfWeek, 1)
  assert.equal(math.startSection, 1)
  assert.equal(math.endSection, 2) // 连堂合并
  assert.equal(math.location, '南104')
  const pe = list.find((c) => c.name === '大学体育3' || c.name === '体育3')
  assert.ok(pe)
  assert.equal(pe.weekRule.type, 'odd')
})

test('parseHtmlCourseTable：列式优先、矩阵回退、互不误判', () => {
  const columnar = `<table><tr><th>课程名称</th><th>星期</th><th>节次</th></tr>
    <tr><td>线性代数</td><td>周二</td><td>3-4</td></tr></table>`
  const col = parseHtmlCourseTable(columnar)
  assert.equal(col.length, 1)
  assert.equal(col[0].name, '线性代数')

  const matrix = `<table><tr><th>节次</th><th>周一</th><th>周二</th><th>周三</th></tr>
    <tr><td>1</td><td>英语@外语楼</td><td></td><td></td></tr></table>`
  const mat = parseHtmlCourseTable(matrix)
  assert.equal(mat.length, 1)
  assert.equal(mat[0].name, '英语')
  assert.equal(parseHtmlCourseTable('<p>没有表格</p>'), null)
})

test('dedupeAgainst：判重键为名称+星期+节次+周次规则', () => {
  const existing = [
    { name: '高数', dayOfWeek: 1, startSection: 1, endSection: 2, weekRule: { type: 'every', weeks: [] } },
    { name: '体育', dayOfWeek: 3, startSection: 5, endSection: 6, weekRule: { type: 'odd', weeks: [1, 3] } }
  ]
  const incoming = [
    { name: '高数', dayOfWeek: 1, startSection: 1, endSection: 2, weekRule: { type: 'every', weeks: [] } }, // 完全重复
    { name: '高数', dayOfWeek: 1, startSection: 1, endSection: 2, weekRule: { type: 'odd', weeks: [1, 3] } }, // 周次不同 → 不算重
    { name: '英语', dayOfWeek: 2, startSection: 3, endSection: 4, weekRule: { type: 'every', weeks: [] } }, // 新课程
    { name: '英语', dayOfWeek: 2, startSection: 3, endSection: 4, weekRule: { type: 'every', weeks: [] } } // 同批内重复
  ]
  const { fresh, duplicates } = dedupeAgainst(existing, incoming)
  assert.equal(fresh.length, 2)
  assert.equal(duplicates.length, 2)
  assert.deepEqual(fresh.map((c) => c.name), ['高数', '英语'])
  assert.equal(
    courseKey(existing[1]),
    courseKey({ ...existing[1], weekRule: { type: 'odd', weeks: [3, 1] } })
  ) // 周次数组顺序无关
})

test('防回归：useTasks() 暴露 incrementTaskPomodoros（绑定任务计数依赖）', () => {
  const api = useTasks()
  assert.equal(typeof api.incrementTaskPomodoros, 'function')
  assert.equal(typeof api.addTask, 'function')
  assert.equal(typeof api.ensureLoaded, 'function')
})

// ==================== EAMS 教务（湖南一师真实格式） ====================
section('importSchedule.js beangle EAMS 专属解析')

// 按真实页面结构精简：14 行节次（含中午两行）+ 内嵌 TaskActivity 结构化数据
const EAMS_FIXTURE = `
<table id="manualArrangeCourseTable">
<tr><td> 第一节</td><td id="TD0_0" rowspan="2">大学高阶英语 (吴丽萍)</td><td id="TD14_0"></td></tr>
<tr><td> 第二节</td><td id="TD29_0"></td></tr>
<tr><td> 第三节</td><td id="TD2_0"></td></tr>
<tr><td> 第四节</td><td id="TD3_0"></td></tr>
<tr><td> 中午一节</td><td id="TD4_0"></td></tr>
<tr><td> 中午二节</td><td id="TD5_0"></td></tr>
<tr><td> 第五节</td><td id="TD6_0" rowspan="2">大学体育3 (刘娟)</td></tr>
<tr><td> 第六节</td></tr>
<tr><td> 第七节</td><td id="TD8_0"></td></tr>
<tr><td> 第八节</td><td id="TD9_0"></td></tr>
<tr><td> 第九节</td><td id="TD10_0"></td></tr>
<tr><td> 第十节</td><td id="TD11_0"></td></tr>
<tr><td> 第十一节</td><td id="TD12_0"></td></tr>
<tr><td> 第十二节</td><td id="TD13_0"></td></tr>
</table>
<script>
var unitCount = 14;
var table0 = new CourseTable(2026,98);
var teachers = [{id:775,name:"吴丽萍",lab:false}];
activity = new TaskActivity(actTeacherId.join(','),actTeacherName.join(','),"18770(TSGW1030.01)","大学高阶英语","303","润寰南104","01111111111111111000000000000000000000000000000000000",null,"",assistantName,"","", "班级:25计科润之卓越班","","");
index =0*unitCount+0;
table0.activities[index][table0.activities[index].length]=activity;
index =0*unitCount+1;
table0.activities[index][table0.activities[index].length]=activity;
var teachers = [{id:7053193,name:"刘娟",lab:false}];
activity = new TaskActivity(actTeacherId.join(','),actTeacherName.join(','),"6284(TSTY1011.F8)","大学体育3","577","田径场","01111111111110000000000000000000000000000000000000000",null,"",assistantName,"","", "定向越野与野外生存:25学前国际1班","","");
index =0*unitCount+6;
table0.activities[index][table0.activities[index].length]=activity;
index =0*unitCount+7;
table0.activities[index][table0.activities[index].length]=activity;
var teachers = [{id:661,name:"代正利",lab:false}];
activity = new TaskActivity(actTeacherId.join(','),actTeacherName.join(','),"17754(TSWY2121.01)","毛泽东诗词英译赏析","378","怀中南206","00111111111100100000000000000000000000000000000000000",null,"",assistantName,"","", "全校","","");
index =1*unitCount+10;
table0.activities[index][table0.activities[index].length]=activity;
var teachers = [{id:155,name:"杨恒伏",lab:false}];
activity = new TaskActivity(actTeacherId.join(','),actTeacherName.join(','),"20561(JS021031.01)","离散数学","-1","停课","00100000000000000000000000000000000000000000000000000",null,"",assistantName,"","", "班级:25计科润之卓越班","","");
index =3*unitCount+2;
table0.activities[index][table0.activities[index].length]=activity;
var teachers = [{id:772,name:"宋徽瑾",lab:false}];
activity = new TaskActivity(actTeacherId.join(','),actTeacherName.join(','),"18867(TSMY1124.37)","毛泽东思想和中国特色社会主义理论体系概论","1869","探究式学习实践","00100000000000000000000000000000000000000000000000000",null,"",assistantName,"","", "班级:25大数据3班","","");
index =4*unitCount+8;
table0.activities[index][table0.activities[index].length]=activity;
index =4*unitCount+9;
table0.activities[index][table0.activities[index].length]=activity;
var teachers = [{id:772,name:"宋徽瑾",lab:false}];
activity = new TaskActivity(actTeacherId.join(','),actTeacherName.join(','),"18867(TSMY1124.37)","毛泽东思想和中国特色社会主义理论体系概论","492","玉衡楼106","00001000000000001000000000000000000000000000000000000",null,"",assistantName,"","", "班级:25计科润之卓越班","","");
index =4*unitCount+8;
table0.activities[index][table0.activities[index].length]=activity;
index =4*unitCount+9;
table0.activities[index][table0.activities[index].length]=activity;
</script>`

test('parseEamsScript：字段映射（名称/教师/地点/星期/节次/连堂）', () => {
  const list = parseEamsScript(EAMS_FIXTURE)
  const eng = list.find((c) => c.name === '大学高阶英语')
  assert.ok(eng, '应解析出大学高阶英语')
  assert.equal(eng.teacher, '吴丽萍')
  assert.equal(eng.location, '润寰南104')
  assert.equal(eng.dayOfWeek, 1) // day 0 → 周一
  assert.equal(eng.startSection, 1) // 连堂两条 index 合并 1-2 节
  assert.equal(eng.endSection, 2)
  assert.deepEqual(eng.weekRule, { type: 'every', weeks: [] }) // 位图 1-16 连续
})

test('parseEamsScript：中午行跳过后节次对齐（第五节→第 5 节）', () => {
  const list = parseEamsScript(EAMS_FIXTURE)
  const pe = list.find((c) => c.name === '大学体育3')
  assert.ok(pe)
  assert.equal(pe.dayOfWeek, 1)
  assert.equal(pe.startSection, 5) // 0 基 6，跳过中午两行
  assert.equal(pe.endSection, 6)
  assert.equal(pe.location, '田径场')
  assert.deepEqual(pe.weekRule, { type: 'every', weeks: [] }) // 1-12 周
})

test('parseEamsScript：位图→周次（多区间/跨周）', () => {
  const list = parseEamsScript(EAMS_FIXTURE)
  const poem = list.find((c) => c.name === '毛泽东诗词英译赏析')
  assert.ok(poem)
  assert.equal(poem.dayOfWeek, 2) // day 1 → 周二
  assert.equal(poem.startSection, 9) // 0 基 10，跳过中午两行
  assert.deepEqual(poem.weekRule, { type: 'custom', weeks: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14] })
})

test('parseEamsScript：停课活动被跳过', () => {
  const list = parseEamsScript(EAMS_FIXTURE)
  // 离散数学只有停课活动（地点=停课），不应出现
  assert.equal(list.find((c) => c.name === '离散数学'), undefined)
})

test('parseEamsScript：同槽不同周次合并为一条（周次并集）', () => {
  const list = parseEamsScript(EAMS_FIXTURE)
  const maogai = list.filter((c) => c.name === '毛泽东思想和中国特色社会主义理论体系概论')
  assert.equal(maogai.length, 1) // 探究式(第2周) + 玉衡楼(第4,16周) 合并
  assert.equal(maogai[0].dayOfWeek, 5) // day 4 → 周五
  assert.equal(maogai[0].startSection, 7) // 0 基 8，跳过中午两行
  assert.equal(maogai[0].endSection, 8)
  assert.deepEqual(maogai[0].weekRule, { type: 'custom', weeks: [2, 4, 16] }) // 周次并集
  assert.equal(maogai[0].location, '玉衡楼106') // 覆盖周最多者
})

test('weeksToRule：连续/奇偶/自定义归类', () => {
  assert.deepEqual(weeksToRule([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]), { type: 'every', weeks: [] })
  assert.deepEqual(weeksToRule([1, 3, 5, 7]), { type: 'odd', weeks: [] })
  assert.deepEqual(weeksToRule([2, 4, 6, 8]), { type: 'even', weeks: [] })
  assert.deepEqual(weeksToRule([2, 3, 4]), { type: 'custom', weeks: [2, 3, 4] }) // 非 1 起连续
  assert.deepEqual(weeksToRule([1, 2, 3, 9, 10]), { type: 'custom', weeks: [1, 2, 3, 9, 10] })
})

test('parseHtmlCourseTable：EAMS 页面走专属解析器', () => {
  const list = parseHtmlCourseTable(EAMS_FIXTURE)
  assert.ok(list.length >= 4)
  assert.ok(list.find((c) => c.name === '大学高阶英语'))
  // 无 EAMS 特征的普通矩阵表不受影响
  const matrix = `<table><tr><th>节次</th><th>周一</th><th>周二</th><th>周三</th></tr><tr><td>1</td><td>英语@外语楼</td><td></td><td></td></tr></table>`
  assert.equal(parseHtmlCourseTable(matrix).length, 1)
})

// ==================== 汇总 ====================
Promise.all(pendingTests).then(() => {
  console.log(`\n结果：${passed} 通过，${failed} 失败`)
  process.exitCode = failed > 0 ? 1 : 0
})
