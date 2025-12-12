# 📋 أوامر GitHub جاهزة للنسخ - PDF Library

## 🎯 الإعداد الأولي (First Time Setup)

### الخطوة 1: ربط المشروع بـ GitHub
⚠️ **قبل تنفيذ هذه الأوامر:**
1. أنشئ Repository على GitHub باسم `PDF-Library`
2. أنشئ Personal Access Token من: https://github.com/settings/tokens
3. استبدل `YOUR-USERNAME` باسم المستخدم الحقيقي!

```powershell
# انتقل لمجلد المشروع
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"

# أضف رابط GitHub (استبدل YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/PDF-Library.git

# سمِّ الفرع الرئيسي
git branch -M main

# ارفع الملفات لأول مرة
git push -u origin main
```

---

## 🔄 الاستخدام اليومي (Daily Workflow)

### رفع تعديلات جديدة
```powershell
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"
git add .
git commit -m "وصف التعديل هنا"
git push origin main
```

### تنزيل آخر تحديثات
```powershell
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"
git pull origin main
```

---

## 📦 تنزيل المشروع على جهاز جديد

```powershell
# اذهب للمكان الذي تريد حفظ المشروع فيه
cd C:\MyProjects

# نزّل المشروع (استبدل YOUR-USERNAME)
git clone https://github.com/YOUR-USERNAME/PDF-Library.git

# ادخل للمشروع
cd PDF-Library

# ثبّت Dependencies
npm install

# شغّل التطبيق
npm start
```

---

## ✅ أمثلة على Commit Messages

### إصلاح مشاكل (Fixes)
```powershell
git commit -m "fix: إصلاح مشكلة التكرار في الكتب"
git commit -m "fix: حل مشكلة ENOENT عند حذف BooksStorage"
git commit -m "fix: الحذف الآن نهائي من BooksStorage"
```

### إضافة ميزات جديدة (Features)
```powershell
git commit -m "feat: إضافة خاصية Random Shuffle عند البدء"
git commit -m "feat: تطبيق الفلتر المحفوظ تلقائياً"
git commit -m "feat: إضافة زر تصدير إلى Word"
```

### تحديث التوثيق (Documentation)
```powershell
git commit -m "docs: تحديث README.md"
git commit -m "docs: إضافة دليل GitHub"
git commit -m "docs: شرح طريقة الاستخدام"
```

### تحسينات الكود (Refactoring)
```powershell
git commit -m "refactor: تحسين أداء checkAndSyncBooksStorage"
git commit -m "refactor: تنظيف الكود في renderer.js"
```

### تحسينات التصميم (Styling)
```powershell
git commit -m "style: تحسين واجهة المستخدم"
git commit -m "style: إضافة ألوان جديدة للأزرار"
```

---

## 🛠️ أوامر استكشاف الأخطاء

### التحقق من حالة المشروع
```powershell
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"
git status
```

### عرض الفروقات
```powershell
# كل الملفات المعدلة
git diff

# ملف معين فقط
git diff main.js

# الفرق بين Local و GitHub
git diff origin/main
```

### عرض سجل التعديلات
```powershell
# مختصر
git log --oneline

# مفصل
git log

# مع رسم بياني
git log --graph --oneline --all
```

---

## ⚠️ أوامر التراجع (استخدمها بحذر!)

### التراجع عن تعديلات قبل Add
```powershell
# ملف واحد
git checkout -- main.js

# كل الملفات
git checkout -- .
```

### التراجع عن Add (قبل Commit)
```powershell
# ملف واحد
git reset HEAD main.js

# كل الملفات
git reset HEAD .
```

### التراجع عن آخر Commit (يبقي التعديلات)
```powershell
git reset --soft HEAD~1
```

### التراجع عن آخر Commit (يحذف التعديلات! خطر!)
```powershell
git reset --hard HEAD~1
```

---

## 🔧 إصلاح المشاكل الشائعة

### إزالة Remote وإضافته من جديد
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR-USERNAME/PDF-Library.git
```

### حل مشكلة rejected - fetch first
```powershell
git pull origin main --rebase
git push origin main
```

### حل Merge Conflict
```powershell
# بعد فتح الملف وحل Conflict يدوياً:
git add .
git commit -m "Resolve merge conflict in main.js"
git push origin main
```

### إعادة تسمية Commit الأخير
```powershell
git commit --amend -m "الرسالة الجديدة"
```

---

## 💾 حفظ Token (مرة واحدة فقط)

```powershell
# Windows Credential Manager
git config --global credential.helper wincred
```

بعد أول `git push` وإدخال Token، سيحفظه تلقائياً!

---

## 🌿 العمل بنظام Branches (متقدم)

### إنشاء Branch جديد
```powershell
# إنشاء والتبديل مباشرة
git checkout -b feature-new-export

# أو خطوتين:
git branch feature-new-export
git checkout feature-new-export
```

### رفع Branch إلى GitHub
```powershell
git push -u origin feature-new-export
```

### العودة لـ main ودمج Branch
```powershell
# العودة لـ main
git checkout main

# دمج التعديلات
git merge feature-new-export

# حذف Branch المحلي
git branch -d feature-new-export

# حذف Branch من GitHub
git push origin --delete feature-new-export
```

---

## 📊 أوامر معلومات

### عرض Remote المضاف
```powershell
git remote -v
```

### عرض جميع Branches
```powershell
# المحلية فقط
git branch

# المحلية + GitHub
git branch -a
```

### معرفة Branch الحالي
```powershell
git branch --show-current
```

### عرض إحصائيات Commit
```powershell
git shortlog -s -n
```

---

## 🎯 سير العمل الكامل (Complete Workflow)

### السيناريو: إضافة ميزة جديدة

```powershell
# 1. تحديث المشروع
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"
git pull origin main

# 2. إنشاء Branch (اختياري)
git checkout -b feature-pdf-to-word

# 3. تعديل الكود...
# ... عدل الملفات في VS Code ...

# 4. التحقق من التعديلات
git status
git diff

# 5. إضافة الملفات
git add .

# 6. إنشاء Commit
git commit -m "feat: إضافة تحويل PDF إلى Word"

# 7. رفع التعديلات
git push origin feature-pdf-to-word

# 8. العودة لـ main ودمج (أو اعمل Pull Request على GitHub)
git checkout main
git merge feature-pdf-to-word
git push origin main

# 9. حذف Branch
git branch -d feature-pdf-to-word
git push origin --delete feature-pdf-to-word
```

---

## 🚨 في حالة الطوارئ!

### حفظ تعديلات مؤقتاً (Stash)
```powershell
# حفظ التعديلات بدون Commit
git stash

# عرض القائمة
git stash list

# استرجاع التعديلات
git stash pop

# حذف Stash
git stash drop
```

### إلغاء كل شيء والعودة لآخر Commit
```powershell
# ⚠️ خطر! يحذف كل التعديلات!
git reset --hard HEAD
git clean -fd
```

---

## 📝 Notes

### تكوين Git لأول مرة
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### تغيير Editor الافتراضي
```powershell
# VS Code
git config --global core.editor "code --wait"

# Notepad
git config --global core.editor notepad
```

### تعطيل تحذيرات CRLF على Windows
```powershell
git config --global core.autocrlf true
```

---

## ✅ Checklist قبل Push

```
[ ] git pull origin main  (تحديث من GitHub)
[ ] npm start  (اختبار التطبيق محلياً)
[ ] git status  (التحقق من الملفات المعدلة)
[ ] git add .  (إضافة الملفات)
[ ] git commit -m "..."  (رسالة واضحة)
[ ] git push origin main  (رفع التعديلات)
```

---

## 🔗 روابط سريعة

- Repository: `https://github.com/YOUR-USERNAME/PDF-Library`
- Settings: `https://github.com/YOUR-USERNAME/PDF-Library/settings`
- Tokens: `https://github.com/settings/tokens`
- Issues: `https://github.com/YOUR-USERNAME/PDF-Library/issues`
- Pull Requests: `https://github.com/YOUR-USERNAME/PDF-Library/pulls`

---

**💡 نصيحة:** احفظ هذا الملف في Bookmarks لسهولة الوصول!

**✅ جاهز؟ انسخ والصق!** 🚀
