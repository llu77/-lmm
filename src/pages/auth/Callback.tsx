import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle OAuth callback logic here
    // For now, redirect to dashboard
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Spinner className="size-12" />
      <p className="mt-4 text-lg">جارٍ المصادقة...</p>
    </div>
  );
}
