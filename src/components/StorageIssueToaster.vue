<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { on } from '../utils/events'

/**
 * 存储通道告警接收器：监听 storage:issue 事件并以消息条提示。
 * 必须渲染在 n-message-provider 内部才能使用 useMessage，故独立成组件挂到 App 内。
 */
const message = useMessage()
let unsubscribe = null

onMounted(() => {
  unsubscribe = on('storage:issue', (msg) => {
    message.warning(String(msg), { duration: 6000, closable: true })
  })
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <!-- 无可见内容：仅承载消息提示副作用 -->
  <span style="display: none" aria-hidden="true"></span>
</template>
