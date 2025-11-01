import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  TrendingUpIcon,
  DollarSignIcon,
  CreditCardIcon,
  PiggyBankIcon,
  CalendarIcon,
  PlusIcon,
  XIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Trash2Icon,
  AlertTriangleIcon,
  FileDownIcon,
  PrinterIcon,
  Sparkles,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/hooks/use-branch.ts";
import { BranchSelector } from "@/components/branch-selector.tsx";
import Navbar from "@/components/navbar.tsx";
import { generateRevenuesPDF } from "@/lib/pdf-export.ts";
import { NotificationBanner } from "@/components/notification-banner.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";

type Employee = {
  name: string;
  revenue: number;
};

const BRANCH_EMPLOYEES: Record<string, string[]> = {
  "1010": ["عبدالحي جلال", "محمود عمارة", "علاء ناصر", "السيد محمد", "عمرو"],
  "2020": ["محمد إسماعيل", "محمد ناصر", "فارس محمد"],
};

export default function Revenues() {
  const { branchId, branchName, selectBranch } = useBranch();

  if (!branchId) {
    return <BranchSelector onBranchSelected={selectBranch} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Authenticated>
          <RevenuesContent branchId={branchId} branchName={branchName || ""} />
        </Authenticated>
        <Unauthenticated>
          <Card className="mx-auto mt-8 max-w-md shadow-2xl border-none bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center bg-gradient-to-br from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                يرجى تسجيل الدخول
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-info-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
                <SignInButton />
              </div>
            </CardContent>
          </Card>
        </Unauthenticated>
        <AuthLoading>
          <div className="space-y-6 animate-in fade-in duration-500">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid gap-4 md:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </AuthLoading>
      </main>
    </div>
  );
}

function RevenuesContent({ branchId, branchName }: { branchId: string; branchName: string }) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  
  const stats = useQuery(api.revenues.getStats, { branchId });
  const revenues = useQuery(api.revenues.list, { 
    branchId,
    month: currentMonth,
    year: currentYear,
  });
  
  const createRevenue = useMutation(api.revenues.create);
  const removeRevenue = useMutation(api.revenues.remove);
  const validateData = useAction(api.ai.validateRevenueData);
  const triggerPdfGenerated = useAction(api.zapier.sendToZapier);
  const generatePDFco = useAction(api.pdfAgent.generateRevenueReportPDF);

  const [date, setDate] = useState<string>(
    new Date(currentYear, currentMonth, new Date().getDate()).toISOString().split("T")[0]
  );
  const [cash, setCash] = useState<string>("");
  const [network, setNetwork] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [mismatchReason, setMismatchReason] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deleteId, setDeleteId] = useState<Id<"revenues"> | null>(null);

  const cashNum = parseFloat(cash) || 0;
  const networkNum = parseFloat(network) || 0;
  const budgetNum = parseFloat(budget) || 0;
  const calculatedTotal = cashNum + networkNum;
  const total = cashNum + networkNum; // المجموع = كاش + شبكة فقط (بدون موازنة)

  // شروط المطابقة
  const condition1 = true; // المجموع دائماً = كاش + شبكة (لأننا نحسبه كذلك)
  const condition2 = budgetNum === networkNum; // الموازنة = الشبكة
  const isMatched = condition1 && condition2;

  const employeeList = BRANCH_EMPLOYEES[branchId] || [];

  const handleAddEmployee = () => {
    if (employees.length >= 6) {
      toast.error("الحد الأقصى 6 موظفين");
      return;
    }
    setEmployees([...employees, { name: "", revenue: 0 }]);
  };

  const handleRemoveEmployee = (index: number) => {
    setEmployees(employees.filter((_, i) => i !== index));
  };

  const handleEmployeeChange = (index: number, field: "name" | "revenue", value: string | number) => {
    const updated = [...employees];
    if (field === "name") {
      updated[index].name = value as string;
    } else {
      updated[index].revenue = typeof value === "string" ? parseFloat(value) || 0 : value;
    }
    setEmployees(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cash || !network) {
      toast.error("يرجى إدخال الكاش والشبكة");
      return;
    }

    if (!isMatched && !mismatchReason.trim()) {
      toast.error("يرجى إدخال سبب عدم المطابقة");
      return;
    }

    // ⚠️ حماية من التلاعب: التحقق من مجموع إيرادات الموظفين
    const validEmployees = employees.filter(e => e.name && e.revenue > 0);
    if (validEmployees.length > 0) {
      const employeesTotal = validEmployees.reduce((sum: number, emp) => sum + emp.revenue, 0);
      const calculatedTotal = cashNum + networkNum;
      
      if (employeesTotal !== calculatedTotal) {
        toast.error(
          `⚠️ خطأ: مجموع إيرادات الموظفين (${employeesTotal.toLocaleString()} ر.س) لا يساوي المجموع الإجمالي (${calculatedTotal.toLocaleString()} ر.س = كاش ${cashNum.toLocaleString()} + شبكة ${networkNum.toLocaleString()}). يُرجى التحقق من الأرقام المدخلة.`,
          { duration: 8000 }
        );
        return;
      }
    }

    try {
      await createRevenue({
        date: new Date(date).getTime(),
        cash: cashNum,
        network: networkNum,
        budget: budgetNum,
        branchId,
        branchName,
        employees: employees.filter(e => e.name && e.revenue > 0),
        mismatchReason: !isMatched ? mismatchReason : undefined,
      });

      toast.success("تم إضافة الإيراد بنجاح");
      
      // 🤖 AI Data Validator Agent - التحقق الذكي من البيانات
      try {
        const historicalData = (revenues || []).map((r: { date: number; total?: number; isMatched?: boolean }) => ({
          date: r.date,
          total: r.total || 0,
          isMatched: r.isMatched || false,
        }));

        // Run validation in background (don't block user)
        validateData({
          revenue: {
            date: new Date(date).getTime(),
            cash: cashNum,
            network: networkNum,
            budget: budgetNum,
            total: cashNum + networkNum,
            calculatedTotal: cashNum + networkNum,
            isMatched,
            employees: validEmployees.length > 0 ? validEmployees : undefined,
          },
          branchId,
          branchName,
          historicalData,
        }).then((result) => {
          if (result.notification?.shouldCreate) {
            toast.info("🤖 AI: تم إنشاء تنبيه ذكي", { duration: 3000 });
          }
        }).catch((err) => {
          console.error("AI Validator error:", err);
        });
      } catch (aiError) {
        // AI validation failed silently, don't affect user flow
        console.error("AI validation error:", aiError);
      }
      
      // Reset form
      setCash("");
      setNetwork("");
      setBudget("");
      setMismatchReason("");
      setEmployees([]);
      setShowForm(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء إضافة الإيراد";
      toast.error(errorMessage, { duration: 6000 });
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await removeRevenue({ id: deleteId });
      toast.success("تم حذف الإيراد بنجاح");
      setDeleteId(null);
    } catch (error: any) {
      if (error?.message?.includes("صلاحيات")) {
        toast.error("⚠️ غير مصرح لك بحذف الإيرادات - صلاحيات أدمن فقط");
      } else if (error?.message?.includes("معتمد في البونص")) {
        toast.error("⚠️ لا يمكن حذف إيراد معتمد في البونص");
      } else {
        toast.error("فشل حذف الإيراد");
      }
    }
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* AI Smart Notifications */}
      <NotificationBanner branchId={branchId} />

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-success-500 to-emerald-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">إجمالي الإيرادات</CardTitle>
            <div className="rounded-xl bg-success-50 dark:bg-success-900/20 p-2.5 transition-transform group-hover:scale-110 duration-300">
              <TrendingUpIcon className="size-5 text-success-600 dark:text-success-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {stats ? `${stats.totalRevenue.toLocaleString()} ر.س` : <Skeleton className="h-8 w-24" />}
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-success-500 to-emerald-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">إجمالي الكاش</CardTitle>
            <div className="rounded-xl bg-success-50 dark:bg-success-900/20 p-2.5 transition-transform group-hover:scale-110 duration-300">
              <DollarSignIcon className="size-5 text-success-600 dark:text-success-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {stats ? `${stats.totalCash.toLocaleString()} ر.س` : <Skeleton className="h-8 w-24" />}
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-info-500 to-blue-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">إجمالي الشبكة</CardTitle>
            <div className="rounded-xl bg-info-50 dark:bg-info-900/20 p-2.5 transition-transform group-hover:scale-110 duration-300">
              <CreditCardIcon className="size-5 text-info-600 dark:text-info-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {stats ? `${stats.totalNetwork.toLocaleString()} ر.س` : <Skeleton className="h-8 w-24" />}
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-warning-500 to-amber-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">إجمالي الموازنة</CardTitle>
            <div className="rounded-xl bg-warning-50 dark:bg-warning-900/20 p-2.5 transition-transform group-hover:scale-110 duration-300">
              <PiggyBankIcon className="size-5 text-warning-600 dark:text-warning-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {stats ? `${stats.totalBudget.toLocaleString()} ر.س` : <Skeleton className="h-8 w-24" />}
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-500 to-pink-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">إيرادات الشهر الحالي</CardTitle>
            <div className="rounded-xl bg-secondary-50 dark:bg-secondary-900/20 p-2.5 transition-transform group-hover:scale-110 duration-300">
              <CalendarIcon className="size-5 text-secondary-600 dark:text-secondary-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {stats ? `${stats.currentMonthTotal.toLocaleString()} ر.س` : <Skeleton className="h-8 w-24" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Revenue Form */}
      {!showForm && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-success-500 via-primary-500 to-info-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
          <Button onClick={() => setShowForm(true)} className="relative w-full bg-success-500 hover:bg-success-600 text-white shadow-lg font-bold text-base py-6">
            <PlusIcon className="ml-2 size-5" />
            إضافة إيراد جديد
          </Button>
        </div>
      )}

      {showForm && (
        <Card className="border-none shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-success-50 to-primary-50 dark:from-success-900/20 dark:to-primary-900/20 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-success-500 p-2">
                  <PlusIcon className="size-5 text-white" />
                </div>
                <CardTitle className="text-xl font-extrabold">إضافة إيراد جديد</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="hover:bg-danger-100 dark:hover:bg-danger-900/30 hover:text-danger-600">
                <XIcon className="size-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">التاريخ</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cash">الكاش (نقدي)</Label>
                  <Input
                    id="cash"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="network">الشبكة (بطاقات)</Label>
                  <Input
                    id="network"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">الموازنة</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </div>

              {/* Calculated Total */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">المجموع المحسوب (كاش + شبكة):</span>
                  <span className="text-xl font-bold text-primary">{calculatedTotal.toLocaleString()} ر.س</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="font-semibold">حالة المطابقة:</span>
                  {isMatched ? (
                    <span className="flex items-center gap-2 text-green-600 font-semibold">
                      <CheckCircle2Icon className="size-5" />
                      مطابق
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-red-600 font-semibold">
                      <XCircleIcon className="size-5" />
                      غير مطابق
                    </span>
                  )}
                </div>
              </div>

              {!isMatched && (
                <div className="space-y-2">
                  <Label htmlFor="mismatchReason">سبب عدم المطابقة *</Label>
                  <Textarea
                    id="mismatchReason"
                    placeholder="يرجى كتابة سبب عدم المطابقة..."
                    value={mismatchReason}
                    onChange={(e) => setMismatchReason(e.target.value)}
                    required={!isMatched}
                    rows={3}
                  />
                </div>
              )}

              {/* Employees Section */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">موظفو الإيراد (اختياري)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddEmployee}
                    disabled={employees.length >= 6}
                  >
                    <PlusIcon className="ml-2 size-4" />
                    إضافة موظف ({employees.length}/6)
                  </Button>
                </div>

                {employees.map((employee, index) => (
                  <div key={index} className="flex gap-2">
                    <Select
                      value={employee.name}
                      onValueChange={(value) => handleEmployeeChange(index, "name", value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر موظف" />
                      </SelectTrigger>
                      <SelectContent>
                        {employeeList.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="الإيراد"
                      value={employee.revenue || ""}
                      onChange={(e) => handleEmployeeChange(index, "revenue", e.target.value)}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEmployee(index)}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="submit" className="w-full">
                حفظ الإيراد
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Month Navigation and Records Table */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>سجل الإيرادات</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                  <ChevronRightIcon className="size-4" />
                </Button>
                <span className="min-w-[150px] text-center font-semibold">{monthName}</span>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                  <ChevronLeftIcon className="size-4" />
                </Button>
              </div>
            </div>
            
            {/* Export and Print Buttons */}
            {revenues && revenues.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const pdfData = revenues.map((rev: { date: number; cash?: number; network?: number; budget?: number; total?: number; calculatedTotal?: number; isMatched?: boolean }) => ({
                      date: new Date(rev.date),
                      cash: rev.cash || 0,
                      network: rev.network || 0,
                      budget: rev.budget || 0,
                      total: rev.total || 0,
                      calculatedTotal: rev.calculatedTotal || 0,
                      isMatched: rev.isMatched ?? false,
                    }));

                    const totalCash = revenues.reduce((sum: number, r: { cash?: number }) => sum + (r.cash || 0), 0);
                    const totalNetwork = revenues.reduce((sum: number, r: { network?: number }) => sum + (r.network || 0), 0);
                    const totalBudget = revenues.reduce((sum: number, r: { budget?: number }) => sum + (r.budget || 0), 0);
                    const grandTotal = revenues.reduce((sum: number, r: { total?: number }) => sum + (r.total || 0), 0);

                    // Generate PDF with PDF.co
                    try {
                      toast.info("🔄 جاري إنشاء التقرير عبر PDF.co...");
                      
                      const result = await generatePDFco({
                        branchId: branchId,
                        branchName: branchName,
                        startDate: new Date(currentYear, currentMonth, 1).getTime(),
                        endDate: new Date(currentYear, currentMonth + 1, 0).getTime(),
                        revenues: revenues.map((rev: { date: number; cash?: number; network?: number; budget?: number; total?: number; calculatedTotal?: number; isMatched?: boolean }) => ({
                          date: rev.date,
                          cash: rev.cash || 0,
                          network: rev.network || 0,
                          budget: rev.budget || 0,
                          total: rev.total || 0,
                          calculatedTotal: rev.calculatedTotal || 0,
                          isMatched: rev.isMatched ?? false,
                        })),
                      });

                      if (result.success && result.pdfUrl) {
                        // Open PDF in new tab
                        window.open(result.pdfUrl, '_blank');
                        toast.success("✅ تم إنشاء التقرير بنجاح! (PDF.co)");
                        
                        // Trigger Zapier webhook
                        try {
                          await triggerPdfGenerated({
                            eventType: "pdf_generated",
                            payload: {
                              type: "revenue_report_export",
                              pdfUrl: result.pdfUrl,
                              fileName: result.fileName,
                              branchName,
                              month: currentMonth + 1,
                              year: currentYear,
                              totalCash,
                              totalNetwork,
                              totalBudget,
                              grandTotal,
                              recordCount: revenues.length,
                            },
                          });
                        } catch (zapierError) {
                          console.error("Zapier webhook failed:", zapierError);
                        }
                      } else {
                        throw new Error(result.error || "Failed to generate PDF");
                      }
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : "فشل إنشاء التقرير";
                      toast.error(`⚠️ ${errorMessage}`, { duration: 6000 });
                      console.error("PDF.co error:", error);
                    }
                  }}
                >
                  <FileDownIcon className="ml-2 size-4" />
                  تصدير PDF
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const pdfData = revenues.map((rev: { date: number; cash?: number; network?: number; budget?: number; total?: number; calculatedTotal?: number; isMatched?: boolean }) => ({
                      date: new Date(rev.date),
                      cash: rev.cash || 0,
                      network: rev.network || 0,
                      budget: rev.budget || 0,
                      total: rev.total || 0,
                      calculatedTotal: rev.calculatedTotal || 0,
                      isMatched: rev.isMatched ?? false,
                    }));

                    const totalCash = revenues.reduce((sum: number, r: { cash?: number }) => sum + (r.cash || 0), 0);
                    const totalNetwork = revenues.reduce((sum: number, r: { network?: number }) => sum + (r.network || 0), 0);
                    const totalBudget = revenues.reduce((sum: number, r: { budget?: number }) => sum + (r.budget || 0), 0);
                    const grandTotal = revenues.reduce((sum: number, r: { total?: number }) => sum + (r.total || 0), 0);

                    // Generate PDF with PDF.co for printing
                    try {
                      toast.info("🔄 جاري إنشاء التقرير للطباعة...");
                      
                      const result = await generatePDFco({
                        branchId: branchId,
                        branchName: branchName,
                        startDate: new Date(currentYear, currentMonth, 1).getTime(),
                        endDate: new Date(currentYear, currentMonth + 1, 0).getTime(),
                        revenues: revenues.map((rev: { date: number; cash?: number; network?: number; budget?: number; total?: number; calculatedTotal?: number; isMatched?: boolean }) => ({
                          date: rev.date,
                          cash: rev.cash || 0,
                          network: rev.network || 0,
                          budget: rev.budget || 0,
                          total: rev.total || 0,
                          calculatedTotal: rev.calculatedTotal || 0,
                          isMatched: rev.isMatched ?? false,
                        })),
                      });

                      if (result.success && result.pdfUrl) {
                        // Open in new tab for printing
                        const printWindow = window.open(result.pdfUrl, '_blank');
                        if (printWindow) {
                          printWindow.focus();
                          // Wait a bit then trigger print dialog
                          setTimeout(() => {
                            try {
                              printWindow.print();
                            } catch (e) {
                              console.log("Print dialog could not be triggered automatically");
                            }
                          }, 1000);
                        }
                        toast.success("✅ تم فتح التقرير للطباعة!");
                        
                        // Trigger Zapier webhook
                        try {
                          await triggerPdfGenerated({
                            eventType: "pdf_generated",
                            payload: {
                              type: "revenue_report_print",
                              pdfUrl: result.pdfUrl,
                              fileName: result.fileName,
                              branchName,
                              month: currentMonth + 1,
                              year: currentYear,
                              totalCash,
                              totalNetwork,
                              totalBudget,
                              grandTotal,
                              recordCount: revenues.length,
                            },
                          });
                        } catch (zapierError) {
                          console.error("Zapier webhook failed:", zapierError);
                        }
                      } else {
                        throw new Error(result.error || "Failed to generate PDF");
                      }
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : "فشل إنشاء التقرير";
                      toast.error(`⚠️ ${errorMessage}`, { duration: 6000 });
                      console.error("PDF.co error:", error);
                    }
                  }}
                >
                  <PrinterIcon className="ml-2 size-4" />
                  طباعة
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!revenues ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : revenues.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              لا توجد إيرادات لهذا الشهر
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الكاش</TableHead>
                    <TableHead className="text-right">الشبكة</TableHead>
                    <TableHead className="text-right">الموازنة</TableHead>
                    <TableHead className="text-right">المجموع</TableHead>
                    <TableHead className="text-right">الموظفون</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenues.map((revenue: { _id: Id<"revenues">; date: number; cash?: number; network?: number; budget?: number; total?: number; employees?: { name: string; revenue: number }[]; isMatched?: boolean; mismatchReason?: string }) => (
                    <TableRow key={revenue._id}>
                      <TableCell className="font-medium">
                        {new Date(revenue.date).toLocaleDateString("en-GB", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{(revenue.cash || 0).toLocaleString()} ر.س</TableCell>
                      <TableCell>{(revenue.network || 0).toLocaleString()} ر.س</TableCell>
                      <TableCell>{(revenue.budget || 0).toLocaleString()} ر.س</TableCell>
                      <TableCell className="font-semibold">
                        {(revenue.total || 0).toLocaleString()} ر.س
                      </TableCell>
                      <TableCell>
                        {revenue.employees && revenue.employees.length > 0 ? (
                          <div className="space-y-1">
                            {revenue.employees.map((emp: { name: string; revenue: number }, idx: number) => (
                              <div key={idx} className="text-sm">
                                {emp.name}: {emp.revenue.toLocaleString()} ر.س
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {revenue.isMatched ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2Icon className="size-4" />
                            <span className="text-sm font-semibold">مطابق</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-red-600">
                              <XCircleIcon className="size-4" />
                              <span className="text-sm font-semibold">غير مطابق</span>
                            </div>
                            {revenue.mismatchReason && (
                              <div className="text-xs text-muted-foreground">
                                السبب: {revenue.mismatchReason}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(revenue._id)}
                        >
                          <Trash2Icon className="size-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-red-600" />
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الإيراد؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}