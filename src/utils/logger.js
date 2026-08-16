import localforage from 'localforage'

/**
 * 错误日志收集（测试期问题定位用）
 * 捕获 window.onerror 与 unhandledrejection，写入 IndexedDB（上限 200 条），
 * 设置页可一键导出 JSON。所有操作自身失败静默，不影响主流程。
 */

const LOG_KEY = 'error_logs'
const MAX_LOGS = 200

/** 追加一条错误日志（内部捕获失败静默） */
async function pushLog(entry) {
  try {
    const list = await getLogs()
    list.push(entry)
    if (list.length > MAX_LOGS) list.splice(0, list.length - MAX_LOGS)
    await localforage.setItem(LOG_KEY, list)
  } catch {
    /* 日志写入失败静默 */
  }
}

/** 读取全部错误日志（按时间升序） */
export async function getLogs() {
  try {
    const list = await localforage.getItem(LOG_KEY)
    const logs = Array.isArray(list) ? list : []
    return logs.sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
  } catch {
    return []
  }
}

/** 清空错误日志 */
export async function clearLogs() {
  try {
    await localforage.removeItem(LOG_KEY)
  } catch {
    /* 静默 */
  }
}

/** 手动记录一条错误 */
export function captureError(source, message, detail = '') {
  pushLog({
    at: Date.now(),
    source: String(source || 'unknown').slice(0, 60),
    message: String(message || '').slice(0, 500),
    detail: String(detail || '').slice(0, 1000)
  })
}

/** 全局挂载：捕获未处理错误与 Promise 拒绝（在 main.js 启动时调用一次） */
export function initErrorCapture() {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (e) => {
    captureError(
      'window.onerror',
      e.message,
      `${e.filename || ''}:${e.lineno || ''}:${e.colno || ''}`
    )
  })
  window.addEventListener('unhandledrejection', (e) => {
    captureError(
      'unhandledrejection',
      e.reason?.message || String(e.reason || 'Promise rejected'),
      e.reason?.stack || ''
    )
  })
}
