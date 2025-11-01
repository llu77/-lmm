import { BRAND } from "@/lib/brand-constants";

/**
 * Email Templates - قوالب البريد الإلكتروني
 *
 * Features:
 * - HTML emails مع اللوجو
 * - تصميم responsive
 * - ألوان نظام التصميم
 * - دعم RTL للعربية
 */

export interface EmailTemplateOptions {
  /**
   * عنوان البريد
   */
  subject: string;

  /**
   * اسم المستقبل
   */
  recipientName?: string;

  /**
   * محتوى البريد (HTML)
   */
  content: string;

  /**
   * زر الإجراء (اختياري)
   */
  actionButton?: {
    text: string;
    url: string;
  };

  /**
   * ملاحظة في الأسفل
   */
  footerNote?: string;
}

/**
 * Base Email Template - القالب الأساسي
 */
export function createEmailTemplate(options: EmailTemplateOptions): string {
  const { recipientName, content, actionButton, footerNote } = options;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.subject}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      padding: 20px;
      direction: rtl;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .email-header {
      background: linear-gradient(135deg, ${BRAND.colors.primary.main} 0%, ${BRAND.colors.primary.dark} 100%);
      padding: 30px;
      text-align: center;
    }

    .email-logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 15px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      color: white;
    }

    .email-header h1 {
      color: white;
      font-size: 24px;
      margin: 0;
    }

    .email-header p {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin-top: 5px;
    }

    .email-body {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.8;
    }

    .email-greeting {
      font-size: 18px;
      font-weight: 600;
      color: #2D2D2D;
      margin-bottom: 20px;
    }

    .email-content {
      font-size: 15px;
      color: #4A4A4A;
      margin-bottom: 30px;
    }

    .email-button {
      text-align: center;
      margin: 30px 0;
    }

    .email-button a {
      display: inline-block;
      padding: 14px 32px;
      background-color: ${BRAND.colors.primary.main};
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.3s;
    }

    .email-button a:hover {
      background-color: ${BRAND.colors.primary.dark};
    }

    .email-divider {
      height: 1px;
      background-color: #E5E5E5;
      margin: 30px 0;
    }

    .email-footer {
      background-color: #F9F9F9;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #E5E5E5;
    }

    .email-footer-note {
      font-size: 13px;
      color: #808080;
      margin-bottom: 20px;
    }

    .email-footer-brand {
      margin: 20px 0;
    }

    .email-footer-brand h3 {
      color: ${BRAND.colors.primary.main};
      font-size: 18px;
      margin-bottom: 5px;
    }

    .email-footer-brand p {
      color: #808080;
      font-size: 12px;
      line-height: 1.6;
    }

    .email-footer-contact {
      font-size: 12px;
      color: #999999;
      margin-top: 15px;
    }

    .email-footer-contact a {
      color: ${BRAND.colors.primary.main};
      text-decoration: none;
    }

    .email-footer-social {
      margin: 20px 0;
    }

    .email-footer-social a {
      display: inline-block;
      width: 36px;
      height: 36px;
      margin: 0 5px;
      background-color: ${BRAND.colors.primary.main};
      border-radius: 50%;
      text-align: center;
      line-height: 36px;
      color: white;
      text-decoration: none;
      font-size: 16px;
    }

    .email-footer-copyright {
      font-size: 11px;
      color: #AAAAAA;
      margin-top: 20px;
    }

    @media only screen and (max-width: 600px) {
      body {
        padding: 10px;
      }

      .email-body {
        padding: 30px 20px;
      }

      .email-footer {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="email-header">
      <div class="email-logo">JF</div>
      <h1>${BRAND.name}</h1>
      <p>${BRAND.tagline}</p>
    </div>

    <!-- Body -->
    <div class="email-body">
      ${recipientName ? `<div class="email-greeting">مرحباً ${recipientName}،</div>` : ""}

      <div class="email-content">
        ${content}
      </div>

      ${
        actionButton
          ? `
      <div class="email-button">
        <a href="${actionButton.url}">${actionButton.text}</a>
      </div>
      `
          : ""
      }

      ${footerNote ? `<div class="email-divider"></div><div class="email-footer-note">${footerNote}</div>` : ""}
    </div>

    <!-- Footer -->
    <div class="email-footer">
      <div class="email-footer-brand">
        <h3>${BRAND.name}</h3>
        <p>${BRAND.description}</p>
      </div>

      <div class="email-footer-contact">
        <p>
          <a href="mailto:${BRAND.contact.email}">${BRAND.contact.email}</a> |
          <a href="tel:${BRAND.contact.phone}">${BRAND.contact.phone}</a>
        </p>
        <p><a href="${BRAND.contact.website}">${BRAND.contact.website}</a></p>
      </div>

      <div class="email-footer-social">
        <a href="${BRAND.social.twitter}" title="Twitter">𝕏</a>
        <a href="${BRAND.social.linkedin}" title="LinkedIn">in</a>
        <a href="${BRAND.social.facebook}" title="Facebook">f</a>
        <a href="${BRAND.social.instagram}" title="Instagram">📷</a>
      </div>

      <div class="email-footer-copyright">
        © ${new Date().getFullYear()} ${BRAND.name}. جميع الحقوق محفوظة.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Welcome Email - بريد الترحيب
 */
export function createWelcomeEmail(userName: string, loginUrl: string): string {
  return createEmailTemplate({
    subject: `مرحباً بك في ${BRAND.name}!`,
    recipientName: userName,
    content: `
      <p>نحن سعداء جداً بانضمامك إلى ${BRAND.name}!</p>
      <p>تم إنشاء حسابك بنجاح ويمكنك الآن الوصول إلى جميع مميزات النظام.</p>
      <p>للبدء، يرجى تسجيل الدخول إلى حسابك والبدء في استكشاف الميزات المتاحة.</p>
    `,
    actionButton: {
      text: "تسجيل الدخول الآن",
      url: loginUrl
    },
    footerNote:
      "إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذا البريد الإلكتروني أو الاتصال بفريق الدعم."
  });
}

/**
 * Password Reset Email - بريد استعادة كلمة المرور
 */
export function createPasswordResetEmail(userName: string, resetUrl: string): string {
  return createEmailTemplate({
    subject: "طلب إعادة تعيين كلمة المرور",
    recipientName: userName,
    content: `
      <p>تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك.</p>
      <p>لإعادة تعيين كلمة المرور، يرجى النقر على الزر أدناه:</p>
      <p><strong>ملاحظة:</strong> هذا الرابط صالح لمدة 24 ساعة فقط.</p>
    `,
    actionButton: {
      text: "إعادة تعيين كلمة المرور",
      url: resetUrl
    },
    footerNote:
      "إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد. حسابك آمن."
  });
}

/**
 * Request Approved Email - بريد الموافقة على الطلب
 */
export function createRequestApprovedEmail(
  userName: string,
  requestType: string,
  requestId: string,
  detailsUrl: string
): string {
  return createEmailTemplate({
    subject: `تمت الموافقة على ${requestType}`,
    recipientName: userName,
    content: `
      <p>نود إعلامك بأنه تمت الموافقة على طلبك.</p>
      <p><strong>نوع الطلب:</strong> ${requestType}</p>
      <p><strong>رقم الطلب:</strong> ${requestId}</p>
      <p>يمكنك الاطلاع على تفاصيل الطلب من خلال الرابط أدناه.</p>
    `,
    actionButton: {
      text: "عرض التفاصيل",
      url: detailsUrl
    }
  });
}

/**
 * Monthly Report Email - بريد التقرير الشهري
 */
export function createMonthlyReportEmail(
  userName: string,
  month: string,
  stats: {
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
  },
  reportUrl: string
): string {
  return createEmailTemplate({
    subject: `التقرير المالي لشهر ${month}`,
    recipientName: userName,
    content: `
      <p>إليك ملخص الأداء المالي لشهر ${month}:</p>
      <ul style="list-style: none; padding: 20px; background-color: #f9f9f9; border-radius: 8px; margin: 20px 0;">
        <li style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
          <strong>إجمالي الإيرادات:</strong>
          <span style="color: #10B981; font-weight: bold;">${stats.totalRevenue.toLocaleString()} ر.س</span>
        </li>
        <li style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
          <strong>إجمالي المصروفات:</strong>
          <span style="color: #EF4444; font-weight: bold;">${stats.totalExpense.toLocaleString()} ر.س</span>
        </li>
        <li style="padding: 8px 0;">
          <strong>صافي الربح:</strong>
          <span style="color: ${stats.netProfit >= 0 ? "#FF6B00" : "#DC2626"}; font-weight: bold; font-size: 18px;">
            ${stats.netProfit.toLocaleString()} ر.س
          </span>
        </li>
      </ul>
      <p>للاطلاع على التقرير الكامل، يرجى النقر على الزر أدناه.</p>
    `,
    actionButton: {
      text: "عرض التقرير الكامل",
      url: reportUrl
    }
  });
}
