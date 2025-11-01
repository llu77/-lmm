/**
 * SymbolAI Email Templates
 * 14 Professional Arabic HTML Email Templates
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
  category: 'requests' | 'orders' | 'payroll' | 'bonus' | 'backup' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Base HTML Template with RTL Support
const BASE_TEMPLATE = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f3f4f6;
      direction: rtl;
      padding: 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .email-header {
      background: {{headerColor}};
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .email-logo {
      margin-bottom: 15px;
    }
    .email-logo img {
      max-width: 120px;
      height: auto;
    }
    .email-logo-text {
      font-size: 28px;
      font-weight: bold;
      color: white;
      margin: 0;
    }
    .email-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }
    .email-content {
      padding: 40px 30px;
      line-height: 1.8;
      color: #374151;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #111827;
    }
    .info-box {
      background: #f9fafb;
      border-right: 4px solid {{accentColor}};
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
    }
    .info-value {
      color: #111827;
      font-weight: 500;
    }
    .button {
      display: inline-block;
      background: {{accentColor}};
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      margin: 20px 0;
      font-weight: 600;
      transition: background 0.3s;
    }
    .button.success {
      background: #10b981;
    }
    .button.danger {
      background: #ef4444;
    }
    .email-footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin: 10px 0;
    }
    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }
    .status-approved {
      background: #d1fae5;
      color: #065f46;
    }
    .status-rejected {
      background: #fee2e2;
      color: #991b1b;
    }
    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="email-logo">
        <img src="{{baseUrl}}/assets/logo-white.svg" alt="Jobfit Community" />
      </div>
      <h1 class="email-title">{{title}}</h1>
    </div>

    <div class="email-content">
      {{content}}
    </div>

    <div class="email-footer">
      <p><strong>Jobfit Community</strong></p>
      <p>منصة إدارة الموارد البشرية الشاملة</p>
      <p style="margin-top: 8px;">info@jobfit.sa | +966 11 XXX XXXX</p>
      <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">
        هذا إيميل تلقائي، يرجى عدم الرد عليه مباشرة
      </p>
    </div>
  </div>
</body>
</html>
`;

function renderBaseTemplate(params: {
  title: string;
  content: string;
  headerColor: string;
  accentColor: string;
  baseUrl?: string;
}): string {
  const baseUrl = params.baseUrl || 'https://your-domain.workers.dev';
  return BASE_TEMPLATE
    .replace('{{title}}', params.title)
    .replace('{{content}}', params.content)
    .replace(/{{headerColor}}/g, params.headerColor)
    .replace(/{{accentColor}}/g, params.accentColor)
    .replace(/{{baseUrl}}/g, baseUrl);
}

// ============================================================================
// TEMPLATE 1: Employee Request Created
// ============================================================================
const EMPLOYEE_REQUEST_CREATED: EmailTemplate = {
  id: 'employee_request_created',
  name: 'طلب موظف جديد',
  subject: '🔔 طلب جديد من {{employeeName}} - {{requestType}}',
  variables: ['employeeName', 'requestType', 'requestDate', 'requestDetails', 'requestId', 'actionUrl'],
  category: 'requests',
  priority: 'high',
  htmlTemplate: '',
  textTemplate: ''
};

EMPLOYEE_REQUEST_CREATED.htmlTemplate = renderBaseTemplate({
  title: 'طلب موظف جديد',
  headerColor: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  accentColor: '#f97316',
  content: `
    <p class="greeting">مرحباً،</p>
    <p>تم استلام طلب جديد من أحد الموظفين يحتاج إلى مراجعتك:</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">اسم الموظف:</span>
        <span class="info-value">{{employeeName}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">نوع الطلب:</span>
        <span class="info-value">{{requestType}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">تاريخ الطلب:</span>
        <span class="info-value">{{requestDate}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم الطلب:</span>
        <span class="info-value">{{requestId}}</span>
      </div>
    </div>

    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="font-weight: 600; color: #92400e; margin-bottom: 10px;">تفاصيل الطلب:</p>
      <p style="color: #92400e;">{{requestDetails}}</p>
    </div>

    <p style="text-align: center;">
      <a href="{{actionUrl}}" class="button">مراجعة الطلب الآن</a>
    </p>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #6b7280;">
      يرجى مراجعة الطلب والرد عليه في أقرب وقت ممكن.
    </p>
  `
});

EMPLOYEE_REQUEST_CREATED.textTemplate = `
طلب موظف جديد

اسم الموظف: {{employeeName}}
نوع الطلب: {{requestType}}
تاريخ الطلب: {{requestDate}}
رقم الطلب: {{requestId}}

تفاصيل الطلب:
{{requestDetails}}

للمراجعة: {{actionUrl}}

SymbolAI Financial System
`;

// ============================================================================
// TEMPLATE 2: Employee Request Responded
// ============================================================================
const EMPLOYEE_REQUEST_RESPONDED: EmailTemplate = {
  id: 'employee_request_responded',
  name: 'رد على طلب موظف',
  subject: '{{statusEmoji}} تم {{status}} طلبك - {{requestType}}',
  variables: ['employeeName', 'requestType', 'status', 'statusEmoji', 'adminResponse', 'responseDate', 'statusBadgeClass'],
  category: 'requests',
  priority: 'high',
  htmlTemplate: '',
  textTemplate: ''
};

EMPLOYEE_REQUEST_RESPONDED.htmlTemplate = renderBaseTemplate({
  title: 'رد على طلبك',
  headerColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  accentColor: '#667eea',
  content: `
    <p class="greeting">عزيزي {{employeeName}}،</p>
    <p>تم الرد على طلبك من قبل الإدارة:</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">نوع الطلب:</span>
        <span class="info-value">{{requestType}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">الحالة:</span>
        <span class="status-badge {{statusBadgeClass}}">{{status}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">تاريخ الرد:</span>
        <span class="info-value">{{responseDate}}</span>
      </div>
    </div>

    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #0284c7;">
      <p style="font-weight: 600; color: #0c4a6e; margin-bottom: 10px;">💬 رد الإدارة:</p>
      <p style="color: #0c4a6e; line-height: 1.8;">{{adminResponse}}</p>
    </div>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #6b7280;">
      يمكنك مراجعة طلباتك في أي وقت من خلال لوحة التحكم.
    </p>
  `
});

EMPLOYEE_REQUEST_RESPONDED.textTemplate = `
رد على طلبك

عزيزي {{employeeName}}،

نوع الطلب: {{requestType}}
الحالة: {{status}}
تاريخ الرد: {{responseDate}}

رد الإدارة:
{{adminResponse}}

SymbolAI Financial System
`;

// ============================================================================
// TEMPLATE 3: Product Order Pending
// ============================================================================
const PRODUCT_ORDER_PENDING: EmailTemplate = {
  id: 'product_order_pending',
  name: 'طلب منتج معلق',
  subject: '📦 طلب منتجات جديد من {{employeeName}} - {{orderTotal}}',
  variables: ['employeeName', 'orderId', 'orderDate', 'productsCount', 'orderTotal', 'productsList', 'actionUrl'],
  category: 'orders',
  priority: 'medium',
  htmlTemplate: '',
  textTemplate: ''
};

PRODUCT_ORDER_PENDING.htmlTemplate = renderBaseTemplate({
  title: 'طلب منتجات جديد',
  headerColor: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
  accentColor: '#0ea5e9',
  content: `
    <p class="greeting">مرحباً،</p>
    <p>تم إنشاء طلب منتجات جديد يحتاج إلى موافقتك:</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">اسم الموظف:</span>
        <span class="info-value">{{employeeName}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم الطلب:</span>
        <span class="info-value">{{orderId}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">التاريخ:</span>
        <span class="info-value">{{orderDate}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">عدد المنتجات:</span>
        <span class="info-value">{{productsCount}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">الإجمالي:</span>
        <span class="info-value" style="color: #0ea5e9; font-size: 18px; font-weight: bold;">{{orderTotal}}</span>
      </div>
    </div>

    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="font-weight: 600; color: #0c4a6e; margin-bottom: 10px;">📋 المنتجات المطلوبة:</p>
      {{productsList}}
    </div>

    <p style="text-align: center;">
      <a href="{{actionUrl}}" class="button">مراجعة والموافقة</a>
    </p>
  `
});

PRODUCT_ORDER_PENDING.textTemplate = `
طلب منتجات جديد

اسم الموظف: {{employeeName}}
رقم الطلب: {{orderId}}
التاريخ: {{orderDate}}
عدد المنتجات: {{productsCount}}
الإجمالي: {{orderTotal}}

المنتجات المطلوبة:
{{productsList}}

للمراجعة: {{actionUrl}}

SymbolAI Financial System
`;

// ============================================================================
// TEMPLATE 4-6: Product Order Status Updates
// ============================================================================
const PRODUCT_ORDER_APPROVED: EmailTemplate = {
  id: 'product_order_approved',
  name: 'موافقة على طلب منتج',
  subject: '✅ تمت الموافقة على طلبك - رقم {{orderId}}',
  variables: ['employeeName', 'orderId', 'orderTotal', 'approvedBy', 'actionUrl'],
  category: 'orders',
  priority: 'medium',
  htmlTemplate: renderBaseTemplate({
    title: 'تمت الموافقة على طلبك',
    headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    accentColor: '#10b981',
    content: `
      <p class="greeting">عزيزي {{employeeName}}،</p>
      <p>نسعد بإبلاغك أنه تمت الموافقة على طلب المنتجات الخاص بك!</p>

      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: #d1fae5; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 40px;">
          ✅
        </div>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">رقم الطلب:</span>
          <span class="info-value">{{orderId}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">القيمة:</span>
          <span class="info-value">{{orderTotal}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">تمت الموافقة بواسطة:</span>
          <span class="info-value">{{approvedBy}}</span>
        </div>
      </div>

      <p style="background: #d1fae5; color: #065f46; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        سيتم تنفيذ طلبك في أقرب وقت ممكن
      </p>

      <p style="text-align: center;">
        <a href="{{actionUrl}}" class="button success">عرض تفاصيل الطلب</a>
      </p>
    `
  }),
  textTemplate: `
تمت الموافقة على طلبك

عزيزي {{employeeName}}،

رقم الطلب: {{orderId}}
القيمة: {{orderTotal}}
تمت الموافقة بواسطة: {{approvedBy}}

سيتم تنفيذ طلبك في أقرب وقت ممكن.

عرض التفاصيل: {{actionUrl}}

SymbolAI Financial System
  `
};

const PRODUCT_ORDER_REJECTED: EmailTemplate = {
  id: 'product_order_rejected',
  name: 'رفض طلب منتج',
  subject: '❌ تم رفض طلبك - رقم {{orderId}}',
  variables: ['employeeName', 'orderId', 'rejectionReason', 'actionUrl'],
  category: 'orders',
  priority: 'low',
  htmlTemplate: renderBaseTemplate({
    title: 'تم رفض طلبك',
    headerColor: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    accentColor: '#ef4444',
    content: `
      <p class="greeting">عزيزي {{employeeName}}،</p>
      <p>نأسف لإبلاغك بأنه تم رفض طلب المنتجات الخاص بك.</p>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">رقم الطلب:</span>
          <span class="info-value">{{orderId}}</span>
        </div>
      </div>

      <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #ef4444;">
        <p style="font-weight: 600; color: #991b1b; margin-bottom: 10px;">💬 سبب الرفض:</p>
        <p style="color: #991b1b; line-height: 1.8;">{{rejectionReason}}</p>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        يمكنك تعديل الطلب وإعادة إرساله مرة أخرى.
      </p>
    `
  }),
  textTemplate: `
تم رفض طلبك

عزيزي {{employeeName}}،

رقم الطلب: {{orderId}}

سبب الرفض:
{{rejectionReason}}

يمكنك تعديل الطلب وإعادة إرساله مرة أخرى.

SymbolAI Financial System
  `
};

const PRODUCT_ORDER_COMPLETED: EmailTemplate = {
  id: 'product_order_completed',
  name: 'اكتمال طلب منتج',
  subject: '🎉 تم إنجاز طلبك - رقم {{orderId}}',
  variables: ['employeeName', 'orderId', 'completionDate'],
  category: 'orders',
  priority: 'low',
  htmlTemplate: renderBaseTemplate({
    title: 'تم إنجاز طلبك',
    headerColor: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    accentColor: '#8b5cf6',
    content: `
      <p class="greeting">عزيزي {{employeeName}}،</p>
      <p>تم تنفيذ واستلام طلب المنتجات الخاص بك بنجاح! 🎉</p>

      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: #ede9fe; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 40px;">
          📦
        </div>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">رقم الطلب:</span>
          <span class="info-value">{{orderId}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">تاريخ الإنجاز:</span>
          <span class="info-value">{{completionDate}}</span>
        </div>
      </div>

      <p style="background: #ede9fe; color: #5b21b6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        شكراً لاستخدامك نظام SymbolAI
      </p>
    `
  }),
  textTemplate: `
تم إنجاز طلبك

عزيزي {{employeeName}}،

تم تنفيذ واستلام طلبك بنجاح!

رقم الطلب: {{orderId}}
تاريخ الإنجاز: {{completionDate}}

شكراً لاستخدامك نظام SymbolAI

SymbolAI Financial System
  `
};

// ============================================================================
// TEMPLATE 7-8: Payroll
// ============================================================================
const PAYROLL_GENERATED: EmailTemplate = {
  id: 'payroll_generated',
  name: 'كشف راتب',
  subject: '💰 كشف راتبك لشهر {{month}} - {{year}}',
  variables: ['employeeName', 'month', 'year', 'baseSalary', 'bonus', 'deductions', 'netSalary', 'pdfUrl'],
  category: 'payroll',
  priority: 'high',
  htmlTemplate: renderBaseTemplate({
    title: 'كشف راتبك',
    headerColor: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    accentColor: '#6366f1',
    content: `
      <p class="greeting">عزيزي {{employeeName}}،</p>
      <p>تم إصدار كشف الراتب لشهر <strong>{{month}} {{year}}</strong></p>

      <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center;">
        <p style="margin-bottom: 10px; opacity: 0.9;">صافي الراتب</p>
        <p style="font-size: 36px; font-weight: bold; margin: 0;">{{netSalary}}</p>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">الراتب الأساسي:</span>
          <span class="info-value">{{baseSalary}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">المكافآت:</span>
          <span class="info-value" style="color: #10b981;">+ {{bonus}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الخصومات:</span>
          <span class="info-value" style="color: #ef4444;">- {{deductions}}</span>
        </div>
        <div class="info-row" style="border-top: 2px solid #6366f1; margin-top: 10px; padding-top: 10px;">
          <span class="info-label" style="font-size: 16px;">صافي المستحق:</span>
          <span class="info-value" style="color: #6366f1; font-size: 18px; font-weight: bold;">{{netSalary}}</span>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="{{pdfUrl}}" class="button">📄 تحميل كشف الراتب PDF</a>
      </p>
    `
  }),
  textTemplate: `
كشف راتبك لشهر {{month}} {{year}}

عزيزي {{employeeName}}،

الراتب الأساسي: {{baseSalary}}
المكافآت: + {{bonus}}
الخصومات: - {{deductions}}
━━━━━━━━━━━━━━━
صافي المستحق: {{netSalary}}

تحميل PDF: {{pdfUrl}}

SymbolAI Financial System
  `
};

const PAYROLL_REMINDER: EmailTemplate = {
  id: 'payroll_reminder',
  name: 'تذكير إصدار الرواتب',
  subject: '⏰ تذكير: إصدار رواتب شهر {{month}}',
  variables: ['month', 'year', 'daysRemaining', 'actionUrl'],
  category: 'payroll',
  priority: 'medium',
  htmlTemplate: renderBaseTemplate({
    title: 'تذكير إصدار الرواتب',
    headerColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    accentColor: '#f59e0b',
    content: `
      <p class="greeting">مرحباً،</p>
      <p>هذا تذكير بأن موعد إصدار رواتب شهر <strong>{{month}} {{year}}</strong> يقترب.</p>

      <div style="background: #fef3c7; padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0;">
        <p style="color: #92400e; font-size: 18px; margin-bottom: 10px;">⏰ الوقت المتبقي</p>
        <p style="color: #92400e; font-size: 32px; font-weight: bold; margin: 0;">{{daysRemaining}} أيام</p>
      </div>

      <p style="background: #fef3c7; color: #92400e; padding: 15px; border-radius: 8px; text-align: center;">
        يرجى إصدار ومراجعة الرواتب قبل نهاية الشهر
      </p>

      <p style="text-align: center;">
        <a href="{{actionUrl}}" class="button">إصدار الرواتب الآن</a>
      </p>
    `
  }),
  textTemplate: `
تذكير إصدار الرواتب

موعد إصدار رواتب شهر {{month}} {{year}} يقترب.

الوقت المتبقي: {{daysRemaining}} أيام

يرجى إصدار ومراجعة الرواتب قبل نهاية الشهر.

الانتقال للرواتب: {{actionUrl}}

SymbolAI Financial System
  `
};

// ============================================================================
// TEMPLATE 9-10: Bonus
// ============================================================================
const BONUS_APPROVED: EmailTemplate = {
  id: 'bonus_approved',
  name: 'مكافأة معتمدة',
  subject: '🎁 مكافأتك لشهر {{month}} - {{bonusAmount}}',
  variables: ['employeeName', 'month', 'year', 'weekNumber', 'bonusAmount', 'revenueContribution'],
  category: 'bonus',
  priority: 'medium',
  htmlTemplate: renderBaseTemplate({
    title: 'مكافأتك الشهرية',
    headerColor: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    accentColor: '#ec4899',
    content: `
      <p class="greeting">عزيزي {{employeeName}}،</p>
      <p>مبروك! تم اعتماد مكافأتك عن أدائك المتميز 🎉</p>

      <div style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: white; padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center;">
        <p style="margin-bottom: 10px; opacity: 0.9;">مكافأتك</p>
        <p style="font-size: 36px; font-weight: bold; margin: 0;">{{bonusAmount}}</p>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">الشهر:</span>
          <span class="info-value">{{month}} {{year}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الأسبوع:</span>
          <span class="info-value">{{weekNumber}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">مساهمتك في الإيرادات:</span>
          <span class="info-value">{{revenueContribution}}</span>
        </div>
      </div>

      <p style="background: #fce7f3; color: #831843; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        سيتم إضافة المكافأة إلى راتبك الشهري
      </p>

      <p style="text-align: center; font-size: 14px; color: #6b7280;">
        استمر في عملك الرائع! 💪
      </p>
    `
  }),
  textTemplate: `
مكافأتك الشهرية

عزيزي {{employeeName}}،

مبروك! تم اعتماد مكافأتك:

المكافأة: {{bonusAmount}}
الشهر: {{month}} {{year}}
الأسبوع: {{weekNumber}}
مساهمتك في الإيرادات: {{revenueContribution}}

سيتم إضافة المكافأة إلى راتبك الشهري.

استمر في عملك الرائع!

SymbolAI Financial System
  `
};

const BONUS_REMINDER: EmailTemplate = {
  id: 'bonus_reminder',
  name: 'تذكير حساب المكافآت',
  subject: '📊 تذكير: حساب مكافآت هذا الأسبوع',
  variables: ['currentWeek', 'actionUrl'],
  category: 'bonus',
  priority: 'low',
  htmlTemplate: renderBaseTemplate({
    title: 'تذكير حساب المكافآت',
    headerColor: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    accentColor: '#14b8a6',
    content: `
      <p class="greeting">مرحباً،</p>
      <p>تذكير: حان وقت حساب واعتماد مكافآت الأسبوع {{currentWeek}}</p>

      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: #ccfbf1; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 40px;">
          📊
        </div>
      </div>

      <p style="background: #ccfbf1; color: #134e4a; padding: 15px; border-radius: 8px; text-align: center;">
        يرجى حساب واعتماد المكافآت بناءً على إيرادات الأسبوع
      </p>

      <p style="text-align: center;">
        <a href="{{actionUrl}}" class="button">حساب المكافآت</a>
      </p>
    `
  }),
  textTemplate: `
تذكير: حساب مكافآت هذا الأسبوع

حان وقت حساب واعتماد مكافآت الأسبوع {{currentWeek}}

يرجى حساب واعتماد المكافآت بناءً على إيرادات الأسبوع.

الانتقال للمكافآت: {{actionUrl}}

SymbolAI Financial System
  `
};

// ============================================================================
// TEMPLATE 11-12: Backup
// ============================================================================
const BACKUP_COMPLETED: EmailTemplate = {
  id: 'backup_completed',
  name: 'نسخة احتياطية ناجحة',
  subject: '✅ نجاح النسخ الاحتياطي - {{backupDate}}',
  variables: ['backupDate', 'backupSize', 'recordsCount', 'backupType'],
  category: 'backup',
  priority: 'high',
  htmlTemplate: renderBaseTemplate({
    title: 'نسخة احتياطية ناجحة',
    headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    accentColor: '#10b981',
    content: `
      <p class="greeting">مرحباً،</p>
      <p>تم إنشاء النسخة الاحتياطية بنجاح ✅</p>

      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: #d1fae5; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 40px;">
          💾
        </div>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">التاريخ:</span>
          <span class="info-value">{{backupDate}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">النوع:</span>
          <span class="info-value">{{backupType}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">عدد السجلات:</span>
          <span class="info-value">{{recordsCount}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الحجم:</span>
          <span class="info-value">{{backupSize}}</span>
        </div>
      </div>

      <p style="background: #d1fae5; color: #065f46; padding: 15px; border-radius: 8px; text-align: center;">
        بياناتك محفوظة بأمان
      </p>
    `
  }),
  textTemplate: `
نسخة احتياطية ناجحة

تم إنشاء النسخة الاحتياطية بنجاح.

التاريخ: {{backupDate}}
النوع: {{backupType}}
عدد السجلات: {{recordsCount}}
الحجم: {{backupSize}}

بياناتك محفوظة بأمان.

SymbolAI Financial System
  `
};

const BACKUP_FAILED: EmailTemplate = {
  id: 'backup_failed',
  name: 'فشل النسخ الاحتياطي',
  subject: '⚠️ فشل النسخ الاحتياطي - {{backupDate}}',
  variables: ['backupDate', 'errorMessage', 'actionRequired'],
  category: 'backup',
  priority: 'critical',
  htmlTemplate: renderBaseTemplate({
    title: 'فشل النسخ الاحتياطي',
    headerColor: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    accentColor: '#ef4444',
    content: `
      <p class="greeting">تنبيه هام! ⚠️</p>
      <p>فشل إنشاء النسخة الاحتياطية. يرجى اتخاذ إجراء فوري.</p>

      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: #fee2e2; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 40px;">
          ⚠️
        </div>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">التاريخ:</span>
          <span class="info-value">{{backupDate}}</span>
        </div>
      </div>

      <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #ef4444;">
        <p style="font-weight: 600; color: #991b1b; margin-bottom: 10px;">❌ رسالة الخطأ:</p>
        <p style="color: #991b1b; font-family: monospace; line-height: 1.8;">{{errorMessage}}</p>
      </div>

      <div style="background: #fef3c7; padding: 15px; border-radius: 8px;">
        <p style="font-weight: 600; color: #92400e; margin-bottom: 10px;">🔧 الإجراء المطلوب:</p>
        <p style="color: #92400e;">{{actionRequired}}</p>
      </div>
    `
  }),
  textTemplate: `
⚠️ فشل النسخ الاحتياطي

تنبيه هام! فشل إنشاء النسخة الاحتياطية.

التاريخ: {{backupDate}}

رسالة الخطأ:
{{errorMessage}}

الإجراء المطلوب:
{{actionRequired}}

يرجى اتخاذ إجراء فوري.

SymbolAI Financial System
  `
};

// ============================================================================
// TEMPLATE 13-14: System Alerts
// ============================================================================
const REVENUE_MISMATCH: EmailTemplate = {
  id: 'revenue_mismatch',
  name: 'عدم تطابق إيرادات',
  subject: '⚠️ تنبيه: عدم تطابق في الإيرادات - {{date}}',
  variables: ['date', 'totalEntered', 'calculatedTotal', 'difference', 'branchName', 'actionUrl'],
  category: 'system',
  priority: 'high',
  htmlTemplate: renderBaseTemplate({
    title: 'عدم تطابق في الإيرادات',
    headerColor: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    accentColor: '#f97316',
    content: `
      <p class="greeting">تنبيه! ⚠️</p>
      <p>تم رصد عدم تطابق في الإيرادات. يرجى المراجعة الفورية.</p>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">التاريخ:</span>
          <span class="info-value">{{date}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الفرع:</span>
          <span class="info-value">{{branchName}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الإجمالي المدخل:</span>
          <span class="info-value">{{totalEntered}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الإجمالي المحسوب:</span>
          <span class="info-value">{{calculatedTotal}}</span>
        </div>
        <div class="info-row" style="border-top: 2px solid #f97316; margin-top: 10px; padding-top: 10px;">
          <span class="info-label" style="color: #ea580c; font-weight: bold;">الفرق:</span>
          <span class="info-value" style="color: #ea580c; font-weight: bold; font-size: 18px;">{{difference}}</span>
        </div>
      </div>

      <p style="background: #fef3c7; color: #92400e; padding: 15px; border-radius: 8px; text-align: center;">
        يرجى مراجعة البيانات المدخلة وتصحيح الأخطاء
      </p>

      <p style="text-align: center;">
        <a href="{{actionUrl}}" class="button">مراجعة الإيرادات</a>
      </p>
    `
  }),
  textTemplate: `
⚠️ تنبيه: عدم تطابق في الإيرادات

التاريخ: {{date}}
الفرع: {{branchName}}

الإجمالي المدخل: {{totalEntered}}
الإجمالي المحسوب: {{calculatedTotal}}
الفرق: {{difference}}

يرجى مراجعة البيانات المدخلة وتصحيح الأخطاء.

المراجعة: {{actionUrl}}

SymbolAI Financial System
  `
};

const LARGE_EXPENSE: EmailTemplate = {
  id: 'large_expense',
  name: 'مصروف كبير',
  subject: '💸 تنبيه: مصروف كبير - {{amount}}',
  variables: ['expenseTitle', 'amount', 'category', 'date', 'description', 'branchName'],
  category: 'system',
  priority: 'medium',
  htmlTemplate: renderBaseTemplate({
    title: 'مصروف كبير',
    headerColor: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    accentColor: '#dc2626',
    content: `
      <p class="greeting">مرحباً،</p>
      <p>تم تسجيل مصروف كبير يتطلب انتباهك:</p>

      <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center;">
        <p style="margin-bottom: 10px; opacity: 0.9;">قيمة المصروف</p>
        <p style="font-size: 32px; font-weight: bold; margin: 0;">{{amount}}</p>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">العنوان:</span>
          <span class="info-value">{{expenseTitle}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الفئة:</span>
          <span class="info-value">{{category}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">التاريخ:</span>
          <span class="info-value">{{date}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الفرع:</span>
          <span class="info-value">{{branchName}}</span>
        </div>
      </div>

      <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="font-weight: 600; color: #7f1d1d; margin-bottom: 10px;">📝 الوصف:</p>
        <p style="color: #7f1d1d;">{{description}}</p>
      </div>

      <p style="font-size: 14px; color: #6b7280; text-align: center;">
        هذا إشعار تلقائي للمصروفات التي تتجاوز 1000 ج.م
      </p>
    `
  }),
  textTemplate: `
تنبيه: مصروف كبير

قيمة المصروف: {{amount}}

العنوان: {{expenseTitle}}
الفئة: {{category}}
التاريخ: {{date}}
الفرع: {{branchName}}

الوصف:
{{description}}

هذا إشعار تلقائي للمصروفات التي تتجاوز 1000 ج.م

SymbolAI Financial System
  `
};

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  EMPLOYEE_REQUEST_CREATED,
  EMPLOYEE_REQUEST_RESPONDED,
  PRODUCT_ORDER_PENDING,
  PRODUCT_ORDER_APPROVED,
  PRODUCT_ORDER_REJECTED,
  PRODUCT_ORDER_COMPLETED,
  PAYROLL_GENERATED,
  PAYROLL_REMINDER,
  BONUS_APPROVED,
  BONUS_REMINDER,
  BACKUP_COMPLETED,
  BACKUP_FAILED,
  REVENUE_MISMATCH,
  LARGE_EXPENSE
];

// Helper function to get template by ID
export function getTemplateById(templateId: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === templateId);
}

// Helper function to get templates by category
export function getTemplatesByCategory(category: string): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter(t => t.category === category);
}
