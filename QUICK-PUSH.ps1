# ═══════════════════════════════════════════════════════════
# 🚀 رفع سريع إلى GitHub - نسخة مبسطة
# ═══════════════════════════════════════════════════════════

Write-Host "`n🚀 رفع PDF Library إلى GitHub...`n" -ForegroundColor Cyan

# اسم المستخدم (سيتم السؤال عنه)
$username = Read-Host "أدخل اسم المستخدم على GitHub"

if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "❌ يجب إدخال اسم المستخدم!" -ForegroundColor Red
    exit
}

Write-Host "`n✅ جاري الرفع...`n" -ForegroundColor Green

# طلب Token
$token = Read-Host "Enter your Personal Access Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token)
$tokenPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# حذف remote إذا كان موجوداً
git remote remove origin 2>$null

# إضافة remote مع Token
git remote add origin "https://$username`:$tokenPlain@github.com/$username/PDF-Library.git"

# تسمية الفرع
git branch -M main

# الرفع
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅✅✅ نجح الرفع! ✅✅✅`n" -ForegroundColor Green
    Write-Host "🔗 المشروع: https://github.com/$username/PDF-Library`n" -ForegroundColor Cyan
    Write-Host "⚠️  مهم: احذف Token الآن من:" -ForegroundColor Yellow
    Write-Host "   https://github.com/settings/tokens`n" -ForegroundColor White
} else {
    Write-Host "`n❌ فشل الرفع!" -ForegroundColor Red
    Write-Host "تأكد من إنشاء Repository على:" -ForegroundColor Yellow
    Write-Host "https://github.com/new`n" -ForegroundColor Cyan
}
