<template>
  <!-- Material 风格主题覆写：强调色 / 圆角 / 字体全局注入 NaiveUI -->
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div class="app-shell">
          <!-- 主内容区：路由出口 -->
          <main class="app-main">
            <router-view />
          </main>

          <!-- 底部导航：5 个一级页面，激活项胶囊高亮 -->
          <nav class="bottom-nav">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="nav-item"
              :class="{ active: route.path === item.path }"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </router-link>
          </nav>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

// 5 个一级页面，与路由一一对应
const navItems = [
  { path: '/', label: '专注', icon: '🍅' },
  { path: '/tasks', label: '任务', icon: '📋' },
  { path: '/stats', label: '统计', icon: '📊' },
  { path: '/ai', label: 'AI助手', icon: '🤖' },
  { path: '/settings', label: '设置', icon: '⚙️' }
]

// Material 风格：番茄红强调色 + 胶囊按钮圆角 + 统一字体（与 CSS 令牌同源）
const themeOverrides = {
  common: {
    primaryColor: '#d03050',
    primaryColorHover: '#e04866',
    primaryColorPressed: '#b62a46',
    primaryColorSuppl: '#d03050',
    borderRadius: '10px',
    borderRadiusSmall: '8px',
    fontFamily:
      "'Roboto', 'Noto Sans SC', -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    textColorBase: '#1f1f1f',
    textColor1: '#1f1f1f',
    textColor2: '#5f5f66',
    textColor3: '#9a9aa2',
    bodyColor: '#f6f6f7',
    cardColor: '#ffffff',
    dividerColor: '#ececef'
  },
  Card: { borderRadius: '16px' },
  Button: {
    borderRadiusSmall: '999px',
    borderRadiusMedium: '999px',
    borderRadiusLarge: '999px'
  },
  Input: { borderRadius: '10px' }
}
</script>

<style scoped>
/* 手机壳布局：最大宽度 480px 居中，桌面浏览器预览也接近手机形态 */
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: var(--bg);
}

.app-main {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  /* 底部留出导航栏高度 + 安卓手势条安全区域 */
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

/* Material 底部导航：白底 + 顶部细分隔阴影 */
.bottom-nav {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  display: flex;
  background: var(--surface);
  box-shadow: 0 -1px 0 rgba(31, 31, 31, 0.04), 0 -4px 16px rgba(31, 31, 31, 0.03);
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 0 6px;
  color: var(--text-tertiary);
  text-decoration: none;
  user-select: none;
}

/* 激活项：胶囊容器高亮 + 强调色 */
.nav-item.active {
  color: var(--primary);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 28px;
  border-radius: 14px;
  font-size: 17px;
  line-height: 1;
  transition: background-color 0.2s ease;
}

.nav-item.active .nav-icon {
  background: var(--primary-container);
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2px;
}
</style>
