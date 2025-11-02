import { useState, useEffect } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "@/hooks/use-auth";
import Navbar from "@/components/navbar.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PackageIcon,
  Sparkles,
  Activity,
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

// StatsCard Component with semantic colors and animations
interface StatsCardProps {
  title: string;
  value: string;
  growth: number;
  growthLabel: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  gradient: string;
  growthPositive?: boolean; // Override growth color logic
}

function StatsCard({
  title,
  value,
  growth,
  growthLabel,
  icon,
  iconBg,
  iconColor,
  gradient,
  growthPositive,
}: StatsCardProps) {
  const isPositive = growthPositive ?? growth >= 0;

  return (
    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-gray-800">
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</CardTitle>
        <div className={`rounded-xl ${iconBg} p-2.5 transition-transform group-hover:scale-110 duration-300`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{value}</div>
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <ArrowUpIcon className="size-4 text-success-500" />
          ) : (
            <ArrowDownIcon className="size-4 text-danger-500" />
          )}
          <span className={`text-sm font-semibold ${isPositive ? "text-success-600" : "text-danger-600"}`}>
            {growth > 0 ? "+" : ""}{growth.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">{growthLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  // TODO: Replace with API calls to Cloudflare backend
  // Example: const { data: stats } = useQuery('/api/dashboard/stats');
  const [stats, setStats] = useState<DashboardStats | undefined>(undefined);
  const [chartData, setChartData] = useState<DashboardChartPoint[] | undefined>(undefined);
  const [recentActivity, setRecentActivity] = useState<DashboardRecentActivity | undefined>(undefined);

  useEffect(() => {
    // TODO: Fetch dashboard stats from Cloudflare API
    // fetch('/api/dashboard/stats').then(res => res.json()).then(setStats);
    // fetch('/api/dashboard/chart-data').then(res => res.json()).then(setChartData);
    // fetch('/api/dashboard/recent-activity').then(res => res.json()).then(setRecentActivity);
  }, []);

  if (stats === undefined || chartData === undefined || recentActivity === undefined) {
    return (
      <div className="min-h-[calc(100vh-4rem)] overflow-y-auto bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container max-w-7xl py-8 px-4">
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-10 w-64 rounded-lg" />
              <Skeleton className="h-5 w-48 rounded-lg" />
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-none shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardHeader className="space-y-2 pb-3">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-8 w-32 rounded" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-20 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart Skeleton */}
            <Card className="border-none shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader>
                <Skeleton className="h-6 w-48 rounded" />
                <Skeleton className="h-4 w-64 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-96 w-full rounded" />
              </CardContent>
            </Card>
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
    <div className="min-h-[calc(100vh-4rem)] overflow-y-auto bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container max-w-7xl py-8 px-4">
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header with gradient badge */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-extrabold bg-gradient-to-br from-gray-900 via-primary-700 to-secondary-700 bg-clip-text text-transparent dark:from-white dark:via-primary-300 dark:to-secondary-300">
                  لوحة التحكم
                </h1>
                <Badge className="bg-primary-500/10 text-primary-700 border-primary-200 hover:bg-primary-500/20">
                  <Activity className="size-3 me-1" />
                  مباشر
                </Badge>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                نظرة عامة على الأداء المالي
              </p>
            </div>
            <Card className="border-none shadow-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">تاريخ اليوم</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {new Date().toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
              </div>
            </Card>
          </div>

          {/* Stats Cards with semantic colors */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="إجمالي الإيرادات"
              value={formatCurrency(stats.totalRevenue)}
              growth={stats.revenueGrowth}
              growthLabel="عن الشهر الماضي"
              icon={<TrendingUpIcon className="size-5" />}
              iconBg="bg-success-50 dark:bg-success-900/20"
              iconColor="text-success-600 dark:text-success-400"
              gradient="from-success-500 to-emerald-600"
              growthPositive={stats.revenueGrowth >= 0}
            />

            <StatsCard
              title="إجمالي المصروفات"
              value={formatCurrency(stats.totalExpenses)}
              growth={stats.expenseGrowth}
              growthLabel="عن الشهر الماضي"
              icon={<TrendingDownIcon className="size-5" />}
              iconBg="bg-danger-50 dark:bg-danger-900/20"
              iconColor="text-danger-600 dark:text-danger-400"
              gradient="from-danger-500 to-rose-600"
              growthPositive={stats.expenseGrowth < 0} // Lower expenses is good
            />

            <StatsCard
              title="صافي الدخل"
              value={formatCurrency(stats.netIncome)}
              growth={stats.netIncomeGrowth}
              growthLabel="عن الشهر الماضي"
              icon={<DollarSignIcon className="size-5" />}
              iconBg="bg-primary-50 dark:bg-primary-900/20"
              iconColor="text-primary-600 dark:text-primary-400"
              gradient="from-primary-500 to-cyan-600"
              growthPositive={stats.netIncomeGrowth >= 0}
            />

            <StatsCard
              title="الطلبات المعلقة"
              value={(stats.pendingProductOrdersCount + stats.pendingEmployeeOrdersCount).toString()}
              growth={0} // Placeholder - you can calculate growth if needed
              growthLabel={`${stats.pendingProductOrdersCount} منتجات، ${stats.pendingEmployeeOrdersCount} موظفين`}
              icon={<PackageIcon className="size-5" />}
              iconBg="bg-warning-50 dark:bg-warning-900/20"
              iconColor="text-warning-600 dark:text-warning-400"
              gradient="from-warning-500 to-amber-600"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart - Takes 2 columns */}
            <div className="lg:col-span-2">
              <Card className="border-none shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary-500" />
                    <CardTitle className="text-xl font-bold">الأداء المالي - آخر 6 أشهر</CardTitle>
                  </div>
                  <CardDescription className="text-base">مقارنة الإيرادات والمصروفات</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        fontWeight={600}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        fontWeight={600}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "20px", fontWeight: 600 }} />
                      <Bar
                        dataKey="revenue"
                        fill="#22c55e"
                        name="الإيرادات"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="expense"
                        fill="#f43f5e"
                        name="المصروفات"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats - Takes 1 column */}
            <Card className="border-none shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Activity className="size-5 text-info-500" />
                  ملخص الشهر الحالي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success-50 dark:bg-success-900/10 border border-success-200 dark:border-success-800">
                    <span className="text-sm font-semibold text-success-700 dark:text-success-400">عدد الإيرادات</span>
                    <Badge className="bg-success-500 text-white">{stats.currentMonth.revenues}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-danger-50 dark:bg-danger-900/10 border border-danger-200 dark:border-danger-800">
                    <span className="text-sm font-semibold text-danger-700 dark:text-danger-400">عدد المصروفات</span>
                    <Badge className="bg-danger-500 text-white">{stats.currentMonth.expenses}</Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">
                    مقارنة بالشهر الماضي
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <span className="text-muted-foreground font-medium">الإيرادات</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(stats.lastMonth.totalRevenue)}
                        </span>
                        {stats.revenueGrowth >= 0 ? (
                          <ArrowUpIcon className="size-4 text-success-500" />
                        ) : (
                          <ArrowDownIcon className="size-4 text-danger-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <span className="text-muted-foreground font-medium">المصروفات</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(stats.lastMonth.totalExpenses)}
                        </span>
                        {stats.expenseGrowth >= 0 ? (
                          <ArrowUpIcon className="size-4 text-danger-500" />
                        ) : (
                          <ArrowDownIcon className="size-4 text-success-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <span className="text-muted-foreground font-medium">صافي الدخل</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(stats.lastMonth.netIncome)}
                        </span>
                        {stats.netIncomeGrowth >= 0 ? (
                          <ArrowUpIcon className="size-4 text-success-500" />
                        ) : (
                          <ArrowDownIcon className="size-4 text-danger-500" />
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
            <Card className="border-none shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <TrendingUpIcon className="size-5 text-success-500" />
                  آخر الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.recentRevenues.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 rounded-full bg-success-50 dark:bg-success-900/20 flex items-center justify-center mb-3">
                      <TrendingUpIcon className="size-8 text-success-500" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      لا توجد إيرادات حتى الآن
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.recentRevenues.map((revenue) => (
                      <div
                        key={revenue._id}
                        className="flex items-center justify-between p-3 rounded-lg border border-success-100 dark:border-success-900/30 hover:bg-success-50 dark:hover:bg-success-900/10 transition-colors group"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                            {format(new Date(revenue.date), "d MMM yyyy", { locale: ar })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            كاش: <span className="font-semibold">{formatCurrency(revenue.cash || 0)}</span> • شبكة: <span className="font-semibold">{formatCurrency(revenue.network || 0)}</span>
                          </p>
                        </div>
                        <Badge className="bg-success-500 text-white text-sm font-bold px-3 py-1 group-hover:scale-110 transition-transform">
                          {formatCurrency(revenue.total || 0)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <TrendingDownIcon className="size-5 text-danger-500" />
                  آخر المصروفات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.recentExpenses.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 rounded-full bg-danger-50 dark:bg-danger-900/20 flex items-center justify-center mb-3">
                      <TrendingDownIcon className="size-8 text-danger-500" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      لا توجد مصروفات حتى الآن
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.recentExpenses.map((expense) => (
                      <div
                        key={expense._id}
                        className="flex items-center justify-between p-3 rounded-lg border border-danger-100 dark:border-danger-900/30 hover:bg-danger-50 dark:hover:bg-danger-900/10 transition-colors group"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                            {expense.title}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">
                            {expense.category}
                          </p>
                        </div>
                        <Badge className="bg-danger-500 text-white text-sm font-bold px-3 py-1 group-hover:scale-110 transition-transform">
                          {formatCurrency(expense.amount)}
                        </Badge>
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
    <div className="flex h-screen flex-col bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <Unauthenticated>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
          <Card className="shadow-2xl border-none bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 max-w-md w-full">
            <div className="text-center space-y-6 animate-in fade-in duration-700">
              {/* Lock Icon */}
              <div className="relative mx-auto w-fit">
                <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full"></div>
                <div className="relative mx-auto w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center">
                  <Sparkles className="size-10 text-primary-600" />
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-extrabold bg-gradient-to-br from-gray-900 via-primary-700 to-secondary-700 bg-clip-text text-transparent dark:from-white dark:via-primary-300 dark:to-secondary-300">
                  يرجى تسجيل الدخول
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-300">
                  سجل الدخول للوصول إلى لوحة التحكم
                </p>
              </div>

              <div className="pt-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-info-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
                  <SignInButton />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Card className="shadow-2xl border-none bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600"></div>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">جاري التحميل...</p>
            </div>
          </Card>
        </div>
      </AuthLoading>
      <Authenticated>
        <DashboardContent />
      </Authenticated>
    </div>
  );
}
