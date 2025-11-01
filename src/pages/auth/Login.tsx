import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { BRAND } from "@/lib/brand-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon, AlertCircleIcon } from "lucide-react";

/**
 * Login Page - صفحة تسجيل الدخول
 *
 * Features:
 * - لوجو في المنتصف
 * - تصميم احترافي responsive
 * - حقول البريد الإلكتروني وكلمة المرور
 * - إظهار/إخفاء كلمة المرور
 * - رسائل الخطأ
 * - رابط لصفحة التسجيل
 * - رابط لاستعادة كلمة المرور
 */

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // TODO: Implement actual authentication logic
      console.log("Login attempt:", { email, password });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate to dashboard on success
      navigate("/dashboard");
    } catch (err) {
      setError("فشل تسجيل الدخول. يرجى التحقق من بيانات الدخول.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface to-background p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 space-y-4">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo
              variant="full"
              size="xl"
              alt={BRAND.name}
              className="h-32"
            />
          </Link>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-primary">{BRAND.name}</h1>
            <p className="text-muted-foreground">{BRAND.tagline}</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              تسجيل الدخول
            </CardTitle>
            <CardDescription className="text-center">
              أدخل بياناتك للوصول إلى حسابك
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@jobfit.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-normal cursor-pointer"
                >
                  تذكرني
                </Label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              {/* Login Button */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>

              {/* Divider */}
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">أو</span>
                </div>
              </div>

              {/* Sign Up Link */}
              <div className="text-center text-sm">
                <span className="text-muted-foreground">ليس لديك حساب؟ </span>
                <Link
                  to="/auth/signup"
                  className="text-primary hover:underline font-semibold"
                >
                  إنشاء حساب جديد
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>

      {/* Add grid pattern style */}
      <style>{`
        .bg-grid-pattern {
          background-image: linear-gradient(rgba(255, 107, 0, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 107, 0, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
}
