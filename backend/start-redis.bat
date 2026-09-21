@echo off
title Redis Server (CodeArena)
echo Starting Redis Server for CodeArena...
cd /d "%~dp0redis-server"
redis-server.exe redis.windows.conf
pause
