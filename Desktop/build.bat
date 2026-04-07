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
echo [1/5] Compilando Hub...
cd /d "%ROOT%\Hub\app"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Hub falhou. & exit /b 1 )

:: ── 2. Build Almoxarifado ─────────────────────────────────────
echo [2/5] Compilando Almoxarifado...
cd /d "%ROOT%\Almoxarifado\app"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Almoxarifado falhou. & exit /b 1 )

:: ── 3. Build Comercial ────────────────────────────────────────
echo [3/5] Compilando Comercial...
cd /d "%ROOT%\Comercial\orcamentos"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Comercial falhou. & exit /b 1 )

:: ── 4. Copiar dist para Desktop\apps\ ────────────────────────
echo [4/5] Copiando arquivos compilados...
cd /d "%DESKTOP%"

if exist apps rmdir /s /q apps
mkdir apps\hub
mkdir apps\almoxarifado
mkdir apps\comercial

robocopy "%ROOT%\Hub\app\dist"              "%DESKTOP%apps\hub"           /E /NJH /NJS /NFL /NDL
robocopy "%ROOT%\Almoxarifado\app\dist"     "%DESKTOP%apps\almoxarifado"  /E /NJH /NJS /NFL /NDL
robocopy "%ROOT%\Comercial\orcamentos\dist" "%DESKTOP%apps\comercial"     /E /NJH /NJS /NFL /NDL

echo Cópia concluída.

:: ── 5. Instalar dependências e empacotar Electron ────────────
echo [5/5] Empacotando instalador Windows...
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
