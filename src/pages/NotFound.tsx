import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center space-y-6">
        <h1 className="text-9xl font-bold text-primary-500">404</h1>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
          الصفحة غير موجودة
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          عذراً، الصفحة التي تبحث عنها غير موجودة.
        </p>
        <Link to="/">
          <Button>العودة للصفحة الرئيسية</Button>
        </Link>
      </div>
    </div>
  );
}
