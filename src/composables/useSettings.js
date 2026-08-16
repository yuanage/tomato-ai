import { ref } from 'vue'
import { getSettings, saveSettings as persistSettings } from '../utils/storage'

/**
 * 应用设置（模块级单例）
 * 设置页读写、计时器页订阅，共用同一份响应式状态。
 */

const settings = ref({
  pomodoroMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  vibrateOnComplete: true,
  notifyOnComplete: true,
  soundOnComplete: true
})
let loadPromise = null

/** 确保设置已加载【修复：共享 Promise，防并发重复加载覆盖内存修改】 */
function ensureLoaded() {
  if (!loadPromise) {
    loadPromise = getSettings()
      .then((s) => {
        settings.value = s
      })
      .catch((e) => {
        loadPromise = null
        throw e
      })
  }
  return loadPromise
}

/** 局部更新并落库 */
async function updateSettings(patch) {
  await ensureLoaded()
  settings.value = { ...settings.value, ...patch }
  await persistSettings(patch)
}

/** 从存储重新加载设置（导入备份后调用；重置共享加载 Promise 强制重新读取） */
async function reloadSettings() {
  loadPromise = null
  await ensureLoaded()
}

export function useSettings() {
  return { settings, ensureLoaded, updateSettings, reloadSettings }
}
