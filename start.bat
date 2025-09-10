@echo off
echo ========================================
echo   YouTube Dashboard - Iniciando Aplicacao
echo ========================================
echo.

REM Verificar se Node.js esta instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao esta instalado ou nao esta no PATH.
    echo Por favor, instale o Node.js em https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar se npm esta instalado
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: npm nao esta instalado.
    echo Por favor, instale o Node.js que inclui npm.
    pause
    exit /b 1
)

REM Verificar se as dependencias estao instaladas
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
    if errorlevel 1 (
        echo ERRO: Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

REM Verificar se o arquivo .env existe
if not exist ".env" (
    echo AVISO: Arquivo .env nao encontrado.
    echo Copie o arquivo .env.example para .env e configure suas chaves da API.
    echo.
)

echo Iniciando a aplicacao...
echo A aplicacao sera executada em: http://localhost:3000
echo Pressione Ctrl+C para parar a aplicacao
echo.

REM Iniciar a aplicacao
npm start

pause
