/**
 * AI 配置 —— 回退到路线A之前的形态
 *
 * 两种设置方式：
 * 1. 直接改下面的默认值；
 * 2. 在"设置 → AI 配置"里填写（保存在浏览器 localStorage，仅本机，不上云）。
 *
 * useMock 为 true 时（默认），所有 AI 请求返回本地样例数据，用于无 Key 联调 UI。
 */
const DEFAULTS = {
  baseURL: 'https://api.openai.com/v1', // OpenAI 兼容地址，可换 DeepSeek / 通义 等
  apiKey: '', // 例如 sk-xxxx
  model: 'gpt-4o-mini',
  timeoutMs: 30000,
  useMock: true
}

/** 读取配置（未填写的项回落默认值） */
export function getAIConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem('ai_config') || 'null')
    return { ...DEFAULTS, ...(saved || {}) }
  } catch {
    return { ...DEFAULTS }
  }
}

/** 保存配置（仅存本地） */
export function saveAIConfig(cfg) {
  localStorage.setItem('ai_config', JSON.stringify(cfg))
}

export const AI_DEFAULTS = DEFAULTS
