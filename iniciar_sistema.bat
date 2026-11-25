@echo off
title Iniciar Sistema Playout BMS Canal 11
color 0A

echo =====================================================================
echo           SISTEMA DE PLAYOUT AUTOMATION & BMS - CANAL 11
echo                     UAGRM - GRUPO 12 SC
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando dependencias y entorno...
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo Creando archivo .env para backend desde .env.example...
        copy "backend\.env.example" "backend\.env"
    )
)

echo.
echo [2/3] Levantando Servidor Backend (Laravel API en puerto 8000)...
start "Backend - Laravel API (Puerto 8000)" cmd /k "cd backend\public && php -d upload_max_filesize=512M -d post_max_size=520M -S 127.0.0.1:8000 -t . ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"

timeout /t 2 /nobreak >nul

echo.
echo [3/3] Levantando Servidor Frontend (Vite React en puerto 5173)...
start "Frontend - Vite Playout (Puerto 5173)" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo =====================================================================
echo   Sistema iniciado exitosamente!
echo   - Backend API: http://localhost:8000
echo   - Frontend Playout: http://localhost:5173
echo =====================================================================
echo.
echo Abriendo aplicacion en el navegador predeterminado...
start http://localhost:5173

pause
