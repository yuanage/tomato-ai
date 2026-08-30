/**
 * AI Agent 状态的持久化净化（纯函数，便于测试）
 * 只保留合法的 result 对象与字符串 input/reasoning，其余一律丢弃，防止脏数据污染界面。
 */
export function sanitizeSavedState(saved) {
  const clean = {
    split: { result: null, input: '', reasoning: '' },
    sched: { result: null, reasoning: '' },
    review: { result: null, reasoning: '' },
    focus: { result: null, input: '', reasoning: '' }
  }
  if (!saved || typeof saved !== 'object') return clean
  for (const key of ['split', 'sched', 'review', 'focus']) {
    const s = saved[key]
    if (!s || typeof s !== 'object') continue
    if (s.result && typeof s.result === 'object') clean[key].result = s.result
    if (typeof s.input === 'string') clean[key].input = s.input
    if (typeof s.reasoning === 'string') clean[key].reasoning = s.reasoning
  }
  return clean
}
