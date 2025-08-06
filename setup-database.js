require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function setupDatabase() {
  try {
    console.log('🔗 جاري الاتصال بقاعدة البيانات...');
    
    // إنشاء جدول المقالات مع حقول SEO ودعم اللغات
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        title_en VARCHAR(255),
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        content_en TEXT,
        description TEXT,
        description_en TEXT,
        meta_title VARCHAR(255),
        meta_title_en VARCHAR(255),
        meta_description TEXT,
        meta_description_en TEXT,
        meta_keywords TEXT,
        image_url VARCHAR(500),
        thumbnail_url VARCHAR(500),
        author VARCHAR(100) DEFAULT 'كسرة - Kasrah',
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_published BOOLEAN DEFAULT true,
        category VARCHAR(100) DEFAULT 'رياضة',
        language VARCHAR(10) DEFAULT 'ar'
      );
    `;

    await pool.query(createTableQuery);
    console.log('✅ تم إنشاء جدول المقالات بنجاح');

    // إضافة الأعمدة المفقودة إذا لم تكن موجودة
    const addMissingColumns = `
      DO $$ 
      BEGIN 
        -- إضافة عمود title_en إذا لم يكن موجوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'title_en') THEN
          ALTER TABLE articles ADD COLUMN title_en VARCHAR(255);
        END IF;
        
        -- إضافة عمود content_en إذا لم يكن موجوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'content_en') THEN
          ALTER TABLE articles ADD COLUMN content_en TEXT;
        END IF;
        
        -- إضافة عمود description_en إذا لم يكن موجوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'description_en') THEN
          ALTER TABLE articles ADD COLUMN description_en TEXT;
        END IF;
        
        -- إضافة عمود meta_title_en إذا لم يكن موجوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'meta_title_en') THEN
          ALTER TABLE articles ADD COLUMN meta_title_en VARCHAR(255);
        END IF;
        
        -- إضافة عمود meta_description_en إذا لم يكن موجوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'meta_description_en') THEN
          ALTER TABLE articles ADD COLUMN meta_description_en TEXT;
        END IF;
        
        -- إضافة عمود meta_title إذا لم يكن موجوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'meta_title') THEN
          ALTER TABLE articles ADD COLUMN meta_title VARCHAR(255);
        END IF;
        
        -- إضافة عمود meta_description إذا لم يكن موجوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'meta_description') THEN
          ALTER TABLE articles ADD COLUMN meta_description TEXT;
        END IF;
        
        -- إضافة عمود meta_keywords إذا لم يكن موجوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'meta_keywords') THEN
          ALTER TABLE articles ADD COLUMN meta_keywords TEXT;
        END IF;
        
        -- إضافة عمود thumbnail_url إذا لم يكن موجوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'thumbnail_url') THEN
          ALTER TABLE articles ADD COLUMN thumbnail_url VARCHAR(500);
        END IF;
        
        -- إضافة عمود language إذا لم يكن موجوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'language') THEN
          ALTER TABLE articles ADD COLUMN language VARCHAR(10) DEFAULT 'ar';
        END IF;

        -- إضافة عمود created_at إذا لم يكن موجوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'created_at') THEN
          ALTER TABLE articles ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `;

    await pool.query(addMissingColumns);
    console.log('✅ تم إضافة الأعمدة المفقودة بنجاح');

    // إنشاء جدول المستخدمين (للوحة التحكم)
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createUsersTableQuery);
    console.log('✅ تم إنشاء جدول المستخدمين بنجاح');

    // إنشاء جدول إعدادات الموقع
    const createSettingsTableQuery = `
      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        site_name VARCHAR(255) DEFAULT 'كسرة - Kasrah',
        site_description TEXT DEFAULT 'موقع رياضي متعدد اللغات',
        site_keywords TEXT DEFAULT 'رياضة, كرة القدم, أخبار رياضية',
        site_logo VARCHAR(500),
        site_favicon VARCHAR(500),
        primary_color VARCHAR(10) DEFAULT '#1e3a8a',
        secondary_color VARCHAR(10) DEFAULT '#3b82f6',
        accent_color VARCHAR(10) DEFAULT '#f59e0b',
        default_language VARCHAR(5) DEFAULT 'ar',
        google_analytics_id VARCHAR(50),
        facebook_url VARCHAR(255),
        twitter_url VARCHAR(255),
        instagram_url VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createSettingsTableQuery);
    console.log('✅ تم إنشاء جدول إعدادات الموقع بنجاح');

    // إنشاء جدول الإعلانات
    const createAdsTableQuery = `
      CREATE TABLE IF NOT EXISTS advertisements (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        ad_code TEXT NOT NULL,
        position VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createAdsTableQuery);
    console.log('✅ تم إنشاء جدول الإعلانات بنجاح');

    // إنشاء جدول الإحصائيات
    const createStatsTableQuery = `
      CREATE TABLE IF NOT EXISTS page_statistics (
        id SERIAL PRIMARY KEY,
        page_path VARCHAR(500) NOT NULL,
        page_type VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        views_count INTEGER DEFAULT 0,
        unique_visitors INTEGER DEFAULT 0,
        last_visited TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(page_path)
      );
    `;

    await pool.query(createStatsTableQuery);
    console.log('✅ تم إنشاء جدول الإحصائيات بنجاح');

    // إنشاء جدول زيارات الصفحات
    const createVisitsTableQuery = `
      CREATE TABLE IF NOT EXISTS page_visits (
        id SERIAL PRIMARY KEY,
        page_path VARCHAR(500) NOT NULL,
        page_type VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        visitor_ip VARCHAR(45),
        user_agent TEXT,
        referrer VARCHAR(500),
        session_id VARCHAR(255),
        language VARCHAR(5) DEFAULT 'ar',
        visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createVisitsTableQuery);
    console.log('✅ تم إنشاء جدول زيارات الصفحات بنجاح');

    // إضافة فهارس للأداء
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
      CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published);
      CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(language);
      CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
      CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
      CREATE INDEX IF NOT EXISTS idx_page_visits_date ON page_visits(visit_date);
      CREATE INDEX IF NOT EXISTS idx_page_visits_path ON page_visits(page_path);
    `;

    await pool.query(createIndexes);
    console.log('✅ تم إنشاء الفهارس بنجاح');

    // إضافة بيانات أولية للمقالات
    const insertSampleArticles = `
      INSERT INTO articles (
        title, title_en, slug, content, content_en, description, description_en, 
        meta_title, meta_title_en, meta_description, meta_description_en, meta_keywords, 
        image_url, thumbnail_url, author, category, language
      ) VALUES
      (
        'الدوري السعودي 2025: منافسة شرسة بين الأندية', 
        'Saudi League 2025: Fierce Competition Between Clubs', 
        'saudi-league-2025', 
        '<h2>الدوري السعودي 2025</h2><p>يشهد الدوري السعودي منافسة شرسة هذا الموسم بين الأندية الكبرى. تتنافس الفرق على اللقب بقوة وحماس كبير.</p><p>من المتوقع أن يكون هذا الموسم من أقوى المواسم في تاريخ الدوري السعودي.</p>', 
        '<h2>Saudi League 2025</h2><p>The Saudi League is witnessing fierce competition this season between major clubs. Teams are competing for the title with great strength and enthusiasm.</p><p>This season is expected to be one of the strongest in Saudi League history.</p>',
        'منافسة شرسة في الدوري السعودي هذا الموسم بين الأندية الكبرى', 
        'Fierce competition in the Saudi League this season between major clubs',
        'الدوري السعودي 2025 - منافسة شرسة بين الأندية',
        'Saudi League 2025 - Fierce Competition Between Clubs',
        'يشهد الدوري السعودي منافسة شرسة هذا الموسم بين الأندية الكبرى. تعرف على آخر التطورات والنتائج.',
        'The Saudi League is witnessing fierce competition this season between major clubs. Learn about the latest developments and results.',
        'الدوري السعودي, كرة القدم, الأندية السعودية, 2025, رياضة',
        'https://via.placeholder.com/800x400/1e3a8a/ffffff?text=الدوري+السعودي', 
        'https://via.placeholder.com/300x200/1e3a8a/ffffff?text=الدوري+السعودي',
        'كسرة - Kasrah', 'رياضة', 'ar'
      ),
      (
        'كأس العالم 2026: التحضيرات في أمريكا وكندا والمكسيك', 
        'World Cup 2026: Preparations in USA, Canada and Mexico', 
        'world-cup-2026-preparations', 
        '<h2>كأس العالم 2026</h2><p>تستمر التحضيرات لكأس العالم 2026 في الولايات المتحدة وكندا والمكسيك. هذا سيكون أول كأس عالم يقام في ثلاث دول.</p><p>من المتوقع أن يشارك 48 منتخباً في هذه البطولة التاريخية.</p>', 
        '<h2>World Cup 2026</h2><p>Preparations continue for the 2026 World Cup in the United States, Canada and Mexico. This will be the first World Cup held in three countries.</p><p>48 national teams are expected to participate in this historic tournament.</p>',
        'التحضيرات مستمرة لكأس العالم 2026 في ثلاث دول', 
        'Preparations continue for the 2026 World Cup in three countries',
        'كأس العالم 2026 - التحضيرات في أمريكا وكندا والمكسيك',
        'World Cup 2026 - Preparations in USA, Canada and Mexico',
        'التحضيرات مستمرة لكأس العالم 2026 في الولايات المتحدة وكندا والمكسيك. تعرف على آخر الاستعدادات.',
        'Preparations continue for the 2026 World Cup in the United States, Canada and Mexico. Learn about the latest preparations.',
        'كأس العالم, 2026, فيفا, أمريكا, كندا, المكسيك, كرة القدم',
        'https://via.placeholder.com/800x400/3b82f6/ffffff?text=كأس+العالم+2026', 
        'https://via.placeholder.com/300x200/3b82f6/ffffff?text=كأس+العالم+2026',
        'كسرة - Kasrah', 'عالمية', 'ar'
      )
      ON CONFLICT (slug) DO NOTHING;
    `;

    await pool.query(insertSampleArticles);
    console.log('✅ تم إضافة المقالات التجريبية بنجاح');

    // إضافة إعدادات الموقع الافتراضية
    const insertDefaultSettings = `
      INSERT INTO site_settings (
        site_name, site_description, site_keywords, primary_color, secondary_color, 
        accent_color, default_language
      ) VALUES (
        'كسرة - Kasrah', 
        'موقع رياضي متعدد اللغات متخصص في الأخبار والتحليلات الرياضية', 
        'رياضة, كرة القدم, أخبار رياضية, تحليلات, كسرة', 
        '#1e3a8a', '#3b82f6', '#f59e0b', 'ar'
      )
      ON CONFLICT DO NOTHING;
    `;

    await pool.query(insertDefaultSettings);
    console.log('✅ تم إضافة إعدادات الموقع الافتراضية بنجاح');

    console.log('🎉 تم إعداد قاعدة البيانات بنجاح!');
    console.log('📊 يمكنك الآن تشغيل الخادم باستخدام: npm start');
    
  } catch (error) {
    console.error('❌ خطأ في إعداد قاعدة البيانات:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// تشغيل فقط إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };