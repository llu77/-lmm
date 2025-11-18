import { ReactNode } from "react";
import { cn } from "@/lib/utils.ts";

interface NotificationBannerProps {
  children: ReactNode;
  variant?: "default" | "info" | "warning" | "error" | "success";
  className?: string;
}

export function NotificationBanner({
  children,
  variant = "default",
  className,
}: NotificationBannerProps) {
  const variantStyles = {
    default: "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
    info: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
    warning: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100",
    error: "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100",
    success: "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
  };

  return (
    <div
      className={cn(
        "rounded-lg p-4 mb-4",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
