import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { 
  LayoutDashboardIcon,
  TrendingUpIcon, 
  TrendingDownIcon, 
  PackageIcon, 
  ShieldCheckIcon,
  BarChart3Icon
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users to dashboard
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-5xl">
            <CardHeader className="text-center space-y-4 pb-8">
              <img 
                src="https://cdn.hercules.app/file_X3jdTiCKmUjHC4szRS5CixU4" 
                alt="Logo" 
                className="mx-auto h-40 w-40 object-contain"
                style={{ backgroundColor: 'transparent' }} 
              />
              <CardTitle className="text-4xl font-bold">نظام الإدارة المالية</CardTitle>
              <CardDescription className="text-lg">
                منصة متكاملة لإدارة الإيرادات والمصروفات والطلبات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 text-center">
                  <TrendingUpIcon className="size-8 text-primary" />
                  <h3 className="font-semibold">إدارة الإيرادات</h3>
                  <p className="text-sm text-muted-foreground">
                    تتبع وإدارة جميع مصادر الدخل بسهولة
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 text-center">
                  <TrendingDownIcon className="size-8 text-primary" />
                  <h3 className="font-semibold">متابعة المصروفات</h3>
                  <p className="text-sm text-muted-foreground">
                    سجل ورصد جميع النفقات والمصاريف
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 text-center">
                  <BarChart3Icon className="size-8 text-primary" />
                  <h3 className="font-semibold">تقارير تفصيلية</h3>
                  <p className="text-sm text-muted-foreground">
                    تحليلات ومقارنات لاتخاذ قرارات أفضل
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 text-center">
                  <PackageIcon className="size-8 text-primary" />
                  <h3 className="font-semibold">طلبات المنتجات</h3>
                  <p className="text-sm text-muted-foreground">
                    إدارة طلبات الشراء والمخزون
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 text-center">
                  <ShieldCheckIcon className="size-8 text-primary" />
                  <h3 className="font-semibold">طلبات الموظفين</h3>
                  <p className="text-sm text-muted-foreground">
                    متابعة طلبات واحتياجات الفريق
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 text-center">
                  <LayoutDashboardIcon className="size-8 text-primary" />
                  <h3 className="font-semibold">لوحة تحكم شاملة</h3>
                  <p className="text-sm text-muted-foreground">
                    نظرة عامة على كل العمليات
                  </p>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <SignInButton />
              </div>
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
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
      <Authenticated>
        <RedirectToDashboard />
      </Authenticated>
    </div>
  );
}

function RedirectToDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    // Use replace to avoid adding to history
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Skeleton className="h-10 w-48" />
    </div>
  );
}
