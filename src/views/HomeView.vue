<template>
  <div class="home">
    <!-- 进度环 + 时间 -->
    <TimerRing :progress="progress">
      <div class="time">{{ displayTime }}</div>
      <div class="status">{{ statusText }}</div>
      <div v-if="state === 'completed'" class="done">🎉 完成！已记录到本地</div>
    </TimerRing>

    <!-- 绑定任务（可选）：完成的番茄计入该任务 -->
    <n-select
      v-model:value="selectedTaskId"
      :options="taskOptions"
      clearable
      size="small"
      placeholder="绑定任务（可选），完成的番茄将计入该任务"
      style="width: 100%; max-width: 300px"
      :disabled="isRunning"
    />

    <!-- 时长配置：25 / 45 / 60 分钟预设 + 自定义（1~180 分钟），计时中锁定 -->
    <div class="duration">
      <n-radio-group
        :value="activePreset"
        :disabled="isRunning"
        size="small"
        @update:value="applyPreset"
      >
        <n-radio-button v-for="p in presets" :key="p.value" :value="p.value">
          {{ p.label }}
        </n-radio-button>
      </n-radio-group>
      <n-input-number
        v-model:value="customMinutes"
        :min="1"
        :max="180"
        :disabled="isRunning"
        size="small"
        placeholder="自定义分钟"
        style="width: 120px"
        @update:value="applyCustom"
      />
    </div>

    <!-- 操作按钮：按状态切换 -->
    <div class="actions">
      <template v-if="state === 'idle'">
        <n-button type="primary" size="large" round @click="start">开始专注</n-button>
      </template>

      <template v-else-if="state === 'running'">
        <n-button size="large" round secondary @click="pause">暂停</n-button>
        <n-popconfirm
          positive-text="放弃"
          negative-text="取消"
          :positive-button-props="{ type: 'error' }"
          @positive-click="abandon"
        >
          <template #trigger>
            <n-button size="large" round quaternary type="error">放弃</n-button>
          </template>
          确定放弃本次专注？进度不会保留
        </n-popconfirm>
      </template>

      <template v-else-if="state === 'paused'">
        <n-button type="primary" size="large" round @click="resume">继续</n-button>
        <n-popconfirm
          positive-text="放弃"
          negative-text="取消"
          :positive-button-props="{ type: 'error' }"
          @positive-click="abandon"
        >
          <template #trigger>
            <n-button size="large" round quaternary type="error">放弃</n-button>
          </template>
          确定放弃本次专注？进度不会保留
        </n-popconfirm>
      </template>

      <template v-else-if="state === 'completed'">
        <n-button type="primary" size="large" round @click="start">再来一个番茄</n-button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { usePomodoro } from '../composables/usePomodoro'
import { useSettings } from '../composables/useSettings'
import { useTasks, pendingFocusTaskId } from '../composables/useTasks'
import { addPomodoroRecord } from '../utils/storage'
import { on as onEvent, emit } from '../utils/events'
import TimerRing from '../components/TimerRing.vue'

const message = useMessage()

const { settings, ensureLoaded: ensureSettingsLoaded, updateSettings } = useSettings()
const { tasks, ensureLoaded: ensureTasksLoaded, incrementTaskPomodoros } = useTasks()

// 完成回调：落库 + 轻提示 + 震动（按设置开关）
const {
  state,
  durationSec,
  displayTime,
  progress,
  start,
  pause,
  resume,
  abandon,
  setDuration,
  applySettings
} = usePomodoro({
  onComplete(record) {
    // 落库（异常兜底：数据库失败不打断应用流程）
    addPomodoroRecord(record)
      .then(() => {
        try {
          if (settings.value.vibrateOnComplete) navigator.vibrate?.(200)
        } catch {
          /* 震动失败静默 */
        }
        message.success('番茄完成，记录已保存 🍅')
      })
      .catch(() => {
        message.error('记录保存失败，请检查本地存储')
      })
    // 【联动】绑定任务累加已消耗番茄数（失败仅提示）
    if (selectedTaskId.value) {
      incrementTaskPomodoros(selectedTaskId.value).catch(() => {
        message.error('任务计数更新失败')
      })
    }
    // 【联动】全局广播：统计页等模块自动刷新
    emit('pomodoro:completed', record)
  }
})

// 挂载时：应用设置 + 恢复时长记忆 + 加载任务 + 接收"开始专注"快捷入口
onMounted(async () => {
  try {
    await ensureSettingsLoaded()
    applySettings({ pomodoroMinutes: settings.value.pomodoroMinutes })
    // 【联动】时长记忆：恢复上次使用的时长
    const last = settings.value.lastDurationMinutes
    if (last && last !== customMinutes.value) {
      customMinutes.value = last
      setDuration(last * 60)
    }
  } catch {
    /* 设置读取失败：沿用默认值 */
  }
  try {
    await ensureTasksLoaded()
  } catch {
    /* 任务读取失败：列表为空，可刷新重试 */
  }
  // 【联动】任务页"▶ 开始专注"快捷入口
  if (pendingFocusTaskId.value) {
    selectedTaskId.value = pendingFocusTaskId.value
    pendingFocusTaskId.value = null
  }
})

watch(
  () => settings.value.pomodoroMinutes,
  (m) => {
    if (m) applySettings({ pomodoroMinutes: m })
  }
)

const isRunning = computed(() => state.value === 'running' || state.value === 'paused')

// ---------- 任务绑定 ----------
const selectedTaskId = ref(null)

const taskOptions = computed(() =>
  tasks.value
    .filter((t) => !t.done)
    .map((t) => ({ label: t.title, value: t.id }))
)

const statusText = computed(() => {
  const map = {
    idle: '准备专注',
    running: '专注中，保持节奏',
    paused: '已暂停',
    completed: '本番茄已完成'
  }
  return map[state.value]
})

// ---------- 时长配置 ----------
const presets = [
  { label: '25分钟', value: 25 },
  { label: '45分钟', value: 45 },
  { label: '60分钟', value: 60 }
]

const customMinutes = ref(25)

/** 当前选中的预设（自定义值不在预设中则返回 null，预设不点亮） */
const activePreset = computed(() => {
  const minutes = Math.round(durationSec.value / 60)
  return presets.some((p) => p.value === minutes) ? minutes : null
})

function applyPreset(minutes) {
  customMinutes.value = minutes
  setDuration(minutes * 60)
  persistDuration(minutes)
}

function applyCustom(minutes) {
  if (!minutes) return
  setDuration(minutes * 60)
  persistDuration(minutes)
}

/** 【联动】时长记忆：记住上次使用的时长，下次打开自动恢复 */
function persistDuration(minutes) {
  updateSettings({ lastDurationMinutes: minutes })
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding-top: 24px;
}

/* 计时数字：Display 级字号，等宽数字防跳动 */
.time {
  font-size: 56px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: var(--text-primary);
  letter-spacing: 1px;
}

.status {
  font-size: 14px;
  color: var(--text-secondary);
}

.done {
  font-size: 13px;
  font-weight: 500;
  color: var(--primary);
}

.duration {
  display: flex;
  align-items: center;
  gap: 10px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 48px;
}
</style>
