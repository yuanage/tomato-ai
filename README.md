# 番茄AI · 极简时间管理

零广告 · 零社区 · 零登录 —— 本地优先的番茄钟 + 任务清单 + AI 时间管理助手。

## 技术栈

| 模块 | 选型 | 说明 |
| --- | --- | --- |
| 前端框架 | Vue 3（组合式 API / setup 语法糖） | — |
| UI 库 | NaiveUI | 按需自动导入，控制包体积 |
| 本地存储 | localForage（IndexedDB） | 任务、番茄记录全部本地，默认不上云 |
| 构建工具 | Vite 6 | 开发 / 打包 |
| AI 能力 | 原生 fetch + 第三方大模型 API | 不引入 Agent 框架，Prompt 强制输出 JSON |
| 打包 | Tauri（阶段8接入） | 网页 → 安卓 APK |

## 开发命令

```bash
npm install      # 安装依赖
npm run dev      # 本地开发：http://localhost:5173
npm run test     # 单元测试（22 项，零依赖，覆盖日期/JSON容错/排序/Mock结构）
npm run build    # 生产构建，产物在 dist/
npm run preview  # 本地预览构建产物
```

## 如何打开网页（重要）

这是一个 Vite 工程，**不能双击 HTML 文件打开**，必须通过服务器访问。三种方式任选：

```bash
# 方式一：开发模式（日常开发，推荐，改代码即时生效）
npm run dev          # 浏览器打开 http://localhost:5173

# 方式二：生产预览（验证打包产物）
npm run build        # 先构建
npm run preview      # 浏览器打开 http://localhost:4173

# 方式三：任意静态服务器托管 dist/ 目录（如 nginx、VS Code Live Server）
# dist/ 已按相对路径构建，挂载到任意子目录都不会 404
```

注意：所有命令必须在项目根目录 `D:\program\zcode\tomato-ai` 下执行；
不要尝试直接双击 `index.html` 或 `dist/index.html`（浏览器出于安全会拦截本地 ES 模块加载）。

## 验收

端到端验收请对照 [docs/验收清单.md](docs/验收清单.md) 逐项操作。

## 目录结构

```
tomato-ai/
├── index.html              # 入口 HTML（含移动端 viewport 适配）
├── vite.config.js          # Vite + NaiveUI 按需自动导入配置
├── public/                 # 静态资源（favicon）
└── src/
    ├── main.js             # 应用入口
    ├── App.vue             # 应用外壳：路由出口 + 底部导航
    ├── router/             # 路由（hash 模式，兼容安卓 WebView）
    ├── views/              # 5 个一级页面：专注 / 任务 / 统计 / AI助手 / 设置
    ├── components/         # 通用组件（后续阶段）
    ├── composables/        # 组合式函数（后续阶段：计时器、任务、记录）
    ├── utils/              # storage.js：localForage 封装（阶段3 实现）
    ├── api/                # ai.js：AI 请求封装 + prompt 模板（阶段5 实现）
    └── styles/             # 全局基础样式
```

## 开发阶段

1. 初始化工程（已完成）
2. 番茄计时器（已完成）
3. 任务清单 + 本地持久化（已完成）
4. 极简统计（已完成）
5. AI 请求封装 + 四大 Agent Prompt 模板（已完成）
6. AI 助手页面（已完成）
7. 设置页面（已完成）
8. Tauri 打包安卓 APK（配置模板就绪，见 `docs/打包安卓APK指南.md`）

## 打包（Windows / Android）

配置模板已写入 `src-tauri/`（Tauri CLI 已安装），打包流程与已知缺陷见
[Tauri打包指南](docs/Tauri打包指南.md)；日常使用与 AI 配置见
[使用说明](docs/使用说明.md)。

## 迭代路线A（个人自用版）

1. 闭环番茄专注模块（休息切换 / 任务绑定计数 / 通知音效）——已完成
2. 任务清单完整 CRUD + AI 批量导入（去重）——已完成
3. 统计页真实数据 + 备份导出/导入——已完成
4. AI 助手真实 API（国内预设 / 复制复盘 / 状态检测读放弃记录）——已完成
5. 设置页完善与全局优化——已完成
6. Tauri 打包配置与使用文档——已完成（指南见 `docs/Tauri打包指南.md`，自用说明见 `docs/使用说明.md`）
6. Tauri 打包与使用文档
