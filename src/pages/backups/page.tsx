import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import Navbar from "@/components/navbar.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { DatabaseBackupIcon, DownloadIcon, AlertTriangleIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

function BackupsPageInner() {
  const backups = useQuery(api.backup.public.getBackups, {});
  const stats = useQuery(api.backup.public.getBackupStats, {});
  const createBackup = useMutation(api.backup.public.createBackup);
  const restoreBackup = useMutation(api.backup.public.restoreBackup);
  
  const [isCreating, setIsCreating] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<Id<"backups"> | null>(null);

  const handleCreateBackup = async () => {
    try {
      setIsCreating(true);
      await createBackup({ reason: "نسخة احتياطية يدوية من صفحة الإدارة" });
      toast.success("تم بدء عملية النسخ الاحتياطي بنجاح");
    } catch (error) {
      toast.error("فشل في إنشاء النسخة الاحتياطية");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackupId) return;
    
    try {
      await restoreBackup({ backupId: selectedBackupId });
      toast.success("تم بدء عملية استعادة البيانات");
      setRestoreDialogOpen(false);
      setSelectedBackupId(null);
    } catch (error) {
      toast.error("فشل في استعادة البيانات");
      console.error(error);
    }
  };

  if (!backups || !stats) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-7xl space-y-6 p-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-7xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">النسخ الاحتياطية</h1>
            <p className="text-muted-foreground">إدارة النسخ الاحتياطية للبيانات المالية</p>
          </div>
          <Button onClick={handleCreateBackup} disabled={isCreating} size="lg">
            <DatabaseBackupIcon className="ml-2 size-5" />
            {isCreating ? "جاري الإنشاء..." : "إنشاء نسخة احتياطية"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي النسخ</CardTitle>
              <DatabaseBackupIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBackups}</div>
              <p className="text-xs text-muted-foreground">
                {stats.automaticBackups} تلقائية • {stats.manualBackups} يدوية
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">آخر نسخة احتياطية</CardTitle>
              <ClockIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.lastBackupDate ? format(new Date(stats.lastBackupDate), "dd/MM/yyyy") : "لا يوجد"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.lastBackupDate && format(new Date(stats.lastBackupDate), "hh:mm a")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">البيانات المحفوظة</CardTitle>
              <CheckCircle2Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stats.lastBackupSnapshot && (
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-semibold">{stats.lastBackupSnapshot.revenues}</span> إيراد
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">{stats.lastBackupSnapshot.expenses}</span> مصروف
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Backups List */}
        <Card>
          <CardHeader>
            <CardTitle>سجل النسخ الاحتياطية</CardTitle>
            <CardDescription>
              جميع النسخ الاحتياطية التي تم إنشاؤها. يمكنك استعادة البيانات من أي نسخة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {backups.length === 0 ? (
                <div className="py-12 text-center">
                  <DatabaseBackupIcon className="mx-auto mb-4 size-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">لا توجد نسخ احتياطية</h3>
                  <p className="text-sm text-muted-foreground">قم بإنشاء أول نسخة احتياطية الآن</p>
                </div>
              ) : (
                backups.map((backup) => (
                  <div
                    key={backup._id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {format(new Date(backup.date), "dd/MM/yyyy - hh:mm a")}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {backup.type}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          backup.status === "مكتملة" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                        }`}>
                          {backup.status}
                        </span>
                      </div>
                      {backup.reason && (
                        <p className="text-sm text-muted-foreground">{backup.reason}</p>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{backup.dataSnapshot.revenues} إيراد</span>
                        <span>{backup.dataSnapshot.expenses} مصروف</span>
                        <span>{backup.dataSnapshot.productOrders} طلب منتج</span>
                        <span>{backup.dataSnapshot.employeeRequests} طلب موظف</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBackupId(backup._id);
                        setRestoreDialogOpen(true);
                      }}
                    >
                      <DownloadIcon className="ml-2 size-4" />
                      استعادة
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Warning Notice */}
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-yellow-600" />
              <CardTitle className="text-yellow-900 dark:text-yellow-100">تنبيه مهم</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-yellow-900 dark:text-yellow-100">
            <p>• استعادة البيانات ستحذف جميع البيانات الحالية وتستبدلها بالنسخة الاحتياطية المحددة</p>
            <p>• يتم إنشاء نسخة احتياطية أمان تلقائياً قبل كل عملية استعادة</p>
            <p>• يُنصح بإنشاء نسخة احتياطية يدوية قبل إجراء أي تعديلات كبيرة</p>
            <p>• يتم الاحتفاظ بالنسخ الاحتياطية لمدة 90 يوماً فقط</p>
          </CardContent>
        </Card>
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد استعادة البيانات</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>هل أنت متأكد من استعادة البيانات من هذه النسخة الاحتياطية؟</p>
              <p className="font-semibold text-destructive">
                تحذير: سيتم حذف جميع البيانات الحالية واستبدالها بالنسخة الاحتياطية المحددة.
              </p>
              <p className="text-xs">سيتم إنشاء نسخة احتياطية أمان تلقائياً قبل الاستعادة.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              استعادة البيانات
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function BackupsPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>تسجيل الدخول مطلوب</CardTitle>
              <CardDescription>
                يجب تسجيل الدخول للوصول إلى النسخ الاحتياطية
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <SignInButton />
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Skeleton className="h-96 w-full max-w-2xl" />
        </div>
      </AuthLoading>
      <Authenticated>
        <BackupsPageInner />
      </Authenticated>
    </>
  );
}
