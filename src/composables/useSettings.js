import { ref } from 'vue'
import { getSettings, saveSettings as persistSettings } from '../utils/storage'

/**
 * 应用设置（模块级单例）—— 回退到路线A之前的形态
 * 设置页读写、计时器页订阅，共用同一份响应式状态。
 */

const settings = ref({ pomodoroMinutes: 25, vibrateOnComplete: true })
let loadPromise = null

/** 确保设置已加载（共享 Promise：并发调用只读一次库） */
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

export function useSettings() {
  return { settings, ensureLoaded, updateSettings }
}
