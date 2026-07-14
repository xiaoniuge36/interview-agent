@echo off
setlocal
cd /d "%~dp0.."
pnpm dev:local %*
if errorlevel 1 pause