@echo off
rem Starts the FuelLab server (API + web app) on http://localhost:4010 unless PORT is set
cd /d "%~dp0"
if not defined PORT set PORT=4010
node dist\index.js
