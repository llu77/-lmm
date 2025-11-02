import { useState, useEffect } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { SignInButton } from "@/components/ui/signin";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { toast } from "sonner";
import { useBranch } from "@/hooks/use-branch";
import { BranchSelector } from "@/components/branch-selector";
import { PlusIcon, ReceiptIcon, TrashIcon, DownloadIcon, PrinterIcon, FileTextIcon } from "lucide-react";

interface PayrollEmployee {
  employeeName: string;
  baseSalary: number;
  supervisorAllowance: number;
  incentives: number;
  totalAdvances: number;
  totalDeductions: number;
  netSalary: number;
}

interface PayrollRecordDoc {
  _id: string;
  branchName: string;
  supervisorName?: string;
  month: number;
  year: number;
  generatedAt: number;
  totalNetSalary: number;
  emailSent: boolean;
  employees: PayrollEmployee[];
}

export default function PayrollPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>تسجيل الدخول مطلوب</CardTitle>
              <CardDescription>يرجى تسجيل الدخول للوصول إلى مسير الرواتب</CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton />
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Skeleton className="h-10 w-48" />
        </div>
      </AuthLoading>
      <Authenticated>
        <PayrollPageContent />
      </Authenticated>
    </>
  );
}

function PayrollPageContent() {
  const { branchId, branchName, selectBranch } = useBranch();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecordDoc[] | undefined>(undefined);

  useEffect(() => {
    if (!branchId) {
      setPayrollRecords(undefined);
      return;
    }
    // TODO: Create API endpoint /api/payroll/list
    // fetch(`/api/payroll/list?branchId=${branchId}&month=${month}&year=${year}`).then(r => r.json()).then(setPayrollRecords);
  }, [branchId, month, year]);

  const handleGenerate = async (supervisorName?: string) => {
    if (!branchId || !branchName) {
      toast.error("يرجى اختيار الفرع");
      return;
    }

    try {
      toast.loading("جاري إنشاء مسير الرواتب...");
      // TODO: Create API endpoint /api/payroll/generate
      await apiClient.post('/api/payroll/generate', {
        branchId,
        branchName,
        supervisorName,
        month,
        year,
      });
      toast.dismiss();
      toast.success("تم إنشاء مسير الرواتب بنجاح");
      setShowGenerateDialog(false);
    } catch (error) {
      toast.dismiss();
      toast.error("فشل إنشاء مسير الرواتب");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // TODO: Create API endpoint /api/payroll/delete
      await apiClient.post('/api/payroll/delete', { payrollId: id });
      toast.success("تم حذف مسير الرواتب");
    } catch (error) {
      toast.error("فشل حذف مسير الرواتب");
      console.error(error);
    }
  };

  const payrollList = payrollRecords ?? [];
  const totalRecords = payrollList.length;
  const totalAmount = payrollList.reduce(
    (sum: number, record: PayrollRecordDoc) => sum + record.totalNetSalary,
    0,
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">مسير الرواتب</h1>
            <p className="text-muted-foreground">إدارة رواتب الموظفين الشهرية</p>
          </div>
          <BranchSelector onBranchSelected={selectBranch} />
        </div>

        {!branchId && (
          <Card>
            <CardContent className="py-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ReceiptIcon />
                  </EmptyMedia>
                  <EmptyTitle>اختر الفرع</EmptyTitle>
                  <EmptyDescription>
                    يرجى اختيار الفرع من الأعلى لعرض سجلات مسير الرواتب
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        )}

        {branchId && (
          <>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي السجلات</CardTitle>
              <FileTextIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRecords}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المبالغ</CardTitle>
              <ReceiptIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAmount.toLocaleString()} ر.س</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>سجلات مسير الرواتب</CardTitle>
                <CardDescription>عرض وإدارة مسيرات الرواتب الشهرية</CardDescription>
              </div>
              <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon className="ml-2 size-4" />
                    إنشاء مسير رواتب
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إنشاء مسير رواتب جديد</DialogTitle>
                    <DialogDescription>سيتم إنشاء مسير رواتب لجميع الموظفين النشطين</DialogDescription>
                  </DialogHeader>
                  <GeneratePayrollForm onGenerate={handleGenerate} month={month} year={year} />
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex gap-4 pt-4">
              <div className="flex items-center gap-2">
                <Label>الشهر</Label>
                <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(12)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>السنة</Label>
                <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2023, 2024, 2025, 2026].map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {payrollRecords === undefined ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : payrollRecords.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ReceiptIcon />
                  </EmptyMedia>
                  <EmptyTitle>لا توجد سجلات</EmptyTitle>
                  <EmptyDescription>لم يتم إنشاء أي مسير رواتب للشهر المحدد</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={() => setShowGenerateDialog(true)}>
                    إنشاء مسير رواتب
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead>المشرف</TableHead>
                    <TableHead>عدد الموظفين</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>البريد</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map((record) => (
                    <TableRow key={record._id}>
                      <TableCell>
                        {new Date(record.generatedAt).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell>{record.branchName}</TableCell>
                      <TableCell>{record.supervisorName || "-"}</TableCell>
                      <TableCell>{record.employees.length}</TableCell>
                      <TableCell className="font-bold">{record.totalNetSalary.toLocaleString()} ر.س</TableCell>
                      <TableCell>
                        {record.emailSent ? (
                          <span className="text-xs text-green-600">✓ تم الإرسال</span>
                        ) : (
                          <span className="text-xs text-gray-400">لم يتم</span>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2">
                          <PayrollDetailsDialog record={record} />
                          <PDFExportButton payrollId={record._id} />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <TrashIcon className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف هذا السجل؟ هذا الإجراء لا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(record._id)}>
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </>
        )}
      </div>
    </div>
  );
}

function GeneratePayrollForm({ onGenerate, month, year }: { onGenerate: (supervisorName?: string) => void; month: number; year: number }) {
  const [supervisorName, setSupervisorName] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <Label>الشهر</Label>
        <Input value={`${month}/${year}`} disabled />
      </div>
      <div>
        <Label>اسم المشرف (اختياري)</Label>
        <Input
          placeholder="أدخل اسم المشرف"
          value={supervisorName}
          onChange={(e) => setSupervisorName(e.target.value)}
        />
      </div>
      <Button onClick={() => onGenerate(supervisorName || undefined)} className="w-full">
        إنشاء
      </Button>
    </div>
  );
}

function PayrollDetailsDialog({ record }: { record: PayrollRecordDoc }) {
  const monthNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <FileTextIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>مسير رواتب - {record.branchName}</DialogTitle>
          <DialogDescription>
            {monthNames[record.month - 1]} {record.year}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">عدد الموظفين</p>
              <p className="text-lg font-bold">{record.employees.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الإجمالي</p>
              <p className="text-lg font-bold">{record.totalNetSalary.toLocaleString()} ر.س</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>الأساسي</TableHead>
                <TableHead>بدل إشراف</TableHead>
                <TableHead>حوافز</TableHead>
                <TableHead>سلف</TableHead>
                <TableHead>خصومات</TableHead>
                <TableHead>الصافي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {record.employees.map((emp, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{emp.employeeName}</TableCell>
                  <TableCell>{emp.baseSalary.toLocaleString()}</TableCell>
                  <TableCell>{emp.supervisorAllowance.toLocaleString()}</TableCell>
                  <TableCell>{emp.incentives.toLocaleString()}</TableCell>
                  <TableCell className="text-red-600">
                    {emp.totalAdvances > 0 ? `-${emp.totalAdvances.toLocaleString()}` : "0"}
                  </TableCell>
                  <TableCell className="text-red-600">
                    {emp.totalDeductions > 0 ? `-${emp.totalDeductions.toLocaleString()}` : "0"}
                  </TableCell>
                  <TableCell className="font-bold">{emp.netSalary.toLocaleString()} ر.س</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PDFExportButton({ payrollId }: { payrollId: string }) {
  const handleExport = async () => {
    try {
      toast.loading("🔄 جاري إنشاء PDF عبر PDF.co...");
      // TODO: Create API endpoint /api/pdf/generate-payroll
      const result = await apiClient.post('/api/pdf/generate-payroll', { payrollId });
      toast.dismiss();
      if (result.success && result.url) {
        window.open(result.url, "_blank");
        toast.success("✅ تم إنشاء PDF بنجاح!");
      } else {
        toast.error("فشل إنشاء PDF");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("فشل إنشاء PDF");
      console.error(error);
    }
  };

  return (
    <Button variant="outline" size="icon" onClick={handleExport}>
      <DownloadIcon className="size-4" />
    </Button>
  );
}
