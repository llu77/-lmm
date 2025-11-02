import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel";
import Navbar from "@/components/navbar.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  DollarSignIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PackageIcon,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

type DashboardStats = {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  revenueGrowth: number;
  expenseGrowth: number;
  netIncomeGrowth: number;
  pendingProductOrdersCount: number;
  pendingEmployeeOrdersCount: number;
  currentMonth: {
    revenues: number;
    expenses: number;
  };
  lastMonth: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  };
};

type DashboardChartPoint = {
  month: string;
  revenue: number;
  expense: number;
};

type DashboardRecentActivity = {
  recentRevenues: Array<Doc<"revenues">>;
  recentExpenses: Array<Doc<"expenses">>;
};

function DashboardContent() {
  const stats = useQuery(api.dashboard.getStats) as DashboardStats | undefined;
  const chartData = useQuery(api.dashboard.getChartData) as DashboardChartPoint[] | undefined;
  const recentActivity = useQuery(api.dashboard.getRecentActivity) as DashboardRecentActivity | undefined;

  if (stats === undefined || chartData === undefined || recentActivity === undefined) {
    return (
      <div className="h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="container max-w-7xl py-6">
          <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
    }).format(amount);
  };

  const formatGrowth = (growth: number) => {
    return `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`;
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="container max-w-7xl py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">لوحة التحكم</h1>
              <p className="text-muted-foreground mt-1">نظرة عامة على الأداء المالي</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("ar-SA", { 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                <TrendingUpIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {stats.revenueGrowth >= 0 ? (
                    <ArrowUpIcon className="size-3 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="size-3 text-red-500" />
                  )}
                  <span className={stats.revenueGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                    {formatGrowth(stats.revenueGrowth)}
                  </span>
                  عن الشهر الماضي
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
                <TrendingDownIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {stats.expenseGrowth >= 0 ? (
                    <ArrowUpIcon className="size-3 text-red-500" />
                  ) : (
                    <ArrowDownIcon className="size-3 text-green-500" />
                  )}
                  <span className={stats.expenseGrowth >= 0 ? "text-red-500" : "text-green-500"}>
                    {formatGrowth(stats.expenseGrowth)}
                  </span>
                  عن الشهر الماضي
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">صافي الدخل</CardTitle>
                <DollarSignIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.netIncome)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {stats.netIncomeGrowth >= 0 ? (
                    <ArrowUpIcon className="size-3 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="size-3 text-red-500" />
                  )}
                  <span className={stats.netIncomeGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                    {formatGrowth(stats.netIncomeGrowth)}
                  </span>
                  عن الشهر الماضي
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الطلبات المعلقة</CardTitle>
                <PackageIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.pendingProductOrdersCount + stats.pendingEmployeeOrdersCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pendingProductOrdersCount} منتجات، {stats.pendingEmployeeOrdersCount} موظفين
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart - Takes 2 columns */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>الأداء المالي - آخر 6 أشهر</CardTitle>
                  <CardDescription>مقارنة الإيرادات والمصروفات</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis 
                        dataKey="month" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="الإيرادات" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="hsl(var(--chart-2))" name="المصروفات" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats - Takes 1 column */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ملخص الشهر الحالي</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">عدد الإيرادات</span>
                    <span className="font-semibold">{stats.currentMonth.revenues}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">عدد المصروفات</span>
                    <span className="font-semibold">{stats.currentMonth.expenses}</span>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">مقارنة بالشهر الماضي</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">الإيرادات</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(stats.lastMonth.totalRevenue)}</span>
                        {stats.revenueGrowth >= 0 ? (
                          <ArrowUpIcon className="size-3 text-green-500" />
                        ) : (
                          <ArrowDownIcon className="size-3 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">المصروفات</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(stats.lastMonth.totalExpenses)}</span>
                        {stats.expenseGrowth >= 0 ? (
                          <ArrowUpIcon className="size-3 text-red-500" />
                        ) : (
                          <ArrowDownIcon className="size-3 text-green-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">صافي الدخل</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(stats.lastMonth.netIncome)}</span>
                        {stats.netIncomeGrowth >= 0 ? (
                          <ArrowUpIcon className="size-3 text-green-500" />
                        ) : (
                          <ArrowDownIcon className="size-3 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">آخر الإيرادات</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.recentRevenues.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد إيرادات حتى الآن
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.recentRevenues.map((revenue) => (
                      <div key={revenue._id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(revenue.date), "d MMM yyyy", { locale: ar })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            كاش: {formatCurrency(revenue.cash || 0)} • شبكة: {formatCurrency(revenue.network || 0)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-green-500">
                          {formatCurrency(revenue.total || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">آخر المصروفات</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.recentExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد مصروفات حتى الآن
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.recentExpenses.map((expense) => (
                      <div key={expense._id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{expense.title}</p>
                          <p className="text-xs text-muted-foreground">{expense.category}</p>
                        </div>
                        <p className="text-sm font-semibold text-red-500">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar />
      <Unauthenticated>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center space-y-6">
            <h1 className="text-4xl text-balance font-bold tracking-tight">
              يرجى تسجيل الدخول
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              سجل الدخول للوصول إلى لوحة التحكم
            </p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>
      </AuthLoading>
      <Authenticated>
        <DashboardContent />
      </Authenticated>
    </div>
  );
}
