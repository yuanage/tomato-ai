import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  // 相对路径构建产物：dist 挂载到任意子目录/静态服务器都不会 404（hash 路由兼容）
  base: './',
  plugins: [
    vue(),
    // NaiveUI 按需自动导入：模板里直接写 <n-button> 等组件，
    // 并自动导入 vue / vue-router 常用 API（ref、computed、useRoute…）
    AutoImport({
      imports: ['vue', 'vue-router'],
      resolvers: [NaiveUiResolver()],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      resolvers: [NaiveUiResolver()],
      dts: 'src/components.d.ts'
    })
  ],
  server: {
    host: true, // 允许局域网访问，方便手机真机预览
    port: 5173,
    strictPort: true // 端口被占用时直接报错退出，避免静默换端口导致"找不到页面"
  }
})
