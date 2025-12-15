# 🚀 Release Script for Kita PDF Reader v2.2.1
# This script will commit, tag, and push to GitHub

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  🚀 GitHub Release Script - v2.2.1" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Git status
Write-Host "📊 Step 1: Checking Git status..." -ForegroundColor Yellow
git status --short
Write-Host ""

# Step 2: Add all changes
Write-Host "➕ Step 2: Adding all changes..." -ForegroundColor Yellow
git add .
Write-Host "   ✅ Changes staged" -ForegroundColor Green
Write-Host ""

# Step 3: Commit
Write-Host "💾 Step 3: Creating commit..." -ForegroundColor Yellow
git commit -m "Release v2.2.1 - Auto-Update, Enhanced UI, Bug Fixes"
Write-Host ""

# Step 4: Create tag
Write-Host "🏷️  Step 4: Creating tag v2.2.1..." -ForegroundColor Yellow
git tag v2.2.1
Write-Host "   ✅ Tag created" -ForegroundColor Green
Write-Host ""

# Step 5: Push to main branch
Write-Host "📤 Step 5: Pushing to main branch..." -ForegroundColor Yellow
git push origin main
Write-Host ""

# Step 6: Push tag
Write-Host "📤 Step 6: Pushing tag..." -ForegroundColor Yellow
git push origin v2.2.1
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ✅ Git Operations Completed!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Next Step: Create GitHub Release" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open this URL:" -ForegroundColor White
Write-Host "   https://github.com/russianff13-crypto/PDF-Library/releases/new" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Fill in:" -ForegroundColor White
Write-Host "   - Tag: v2.2.1" -ForegroundColor Gray
Write-Host "   - Title: ✨ Kita PDF Reader v2.2.1 - Enhanced UI & Auto-Update" -ForegroundColor Gray
Write-Host "   - Description: Copy from RELEASE_v2.2.1_NOTES.md" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Upload files from dist folder:" -ForegroundColor White
Write-Host "   - Kita PDF Reader-Setup-2.2.1.exe" -ForegroundColor Yellow
Write-Host "   - latest.yml ⚠️ CRITICAL!" -ForegroundColor Red
Write-Host ""
Write-Host "4. Click 'Publish release'" -ForegroundColor White
Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
Write-Host ""
