# 🚀 Quick Start - Release v2.2.1

## الطريقة السريعة (All-in-One):

```powershell
.\RELEASE-v2.2.1.ps1
```

هذا السكريبت سيقوم بـ:
- ✅ حذف dist القديم
- ✅ بناء v2.2.1 من جديد
- ✅ Git commit + tag + push
- ✅ عرض تعليمات GitHub Release

---

## أو خطوة بخطوة:

### 1. بناء فقط:
```powershell
.\build-v2.2.1.ps1
```

### 2. رفع على GitHub:
```powershell
.\release-to-github.ps1
```

---

## الملفات المطلوبة للرفع:

من مجلد `dist/`:
- ✅ `Kita PDF Reader-Setup-2.2.1.exe`
- ⚠️ `latest.yml` (ضروري للتحديث التلقائي!)

---

## GitHub Release URL:
https://github.com/russianff13-crypto/PDF-Library/releases/new

---

## Release Notes:
انسخ من: `RELEASE_v2.2.1_NOTES.md`
