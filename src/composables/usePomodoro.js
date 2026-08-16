import { ref, computed, watch } from 'vue'
import { genId } from '../utils/storage'

/**
 * 番茄计时器（模块级单例）—— 回退到路线A之前的形态
 *
 * 状态机：idle（未开始）→ running（计时中）⇄ paused（已暂停）→ completed（完成）→ idle
 *
 * 关键设计：
 * 1. 单例：状态定义在模块顶层，组件切换/销毁不会中断计时；
 * 2. 时间戳计数：剩余时间 = endTime - now，setInterval 只负责刷新 UI，
 *    即使浏览器后台节流定时器，恢复后时间自动校准、不会漂移。
 */

const DEFAULT_DURATION_SEC = 25 * 60
const TICK_MS = 500 // 刷新间隔：显示粒度为秒，500ms 足够顺滑，且降低弱 WebView 渲染压力

const state = ref('idle')
const durationSec = ref(DEFAULT_DURATION_SEC) // 本次番茄总时长（秒）
const remainingMs = ref(durationSec.value * 1000)

let timerId = null
let endTime = 0
let completeHandler = null

const remainingSec = computed(() => Math.max(0, Math.ceil(remainingMs.value / 1000)))

/** 剩余时间展示，mm:ss 格式 */
const displayTime = computed(() => {
  const m = String(Math.floor(remainingSec.value / 60)).padStart(2, '0')
  const s = String(remainingSec.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

/** 进度环：剩余时长占比，随时间递减 */
const progress = computed(() => {
  const total = durationSec.value * 1000
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, remainingMs.value / total))
})

function startTicker() {
  stopTicker()
  timerId = setInterval(() => {
    // 单次 tick 异常隔离：意外错误不会中断定时器
    try {
      remainingMs.value = Math.max(0, endTime - Date.now())
      if (remainingMs.value <= 0) finish()
    } catch {
      /* 单次 tick 失败忽略 */
    }
  }, TICK_MS)
}

function stopTicker() {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
}

/** 开始（idle）或再来一个（completed） */
function start() {
  if (state.value === 'completed' || remainingMs.value <= 0) {
    remainingMs.value = durationSec.value * 1000
  }
  endTime = Date.now() + remainingMs.value
  state.value = 'running'
  startTicker()
}

/** 暂停：冻结剩余时间 */
function pause() {
  if (state.value !== 'running') return
  remainingMs.value = Math.max(0, endTime - Date.now())
  stopTicker()
  state.value = 'paused'
}

/** 继续 */
function resume() {
  if (state.value !== 'paused') return
  endTime = Date.now() + remainingMs.value
  state.value = 'running'
  startTicker()
}

/** 放弃：回到未开始，不产生记录 */
function abandon() {
  stopTicker()
  remainingMs.value = durationSec.value * 1000
  state.value = 'idle'
}

/** 倒计时归零：落库并通知页面（重入保护） */
function finish() {
  if (state.value !== 'running') return
  stopTicker()
  remainingMs.value = 0
  state.value = 'completed'
  completeHandler?.({
    id: genId(),
    startTime: endTime - durationSec.value * 1000, // 计划开始时间（暂停不影响记录时长）
    endTime,
    durationSec: durationSec.value,
    completedAt: Date.now()
  })
}

/** 设置番茄时长（仅空闲/完成态可改），单位：秒 */
function setDuration(sec) {
  if (state.value === 'running' || state.value === 'paused') return
  if (!Number.isFinite(sec) || sec < 60) return
  durationSec.value = sec
  remainingMs.value = sec * 1000
}

/** 应用设置里的番茄时长（分钟），计时中不生效 */
export function applySettings({ pomodoroMinutes } = {}) {
  if (state.value === 'running' || state.value === 'paused') return
  if (Number.isFinite(pomodoroMinutes) && pomodoroMinutes >= 1) {
    setDuration(pomodoroMinutes * 60)
  }
}

// 模块级监听：计时中/暂停时浏览器标签页标题跟随倒计时
const stopTitleWatch = watch([displayTime, state], ([time, st]) => {
  if (st === 'running' || st === 'paused') {
    document.title = `${time} 专注${st === 'paused' ? '（已暂停）' : ''} · 番茄AI`
  }
})

// 开发模式热更新清理：模块被替换时销毁模块级副作用，杜绝 HMR 孤儿堆积（生产无 HMR 不生效）
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopTicker()
    stopTitleWatch()
    completeHandler = null
  })
}

/**
 * 页面通过 usePomodoro({ onComplete }) 注册完成回调（重复注册以最后一次为准）
 */
export function usePomodoro({ onComplete } = {}) {
  if (onComplete) completeHandler = onComplete
  return { state, durationSec, remainingSec, displayTime, progress, start, pause, resume, abandon, setDuration, applySettings }
}
