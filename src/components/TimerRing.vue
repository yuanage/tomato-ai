<template>
  <div class="timer-ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" viewBox="0 0 100 100">
      <!-- 底环 -->
      <circle class="track" cx="50" cy="50" r="45" :stroke-width="strokeWidth" />
      <!-- 进度环：从顶部开始，随剩余时间递减 -->
      <g transform="rotate(-90 50 50)">
        <circle
          class="bar"
          cx="50"
          cy="50"
          r="45"
          :stroke-width="strokeWidth"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="offset"
        />
      </g>
    </svg>
    <div class="ring-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 剩余进度 0~1 */
  progress: { type: Number, default: 0 },
  size: { type: Number, default: 260 },
  strokeWidth: { type: Number, default: 6 }
})

const R = 45
const circumference = 2 * Math.PI * R
const offset = computed(() => circumference * (1 - Math.min(1, Math.max(0, props.progress))))
</script>

<style scoped>
.timer-ring {
  position: relative;
}

.timer-ring svg {
  display: block;
}

.track {
  fill: none;
  stroke: var(--outline);
}

.bar {
  fill: none;
  stroke: var(--primary); /* 番茄红，唯一强调色 */
  stroke-linecap: round;
  /* 【加固】去除 stroke-dashoffset 过渡：弱 WebView 下 SVG 属性动画在 2Hz 更新时会造成绘制压力 */
}

.ring-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  user-select: none;
}
</style>
