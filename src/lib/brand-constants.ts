/**
 * Brand Constants - ثوابت العلامة التجارية
 *
 * يحتوي على جميع المعلومات المتعلقة بالعلامة التجارية
 * مثل الألوان، اللوجوهات، النصوص، إلخ.
 */

export const BRAND = {
  // معلومات الشركة
  name: "Jobfit Community",
  shortName: "Jobfit",
  tagline: "منصة إدارة الموارد البشرية الشاملة",
  description: "نظام متكامل لإدارة الموظفين والمالية والطلبات",

  // مسارات اللوجو
  logo: {
    full: "/assets/logo-placeholder.svg",
    icon: "/assets/logo-icon.svg",
    horizontal: "/assets/logo-horizontal.svg",
    white: "/assets/logo-white.svg"
  },

  // الألوان (من نظام التصميم)
  colors: {
    primary: {
      main: "#FF6B00",
      light: "#FF8533",
      lighter: "#FFA366",
      dark: "#CC5500",
      darker: "#994000"
    },
    neutral: {
      background: "#2D2D2D",
      surface: "#3A3A3A",
      elevated: "#454545",
      border: "#4A4A4A",
      hover: "#5A5A5A"
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#B8B8B8",
      muted: "#808080",
      disabled: "#666666"
    }
  },

  // معلومات الاتصال
  contact: {
    email: "info@jobfit.community",
    phone: "+966 XX XXX XXXX",
    website: "https://jobfit.community",
    support: "support@jobfit.community"
  },

  // روابط وسائل التواصل الاجتماعي
  social: {
    twitter: "https://twitter.com/jobfit",
    linkedin: "https://linkedin.com/company/jobfit",
    facebook: "https://facebook.com/jobfit",
    instagram: "https://instagram.com/jobfit"
  },

  // إعدادات اللوجو للـ PDF
  pdf: {
    logoWidth: 50,
    logoHeight: 50,
    headerHeight: 70,
    footerHeight: 30
  }
} as const;

/**
 * دالة للحصول على مسار اللوجو بناءً على النوع
 */
export function getLogoPath(variant: keyof typeof BRAND.logo = "full"): string {
  return BRAND.logo[variant];
}

/**
 * دالة للحصول على اللون من نظام التصميم
 */
export function getBrandColor(
  category: keyof typeof BRAND.colors,
  variant: string = "main"
): string {
  const colorCategory = BRAND.colors[category];
  if (typeof colorCategory === "object" && variant in colorCategory) {
    return (colorCategory as any)[variant];
  }
  return "#FF6B00"; // fallback
}
