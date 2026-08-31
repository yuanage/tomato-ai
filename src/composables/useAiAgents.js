import { reactive, ref, watch } from 'vue'
import { chatJSON } from '../api/ai'
import { getAIConfig } from '../api/config'
import { saveAiState, loadAiState } from '../utils/storage'
import { sanitizeSavedState } from '../utils/aiState'

/**
 * AI 助手状态（模块级单例）
 *
 * 解决"生成过程中切换页面导致内容丢失"：
 * 1. 单例：四个 Agent 的 loading/result/input 在模块顶层，路由切换组件卸载后状态不丢；
 * 2. 自动持久化：结果生成与输入变化时写入双写存储（IndexedDB + 文件镜像），重启也能恢复；
 * 3. 生成请求本身不受切页影响（fetch 不依附组件生命周期），结果会写回存活状态。
 */

// 四个 Agent 的独立状态（error 用于页面展示，loading 跨页面保持）
const split = reactive({ loading: false, result: null, input: '', error: null })
const sched = reactive({ loading: false, result: null, error: null })
const review = reactive({ loading: false, result: null, error: null })
const focus = reactive({ loading: false, result: null, input: '', error: null })

const isMock = ref(getAIConfig().useMock)
/** 是否恢复了上次的生成结果（用于页面提示） */
const restored = ref(false)

/** 可持久化的状态快照（结果与输入，不含运行时 loading/error） */
function snapshot() {
  return {
    split: { result: split.result, input: split.input },
    sched: { result: sched.result },
    review: { result: review.result },
    focus: { result: focus.result, input: focus.input }
  }
}

/** 持久化（fire-and-forget：双写存储内部容错） */
function persist() {
  saveAiState(snapshot())
}

async function restore() {
  const saved = await loadAiState()
  const clean = sanitizeSavedState(saved)
  split.result = clean.split.result
  split.input = clean.split.input
  sched.result = clean.sched.result
  review.result = clean.review.result
  focus.result = clean.focus.result
  focus.input = clean.focus.input
  restored.value = !!(clean.split.result || clean.sched.result || clean.review.result || clean.focus.result)
}

// 模块加载即恢复上次会话的生成结果（异步读取，读完成前页面暂为空，完成后自动填充）
restore()

// 输入框内容变化即持久化（模块级 watch，HMR 时随模块销毁）
const stopPersistWatch = watch([() => split.input, () => focus.input], persist)
if (import.meta.hot) {
  import.meta.hot.dispose(() => stopPersistWatch())
}

/**
 * 统一执行入口：调用大模型 → 结果写入单例状态并持久化。
 * 错误经 onError 回调交给页面提示（useMessage 只能在组件内使用）。
 */
async function runAgent(agent, prompt, { onError } = {}) {
  isMock.value = getAIConfig().useMock
  agent.loading = true
  agent.error = null
  try {
    const data = await chatJSON(prompt.system, prompt.user)
    if (data === null || typeof data !== 'object') throw new Error('AI 返回格式异常')
    agent.result = data
    persist()
  } catch (e) {
    const msg = e.message || 'AI 调用失败'
    agent.error = msg
    onError?.(msg)
  } finally {
    agent.loading = false
  }
}

export function useAiAgents() {
  return { split, sched, review, focus, isMock, restored, runAgent }
}
