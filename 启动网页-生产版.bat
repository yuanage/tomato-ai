@echo off
chcp 65001 >nul
title 番茄AI - 生产版启动器
cd /d "%~dp0"

echo ============================================
echo   番茄AI 生产版启动器
echo   构建产物 -> 预览服务器(4173) -> 打开浏览器
echo   关掉本窗口 = 停止服务器
echo ============================================

rem 先构建最新产物
npm run build
if errorlevel 1 (
    echo [番茄AI] 构建失败，请检查代码后重试
    pause
    exit /b 1
)

rem 后台启动生产预览服务器
start /b cmd /c "npm run preview > preview-server.log 2>&1"

rem 轮询等待服务器就绪（最多 30 秒）
for /l %%i in (1,1,30) do (
    curl -s -o nul --max-time 2 http://localhost:4173/ && goto :open
    timeout /t 1 /nobreak >nul
)

echo [番茄AI] 启动超时，请检查 preview-server.log 或手动打开 http://localhost:4173
pause
exit /b

:open
echo [番茄AI] 服务器已就绪，正在打开浏览器...
start "" "http://localhost:4173"
pause
