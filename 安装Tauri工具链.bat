@echo off
chcp 65001 >nul
title 番茄AI - Tauri 工具链一键安装
cd /d "%~dp0"

echo ============================================
echo   番茄AI Tauri 工具链一键安装
echo   1) Rust (rustup)  2) Android NDK  3) 环境变量
echo   预计下载 2~4 GB，耗时 15~40 分钟，请保持网络通畅
echo ============================================

rem ---------- 1. 安装 Rust ----------
echo [1/4] 安装 Rust 工具链...
if exist "%USERPROFILE%\.cargo\bin\rustc.exe" (
    echo   已安装，跳过
) else (
    curl -sL -o .build\rustup-init.exe https://win.rustup.rs/x86_64
    .build\rustup-init.exe -y --default-toolchain stable
)
"%USERPROFILE%\.cargo\bin\rustc.exe" --version >nul 2>&1 || (echo Rust 安装失败，请检查网络 & pause & exit /b 1)
echo   Rust 就绪

rem ---------- 2. 添加安卓交叉编译目标 ----------
echo [2/4] 添加安卓编译目标...
call "%USERPROFILE%\.cargo\bin\rustup" target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android

rem ---------- 3. 安装 NDK ----------
echo [3/4] 安装 Android NDK (r25b)...
set "SDK_ROOT=%CD%\.build\android-sdk"
call "%SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root="%SDK_ROOT%" "ndk;25.2.9519653"
if errorlevel 1 (echo NDK 安装失败 & pause & exit /b 1)
echo   NDK 就绪

rem ---------- 4. 设置环境变量 ----------
echo [4/4] 写入环境变量（当前用户级）...
setx ANDROID_HOME "%SDK_ROOT%"
setx ANDROID_SDK_ROOT "%SDK_ROOT%"
setx NDK_HOME "%SDK_ROOT%\ndk\25.2.9519653"
setx JAVA_HOME "%CD%\.build\jdk\jdk-17.0.20+8"

echo.
echo ============================================
echo   安装完成！请【关闭并重新打开终端】后执行：
echo   npx tauri android init
echo   npx tauri android build --apk
echo   详细说明见 docs\Tauri打包指南.md
echo ============================================
pause
