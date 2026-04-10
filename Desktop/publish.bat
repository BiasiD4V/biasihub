@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   BiasíHub Desktop — Build + Publicar no GitHub Releases
echo ============================================================
echo.

:: Carrega token do GitHub (arquivo local, não vai pro git)
if exist "%~dp0publish-token.bat" (
    call "%~dp0publish-token.bat"
) else (
    echo ERRO: publish-token.bat nao encontrado.
    echo Crie o arquivo Desktop\publish-token.bat com:  set GH_TOKEN=seu_token
    pause & exit /b 1
)

set ROOT=%~dp0..
set DESKTOP=%~dp0

:: ── 1. Build Hub ──────────────────────────────────────────────
echo [1/7] Compilando Hub...
cd /d "%ROOT%\Hub\app"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Hub falhou. & pause & exit /b 1 )

:: ── 2. Build Almoxarifado ─────────────────────────────────────
echo [2/7] Compilando Almoxarifado...
cd /d "%ROOT%\Almoxarifado\app"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Almoxarifado falhou. & pause & exit /b 1 )

:: ── 3. Build Comercial ────────────────────────────────────────
echo [3/7] Compilando Comercial...
cd /d "%ROOT%\Comercial\orcamentos"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Comercial falhou. & pause & exit /b 1 )

:: ── 4. Build Obras ────────────────────────────────────────────
echo [4/7] Compilando Obras...
cd /d "%ROOT%\Obras\app"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Obras falhou. & pause & exit /b 1 )

:: ── 5. Copiar dist para Desktop\apps\ ────────────────────────
echo [5/7] Copiando arquivos compilados...
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

:: ── 6. Instalar dependências ──────────────────────────────────
echo [6/7] Instalando dependências...
cd /d "%DESKTOP%"
call npm install
if errorlevel 1 ( echo ERRO: npm install falhou. & pause & exit /b 1 )

:: ── 7. Build + Publicar no GitHub ────────────────────────────
echo [7/7] Gerando instalador e publicando no GitHub Releases...
cd /d "%DESKTOP%"
call npm run publish
if errorlevel 1 ( echo ERRO: Publicação falhou. Verifique o GH_TOKEN e o repositório. & pause & exit /b 1 )

echo.
echo ============================================================
echo   Publicado com sucesso no GitHub Releases!
echo   https://github.com/BiasiD4V/biasihub/releases
echo ============================================================
echo.
echo Usuarios podem baixar o instalador na URL acima.
echo O app vai atualizar automaticamente quando uma nova versao for publicada.
echo.
pause
