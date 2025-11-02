import { useState } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import Navbar from "@/components/navbar.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { BranchSelector } from "@/components/branch-selector.tsx";
import { useBranch } from "@/hooks/use-branch.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { 
  TrendingDownIcon,
  PlusIcon,
  CalendarIcon,
  DollarSignIcon,
  TagIcon,
  FilterIcon,
  TrashIcon,
  BarChart3Icon,
  FileDownIcon,
  PrinterIcon,
} from "lucide-react";
import { generateExpensesPDF } from "@/lib/pdf-export.ts";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const EXPENSE_CATEGORIES = [
  "رواتب",
  "إيجارات",
  "مرافق",
  "صيانة",
  "تسويق",
  "مشتريات",
  "مواد خام",
  "نقل",
  "تأمينات",
  "ضرائب",
  "أخرى",
];

type ExpenseDoc = Doc<"expenses">;
type ExpenseStats = {
  totalExpenses: number;
  totalCount: number;
  currentMonthTotal: number;
  currentMonthCount: number;
  averageExpense: number;
  categoryTotals: Array<{ category: string; total: number }>;
};

function ExpensesContent() {
  const { branchId, branchName, isSelected, selectBranch } = useBranch();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const expenses = useQuery(
    api.expenses.list,
    isSelected
      ? {
          branchId: branchId!,
          category: selectedCategory === "all" ? undefined : selectedCategory,
        }
      : "skip",
  ) as ExpenseDoc[] | undefined;
  const stats = useQuery(
    api.expenses.getStats,
    isSelected ? { branchId: branchId! } : "skip",
  ) as ExpenseStats | undefined;
  const createExpense = useMutation(api.expenses.create);
  const removeExpense = useMutation(api.expenses.remove);

  const expensesList: ExpenseDoc[] = expenses ?? [];

  if (!isSelected) {
    return (
      <>
        <Navbar />
        <BranchSelector onBranchSelected={selectBranch} />
      </>
    );
  }

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !amount || !category) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    try {
      await createExpense({
        title: title.trim(),
        amount: amountNum,
        category,
        description: description.trim() || undefined,
        date: new Date(date).getTime(),
        branchId: branchId!,
        branchName: branchName!,
      });

      toast.success("تم إضافة المصروف بنجاح");
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء إضافة المصروف";
      toast.error(errorMessage, { duration: 6000 });
      console.error("Create expense error:", error);
    }
  };

  const handleDeleteExpense = async (id: Id<"expenses">) => {
    try {
      await removeExpense({ id });
      toast.success("تم حذف المصروف بنجاح");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء حذف المصروف";
      toast.error(errorMessage, { duration: 6000 });
      console.error("Delete expense error:", error);
    }
  };

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setCategory("");
    setDescription("");
    setDate(format(new Date(), "yyyy-MM-dd"));
  };

  if (!stats || !expenses) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Skeleton className="h-full w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header with Branch Name */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">المصروفات</h1>
              <p className="text-muted-foreground">{branchName}</p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon className="ml-2 size-4" />
              إضافة مصروف جديد
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
                <TrendingDownIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats.totalExpenses.toFixed(2)} ريال
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalCount} مصروف
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مصروفات الشهر</CardTitle>
                <CalendarIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.currentMonthTotal.toFixed(2)} ريال
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.currentMonthCount} مصروف هذا الشهر
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط المصروف</CardTitle>
                <DollarSignIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.averageExpense.toFixed(2)} ريال
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">التصنيفات</CardTitle>
                <BarChart3Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.categoryTotals.length}
                </div>
                <p className="text-xs text-muted-foreground">تصنيف نشط</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle>قائمة المصروفات</CardTitle>
                  <div className="flex items-center gap-2">
                    <FilterIcon className="size-4 text-muted-foreground" />
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="التصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع التصنيفات</SelectItem>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Export and Print Buttons */}
                {expensesList.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const pdfData = expensesList.map((exp) => ({
                          title: exp.title,
                          category: exp.category,
                          amount: exp.amount,
                          date: new Date(exp.date),
                          description: exp.description || "-",
                        }));

                        const totalExpenses = expensesList.reduce(
                          (sum: number, expense: ExpenseDoc) => sum + expense.amount,
                          0,
                        );
                        const categoryBreakdown = EXPENSE_CATEGORIES.map((cat) => {
                          const categoryTotal = expensesList
                            .filter((expense) => expense.category === cat)
                            .reduce(
                              (sum: number, expense: ExpenseDoc) => sum + expense.amount,
                              0,
                            );
                          return { category: cat, total: categoryTotal };
                        }).filter((item) => item.total > 0);

                        await generateExpensesPDF(
                          pdfData,
                          branchName || ""
                        );
                        
                        toast.success("تم تصدير PDF بنجاح");
                      }}
                    >
                      <FileDownIcon className="ml-2 size-4" />
                      تصدير PDF
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const pdfData = expensesList.map((exp) => ({
                          title: exp.title,
                          category: exp.category,
                          amount: exp.amount,
                          date: new Date(exp.date),
                          description: exp.description || "-",
                        }));

                        const totalExpenses = expensesList.reduce(
                          (sum: number, expense: ExpenseDoc) => sum + expense.amount,
                          0,
                        );
                        const categoryBreakdown = EXPENSE_CATEGORIES.map((cat) => {
                          const categoryTotal = expensesList
                            .filter((expense) => expense.category === cat)
                            .reduce(
                              (sum: number, expense: ExpenseDoc) => sum + expense.amount,
                              0,
                            );
                          return { category: cat, total: categoryTotal };
                        }).filter((item) => item.total > 0);

                        await generateExpensesPDF(
                          pdfData,
                          branchName || ""
                        );
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
              {expensesList.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <TrendingDownIcon />
                    </EmptyMedia>
                    <EmptyTitle>لا توجد مصروفات</EmptyTitle>
                    <EmptyDescription>
                      {selectedCategory === "all" 
                        ? "ابدأ بإضافة أول مصروف" 
                        : `لا توجد مصروفات في تصنيف "${selectedCategory}"`
                      }
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-4">
                  {expensesList.map((expense) => (
                    <Card key={expense._id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{expense.title}</h3>
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                                {expense.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="size-4" />
                                {format(new Date(expense.date), "PPP", { locale: ar })}
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSignIcon className="size-4" />
                                <span className="font-bold text-red-600">
                                  {expense.amount.toFixed(2)} ريال
                                </span>
                              </div>
                            </div>
                            {expense.description && (
                              <p className="text-sm text-muted-foreground">{expense.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة مصروف جديد</DialogTitle>
                <DialogDescription>
                  أدخل تفاصيل المصروف الجديد
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateExpense}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">العنوان *</Label>
                    <Input
                      id="title"
                      placeholder="مثال: فاتورة كهرباء"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">التصنيف *</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="اختر التصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">المبلغ (ريال) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">التاريخ *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      placeholder="تفاصيل إضافية (اختياري)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}>
                    إلغاء
                  </Button>
                  <Button type="submit">إضافة المصروف</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>تسجيل الدخول</CardTitle>
            </CardHeader>
            <CardContent>
              <SignInButton />
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Skeleton className="h-64 w-full max-w-md" />
        </div>
      </AuthLoading>
      <Authenticated>
        <ExpensesContent />
      </Authenticated>
    </>
  );
}
