<template>
  <div class="settings">
    <!-- 专注设置 -->
    <n-card title="专注设置" :bordered="false">
      <div class="field">
        <div class="field-label">单次番茄时长</div>
        <n-input-number
          v-model:value="pomodoroMinutes"
          :min="1"
          :max="180"
          style="width: 120px"
          @update:value="savePomodoroMinutes"
        />
        <div class="field-hint">分钟；计时中修改将在下一个番茄生效</div>
      </div>
      <div class="field">
        <div class="field-label">完成提醒（震动）</div>
        <n-switch v-model:value="vibrateOnComplete" @update:value="saveVibrate" />
        <div class="field-hint">番茄完成时震动 + 提示</div>
      </div>
    </n-card>

    <!-- AI 配置 -->
    <n-card title="AI 配置" :bordered="false">
      <div class="field">
        <div class="field-label">接口地址（OpenAI 兼容）</div>
        <n-input v-model:value="ai.baseURL" placeholder="https://api.openai.com/v1" />
      </div>
      <div class="field">
        <div class="field-label">API Key</div>
        <n-input
          v-model:value="ai.apiKey"
          type="password"
          show-password-on="click"
          placeholder="sk-..."
        />
      </div>
      <div class="field">
        <div class="field-label">模型</div>
        <n-input v-model:value="ai.model" placeholder="gpt-4o-mini" />
      </div>
      <div class="field">
        <div class="field-label">模拟模式（无 Key 联调）</div>
        <n-switch v-model:value="ai.useMock" @update:value="saveMockSwitch" />
        <div class="field-hint">关闭后 AI 将真实调用接口（切换即保存，无需点保存按钮）</div>
      </div>
      <div class="field-hint">配置仅保存在本机浏览器，不上云；AI 调用只发送任务文本与统计摘要</div>
      <div class="btn-row">
        <n-button type="primary" @click="saveAI">保存 AI 配置</n-button>
        <n-button :loading="testing" @click="testAI">测试连接</n-button>
      </div>
    </n-card>

    <!-- 数据管理 -->
    <n-card title="数据管理" :bordered="false">
      <div class="field">
        <div class="field-label">清空本地数据</div>
        <n-popconfirm
          positive-text="清空"
          negative-text="取消"
          :positive-button-props="{ type: 'error' }"
          @positive-click="clearAll"
        >
          <template #trigger>
            <n-button type="error" quaternary>清空任务与番茄记录</n-button>
          </template>
          将删除全部任务和番茄记录，且无法恢复，确定吗？
        </n-popconfirm>
      </div>
      <div class="field">
        <div class="field-label">错误日志</div>
        <n-button quaternary @click="handleExportLogs">导出错误日志</n-button>
        <div class="field-hint">测试期问题定位用；运行时错误自动记录在本地</div>
      </div>
    </n-card>

    <p class="about">番茄AI v0.1.0 · 数据仅存本地 · 零广告零社交</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useSettings } from '../composables/useSettings'
import { getAIConfig, saveAIConfig } from '../api/config'
import { chatJSON } from '../api/ai'
import { clearAllTasks } from '../composables/useTasks'
import { clearPomodoroRecords } from '../utils/storage'
import { getLogs } from '../utils/logger'

const message = useMessage()
const { settings, ensureLoaded, updateSettings } = useSettings()

// ---------- 专注设置 ----------
const pomodoroMinutes = ref(25)
const vibrateOnComplete = ref(true)

// ---------- AI 配置 ----------
const ai = ref({ baseURL: '', apiKey: '', model: '', useMock: true })

onMounted(async () => {
  try {
    await ensureLoaded()
    pomodoroMinutes.value = settings.value.pomodoroMinutes
    vibrateOnComplete.value = settings.value.vibrateOnComplete
  } catch {
    /* 设置读取失败：沿用默认值 */
  }
  const cfg = getAIConfig()
  ai.value = { baseURL: cfg.baseURL, apiKey: cfg.apiKey, model: cfg.model, useMock: cfg.useMock }
})

function savePomodoroMinutes(v) {
  if (!v) return
  updateSettings({ pomodoroMinutes: v })
  message.success('已保存')
}

function saveVibrate(v) {
  updateSettings({ vibrateOnComplete: v })
  message.success(v ? '完成提醒已开启' : '完成提醒已关闭')
}

function saveAI() {
  saveAIConfig({ ...ai.value })
  message.success('AI 配置已保存')
}

/** 【修复】模拟模式开关即时持久化，杜绝"切换了却没保存，AI 仍返回预设文字" */
function saveMockSwitch(v) {
  saveAIConfig({ ...ai.value })
  if (!v && !ai.value.apiKey.trim()) {
    message.warning('已关闭模拟模式，但 API Key 为空——AI 调用将报错，请填写 Key')
  } else {
    message.success(v ? '模拟模式已开启（返回本地样例）' : '模拟模式已关闭（AI 将真实调用接口）')
  }
}

// 测试连接：先保存配置，再发一个最小请求验证全链路
const testing = ref(false)
async function testAI() {
  saveAIConfig({ ...ai.value })
  testing.value = true
  try {
    await chatJSON('【AGENT_ID: focus】只输出 JSON：{"state":"normal"}', '连接测试')
    message.success('连接正常')
  } catch (e) {
    message.error(e.message || '连接失败')
  } finally {
    testing.value = false
  }
}

// ---------- 清空本地数据 ----------
async function clearAll() {
  await clearAllTasks()
  await clearPomodoroRecords()
  message.success('本地数据已清空')
}

/** 导出错误日志（下载 JSON 文件，测试问题定位用） */
async function handleExportLogs() {
  try {
    const logs = await getLogs()
    if (!logs.length) {
      message.info('暂无错误日志')
      return
    }
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `番茄AI-错误日志-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${logs.length} 条错误日志`)
  } catch (e) {
    message.error('导出失败：' + (e.message || '未知错误'))
  }
}
</script>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.field-label {
  font-size: 14px;
  color: var(--text-primary);
  min-width: 110px;
}

.field-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 6px 0 0;
}

.btn-row {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.about {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 8px 0 0;
  letter-spacing: 0.3px;
}
</style>
