@echo off
cd /d "C:\Users\Sabiedu\.qwenpaw\workspaces\hack_3\coachai-tether\frontend"
set "PATH=C:\Program Files\nodejs;%PATH%;C:\Users\Sabiedu\AppData\Roaming\npm"
echo [run-frontend5180] starting vite on :5180 > ..\frontend5180.log 2>&1
"C:\Program Files\nodejs\node.exe" ..\node_modules\vite\bin\vite.js --host 0.0.0.0 --port 5180 --strictPort >> ..\frontend5180.log 2>&1
echo [run-frontend5180] vite exited code=%errorlevel% >> ..\frontend5180.log 2>&1
