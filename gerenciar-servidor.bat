@echo off
REM Script para gerenciar o servidor Node.js na porta 3000

echo ========================================
echo   SLICED - Gerenciador de Servidor
echo ========================================
echo.

:menu
echo Escolha uma opcao:
echo.
echo [1] Iniciar servidor
echo [2] Parar servidor (matar processo na porta 3001)
echo [3] Reiniciar servidor
echo [4] Ver status da porta 3001
echo [5] Sair
echo.
set /p opcao="Digite o numero da opcao: "

if "%opcao%"=="1" goto iniciar
if "%opcao%"=="2" goto parar
if "%opcao%"=="3" goto reiniciar
if "%opcao%"=="4" goto status
if "%opcao%"=="5" goto sair
echo Opcao invalida!
goto menu

:iniciar
echo.
echo Iniciando servidor...
start "SLICED Server" cmd /k "node server2.js"
echo.
echo Servidor iniciado em uma nova janela!
echo.
pause
goto menu

:parar
echo.
echo Procurando processos na porta 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Matando processo PID: %%a
    taskkill /PID %%a /F
)
echo.
echo Servidor parado!
echo.
pause
goto menu

:reiniciar
echo.
echo Reiniciando servidor...
echo.
echo Passo 1: Parando servidor atual...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo.
echo Passo 2: Iniciando servidor...
start "SLICED Server" cmd /k "node server2.js"
echo.
echo Servidor reiniciado!
echo.
pause
goto menu

:status
echo.
echo Status da porta 3001:
echo.
netstat -ano | findstr :3001
if errorlevel 1 (
    echo Porta 3001 esta LIVRE
) else (
    echo Porta 3001 esta EM USO
)
echo.
pause
goto menu

:sair
echo.
echo Encerrando...
exit
