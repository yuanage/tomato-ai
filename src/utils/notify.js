/**
 * 浏览器通知（兼容判断封装）
 * - 不支持 Notification（如部分安卓 WebView）→ 静默跳过，不影响主流程；
 * - 权限为 default → 自动请求一次；
 * - 权限为 denied → 静默跳过（设置页阶段5 提供开关）。
 */

export function notifySupported() {
  return typeof Notification !== 'undefined'
}

export function notifyPermission() {
  return notifySupported() ? Notification.permission : 'unsupported'
}

/** 允许则发送通知；需要时自动请求权限；失败一律静默返回 false */
export async function notifyIfAllowed(title, body) {
  if (!notifySupported()) return false
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      return false
    }
  }
  if (Notification.permission !== 'granted') return false
  try {
    new Notification(title, { body })
    return true
  } catch {
    return false
  }
}
