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
import { createDualStore } from '../src/utils/storage'

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

/** 内存版双后端：可模拟 IndexedDB 宕机 */
function makeFake() {
  const idb = new Map()
  const fs = new Map()
  let idbBroken = false
  const store = createDualStore({
    idbGet: async (k) => {
      if (idbBroken) throw new Error('idb down')
      return idb.has(k) ? idb.get(k) : null
    },
    idbSet: async (k, v) => {
      if (idbBroken) throw new Error('idb down')
      idb.set(k, v)
    },
    idbRemove: async (k) => {
      if (idbBroken) throw new Error('idb down')
      idb.delete(k)
    },
    fsGet: async (k) => (fs.has(k) ? JSON.parse(fs.get(k)) : null),
    fsSet: async (k, v) => fs.set(k, JSON.stringify(v)),
    fsRemove: async (k) => fs.delete(k)
  })
  return { idb, fs, store, breakIdb: () => { idbBroken = true } }
}

test('写入：两侧都落一份，文件镜像为信封格式', async () => {
  const { idb, fs, store } = makeFake()
  await store.write('tasks', [{ id: 1 }])
  assert.deepEqual(idb.get('tasks'), [{ id: 1 }])
  const env = JSON.parse(fs.get('tasks'))
  assert.equal(env.v, 1)
  assert.deepEqual(env.data, [{ id: 1 }])
  assert.ok(typeof env.savedAt === 'number' && env.savedAt > 0)
})

test('写入：单侧失败静默，另一侧仍可用', async () => {
  const { store, fs } = makeFake()
  const half = createDualStore({
    idbGet: async () => null,
    idbSet: async () => {},
    idbRemove: async () => {},
    fsGet: async () => null,
    fsSet: async () => {
      throw new Error('fs down')
    },
    fsRemove: async () => {}
  })
  await half.write('tasks', [1]) // 不抛：IndexedDB 成功即视为已持久化
  const ok = makeFake()
  await ok.store.write('tasks', [1])
  assert.deepEqual(ok.idb.get('tasks'), [1])
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

test('读取：IndexedDB 有数据时优先并刷新镜像', async () => {
  const { idb, fs, store } = makeFake()
  idb.set('tasks', [{ id: 1 }])
  const r = await store.read('tasks', null)
  assert.deepEqual(r, [{ id: 1 }])
  assert.ok(fs.has('tasks')) // 镜像被刷新
  assert.deepEqual(JSON.parse(fs.get('tasks')).data, [{ id: 1 }])
})

test('读取：IndexedDB 丢失时从镜像恢复并回写', async () => {
  const { idb, fs, store } = makeFake()
  fs.set('tasks', JSON.stringify({ v: 1, savedAt: 1, data: [{ id: 9 }] }))
  const r = await store.read('tasks', null)
  assert.deepEqual(r, [{ id: 9 }])
  assert.deepEqual(idb.get('tasks'), [{ id: 9 }]) // 回写 IndexedDB
})

test('读取：IndexedDB 报错时回退镜像（进程被杀后存储损坏的场景）', async () => {
  const { idb, fs, store, breakIdb } = makeFake()
  idb.set('tasks', [{ stale: true }])
  fs.set('tasks', JSON.stringify({ v: 1, savedAt: 2, data: [{ id: 9 }] }))
  breakIdb() // 模拟 IndexedDB 宕机
  const r = await store.read('tasks', null)
  assert.deepEqual(r, [{ id: 9 }])
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
  idb.set('tasks', [1])
  fs.set('tasks', JSON.stringify({ v: 1, savedAt: 1, data: [1] }))
  await store.remove('tasks')
  assert.equal(idb.has('tasks'), false)
  assert.equal(fs.has('tasks'), false)
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

// ==================== 汇总 ====================
Promise.all(pendingTests).then(() => {
  console.log(`\n结果：${passed} 通过，${failed} 失败`)
  process.exitCode = failed > 0 ? 1 : 0
})
