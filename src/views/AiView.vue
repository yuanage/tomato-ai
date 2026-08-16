<template>
  <div class="ai-page">
    <!-- 隐私声明 + Mock 模式提示 -->
    <p class="privacy">
      🔒 仅发送任务文本与统计摘要给模型，不保存任何隐私；数据全部留在本地。
    </p>
    <n-alert v-if="isMock" type="info" :bordered="false" class="mock-tip">
      当前为模拟模式（未配置真实 API Key），返回的是本地样例数据。可在 设置 → AI 配置 中填入 Key 并关闭模拟。
    </n-alert>

    <n-collapse :default-expanded-names="['split']" arrow-placement="right">
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
          <n-button type="primary" :loading="review.loading" @click="runReview">生成周复盘</n-button>

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
          <n-button type="primary" :loading="focus.loading" @click="runFocus">检测状态</n-button>

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
import { reactive, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { chatJSON } from '../api/ai'
import { getAIConfig } from '../api/config'
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

const message = useMessage()
// 【修复】横幅实时化：每次调用前从配置读取，避免"设置页改了这里还是旧状态"
const isMock = ref(getAIConfig().useMock)

const { tasks, ensureLoaded, addTask } = useTasks()
const { today, week, total, last7Days, taskStats, load: loadStats } = useStats()

// 四个 Agent 的独立状态
const split = reactive({ loading: false, result: null, input: '' })
const sched = reactive({ loading: false, result: null })
const review = reactive({ loading: false, result: null })
const focus = reactive({ loading: false, result: null, input: '' })

/** 统一执行入口：loading → 调用 → 错误提示（AIError 消息已汉化） */
async function runAgent(agent, prompt) {
  isMock.value = getAIConfig().useMock // 同步最新配置
  agent.loading = true
  agent.result = null
  try {
    const data = await chatJSON(prompt.system, prompt.user)
    if (data === null || typeof data !== 'object') throw new Error('AI 返回格式异常')
    agent.result = data
  } catch (e) {
    message.error(e.message || 'AI 调用失败')
  } finally {
    agent.loading = false
  }
}

// ① 任务拆解
async function runSplit() {
  const text = split.input.trim()
  if (!text) return message.warning('请输入要拆解的任务')
  await runAgent(split, buildSplitPrompt(text))
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
  await runAgent(sched, buildSchedulePrompt(text))
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
  await runAgent(review, buildReviewPrompt(text))
}

// ④ 专注状态检测
async function runFocus() {
  await loadStats()
  const base = `今日已完成 ${today.value.count} 个番茄（${today.value.minutes} 分钟）；本周 ${week.value.count} 个（${week.value.minutes} 分钟）。`
  const text = focus.input.trim() ? `${base}\n用户自述：${focus.input.trim()}` : base
  await runAgent(focus, buildFocusPrompt(text))
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
