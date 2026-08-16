import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

// 使用 hash 模式：打包到安卓 WebView 或任意静态服务器都无需服务端配置，
// 这也是后续 Tauri 打包最稳的路由方案
const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: '专注' } },
  { path: '/tasks', name: 'tasks', component: () => import('../views/TasksView.vue'), meta: { title: '任务' } },
  { path: '/stats', name: 'stats', component: () => import('../views/StatsView.vue'), meta: { title: '统计' } },
  { path: '/ai', name: 'ai', component: () => import('../views/AiView.vue'), meta: { title: 'AI助手' } },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { title: '设置' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 同步浏览器标签页标题
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 番茄AI` : '番茄AI'
})

export default router
