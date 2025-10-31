# Cloudflare Worker - Hello World

Worker بسيط يرد بـ "Hello World" على أي طلب HTTP.

## 📋 المتطلبات

1. حساب Cloudflare (مجاني)
2. تثبيت Wrangler CLI

## 🚀 التثبيت والنشر

### 1. تثبيت Wrangler
```bash
npm install -g wrangler
```

### 2. تسجيل الدخول إلى Cloudflare
```bash
wrangler login
```

### 3. الحصول على Account ID
```bash
wrangler whoami
```
انسخ الـ Account ID وضعه في ملف `wrangler.toml`

### 4. التجربة محلياً
```bash
cd cloudflare-worker
wrangler dev
```

سيعمل Worker على: http://localhost:8787

### 5. النشر إلى Cloudflare
```bash
wrangler deploy
```

## 📝 ملاحظات

- Worker يدعم جميع HTTP methods (GET, POST, PUT, DELETE, etc.)
- يمكنك تعديل الرد في ملف `index.ts`
- Worker مجاني حتى 100,000 طلب يومياً

## 🔧 التطوير

لتعديل Worker، غير محتوى ملف `index.ts`:

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    // أضف منطقك هنا
    return new Response('Your custom response');
  },
};
```

## 🌐 بعد النشر

بعد النشر، ستحصل على رابط مثل:
```
https://hello-world-worker.your-subdomain.workers.dev
```
