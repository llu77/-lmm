import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Label } from "@/components/ui/label.tsx";
import { CheckCircle2Icon, AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";

const BRANCHES = {
  "1010": "فرع لبن",
  "2020": "فرع طويق",
};

interface BranchSelectorProps {
  onBranchSelected: (branchId: string, branchName: string) => void;
}

interface LockInfo {
  attempts: number;
  lockedUntil: number | null;
  lockDuration: number; // in milliseconds
}

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_3_ATTEMPTS = 60 * 60 * 1000; // 1 hour
const LOCK_DURATION_5_ATTEMPTS = 24 * 60 * 60 * 1000; // 24 hours

export function BranchSelector({ onBranchSelected }: BranchSelectorProps) {
  const [branchId, setBranchId] = useState("");
  const [lockInfo, setLockInfo] = useState<LockInfo>({ attempts: 0, lockedUntil: null, lockDuration: 0 });
  const [remainingTime, setRemainingTime] = useState<string>("");

  // Load lock info from localStorage
  useEffect(() => {
    const savedLockInfo = localStorage.getItem("branch_lock_info");
    if (savedLockInfo) {
      const parsed = JSON.parse(savedLockInfo) as LockInfo;
      
      // Check if lock has expired
      if (parsed.lockedUntil && Date.now() >= parsed.lockedUntil) {
        // Lock expired, reset attempts
        const resetInfo: LockInfo = { attempts: 0, lockedUntil: null, lockDuration: 0 };
        localStorage.setItem("branch_lock_info", JSON.stringify(resetInfo));
        setLockInfo(resetInfo);
      } else {
        setLockInfo(parsed);
      }
    }
  }, []);

  // Update remaining time every second
  useEffect(() => {
    if (lockInfo.lockedUntil && Date.now() < lockInfo.lockedUntil) {
      const interval = setInterval(() => {
        const remaining = lockInfo.lockedUntil! - Date.now();
        if (remaining <= 0) {
          // Lock expired
          const resetInfo: LockInfo = { attempts: 0, lockedUntil: null, lockDuration: 0 };
          localStorage.setItem("branch_lock_info", JSON.stringify(resetInfo));
          setLockInfo(resetInfo);
          setRemainingTime("");
        } else {
          // Format remaining time
          const hours = Math.floor(remaining / (60 * 60 * 1000));
          const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
          const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
          
          if (hours > 0) {
            setRemainingTime(`${hours} ساعة و ${minutes} دقيقة`);
          } else if (minutes > 0) {
            setRemainingTime(`${minutes} دقيقة و ${seconds} ثانية`);
          } else {
            setRemainingTime(`${seconds} ثانية`);
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockInfo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if locked
    if (lockInfo.lockedUntil && Date.now() < lockInfo.lockedUntil) {
      toast.error("تم قفل الخانة مؤقتاً. يرجى الانتظار.");
      return;
    }

    const trimmedId = branchId.trim();
    const branchName = BRANCHES[trimmedId as keyof typeof BRANCHES];
    
    if (!branchName) {
      // Failed attempt
      const newAttempts = lockInfo.attempts + 1;
      const newLockInfo: LockInfo = { attempts: newAttempts, lockedUntil: null, lockDuration: 0 };

      if (newAttempts >= MAX_ATTEMPTS) {
        // 5 attempts: lock for 24 hours
        newLockInfo.lockedUntil = Date.now() + LOCK_DURATION_5_ATTEMPTS;
        newLockInfo.lockDuration = LOCK_DURATION_5_ATTEMPTS;
        toast.error("⛔ تم قفل الخانة لمدة 24 ساعة بسبب تجاوز الحد الأقصى للمحاولات الخاطئة (5 محاولات)");
      } else if (newAttempts >= 3) {
        // 3 attempts: lock for 1 hour
        newLockInfo.lockedUntil = Date.now() + LOCK_DURATION_3_ATTEMPTS;
        newLockInfo.lockDuration = LOCK_DURATION_3_ATTEMPTS;
        toast.error("⚠️ تم قفل الخانة لمدة ساعة واحدة بسبب 3 محاولات خاطئة");
      } else {
        const remainingAttempts = 3 - newAttempts;
        toast.error(`معرف الفرع غير صحيح. المحاولات المتبقية: ${remainingAttempts}`);
      }

      localStorage.setItem("branch_lock_info", JSON.stringify(newLockInfo));
      setLockInfo(newLockInfo);
      return;
    }

    // Success: reset attempts
    const resetInfo: LockInfo = { attempts: 0, lockedUntil: null, lockDuration: 0 };
    localStorage.setItem("branch_lock_info", JSON.stringify(resetInfo));
    setLockInfo(resetInfo);
    
    toast.success(`تم الدخول إلى ${branchName}`);
    onBranchSelected(trimmedId, branchName);
  };

  const isLocked = lockInfo.lockedUntil && Date.now() < lockInfo.lockedUntil;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <img 
            src="https://cdn.hercules.app/file_X3jdTiCKmUjHC4szRS5CixU4" 
            alt="Logo" 
            className="mx-auto h-40 w-40 object-contain"
            style={{ backgroundColor: 'transparent' }} 
          />
          <CardTitle className="text-2xl">
            {isLocked ? "الخانة مقفلة" : "اختيار الفرع"}
          </CardTitle>
          <CardDescription className="text-base">
            {isLocked 
              ? "تم قفل الخانة مؤقتاً بسبب محاولات دخول خاطئة متكررة"
              : "الرجاء إدخال معرف الفرع للمتابعة"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLocked && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangleIcon className="size-4" />
              <AlertTitle>تم قفل الخانة</AlertTitle>
              <AlertDescription>
                سيتم فتح الخانة بعد: <strong>{remainingTime}</strong>
                <br />
                <span className="text-xs mt-2 block">
                  {lockInfo.attempts >= MAX_ATTEMPTS 
                    ? "تم تجاوز الحد الأقصى (5 محاولات) - قفل لمدة 24 ساعة"
                    : "3 محاولات خاطئة - قفل لمدة ساعة واحدة"
                  }
                </span>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="branchId">معرف الفرع</Label>
              <Input
                id="branchId"
                type="text"
                placeholder="أدخل معرف الفرع"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                autoFocus
                disabled={!!isLocked}
                className="text-center text-lg disabled:cursor-not-allowed"
              />
              {lockInfo.attempts > 0 && lockInfo.attempts < 3 && !isLocked && (
                <p className="text-sm text-orange-600">
                  تحذير: لديك {lockInfo.attempts} محاول{lockInfo.attempts === 1 ? 'ة' : 'ات'} خاطئة. 
                  المحاولات المتبقية: {3 - lockInfo.attempts}
                </p>
              )}
            </div>

            {!isLocked && (
              <div className="space-y-3 rounded-lg border p-4 text-sm">
                <p className="font-semibold text-muted-foreground">الفروع المتاحة:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2Icon className="size-4 text-green-600" />
                    <span className="font-medium">فرع لبن</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2Icon className="size-4 text-green-600" />
                    <span className="font-medium">فرع طويق</span>
                  </div>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full text-lg font-bold" 
              size="lg"
              disabled={!!isLocked}
            >
              {isLocked ? "الخانة مقفلة" : "تأكيد والدخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
