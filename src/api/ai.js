import { getAIConfig } from './config'
import { mockResponse } from './mock'

/**
 * AI 请求模块
 *
 * 职责：调用 OpenAI 兼容的 /chat/completions 接口，强制模型输出 JSON 并容错解析。
 * 隐私约定：只发送本次调用所需的文本（任务标题、统计摘要），不发送任何用户隐私。
 */

/** 统一错误类型：code = no_key | network | timeout | http | empty | invalid_json */
export class AIError extends Error {
  constructor(message, code, detail = null) {
    super(message)
    this.name = 'AIError'
    this.code = code
    this.detail = detail
  }
}

/**
 * 从模型输出文本中提取 JSON：
 * 1. 剥离 ```json 代码块围栏；
 * 2. 定位第一个 { 并找到与之平衡的 }（容忍前后有解释性文字）；
 * 3. JSON.parse，失败抛出 AIError。
 */
export function extractJSON(text) {
  if (!text || !String(text).trim()) {
    throw new AIError('模型返回内容为空', 'empty')
  }
  const t = String(text).trim()

  // 剥离 markdown 围栏
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : t

  const start = candidate.indexOf('{')
  if (start === -1) {
    throw new AIError('模型未返回 JSON 对象', 'invalid_json', t.slice(0, 200))
  }

  // 找平衡括号
  let depth = 0
  let end = -1
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) {
    throw new AIError('JSON 括号不完整', 'invalid_json', t.slice(0, 200))
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch (e) {
    throw new AIError('JSON 解析失败', 'invalid_json', candidate.slice(start, end + 1).slice(0, 200))
  }
}

/**
 * 核心调用：systemPrompt + userContent → 解析后的 JSON 对象
 */
export async function chatJSON(systemPrompt, userContent, { temperature = 0.3 } = {}) {
  const cfg = getAIConfig()

  // Mock 模式：返回本地样例，便于无 Key 联调
  if (cfg.useMock) {
    return mockResponse(systemPrompt, userContent)
  }

  if (!cfg.apiKey) {
    throw new AIError('未配置 API Key，请到 设置 → AI 配置 填写', 'no_key')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs)

  let res
  try {
    res = await fetch(`${cfg.baseURL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature,
        response_format: { type: 'json_object' }, // 部分供应商支持；不支持的会忽略该字段
        stream: false
      }),
      signal: controller.signal
    })
  } catch (e) {
    if (e.name === 'AbortError') throw new AIError('请求超时，请重试', 'timeout')
    throw new AIError('网络异常，请检查网络后重试', 'network')
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body?.error?.message) detail = body.error.message
    } catch {
      /* 响应体不是 JSON 时保留默认信息 */
    }
    throw new AIError(`接口返回错误：${detail}`, 'http')
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new AIError('接口响应不是有效 JSON', 'invalid_json')
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new AIError('接口未返回内容', 'empty')
  }

  return extractJSON(content)
}

// ==================== Tier 2 预留：端侧模型接口 ====================

/** 设备是否满足端侧模型运行条件（RAM ≥ 4GB；未知设备保守禁用） */
export function canUseLocalModel() {
  try {
    const mem = navigator.deviceMemory // Chrome 系返回近似内存 GB 数
    return typeof mem === 'number' ? mem >= 4 : false
  } catch {
    return false
  }
}

/**
 * 与 chatJSON 同构的本地模型接口（llama.cpp Rust 集成后启用）
 * 当前为占位：明确报错而非静默失败，便于上层判断降级到离线洞察。
 */
export async function localChatJSON(systemPrompt, userContent, options = {}) {
  if (!canUseLocalModel()) {
    throw new AIError('当前设备不满足端侧模型运行条件', 'local_unsupported')
  }
  throw new AIError('端侧模型尚未启用，请使用云端 API 或离线洞察', 'local_not_ready')
}
