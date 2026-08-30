<template>
  <div class="trend-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" class="chart-svg" role="img" aria-label="近7天番茄趋势图">
      <!-- 趋势虚线（贯穿各柱顶） -->
      <polyline
        v-if="points.length > 1"
        :points="trendPoints"
        fill="none"
        stroke="var(--text-tertiary)"
        stroke-width="1.5"
        stroke-dasharray="4 3"
      />
      <g v-for="(p, i) in points" :key="i">
        <rect
          :x="p.barX"
          :y="p.barY"
          :width="p.barW"
          :height="p.barH"
          rx="3"
          :fill="p.count === 0 ? 'var(--outline)' : 'var(--primary)'"
          :opacity="p.count === 0 ? 1 : p.today ? 1 : 0.4"
        >
          <title>{{ p.label }}：{{ p.count }} 个番茄</title>
        </rect>
        <text v-if="p.count" :x="p.cx" :y="p.barY - 5" text-anchor="middle" class="value-label">
          {{ p.count }}
        </text>
        <text
          :x="p.cx"
          :y="H - 6"
          text-anchor="middle"
          class="axis-label"
          :class="{ today: p.today }"
        >
          {{ p.label }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * 近 7 天趋势图（纯 SVG，零依赖）：柱状 + 趋势虚线
 * data: [{ label, count }]
 */
const props = defineProps({
  data: { type: Array, default: () => [] }
})

const W = 320
const H = 150
const PAD_B = 24 // 底部留标签
const PAD_T = 20 // 顶部留数值

const maxCount = computed(() => Math.max(...props.data.map((d) => d.count), 1))

const points = computed(() => {
  const n = props.data.length
  if (!n) return []
  const colW = W / n
  const max = maxCount.value
  return props.data.map((d, i) => {
    const cx = colW * i + colW / 2
    const barW = colW * 0.5
    const h = Math.max(4, Math.round((d.count / max) * (H - PAD_B - PAD_T)))
    return {
      cx,
      barX: cx - barW / 2,
      barW,
      barY: H - PAD_B - h,
      barH: h,
      count: d.count,
      label: d.label,
      today: i === n - 1
    }
  })
})

const trendPoints = computed(() => points.value.map((p) => `${p.cx},${p.barY}`).join(' '))
</script>

<style scoped>
.trend-chart {
  width: 100%;
}

.chart-svg {
  width: 100%;
  height: auto;
  display: block;
}

.value-label {
  font-size: 10px;
  fill: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.axis-label {
  font-size: 11px;
  fill: var(--text-tertiary);
}

.axis-label.today {
  fill: var(--primary);
  font-weight: 600;
}
</style>
