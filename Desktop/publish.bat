@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   BiasíHub Desktop — Build + Publicar no GitHub Releases
echo ============================================================
echo.

:: Verifica se GH_TOKEN está definido
if "%GH_TOKEN%"=="" (
    echo ERRO: A variável de ambiente GH_TOKEN não está definida.
    echo.
    echo Para configurar:
    echo   1. Acesse https://github.com/settings/tokens
    echo   2. Gere um token com permissão "repo"
    echo   3. Execute:  set GH_TOKEN=ghp_seu_token_aqui
    echo   4. Execute este script novamente.
    echo.
    pause
    exit /b 1
)

set ROOT=%~dp0..
set DESKTOP=%~dp0

:: ── 1. Build Hub ──────────────────────────────────────────────
echo [1/6] Compilando Hub...
cd /d "%ROOT%\Hub\app"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Hub falhou. & pause & exit /b 1 )

:: ── 2. Build Almoxarifado ─────────────────────────────────────
echo [2/6] Compilando Almoxarifado...
cd /d "%ROOT%\Almoxarifado\app"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Almoxarifado falhou. & pause & exit /b 1 )

:: ── 3. Build Comercial ────────────────────────────────────────
echo [3/6] Compilando Comercial...
cd /d "%ROOT%\Comercial\orcamentos"
call npm run build
if errorlevel 1 ( echo ERRO: Build do Comercial falhou. & pause & exit /b 1 )

:: ── 4. Copiar dist para Desktop\apps\ ────────────────────────
echo [4/6] Copiando arquivos compilados...
cd /d "%DESKTOP%"

if exist apps rmdir /s /q apps
mkdir apps\hub
mkdir apps\almoxarifado
mkdir apps\comercial

robocopy "%ROOT%\Hub\app\dist"              "%DESKTOP%apps\hub"           /E /NJH /NJS /NFL /NDL
robocopy "%ROOT%\Almoxarifado\app\dist"     "%DESKTOP%apps\almoxarifado"  /E /NJH /NJS /NFL /NDL
robocopy "%ROOT%\Comercial\orcamentos\dist" "%DESKTOP%apps\comercial"     /E /NJH /NJS /NFL /NDL

echo Cópia concluída.

:: ── 5. Instalar dependências ──────────────────────────────────
echo [5/6] Instalando dependências...
cd /d "%DESKTOP%"
call npm install
if errorlevel 1 ( echo ERRO: npm install falhou. & pause & exit /b 1 )

:: ── 6. Build + Publicar no GitHub ────────────────────────────
echo [6/6] Gerando instalador e publicando no GitHub Releases...
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
