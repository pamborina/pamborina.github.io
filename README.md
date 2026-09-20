# منصة حلواني بامبورينا | Pamborina Patisserie Platform 🍰✨

منصة إلكترونية متكاملة للطلب وإدارة المنتجات لـ **حلواني بامبورينا (Pamborina Patisserie)**، مصممة بأعلى معايير السرعة، الدقة البرمجية، وتجربة المستخدم الفاخرة، مع مزامنة لحظية فورية عبر **Firebase Firestore** ودعم كامل للنشر على **GitHub** وأي استضافة سحابية.

---

## 🌟 المميزات الرئيسية للمنصة

1. **مزامنة فورية شاملة (Real-Time Cloud Synchronization):**
   - ربط كامل لقاعدة بيانات **Firebase Firestore** لجميع الكيانات: المنتجات، الأقسام، العروض الترويجية، الطلبات، عناوين الفروع، ومنظومة الفيديوهات.
   - أي تعديل أو إضافة أو حذف أو إعادة ترتيب يتم داخل لوحة التحكم ينعكس في أجزاء من الثانية لدى جميع العملاء على كافة الأجهزة (هواتف، أجهزة لوحية، وحواسيب).

2. **منظومة إدارة الفيديوهات التفاعلية (Video Showcase Engine):**
   - رفع فائق السرعة عبر تقنية التجزئة الذكية (Chunked Streaming Pipeline) التي تتجاوز قيود أحجام الملفات على الخوادم.
   - إمكانية تشغيل الفيديوهات بملء الشاشة، التحكم في كتم الصوت، إضافة وتعديل العناوين والأوصاف، وإظهار/إخفاء الصور المصغرة والتحكم في ترتيب العرض بالـ Drag & Drop أو الأزرار.
   - دعم التخزين المزدوج (Dual-Guarantee Persistence) بين Firestore وسيرفر Express والـ Local Storage.

3. **لوحة تحكم إدارية فائقة القوة (Admin Dashboard):**
   - إدارة المنتجات، الأسعار، العروض الترويجية، ومواعيد وساعات العمل.
   - إدارة حالات الطلبات (قيد الانتظار، قيد التجهيز، جاري التوصيل، مكتمل).
   - إسناد الطلبات لمناديب التوصيل وتحديث مصاريف الشحن بمرونة تامة.
   - سجل تدقيق إداري (Audit Log) لتوثيق جميع العمليات.

4. **تجربة مستخدم راقية متوافقة مع الهواتف الذكية (PWA Ready):**
   - تصميم فاخر داكن مستوحى من فخامة علامة بامبورينا مع تدرجات الذهبي والكراميل.
   - خطوط عربية فائقة الوضوح (Cairo, Tajawal, Readex Pro).
   - سرعة فائقة مع تقنيات Caching و Lazy Loading لجميع الصور والفيديوهات.

---

## 🚀 التثبيت والتشغيل المحلي (Local Development)

### المتطلبات الأساسية:
- **Node.js**: الإصدار 18 أو 20+
- **npm** أو **yarn** أو **pnpm**

### خطوات التشغيل:

```bash
# 1. تثبيت الحزم والمكتبات
npm install

# 2. تشغيل السيرفر المحلي في وضع التطوير
npm run dev

# سيعمل الموقع مباشرة على: http://localhost:3000
```

### البناء للإنتاج (Production Build):

```bash
# بناء ملفات الواجهة والسيرفر المترجم
npm run build

# تشغيل السيرفر المترجم للإنتاج
npm start
```

---

## 📦 النشر والرفع على GitHub (GitHub Deployment Guide)

1. أنشئ مستودعاً جديداً (Repository) على حسابك في GitHub (مثلاً: `pamborina-platform`).
2. افتح موجه الأوامر في مجلد المشروع ونفذ:

```bash
git init
git add .
git commit -m "feat: Initial release of Pamborina Patisserie Platform with full Firestore & Real-Time Sync"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pamborina-platform.git
git push -u origin main
```

---

## ⚙️ متغيرات البيئة (Environment Variables)

قم بإنشاء ملف `.env` بناءً على `.env.example`:

```env
# Gemini AI
GEMINI_API_KEY=

# Firebase Client Web SDK
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Firebase Admin Service Account (Optional for Cloud Run / Node Servers)
FIREBASE_SERVICE_ACCOUNT_KEY=
```

---

## 🛡️ قواعد أمان Firestore (Security Rules)

الملف `firestore.rules` جاهز ومضبوط بدقة:
- القراءة متاحة للجمهور لجميع المنتجات، الأقسام، العروض، والفيديوهات.
- الكتابة والتعديل والتسجيل محصورة بالأدمن المعني أو عبر السيرفر المؤمن.
- لنشر القواعد إلى مشروع Firebase الخاص بك:
```bash
firebase deploy --only firestore:rules
```

---

## 👨‍🍳 صُنع بكل فخر لـ حلواني بامبورينا (Pamborina Patisserie)
جميع الحقوق محفوظة © 2026.
