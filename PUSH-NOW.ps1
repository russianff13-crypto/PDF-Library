# 🚀 سكريبت رفع المشروع إلى GitHub تلقائياً
# ═══════════════════════════════════════════════════════════

Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🚀 رفع PDF Library إلى GitHub      " -ForegroundColor Yellow
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. طلب اسم المستخدم
Write-Host "📝 الخطوة 1: إدخال اسم المستخدم" -ForegroundColor Green
$username = Read-Host "أدخل اسم المستخدم على GitHub"

if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "❌ يجب إدخال اسم المستخدم!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ اسم المستخدم: $username" -ForegroundColor Green
Write-Host ""

# 2. طلب Token
Write-Host "📝 الخطوة 2: إدخال Token" -ForegroundColor Green
$token = Read-Host "أدخل Personal Access Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token)
$tokenPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# 3. إنشاء الرابط
$repoUrl = "https://$username`:$tokenPlain@github.com/$username/PDF-Library.git"

Write-Host "📡 الخطوة 3: إعداد Repository" -ForegroundColor Green
Write-Host "Repository: https://github.com/$username/PDF-Library" -ForegroundColor Cyan
Write-Host ""

# 3. التحقق من وجود remote
Write-Host "🔍 الخطوة 3: التحقق من Remote" -ForegroundColor Green
$remoteExists = git remote get-url origin 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  Remote موجود مسبقاً - سيتم تحديثه" -ForegroundColor Yellow
    git remote remove origin
    Write-Host "✅ تم حذف Remote القديم" -ForegroundColor Green
}

# 4. إضافة remote
Write-Host "➕ الخطوة 4: إضافة Remote" -ForegroundColor Green
git remote add origin $repoUrl

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم إضافة Remote بنجاح!" -ForegroundColor Green
} else {
    Write-Host "❌ فشل إضافة Remote!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. تسمية الفرع
Write-Host "🌿 الخطوة 5: تسمية الفرع الرئيسي" -ForegroundColor Green
git branch -M main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ الفرع الآن: main" -ForegroundColor Green
} else {
    Write-Host "⚠️  تحذير: قد يكون الفرع مسمى مسبقاً" -ForegroundColor Yellow
}
Write-Host ""

# 6. الرفع
Write-Host "🚀 الخطوة 6: رفع المشروع..." -ForegroundColor Green
Write-Host "⏳ جاري الرفع... يرجى الانتظار" -ForegroundColor Yellow
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    Write-Host "   ✅ نجح الرفع بشكل كامل! 🎉         " -ForegroundColor Green
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 رابط المشروع:" -ForegroundColor Cyan
    Write-Host "   https://github.com/$username/PDF-Library" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  الخطوة التالية المهمة:" -ForegroundColor Yellow
    Write-Host "   1. اذهب إلى: https://github.com/settings/tokens" -ForegroundColor White
    Write-Host "   2. احذف Token الحالي فوراً!" -ForegroundColor Red
    Write-Host "   3. أنشئ Token جديد للاستخدام المستقبلي" -ForegroundColor White
    Write-Host ""
    
    # حفظ Credentials
    Write-Host "💾 حفظ Credentials..." -ForegroundColor Green
    git config --global credential.helper wincred
    Write-Host "✅ سيتم حفظ Token الجديد تلقائياً في المرة القادمة" -ForegroundColor Green
    Write-Host ""
    
} else {
    Write-Host ""
    Write-Host "════════════════════════════════════════" -ForegroundColor Red
    Write-Host "   ❌ فشل الرفع!                       " -ForegroundColor Red
    Write-Host "════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 الأسباب المحتملة:" -ForegroundColor Yellow
    Write-Host "   1. Repository غير موجود على GitHub" -ForegroundColor White
    Write-Host "   2. اسم المستخدم خاطئ" -ForegroundColor White
    Write-Host "   3. Token منتهي الصلاحية" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ الحل:" -ForegroundColor Green
    Write-Host "   1. تأكد من إنشاء Repository على:" -ForegroundColor White
    Write-Host "      https://github.com/new" -ForegroundColor Cyan
    Write-Host "   2. الاسم يجب أن يكون: PDF-Library" -ForegroundColor White
    Write-Host "   3. جرب تشغيل السكريبت مرة أخرى" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🎉 انتهى! استمتع بمشروعك!           " -ForegroundColor Yellow
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
