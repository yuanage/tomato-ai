/**
 * 极简事件总线（零依赖）：跨模块状态联动
 * 例：番茄完成 → 统计页自动刷新
 */
const listeners = {}

export function on(event, cb) {
  ;(listeners[event] ||= []).push(cb)
  return () => {
    listeners[event] = listeners[event].filter((f) => f !== cb)
  }
}

export function emit(event, payload) {
  ;(listeners[event] || []).forEach((cb) => {
    try {
      cb(payload)
    } catch {
      /* 单个监听器异常隔离，不影响其他监听器 */
    }
  })
}
