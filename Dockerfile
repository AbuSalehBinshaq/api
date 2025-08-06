# استخدام Node.js الرسمي كصورة أساسية
FROM node:18-alpine

# تعيين مجلد العمل
WORKDIR /app

# نسخ ملفات package
COPY package*.json ./

# تثبيت التبعيات
RUN npm ci --only=production

# نسخ الكود المصدري
COPY . .

# إنشاء مستخدم غير جذر
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# تغيير الملكية إلى المستخدم الجديد
RUN chown -R nodejs:nodejs /app
USER nodejs

# كشف المنفذ
EXPOSE 3000

# فحص الصحة
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# تشغيل التطبيق
CMD ["npm", "start"]