@echo off
chcp 65001 >nul
echo.
echo ════════════════════════════════════════════════════════
echo   🚀 Kita PDF Reader v2.2.1 Build Script
echo ════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

echo 📁 Step 1: Cleaning old builds...
if exist "dist" (
    echo    🗑️  Removing dist folder...
    rmdir /s /q "dist"
    echo    ✅ Old builds removed!
) else (
    echo    ℹ️  No old builds found
)
echo.

echo 🔨 Step 2: Building v2.2.1...
echo    ⏳ This will take 3-5 minutes...
echo.
call npm run build
echo.

echo 📦 Step 3: Verifying build...
if exist "dist\Kita PDF Reader-Setup-2.2.1.exe" (
    echo    ✅ Installer created successfully!
) else (
    echo    ❌ ERROR: Installer not found!
    pause
    exit /b 1
)

if exist "dist\latest.yml" (
    echo    ✅ latest.yml found (auto-update config)
) else (
    echo    ⚠️  WARNING: latest.yml not found!
)
echo.

echo 📂 All files in dist:
dir /b "dist\*.exe" "dist\*.yml"
echo.

echo ════════════════════════════════════════════════════════
echo   ✅ BUILD COMPLETED!
echo ════════════════════════════════════════════════════════
echo.
echo 📋 Next steps:
echo.
echo 1. Run Git commands:
echo    git add .
echo    git commit -m "Release v2.2.1"
echo    git tag v2.2.1
echo    git push origin main
echo    git push origin v2.2.1
echo.
echo 2. Create GitHub Release at:
echo    https://github.com/russianff13-crypto/PDF-Library/releases/new
echo.
echo 3. Upload these files:
echo    - dist\Kita PDF Reader-Setup-2.2.1.exe
echo    - dist\latest.yml
echo.
pause
