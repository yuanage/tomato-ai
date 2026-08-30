<template>
  <div class="ai-page">
    <!-- 隐私声明 + Mock 模式提示 -->
    <p class="privacy">
      🔒 仅发送任务文本与统计摘要给模型，不保存任何隐私；数据全部留在本地。
    </p>
    <n-alert v-if="isMock" type="info" :bordered="false" class="mock-tip">
      当前为模拟模式（未配置真实 API Key），返回的是本地样例数据。可在 设置 → AI 配置 中填入 Key 并关闭模拟。
    </n-alert>

    <p class="hint-line">💡 生成过程中切换页面不会中断：结果与输入会自动保存，返回后仍在</p>

    <n-collapse :default-expanded-names="['split']" arrow-placement="right">
      <!-- ⓪ 离线洞察（Tier 1：零网络本地规则引擎） -->
      <n-collapse-item title="🏠 离线洞察（无需联网）" name="offline">
        <div class="panel">
          <p class="hint">基于本地番茄与任务数据的规则洞察，飞行模式可用</p>
          <n-button type="primary" :loading="offline.loading" @click="runOfflineInsights">
            生成离线洞察
          </n-button>

          <div v-if="offline.items.length" class="result">
            <div v-for="(item, i) in offline.items" :key="i" class="insight-row">
              <span class="insight-icon">{{ item.icon }}</span>
              <div class="insight-body">
                <div class="insight-title">{{ item.title }}</div>
                <div class="insight-text">{{ item.body }}</div>
              </div>
            </div>
          </div>
        </div>
      </n-collapse-item>

      <!-- ① 任务拆解 -->
      <n-collapse-item title="① 任务拆解" name="split">
        <div class="panel">
          <n-input
            v-model:value="split.input"
            type="textarea"
            :rows="2"
            placeholder="输入一个大任务，例如：准备下周三的产品发布会"
          />
          <n-button
            type="primary"
            :loading="split.loading"
            :disabled="!split.input.trim()"
            @click="runSplit"
          >
            开始拆解
          </n-button>

          <div v-if="split.result" class="result">
            <!-- 大标题版块：视觉层级入口 -->
            <div class="result-header">
              <div class="result-title">🤖 AI 生成任务列表</div>
              <p v-if="restored" class="restored-hint">📂 已自动恢复上次的生成结果（切页/重启不丢失）</p>
              <div class="result-divider"></div>
            </div>

            <!-- AI 思考过程（默认折叠） -->
            <div v-if="split.reasoning" class="reasoning-block">
              <button class="reasoning-toggle" type="button" @click="showReasoning = !showReasoning">
                🧠 AI 思考过程 {{ showReasoning ? '▲ 收起' : '▼ 展开' }}
              </button>
              <div v-show="showReasoning" class="reasoning-body">
                <p v-for="(line, i) in reasoningLines" :key="i" class="reasoning-line">{{ line }}</p>
              </div>
            </div>

            <div v-for="(t, i) in split.result.tasks || []" :key="i" class="result-row">
              <span class="idx">{{ i + 1 }}</span>
              <span class="title">{{ t.title }}</span>
              <span class="est">🍅{{ t.estPomodoros ?? '?' }}</span>
            </div>
            <n-button size="small" type="primary" @click="importSplit">
              导入任务列表（{{ (split.result.tasks || []).length }}）
            </n-button>
          </div>
        </div>
      </n-collapse-item>

      <!-- ② 智能排程 -->
      <n-collapse-item title="② 智能排程（今日）" name="schedule">
        <div class="panel">
          <p class="hint">自动读取当前未完成任务进行排程</p>
          <n-button type="primary" :loading="sched.loading" @click="runSchedule">生成今日排程</n-button>

          <div v-if="sched.result" class="result">
            <p class="tip">{{ sched.result.tip }}</p>
            <div v-for="(s, i) in sched.result.schedule || []" :key="i" class="result-row">
              <span class="time">{{ s.time }}</span>
              <span class="title">{{ s.title }}</span>
              <span class="est">🍅{{ s.estPomodoros ?? '?' }}</span>
            </div>
            <n-button size="small" type="primary" @click="importSchedule">
              导入任务列表（{{ (sched.result.schedule || []).length }}）
            </n-button>
          </div>
        </div>
      </n-collapse-item>

      <!-- ③ 周复盘 -->
      <n-collapse-item title="③ 周复盘" name="review">
        <div class="panel">
          <p class="hint">自动汇总本周专注统计生成复盘</p>
          <div class="btn-row">
            <n-button type="primary" :loading="review.loading" @click="runReview">
              生成周复盘
            </n-button>
            <n-button v-if="review.result" size="small" quaternary @click="copyReview">
              复制复盘
            </n-button>
          </div>

          <div v-if="review.result" class="result">
            <p class="summary">{{ review.result.summary }}</p>
            <div v-if="review.result.highlights?.length" class="list-block">
              <div class="list-title">✅ 做得好的</div>
              <div v-for="(h, i) in review.result.highlights" :key="i" class="list-item">{{ h }}</div>
            </div>
            <div v-if="review.result.problems?.length" class="list-block">
              <div class="list-title">⚠️ 存在的问题</div>
              <div v-for="(p, i) in review.result.problems" :key="i" class="list-item">{{ p }}</div>
            </div>
            <div v-if="review.result.suggestions?.length" class="list-block">
              <div class="list-title">💡 下周建议</div>
              <div v-for="(s, i) in review.result.suggestions" :key="i" class="list-item">{{ s }}</div>
            </div>
          </div>
        </div>
      </n-collapse-item>

      <!-- ④ 专注状态检测 -->
      <n-collapse-item title="④ 专注状态检测" name="focus">
        <div class="panel">
          <n-input
            v-model:value="focus.input"
            type="textarea"
            :rows="2"
            placeholder="可选：简单描述你现在的状态，例如「下午总是走神，刷手机停不下来」"
          />
          <div class="btn-row">
            <n-button type="primary" :loading="focus.loading" @click="runFocus">检测状态</n-button>
            <n-button v-if="focus.result" size="small" quaternary @click="copyFocus">
              复制结果
            </n-button>
          </div>

          <div v-if="focus.result" class="result">
            <div class="focus-head">
              <span class="state-badge" :class="focus.result.state">
                {{ stateLabel(focus.result.state) }}
              </span>
              <span class="score">专注健康度 {{ focus.result.score }}/100</span>
            </div>
            <p class="analysis">{{ focus.result.analysis }}</p>
            <div class="advice">💡 {{ focus.result.advice }}</div>
          </div>
        </div>
      </n-collapse-item>
    </n-collapse>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import { buildInsights } from '../api/localInsights'
import { getPomodoroRecords } from '../utils/storage'
import {
  buildSplitPrompt,
  buildSchedulePrompt,
  buildReviewPrompt,
  buildFocusPrompt,
  tasksToText,
  statsToText
} from '../api/prompts'
import { useTasks } from '../composables/useTasks'
import { useStats } from '../composables/useStats'
import { useAiAgents } from '../composables/useAiAgents'

const message = useMessage()

// 单例状态：切换页面/刷新后结果与输入自动保留（见 useAiAgents）
const { split, sched, review, focus, isMock, restored, runAgent } = useAiAgents()

// 思考过程折叠面板（默认折叠）
const showReasoning = ref(false)
const reasoningLines = computed(() =>
  String(split.reasoning || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
)

const { tasks, ensureLoaded, addTask } = useTasks()
const { today, week, total, last7Days, taskStats, load: loadStats } = useStats()

// 离线洞察（Tier 1 本地规则引擎：即时计算，零网络）
const offline = reactive({ loading: false, items: [] })

async function runOfflineInsights() {
  offline.loading = true
  try {
    await ensureLoaded()
    const records = await getPomodoroRecords()
    offline.items = buildInsights(records, tasks.value)
    message.success('离线洞察已生成')
  } catch {
    message.error('洞察生成失败，请重试')
  } finally {
    offline.loading = false
  }
}

/** 统一执行入口：loading → 调用 → 错误提示（AIError 消息已汉化；状态与结果由单例保管） */
async function runAgentView(agent, prompt) {
  await runAgent(agent, prompt, { onError: (m) => message.error(m) })
}

// ① 任务拆解
async function runSplit() {
  const text = split.input.trim()
  if (!text) return message.warning('请输入要拆解的任务')
  await runAgentView(split, buildSplitPrompt(text))
}

async function importSplit() {
  const list = split.result?.tasks || []
  if (!list.length) return
  await ensureLoaded()
  // 【修复】逐条容错：单条缺标题/写入失败跳过，其余按原顺序完整导入，不再"只导入第一条"
  let ok = 0
  for (const t of list) {
    try {
      const task = await addTask(t.title, t.estPomodoros)
      if (task) ok++
    } catch {
      /* 单条失败跳过 */
    }
  }
  message.success(
    ok > 0 ? `已导入 ${ok} 个任务到任务列表` : '没有可导入的任务（子任务缺少标题）'
  )
}

// ② 智能排程（自动读取未完成任务）
async function runSchedule() {
  await ensureLoaded()
  const text = tasksToText(tasks.value.filter((t) => !t.done))
  await runAgentView(sched, buildSchedulePrompt(text))
}

async function importSchedule() {
  const list = sched.result?.schedule || []
  if (!list.length) return
  await ensureLoaded()
  // 【修复】逐条容错，保持排程顺序
  let ok = 0
  for (const s of list) {
    try {
      const task = await addTask(s.title, s.estPomodoros)
      if (task) ok++
    } catch {
      /* 单条失败跳过 */
    }
  }
  message.success(
    ok > 0 ? `已导入 ${ok} 个任务到任务列表` : '没有可导入的任务（排程项缺少标题）'
  )
}

// ③ 周复盘（自动汇总统计）
async function runReview() {
  await loadStats()
  const text = statsToText({
    today: today.value,
    week: week.value,
    total: total.value,
    last7Days: last7Days.value,
    taskStats: taskStats.value
  })
  await runAgentView(review, buildReviewPrompt(text))
}

/** 复制复盘文本（剪贴板 API + 降级方案）——手动保存选项 */
function copyReview() {
  const r = review.result
  if (!r) return
  const lines = [
    `【周复盘】${r.summary || ''}`,
    '',
    '✅ 做得好的：',
    ...(r.highlights || []).map((h) => `· ${h}`),
    '',
    '⚠️ 存在的问题：',
    ...(r.problems || []).map((p) => `· ${p}`),
    '',
    '💡 下周建议：',
    ...(r.suggestions || []).map((s) => `· ${s}`)
  ]
  copyText(lines.join('\n'))
}

/** 复制专注状态结果——手动保存选项 */
function copyFocus() {
  const r = focus.result
  if (!r) return
  copyText(`【专注状态】${r.state}（健康度 ${r.score}/100）\n${r.analysis}\n建议：${r.advice}`)
}

/** 通用复制：剪贴板 API 失败时降级隐藏文本框 */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败，请手动选择复制')
    }
    ta.remove()
  }
}

// ④ 专注状态检测
async function runFocus() {
  await loadStats()
  const base = `今日已完成 ${today.value.count} 个番茄（${today.value.minutes} 分钟）；本周 ${week.value.count} 个（${week.value.minutes} 分钟）。`
  const text = focus.input.trim() ? `${base}\n用户自述：${focus.input.trim()}` : base
  await runAgentView(focus, buildFocusPrompt(text))
}

function stateLabel(state) {
  return { focused: '状态良好', normal: '状态一般', distracted: '明显走神' }[state] || state
}
</script>

<style scoped>
.ai-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.privacy {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}

.mock-tip {
  font-size: 12px;
}

.hint-line {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.btn-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}

.result {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px dashed var(--outline);
  padding-top: 10px;
}

/* 大标题版块：字号/分隔线与任务内容形成清晰层级 */
.result-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-title {
  font-size: clamp(16px, 4.5vw, 20px); /* 响应式字号 */
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.result-divider {
  height: 1px;
  background: var(--outline);
  margin: 4px 0 6px;
}

.restored-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}

/* AI 思考过程折叠面板 */
.reasoning-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reasoning-toggle {
  align-self: flex-start;
  background: none;
  border: 1px solid var(--outline);
  border-radius: var(--radius-s);
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.reasoning-body {
  background: var(--surface-variant);
  border-radius: var(--radius-s);
  padding: 10px 12px;
}

.reasoning-line {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0 0 4px;
  padding-left: 10px;
  position: relative;
}

.reasoning-line::before {
  content: '·';
  position: absolute;
  left: 2px;
  color: var(--text-tertiary);
}

.result-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.idx {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--surface-variant);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.time {
  color: var(--primary);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  flex-shrink: 0;
}

.title {
  flex: 1;
  word-break: break-all;
}

.est {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.tip,
.summary {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

/* 离线洞察卡片 */
.insight-row {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--outline);
}

.insight-row:last-child {
  border-bottom: none;
}

.insight-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.insight-body {
  flex: 1;
}

.insight-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.insight-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-top: 2px;
}

.list-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.list-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.list-item {
  font-size: 13px;
  color: var(--text-primary);
  padding-left: 12px;
  position: relative;
}

.list-item::before {
  content: '·';
  position: absolute;
  left: 4px;
  color: var(--text-tertiary);
}

.focus-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 状态徽章：Google 规范状态色 */
.state-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 12px;
  border-radius: var(--radius-pill);
  color: #ffffff;
}

.state-badge.focused {
  background: var(--success);
}

.state-badge.normal {
  background: var(--warning);
}

.state-badge.distracted {
  background: var(--danger);
}

.score {
  font-size: 13px;
  color: var(--text-secondary);
}

.analysis {
  font-size: 13px;
  color: var(--text-primary);
  margin: 0;
}

.advice {
  font-size: 13px;
  color: var(--text-primary);
  background: var(--surface-variant);
  border-radius: var(--radius-s);
  padding: 10px 12px;
}
</style>
