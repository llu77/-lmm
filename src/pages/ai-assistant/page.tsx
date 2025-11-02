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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="validator">التحقق من البيانات</TabsTrigger>
          <TabsTrigger value="patterns">اكتشاف الأنماط</TabsTrigger>
          <TabsTrigger value="content">كتابة المحتوى</TabsTrigger>
          <TabsTrigger value="email">الإيميلات</TabsTrigger>
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
      setResult(analysis);
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
                      <Badge variant="secondary">{pattern.type as string}</Badge>
                      <span className="text-muted-foreground">{pattern.description as string}</span>
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
      setResult(content.content);
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
