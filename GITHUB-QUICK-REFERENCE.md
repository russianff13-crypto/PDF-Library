# 🚀 GitHub Quick Reference - PDF Library

## ⚡ الأوامر السريعة

### 📤 رفع تعديلات جديدة (الأكثر استخداماً)
```powershell
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"
git add .
git commit -m "وصف مختصر للتعديل"
git push origin main
```

### 🔄 تنزيل آخر تحديثات
```powershell
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"
git pull origin main
```

### 🆕 تنزيل المشروع على جهاز جديد
```powershell
git clone https://github.com/YOUR-USERNAME/PDF-Library.git
cd PDF-Library
npm install
npm start
```

---

## 🎯 الإعداد الأولي (مرة واحدة فقط)

### 1️⃣ إنشاء Repository على GitHub
1. اذهب إلى https://github.com
2. اضغط "+" → "New repository"
3. الاسم: `PDF-Library`
4. **لا تختر** أي خيارات إضافية (README, .gitignore)
5. اضغط "Create repository"

### 2️⃣ ربط المشروع بـ GitHub
```powershell
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"
git remote add origin https://github.com/YOUR-USERNAME/PDF-Library.git
git branch -M main
git push -u origin main
```

⚠️ **ملاحظة:** استبدل `YOUR-USERNAME` باسم المستخدم الفعلي!

### 3️⃣ إنشاء Personal Access Token
1. اذهب إلى: https://github.com/settings/tokens
2. "Generate new token (classic)"
3. اختر: `repo` (كل الخيارات تحته)
4. انسخ Token واحفظه بأمان!
5. استخدمه بدلاً من كلمة المرور عند `git push`

---

## 📋 سيناريوهات شائعة

### ✏️ عدلت ملفات وتريد رفعها
```powershell
git add .
git commit -m "fix: إصلاح مشكلة الحذف"
git push origin main
```

### 🔄 تريد تنزيل تحديثات من GitHub
```powershell
git pull origin main
```

### 👀 تريد معرفة ما تم تعديله
```powershell
git status
git diff
```

### ⏮️ تريد التراجع عن تعديل (قبل Commit)
```powershell
git checkout -- filename.js
```

### 🗑️ تريد حذف آخر Commit (خطر!)
```powershell
git reset --hard HEAD~1
```

---

## 🆘 حل المشاكل

### ❌ خطأ: Authentication failed
**الحل:** استخدم Personal Access Token بدلاً من كلمة المرور

### ❌ خطأ: remote origin already exists
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR-USERNAME/PDF-Library.git
```

### ❌ خطأ: rejected - fetch first
```powershell
git pull origin main --rebase
git push origin main
```

### ❌ خطأ: Merge conflict
1. افتح الملف المذكور
2. ابحث عن `<<<<<<<` و `=======` و `>>>>>>>`
3. احذفهم واحتفظ بالكود الصحيح
4. نفذ:
```powershell
git add .
git commit -m "Resolve conflict"
git push origin main
```

---

## 💾 حفظ Token (مرة واحدة)
```powershell
git config --global credential.helper wincred
```
بعدها لن تحتاج إدخال Token في كل مرة!

---

## 📚 للمزيد من التفاصيل
راجع: `GITHUB-COMPLETE-GUIDE.md`

---

**✅ تم الإعداد؟ ابدأ الآن!**
```powershell
git add .
git commit -m "feat: ميزة جديدة رائعة!"
git push origin main
```
