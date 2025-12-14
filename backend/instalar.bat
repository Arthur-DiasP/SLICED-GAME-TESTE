@echo off
echo ========================================
echo  INSTALACAO SLICED PRIVADO - BACKEND
echo ========================================
echo.

echo [1/3] Instalando dependencias...
call npm install

echo.
echo [2/3] Verificando arquivo .env...
if not exist .env (
    echo AVISO: Arquivo .env nao encontrado!
    echo Copiando .env.example para .env...
    copy .env.example .env
    echo.
    echo IMPORTANTE: Edite o arquivo .env com suas credenciais antes de iniciar o servidor!
    echo.
) else (
    echo Arquivo .env encontrado!
)

echo.
echo [3/3] Instalacao concluida!
echo.
echo ========================================
echo  PROXIMOS PASSOS:
echo ========================================
echo 1. Configure o arquivo .env com suas credenciais
echo 2. Execute: npm start
echo.
echo Para mais informacoes, leia: CORRECAO_QR_CODE.md
echo ========================================
echo.
pause
