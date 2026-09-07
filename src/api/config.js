import { persistAIConfig, readPersistedAIConfig } from '../utils/storage'

/**
 * AI 配置 —— 内存缓存 + localStorage 同步层 + 双写存储持久化
 *
 * 读取语义保持同步（内存缓存），满足各模块同步调用；
 * localStorage 仅作"同步读取缓存"，真正落库走 storage.js 双写
 * （IndexedDB + 文件镜像）——网页/安卓进程被杀后 localStorage 可能丢失，
 * 持久化数据可从双写存储恢复（见 restoreAIConfig）。
 *
 * useMock 为 true 时（默认），所有 AI 请求返回本地样例数据，用于无 Key 联调 UI。
 */
const DEFAULTS = {
  baseURL: 'https://api.openai.com/v1', // OpenAI 兼容地址，可换 DeepSeek / 通义 等
  apiKey: '', // 例如 sk-xxxx
  model: 'gpt-4o-mini',
  timeoutMs: 60000, // 推理模型响应偏慢，60s 兜底
  useMock: true
}

const LS_KEY = 'ai_config'

function readLsCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    return { ...DEFAULTS, ...(saved || {}) }
  } catch {
    return { ...DEFAULTS }
  }
}

let cache = readLsCache()

/** 读取配置（同步，返回拷贝） */
export function getAIConfig() {
  return { ...cache }
}

/** 保存配置：同步更新内存与 localStorage 缓存，异步落双写存储 */
export function saveAIConfig(cfg) {
  cache = { ...DEFAULTS, ...cfg }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache))
  } catch {
    /* 缓存写入失败静默，双写存储仍是最终落点 */
  }
  persistAIConfig(cache)
}

/** 启动/进入配置场景时恢复：双写存储优先（localStorage 可能已随进程被杀丢失） */
export function restoreAIConfig() {
  return readPersistedAIConfig()
    .then((saved) => {
      if (!saved || typeof saved !== 'object') return
      cache = { ...DEFAULTS, ...saved }
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(cache))
      } catch {
        /* 静默 */
      }
    })
    .catch(() => {})
}

export const AI_DEFAULTS = DEFAULTS

// 模块加载即尝试从双写存储恢复（异步，失败静默；缓存先就位，读语义不受影响）
restoreAIConfig()
