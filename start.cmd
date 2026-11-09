@echo off
setlocal
cd /d "%~dp0"
set "SUICHU_START_NODE="
if defined SUICHU_NODE if exist "%SUICHU_NODE%" set "SUICHU_START_NODE=%SUICHU_NODE%"
if not defined SUICHU_START_NODE if exist "%ProgramFiles%\nodejs\node.exe" set "SUICHU_START_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined SUICHU_START_NODE for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined SUICHU_START_NODE set "SUICHU_START_NODE=%%N"
if not defined SUICHU_START_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "SUICHU_START_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined SUICHU_START_NODE (
  echo Node.js 22 or newer is required. Download: https://nodejs.org/en/download
  pause
  exit /b 1
)
"%SUICHU_START_NODE%" -e "if(Number(process.versions.node.split('.')[0])<22){console.error('Node.js 22 or newer is required.');process.exit(1)}"
if errorlevel 1 (
  pause
  exit /b 1
)
echo Starting Suichu. Keep this window open while using the browser.
"%SUICHU_START_NODE%" "%~dp0launch.cjs"
if errorlevel 1 pause
endlocal
