import { useState, useEffect } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { SignInButton } from "@/components/ui/signin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PlusIcon, EditIcon, TrashIcon, DollarSignIcon, MinusIcon } from "lucide-react";
import { useBranch } from "@/hooks/use-branch";
import { BranchSelector } from "@/components/branch-selector";
import Navbar from "@/components/navbar";

export default function AdvancesDeductionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Unauthenticated>
        <div className="flex min-h-[80vh] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>يجب تسجيل الدخول</CardTitle>
              <CardDescription>الرجاء تسجيل الدخول لعرض السلف والخصومات</CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton />
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AuthLoading>
      <Authenticated>
        <AdvancesDeductionsContent />
      </Authenticated>
    </div>
  );
}

interface Advance {
  _id: string;
  employeeName: string;
  amount: number;
  month: number;
  year: number;
  description?: string;
}

interface Deduction {
  _id: string;
  employeeName: string;
  amount: number;
  reason: string;
  month: number;
  year: number;
  description?: string;
}

interface Employee {
  _id: string;
  employeeName: string;
}

function AdvancesDeductionsContent() {
  const { branchId, branchName } = useBranch();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [advances, setAdvances] = useState<Advance[] | undefined>(undefined);
  const [deductions, setDeductions] = useState<Deduction[] | undefined>(undefined);
  const [employees, setEmployees] = useState<Employee[] | undefined>(undefined);

  useEffect(() => {
    if (!branchId) {
      setAdvances(undefined);
      setDeductions(undefined);
      return;
    }
    // TODO: Create API endpoint /api/advances/list
    // fetch(`/api/advances/list?branchId=${branchId}&month=${selectedMonth}&year=${selectedYear}`).then(r => r.json()).then(setAdvances);
    // TODO: Create API endpoint /api/deductions/list
    // fetch(`/api/deductions/list?branchId=${branchId}&month=${selectedMonth}&year=${selectedYear}`).then(r => r.json()).then(setDeductions);
  }, [branchId, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!branchId) {
      setEmployees(undefined);
      return;
    }
    // TODO: Create API endpoint /api/employees/active
    // fetch(`/api/employees/active?branchId=${branchId}`).then(r => r.json()).then(setEmployees);
  }, [branchId]);

  // Calculate totals
  const totalAdvances = (advances ?? []).reduce((sum: number, advance: Advance) => sum + advance.amount, 0);
  const totalDeductions = (deductions ?? []).reduce((sum: number, deduction: Deduction) => sum + deduction.amount, 0);

  const months = [
    { value: 1, label: "يناير" },
    { value: 2, label: "فبراير" },
    { value: 3, label: "مارس" },
    { value: 4, label: "أبريل" },
    { value: 5, label: "مايو" },
    { value: 6, label: "يونيو" },
    { value: 7, label: "يوليو" },
    { value: 8, label: "أغسطس" },
    { value: 9, label: "سبتمبر" },
    { value: 10, label: "أكتوبر" },
    { value: 11, label: "نوفمبر" },
    { value: 12, label: "ديسمبر" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">السلف والخصومات</h1>
          <p className="text-muted-foreground">إدارة سلف وخصومات الموظفين</p>
        </div>
        <BranchSelector onBranchSelected={() => {}} />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>الفترة الزمنية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>الشهر</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>السنة</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي السلف</CardTitle>
            <DollarSignIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAdvances.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">
              {advances?.length || 0} سلفة
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الخصومات</CardTitle>
            <MinusIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeductions.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">
              {deductions?.length || 0} خصم
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="advances" className="space-y-4">
        <TabsList>
          <TabsTrigger value="advances">السلف</TabsTrigger>
          <TabsTrigger value="deductions">الخصومات</TabsTrigger>
        </TabsList>

        <TabsContent value="advances" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>السلف</CardTitle>
                <CardDescription>قائمة سلف الموظفين للفترة المحددة</CardDescription>
              </div>
              <AddAdvanceDialog
                branchId={branchId}
                branchName={branchName}
                employees={employees || []}
                month={selectedMonth}
                year={selectedYear}
              />
            </CardHeader>
            <CardContent>
              {advances === undefined ? (
                <Skeleton className="h-[300px] w-full" />
              ) : advances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <DollarSignIcon className="size-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">لا توجد سلف</p>
                  <p className="text-sm text-muted-foreground">لم يتم تسجيل أي سلف للفترة المحددة</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم الموظف</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.map((advance) => (
                      <TableRow key={advance._id}>
                        <TableCell className="font-medium">{advance.employeeName}</TableCell>
                        <TableCell>{advance.amount.toLocaleString()} ر.س</TableCell>
                        <TableCell>
                          {months.find((m) => m.value === advance.month)?.label} {advance.year}
                        </TableCell>
                        <TableCell>{advance.description || "-"}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-2">
                            <EditAdvanceDialog advance={advance} />
                            <DeleteAdvanceDialog advanceId={advance._id} employeeName={advance.employeeName} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deductions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>الخصومات</CardTitle>
                <CardDescription>قائمة خصومات الموظفين للفترة المحددة</CardDescription>
              </div>
              <AddDeductionDialog
                branchId={branchId}
                branchName={branchName}
                employees={employees || []}
                month={selectedMonth}
                year={selectedYear}
              />
            </CardHeader>
            <CardContent>
              {deductions === undefined ? (
                <Skeleton className="h-[300px] w-full" />
              ) : deductions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MinusIcon className="size-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">لا توجد خصومات</p>
                  <p className="text-sm text-muted-foreground">لم يتم تسجيل أي خصومات للفترة المحددة</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم الموظف</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>السبب</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductions.map((deduction) => (
                      <TableRow key={deduction._id}>
                        <TableCell className="font-medium">{deduction.employeeName}</TableCell>
                        <TableCell>{deduction.amount.toLocaleString()} ر.س</TableCell>
                        <TableCell>{deduction.reason}</TableCell>
                        <TableCell>
                          {months.find((m) => m.value === deduction.month)?.label} {deduction.year}
                        </TableCell>
                        <TableCell>{deduction.description || "-"}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-2">
                            <EditDeductionDialog deduction={deduction} />
                            <DeleteDeductionDialog deductionId={deduction._id} employeeName={deduction.employeeName} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Add Advance Dialog
function AddAdvanceDialog({
  branchId,
  branchName,
  employees,
  month,
  year,
}: {
  branchId: string | null;
  branchName: string | null;
  employees: Array<{ _id: string; employeeName: string }>;
  month: number;
  year: number;
}) {
  const [open, setOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !branchName) {
      toast.error("الرجاء اختيار فرع أولاً");
      return;
    }
    if (!selectedEmployeeId) {
      toast.error("الرجاء اختيار موظف");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح");
      return;
    }

    try {
      const employee = employees.find((e) => e._id === selectedEmployeeId);
      if (!employee) {
        toast.error("الموظف غير موجود");
        return;
      }

      // TODO: Create API endpoint /api/advances/create
      await apiClient.post('/api/advances/create', {
        branchId,
        branchName,
        employeeId: employee._id,
        employeeName: employee.employeeName,
        amount: parseFloat(amount),
        month,
        year,
        description: description || undefined,
      });

      toast.success("تم إضافة السلفة بنجاح");
      setOpen(false);
      setSelectedEmployeeId("");
      setAmount("");
      setDescription("");
    } catch (error) {
      toast.error("فشل إضافة السلفة");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4 ml-2" />
          إضافة سلفة
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة سلفة جديدة</DialogTitle>
          <DialogDescription>أدخل بيانات السلفة</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>الموظف</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر موظف" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp._id} value={emp._id}>
                    {emp.employeeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>المبلغ (ر.س)</Label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>الوصف (اختياري)</Label>
            <Textarea
              placeholder="تفاصيل إضافية..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">إضافة</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Advance Dialog
function EditAdvanceDialog({ advance }: { advance: { _id: string; amount: number; description?: string } }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(advance.amount.toString());
  const [description, setDescription] = useState(advance.description || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح");
      return;
    }

    try {
      // TODO: Create API endpoint /api/advances/update
      await apiClient.post('/api/advances/update', {
        advanceId: advance._id,
        amount: parseFloat(amount),
        description: description || undefined,
      });

      toast.success("تم تعديل السلفة بنجاح");
      setOpen(false);
    } catch (error) {
      toast.error("فشل تعديل السلفة");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <EditIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل السلفة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>المبلغ (ر.س)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>الوصف (اختياري)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">حفظ</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Delete Advance Dialog
function DeleteAdvanceDialog({ advanceId, employeeName }: { advanceId: string; employeeName: string }) {
  const handleDelete = async () => {
    try {
      // TODO: Create API endpoint /api/advances/delete
      await apiClient.post('/api/advances/delete', { advanceId });
      toast.success("تم حذف السلفة بنجاح");
    } catch (error) {
      toast.error("فشل حذف السلفة");
      console.error(error);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TrashIcon className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف السلفة</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من حذف سلفة {employeeName}؟ لا يمكن التراجع عن هذا الإجراء.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Add Deduction Dialog
function AddDeductionDialog({
  branchId,
  branchName,
  employees,
  month,
  year,
}: {
  branchId: string | null;
  branchName: string | null;
  employees: Array<{ _id: string; employeeName: string }>;
  month: number;
  year: number;
}) {
  const [open, setOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !branchName) {
      toast.error("الرجاء اختيار فرع أولاً");
      return;
    }
    if (!selectedEmployeeId) {
      toast.error("الرجاء اختيار موظف");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح");
      return;
    }
    if (!reason.trim()) {
      toast.error("الرجاء إدخال سبب الخصم");
      return;
    }

    try {
      const employee = employees.find((e) => e._id === selectedEmployeeId);
      if (!employee) {
        toast.error("الموظف غير موجود");
        return;
      }

      // TODO: Create API endpoint /api/deductions/create
      await apiClient.post('/api/deductions/create', {
        branchId,
        branchName,
        employeeId: employee._id,
        employeeName: employee.employeeName,
        amount: parseFloat(amount),
        month,
        year,
        reason,
        description: description || undefined,
      });

      toast.success("تم إضافة الخصم بنجاح");
      setOpen(false);
      setSelectedEmployeeId("");
      setAmount("");
      setReason("");
      setDescription("");
    } catch (error) {
      toast.error("فشل إضافة الخصم");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4 ml-2" />
          إضافة خصم
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة خصم جديد</DialogTitle>
          <DialogDescription>أدخل بيانات الخصم</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>الموظف</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر موظف" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp._id} value={emp._id}>
                    {emp.employeeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>المبلغ (ر.س)</Label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>السبب</Label>
            <Input
              placeholder="مثال: غياب، تأخير، مخالفة..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>الوصف (اختياري)</Label>
            <Textarea
              placeholder="تفاصيل إضافية..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">إضافة</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Deduction Dialog
function EditDeductionDialog({ deduction }: { deduction: { _id: string; amount: number; reason: string; description?: string } }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(deduction.amount.toString());
  const [reason, setReason] = useState(deduction.reason);
  const [description, setDescription] = useState(deduction.description || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح");
      return;
    }
    if (!reason.trim()) {
      toast.error("الرجاء إدخال سبب الخصم");
      return;
    }

    try {
      // TODO: Create API endpoint /api/deductions/update
      await apiClient.post('/api/deductions/update', {
        deductionId: deduction._id,
        amount: parseFloat(amount),
        reason,
        description: description || undefined,
      });

      toast.success("تم تعديل الخصم بنجاح");
      setOpen(false);
    } catch (error) {
      toast.error("فشل تعديل الخصم");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <EditIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل الخصم</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>المبلغ (ر.س)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>السبب</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>الوصف (اختياري)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">حفظ</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Delete Deduction Dialog
function DeleteDeductionDialog({ deductionId, employeeName }: { deductionId: string; employeeName: string }) {
  const handleDelete = async () => {
    try {
      // TODO: Create API endpoint /api/deductions/delete
      await apiClient.post('/api/deductions/delete', { deductionId });
      toast.success("تم حذف الخصم بنجاح");
    } catch (error) {
      toast.error("فشل حذف الخصم");
      console.error(error);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TrashIcon className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف الخصم</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من حذف خصم {employeeName}؟ لا يمكن التراجع عن هذا الإجراء.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
