import { useState, useEffect } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { SignInButton } from "@/components/ui/signin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BrainIcon,
  SparklesIcon,
  ShieldCheckIcon,
  MailIcon,
  FileTextIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  ZapIcon,
  BarChart3Icon,
  LightbulbIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/hooks/use-branch.ts";
import { BranchSelector } from "@/components/branch-selector.tsx";
import Navbar from "@/components/navbar.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Badge } from "@/components/ui/badge.tsx";

export default function AIAssistant() {
  const { branchId, branchName, selectBranch } = useBranch();

  if (!branchId) {
    return <BranchSelector onBranchSelected={selectBranch} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Authenticated>
          <AIAssistantContent branchId={branchId} branchName={branchName || ""} />
        </Authenticated>
        <Unauthenticated>
          <Card className="mx-auto mt-8 max-w-md">
            <CardHeader>
              <CardTitle>يرجى تسجيل الدخول</CardTitle>
            </CardHeader>
            <CardContent>
              <SignInButton />
            </CardContent>
          </Card>
        </Unauthenticated>
        <AuthLoading>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </AuthLoading>
      </main>
    </div>
  );
}

function AIAssistantContent({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
          <BrainIcon className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">مساعد AI المتقدم</h1>
          <p className="text-muted-foreground">نظام Multi-Agent ذكي مع Reasoning Chains</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="validator">التحقق</TabsTrigger>
          <TabsTrigger value="patterns">الأنماط</TabsTrigger>
          <TabsTrigger value="content">المحتوى</TabsTrigger>
          <TabsTrigger value="email">الإيميلات</TabsTrigger>
          <TabsTrigger value="ultrathink">Ultra Think</TabsTrigger>
          <TabsTrigger value="deepanalysis">تحليل عميق</TabsTrigger>
          <TabsTrigger value="solveling">الحلول</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab branchId={branchId} branchName={branchName} />
        </TabsContent>

        <TabsContent value="validator">
          <ValidatorTab branchId={branchId} branchName={branchName} />
        </TabsContent>

        <TabsContent value="patterns">
          <PatternsTab branchId={branchId} branchName={branchName} />
        </TabsContent>

        <TabsContent value="content">
          <ContentTab branchId={branchId} branchName={branchName} />
        </TabsContent>

        <TabsContent value="email">
          <EmailTab branchId={branchId} branchName={branchName} />
        </TabsContent>

        <TabsContent value="ultrathink">
          <UltraThinkTab branchId={branchId} branchName={branchName} />
        </TabsContent>

        <TabsContent value="deepanalysis">
          <DeepAnalysisTab branchId={branchId} branchName={branchName} />
        </TabsContent>

        <TabsContent value="solveling">
          <SolvelingTab branchId={branchId} branchName={branchName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({ branchId, branchName }: { branchId: string; branchName: string }) {
  // TODO: Create API endpoint /api/notifications/active
  const [notifications] = useState<any>(undefined);
  useEffect(() => { if (branchId) { } }, [branchId]);
  const [unreadCount] = useState<number | undefined>(undefined);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Multi-Agent System</CardTitle>
            <SparklesIcon className="size-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5 Agents</div>
            <p className="text-xs text-muted-foreground mt-1">نشط ومستعد</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإشعارات الذكية</CardTitle>
            <AlertTriangleIcon className="size-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {unreadCount || 0} غير مقروء
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التحليل الذكي</CardTitle>
            <TrendingUpIcon className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">مستمر</div>
            <p className="text-xs text-muted-foreground mt-1">24/7 مراقبة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claude Model</CardTitle>
            <BrainIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">Sonnet 3.5</div>
            <p className="text-xs text-muted-foreground mt-1">أحدث إصدار</p>
          </CardContent>
        </Card>
      </div>

      {/* Agents Overview */}
      <Card>
        <CardHeader>
          <CardTitle>الـ AI Agents المتاحة</CardTitle>
          <CardDescription>نظام Multi-Agent متكامل مع Reasoning Chains</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AgentCard
            icon={<ShieldCheckIcon className="size-5 text-blue-600" />}
            name="Data Validator Agent"
            description="التحقق الذكي من صحة البيانات المالية مع reasoning chains"
            features={["تحليل منطقي متعمق", "كشف الشذوذات", "إشعارات تلقائية"]}
          />
          <AgentCard
            icon={<TrendingUpIcon className="size-5 text-green-600" />}
            name="Pattern Detection Agent"
            description="اكتشاف الأنماط والاتجاهات في البيانات"
            features={["تحليل زمني", "تنبؤات", "توصيات ذكية"]}
          />
          <AgentCard
            icon={<FileTextIcon className="size-5 text-purple-600" />}
            name="Content Writer Agent"
            description="كتابة محتوى احترافي (إشعارات، تقارير، إيميلات)"
            features={["لغة عربية فصحى", "تنسيق احترافي", "سياق ذكي"]}
          />
          <AgentCard
            icon={<MailIcon className="size-5 text-orange-600" />}
            name="Email Agent"
            description="إرسال إيميلات ذكية مع محتوى مخصص"
            features={["توليد تلقائي", "Resend integration", "تتبع"]}
          />
          <AgentCard
            icon={<AlertTriangleIcon className="size-5 text-red-600" />}
            name="Notification Agent"
            description="إدارة الإشعارات الذكية"
            features={["banner notifications", "مستويات أهمية", "إجراءات مطلوبة"]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AgentCard({
  icon,
  name,
  description,
  features,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-center size-10 shrink-0 rounded-full bg-muted">
        {icon}
      </div>
      <div className="flex-1 space-y-2">
        <div>
          <h4 className="font-semibold">{name}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {features.map((feature, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {feature}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Validator Tab
// ============================================================================

function ValidatorTab({ branchId, branchName }: { branchId: string; branchName: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Validator Agent</CardTitle>
        <CardDescription>
          يعمل تلقائياً عند إضافة إيراد جديد. انتقل إلى صفحة الإيرادات وأضف بيانات لتجربته.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-6 text-center">
            <ShieldCheckIcon className="mx-auto size-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Agent نشط في الخلفية</h3>
            <p className="text-sm text-muted-foreground">
              عند إضافة إيراد جديد، سيقوم الـ Agent بتحليله تلقائياً وإنشاء إشعارات ذكية عند الحاجة
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">الميزات:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2Icon className="size-4 text-green-600 mt-0.5" />
                <span>تحليل منطقي (Reasoning Chain) لكل إيراد</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2Icon className="size-4 text-green-600 mt-0.5" />
                <span>مقارنة مع البيانات التاريخية</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2Icon className="size-4 text-green-600 mt-0.5" />
                <span>كشف الانحرافات والشذوذات</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2Icon className="size-4 text-green-600 mt-0.5" />
                <span>إشعارات ذكية عند الحاجة</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2Icon className="size-4 text-green-600 mt-0.5" />
                <span>تقييم مستوى المخاطر</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Patterns Tab
// ============================================================================

function PatternsTab({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  // TODO: Create API action /api/ai/analyze-revenue

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const analysis = await apiClient.post("/api/ai/analyze-revenue",{ branchId, branchName });
      setResult((analysis.data || analysis) as Record<string, unknown>);
      toast.success("تم تحليل الأنماط بنجاح");
    } catch (error) {
      toast.error("فشل التحليل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pattern Detection Agent</CardTitle>
        <CardDescription>
          اكتشاف الأنماط والاتجاهات في البيانات التاريخية (آخر 30 يوم)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleAnalyze} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2Icon className="ml-2 size-4 animate-spin" />
              جاري التحليل...
            </>
          ) : (
            <>
              <TrendingUpIcon className="ml-2 size-4" />
              تحليل الأنماط
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">الرؤى:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {result.insights as string || "لا توجد رؤى"}
              </p>
            </div>

            {Array.isArray(result.patterns) && result.patterns.length > 0 && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-2">الأنماط المكتشفة:</h4>
                <div className="space-y-2">
                  {result.patterns.map((pattern: Record<string, unknown>, idx: number) => (
                    <div key={idx} className="text-sm flex items-start gap-2">
                      <Badge variant="secondary">{String(pattern.type)}</Badge>
                      <span className="text-muted-foreground">{String(pattern.description)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Content Tab
// ============================================================================

function ContentTab({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState("notification");
  const [purpose, setPurpose] = useState("");
  const [data, setData] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  // TODO: Create API action /api/ai/generate-content

  const handleGenerate = async () => {
    if (!purpose || !data) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    setLoading(true);
    try {
      const content = await apiClient.post("/api/ai/generate-content",{
        contentType,
        context: { branchName, data, purpose },
      });
      setResult((content.data?.content || content.data || content) as Record<string, unknown>);
      toast.success("تم توليد المحتوى بنجاح");
    } catch (error) {
      toast.error("فشل توليد المحتوى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Writer Agent</CardTitle>
        <CardDescription>كتابة محتوى ذكي باللغة العربية</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>نوع المحتوى</Label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full rounded-lg border p-2"
          >
            <option value="notification">إشعار</option>
            <option value="email">إيميل</option>
            <option value="report">تقرير</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purpose">الغرض</Label>
          <Input
            id="purpose"
            placeholder="مثال: تنبيه بانخفاض الإيرادات"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="data">البيانات (JSON)</Label>
          <Textarea
            id="data"
            placeholder='{"revenue": 10000, "decrease": 20}'
            value={data}
            onChange={(e) => setData(e.target.value)}
            rows={4}
          />
        </div>

        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2Icon className="ml-2 size-4 animate-spin" />
              جاري التوليد...
            </>
          ) : (
            <>
              <FileTextIcon className="ml-2 size-4" />
              توليد المحتوى
            </>
          )}
        </Button>

        {result && (
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="font-semibold">النتيجة:</h4>
            <pre className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Email Tab
// ============================================================================

function EmailTab({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState("");
  const [emailType, setEmailType] = useState("alert");
  const [data, setData] = useState("");
  // TODO: Create API action /api/ai/send-email

  const handleSend = async () => {
    if (!emails || !data) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/api/ai/send-email",{
        to: emails.split(",").map(e => e.trim()),
        branchName,
        emailType,
        data,
      });
      toast.success("تم إرسال الإيميل بنجاح");
    } catch (error) {
      toast.error("فشل إرسال الإيميل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Agent</CardTitle>
        <CardDescription>إرسال إيميلات ذكية مع محتوى مخصص</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="emails">الإيميلات (مفصولة بفاصلة)</Label>
          <Input
            id="emails"
            placeholder="email1@example.com, email2@example.com"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>نوع الإيميل</Label>
          <select
            value={emailType}
            onChange={(e) => setEmailType(e.target.value)}
            className="w-full rounded-lg border p-2"
          >
            <option value="alert">تنبيه</option>
            <option value="report">تقرير</option>
            <option value="summary">ملخص</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="emailData">البيانات (JSON)</Label>
          <Textarea
            id="emailData"
            placeholder='{"message": "الإيرادات انخفضت 20%"}'
            value={data}
            onChange={(e) => setData(e.target.value)}
            rows={4}
          />
        </div>

        <Button onClick={handleSend} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2Icon className="ml-2 size-4 animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <MailIcon className="ml-2 size-4" />
              إرسال الإيميل
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Ultra Think Tab
// ============================================================================

function UltraThinkTab({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  // TODO: Create API action /api/ai/ultra-think

  const handleUltraThink = async () => {
    if (!query) {
      toast.error("يرجى إدخال السؤال أو الموضوع");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/api/ai/ultra-think", {
        query,
        context,
        branchId,
        branchName,
      });
      setResult(response.data || response);
      toast.success("تم التفكير العميق بنجاح");
    } catch (error) {
      toast.error("فشل التحليل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-full bg-purple-100 dark:bg-purple-900/30">
            <ZapIcon className="size-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>Ultra Think - التفكير العميق المتقدم</CardTitle>
            <CardDescription>
              محرك تفكير متقدم مع سلاسل استدلال موسعة وتحليل متعمق
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/10 p-4">
          <div className="flex items-start gap-3">
            <BrainIcon className="size-5 text-purple-600 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h4 className="font-semibold text-sm">ماذا يفعل Ultra Think؟</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-purple-600 mt-0.5 shrink-0" />
                  <span>تحليل متعدد الأبعاد للمشاكل المعقدة</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-purple-600 mt-0.5 shrink-0" />
                  <span>سلاسل استدلال موسعة مع خطوات تفكير واضحة</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-purple-600 mt-0.5 shrink-0" />
                  <span>ربط المعلومات من مصادر متعددة</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-purple-600 mt-0.5 shrink-0" />
                  <span>توليد رؤى استراتيجية وتوصيات عملية</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ultrathink-query">السؤال أو الموضوع للتحليل</Label>
          <Textarea
            id="ultrathink-query"
            placeholder="مثال: كيف يمكن تحسين الإيرادات في الربع القادم مع مراعاة الاتجاهات الحالية؟"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ultrathink-context">السياق الإضافي (اختياري)</Label>
          <Textarea
            id="ultrathink-context"
            placeholder="أضف أي معلومات إضافية أو سياق يساعد في التحليل..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
          />
        </div>

        <Button onClick={handleUltraThink} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2Icon className="ml-2 size-4 animate-spin" />
              جاري التفكير العميق...
            </>
          ) : (
            <>
              <ZapIcon className="ml-2 size-4" />
              بدء Ultra Think
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            {Boolean(result.thinking) && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <BrainIcon className="size-4" />
                  عملية التفكير:
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {String(result.thinking)}
                </p>
              </div>
            )}

            {Boolean(result.analysis) && (
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 dark:bg-purple-900/10 p-4">
                <h4 className="font-semibold mb-2 text-purple-900 dark:text-purple-100">
                  التحليل المتعمق:
                </h4>
                <p className="text-sm whitespace-pre-wrap">
                  {String(result.analysis)}
                </p>
              </div>
            )}

            {Boolean(result.recommendations) && Array.isArray(result.recommendations) && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-3">التوصيات:</h4>
                <div className="space-y-2">
                  {result.recommendations.map((rec: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">
                        {idx + 1}
                      </Badge>
                      <span className="text-sm">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Deep Analysis Tab
// ============================================================================

function DeepAnalysisTab({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [loading, setLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState("financial");
  const [timeRange, setTimeRange] = useState("30");
  const [dimensions, setDimensions] = useState<string[]>(["trends", "patterns", "anomalies"]);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  // TODO: Create API action /api/ai/deep-analysis

  const toggleDimension = (dim: string) => {
    setDimensions(prev =>
      prev.includes(dim) ? prev.filter(d => d !== dim) : [...prev, dim]
    );
  };

  const handleDeepAnalysis = async () => {
    if (dimensions.length === 0) {
      toast.error("يرجى اختيار بُعد واحد على الأقل للتحليل");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/api/ai/deep-analysis", {
        branchId,
        branchName,
        analysisType,
        timeRange: parseInt(timeRange),
        dimensions,
      });
      setResult(response.data || response);
      toast.success("تم إجراء التحليل العميق بنجاح");
    } catch (error) {
      toast.error("فشل التحليل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <BarChart3Icon className="size-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Deep Analysis - التحليل العميق متعدد الأبعاد</CardTitle>
            <CardDescription>
              تحليل شامل للبيانات المالية من زوايا متعددة مع رؤى عميقة
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 p-4">
          <div className="flex items-start gap-3">
            <BarChart3Icon className="size-5 text-blue-600 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h4 className="font-semibold text-sm">ميزات التحليل العميق:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>تحليل الاتجاهات الزمنية والموسمية</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>كشف الأنماط المخفية والعلاقات المترابطة</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>تحديد الشذوذات والقيم الخارجة</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>التنبؤ بالاتجاهات المستقبلية</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>مقارنة الأداء مع المعايير التاريخية</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>نوع التحليل</Label>
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            className="w-full rounded-lg border p-2"
          >
            <option value="financial">التحليل المالي الشامل</option>
            <option value="revenue">تحليل الإيرادات</option>
            <option value="expenses">تحليل المصروفات</option>
            <option value="payroll">تحليل الرواتب</option>
            <option value="performance">تحليل الأداء</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>الفترة الزمنية</Label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full rounded-lg border p-2"
          >
            <option value="7">آخر 7 أيام</option>
            <option value="30">آخر 30 يوم</option>
            <option value="90">آخر 90 يوم</option>
            <option value="180">آخر 6 شهور</option>
            <option value="365">آخر سنة</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>أبعاد التحليل</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "trends", label: "الاتجاهات" },
              { id: "patterns", label: "الأنماط" },
              { id: "anomalies", label: "الشذوذات" },
              { id: "predictions", label: "التنبؤات" },
              { id: "comparisons", label: "المقارنات" },
              { id: "insights", label: "الرؤى العميقة" },
            ].map((dim) => (
              <button
                key={dim.id}
                onClick={() => toggleDimension(dim.id)}
                className={`p-2 rounded-lg border text-sm transition-colors ${
                  dimensions.includes(dim.id)
                    ? "bg-blue-100 border-blue-500 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {dim.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleDeepAnalysis} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2Icon className="ml-2 size-4 animate-spin" />
              جاري التحليل العميق...
            </>
          ) : (
            <>
              <BarChart3Icon className="ml-2 size-4" />
              بدء التحليل العميق
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            {Boolean(result.summary) && (
              <div className="rounded-lg border p-4 bg-blue-50/50 dark:bg-blue-900/10">
                <h4 className="font-semibold mb-2">الملخص التنفيذي:</h4>
                <p className="text-sm whitespace-pre-wrap">
                  {String(result.summary)}
                </p>
              </div>
            )}

            {Boolean(result.dimensions) && typeof result.dimensions === "object" && (
              <div className="space-y-3">
                {Object.entries(result.dimensions as Record<string, unknown>).map(([key, value]) => (
                  <div key={key} className="rounded-lg border p-4">
                    <h4 className="font-semibold mb-2 capitalize">{key}:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {Boolean(result.metrics) && Array.isArray(result.metrics) && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-3">المؤشرات الرئيسية:</h4>
                <div className="grid grid-cols-2 gap-3">
                  {result.metrics.map((metric: Record<string, unknown>, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted">
                      <div className="text-xs text-muted-foreground">
                        {String(metric.label)}
                      </div>
                      <div className="text-lg font-bold">
                        {String(metric.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Solveling Tab
// ============================================================================

function SolvelingTab({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState("");
  const [constraints, setConstraints] = useState("");
  const [priority, setPriority] = useState("high");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  // TODO: Create API action /api/ai/solve-problem

  const handleSolve = async () => {
    if (!problem) {
      toast.error("يرجى وصف المشكلة");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/api/ai/solve-problem", {
        problem,
        constraints,
        priority,
        branchId,
        branchName,
      });
      setResult(response.data || response);
      toast.success("تم إيجاد الحل بنجاح");
    } catch (error) {
      toast.error("فشل إيجاد الحل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-full bg-green-100 dark:bg-green-900/30">
            <LightbulbIcon className="size-5 text-green-600" />
          </div>
          <div>
            <CardTitle>Solveling - مساعد حل المشكلات</CardTitle>
            <CardDescription>
              حلول ذكية خطوة بخطوة للمشكلات المالية والإدارية
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 p-4">
          <div className="flex items-start gap-3">
            <LightbulbIcon className="size-5 text-green-600 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h4 className="font-semibold text-sm">كيف يعمل Solveling؟</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-green-600 mt-0.5 shrink-0" />
                  <span>فهم عميق للمشكلة وسياقها</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-green-600 mt-0.5 shrink-0" />
                  <span>تقييم الخيارات المتاحة والمخاطر المحتملة</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-green-600 mt-0.5 shrink-0" />
                  <span>اقتراح حلول متعددة مرتبة حسب الأولوية</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-green-600 mt-0.5 shrink-0" />
                  <span>خطة عمل تفصيلية مع خطوات قابلة للتنفيذ</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-4 text-green-600 mt-0.5 shrink-0" />
                  <span>مؤشرات قياس النجاح والمتابعة</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="problem">وصف المشكلة</Label>
          <Textarea
            id="problem"
            placeholder="مثال: انخفاض الإيرادات بنسبة 25% في الشهر الماضي مع زيادة في المصروفات..."
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="constraints">القيود والمحددات (اختياري)</Label>
          <Textarea
            id="constraints"
            placeholder="مثال: ميزانية محدودة، فريق صغير، وقت قصير..."
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>مستوى الأولوية</Label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border p-2"
          >
            <option value="critical">حرجة - تحتاج حل فوري</option>
            <option value="high">عالية - مهمة جداً</option>
            <option value="medium">متوسطة - يمكن التخطيط</option>
            <option value="low">منخفضة - للتحسين</option>
          </select>
        </div>

        <Button onClick={handleSolve} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2Icon className="ml-2 size-4 animate-spin" />
              جاري إيجاد الحل...
            </>
          ) : (
            <>
              <LightbulbIcon className="ml-2 size-4" />
              إيجاد الحل
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            {Boolean(result.problemAnalysis) && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <BrainIcon className="size-4" />
                  تحليل المشكلة:
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {String(result.problemAnalysis)}
                </p>
              </div>
            )}

            {Boolean(result.solutions) && Array.isArray(result.solutions) && (
              <div className="space-y-3">
                <h4 className="font-semibold">الحلول المقترحة:</h4>
                {result.solutions.map((solution: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-900/10 p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <Badge variant="secondary" className="mt-0.5">
                        الحل {idx + 1}
                      </Badge>
                      {Boolean(solution.recommended) && (
                        <Badge className="bg-green-600 mt-0.5">موصى به</Badge>
                      )}
                    </div>
                    <h5 className="font-semibold mb-1">{String(solution.title)}</h5>
                    <p className="text-sm text-muted-foreground mb-3">
                      {String(solution.description)}
                    </p>
                    {Boolean(solution.steps) && Array.isArray(solution.steps) && (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold">خطوات التنفيذ:</div>
                        <ol className="text-sm space-y-1 pr-4">
                          {solution.steps.map((step: string, stepIdx: number) => (
                            <li key={stepIdx} className="list-decimal">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {Boolean(result.actionPlan) && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-2">خطة العمل:</h4>
                <p className="text-sm whitespace-pre-wrap">
                  {String(result.actionPlan)}
                </p>
              </div>
            )}

            {Boolean(result.successMetrics) && Array.isArray(result.successMetrics) && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-3">مؤشرات النجاح:</h4>
                <div className="space-y-2">
                  {result.successMetrics.map((metric: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2Icon className="size-4 text-green-600 mt-0.5 shrink-0" />
                      <span>{metric}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
