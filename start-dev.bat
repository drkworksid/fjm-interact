@echo off
title Slido Training App
set PATH=C:\Program Files\nodejs;%PATH%
echo ==============================================
echo Menjalankan Slido Training App (Local Server)
echo ==============================================
echo Buka di browser: http://localhost:3000
echo Sesi Demo:       http://localhost:3000/TRAIN26
echo Panel Trainer:   http://localhost:3000/event/TRAIN26/moderate
echo Layar Presenter: http://localhost:3000/event/TRAIN26/present
echo ==============================================
node server.js
pause
