import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "@/hooks/use-auth";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  LayoutDashboardIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PackageIcon,
  ShieldCheckIcon,
  BarChart3Icon,
  CheckCircle2,
  Sparkles
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users to dashboard
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Unauthenticated>
        {/* Hero Section */}
        <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-6xl space-y-8 animate-in fade-in duration-700">

            {/* Main Card */}
            <Card className="overflow-hidden border-none shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
              <CardHeader className="text-center space-y-6 pb-8 pt-12 bg-gradient-to-br from-primary-500/10 via-secondary-500/10 to-info-500/10">
                {/* Logo with glow effect */}
                <div className="relative mx-auto w-fit">
                  <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full"></div>
                  <img
                    src="https://cdn.hercules.app/file_X3jdTiCKmUjHC4szRS5CixU4"
                    alt="Logo"
                    className="relative mx-auto h-32 w-32 md:h-40 md:w-40 object-contain transition-transform hover:scale-105 duration-300"
                  />
                </div>

                {/* Title with gradient */}
                <div className="space-y-3">
                  <Badge className="mb-2 bg-primary-500/10 text-primary-700 border-primary-200 hover:bg-primary-500/20">
                    <Sparkles className="size-3 me-1" />
                    نظام متكامل للإدارة المالية
                  </Badge>
                  <CardTitle className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-br from-gray-900 via-primary-700 to-secondary-700 bg-clip-text text-transparent dark:from-white dark:via-primary-300 dark:to-secondary-300">
                    نظام LMM
                  </CardTitle>
                  <CardDescription className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    منصة احترافية شاملة لإدارة الإيرادات والمصروفات والموظفين والطلبات
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-6 md:px-12 pb-12 space-y-10">
                {/* Features Grid - First Row */}
                <div className="grid gap-6 md:grid-cols-3">
                  <FeatureCard
                    icon={<TrendingUpIcon className="size-10" />}
                    title="إدارة الإيرادات"
                    description="تتبع وإدارة جميع مصادر الدخل بسهولة مع تقارير تفصيلية"
                    gradient="from-success-500 to-emerald-600"
                    iconBg="bg-success-50 dark:bg-success-900/20"
                    iconColor="text-success-600 dark:text-success-400"
                  />

                  <FeatureCard
                    icon={<TrendingDownIcon className="size-10" />}
                    title="متابعة المصروفات"
                    description="سجل ورصد جميع النفقات والمصاريف مع تصنيف دقيق"
                    gradient="from-danger-500 to-rose-600"
                    iconBg="bg-danger-50 dark:bg-danger-900/20"
                    iconColor="text-danger-600 dark:text-danger-400"
                  />

                  <FeatureCard
                    icon={<BarChart3Icon className="size-10" />}
                    title="تقارير تفصيلية"
                    description="تحليلات ومقارنات متقدمة لاتخاذ قرارات ذكية"
                    gradient="from-info-500 to-blue-600"
                    iconBg="bg-info-50 dark:bg-info-900/20"
                    iconColor="text-info-600 dark:text-info-400"
                  />
                </div>

                {/* Features Grid - Second Row */}
                <div className="grid gap-6 md:grid-cols-3">
                  <FeatureCard
                    icon={<PackageIcon className="size-10" />}
                    title="طلبات المنتجات"
                    description="إدارة احترافية لطلبات الشراء والمخزون"
                    gradient="from-warning-500 to-amber-600"
                    iconBg="bg-warning-50 dark:bg-warning-900/20"
                    iconColor="text-warning-600 dark:text-warning-400"
                  />

                  <FeatureCard
                    icon={<ShieldCheckIcon className="size-10" />}
                    title="طلبات الموظفين"
                    description="متابعة سريعة لطلبات واحتياجات الفريق"
                    gradient="from-secondary-500 to-pink-600"
                    iconBg="bg-secondary-50 dark:bg-secondary-900/20"
                    iconColor="text-secondary-600 dark:text-secondary-400"
                  />

                  <FeatureCard
                    icon={<LayoutDashboardIcon className="size-10" />}
                    title="لوحة تحكم شاملة"
                    description="نظرة عامة واضحة على كل العمليات والإحصائيات"
                    gradient="from-primary-500 to-cyan-600"
                    iconBg="bg-primary-50 dark:bg-primary-900/20"
                    iconColor="text-primary-600 dark:text-primary-400"
                  />
                </div>

                {/* Features List */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/30 rounded-2xl p-8 space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                    لماذا تختار نظام LMM؟
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FeatureItem text="واجهة عربية كاملة مع دعم RTL" />
                    <FeatureItem text="تقارير PDF قابلة للطباعة" />
                    <FeatureItem text="نظام صلاحيات متعدد الفروع" />
                    <FeatureItem text="حسابات آلية للرواتب والمكافآت" />
                    <FeatureItem text="تصميم متجاوب لجميع الأجهزة" />
                    <FeatureItem text="مساعد ذكي مدعوم بالـ AI" />
                  </div>
                </div>

                {/* CTA Button */}
                <div className="flex justify-center pt-6">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-info-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
                    <SignInButton />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer Badge */}
            <div className="text-center">
              <Badge variant="outline" className="text-sm py-2 px-4 border-primary-200 dark:border-primary-800">
                <Sparkles className="size-3 me-2 text-primary-500" />
                مبني بتقنيات حديثة | React • TypeScript • Tailwind CSS
              </Badge>
            </div>
          </div>
        </div>
      </Unauthenticated>

      {/* Loading State */}
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <Card className="w-full max-w-md shadow-2xl border-none bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
            <CardHeader className="space-y-4">
              <Skeleton className="mx-auto size-20 rounded-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </AuthLoading>

      {/* Authenticated - Redirect */}
      <Authenticated>
        <RedirectToDashboard />
      </Authenticated>
    </div>
  );
}

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
}

function FeatureCard({ icon, title, description, gradient, iconBg, iconColor }: FeatureCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

      {/* Content */}
      <div className="relative space-y-4 text-center">
        {/* Icon */}
        <div className={`mx-auto w-fit rounded-2xl ${iconBg} p-4 transition-transform group-hover:scale-110 duration-300`}>
          <div className={iconColor}>
            {icon}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

// Feature Item Component
function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
      <div className="flex-shrink-0">
        <CheckCircle2 className="size-5 text-success-500" />
      </div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

// Redirect Component
function RedirectToDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="shadow-2xl border-none bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">جاري التحويل...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
