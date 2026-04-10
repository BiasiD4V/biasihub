@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   BiasíHub Desktop — Build de produção
echo ============================================================
echo.

set ROOT=%~dp0..
set DESKTOP=%~dp0

:: ── 1. Build Hub ──────────────────────────────────────────────
echo [1/6] Compilando Hub...
cd /d "%ROOT%\Hub\app"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Hub falhou. & exit /b 1 )

:: ── 2. Build Almoxarifado ─────────────────────────────────────
echo [2/6] Compilando Almoxarifado...
cd /d "%ROOT%\Almoxarifado\app"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Almoxarifado falhou. & exit /b 1 )

:: ── 3. Build Comercial ────────────────────────────────────────
echo [3/6] Compilando Comercial...
cd /d "%ROOT%\Comercial\orcamentos"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Comercial falhou. & exit /b 1 )

:: ── 4. Build Obras ────────────────────────────────────────────
echo [4/6] Compilando Obras...
cd /d "%ROOT%\Obras\app"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Obras falhou. & exit /b 1 )

:: ── 5. Copiar dist para Desktop\apps\ ────────────────────────
echo [5/6] Copiando arquivos compilados...
cd /d "%DESKTOP%"

if exist apps rmdir /s /q apps
mkdir apps\hub
mkdir apps\almoxarifado
mkdir apps\comercial
mkdir apps\obras

robocopy "%ROOT%\Hub\app\dist"              "%DESKTOP%apps\hub"           /E /NJH /NJS /NFL /NDL
robocopy "%ROOT%\Almoxarifado\app\dist"     "%DESKTOP%apps\almoxarifado"  /E /NJH /NJS /NFL /NDL
robocopy "%ROOT%\Comercial\orcamentos\dist" "%DESKTOP%apps\comercial"     /E /NJH /NJS /NFL /NDL
robocopy "%ROOT%\Obras\app\dist"            "%DESKTOP%apps\obras"         /E /NJH /NJS /NFL /NDL

echo Cópia concluída.

:: ── 6. Instalar dependências e empacotar Electron ────────────
echo [6/6] Empacotando instalador Windows...
cd /d "%DESKTOP%"
call npm install
if errorlevel 1 ( echo ERRO: npm install falhou. & exit /b 1 )

call npm run package
if errorlevel 1 ( echo ERRO: Empacotamento falhou. & exit /b 1 )

echo.
echo ============================================================
echo   Instalador gerado em: Desktop\dist-installer\
echo ============================================================
echo.
pause
