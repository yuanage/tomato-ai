@echo off
chcp 65001 >nul
title 番茄AI - 一键启动
cd /d "%~dp0"

echo ============================================
echo   番茄AI 一键启动器
echo   正在启动开发服务器，请稍候...
echo   （关掉本窗口 = 停止服务器）
echo ============================================

rem 后台启动开发服务器，日志写入 dev-server.log
start /b cmd /c "npm run dev > dev-server.log 2>&1"

rem 轮询等待服务器就绪（最多 30 秒）
for /l %%i in (1,1,30) do (
    curl -s -o nul --max-time 2 http://localhost:5173/ && goto :open
    timeout /t 1 /nobreak >nul
)

echo [番茄AI] 启动超时，请检查 dev-server.log 文件，或手动打开 http://localhost:5173
pause
exit /b

:open
echo [番茄AI] 服务器已就绪，正在打开浏览器...
start "" "http://localhost:5173"
pause
