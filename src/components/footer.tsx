import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { BRAND } from "@/lib/brand-constants";
import { Separator } from "@/components/ui/separator";
import {
  MailIcon,
  PhoneIcon,
  GlobeIcon,
  TwitterIcon,
  LinkedinIcon,
  FacebookIcon,
  InstagramIcon
} from "lucide-react";

/**
 * Footer Component - تذييل الموقع الاحترافي
 *
 * Features:
 * - عرض اللوجو
 * - روابط سريعة
 * - معلومات الاتصال
 * - روابط وسائل التواصل الاجتماعي
 * - Copyright
 */

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: "لوحة التحكم", href: "/dashboard" },
    { label: "الموظفون", href: "/employees" },
    { label: "المالية", href: "/revenues" },
    { label: "الطلبات", href: "/my-requests" }
  ];

  const systemLinks = [
    { label: "مساعد AI", href: "/ai-assistant" },
    { label: "دعم النظام", href: "/system-support" },
    { label: "النسخ الاحتياطي", href: "/backups" },
    { label: "الإعدادات", href: "/settings" }
  ];

  return (
    <footer className="w-full border-t bg-surface/50 backdrop-blur-sm">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo and Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Logo
                variant="icon"
                size="lg"
                alt={BRAND.name}
                className="h-16 w-16"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg text-primary">
                  {BRAND.shortName}
                </span>
                <span className="text-xs text-muted-foreground">
                  Community
                </span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {BRAND.description}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base">روابط سريعة</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* System Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base">النظام</h3>
            <ul className="space-y-2">
              {systemLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base">تواصل معنا</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MailIcon className="size-4 text-primary flex-shrink-0" />
                <a
                  href={`mailto:${BRAND.contact.email}`}
                  className="hover:text-primary transition-colors break-all"
                >
                  {BRAND.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <PhoneIcon className="size-4 text-primary flex-shrink-0" />
                <a
                  href={`tel:${BRAND.contact.phone}`}
                  className="hover:text-primary transition-colors"
                >
                  {BRAND.contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <GlobeIcon className="size-4 text-primary flex-shrink-0" />
                <a
                  href={BRAND.contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors break-all"
                >
                  {BRAND.contact.website}
                </a>
              </li>
            </ul>

            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={BRAND.social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-border hover:bg-primary hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <TwitterIcon className="size-4" />
              </a>
              <a
                href={BRAND.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-border hover:bg-primary hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <LinkedinIcon className="size-4" />
              </a>
              <a
                href={BRAND.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-border hover:bg-primary hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <FacebookIcon className="size-4" />
              </a>
              <a
                href={BRAND.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-border hover:bg-primary hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon className="size-4" />
              </a>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>
            © {currentYear} {BRAND.name}. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              سياسة الخصوصية
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              شروط الاستخدام
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
