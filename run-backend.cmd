@echo off
cd /d "C:\Users\Sabiedu\.qwenpaw\workspaces\hack_3\coachai-tether"
set "PATH=C:\Program Files\nodejs;%PATH%;C:\Users\Sabiedu\AppData\Roaming\npm"
set PORT=8000
set QVAC_ENABLED=true
set QVAC_SPAWN=true
echo [run-backend] cwd=%CD% > backend-run.log 2>&1
echo [run-backend] launching node >> backend-run.log 2>&1
"C:\Program Files\nodejs\node.exe" backend\src\server.js >> backend-run.log 2>&1
echo [run-backend] node exited code=%errorlevel% >> backend-run.log 2>&1
