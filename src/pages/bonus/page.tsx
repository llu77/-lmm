import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useBranch } from "@/hooks/use-branch.ts";
import { BranchSelector } from "@/components/branch-selector.tsx";
import Navbar from "@/components/navbar.tsx";
import { CheckCircle2, XCircle, CalendarIcon, TrendingUpIcon, CoinsIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

type WeekBonusResponse = {
  totalBonusPaid: number;
  employeeBonuses: Array<{
    employeeName: string;
    totalRevenue: number;
    bonusAmount: number;
    isEligible: boolean;
  }>;
  canApprove: boolean;
  isAlreadyApproved: boolean;
  startDay: number;
  endDay: number;
  weekLabel: string;
  month: number;
  year: number;
};

type BonusRecord = Doc<"bonusRecords">;

function BonusPageInner() {
  const { branchId, branchName, selectBranch } = useBranch();
  const [isApproving, setIsApproving] = useState(false);

  const currentWeekData = useQuery(
    api.bonus.getCurrentWeekRevenues,
    branchId ? { branchId } : "skip",
  ) as WeekBonusResponse | undefined;
  const bonusRecords = useQuery(
    api.bonus.getBonusRecords,
    branchId ? { branchId } : "skip",
  ) as BonusRecord[] | undefined;
  const approveBonus = useMutation(api.bonus.approveBonus);

  if (!branchId || !branchName) {
    return <BranchSelector onBranchSelected={selectBranch} />;
  }

  const handleApprove = async () => {
    if (!currentWeekData || !branchId || !branchName) return;

    if (!currentWeekData.canApprove) {
      toast.error("يمكن اعتماد البونص فقط في اليوم الأول من الأسبوع");
      return;
    }

    setIsApproving(true);
    try {
      await approveBonus({ branchId, branchName });
      toast.success("تم اعتماد البونص بنجاح");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء اعتماد البونص";
      toast.error(errorMessage, { duration: 6000 });
      console.error("Approve bonus error:", error);
    } finally {
      setIsApproving(false);
    }
  };

  if (!currentWeekData || !bonusRecords) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const monthNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">البونص الأسبوعي</h1>
            <p className="text-muted-foreground mt-1">
              {branchName} - {monthNames[currentWeekData.month - 1]} {currentWeekData.year}
            </p>
          </div>
          <div className="text-left">
            <div className="text-sm text-muted-foreground">الفترة</div>
            <div className="text-lg font-bold">
              {currentWeekData.startDay} - {currentWeekData.endDay} {monthNames[currentWeekData.month - 1]}
            </div>
            <div className="text-sm font-medium text-primary">
              {currentWeekData.weekLabel}
            </div>
          </div>
        </div>

        {/* إحصائيات */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي البونص</CardTitle>
              <CoinsIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentWeekData.totalBonusPaid.toFixed(2)} ر.س</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">عدد الموظفين</CardTitle>
              <UsersIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentWeekData.employeeBonuses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">المستحقون</CardTitle>
              <CheckCircle2 className="size-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentWeekData.employeeBonuses.filter((e) => e.isEligible).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الحالة</CardTitle>
              <CalendarIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {currentWeekData.isAlreadyApproved ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    معتمد
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    قيد المراجعة
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* جدول البونص الحالي */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>بونص {currentWeekData.weekLabel}</CardTitle>
              {currentWeekData.canApprove && (
                <Button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isApproving ? "جاري الاعتماد..." : "اعتماد البونص"}
                </Button>
              )}
              {currentWeekData.isAlreadyApproved && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  تم الاعتماد
                </Badge>
              )}
              {!currentWeekData.canApprove && !currentWeekData.isAlreadyApproved && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  غير متاح للاعتماد
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {currentWeekData.canApprove
                ? "يمكن اعتماد البونص اليوم (اليوم الأول من الأسبوع)"
                : currentWeekData.isAlreadyApproved
                  ? "تم اعتماد البونص لهذا الأسبوع"
                  : "يمكن اعتماد البونص فقط في اليوم الأول من كل أسبوع"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-3 font-semibold">اسم الموظف</th>
                    <th className="text-right p-3 font-semibold">إجمالي الإيرادات</th>
                    <th className="text-right p-3 font-semibold">البونص</th>
                    <th className="text-right p-3 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {currentWeekData.employeeBonuses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center p-8 text-muted-foreground">
                        لا توجد بيانات إيرادات لهذا الأسبوع
                      </td>
                    </tr>
                  ) : (
                    currentWeekData.employeeBonuses.map((employee, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{employee.employeeName}</td>
                        <td className="p-3">{employee.totalRevenue.toFixed(2)} ر.س</td>
                        <td className="p-3">
                          <span
                            className={
                              employee.isEligible
                                ? "font-bold text-green-600"
                                : "text-muted-foreground"
                            }
                          >
                            {employee.bonusAmount.toFixed(2)} ر.س
                          </span>
                        </td>
                        <td className="p-3">
                          {employee.isEligible ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="size-4" />
                              <span className="font-medium">مستحق</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600">
                              <XCircle className="size-4" />
                              <span className="font-medium">غير مستحق</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>


          </CardContent>
        </Card>

        {/* سجل البونص المعتمد */}
        <Card>
          <CardHeader>
            <CardTitle>سجل البونص المعتمد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bonusRecords.length === 0 ? (
                <p className="text-center p-8 text-muted-foreground">
                  لا توجد سجلات بونص معتمدة بعد
                </p>
              ) : (
                bonusRecords.map((record) => (
                  <div
                    key={record._id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{record.weekLabel}</h3>
                        <p className="text-sm text-muted-foreground">
                          {monthNames[record.month - 1]} {record.year} ({format(new Date(record.startDate), "d MMM", { locale: ar })} - {format(new Date(record.endDate), "d MMM", { locale: ar })})
                        </p>
                      </div>
                      <div className="text-left">
                        <div className="text-sm text-muted-foreground">إجمالي البونص</div>
                        <div className="text-lg font-bold text-green-600">
                          {record.totalBonusPaid.toFixed(2)} ر.س
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-right p-2">الموظف</th>
                            <th className="text-right p-2">الإيرادات</th>
                            <th className="text-right p-2">البونص</th>
                            <th className="text-right p-2">الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.employeeBonuses.map((emp, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-2">{emp.employeeName}</td>
                              <td className="p-2">{emp.totalRevenue.toFixed(2)} ر.س</td>
                              <td className="p-2 font-medium text-green-600">
                                {emp.bonusAmount.toFixed(2)} ر.س
                              </td>
                              <td className="p-2">
                                {emp.isEligible ? (
                                  <CheckCircle2 className="size-4 text-green-600 inline" />
                                ) : (
                                  <XCircle className="size-4 text-red-600 inline" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      تاريخ الاعتماد: {format(new Date(record.approvedAt), "PPP p", { locale: ar })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BonusPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>تسجيل الدخول مطلوب</CardTitle>
            </CardHeader>
            <CardContent>
              <SignInButton />
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Skeleton className="h-64 w-96" />
        </div>
      </AuthLoading>
      <Authenticated>
        <BonusPageInner />
      </Authenticated>
    </>
  );
}