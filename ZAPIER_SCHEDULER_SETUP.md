# 🔗 Zapier Integration + Scheduled Jobs Setup

## ✅ ما تم إنجازه

### 1. Print Button Triggers ✅
**الموقع:** `src/pages/revenues/page.tsx`

كل زر طباعة الآن يُرسل webhook إلى Zapier تلقائياً:
- زر "تصدير PDF"
- زر "طباعة"

**Payload Example:**
```json
{
  "eventType": "pdf_generated",
  "payload": {
    "type": "revenue_report_export",
    "branchName": "الفرع الرئيسي",
    "month": 12,
    "year": 2025,
    "totalCash": 50000,
    "totalNetwork": 30000,
    "totalBudget": 20000,
    "grandTotal": 100000,
    "recordCount": 25
  }
}
```

### 2. Scheduled Jobs System ✅
**الملف:** `convex/clearRevenues.ts`

تم إنشاء نظام جدولة شامل:

#### A. Daily Task - 3:00 AM
```javascript
dailyTask3AM()
```
**يفعل:**
- حذف الإشعارات منتهية الصلاحية
- إرسال تقرير يومي إلى Zapier
- جدولة المهمة التالية تلقائياً

#### B. Monthly Task - 1st at 12:00 PM
```javascript
monthlyTask1st()
```
**يفعل:**
- إنشاء نسخة احتياطية شهرية
- إرسال تقرير شهري إلى Zapier
- جدولة المهمة التالية تلقائياً

#### C. Initialize Scheduling
```javascript
initializeScheduling()
```
**تفعيل النظام للمرة الأولى**

---

## 🚀 Setup Instructions

### Option 1: Convex Scheduled Functions (المدمج)

#### 1. تفعيل النظام
```bash
# في Convex Dashboard
# Run this mutation once:
internal.clearRevenues.initializeScheduling()
```

**هذا سيبدأ:**
- Daily task كل 24 ساعة الساعة 3 صباحاً
- Monthly task كل شهر في اليوم الأول الساعة 12 ظهراً

#### 2. الإيجابيات
✅ مدمج في النظام
✅ لا يحتاج external service
✅ يعمل تلقائياً

#### 3. السلبيات
❌ Convex scheduler ليس cron حقيقي
❌ يحتاج إلى re-schedule بعد كل run

---

### Option 2: Zapier Schedule (الموصى به للإنتاج)

#### Setup Daily Task (3:00 AM)

**1. إنشاء Zap جديد:**
```
Trigger: Schedule by Zapier
  - Every Day
  - Time: 3:00 AM
  - Timezone: Asia/Riyadh

Action: Webhooks by Zapier
  - POST Request
  - URL: https://hooks.zapier.com/hooks/catch/4045e58858fec2e48109352fcd71ead5/
  - Payload Type: JSON
  - Data:
    {
      "eventType": "daily_task_3am",
      "timestamp": "{{zap_meta_human_now}}",
      "source": "zapier_schedule"
    }
```

#### Setup Monthly Task (1st @ 12:00 PM)

**2. إنشاء Zap آخر:**
```
Trigger: Schedule by Zapier
  - Every Month
  - Day: 1
  - Time: 12:00 PM
  - Timezone: Asia/Riyadh

Action: Webhooks by Zapier
  - POST Request
  - URL: https://hooks.zapier.com/hooks/catch/4045e58858fec2e48109352fcd71ead5/
  - Payload Type: JSON
  - Data:
    {
      "eventType": "monthly_task_1st",
      "timestamp": "{{zap_meta_human_now}}",
      "source": "zapier_schedule"
    }
```

#### 3. الإيجابيات
✅ Cron حقيقي - دقيق جداً
✅ لا يحتاج re-scheduling
✅ سهل إدارته من Zapier dashboard
✅ يمكن تعديل الأوقات بسهولة

#### 4. السلبيات
❌ يحتاج Zapier account (مجاني للحد المعقول)

---

## 📊 Webhook Events

### Event: `pdf_generated`
**متى:** عند الضغط على زر طباعة/تصدير
```json
{
  "eventType": "pdf_generated",
  "payload": {
    "type": "revenue_report_export|revenue_report_print",
    "branchName": "string",
    "month": number,
    "year": number,
    "totalCash": number,
    "totalNetwork": number,
    "totalBudget": number,
    "grandTotal": number,
    "recordCount": number
  }
}
```

### Event: `daily_task_3am`
**متى:** كل يوم 3:00 AM
```json
{
  "eventType": "daily_task_3am",
  "payload": {
    "timestamp": "ISO date string",
    "type": "daily_task"
  }
}
```

### Event: `monthly_task_1st`
**متى:** أول كل شهر 12:00 PM
```json
{
  "eventType": "monthly_task_1st",
  "payload": {
    "timestamp": "ISO date string",
    "type": "monthly_task",
    "month": number,
    "year": number
  }
}
```

---

## 🎯 Use Cases

### Print Button Webhook
**ماذا يمكنك أن تفعل:**
- إرسال email تلقائي برابط PDF
- حفظ نسخة في Google Drive
- تنبيه Slack channel
- تحديث Google Sheets
- إنشاء ticket في نظام CRM

### Daily 3 AM Task
**ماذا يمكنك أن تفعل:**
- إرسال summary يومي
- تنظيف البيانات
- backup تلقائي
- إرسال تذكيرات
- تحديث dashboards خارجية

### Monthly 1st Task
**ماذا يمكنك أن تفعل:**
- تقرير شهري كامل
- حساب البونص
- إغلاق الشهر المالي
- archive البيانات
- إرسال فواتير

---

## 🔧 إدارة النظام

### إيقاف Scheduled Jobs مؤقتاً
**في Zapier:** Turn off Zap
**في Convex:** لا حاجة - سينتهي تلقائياً

### تعديل الأوقات
**في Zapier:** Edit Zap → Change schedule
**في Convex:** Edit `convex/clearRevenues.ts` schedules

### مراقبة الأداء
**Zapier:** Task History
**Convex:** Function logs في Dashboard

---

## 🎉 الخلاصة

**تم إنجازه:**
✅ Print buttons ترسل webhooks تلقائياً
✅ Scheduled jobs system كامل
✅ Two scheduling options (Convex + Zapier)
✅ توثيق شامل

**جاهز للعمل:**
- Print triggers تعمل فوراً
- Scheduled jobs تحتاج تفعيل (Option 1 أو 2)

**Recommended:** استخدم Zapier Schedule للإنتاج لأنه أكثر موثوقية ودقة.