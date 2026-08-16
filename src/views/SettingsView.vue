<template>
  <div class="settings">
    <!-- 专注设置 -->
    <n-card title="专注设置" :bordered="false">
      <div class="field">
        <div class="field-label">番茄时长</div>
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
        <div class="field-label">短休息</div>
        <n-input-number
          v-model:value="shortBreakMinutes"
          :min="1"
          :max="60"
          style="width: 120px"
          @update:value="saveShortBreak"
        />
        <div class="field-hint">分钟</div>
      </div>
      <div class="field">
        <div class="field-label">长休息</div>
        <n-input-number
          v-model:value="longBreakMinutes"
          :min="1"
          :max="120"
          style="width: 120px"
          @update:value="saveLongBreak"
        />
        <div class="field-hint">分钟</div>
      </div>
      <div class="field">
        <div class="field-label">长休周期</div>
        <n-input-number
          v-model:value="longBreakEvery"
          :min="1"
          :max="10"
          style="width: 120px"
          @update:value="saveLongBreakEvery"
        />
        <div class="field-hint">每完成几个番茄进入长休息</div>
      </div>
      <div class="field">
        <div class="field-label">完成震动</div>
        <n-switch v-model:value="vibrateOnComplete" @update:value="saveVibrate" />
        <div class="field-hint">支持震动的设备</div>
      </div>
      <div class="field">
        <div class="field-label">完成提示音</div>
        <n-switch v-model:value="soundOnComplete" @update:value="saveSound" />
        <div class="field-hint">双音提示（无需音频文件）</div>
      </div>
      <div class="field">
        <div class="field-label">浏览器通知</div>
        <n-switch v-model:value="notifyOnComplete" @update:value="saveNotify" />
        <div class="field-hint">首次使用需授权；锁屏时可能延迟</div>
      </div>
    </n-card>

    <!-- AI 配置 -->
    <n-card title="AI 配置" :bordered="false">
      <div class="field">
        <div class="field-label">服务商</div>
        <n-select
          v-model:value="ai.provider"
          :options="presetOptions"
          style="flex: 1"
          @update:value="applyPreset"
        />
        <div class="field-hint">选择后自动填入接口地址与模型，可再手动修改</div>
      </div>
      <div class="field">
        <div class="field-label">接口地址（OpenAI 兼容）</div>
        <n-input v-model:value="ai.baseURL" placeholder="https://api.deepseek.com/v1" />
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
        <n-switch v-model:value="ai.useMock" />
        <div class="field-hint">开启后 AI 请求返回本地样例数据</div>
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
        <div class="field-label">导出备份</div>
        <n-button @click="handleExport">导出 JSON 备份</n-button>
        <div class="field-hint">任务、番茄记录、设置保存为一个 JSON 文件</div>
      </div>
      <div class="field">
        <div class="field-label">导入备份</div>
        <n-button @click="fileInputRef?.click()">导入 JSON 恢复</n-button>
        <input
          ref="fileInputRef"
          type="file"
          accept="application/json,.json"
          style="display: none"
          @change="handleImport"
        />
        <div class="field-hint">会覆盖当前全部任务与记录，请先导出备份</div>
      </div>
      <div class="field">
        <div class="field-label">清空本地数据</div>
        <n-popconfirm
          positive-text="清空"
          negative-text="取消"
          :positive-button-props="{ type: 'error' }"
          @positive-click="clearAll"
        >
          <template #trigger>
            <n-button type="error" quaternary>清空任务、番茄记录与设置</n-button>
          </template>
          将删除全部任务、番茄记录和设置，且无法恢复，确定吗？
        </n-popconfirm>
      </div>
    </n-card>

    <!-- 关于 -->
    <n-card title="关于" :bordered="false">
      <div class="about-line">番茄AI v0.1.0 · 个人自用版</div>
      <div class="about-line">数据仅存本机浏览器（IndexedDB），不上传任何用户数据</div>
      <div class="about-line">AI 调用仅发送任务文本与统计摘要（需关闭模拟模式并配置 Key）</div>
      <div class="about-line">⚠️ 网页打包已知限制：手机锁屏/后台时计时会暂停，回到前台自动校准</div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useSettings } from '../composables/useSettings'
import { getAIConfig, saveAIConfig, AI_PRESETS, matchPreset } from '../api/config'
import { chatJSON } from '../api/ai'
import { clearAllTasks, reloadTasks } from '../composables/useTasks'
import { exportBackup, importBackup, clearPomodoroRecords, clearPomodoroEvents, clearSettings } from '../utils/storage'

const message = useMessage()
const { settings, ensureLoaded, updateSettings, reloadSettings } = useSettings()

// ---------- 专注设置 ----------
const pomodoroMinutes = ref(25)
const shortBreakMinutes = ref(5)
const longBreakMinutes = ref(15)
const longBreakEvery = ref(4)
const vibrateOnComplete = ref(true)
const soundOnComplete = ref(true)
const notifyOnComplete = ref(true)

// ---------- AI 配置 ----------
const ai = ref({ provider: 'custom', baseURL: '', apiKey: '', model: '', useMock: true })

const presetOptions = AI_PRESETS.map((p) => ({ label: p.label, value: p.value }))

/** 选择服务商预设：自动填充接口地址与模型（自定义则保留当前输入） */
function applyPreset(value) {
  const preset = AI_PRESETS.find((p) => p.value === value)
  if (!preset || value === 'custom') return
  ai.value.baseURL = preset.baseURL
  ai.value.model = preset.model
  message.success(`已填入 ${preset.label} 配置，可再手动修改`)
}

onMounted(async () => {
  await ensureLoaded()
  pomodoroMinutes.value = settings.value.pomodoroMinutes
  shortBreakMinutes.value = settings.value.shortBreakMinutes
  longBreakMinutes.value = settings.value.longBreakMinutes
  longBreakEvery.value = settings.value.longBreakEvery
  vibrateOnComplete.value = settings.value.vibrateOnComplete
  soundOnComplete.value = settings.value.soundOnComplete
  notifyOnComplete.value = settings.value.notifyOnComplete
  const cfg = getAIConfig()
  ai.value = {
    provider: matchPreset(cfg),
    baseURL: cfg.baseURL,
    apiKey: cfg.apiKey,
    model: cfg.model,
    useMock: cfg.useMock
  }
})

function savePomodoroMinutes(v) {
  if (!v) return
  updateSettings({ pomodoroMinutes: v })
}

function saveShortBreak(v) {
  if (!v) return
  updateSettings({ shortBreakMinutes: v })
}

function saveLongBreak(v) {
  if (!v) return
  updateSettings({ longBreakMinutes: v })
}

function saveLongBreakEvery(v) {
  if (!v) return
  updateSettings({ longBreakEvery: v })
}

function saveVibrate(v) {
  updateSettings({ vibrateOnComplete: v })
  message.success(v ? '完成震动已开启' : '完成震动已关闭')
}

function saveSound(v) {
  updateSettings({ soundOnComplete: v })
  message.success(v ? '提示音已开启' : '提示音已关闭')
}

function saveNotify(v) {
  updateSettings({ notifyOnComplete: v })
  message.success(v ? '浏览器通知已开启' : '浏览器通知已关闭')
}

function saveAI() {
  saveAIConfig({ ...ai.value })
  message.success('AI 配置已保存')
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

// ---------- 数据管理 ----------
const fileInputRef = ref(null)

/** 导出备份：任务 + 番茄记录 + 设置 → 下载 JSON 文件 */
async function handleExport() {
  try {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `番茄AI备份-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    message.success('备份已导出')
  } catch (e) {
    message.error('导出失败：' + (e.message || '未知错误'))
  }
}

/** 导入备份：解析校验 → 覆盖写库 → 刷新内存状态 */
async function handleImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    await importBackup(text)
    await Promise.all([reloadTasks(), reloadSettings()])
    message.success('导入成功，数据已恢复')
  } catch (err) {
    message.error('导入失败：' + (err.message || '文件无法解析'))
  } finally {
    e.target.value = '' // 允许再次选择同一文件
  }
}

/** 清空全部本地数据（任务 + 记录 + 会话事件 + 设置） */
async function clearAll() {
  await clearAllTasks()
  await clearPomodoroRecords()
  await clearPomodoroEvents()
  await clearSettings()
  await Promise.all([reloadTasks(), reloadSettings()])
  message.success('全部本地数据已清空')
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

.about-line {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.8;
}
</style>
