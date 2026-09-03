@echo off
rem ---------------------------------------------------------------------------
rem  Bloom - trackers page installer
rem
rem  Double-click this file from inside the unzipped folder. It asks for your
rem  project root, backs up the files this page shares with the cycle page,
rem  then copies the page in. Nothing else in your project is touched.
rem
rem  It does not run the SQL and does not restart your dev server - those two
rem  are yours to do, and it tells you how at the end.
rem ---------------------------------------------------------------------------
setlocal

title Bloom - install the trackers page

set "SRC=%~dp0src"
set "DEF=C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"

echo.
echo   Bloom - trackers page
echo   ========================================
echo.
echo   This copies the trackers page into your project.
echo   The files it shares with the cycle page are backed up first,
echo   so you can put them straight back if anything looks different.
echo.
echo   Your files:  %SRC%
echo.

set "ROOT="
set /p "ROOT=Your project root ^(press Enter for the one below^): "
if not defined ROOT set "ROOT=%DEF%"

echo.
if not exist "%ROOT%\package.json" (
  echo   [!]  There is no package.json in:
  echo        %ROOT%
  echo.
  echo        That is not your project root, so nothing has been copied.
  echo        Run this again and type the folder that holds package.json.
  echo.
  pause
  exit /b 1
)
echo   Project root found: %ROOT%
echo.

rem --------------------------------------------------------------------------
rem  A timestamped backup folder, so two runs never overwrite each other
rem --------------------------------------------------------------------------
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
if not defined STAMP set "STAMP=backup"
set "BAK=%ROOT%\src\_backup-trackers-%STAMP%"
mkdir "%BAK%" 2>nul

echo   Backing up the files this page replaces...
for %%f in (
  "src\lib\supabase.ts"
  "src\lib\utils.ts"
  "src\hooks\usePeriodLog.ts"
  "src\components\BloomHeader.tsx"
  "src\lib\cycle\predict.ts"
  "src\lib\cycle\themes.ts"
  "src\lib\cycle\dayLogs.ts"
  "src\lib\cycle\periodStore.ts"
  "src\lib\cycle\cycleCloud.ts"
) do (
  if exist "%ROOT%\%%~f" (
    copy /Y "%ROOT%\%%~f" "%BAK%\" >nul
    echo        saved %%~nxf
  )
)
echo.

rem --------------------------------------------------------------------------
rem  The copy itself. /E every subfolder, /Y overwrite, /I destination is a dir
rem --------------------------------------------------------------------------
echo   Copying the page in...
xcopy /E /Y /I /Q "%SRC%" "%ROOT%\src"
if errorlevel 1 (
  echo.
  echo   [!]  The copy did not finish. Check the paths above and try again.
  echo.
  pause
  exit /b 1
)

echo.
echo   ----------------------------------------
echo   Done. The page is in.
echo.
echo   Two things left, by hand:
echo.
echo     1. Supabase ^> SQL Editor ^> run this file:
echo           %~dp0supabase\COMPLETE-SETUP.sql
echo        It creates the table this page syncs to. The page works
echo        without it, from the device only.
echo.
echo     2. Restart your dev server, then open:
echo           /trackers          Atlas, the default
echo           /trackers-styles   all four designs, pick one
echo.
echo   Anything overwritten is in:
echo           %BAK%
echo   ----------------------------------------
echo.
pause
