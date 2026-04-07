@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║                  BIASIHUB INSTALLER                    ║
echo ║           Sistema ERP - Biasi Engenharia               ║
echo ╚════════════════════════════════════════════════════════╝
echo.

:: Detecta se o instalador .exe existe
set INSTALLER_PATH=%~dp0Desktop\dist-installer\BiasíHub Setup 1.0.0.exe

if not exist "!INSTALLER_PATH!" (
    echo [ERRO] Instalador não encontrado em:
    echo !INSTALLER_PATH!
    echo.
    echo Execute build.bat primeiro para gerar o instalador.
    pause
    exit /b 1
)

echo [✓] Instalador encontrado
echo.
echo [*] Iniciando instalação...
echo [*] Escolha a pasta de instalação na próxima tela
echo.
timeout /t 2 >nul

:: Executa o instalador
start "" "!INSTALLER_PATH!"

echo [✓] Instalador iniciado
echo.
echo ════════════════════════════════════════════════════════
echo Após concluir a instalação:
echo   1. Procure "BiasíHub" na Área de Trabalho ou Menu Iniciar
echo   2. Clique para abrir
echo   3. Faça login com suas credenciais
echo.
echo Precisa de ajuda? Veja INSTALL.md
echo ════════════════════════════════════════════════════════
echo.
pause
