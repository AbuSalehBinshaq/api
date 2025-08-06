require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات دعم اللغات
const SUPPORTED_LANGUAGES = ['ar', 'en'];
const DEFAULT_LANGUAGE = 'ar';

// إعداد قاعدة البيانات
let pool;

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

function initializeDatabase() {
  pool = createPool();
  
  pool.on('error', (err) => {
    console.error('خطأ في الاتصال بقاعدة البيانات:', err);
    setTimeout(() => {
      console.log('إعادة الاتصال بقاعدة البيانات...');
      pool = createPool();
    }, 5000);
  });
}

initializeDatabase();

// إعدادات CORS للإنتاج
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, process.env.ADMIN_URL] 
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'Content-Language']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// إعداد الجلسات
app.use(session({
  secret: process.env.SESSION_SECRET || 'kasrah-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Middleware للتعامل مع اللغات
app.use((req, res, next) => {
  let lang = req.query.lang || req.headers['accept-language']?.split(',')[0]?.split('-')[0] || req.session?.language || DEFAULT_LANGUAGE;
  
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    lang = DEFAULT_LANGUAGE;
  }
  
  if (req.session) {
    req.session.language = lang;
  }
  
  req.language = lang;
  
  if (lang === 'ar') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Language', 'ar');
  }
  
  next();
});

// Middleware للتحقق من تسجيل الدخول
function requireAuth(req, res, next) {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
  }
}

// دالة مساعدة للتعامل مع قاعدة البيانات
async function executeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error) {
    console.error('خطأ في قاعدة البيانات:', error);
    throw error;
  }
}

// دالة جلب إعدادات الموقع
async function getSiteSettings() {
  try {
    const result = await executeQuery('SELECT * FROM site_settings LIMIT 1');
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return {
      site_name: 'كسرة - Kasrah',
      site_description: 'موقع رياضي متعدد اللغات',
      primary_color: '#1e3a8a',
      secondary_color: '#3b82f6'
    };
  } catch (error) {
    console.error('خطأ في جلب إعدادات الموقع:', error);
    return {
      site_name: 'كسرة - Kasrah',
      site_description: 'موقع رياضي متعدد اللغات',
      primary_color: '#1e3a8a',
      secondary_color: '#3b82f6'
    };
  }
}

// API للمقالات
app.get('/api/articles', async (req, res) => {
  try {
    const { category, exclude, limit } = req.query;
    const lang = req.language || DEFAULT_LANGUAGE;
    
    let query = 'SELECT id, title, title_en, slug, description, description_en, image_url, thumbnail_url, author, published_at, category, language FROM articles WHERE is_published = true';
    let params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (exclude) {
      query += ` AND id != $${paramIndex}`;
      params.push(exclude);
      paramIndex++;
    }

    query += ' ORDER BY published_at DESC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }

    const result = await executeQuery(query, params);
    
    const articles = result.rows.map(article => ({
      ...article,
      title: lang === 'en' && article.title_en ? article.title_en : article.title,
      description: lang === 'en' && article.description_en ? article.description_en : article.description
    }));
    
    res.json(articles);
  } catch (error) {
    console.error('خطأ في جلب المقالات:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/articles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const lang = req.language || DEFAULT_LANGUAGE;
    
    const result = await executeQuery(
      'SELECT * FROM articles WHERE slug = $1 AND is_published = true',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المقال غير موجود' });
    }
    
    const article = result.rows[0];
    
    if (lang === 'en') {
      article.title = article.title_en || article.title;
      article.content = article.content_en || article.content;
      article.description = article.description_en || article.description;
    }
    
    res.json(article);
  } catch (error) {
    console.error('خطأ في جلب المقال:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// API لتغيير اللغة
app.post('/api/change-language', (req, res) => {
  try {
    const { language } = req.body;
    
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ error: 'اللغة غير مدعومة' });
    }
    
    req.session.language = language;
    res.json({ 
      success: true, 
      message: `تم تغيير اللغة إلى ${language === 'ar' ? 'العربية' : 'English'}`,
      language 
    });
  } catch (error) {
    console.error('خطأ في تغيير اللغة:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// API لجلب اللغة الحالية
app.get('/api/current-language', (req, res) => {
  try {
    const currentLanguage = req.session?.language || req.language || DEFAULT_LANGUAGE;
    res.json({ 
      language: currentLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES
    });
  } catch (error) {
    console.error('خطأ في جلب اللغة الحالية:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// API لجلب المقالات حسب اللغة
app.get('/api/articles-by-language/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const { category, limit = 10 } = req.query;
    
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ error: 'اللغة غير مدعومة' });
    }
    
    let query = 'SELECT id, title, title_en, slug, description, description_en, image_url, thumbnail_url, author, published_at, category, language FROM articles WHERE is_published = true';
    let params = [];
    let paramIndex = 1;
    
    query += ` AND (language = $${paramIndex} OR (language IS NULL AND $${paramIndex} = 'ar'))`;
    params.push(language);
    paramIndex++;
    
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    query += ' ORDER BY published_at DESC';
    
    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }
    
    const result = await executeQuery(query, params);
    
    const articles = result.rows.map(article => {
      const isEnglish = language === 'en';
      return {
        ...article,
        title: isEnglish ? (article.title_en || article.title) : (article.title || article.title_en),
        description: isEnglish ? (article.description_en || article.description) : (article.description || article.description_en)
      };
    });
    
    res.json(articles);
  } catch (error) {
    console.error('خطأ في جلب المقالات حسب اللغة:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// تسجيل الدخول للوحة التحكم
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username === process.env.ADMIN_USERNAME && 
        password === process.env.ADMIN_PASSWORD) {
      req.session.isAuthenticated = true;
      res.json({ success: true, message: 'تم تسجيل الدخول بنجاح' });
    } else {
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

// APIs الإدارية (تتطلب تسجيل دخول)
app.get('/api/admin/articles', requireAuth, async (req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM articles ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('خطأ في جلب المقالات:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/admin/articles', requireAuth, async (req, res) => {
  try {
    const { 
      title, title_en, description, description_en, content, content_en,
      slug, category, author, image_url, thumbnail_url, is_published, meta_keywords,
      meta_title, meta_title_en, meta_description, meta_description_en
    } = req.body;
    
    let language = 'ar';
    if (title_en && !title) language = 'en';

    const result = await executeQuery(
      `INSERT INTO articles (
        title, title_en, description, description_en, content, content_en, slug, category, author, 
        image_url, thumbnail_url, is_published, meta_keywords, meta_title, meta_title_en,
        meta_description, meta_description_en, language, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
      RETURNING id`,
      [title, title_en, description, description_en, content, content_en, slug, category, author,
       image_url, thumbnail_url, is_published, meta_keywords, meta_title, meta_title_en,
       meta_description, meta_description_en, language, new Date()]
    );
    
    res.json({ success: true, id: result.rows[0].id, message: 'تم إضافة المقال بنجاح' });
  } catch (error) {
    console.error('خطأ في إضافة المقال:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.put('/api/admin/articles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, title_en, description, description_en, content, content_en,
      slug, category, author, image_url, thumbnail_url, is_published, meta_keywords,
      meta_title, meta_title_en, meta_description, meta_description_en
    } = req.body;
    
    let language = 'ar';
    if (title_en && !title) language = 'en';

    await executeQuery(
      `UPDATE articles SET 
        title = $1, title_en = $2, description = $3, description_en = $4, content = $5, content_en = $6,
        slug = $7, category = $8, author = $9, image_url = $10, thumbnail_url = $11, 
        is_published = $12, meta_keywords = $13, meta_title = $14, meta_title_en = $15,
        meta_description = $16, meta_description_en = $17, language = $18, updated_at = $19
      WHERE id = $20`,
      [title, title_en, description, description_en, content, content_en, slug, category, author,
       image_url, thumbnail_url, is_published, meta_keywords, meta_title, meta_title_en,
       meta_description, meta_description_en, language, new Date(), id]
    );
    
    res.json({ success: true, message: 'تم تحديث المقال بنجاح' });
  } catch (error) {
    console.error('خطأ في تحديث المقال:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.delete('/api/admin/articles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery('DELETE FROM articles WHERE id = $1', [id]);
    res.json({ success: true, message: 'تم حذف المقال بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف المقال:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// API لجلب إعدادات الموقع
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSiteSettings();
    res.json(settings);
  } catch (error) {
    console.error('خطأ في جلب الإعدادات:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware للتعامل مع الأخطاء
app.use((err, req, res, next) => {
  console.error('خطأ في الخادم:', err);
  res.status(500).json({ 
    error: 'خطأ في الخادم',
    message: process.env.NODE_ENV === 'development' ? err.message : 'حدث خطأ غير متوقع'
  });
});

// Middleware للتعامل مع الصفحات غير الموجودة
app.use((req, res) => {
  res.status(404).json({ 
    error: 'الصفحة غير موجودة',
    message: 'عذراً، الصفحة المطلوبة غير موجودة'
  });
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗣️ Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// إغلاق الاتصال بقاعدة البيانات عند إغلاق التطبيق
process.on('SIGINT', async () => {
  console.log('📋 Closing database connection...');
  await pool.end();
  console.log('👋 Backend server stopped');
  process.exit(0);
});

module.exports = { app, executeQuery, getSiteSettings };