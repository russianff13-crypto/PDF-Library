Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

git push -u origin main

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Project Uploaded!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your project:" -ForegroundColor Cyan
    Write-Host "https://github.com/russianff13-crypto/PDF-Library" -ForegroundColor White
    Write-Host ""
    Write-Host "IMPORTANT: Delete token now!" -ForegroundColor Yellow
    Write-Host "https://github.com/settings/tokens" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "================================" -ForegroundColor Red
    Write-Host "  FAILED!" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure Repository exists on GitHub" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
