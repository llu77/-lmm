# 📧 دليل ربط Email System بـ Zapier كوكيل

## 🎯 **نظرة عامة**

تم ربط نظام البريد الإلكتروني بـ Zapier! الآن عند كل إرسال إيميل، يتم:
1. ✅ إرسال webhook إلى Zapier تلقائياً
2. ✅ Zapier يمكنه إرسال الإيميل عبر Gmail أو أي خدمة أخرى
3. ✅ Zapier يمكنه تنفيذ أي إجراء آخر (حفظ في Google Sheets، إشعار Slack، إلخ)

---

## 🔧 **ما تم إضافته:**

### **1. في Backend:**

**File:** [`convex/zapier.ts`](file://convex/zapier.ts)
- ✅ `triggerEmailWebhook` - function جديدة لإرسال email webhook

**File:** [`convex/emailSystem.ts`](file://convex/emailSystem.ts)
- ✅ تحديث `sendEmail` - يرسل webhook قبل إرسال الإيميل
- ✅ تحديث `sendTemplateEmail` - يرسل webhook قبل إرسال الإيميل

---

## 📊 **كيف يعمل:**

```
1. النظام يرسل إيميل
   ↓
2. يتم إرسال webhook إلى Zapier تلقائياً
   Payload:
   {
     type: "email_request",
     to: ["user@example.com"],
     subject: "الموضوع",
     html: "<html>محتوى الإيميل</html>",
     from: "Symbol AI <noreply@symbolai.com>",
     timestamp: "2025-01-20T12:00:00Z",
     source: "Email System"
   }
   ↓
3. Zapier يستقبل الـ webhook
   ↓
4. Zapier يقوم بأحد هذه الخيارات:
   ✅ إرسال الإيميل عبر Gmail
   ✅ إرسال الإيميل عبر Outlook
   ✅ حفظ تفاصيل الإيميل في Google Sheets
   ✅ إرسال إشعار إلى Slack
   ✅ أي إجراء آخر تريده!
   ↓
5. في نفس الوقت، النظام يرسل الإيميل عبر Resend (parallel)
```

---

## 🚀 **Setup: إنشاء Zap جديد**

### **الطريقة الأولى: إرسال إيميل عبر Gmail**

#### **Step 1: إنشاء Webhook في Zapier**

1. اذهب إلى [zapier.com](https://zapier.com)
2. Create New Zap
3. **Trigger:**
   - App: Webhooks by Zapier
   - Event: Catch Hook
   - Click Continue
   - سينشئ لك Webhook URL مثل:
     ```
     https://hooks.zapier.com/hooks/catch/xxxxx/yyyyyy/
     ```

#### **Step 2: إضافة Webhook في النظام**

1. اذهب إلى [`/system-support`](link://system-support)
2. اضغط تاب "Zapier"
3. اضغط "إضافة Webhook"
4. املأ البيانات:
   - **الاسم:** Email Agent
   - **Webhook URL:** [الصقه من Zapier]
   - **Event Type:** `email_request`
   - **الوصف:** إرسال الإيميلات عبر Gmail

#### **Step 3: إعداد Gmail Action**

1. في Zapier، اضغط "+"
2. **Action:**
   - App: Gmail
   - Event: Send Email
3. Connect Gmail Account
4. Map Fields:
   - To: (من Webhook) `data__to__0` (أول مستلم)
   - Subject: (من Webhook) `data__subject`
   - Body Type: HTML
   - Body: (من Webhook) `data__html`

#### **Step 4: اختبار**

1. في النظام، اذهب [`/system-support`](link://system-support) → تاب "إرسال بريد"
2. أرسل إيميل تجريبي
3. تحقق من:
   - ✅ Zapier استقبل الـ webhook
   - ✅ Gmail أرسل الإيميل
   - ✅ Resend أرسل الإيميل أيضاً

---

### **الطريقة الثانية: إرسال إيميل عبر Outlook**

نفس الخطوات لكن في Step 3:
- App: Microsoft Outlook
- Event: Send Email

---

### **الطريقة الثالثة: حفظ في Google Sheets**

#### **Step 3: إعداد Google Sheets Action**

1. في Zapier، اضغط "+"
2. **Action:**
   - App: Google Sheets
   - Event: Create Spreadsheet Row
3. Connect Google Sheets Account
4. Select Spreadsheet & Sheet
5. Map Fields:
   - Column A: (من Webhook) `data__to__0`
   - Column B: (من Webhook) `data__subject`
   - Column C: (من Webhook) `data__timestamp`
   - Column D: (من Webhook) `data__source`

---

### **الطريقة الرابعة: إشعار Slack**

#### **Step 3: إعداد Slack Action**

1. في Zapier، اضغط "+"
2. **Action:**
   - App: Slack
   - Event: Send Channel Message
3. Connect Slack Account
4. Select Channel
5. Message Text:
   ```
   🔔 إيميل جديد تم إرساله!
   
   إلى: {{data__to__0}}
   الموضوع: {{data__subject}}
   الوقت: {{data__timestamp}}
   ```

---

## 📋 **Webhook Payload Structure:**

عند إرسال إيميل، يتم إرسال هذا الـ payload إلى Zapier:

```json
{
  "event": "email_request",
  "timestamp": "2025-01-20T12:00:00.000Z",
  "data": {
    "type": "email_request",
    "to": ["user1@example.com", "user2@example.com"],
    "subject": "مسير رواتب - يناير 2025",
    "html": "<html><body>محتوى الإيميل...</body></html>",
    "from": "Symbol AI <noreply@symbolai.com>",
    "timestamp": "2025-01-20T12:00:00.000Z",
    "source": "Email System"
  }
}
```

### **الحقول:**

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `event` | string | نوع الحدث (دائماً "email_request") |
| `timestamp` | string | وقت إرسال الـ webhook |
| `data.type` | string | نوع الطلب (دائماً "email_request") |
| `data.to` | array | قائمة المستلمين |
| `data.subject` | string | موضوع الإيميل |
| `data.html` | string | محتوى الإيميل (HTML) |
| `data.from` | string | المرسل |
| `data.source` | string | المصدر (دائماً "Email System") |

---

## 🎯 **حالات الاستخدام:**

### **1. إرسال مسير الرواتب عبر Gmail:**

```
Trigger: Webhook (email_request)
Filter: data__subject يحتوي على "مسير رواتب"
Action: Gmail - Send Email
```

### **2. حفظ كل الإيميلات في Google Sheets:**

```
Trigger: Webhook (email_request)
Action: Google Sheets - Create Row
```

### **3. إشعار Slack عند إرسال إيميل مهم:**

```
Trigger: Webhook (email_request)
Filter: data__subject يحتوي على "عاجل"
Action: Slack - Send Message
```

### **4. Forward إلى إيميل المدير:**

```
Trigger: Webhook (email_request)
Action: Gmail - Forward Email to manager@company.com
```

---

## 🔍 **Testing:**

### **اختبار سريع:**

1. اذهب [`/system-support`](link://system-support) → تاب "إرسال بريد"
2. أرسل إيميل تجريبي:
   - المستلم: your-email@example.com
   - الموضوع: Test Email via Zapier
   - المحتوى: مرحباً من Symbol AI!
3. تحقق من:
   - ✅ Zapier Dashboard - Task History
   - ✅ Gmail - Sent folder
   - ✅ Inbox - استلمت الإيميل؟

---

## 📊 **Monitoring:**

### **في النظام:**

1. اذهب [`/system-support`](link://system-support) → تاب "Zapier"
2. شاهد:
   - عدد المرات التي تم إطلاق الـ webhook
   - آخر مرة تم الإطلاق
   - السجل الكامل

### **في Zapier:**

1. اذهب Zapier Dashboard → Zap History
2. شاهد:
   - كل webhook تم استقباله
   - هل نجح أم فشل
   - التفاصيل الكاملة

---

## ⚙️ **Advanced Setup:**

### **إرسال فقط عبر Zapier (تعطيل Resend):**

إذا كنت تريد إرسال الإيميلات فقط عبر Zapier (بدون Resend):

1. احذف أو علق الكود في `convex/emailSystem.ts`:
```typescript
// Comment out Resend part
/*
const resend = new Resend(resendApiKey);
const result = await resend.emails.send({...});
*/
```

2. أو أضف شرط:
```typescript
const sendViaResend = process.env.USE_RESEND === "true";
if (sendViaResend) {
  // Send via Resend
}
```

---

## 📁 **الملفات المُعدلة:**

1. ✅ [`convex/zapier.ts`](file://convex/zapier.ts) - أضيف `triggerEmailWebhook`
2. ✅ [`convex/emailSystem.ts`](file://convex/emailSystem.ts) - أضيف webhook triggers

---

## 🎉 **الفوائد:**

```
✅ مرونة كاملة في إرسال الإيميلات
✅ إمكانية استخدام Gmail الخاص بك
✅ حفظ سجل في Google Sheets تلقائياً
✅ إشعارات Slack فورية
✅ تكامل مع 5000+ app
✅ no-code automation
✅ easy monitoring
```

---

## 🚀 **جاهز للاستخدام!**

**الآن كل إيميل يُرسل من النظام سيُرسل webhook إلى Zapier تلقائياً!**

**أنشئ Zap الآن:** [zapier.com/app/zaps](https://zapier.com/app/zaps)

---

**📧 Email System + Zapier = Perfect Email Agent!** 🎉
