import { ref, computed, watch } from 'vue'
import { genId } from '../utils/storage'
import { nextBreakMinutes } from '../utils/break'

/**
 * 番茄计时器（模块级单例）
 *
 * 双模式状态机：
 *   mode = focus：idle → running ⇄ paused →（倒计时归零）→ 自动进入 break
 *   mode = break：running ⇄ paused →（倒计时归零）→ 回到 focus 待机
 *   break 可随时跳过（skipBreak）
 *
 * 关键设计：
 * 1. 单例：组件切换/销毁不中断计时；
 * 2. 时间戳计数：剩余 = endTime - now，后台节流不漂移；
 * 3. 会话总量独立（sessionTotalMs）：计时中改时长只影响下一个番茄，当前进度环不变；
 * 4. 休息规则：每 longBreakEvery 个番茄一次长休息，其余短休息（utils/break.js）。
 */

const TICK_MS = 500 // 刷新间隔：显示粒度为秒，500ms 足够顺滑，且大幅降低弱 WebView 的渲染压力

const mode = ref('focus') // focus | break
const breakKind = ref('short') // short | long
const completedCount = ref(0) // 自上次长休息以来完成的番茄数（内存态，刷新重置）
const state = ref('idle') // idle | running | paused | completed
const durationSec = ref(25 * 60)
const remainingMs = ref(durationSec.value * 1000)

// 设置缓存（applySettings 注入；UI 修改时长只改 durationSec）
let focusSec = 25 * 60
let shortBreakSec = 5 * 60
let longBreakSec = 15 * 60
let longBreakEvery = 4

let timerId = null
let endTime = 0
let sessionTotalMs = durationSec.value * 1000
let completeHandler = null
let abandonHandler = null // 放弃事件（供状态检测统计）
let pauseHandler = null // 暂停事件（仅专注模式上报）

const remainingSec = computed(() => Math.max(0, Math.ceil(remainingMs.value / 1000)))

/** 剩余时间展示，mm:ss 格式 */
const displayTime = computed(() => {
  const m = String(Math.floor(remainingSec.value / 60)).padStart(2, '0')
  const s = String(remainingSec.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

/** 进度环：按"当前会话总量"计算剩余占比，改时长不影响进行中的会话 */
const progress = computed(() => {
  if (sessionTotalMs <= 0) return 0
  return Math.min(1, Math.max(0, remainingMs.value / sessionTotalMs))
})

function startTicker() {
  stopTicker()
  timerId = setInterval(() => {
    // 【加固】单次 tick 异常隔离：任何意外错误都不会让定时器中断或污染后续 tick
    try {
      remainingMs.value = Math.max(0, endTime - Date.now())
      if (remainingMs.value <= 0) finish()
    } catch {
      /* 单次 tick 失败忽略，下一 tick 继续 */
    }
  }, TICK_MS)
}

function stopTicker() {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
}

/** 开始：idle 开跑 / 休息结束态开下一个番茄 / completed 态重开 */
function start() {
  if (state.value === 'completed' || remainingMs.value <= 0) {
    remainingMs.value = durationSec.value * 1000
  }
  sessionTotalMs = durationSec.value * 1000
  endTime = Date.now() + remainingMs.value
  state.value = 'running'
  startTicker()
}

/** 暂停（专注模式上报事件，供状态检测统计） */
function pause() {
  if (state.value !== 'running') return
  remainingMs.value = Math.max(0, endTime - Date.now())
  stopTicker()
  state.value = 'paused'
  if (mode.value === 'focus') pauseHandler?.({ at: Date.now() })
}

/** 继续 */
function resume() {
  if (state.value !== 'paused') return
  endTime = Date.now() + remainingMs.value
  state.value = 'running'
  startTicker()
}

/** 放弃专注 / 跳过休息（统一回到专注待机；放弃专注时上报事件） */
function abandon() {
  stopTicker()
  const wasFocus = mode.value === 'focus'
  const plannedSec = wasFocus ? durationSec.value : null
  mode.value = 'focus'
  durationSec.value = focusSec
  remainingMs.value = focusSec * 1000
  sessionTotalMs = focusSec * 1000
  state.value = 'idle'
  if (wasFocus) abandonHandler?.({ at: Date.now(), plannedSec })
}

/** 跳过休息（回到专注待机） */
function skipBreak() {
  abandon()
}

/** 倒计时归零：番茄→自动切休息；休息结束→回到专注待机（重入保护：非运行态直接忽略） */
function finish() {
  if (state.value !== 'running') return
  stopTicker()
  remainingMs.value = 0

  if (mode.value === 'focus') {
    const doneSec = durationSec.value // 记录本次专注的实际时长
    completedCount.value += 1
    const breakMin = nextBreakMinutes(completedCount.value, {
      shortMinutes: shortBreakSec / 60,
      longMinutes: longBreakSec / 60,
      every: longBreakEvery
    })
    breakKind.value = breakMin === longBreakSec / 60 ? 'long' : 'short'
    mode.value = 'break'
    durationSec.value = breakMin * 60
    remainingMs.value = breakMin * 60 * 1000
    sessionTotalMs = remainingMs.value
    endTime = Date.now() + remainingMs.value
    state.value = 'running' // 自动开始休息倒计时
    startTicker()
    completeHandler?.({
      type: 'pomodoro',
      record: {
        id: genId(),
        startTime: endTime - doneSec * 1000,
        endTime,
        durationSec: doneSec,
        completedAt: Date.now()
      },
      breakMinutes: breakMin
    })
  } else {
    // 休息结束
    mode.value = 'focus'
    durationSec.value = focusSec
    remainingMs.value = focusSec * 1000
    sessionTotalMs = focusSec * 1000
    state.value = 'completed'
    completeHandler?.({ type: 'breakEnd' })
  }
}

/**
 * 设置番茄时长（秒）：
 * - 始终更新基准时长（下一个番茄生效）；
 * - 空闲/完成态同时应用到当前剩余；计时中/暂停中不动当前会话。
 */
function setDuration(sec) {
  if (!Number.isFinite(sec) || sec < 60) return
  durationSec.value = sec
  if (state.value !== 'running' && state.value !== 'paused') {
    remainingMs.value = sec * 1000
    sessionTotalMs = sec * 1000
  }
}

/** 应用设置：专注/短休/长休时长与长休周期；空闲的专注态立即生效 */
export function applySettings(settings = {}) {
  const focusMin = Number(settings.pomodoroMinutes) || 25
  const shortMin = Number(settings.shortBreakMinutes) || 5
  const longMin = Number(settings.longBreakMinutes) || 15
  const every = Number(settings.longBreakEvery) || 4
  focusSec = focusMin * 60
  shortBreakSec = shortMin * 60
  longBreakSec = longMin * 60
  longBreakEvery = Math.max(1, every)
  if (mode.value === 'focus' && state.value !== 'running' && state.value !== 'paused') {
    durationSec.value = focusSec
    remainingMs.value = focusSec * 1000
    sessionTotalMs = focusSec * 1000
  }
}

// 模块级监听：计时中/暂停时浏览器标签页标题跟随倒计时（含休息态）
// 保存 stop 句柄：热更新时必须随模块销毁，否则每次 HMR 都会孤儿化一个 watcher 造成堆积
const stopTitleWatch = watch([displayTime, state, mode], ([time, st, md]) => {
  if (st === 'running' || st === 'paused') {
    const label =
      md === 'break'
        ? st === 'paused'
          ? '休息（已暂停）'
          : '休息中'
        : st === 'paused'
          ? '专注（已暂停）'
          : '专注中'
    document.title = `${time} ${label} · 番茄AI`
  }
})

// 开发模式热更新清理：模块被替换时销毁全部模块级副作用（定时器 + 标题监听 + 回调句柄），
// 杜绝"旧定时器/旧 watcher 堆积"导致的页面卡死；生产构建无 HMR，此段不生效，跨页面计时不受影响
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopTicker()
    stopTitleWatch()
    completeHandler = null
    abandonHandler = null
    pauseHandler = null
  })
}

/**
 * 页面通过 usePomodoro({ onComplete, onAbandon, onPause }) 注册回调
 * （重复注册以最后一次为准）。
 * onComplete 事件：
 *   { type: 'pomodoro', record, breakMinutes } —— 番茄完成（record 需落库）
 *   { type: 'breakEnd' } —— 休息结束
 * onAbandon / onPause：{ at, plannedSec? } —— 会话事件（状态检测统计用）
 */
export function usePomodoro({ onComplete, onAbandon, onPause } = {}) {
  if (onComplete) completeHandler = onComplete
  if (onAbandon) abandonHandler = onAbandon
  if (onPause) pauseHandler = onPause
  return {
    state,
    mode,
    breakKind,
    completedCount,
    remainingSec,
    displayTime,
    progress,
    start,
    pause,
    resume,
    abandon,
    skipBreak,
    setDuration,
    applySettings
  }
}
