import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Logo Component - نظام شامل لإدارة اللوجو
 *
 * Variants:
 * - full: اللوجو الكامل مع النص
 * - icon: الأيقونة فقط
 * - horizontal: نسخة أفقية
 * - white: نسخة بيضاء للخلفيات الداكنة
 *
 * Sizes:
 * - xs: صغير جداً (24px)
 * - sm: صغير (32px)
 * - md: متوسط (48px)
 * - lg: كبير (64px)
 * - xl: كبير جداً (96px)
 * - full: ملء الحاوية
 */

const logoVariants = cva(
  "object-contain transition-all duration-200",
  {
    variants: {
      variant: {
        full: "w-auto",
        icon: "w-auto",
        horizontal: "w-auto",
        white: "w-auto"
      },
      size: {
        xs: "h-6",
        sm: "h-8",
        md: "h-12",
        lg: "h-16",
        xl: "h-24",
        full: "h-full w-full"
      },
      interactive: {
        true: "hover:opacity-80 cursor-pointer",
        false: ""
      }
    },
    defaultVariants: {
      variant: "full",
      size: "md",
      interactive: false
    }
  }
);

export interface LogoProps
  extends React.ImgHTMLAttributes<HTMLImageElement>,
    VariantProps<typeof logoVariants> {
  /**
   * نص بديل للوجو (للوصولية)
   */
  alt?: string;

  /**
   * رابط مخصص للوجو (اختياري)
   */
  customSrc?: string;

  /**
   * هل اللوجو قابل للنقر؟
   */
  interactive?: boolean;

  /**
   * دالة عند النقر على اللوجو
   */
  onClick?: () => void;
}

const Logo = React.forwardRef<HTMLImageElement, LogoProps>(
  ({
    className,
    variant,
    size,
    interactive,
    alt = "Jobfit Community Logo",
    customSrc,
    onClick,
    ...props
  }, ref) => {
    // تحديد مسار اللوجو بناءً على variant
    const getLogoSrc = () => {
      if (customSrc) return customSrc;

      switch (variant) {
        case "icon":
          return "/assets/logo-icon.svg";
        case "horizontal":
          return "/assets/logo-horizontal.svg";
        case "white":
          return "/assets/logo-white.svg";
        case "full":
        default:
          return "/assets/logo-placeholder.svg";
      }
    };

    return (
      <img
        ref={ref}
        src={getLogoSrc()}
        alt={alt}
        className={cn(logoVariants({ variant, size, interactive, className }))}
        onClick={interactive ? onClick : undefined}
        loading="eager"
        decoding="async"
        {...props}
      />
    );
  }
);

Logo.displayName = "Logo";

export { Logo, logoVariants };
