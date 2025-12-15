# 🚀 Complete Release Pipeline for Kita PDF Reader v2.2.1
# This script does everything: Clean → Build → Git → Instructions

param(
    [switch]$SkipBuild,
    [switch]$SkipGit
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "██████████████████████████████████████████████████" -ForegroundColor Cyan
Write-Host "█                                                █" -ForegroundColor Cyan
Write-Host "█   🚀 Kita PDF Reader v2.2.1 Release Pipeline  █" -ForegroundColor Cyan
Write-Host "█                                                █" -ForegroundColor Cyan
Write-Host "██████████████████████████████████████████████████" -ForegroundColor Cyan
Write-Host ""

# ============================================
# STEP 1: CLEAN OLD BUILDS
# ============================================
if (-not $SkipBuild) {
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  📁 STEP 1: Cleaning Old Builds           ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    
    if (Test-Path "dist") {
        Write-Host "   🗑️  Removing old dist folder..." -ForegroundColor Gray
        Remove-Item -Recurse -Force "dist"
        Write-Host "   ✅ Old builds removed!" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  No old builds found" -ForegroundColor Gray
    }
    Write-Host ""
}

# ============================================
# STEP 2: VERIFY VERSION
# ============================================
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  📝 STEP 2: Verifying Version              ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$version = $packageJson.version

if ($version -eq "2.2.1") {
    Write-Host "   ✅ Version: v$version" -ForegroundColor Green
} else {
    Write-Host "   ❌ ERROR: Version is v$version (expected 2.2.1)" -ForegroundColor Red
    Write-Host "   Please update package.json first!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================
# STEP 3: BUILD INSTALLER
# ============================================
if (-not $SkipBuild) {
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  🔨 STEP 3: Building Installer             ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   ⏳ Building... (this takes 3-5 minutes)" -ForegroundColor Cyan
    Write-Host ""
    
    npm run build
    
    Write-Host ""
    Write-Host "   ✅ Build completed!" -ForegroundColor Green
    Write-Host ""
}

# ============================================
# STEP 4: VERIFY BUILD OUTPUTS
# ============================================
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  📦 STEP 4: Verifying Build Outputs        ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "dist")) {
    Write-Host "   ❌ ERROR: dist folder not found!" -ForegroundColor Red
    Write-Host "   Build may have failed!" -ForegroundColor Red
    exit 1
}

$exeFile = Get-ChildItem "dist\Kita PDF Reader-Setup-2.2.1.exe" -ErrorAction SilentlyContinue
$ymlFile = Get-ChildItem "dist\latest.yml" -ErrorAction SilentlyContinue

if ($exeFile) {
    $size = [math]::Round($exeFile.Length / 1MB, 2)
    Write-Host "   ✅ Kita PDF Reader-Setup-2.2.1.exe ($size MB)" -ForegroundColor Green
} else {
    Write-Host "   ❌ ERROR: Installer not found!" -ForegroundColor Red
    exit 1
}

if ($ymlFile) {
    Write-Host "   ✅ latest.yml (auto-update config)" -ForegroundColor Green
} else {
    Write-Host "   ❌ WARNING: latest.yml not found!" -ForegroundColor Red
    Write-Host "   Auto-update will NOT work!" -ForegroundColor Red
}

Write-Host ""
Write-Host "   📂 All files in dist:" -ForegroundColor Cyan
Get-ChildItem "dist" -File | ForEach-Object {
    $fileSize = [math]::Round($_.Length / 1MB, 2)
    Write-Host "      - $($_.Name) ($fileSize MB)" -ForegroundColor Gray
}
Write-Host ""

# ============================================
# STEP 5: GIT OPERATIONS
# ============================================
if (-not $SkipGit) {
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  📤 STEP 5: Git Commit & Push              ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "   📊 Current status:" -ForegroundColor Cyan
    git status --short
    Write-Host ""
    
    Write-Host "   ➕ Adding changes..." -ForegroundColor Gray
    git add .
    
    Write-Host "   💾 Committing..." -ForegroundColor Gray
    git commit -m "Release v2.2.1 - Auto-Update, Enhanced UI, Bug Fixes"
    
    Write-Host "   🏷️  Creating tag..." -ForegroundColor Gray
    git tag v2.2.1 -f
    
    Write-Host "   📤 Pushing to GitHub..." -ForegroundColor Gray
    git push origin main
    git push origin v2.2.1 -f
    
    Write-Host ""
    Write-Host "   ✅ Git operations completed!" -ForegroundColor Green
    Write-Host ""
}

# ============================================
# FINAL: INSTRUCTIONS
# ============================================
Write-Host "██████████████████████████████████████████████████" -ForegroundColor Green
Write-Host "█                                                █" -ForegroundColor Green
Write-Host "█   ✅ BUILD SUCCESSFUL!                         █" -ForegroundColor Green
Write-Host "█                                                █" -ForegroundColor Green
Write-Host "██████████████████████████████████████████████████" -ForegroundColor Green
Write-Host ""

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  📋 NEXT STEP: Create GitHub Release       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣  Open this URL:" -ForegroundColor White
Write-Host "   https://github.com/russianff13-crypto/PDF-Library/releases/new" -ForegroundColor Cyan
Write-Host ""

Write-Host "2️⃣  Fill in the form:" -ForegroundColor White
Write-Host "   📌 Tag: v2.2.1" -ForegroundColor Gray
Write-Host "   📝 Title: ✨ Kita PDF Reader v2.2.1 - Enhanced UI & Auto-Update" -ForegroundColor Gray
Write-Host "   📄 Description: Copy from RELEASE_v2.2.1_NOTES.md" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Upload these files:" -ForegroundColor White
Write-Host "   📦 dist\Kita PDF Reader-Setup-2.2.1.exe" -ForegroundColor Yellow
Write-Host "   ⚠️  dist\latest.yml (CRITICAL FOR AUTO-UPDATE!)" -ForegroundColor Red
Write-Host ""

Write-Host "4️⃣  Click 'Publish release' 🚀" -ForegroundColor White
Write-Host ""

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║  🧪 TEST AUTO-UPDATE                       ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "After publishing:" -ForegroundColor White
Write-Host "   1. Open v2.2.0 app from Desktop" -ForegroundColor Gray
Write-Host "   2. Wait 3 seconds" -ForegroundColor Gray
Write-Host "   3. Toast should appear: '🎉 Update v2.2.1 available!'" -ForegroundColor Gray
Write-Host "   4. Click 'Update Now'" -ForegroundColor Gray
Write-Host "   5. Download should be ~5-10 MB (differential)" -ForegroundColor Gray
Write-Host ""

Write-Host "🎉 Done! Good luck with the release!" -ForegroundColor Green
Write-Host ""
