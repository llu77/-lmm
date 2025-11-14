import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, authenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (authenticated) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
      toast.success("تم تسجيل الدخول بنجاح!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "فشل تسجيل الدخول";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-none bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="relative mx-auto w-fit">
            <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full"></div>
            <img
              src="https://cdn.hercules.app/file_X3jdTiCKmUjHC4szRS5CixU4"
              alt="Logo"
              className="relative mx-auto h-24 w-24 object-contain"
            />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-br from-gray-900 via-primary-700 to-secondary-700 bg-clip-text text-transparent dark:from-white dark:via-primary-300 dark:to-secondary-300">
            تسجيل الدخول
          </CardTitle>
          <CardDescription className="text-base">
            أدخل بيانات حسابك للوصول إلى النظام
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                type="text"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
                autoFocus
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="text-right"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4 me-2" />
                  جارٍ تسجيل الدخول...
                </>
              ) : (
                <>
                  <LogIn className="size-4 me-2" />
                  تسجيل الدخول
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>للمساعدة، اتصل بمسؤول النظام</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
