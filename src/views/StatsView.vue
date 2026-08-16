<template>
  <div class="stats">
    <n-spin :show="loading">
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
          <div class="stat-sub">累计专注 {{ totalMinutes }} 分钟</div>
        </div>

        <!-- 任务完成率 -->
        <div class="stat-card">
          <div class="stat-label">任务完成率</div>
          <div class="stat-num">{{ taskStats.rate }}<span class="stat-percent">%</span></div>
          <div class="stat-sub">{{ taskStats.done }} / {{ taskStats.total }} 已完成</div>
        </div>
      </div>

      <!-- 近 7 天柱状图（纯 CSS，零依赖） -->
      <div class="chart-card">
        <div class="chart-title">近 7 天</div>
        <div class="bar-chart">
          <div v-for="(d, i) in last7Days" :key="d.label" class="bar-item">
            <div class="bar-count">{{ d.count || '' }}</div>
            <div
              class="bar"
              :style="{ height: barHeight(d.count) }"
              :class="{ empty: d.count === 0, today: i === last7Days.length - 1 }"
            ></div>
            <div class="bar-label" :class="{ today: i === last7Days.length - 1 }">{{ d.label }}</div>
          </div>
        </div>
        <p v-if="total === 0" class="chart-empty">
          还没有番茄记录——完成第一个番茄后，这里会显示近 7 天数据
        </p>
      </div>
    </n-spin>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useStats } from '../composables/useStats'

const { loading, today, week, total, totalMinutes, last7Days, taskStats, load } = useStats()

onMounted(() => {
  load()
  // 从后台切回时刷新统计（跨午夜、完成番茄后数据保持最新）
  document.addEventListener('visibilitychange', onVisible)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisible)
})

function onVisible() {
  if (document.visibilityState === 'visible') load()
}

/** 柱高按当天占比映射到 96px 内，最少 6px 保证可见 */
function barHeight(count) {
  const max = Math.max(...last7Days.value.map((d) => d.count), 1)
  return `${Math.max(6, Math.round((count / max) * 96))}px`
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

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 118px;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
}

.bar-count {
  font-size: 11px;
  color: var(--text-tertiary);
  height: 14px;
  font-variant-numeric: tabular-nums;
}

/* 历史柱降透明度，今日柱满透明度高亮 */
.bar {
  width: 70%;
  background: var(--primary);
  border-radius: 6px 6px 0 0;
  opacity: 0.4;
  min-height: 4px;
  transition: opacity 0.2s ease;
}

.bar.today {
  opacity: 1;
}

.bar.empty {
  background: var(--outline);
  height: 6px !important;
  opacity: 1;
}

.bar-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.bar-label.today {
  color: var(--primary);
  font-weight: 500;
}

.chart-empty {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  margin: 10px 0 0;
}
</style>
