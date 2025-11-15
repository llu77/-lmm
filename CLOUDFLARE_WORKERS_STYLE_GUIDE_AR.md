# دليل نمط Cloudflare Workers

## نظرة عامة

هذا الدليل يشرح كيفية كتابة Cloudflare Workers متوافقة تمامًا مع معايير Cloudflare الرسمية، بناءً على النمط المعتمد في `@cloudflare/workers-types`.

---

## 📋 النمط الأساسي

### البنية القياسية

```typescript
// src/index.ts
export default {
  async fetch(request, env, ctx) {
    return new Response('Hello World');
  }
};
```

### مع TypeScript

```typescript
import type { Env, ExecutionContext } from './types/cloudflare';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return new Response('Hello World');
  }
};
```

---

## 🔧 المعاملات الثلاثة الأساسية

### 1. `request: Request`
كائن الطلب القياسي من Web API

```typescript
const url = new URL(request.url);
const method = request.method;
const headers = request.headers;
const body = await request.json();
```

### 2. `env: Env`
البيئة والربوط (bindings)

```typescript
interface Env {
  KV: KVNamespace;          // KV namespace
  DB: D1Database;           // D1 database
  BUCKET: R2Bucket;         // R2 storage
  AI: Ai;                   // AI binding
  ENVIRONMENT: string;      // Environment variable
}
```

### 3. `ctx: ExecutionContext`
سياق التنفيذ

```typescript
// إطالة عمر Worker
ctx.waitUntil(someAsyncOperation());

// السماح بتمرير الطلب عند حدوث استثناء
ctx.passThroughOnException();
```

---

## 💾 استخدام KV Namespace

### الكتابة

```typescript
await env.KV.put("key", "value");

// مع خيارات
await env.KV.put("key", "value", {
  expirationTtl: 60,  // 60 ثانية
  metadata: { user: "admin" }
});
```

### القراءة

```typescript
// كنص
const value = await env.KV.get("key");

// كـ JSON
const data = await env.KV.get("key", "json");

// كـ ArrayBuffer
const buffer = await env.KV.get("key", "arrayBuffer");

// مع metadata
const { value, metadata } = await env.KV.getWithMetadata("key");
```

### الحذف

```typescript
await env.KV.delete("key");
```

### السرد

```typescript
const { keys } = await env.KV.list();
const { keys, cursor } = await env.KV.list({ 
  prefix: "user:",
  limit: 10 
});
```

---

## 🗄️ استخدام D1 Database

### الاستعلام

```typescript
// استعلام بسيط
const { results } = await env.DB
  .prepare("SELECT * FROM users WHERE id = ?")
  .bind(userId)
  .all();

// صف واحد
const user = await env.DB
  .prepare("SELECT * FROM users WHERE id = ?")
  .bind(userId)
  .first();

// تنفيذ (INSERT, UPDATE, DELETE)
const result = await env.DB
  .prepare("INSERT INTO users (name, email) VALUES (?, ?)")
  .bind(name, email)
  .run();
```

### Batch Operations

```typescript
const results = await env.DB.batch([
  env.DB.prepare("INSERT INTO users (name) VALUES (?)").bind("Ahmed"),
  env.DB.prepare("INSERT INTO users (name) VALUES (?)").bind("Sara"),
  env.DB.prepare("SELECT * FROM users")
]);
```

---

## 📦 استخدام R2 Storage

### القراءة

```typescript
const object = await env.BUCKET.get("file.txt");

if (object === null) {
  return new Response("Object Not Found", { status: 404 });
}

const headers = new Headers();
object.writeHttpMetadata(headers);
headers.set("etag", object.httpEtag);

return new Response(object.body, { headers });
```

### الكتابة

```typescript
await env.BUCKET.put("file.txt", "Hello World");

// مع metadata
await env.BUCKET.put("file.txt", fileData, {
  httpMetadata: {
    contentType: "text/plain",
    contentLanguage: "ar-SA"
  },
  customMetadata: {
    author: "Ahmed"
  }
});
```

### الحذف

```typescript
await env.BUCKET.delete("file.txt");
```

### السرد

```typescript
const listed = await env.BUCKET.list({
  prefix: "images/",
  limit: 100
});
```

---

## 🔀 أنماط التوجيه (Routing)

### توجيه بسيط

```typescript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case "/":
        return new Response("Home");
      case "/api/users":
        return handleUsers(request, env);
      default:
        return new Response("Not Found", { status: 404 });
    }
  }
};
```

### توجيه حسب Method

```typescript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === "/api/users") {
      switch (request.method) {
        case "GET":
          return getUsers(env);
        case "POST":
          return createUser(request, env);
        case "PUT":
          return updateUser(request, env);
        case "DELETE":
          return deleteUser(request, env);
        default:
          return new Response("Method Not Allowed", { status: 405 });
      }
    }
    
    return new Response("Not Found", { status: 404 });
  }
};
```

---

## 🔐 معالجة الأخطاء

### النمط الموصى به

```typescript
export default {
  async fetch(request, env, ctx) {
    try {
      // معالجة الطلب
      const data = await processRequest(request, env);
      
      return new Response(
        JSON.stringify(data),
        { 
          headers: { "content-type": "application/json" }
        }
      );
    } catch (error) {
      console.error("Error processing request:", error);
      
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error"
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" }
        }
      );
    }
  }
};
```

---

## 🌐 CORS Headers

```typescript
// CORS middleware
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

export default {
  async fetch(request, env, ctx) {
    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }
    
    // Handle actual request
    const response = await handleRequest(request, env);
    
    // Add CORS headers
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders()).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });
  }
};
```

---

## ⏰ Scheduled Events (Cron)

```typescript
export default {
  async fetch(request, env, ctx) {
    return new Response("Worker running");
  },
  
  async scheduled(event, env, ctx) {
    // يتم تنفيذه حسب الجدول المحدد في wrangler.toml
    console.log("Cron triggered at:", new Date(event.scheduledTime));
    
    // مثال: تنظيف البيانات القديمة
    const keys = await env.KV.list();
    // معالجة التنظيف...
    
    // استخدام waitUntil لإطالة عمر Worker
    ctx.waitUntil(cleanupOldData(env));
  }
};
```

تكوين في `wrangler.toml`:

```toml
[triggers]
crons = ["0 0 * * *"]  # كل يوم في منتصف الليل
```

---

## 📨 Queue Consumers

```typescript
export default {
  async fetch(request, env, ctx) {
    // إرسال رسالة إلى Queue
    await env.MY_QUEUE.send({
      type: "email",
      to: "user@example.com",
      subject: "مرحباً"
    });
    
    return new Response("Message queued");
  },
  
  async queue(batch, env, ctx) {
    // معالجة الرسائل من Queue
    for (const message of batch.messages) {
      console.log("Processing:", message.body);
      
      try {
        await processMessage(message.body);
        message.ack();  // تأكيد المعالجة
      } catch (error) {
        message.retry();  // إعادة المحاولة
      }
    }
  }
};
```

---

## 🔑 أفضل الممارسات

### 1. استخدام TypeScript

```typescript
import type { Env, ExecutionContext } from './types/cloudflare';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // كود مُنظَّم ومُختبَر
  }
};
```

### 2. فصل المنطق

```typescript
// handlers/users.ts
export async function getUsers(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT * FROM users").all();
  return new Response(JSON.stringify(results), {
    headers: { "content-type": "application/json" }
  });
}

// index.ts
import { getUsers } from './handlers/users';

export default {
  async fetch(request, env, ctx) {
    if (request.url.includes("/api/users")) {
      return getUsers(env);
    }
    return new Response("Not Found", { status: 404 });
  }
};
```

### 3. استخدام waitUntil للعمليات الطويلة

```typescript
export default {
  async fetch(request, env, ctx) {
    // معالجة فورية
    const response = new Response("Request received");
    
    // عملية طويلة في الخلفية
    ctx.waitUntil(
      logToAnalytics(request, env)
    );
    
    return response;
  }
};
```

### 4. التعامل مع Environment Variables

```typescript
export default {
  async fetch(request, env, ctx) {
    const isProduction = env.ENVIRONMENT === "production";
    const apiKey = env.API_KEY;
    
    if (!apiKey) {
      return new Response("Missing API key", { status: 500 });
    }
    
    // استخدام المتغيرات
  }
};
```

---

## 📚 موارد إضافية

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Workers Types GitHub](https://github.com/cloudflare/workers-types)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Workers Examples](https://developers.cloudflare.com/workers/examples/)

---

## ✅ خلاصة

- ✅ استخدم النمط القياسي `export default { async fetch() {} }`
- ✅ المعاملات الثلاثة: `request`, `env`, `ctx`
- ✅ معالجة الأخطاء بشكل صحيح
- ✅ استخدام TypeScript للأمان
- ✅ فصل المنطق والتنظيم
- ✅ اتباع أفضل الممارسات

---

**تم الإعداد بواسطة:** فريق التطوير  
**التاريخ:** 2025-11-15  
**الإصدار:** 1.0
