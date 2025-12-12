Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "  Final Push to GitHub" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Uploading... Please wait 1-2 minutes..." -ForegroundColor Green
Write-Host ""

git push -f origin main

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "==============================" -ForegroundColor Green
    Write-Host "  SUCCESS!" -ForegroundColor Green  
    Write-Host "==============================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Project URL:" -ForegroundColor Cyan
    Write-Host "https://github.com/russianff13-crypto/PDF-Library" -ForegroundColor White
    Write-Host ""
    Write-Host "NEXT STEP - Delete Token:" -ForegroundColor Yellow
    Write-Host "https://github.com/settings/tokens" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "==============================" -ForegroundColor Red
    Write-Host "  FAILED" -ForegroundColor Red
    Write-Host "==============================" -ForegroundColor Red
    Write-Host ""
}

Read-Host "Press Enter to close"
