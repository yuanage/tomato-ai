<template>
  <!-- Material 风格主题覆写：强调色 / 圆角 / 字体全局注入 NaiveUI；暗色跟随系统 -->
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div class="app-shell">
          <!-- 主内容区：路由出口（150ms 淡入淡出，reduced-motion 时自动禁用） -->
          <main class="app-main">
            <router-view v-slot="{ Component }">
              <transition name="page" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
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
              <span class="nav-icon">
                <i
                  class="glyph glyph-filled"
                  :style="glyphStyle(item, 'filled')"
                ></i>
                <i
                  class="glyph glyph-outline"
                  :style="glyphStyle(item, 'outline')"
                ></i>
              </span>
              <span class="nav-label">{{ item.label }}</span>
            </router-link>
          </nav>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { computed, watchEffect, onMounted } from 'vue'
import { darkTheme } from 'naive-ui'
import { useRoute } from 'vue-router'
import { useSettings } from './composables/useSettings'
import navFocusFilled from './assets/icons/nav-focus-filled.png'
import navFocusOutline from './assets/icons/nav-focus-outline.png'
import navTaskFilled from './assets/icons/nav-task-filled.png'
import navTaskOutline from './assets/icons/nav-task-outline.png'
import navStatsFilled from './assets/icons/nav-stats-filled.png'
import navStatsOutline from './assets/icons/nav-stats-outline.png'
import navAiFilled from './assets/icons/nav-ai-filled.png'
import navAiOutline from './assets/icons/nav-ai-outline.png'
import navSettingsFilled from './assets/icons/nav-settings-filled.png'
import navSettingsOutline from './assets/icons/nav-settings-outline.png'

const route = useRoute()

// 主题：设置页驱动（默认亮色，可切暗色）；CSS 令牌经 html.theme-dark 类同步
const { settings, ensureLoaded: ensureSettingsLoaded } = useSettings()
const isDark = computed(() => settings.value.themeMode === 'dark')

// 同步 NaiveUI 主题
const naiveTheme = computed(() => (isDark.value ? darkTheme : undefined))

// 同步 CSS 令牌类（html 根元素）
watchEffect(() => {
  document.documentElement.classList.toggle('theme-dark', isDark.value)
})

// 启动时恢复用户的主题选择
onMounted(async () => {
  try {
    await ensureSettingsLoaded()
  } catch {
    /* 读取失败：默认亮色 */
  }
})

// 暗色下同步 NaiveUI 常用令牌（与 CSS 暗色令牌同源）
const darkCommon = {
  primaryColor: '#e04866',
  primaryColorHover: '#ea6a83',
  primaryColorPressed: '#c73a56',
  primaryColorSuppl: '#e04866',
  textColorBase: '#e8e8ea',
  textColor1: '#e8e8ea',
  textColor2: '#a8a8ae',
  textColor3: '#7a7a80',
  bodyColor: '#111314',
  cardColor: '#1c1e20',
  dividerColor: '#33363a'
}

const themeOverrides = computed(() => ({
  common: {
    ...(isDark.value ? darkCommon : {}),
    primaryColor: isDark.value ? '#e04866' : '#d03050',
    primaryColorHover: isDark.value ? '#ea6a83' : '#e04866',
    primaryColorPressed: isDark.value ? '#c73a56' : '#b62a46',
    primaryColorSuppl: isDark.value ? '#e04866' : '#d03050',
    borderRadius: '10px',
    borderRadiusSmall: '8px',
    fontFamily:
      "'Roboto', 'Noto Sans SC', -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    ...(isDark.value
      ? {}
      : {
          textColorBase: '#1f1f1f',
          textColor1: '#1f1f1f',
          textColor2: '#5f5f66',
          textColor3: '#9a9aa2',
          bodyColor: '#f6f6f7',
          cardColor: '#ffffff',
          dividerColor: '#ececef'
        })
  },
  Card: { borderRadius: '16px' },
  Button: {
    borderRadiusSmall: '999px',
    borderRadiusMedium: '999px',
    borderRadiusLarge: '999px'
  },
  Input: { borderRadius: '10px' }
}))

// 5 个一级页面，与路由一一对应；图标用生成的 SF Symbols 风格 PNG 蒙版（选中=填充红 / 未选中=描边灰）
const navGlyphs = {
  focus: { filled: navFocusFilled, outline: navFocusOutline },
  task: { filled: navTaskFilled, outline: navTaskOutline },
  stats: { filled: navStatsFilled, outline: navStatsOutline },
  ai: { filled: navAiFilled, outline: navAiOutline },
  settings: { filled: navSettingsFilled, outline: navSettingsOutline }
}

const navItems = [
  { path: '/', label: '专注', key: 'focus' },
  { path: '/tasks', label: '任务', key: 'task' },
  { path: '/stats', label: '统计', key: 'stats' },
  { path: '/ai', label: 'AI助手', key: 'ai' },
  { path: '/settings', label: '设置', key: 'settings' }
]

// 蒙版图标：颜色跟随 currentColor（激活=主题红，未激活=导航灰）
function glyphStyle(item, variant) {
  const url = navGlyphs[item.key][variant]
  return {
    WebkitMaskImage: `url(${url})`,
    maskImage: `url(${url})`
  }
}
</script>

<style scoped>
/* 手机壳布局：移动优先 480px；≥768px 平板/桌面放宽到 720px */
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: var(--bg);
}

@media (min-width: 768px) {
  .app-shell {
    max-width: 720px;
  }
}

.app-main {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  /* 顶部安全区（刘海/状态栏）+ 呼吸空间；底部留出导航栏高度 */
  padding: calc(var(--space-4) + env(safe-area-inset-top)) var(--space-4)
    calc(80px + env(safe-area-inset-bottom));
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
  line-height: 1;
  transition: background-color var(--motion-normal) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard);
}

/* 蒙版字形：颜色取当前文字色，选中态切换填充/描边两版 */
.glyph {
  width: 22px;
  height: 22px;
  background-color: currentColor;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}

.glyph-filled {
  display: none;
}

.nav-item.active .glyph-filled {
  display: block;
}

.nav-item.active .glyph-outline {
  display: none;
}

.nav-item.active .nav-icon {
  background: var(--primary-container);
  transform: scale(1.08);
}

/* 页面切换微动效 */
.page-enter-active,
.page-leave-active {
  transition: opacity var(--motion-fast) var(--ease-standard);
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2px;
}
</style>
