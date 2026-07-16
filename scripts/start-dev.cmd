@echo off
setlocal
cd /d "%~dp0.."
call pnpm dev:local %*
set "exitCode=%errorlevel%"
if not "%exitCode%"=="0" pause
exit /b %exitCode%