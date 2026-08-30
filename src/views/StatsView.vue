<template>
  <div class="stats">
    <n-spin :show="loading">
      <!-- 骨架屏：首次加载且无数据时 -->
      <template v-if="loading && total === 0">
        <div class="stats-grid">
          <div v-for="i in 4" :key="i" class="stat-card skeleton-card">
            <div class="sk sk-label"></div>
            <div class="sk sk-num"></div>
          </div>
        </div>
      </template>

      <template v-else>
      <div class="stats-grid">
        <!-- 今日 -->
        <div class="stat-card">
          <div class="stat-label">今日番茄</div>
          <div class="stat-num">{{ today.count }}</div>
          <div class="stat-sub">专注 {{ today.minutes }} 分钟</div>
        </div>

        <!-- 本周 -->
        <div class="stat-card">
          <div class="stat-label">本周番茄</div>
          <div class="stat-num">{{ week.count }}</div>
          <div class="stat-sub">专注 {{ week.minutes }} 分钟</div>
        </div>

        <!-- 累计 -->
        <div class="stat-card">
          <div class="stat-label">累计番茄</div>
          <div class="stat-num">{{ total }}</div>
          <div class="stat-sub">全部记录在本地</div>
        </div>

        <!-- 任务完成率（环形） -->
        <div class="stat-card">
          <div class="stat-label">任务完成率</div>
          <div class="rate-wrap">
            <TimerRing :progress="taskStats.rate / 100" :size="72" :stroke-width="7">
              <span class="rate-num">{{ taskStats.rate }}<span class="rate-percent">%</span></span>
            </TimerRing>
          </div>
          <div class="stat-sub">{{ taskStats.done }} / {{ taskStats.total }} 已完成</div>
        </div>
      </div>

      <!-- 近 7 天趋势（SVG 柱状 + 折线，零依赖） -->
      <div class="chart-card">
        <div class="chart-title">近 7 天</div>
        <TrendChart :data="last7Days" />
      </div>
      </template>
    </n-spin>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useStats } from '../composables/useStats'
import { on as onEvent } from '../utils/events'
import TimerRing from '../components/TimerRing.vue'
import TrendChart from '../components/TrendChart.vue'

const { loading, today, week, total, last7Days, taskStats, load } = useStats()

let offPomodoro = null

onMounted(() => {
  load()
  // 从后台切回时刷新统计（跨午夜、完成番茄后数据保持最新）
  document.addEventListener('visibilitychange', onVisible)
  // 【联动】番茄完成事件 → 统计自动刷新（无需手动切页触发）
  offPomodoro = onEvent('pomodoro:completed', () => load())
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisible)
  offPomodoro?.()
})

function onVisible() {
  if (document.visibilityState === 'visible') load()
}

</script>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* 平板/桌面：四列一行 */
@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Material 卡片：大圆角 + 低阴影 */
.stat-card,
.chart-card {
  background: var(--surface);
  border-radius: var(--radius-l);
  padding: 16px;
  box-shadow: var(--shadow-1);
}

.stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  letter-spacing: 0.3px;
}

.stat-num {
  font-size: 28px;
  font-weight: 600;
  margin: 6px 0;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.stat-percent {
  font-size: 16px;
  color: var(--text-tertiary);
}

.stat-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.chart-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

/* 完成率环形 */
.rate-wrap {
  display: flex;
  justify-content: center;
  margin: 8px 0;
}

.rate-num {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.rate-percent {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* 骨架屏 */
.skeleton-card {
  animation: sk-pulse 1.2s ease-in-out infinite;
}

.sk {
  background: var(--surface-variant);
  border-radius: 6px;
}

.sk-label {
  height: 12px;
  width: 40%;
  margin-bottom: 12px;
}

.sk-num {
  height: 28px;
  width: 60%;
}

@keyframes sk-pulse {
  50% {
    opacity: 0.55;
  }
}
</style>
