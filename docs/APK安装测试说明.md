# 番茄AI 安卓版 · 安装与测试说明（Tauri 原生版）

> **路线变更公告**：WebView 封装版因部分设备 WebView 不支持 `appassets.androidplatform.net` 虚拟源
> （表现为"网页无法打开 net::ERR_NAME_NOT_RESOLVED"）已**废弃**。
> 正式路线为 **Tauri 原生版**（Rust 壳 + 系统 WebView 渲染，已在真机验证可正常打开使用）。

## 一、交付物

| 文件 | 说明 |
|---|---|
| `交付/番茄AI-Tauri原生版-arm64-v0.1.0.apk`（14.9MB） | Tauri 原生版，**arm64-v8a**（覆盖 2017 年后绝大多数手机） |
| 包名 `com.tomatoai.app` · versionName 0.1.0 · minSdk 24 · targetSdk 36 | 已签名（debug 证书，测试分发可直接安装） |

## 二、安装方法

1. 把 APK 传到手机（微信/QQ/邮件/网盘/USB/`adb install` 均可）；
2. 允许"安装未知应用"（各品牌按提示开启一次）；
3. 安装完成 → 打开"番茄AI"。

> 自签名安装时系统可能询问确认，属正常现象。

## 三、功能验证清单

1. 专注页正常显示（进度环 + 开始按钮）✅ 已真机验证可打开使用；
2. 番茄闭环：开始 → 暂停 → 继续 → 放弃 → 完成（完成时震动，需开启提醒开关）；
3. 任务页增删改查、置顶、完成；**关闭应用重开数据不丢**（IndexedDB）；
4. 统计页数据同步；
5. AI 助手（默认模拟模式可用；真实调用需配置 API Key）；
6. 设置页：时长修改生效、错误日志导出可用。

## 四、错误日志收集

运行时错误自动记录在本地（上限 200 条）：设置 → 数据管理 → **导出错误日志** → JSON 发给开发者。

## 五、设备适配

- Android 7.0（API 24）及以上；targetSdk 36；
- 仅 arm64-v8a（如需 armeabi-v7a 老机型/x86 模拟器版本，改 `targetList` 后重跑）；
- 竖屏优先，刘海屏安全区已适配。

## 六、已知限制

1. **锁屏/后台计时暂停**：WebView 定时器挂起，回前台自动校准、记录不丢，但提醒延迟；
2. **无系统通知**：完成提醒为震动 + 提示音（系统通知需加 tauri-plugin-notification，后续可做）；
3. AI 真实调用需网络 + 有效 API Key。

## 七、重新构建（改代码后）

双击项目根目录 **`构建安卓APK.bat`**（自动：前端构建 → Rust 交叉编译 → 同步 → Gradle 打包 → 复制到 `交付/`），
或手动执行文档 `docs/Tauri打包指南.md` 中的流程。改版时记得递增
`src-tauri/gen/android/tauri.properties` 中的 versionCode/versionName。
