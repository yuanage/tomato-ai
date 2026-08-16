import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/base.css'
import { initErrorCapture } from './utils/logger'

// 全局错误捕获（写入本地日志，设置页可导出，便于测试问题定位）
initErrorCapture()

createApp(App).use(router).mount('#app')
