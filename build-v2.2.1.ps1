# 🚀 Build Script for Kita PDF Reader v2.2.1
# This script will clean old builds and create a fresh v2.2.1 installer

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  🚀 Kita PDF Reader v2.2.1 Build Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Remove old dist folder
Write-Host "📁 Step 1: Cleaning old builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Write-Host "   ⏳ Removing dist folder..." -ForegroundColor Gray
    Remove-Item -Recurse -Force "dist"
    Write-Host "   ✅ Old builds removed successfully!" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No dist folder found (already clean)" -ForegroundColor Gray
}
Write-Host ""

# Step 2: Verify package.json version
Write-Host "📝 Step 2: Verifying version..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$version = $packageJson.version
if ($version -eq "2.2.1") {
    Write-Host "   ✅ Version confirmed: v$version" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Warning: package.json version is v$version (expected 2.2.1)" -ForegroundColor Red
}
Write-Host ""

# Step 3: Build the installer
Write-Host "🔨 Step 3: Building v2.2.1 installer..." -ForegroundColor Yellow
Write-Host "   ⏳ This may take 3-5 minutes..." -ForegroundColor Gray
Write-Host ""

npm run build

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ✅ Build Process Completed!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 4: Verify build outputs
Write-Host "📦 Step 4: Verifying build outputs..." -ForegroundColor Yellow
if (Test-Path "dist") {
    $exeFile = Get-ChildItem "dist\Kita PDF Reader-Setup-*.exe" -ErrorAction SilentlyContinue
    $ymlFile = Get-ChildItem "dist\latest.yml" -ErrorAction SilentlyContinue
    
    if ($exeFile) {
        $size = [math]::Round($exeFile.Length / 1MB, 2)
        Write-Host "   ✅ $($exeFile.Name) ($size MB)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Installer (.exe) not found!" -ForegroundColor Red
    }
    
    if ($ymlFile) {
        Write-Host "   ✅ latest.yml (CRITICAL for auto-update)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ latest.yml not found!" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "📂 All files in dist:" -ForegroundColor Cyan
    Get-ChildItem "dist" -File | ForEach-Object {
        $fileSize = [math]::Round($_.Length / 1MB, 2)
        Write-Host "   - $($_.Name) ($fileSize MB)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ Build failed! dist folder not created." -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  📋 Next Steps:" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Commit changes to Git:" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'Release v2.2.1'" -ForegroundColor Gray
Write-Host "   git tag v2.2.1" -ForegroundColor Gray
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host "   git push origin v2.2.1" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Create GitHub Release:" -ForegroundColor White
Write-Host "   https://github.com/russianff13-crypto/PDF-Library/releases/new" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Upload these files:" -ForegroundColor White
Write-Host "   - Kita PDF Reader-Setup-2.2.1.exe" -ForegroundColor Gray
Write-Host "   - latest.yml (CRITICAL!)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
Write-Host ""
