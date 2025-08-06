# Kasrah Backend API

Backend API لموقع كسرة الرياضي - نظام إدارة المحتوى الرياضي متعدد اللغات.

## المميزات

- 🌐 **دعم متعدد اللغات**: العربية والإنجليزية
- 🚀 **API RESTful**: نظام API متكامل
- 🔐 **أمان عالي**: تشفير الجلسات والبيانات
- 📊 **إحصائيات متقدمة**: تتبع الزيارات والمشاهدات
- 🎯 **SEO محسن**: دعم كامل لتحسين محركات البحث

## البنية التقنية

- **Node.js** + **Express.js**
- **PostgreSQL** (Neon Database)
- **Session Management** مع Express Session
- **CORS** للطلبات المتقاطعة
- **bcryptjs** لتشفير كلمات المرور

## التثبيت المحلي

### المتطلبات
- Node.js (18.0.0 أو أحدث)
- PostgreSQL
- npm أو yarn

### خطوات التثبيت

1. **استنساخ المشروع**:
```bash
git clone <repository-url>
cd kasrah-backend
```

2. **تثبيت التبعيات**:
```bash
npm install
```

3. **إعداد متغيرات البيئة**:
```bash
cp config.env.example config.env
# تعديل المتغيرات في config.env
```

4. **إعداد قاعدة البيانات**:
```bash
npm run setup-db
```

5. **تشغيل الخادم**:
```bash
# للتطوير
npm run dev

# للإنتاج
npm start
```

## متغيرات البيئة

```env
# قاعدة البيانات
DATABASE_URL=postgresql://user:password@host:port/database

# بيانات الإدارة
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password

# إعدادات الخادم
PORT=3000
NODE_ENV=production
SESSION_SECRET=your_secret_key

# CORS (للإنتاج)
FRONTEND_URL=https://your-frontend-url.com
ADMIN_URL=https://your-admin-url.com
```

## النشر على Render

### 1. إعداد قاعدة البيانات
1. انتقل إلى [Render Dashboard](https://dashboard.render.com)
2. أنشئ PostgreSQL Database جديدة
3. احفظ connection string

### 2. إعداد Web Service
1. أنشئ Web Service جديد
2. اربطه بـ GitHub repository
3. اختر مجلد `backend` كـ Root Directory
4. استخدم الإعدادات التالية:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

### 3. إضافة متغيرات البيئة
```
NODE_ENV=production
DATABASE_URL=[من قاعدة البيانات]
ADMIN_USERNAME=admin
ADMIN_PASSWORD=[كلمة مرور آمنة]
SESSION_SECRET=[مفتاح عشوائي آمن]
FRONTEND_URL=[رابط الواجهة الأمامية]
```

### 4. النشر
- Render سينشر تلقائياً عند push للـ repository
- يمكن متابعة الـ logs من Dashboard

## API Endpoints

### العامة (Public)
```
GET  /api/articles              # جلب جميع المقالات
GET  /api/articles/:slug        # جلب مقال محدد
GET  /api/articles-by-language/:lang  # جلب المقالات حسب اللغة
GET  /api/settings              # جلب إعدادات الموقع
GET  /api/current-language      # جلب اللغة الحالية
POST /api/change-language       # تغيير اللغة
GET  /health                    # فحص صحة الخادم
```

### الإدارية (Admin - تتطلب تسجيل دخول)
```
POST /api/login                 # تسجيل الدخول
POST /api/logout                # تسجيل الخروج
GET  /api/admin/articles        # جلب جميع المقالات (إدارة)
POST /api/admin/articles        # إضافة مقال جديد
PUT  /api/admin/articles/:id    # تحديث مقال
DELETE /api/admin/articles/:id  # حذف مقال
```

## أمثلة الاستخدام

### جلب المقالات
```javascript
// جلب جميع المقالات
const response = await fetch('https://your-api.onrender.com/api/articles');
const articles = await response.json();

// جلب مقال محدد
const article = await fetch('https://your-api.onrender.com/api/articles/article-slug');
const articleData = await article.json();
```

### تغيير اللغة
```javascript
const response = await fetch('https://your-api.onrender.com/api/change-language', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ language: 'en' })
});
```

### تسجيل الدخول (الإدارة)
```javascript
const response = await fetch('https://your-api.onrender.com/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'your_password'
  })
});
```

## الأمان

- ✅ **تشفير كلمات المرور** باستخدام bcryptjs
- ✅ **جلسات آمنة** مع httpOnly cookies
- ✅ **CORS محدود** حسب البيئة
- ✅ **معالجة أخطاء آمنة** بدون كشف تفاصيل حساسة
- ✅ **فلترة المدخلات** ومعالجة SQL injection

## المراقبة والصيانة

### Health Check
```bash
curl https://your-api.onrender.com/health
```

### Logs
```bash
# عرض آخر 100 سطر من اللوجز
render logs --tail 100 your-service-id
```

### Database Backup
```bash
# تصدير قاعدة البيانات
pg_dump $DATABASE_URL > backup.sql
```

## التطوير

### إضافة endpoint جديد
```javascript
app.get('/api/new-endpoint', async (req, res) => {
  try {
    // منطق الـ endpoint
    res.json({ success: true });
  } catch (error) {
    console.error('خطأ:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});
```

### إضافة middleware جديد
```javascript
function newMiddleware(req, res, next) {
  // منطق الـ middleware
  next();
}

app.use('/api/protected', newMiddleware);
```

## استكشاف الأخطاء

### مشاكل شائعة

#### 1. خطأ في الاتصال بقاعدة البيانات
```bash
# تحقق من DATABASE_URL
echo $DATABASE_URL
```

#### 2. مشاكل CORS
```javascript
// تأكد من إضافة frontend URL في متغيرات البيئة
FRONTEND_URL=https://your-frontend.replit.app
```

#### 3. مشاكل الجلسات
```javascript
// تأكد من وجود SESSION_SECRET
SESSION_SECRET=your-long-random-secret-key
```

## الدعم

للدعم التقني:
- GitHub Issues: [رابط المشروع]
- Email: support@kasrah.com

---

**تم تطوير هذا المشروع بواسطة فريق كسرة الرياضي** 🏆