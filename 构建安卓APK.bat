@echo off
chcp 65001 >nul
title 番茄AI - 安卓APK构建（Tauri 原生）
cd /d "%~dp0"

echo ============================================
echo   番茄AI 安卓 APK 构建（Tauri 原生 · arm64）
echo ============================================

echo [1/4] 构建前端（dist）...
call npm run build || goto :fail

echo [2/4] Rust 交叉编译（arm64，前端资源在编译期嵌入）...
set "JAVA_HOME=%CD%\.build\jdk\jdk-17.0.20+8"
set "ANDROID_HOME=%CD%\.build\android-sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "NDK_HOME=%ANDROID_HOME%\ndk\25.2.9519653"
set "PATH=%CD%\.build\mingw64\bin;%USERPROFILE%\.cargo\bin;%PATH%"
cargo build --release --target aarch64-linux-android --manifest-path src-tauri\Cargo.toml || goto :fail

echo [3/4] 同步原生库到安卓工程...
if not exist src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a mkdir src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a
copy /Y src-tauri\target\aarch64-linux-android\release\libapp_lib.so src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a\ >nul

echo [4/4] Gradle 打包...
cd src-tauri\gen\android
call gradlew.bat assembleArm64Release --no-daemon --console=plain || goto :fail
cd ..\..\..
if not exist 交付 mkdir 交付
copy /Y src-tauri\gen\android\app\build\outputs\apk\arm64\release\app-arm64-release.apk 交付\番茄AI-Tauri原生版-arm64-v0.1.0.apk >nul

echo.
echo ============================================
echo   构建完成！
echo   交付物: 交付\番茄AI-Tauri原生版-arm64-v0.1.0.apk
echo ============================================
pause
exit /b 0

:fail
echo 构建失败，请检查上方错误信息
pause
exit /b 1
