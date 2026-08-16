/**
 * AI 配置
 *
 * 两种设置方式：
 * 1. 直接改下面的默认值；
 * 2. 在"设置 → AI 配置"里选择服务商预设（自动填充地址与模型）或手动填写。
 *
 * 安全约定：
 * - 配置仅保存在浏览器 localStorage，不上传网络；
 * - 源码与示例中不包含任何真实密钥字面量，Key 一律由用户自行填写。
 *
 * useMock 为 true 时（默认），所有 AI 请求返回本地样例数据，用于无 Key 联调 UI。
 */

/** 国内 OpenAI 兼容 API 预设（下拉选择后自动填充 baseURL 与 model，均可再手动修改） */
export const AI_PRESETS = [
  { label: '自定义（手动填写）', value: 'custom', baseURL: '', model: '' },
  {
    label: 'DeepSeek',
    value: 'deepseek',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  },
  {
    label: '豆包（火山方舟）',
    value: 'doubao',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-1-5-pro-32k-250115'
  },
  {
    label: '通义千问',
    value: 'qwen',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus'
  }
]

const DEFAULTS = {
  baseURL: AI_PRESETS[1].baseURL, // 默认 DeepSeek
  apiKey: '',
  model: AI_PRESETS[1].model,
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

/** 根据当前 baseURL+model 匹配预设（用于设置页回显服务商下拉） */
export function matchPreset(cfg) {
  return (
    AI_PRESETS.find(
      (p) => p.value !== 'custom' && p.baseURL === cfg.baseURL && p.model === cfg.model
    )?.value || 'custom'
  )
}

export const AI_DEFAULTS = DEFAULTS
