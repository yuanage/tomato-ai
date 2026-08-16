<template>
  <div class="home">
    <!-- 进度环 + 时间（休息态环变绿） -->
    <TimerRing :progress="progress" :color="ringColor">
      <div class="time">{{ displayTime }}</div>
      <div class="status">{{ statusText }}</div>
      <div v-if="state === 'completed'" class="done">
        {{ mode === 'break' ? '☕ 休息结束，开始下一个番茄吧' : '🎉 完成！已记录到本地' }}
      </div>
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

    <!-- 时长配置：休息中锁定；专注计时中可改（下一个番茄生效） -->
    <div class="duration">
      <n-radio-group
        :value="activePreset"
        :disabled="mode === 'break'"
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
        :disabled="mode === 'break'"
        size="small"
        placeholder="自定义分钟"
        style="width: 120px"
        @update:value="applyCustom"
      />
    </div>

    <!-- 操作按钮：按 模式×状态 切换 -->
    <div class="actions">
      <!-- 专注态 -->
      <template v-if="mode === 'focus'">
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
          <n-button type="primary" size="large" round @click="start">开始下一个番茄</n-button>
        </template>
      </template>

      <!-- 休息态 -->
      <template v-else>
        <template v-if="state === 'running'">
          <n-button size="large" round secondary @click="pause">暂停休息</n-button>
          <n-button size="large" round quaternary @click="skipBreak">跳过休息</n-button>
        </template>
        <template v-else-if="state === 'paused'">
          <n-button type="primary" size="large" round @click="resume">继续休息</n-button>
          <n-button size="large" round quaternary @click="skipBreak">跳过休息</n-button>
        </template>
        <template v-else-if="state === 'completed'">
          <n-button type="primary" size="large" round @click="start">开始下一个番茄</n-button>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { usePomodoro } from '../composables/usePomodoro'
import { useSettings } from '../composables/useSettings'
import { useTasks } from '../composables/useTasks'
import { addPomodoroRecord, addPomodoroEvent, genId } from '../utils/storage'
import { notifyIfAllowed } from '../utils/notify'
import { playCompleteSound } from '../utils/sound'
import TimerRing from '../components/TimerRing.vue'

const message = useMessage()

/** 【加固】完成时的副作用隔离执行：震动/音效/通知任一异常都不会外溢卡住页面 */
function runSideEffects(fn) {
  try {
    fn()
  } catch {
    /* 副作用失败静默忽略，主流程不受影响 */
  }
}

const { settings, ensureLoaded: ensureSettingsLoaded } = useSettings()
const { tasks, ensureLoaded: ensureTasksLoaded, incrementTaskPomodoros } = useTasks()

// 完成回调：番茄落库 + 任务计数 + 提醒三件套（震动/音效/通知，按设置开关）
const {
  state,
  mode,
  breakKind,
  durationSec,
  displayTime,
  progress,
  start,
  pause,
  resume,
  abandon,
  skipBreak,
  setDuration,
  applySettings
} = usePomodoro({
  onComplete(evt) {
    if (evt.type === 'pomodoro') {
      // 【修复】落库（异常兜底：数据库失败不打断应用流程，仅提示）
      addPomodoroRecord(evt.record)
        .then(() => {
          // 【加固】震动/音效/通知全部经隔离执行，互不影响、异常不外溢
          if (settings.value.vibrateOnComplete) runSideEffects(() => navigator.vibrate?.(200))
          if (settings.value.soundOnComplete) runSideEffects(playCompleteSound)
          if (settings.value.notifyOnComplete) {
            runSideEffects(() =>
              notifyIfAllowed(
                '番茄完成 🍅',
                `专注 ${Math.round(evt.record.durationSec / 60)} 分钟，休息 ${evt.breakMinutes} 分钟`
              )
            )
          }
          message.success('番茄完成，记录已保存 🍅')
        })
        .catch(() => {
          message.error('记录保存失败，请检查本地存储')
        })
      // 【修复】绑定任务时累加该任务的已消耗番茄数（与番茄记录入库同步执行；
      // incrementTaskPomodoros 内部 ensureLoaded 已改为共享 Promise，杜绝并发加载覆盖丢失）
      if (selectedTaskId.value) {
        incrementTaskPomodoros(selectedTaskId.value).catch(() => {
          message.error('任务计数更新失败')
        })
      }
    } else if (evt.type === 'breakEnd') {
      if (settings.value.notifyOnComplete) notifyIfAllowed('休息结束 ☕', '开始下一个番茄吧')
      message.info('休息结束，开始下一个番茄 ☕')
    }
  },
  // 【修复】放弃/暂停事件落库（失败静默，不影响主流程）
  onAbandon(evt) {
    addPomodoroEvent({ id: genId(), type: 'abandoned', at: evt.at, plannedSec: evt.plannedSec }).catch(
      () => {}
    )
  },
  onPause(evt) {
    addPomodoroEvent({ id: genId(), type: 'paused', at: evt.at }).catch(() => {})
  }
})

// 【修复】挂载时应用设置并加载任务供绑定（数据加载等待机制：先 await 再使用；
// 读取失败不阻塞页面，且 ensureLoaded 共享 Promise 保证绑定选择器拿到的始终是完整最新列表）
onMounted(async () => {
  try {
    await ensureSettingsLoaded()
    applySettings(settings.value)
  } catch {
    /* 设置读取失败：沿用内存默认值 */
  }
  try {
    await ensureTasksLoaded()
  } catch {
    /* 任务读取失败：任务列表为空，可刷新重试 */
  }
})

watch(
  () => settings.value,
  (s) => applySettings(s)
)

const isRunning = computed(() => state.value === 'running' || state.value === 'paused')

/** 休息态进度环用绿色，专注态番茄红 */
const ringColor = computed(() => (mode.value === 'break' ? '#188038' : '#d03050'))

const statusText = computed(() => {
  if (mode.value === 'break') {
    const map = {
      idle: '准备休息',
      running: breakKind.value === 'long' ? '长休息中 ☕' : '短休息中 ☕',
      paused: '休息已暂停',
      completed: '休息结束'
    }
    return map[state.value]
  }
  const map = {
    idle: '准备专注',
    running: '专注中，保持节奏',
    paused: '已暂停',
    completed: '本番茄已完成'
  }
  return map[state.value]
})

// ---------- 任务绑定 ----------
const selectedTaskId = ref(null)

const taskOptions = computed(() =>
  tasks.value
    .filter((t) => !t.done)
    .map((t) => ({ label: t.title, value: t.id }))
)

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
}

function applyCustom(minutes) {
  if (!minutes) return
  setDuration(minutes * 60)
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
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
