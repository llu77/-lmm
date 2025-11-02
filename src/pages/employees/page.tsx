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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { toast } from "sonner";
import { useBranch } from "@/hooks/use-branch";
import { BranchSelector } from "@/components/branch-selector";
import {
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SearchIcon,
  DollarSignIcon,
  UserCheckIcon,
  UserXIcon,
  CalendarIcon,
  IdCardIcon
} from "lucide-react";

interface EmployeeDoc {
  _id: string;
  employeeName: string;
  nationalId?: string;
  idExpiryDate?: number;
  baseSalary: number;
  supervisorAllowance: number;
  incentives: number;
  isActive: boolean;
}

export default function EmployeesPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>تسجيل الدخول مطلوب</CardTitle>
              <CardDescription>يرجى تسجيل الدخول للوصول إلى صفحة الموظفين</CardDescription>
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
        <EmployeesPageContent />
      </Authenticated>
    </>
  );
}

function EmployeesPageContent() {
  const { branchId, branchName, selectBranch } = useBranch();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");
  const [employees, setEmployees] = useState<EmployeeDoc[] | undefined>(undefined);

  useEffect(() => {
    if (!branchId) {
      setEmployees(undefined);
      return;
    }
    // TODO: Create API endpoint /api/employees/list
    // fetch(`/api/employees/list?branchId=${branchId}`).then(r => r.json()).then(setEmployees);
  }, [branchId]);

  const handleDelete = async (id: string) => {
    try {
      // TODO: Create API endpoint /api/employees/delete
      await apiClient.post('/api/employees/delete', { employeeId: id });
      toast.success("تم حذف الموظف بنجاح");
    } catch (error) {
      toast.error("فشل حذف الموظف");
      console.error(error);
    }
  };

  // Filter and search employees
  const filteredEmployees = (employees ?? []).filter((emp: EmployeeDoc) => {
    const matchesSearch = emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.nationalId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      activeFilter === "all" ? true :
      activeFilter === "active" ? emp.isActive :
      !emp.isActive;

    return matchesSearch && matchesFilter;
  });

  const totalEmployees = filteredEmployees.length;
  const activeEmployees = filteredEmployees.filter(emp => emp.isActive).length;
  const totalSalaries = filteredEmployees.reduce((sum: number, emp: EmployeeDoc) =>
    sum + emp.baseSalary + emp.supervisorAllowance + emp.incentives, 0
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة الموظفين</h1>
            <p className="text-muted-foreground">عرض وإدارة بيانات الموظفين</p>
          </div>
          <BranchSelector onBranchSelected={selectBranch} />
        </div>

        {!branchId && (
          <Card>
            <CardContent className="py-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UsersIcon />
                  </EmptyMedia>
                  <EmptyTitle>اختر الفرع</EmptyTitle>
                  <EmptyDescription>
                    يرجى اختيار الفرع من الأعلى لعرض بيانات الموظفين
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        )}

        {branchId && (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الموظفين</CardTitle>
                  <UsersIcon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalEmployees}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الموظفون النشطون</CardTitle>
                  <UserCheckIcon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{activeEmployees}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الرواتب</CardTitle>
                  <DollarSignIcon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalSalaries.toLocaleString()} ر.س</div>
                </CardContent>
              </Card>
            </div>

            {/* Employees Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>قائمة الموظفين</CardTitle>
                    <CardDescription>عرض وإدارة بيانات الموظفين</CardDescription>
                  </div>
                  <AddEmployeeDialog branchId={branchId} branchName={branchName || ""} />
                </div>
                <div className="flex items-center gap-4 pt-4">
                  {/* Search */}
                  <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالاسم أو رقم الهوية..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-9"
                    />
                  </div>
                  {/* Filter Tabs */}
                  <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as "all" | "active" | "inactive")}>
                    <TabsList>
                      <TabsTrigger value="all">الكل</TabsTrigger>
                      <TabsTrigger value="active">نشط</TabsTrigger>
                      <TabsTrigger value="inactive">غير نشط</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {employees === undefined ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <UsersIcon />
                      </EmptyMedia>
                      <EmptyTitle>لا يوجد موظفون</EmptyTitle>
                      <EmptyDescription>
                        {searchQuery ? "لا توجد نتائج للبحث" : "لم يتم إضافة أي موظفين بعد"}
                      </EmptyDescription>
                    </EmptyHeader>
                    {!searchQuery && (
                      <EmptyContent>
                        <AddEmployeeDialog branchId={branchId} branchName={branchName || ""} />
                      </EmptyContent>
                    )}
                  </Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>رقم الهوية</TableHead>
                        <TableHead>تاريخ الانتهاء</TableHead>
                        <TableHead>الراتب الأساسي</TableHead>
                        <TableHead>بدل الإشراف</TableHead>
                        <TableHead>الحوافز</TableHead>
                        <TableHead>الإجمالي</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="text-left">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow key={employee._id}>
                          <TableCell className="font-medium">{employee.employeeName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <IdCardIcon className="size-3.5 text-muted-foreground" />
                              {employee.nationalId || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {employee.idExpiryDate ? (
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="size-3.5 text-muted-foreground" />
                                {new Date(employee.idExpiryDate).toLocaleDateString("ar-EG")}
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell>{employee.baseSalary.toLocaleString()} ر.س</TableCell>
                          <TableCell>{employee.supervisorAllowance.toLocaleString()} ر.س</TableCell>
                          <TableCell>{employee.incentives.toLocaleString()} ر.س</TableCell>
                          <TableCell className="font-bold">
                            {(employee.baseSalary + employee.supervisorAllowance + employee.incentives).toLocaleString()} ر.س
                          </TableCell>
                          <TableCell>
                            {employee.isActive ? (
                              <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200">
                                <UserCheckIcon className="ml-1 size-3" />
                                نشط
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                                <UserXIcon className="ml-1 size-3" />
                                غير نشط
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-2">
                              <EditEmployeeDialog employee={employee} />
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
                                      هل أنت متأكد من حذف الموظف "{employee.employeeName}"? هذا الإجراء لا يمكن التراجع عنه.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(employee._id)}>
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

function AddEmployeeDialog({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeName: "",
    nationalId: "",
    idExpiryDate: "",
    baseSalary: "",
    supervisorAllowance: "",
    incentives: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeName || !formData.baseSalary) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    try {
      // TODO: Create API endpoint /api/employees/create
      await apiClient.post('/api/employees/create', {
        branchId,
        branchName,
        employeeName: formData.employeeName,
        nationalId: formData.nationalId || undefined,
        idExpiryDate: formData.idExpiryDate ? new Date(formData.idExpiryDate).getTime() : undefined,
        baseSalary: Number(formData.baseSalary),
        supervisorAllowance: Number(formData.supervisorAllowance) || 0,
        incentives: Number(formData.incentives) || 0,
      });

      toast.success("تم إضافة الموظف بنجاح");
      setOpen(false);
      setFormData({
        employeeName: "",
        nationalId: "",
        idExpiryDate: "",
        baseSalary: "",
        supervisorAllowance: "",
        incentives: "",
      });
    } catch (error) {
      toast.error("فشل إضافة الموظف");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="ml-2 size-4" />
          إضافة موظف
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة موظف جديد</DialogTitle>
          <DialogDescription>أدخل بيانات الموظف الجديد</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeName">اسم الموظف *</Label>
              <Input
                id="employeeName"
                placeholder="أدخل اسم الموظف"
                value={formData.employeeName}
                onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationalId">رقم الهوية</Label>
              <Input
                id="nationalId"
                placeholder="أدخل رقم الهوية"
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idExpiryDate">تاريخ انتهاء الهوية</Label>
              <Input
                id="idExpiryDate"
                type="date"
                value={formData.idExpiryDate}
                onChange={(e) => setFormData({ ...formData, idExpiryDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseSalary">الراتب الأساسي * (ر.س)</Label>
              <Input
                id="baseSalary"
                type="number"
                placeholder="0"
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supervisorAllowance">بدل الإشراف (ر.س)</Label>
              <Input
                id="supervisorAllowance"
                type="number"
                placeholder="0"
                value={formData.supervisorAllowance}
                onChange={(e) => setFormData({ ...formData, supervisorAllowance: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incentives">الحوافز (ر.س)</Label>
              <Input
                id="incentives"
                type="number"
                placeholder="0"
                value={formData.incentives}
                onChange={(e) => setFormData({ ...formData, incentives: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">
              إضافة الموظف
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployeeDialog({ employee }: { employee: EmployeeDoc }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeName: employee.employeeName,
    nationalId: employee.nationalId || "",
    idExpiryDate: employee.idExpiryDate ? new Date(employee.idExpiryDate).toISOString().split('T')[0] : "",
    baseSalary: employee.baseSalary.toString(),
    supervisorAllowance: employee.supervisorAllowance.toString(),
    incentives: employee.incentives.toString(),
    isActive: employee.isActive,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // TODO: Create API endpoint /api/employees/update
      await apiClient.post('/api/employees/update', {
        employeeId: employee._id,
        employeeName: formData.employeeName,
        nationalId: formData.nationalId || undefined,
        idExpiryDate: formData.idExpiryDate ? new Date(formData.idExpiryDate).getTime() : undefined,
        baseSalary: Number(formData.baseSalary),
        supervisorAllowance: Number(formData.supervisorAllowance),
        incentives: Number(formData.incentives),
        isActive: formData.isActive,
      });

      toast.success("تم تحديث بيانات الموظف بنجاح");
      setOpen(false);
    } catch (error) {
      toast.error("فشل تحديث بيانات الموظف");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <PencilIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الموظف</DialogTitle>
          <DialogDescription>تحديث بيانات {employee.employeeName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-employeeName">اسم الموظف</Label>
              <Input
                id="edit-employeeName"
                value={formData.employeeName}
                onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nationalId">رقم الهوية</Label>
              <Input
                id="edit-nationalId"
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-idExpiryDate">تاريخ انتهاء الهوية</Label>
              <Input
                id="edit-idExpiryDate"
                type="date"
                value={formData.idExpiryDate}
                onChange={(e) => setFormData({ ...formData, idExpiryDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-baseSalary">الراتب الأساسي (ر.س)</Label>
              <Input
                id="edit-baseSalary"
                type="number"
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-supervisorAllowance">بدل الإشراف (ر.س)</Label>
              <Input
                id="edit-supervisorAllowance"
                type="number"
                value={formData.supervisorAllowance}
                onChange={(e) => setFormData({ ...formData, supervisorAllowance: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-incentives">الحوافز (ر.س)</Label>
              <Input
                id="edit-incentives"
                type="number"
                value={formData.incentives}
                onChange={(e) => setFormData({ ...formData, incentives: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-isActive">الحالة</Label>
              <select
                id="edit-isActive"
                value={formData.isActive ? "active" : "inactive"}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
