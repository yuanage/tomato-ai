# 番茄AI · Tauri 打包指南（Windows 桌面 / Android APK）

> 本项目已配置好 `src-tauri/`（`tauri.conf.json` + `capabilities/default.json`），
> 并已安装 Tauri CLI（`@tauri-apps/cli`，验证版本 2.11.4）。
> 打包需要 Rust 工具链与 Android SDK，属于一次性环境安装，请预留时间。

---

## 一、原理

Tauri 2 = **Rust 壳 + 系统 WebView**：

- Windows：Rust 壳 + **WebView2**（Win10/11 系统自带）；
- Android：Rust 壳 + **Android System WebView**；
- 前端构建产物（`dist/`）打进安装包，运行时由 WebView 加载本地资源；
- IndexedDB（localForage）数据保存在 WebView 的应用数据目录，**卸载应用才清除**；
- hash 路由（`createWebHashHistory`）在 WebView 中零配置可用——阶段1 的选型在这里兑现。

## 二、安装环境（一次性）

```bash
# 1. Node.js ≥ 20（本项目 v24 满足）

# 2. Rust 工具链：https://rustup.rs 安装后执行
rustup default stable
rustc --version

# 3. Windows 桌面打包：安装 "Microsoft C++ Build Tools"（含 MSVC 链接器）
#    https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/
#    勾选"使用 C++ 的桌面开发"；WebView2 无需安装（系统自带）

# 4. Android 打包：Android Studio + SDK（API 33+）+ NDK + JDK 17
#    安装后设置环境变量（Windows：系统环境变量）
#    ANDROID_HOME = C:\Users\<你>\AppData\Local\Android\Sdk
#    NDK 在 Android Studio 的 SDK Manager 里勾选安装

# 5. Tauri CLI（已加入 package.json，如未安装执行）
npm install -D @tauri-apps/cli@^2
```

## 三、桌面开发与打包（Windows）

```bash
npx tauri dev                     # 桌面调试窗口（前端热更新）
npx tauri build                   # 打包，产物在：
# src-tauri/target/release/bundle/nsis/番茄AI_0.1.0_x64-setup.exe   （NSIS 安装包）
# src-tauri/target/release/bundle/msi/番茄AI_0.1.0_x64.msi          （MSI 安装包）
```

- 默认同时产出 NSIS 与 MSI；只出其一可加参数：`npx tauri build --bundles nsis`；
- 首次构建需下载 Rust 依赖并编译，**5~20 分钟属正常**；
- 安装包双击即可安装，安装后可从开始菜单启动。

## 四、Android 打包

```bash
npx tauri android init             # 生成安卓工程（gen/android/）与签名
npx tauri android build --apk      # 产物：
# src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
```

- 首次构建需下载安卓依赖并交叉编译 Rust，**20~60 分钟属正常**；
- 默认 debug 签名；正式发布需在 Android Studio 生成 keystore 并配置；
- 真机调试：手机开 USB 调试后 `npx tauri android dev`（前端热更新）。

## 五、配置说明（src-tauri/tauri.conf.json）

| 配置 | 当前值 | 说明 |
| --- | --- | --- |
| `identifier` | `com.tomatoai.app` | 应用唯一标识（安卓包名），**发布后不可改** |
| `productName` | 番茄AI | 安装包/应用名；如打包遇中文问题可改英文（如 TomatoAI） |
| `beforeBuildCommand` | `npm run build` | 打包前先构建前端 |
| `frontendDist` | `../dist` | 前端产物目录 |
| `app.windows` | 480×900 | 桌面窗口尺寸（安卓端窗口由原生管理） |
| `security.csp` | null | 无远程资源限制；若后续引入远程字体/图片需配置 |

## 六、已知局限（务必阅读）

1. **安卓锁屏/后台计时暂停（最重要）**：WebView 在应用进入后台或锁屏后会**挂起 JS 定时器**。
   本项目的计时器基于 `endTime - now` 时间戳，回到前台后时间**自动校准、不会漂移**，
   记录正确落库；但"归零完成 → 通知/震动"会延迟到回到前台才触发。
   也就是说：锁屏 30 分钟，回到前台会看到已完成，但期间没有提醒。
2. **浏览器通知在 WebView 不可用**：网页 Notification API 在安卓 WebView 中无效
   （本应用已做兼容判断，会静默跳过，不影响流程）；需要系统通知需加
   `tauri-plugin-notification`（原生侧）。
3. **首次构建慢**：Rust 交叉编译 + 依赖下载，属正常现象。
4. **Windows 桌面无此问题**：桌面 WebView 后台节流远轻于安卓，计时基本准确。

## 七、后续优化方向（按优先级）

1. **原生后台计时（根治安卓锁屏问题）**：Kotlin `AlarmManager + Service` 真实倒计时，
   到点经 Tauri 事件通道（`@tauri-apps/api` 的 `listen`/`emit`）通知 WebView，
   配合 `tauri-plugin-notification` 发系统通知；
2. **专注时保持屏幕常亮**：`tauri-plugin-window` 的 `setKeepScreenOn`；
3. **本地音频提醒**：提示音文件打包进 `assets/`，HTML5 Audio 播放（当前 WebAudio 合成音零资源）；
4. **数据导出备份**：`tauri-plugin-fs` + `tauri-plugin-dialog` 把 IndexedDB 数据导出为文件；
5. **正式签名发布**：`tauri signer` 生成签名密钥，配置 keystore 出 release 包。

## 八、常见问题

| 现象 | 处理 |
| --- | --- |
| `tauri android init` 报 SDK 找不到 | 检查 `ANDROID_HOME`；SDK Manager 安装 platform-tools |
| 构建报 NDK 版本错误 | `tauri.conf.json` 的 `bundle.android` 段指定 `ndkVersion` |
| Windows 构建报链接器错误 | 安装 "Microsoft C++ Build Tools"（MSVC） |
| APK 安装后白屏 | 确认 `dist/` 构建产物存在；先真机浏览器访问 `http://localhost:5173` 排除前端问题 |
| 安装包名乱码/安装失败 | `productName` 改英文（如 TomatoAI）后重新 `npx tauri build` |
| 低版本安卓（7.0 以下）异常 | 系统 WebView 过老，本项目不保证兼容 |
| API Key 安全 | Key 存 localStorage 属明文（仅本机），介意可后续走原生安全存储 |
