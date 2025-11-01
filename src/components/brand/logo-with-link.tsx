import * as React from "react";
import { Link } from "react-router-dom";
import { Logo, type LogoProps } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * LogoWithLink Component - لوجو مع رابط
 *
 * يستخدم في:
 * - Navbar
 * - Footer
 * - Sidebar
 * - أي مكان يحتاج لوجو قابل للنقر
 */

export interface LogoWithLinkProps extends Omit<LogoProps, 'interactive' | 'onClick'> {
  /**
   * مسار الرابط (default: "/")
   */
  href?: string;

  /**
   * هل نستخدم Link من React Router؟ (default: true)
   */
  useRouter?: boolean;

  /**
   * className للحاوية
   */
  containerClassName?: string;

  /**
   * نص إضافي مع اللوجو
   */
  withText?: boolean;

  /**
   * النص المخصص
   */
  customText?: string;

  /**
   * className للنص
   */
  textClassName?: string;
}

export const LogoWithLink = React.forwardRef<HTMLAnchorElement, LogoWithLinkProps>(
  ({
    href = "/",
    useRouter = true,
    containerClassName,
    withText = false,
    customText,
    textClassName,
    className,
    ...logoProps
  }, ref) => {
    const content = (
      <>
        <Logo
          interactive
          className={className}
          {...logoProps}
        />
        {withText && (
          <span className={cn(
            "font-bold text-xl",
            textClassName
          )}>
            {customText || "Jobfit Community"}
          </span>
        )}
      </>
    );

    if (useRouter) {
      return (
        <Link
          ref={ref}
          to={href}
          className={cn(
            "flex items-center gap-3 hover:opacity-90 transition-opacity",
            containerClassName
          )}
        >
          {content}
        </Link>
      );
    }

    return (
      <a
        ref={ref}
        href={href}
        className={cn(
          "flex items-center gap-3 hover:opacity-90 transition-opacity",
          containerClassName
        )}
      >
        {content}
      </a>
    );
  }
);

LogoWithLink.displayName = "LogoWithLink";
