@echo off
title FJM InterAct - PT Fiqry Jaya Manunggal
set PATH=C:\Program Files\nodejs;%PATH%
echo =======================================================
echo Menjalankan FJM InterAct (PT Fiqry Jaya Manunggal)
echo Real-time Audience Interaction Platform
echo =======================================================
echo Buka di browser: http://localhost:3000
echo Sesi Demo:       http://localhost:3000/TRAIN26
echo Panel Trainer:   http://localhost:3000/event/TRAIN26/moderate
echo Layar Presenter: http://localhost:3000/event/TRAIN26/present
echo Dashboard FJM:   http://localhost:3000/dashboard
echo =======================================================
node server.js
pause
