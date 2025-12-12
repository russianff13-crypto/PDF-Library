# 🔒 رفع المشروع إلى GitHub بشكل آمن

## ⚠️ قواعد أمان Token المهمة:

### ❌ لا تفعل أبداً:
- ❌ مشاركة Token في أي محادثة
- ❌ نشر Token على الإنترنت
- ❌ حفظ Token في ملفات المشروع
- ❌ إرسال Token عبر Email أو Chat

### ✅ افعل دائماً:
- ✅ احفظ Token في ملف محلي خاص (مثل: `C:\MySecrets\github-token.txt`)
- ✅ استخدم Git Credential Manager لحفظه تلقائياً
- ✅ احذف Token فوراً إذا شككت أنه تسرب
- ✅ أنشئ Token جديد بصلاحيات محدودة فقط

---

## 🎯 الخطوات الآمنة للرفع

### 1️⃣ تأكد أن لديك Repository على GitHub

إذا لم تنشئه بعد:
1. اذهب إلى: https://github.com/new
2. الاسم: `PDF-Library`
3. اختر: Public أو Private
4. **لا تختر** أي خيارات إضافية
5. اضغط "Create repository"

---

### 2️⃣ احصل على Token جديد (بعد حذف القديم!)

1. اذهب إلى: https://github.com/settings/tokens
2. **احذف Token القديم أولاً!**
3. اضغط "Generate new token (classic)"
4. املأ:
   ```
   Note: PDF Library Access
   Expiration: 90 days
   Scopes: ✓ repo
   ```
5. اضغط "Generate token"
6. انسخ Token واحفظه في ملف خاص على جهازك

---

### 3️⃣ أوامر Git للرفع

**الطريقة الأولى: HTTPS (موصى بها)**

```powershell
# 1. الانتقال للمجلد
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"

# 2. إضافة رابط GitHub (استبدل YOUR-USERNAME باسمك)
git remote add origin https://github.com/YOUR-USERNAME/PDF-Library.git

# 3. تسمية الفرع
git branch -M main

# 4. رفع المشروع
git push -u origin main
```

**سيطلب منك:**
- **Username:** اسم المستخدم على GitHub
- **Password:** الصق Token الجديد هنا (Ctrl+V)

**⚠️ مهم:** Token يُستخدم بدلاً من كلمة المرور!

---

### 4️⃣ حفظ Token تلقائياً (اختياري)

لتجنب إدخال Token في كل مرة:

```powershell
# Windows Credential Manager
git config --global credential.helper wincred
```

بعد أول `git push` وإدخال Token، سيُحفظ في Windows Credential Manager بشكل آمن!

---

## 🔄 الاستخدام اليومي (بعد الرفع الأول)

### رفع تعديلات جديدة:
```powershell
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"
git add .
git commit -m "وصف التعديل"
git push origin main
```

### تنزيل تحديثات:
```powershell
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"
git pull origin main
```

---

## 🆘 إذا واجهت مشاكل

### المشكلة: Authentication failed
**السبب:** Token خاطئ أو منتهي الصلاحية

**الحل:**
1. احذف Token القديم
2. أنشئ Token جديد
3. حدّث المحفوظ في Windows:
   ```powershell
   # حذف Credentials المحفوظة
   git credential-manager erase https://github.com
   
   # أو من Control Panel:
   Control Panel → Credential Manager → Windows Credentials
   # احذف أي credentials لـ git:https://github.com
   ```

---

### المشكلة: remote origin already exists
**الحل:**
```powershell
# حذف Remote القديم
git remote remove origin

# إضافة الصحيح
git remote add origin https://github.com/YOUR-USERNAME/PDF-Library.git
```

---

### المشكلة: rejected - fetch first
**الحل:**
```powershell
git pull origin main --rebase
git push origin main
```

---

## 🔐 أمان إضافي

### إذا تسرب Token:

1. **فوراً:** اذهب إلى https://github.com/settings/tokens
2. **احذفه:** اضغط Delete بجانب Token
3. **أنشئ جديد:** بصلاحيات محدودة فقط
4. **غيّر كلمة مرور GitHub:** إذا كنت قلقاً

### نصائح أمان:

- ✅ استخدم Token منفصل لكل مشروع
- ✅ حدد صلاحيات Token (repo فقط)
- ✅ استخدم Expiration قصير (30-90 يوم)
- ✅ راجع Tokens بانتظام واحذف غير المستخدمة
- ✅ فعّل Two-Factor Authentication على GitHub

---

## 📋 Checklist قبل Push

```
[ ] حذفت Token القديم المتسرب
[ ] أنشأت Token جديد
[ ] حفظت Token في مكان آمن (ليس في المشروع!)
[ ] أنشأت Repository على GitHub
[ ] نفذت git remote add origin
[ ] جاهز لـ git push
```

---

## 🎯 ملخص سريع

```powershell
# 1. احذف Token القديم من:
https://github.com/settings/tokens

# 2. أنشئ Token جديد (repo فقط)

# 3. نفذ:
cd "c:\DevProjects\GOOGLE-DEVS\PDF Library"
git remote add origin https://github.com/YOUR-USERNAME/PDF-Library.git
git branch -M main
git push -u origin main

# 4. أدخل:
Username: YOUR-USERNAME
Password: NEW-TOKEN-HERE

# 5. فعّل حفظ تلقائي:
git config --global credential.helper wincred
```

---

## 🔗 روابط مفيدة

- **GitHub Tokens:** https://github.com/settings/tokens
- **New Repository:** https://github.com/new
- **Security Settings:** https://github.com/settings/security
- **2FA Setup:** https://github.com/settings/security/two-factor-authentication

---

**⚠️ تذكر:** Token = كلمة المرور! احمِه بنفس الطريقة!

**✅ الآن أنت جاهز للرفع بشكل آمن!** 🚀
