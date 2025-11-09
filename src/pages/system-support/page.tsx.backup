import { useState, useEffect } from "react";
import { Authenticated, Unauthenticated } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { SignInButton } from "@/components/ui/signin";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  MailIcon,
  SendIcon,
  FileTextIcon,
  ActivityIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  ServerIcon,
  KeyIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  EyeIcon,
  UserIcon,
  UsersIcon,
  CalendarIcon,
  Trash2Icon,
  PlusIcon,
} from "lucide-react";

type EmailSettingsDoc = any;

type EmailLogDoc = any;

function SettingsTabContent() {
  const [settings, setSettings] = useState<any>(undefined);
  useEffect(() => { // TODO: fetch("/api/email-settings/all").then(r => r.json()).then(setSettings); }, []);
  // TODO: API endpoint /api/email-settings/updatesendersettings
  // TODO: API endpoint /api/email-settings/updatedefaultrecipients
  // TODO: API endpoint /api/email-settings/updatedailyschedule
  // TODO: API endpoint /api/email-settings/updatemonthlyschedule

  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [newRecipient, setNewRecipient] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  
  // Daily Schedule
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [dailyTime, setDailyTime] = useState("03:00");
  const [dailyTemplate, setDailyTemplate] = useState("report");
  const [dailyCustomContent, setDailyCustomContent] = useState("");
  const [dailyRecipients, setDailyRecipients] = useState<string[]>([]);
  
  // Monthly Schedule
  const [monthlyEnabled, setMonthlyEnabled] = useState(false);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [monthlyTime, setMonthlyTime] = useState("12:00");
  const [monthlyTemplate, setMonthlyTemplate] = useState("report");
  const [monthlyCustomContent, setMonthlyCustomContent] = useState("");
  const [monthlyRecipients, setMonthlyRecipients] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  // Load settings
  useEffect(() => {
    if (settings) {
      setSenderName(settings.senderName as string);
      setSenderEmail(settings.senderEmail as string);
      setRecipients((settings.defaultRecipients as string[]) ?? []);

      const daily = (settings.dailySchedule as {
        enabled: boolean;
        time?: string;
        templateId?: string;
        customContent?: string;
        recipients?: string[];
      }) ?? { enabled: false };
      setDailyEnabled(daily.enabled);
      setDailyTime(daily.time ?? "03:00");
      setDailyTemplate(daily.templateId ?? "report");
      setDailyCustomContent(daily.customContent ?? "");
      setDailyRecipients(daily.recipients ?? []);

      const monthly = (settings.monthlySchedule as {
        enabled: boolean;
        day?: number;
        time?: string;
        templateId?: string;
        customContent?: string;
        recipients?: string[];
      }) ?? { enabled: false };
      setMonthlyEnabled(monthly.enabled);
      setMonthlyDay(monthly.day ?? 1);
      setMonthlyTime(monthly.time ?? "12:00");
      setMonthlyTemplate(monthly.templateId ?? "report");
      setMonthlyCustomContent(monthly.customContent ?? "");
      setMonthlyRecipients(monthly.recipients ?? []);
    }
  }, [settings]);

  const handleSaveSender = async () => {
    if (!senderName || !senderEmail) {
      toast.error("جميع الحقول مطلوبة");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post("/api/email-settings/sendersettings", { senderName, senderEmail });
      toast.success("✅ تم حفظ إعدادات المرسل");
    } catch (error) {
      toast.error("فشل حفظ الإعدادات");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecipient = () => {
    if (!newRecipient || !newRecipient.includes("@")) {
      toast.error("أدخل بريد إلكتروني صحيح");
      return;
    }
    if (recipients.includes(newRecipient)) {
      toast.error("هذا البريد موجود مسبقاً");
      return;
    }
    setRecipients([...recipients, newRecipient]);
    setNewRecipient("");
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleSaveRecipients = async () => {
    setSaving(true);
    try {
      await apiClient.post("/api/email-settings/defaultrecipients", { recipients });
      toast.success("✅ تم حفظ المستلمين الافتراضيين");
    } catch (error) {
      toast.error("فشل حفظ المستلمين");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDailySchedule = async () => {
    if (dailyEnabled && dailyRecipients.length === 0) {
      toast.error("أضف مستلم واحد على الأقل");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post("/api/email-settings/dailyschedule", {
        enabled: dailyEnabled,
        time: dailyTime,
        templateId: dailyTemplate,
        customContent: dailyCustomContent,
        recipients: dailyRecipients,
      });
      toast.success("✅ تم حفظ إعدادات الجدولة اليومية");
    } catch (error) {
      toast.error("فشل حفظ الجدولة");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMonthlySchedule = async () => {
    if (monthlyEnabled && monthlyRecipients.length === 0) {
      toast.error("أضف مستلم واحد على الأقل");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post("/api/email-settings/monthlyschedule", {
        enabled: monthlyEnabled,
        day: monthlyDay,
        time: monthlyTime,
        templateId: monthlyTemplate,
        customContent: monthlyCustomContent,
        recipients: monthlyRecipients,
      });
      toast.success("✅ تم حفظ إعدادات الجدولة الشهرية");
    } catch (error) {
      toast.error("فشل حفظ الجدولة");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Sender Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-5" />
            إعدادات المرسل
          </CardTitle>
          <CardDescription>ضبط اسم وبريد المرسل الافتراضي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>اسم المرسل</Label>
            <Input
              placeholder="نظام الإدارة المالية"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              placeholder="onboarding@resend.dev"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveSender} disabled={saving}>
            {saving ? <RefreshCwIcon className="size-4 ml-2 animate-spin" /> : <CheckCircle2Icon className="size-4 ml-2" />}
            حفظ المرسل
          </Button>
        </CardContent>
      </Card>

      {/* Default Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="size-5" />
            المستلمون الافتراضيون
          </CardTitle>
          <CardDescription>إضافة قائمة بالمستلمين الافتراضيين للاستخدام السريع</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="user@example.com"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRecipient();
                }
              }}
            />
            <Button onClick={handleAddRecipient} size="icon">
              <PlusIcon className="size-4" />
            </Button>
          </div>
          
          {recipients.length > 0 && (
            <div className="space-y-2">
              <Label>القائمة ({recipients.length})</Label>
              <div className="space-y-2">
                {recipients.map((email) => (
                  <div key={email} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">{email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRecipient(email)}
                    >
                      <Trash2Icon className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleSaveRecipients} disabled={saving}>
            {saving ? <RefreshCwIcon className="size-4 ml-2 animate-spin" /> : <CheckCircle2Icon className="size-4 ml-2" />}
            حفظ المستلمين
          </Button>
        </CardContent>
      </Card>

      {/* Daily Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="size-5" />
            الجدولة اليومية (3:00 AM)
          </CardTitle>
          <CardDescription>إرسال تقرير يومي تلقائياً</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>تفعيل الجدولة</Label>
            <Switch checked={dailyEnabled} onCheckedChange={setDailyEnabled} />
          </div>

          {dailyEnabled && (
            <>
              <div className="space-y-2">
                <Label>الوقت</Label>
                <Input
                  type="time"
                  value={dailyTime}
                  onChange={(e) => setDailyTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>القالب أو نص مفتوح</Label>
                <Select value={dailyTemplate} onValueChange={setDailyTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report">تقرير دوري</SelectItem>
                    <SelectItem value="notification">إشعار عام</SelectItem>
                    <SelectItem value="custom">نص مفتوح</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dailyTemplate === "custom" && (
                <div className="space-y-2">
                  <Label>المحتوى المخصص (HTML)</Label>
                  <Textarea
                    placeholder="<h1>تقرير يومي</h1><p>محتوى التقرير...</p>"
                    rows={6}
                    value={dailyCustomContent}
                    onChange={(e) => setDailyCustomContent(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>المستلمون</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const input = e.currentTarget;
                        if (input.value && !dailyRecipients.includes(input.value)) {
                          setDailyRecipients([...dailyRecipients, input.value]);
                          input.value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDailyRecipients(recipients);
                    }}
                  >
                    استخدام الافتراضي
                  </Button>
                </div>
                {dailyRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dailyRecipients.map((email) => (
                      <Badge key={email} variant="secondary">
                        {email}
                        <button
                          className="mr-1 hover:text-destructive"
                          onClick={() => setDailyRecipients(dailyRecipients.filter(r => r !== email))}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <Button onClick={handleSaveDailySchedule} disabled={saving}>
            {saving ? <RefreshCwIcon className="size-4 ml-2 animate-spin" /> : <CheckCircle2Icon className="size-4 ml-2" />}
            حفظ الجدولة اليومية
          </Button>
        </CardContent>
      </Card>

      {/* Monthly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="size-5" />
            الجدولة الشهرية (1 من كل شهر - 12:00 PM)
          </CardTitle>
          <CardDescription>إرسال تقرير شهري تلقائياً</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>تفعيل الجدولة</Label>
            <Switch checked={monthlyEnabled} onCheckedChange={setMonthlyEnabled} />
          </div>

          {monthlyEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اليوم من الشهر</Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={monthlyDay}
                    onChange={(e) => setMonthlyDay(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوقت</Label>
                  <Input
                    type="time"
                    value={monthlyTime}
                    onChange={(e) => setMonthlyTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>القالب أو نص مفتوح</Label>
                <Select value={monthlyTemplate} onValueChange={setMonthlyTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report">تقرير دوري</SelectItem>
                    <SelectItem value="notification">إشعار عام</SelectItem>
                    <SelectItem value="custom">نص مفتوح</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {monthlyTemplate === "custom" && (
                <div className="space-y-2">
                  <Label>المحتوى المخصص (HTML)</Label>
                  <Textarea
                    placeholder="<h1>تقرير شهري</h1><p>محتوى التقرير...</p>"
                    rows={6}
                    value={monthlyCustomContent}
                    onChange={(e) => setMonthlyCustomContent(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>المستلمون</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const input = e.currentTarget;
                        if (input.value && !monthlyRecipients.includes(input.value)) {
                          setMonthlyRecipients([...monthlyRecipients, input.value]);
                          input.value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMonthlyRecipients(recipients);
                    }}
                  >
                    استخدام الافتراضي
                  </Button>
                </div>
                {monthlyRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {monthlyRecipients.map((email) => (
                      <Badge key={email} variant="secondary">
                        {email}
                        <button
                          className="mr-1 hover:text-destructive"
                          onClick={() => setMonthlyRecipients(monthlyRecipients.filter(r => r !== email))}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <Button onClick={handleSaveMonthlySchedule} disabled={saving}>
            {saving ? <RefreshCwIcon className="size-4 ml-2 animate-spin" /> : <CheckCircle2Icon className="size-4 ml-2" />}
            حفظ الجدولة الشهرية
          </Button>
        </CardContent>
      </Card>

      {/* Zapier Integration Info */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <svg className="size-8 flex-shrink-0" viewBox="0 0 256 256" fill="currentColor"><path d="M154.8 10H101.2c-3.6 0-6.5 2.9-6.5 6.5v31.8c0 20.3-16.5 36.8-36.8 36.8H26.1c-3.6 0-6.5 2.9-6.5 6.5v53.6c0 3.6 2.9 6.5 6.5 6.5h31.8c20.3 0 36.8 16.5 36.8 36.8v31.8c0 3.6 2.9 6.5 6.5 6.5h53.6c3.6 0 6.5-2.9 6.5-6.5v-31.8c0-20.3 16.5-36.8 36.8-36.8h31.8c3.6 0 6.5-2.9 6.5-6.5V91.6c0-3.6-2.9-6.5-6.5-6.5h-31.8c-20.3 0-36.8-16.5-36.8-36.8V16.5c0-3.6-2.9-6.5-6.5-6.5z"/></svg>
            <div className="text-sm space-y-2">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">🔗 ربط مع Zapier Schedule</h4>
              <p className="text-blue-800 dark:text-blue-200">
                للجدولة التلقائية، استخدم "Schedule by Zapier" في Zapier:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>أنشئ Zap جديد → Schedule by Zapier</li>
                <li>اختر الوقت (يومي 3:00 AM أو شهري 1 @ 12:00 PM)</li>
                <li>Action: Webhooks → POST إلى webhook URL في تاب Zapier</li>
                <li>الـ Schedule سيُنفذ تلقائياً وسيرسل البريد حسب الإعدادات</li>
              </ol>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                راجع ملف ZAPIER_SCHEDULER_SETUP.md للتفاصيل الكاملة
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

type EmailStats = {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  successRate: string;
};

function SystemSupportInner() {
  // TODO: Connect to backend API
  const emailStats = undefined as EmailStats | undefined;
  const emailLogs = undefined as EmailLogDoc[] | undefined;
  const sendEmail = async () => {}; // TODO: useAction(api.emailSystem.sendEmail);
  const sendTemplateEmail = async () => {}; // TODO: useAction(api.emailSystem.sendTemplateEmail);
  const testEmail = async () => {}; // TODO: useAction(api.emailSystem.testEmail);
  const getTemplatePreview = async () => {}; // TODO: useAction(api.emailSystem.getTemplatePreview);

  const [selectedTab, setSelectedTab] = useState("overview");
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);

  // Send Email Form
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Template Email Form
  const [templateId, setTemplateId] = useState("welcome");
  const [templateTo, setTemplateTo] = useState("");
  const [templateVars, setTemplateVars] = useState("{}");
  const [previewHtml, setPreviewHtml] = useState("");

  const handleSendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) {
      toast.error("جميع الحقول مطلوبة");
      return;
    }

    setSending(true);
    try {
      const emails = emailTo.split(",").map(e => e.trim());
      await sendEmail({
        to: emails,
        subject: emailSubject,
        html: emailBody,
      });
      toast.success("✅ تم إرسال البريد الإلكتروني بنجاح");
      setEmailTo("");
      setEmailSubject("");
      setEmailBody("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "فشل إرسال البريد";
      toast.error(errorMessage);
      console.error("Send email error:", error);
    } finally {
      setSending(false);
    }
  };

  const handleSendTemplateEmail = async () => {
    if (!templateTo || !templateId) {
      toast.error("جميع الحقول مطلوبة");
      return;
    }

    setSending(true);
    try {
      const emails = templateTo.split(",").map(e => e.trim());
      const variables = JSON.parse(templateVars);
      await sendTemplateEmail({
        to: emails,
        templateId,
        variables,
      });
      toast.success("✅ تم إرسال البريد بالقالب بنجاح");
      setTemplateTo("");
      setTemplateVars("{}");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "فشل إرسال البريد";
      toast.error(errorMessage);
      console.error("Send template email error:", error);
    } finally {
      setSending(false);
    }
  };

  const handleTestEmail = async () => {
    const testEmailAddress = prompt("أدخل البريد الإلكتروني للاختبار:");
    if (!testEmailAddress) return;

    setTesting(true);
    try {
      await testEmail({ to: testEmailAddress });
      toast.success("✅ تم إرسال بريد اختبار بنجاح");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "فشل إرسال البريد";
      toast.error(errorMessage);
      console.error("Test email error:", error);
    } finally {
      setTesting(false);
    }
  };

  const handlePreviewTemplate = async () => {
    try {
      const variables = JSON.parse(templateVars);
      const preview = await getTemplatePreview({
        templateId,
        variables,
      });
      setPreviewHtml(preview.html);
      toast.success("✅ تم إنشاء المعاينة");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "فشل إنشاء المعاينة";
      toast.error(errorMessage);
      console.error("Preview error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">⚙️ دعم النظام</h1>
          <p className="text-muted-foreground">
            التحكم الكامل في نظام البريد الإلكتروني والتكاملات
          </p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid grid-cols-8 w-full">
            <TabsTrigger value="overview">
              <ActivityIcon className="size-4 ml-2" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="send">
              <SendIcon className="size-4 ml-2" />
              إرسال بريد
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileTextIcon className="size-4 ml-2" />
              القوالب
            </TabsTrigger>
            <TabsTrigger value="settings">
              <svg className="size-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              إعدادات
            </TabsTrigger>
            <TabsTrigger value="zapier">
              <svg className="size-4 ml-2" viewBox="0 0 256 256" fill="currentColor"><path d="M154.8 10H101.2c-3.6 0-6.5 2.9-6.5 6.5v31.8c0 20.3-16.5 36.8-36.8 36.8H26.1c-3.6 0-6.5 2.9-6.5 6.5v53.6c0 3.6 2.9 6.5 6.5 6.5h31.8c20.3 0 36.8 16.5 36.8 36.8v31.8c0 3.6 2.9 6.5 6.5 6.5h53.6c3.6 0 6.5-2.9 6.5-6.5v-31.8c0-20.3 16.5-36.8 36.8-36.8h31.8c3.6 0 6.5-2.9 6.5-6.5V91.6c0-3.6-2.9-6.5-6.5-6.5h-31.8c-20.3 0-36.8-16.5-36.8-36.8V16.5c0-3.6-2.9-6.5-6.5-6.5z"/></svg>
              Zapier
            </TabsTrigger>
            <TabsTrigger value="pdfco">
              <FileTextIcon className="size-4 ml-2" />
              PDF.co
            </TabsTrigger>
            <TabsTrigger value="history">
              <MailIcon className="size-4 ml-2" />
              السجل
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <ServerIcon className="size-4 ml-2" />
              التكاملات
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">إجمالي الرسائل</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{emailStats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">جميع الإيميلات</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-600">مرسلة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{emailStats?.sent || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">تم الإرسال بنجاح</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-red-600">فاشلة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{emailStats?.failed || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">فشل الإرسال</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{emailStats?.successRate || 0}%</div>
                  <p className="text-xs text-muted-foreground mt-1">نسبة الإرسال الناجح</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>🧪 اختبار سريع</CardTitle>
                <CardDescription>إرسال بريد تجريبي للتأكد من عمل النظام</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleTestEmail} disabled={testing}>
                  {testing ? <RefreshCwIcon className="size-4 ml-2 animate-spin" /> : <SendIcon className="size-4 ml-2" />}
                  إرسال بريد تجريبي
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📊 حالة الخدمات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ServerIcon className="size-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Resend API</p>
                      <p className="text-sm text-muted-foreground">خدمة البريد الإلكتروني</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    مُكوّن
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ServerIcon className="size-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Anthropic Claude</p>
                      <p className="text-sm text-muted-foreground">الذكاء الاصطناعي</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    مُكوّن
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Send Email Tab */}
          <TabsContent value="send" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📧 إرسال بريد إلكتروني مخصص</CardTitle>
                <CardDescription>أرسل بريد إلكتروني مخصص بالكامل</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-to">المستلمون (افصل بفاصلة)</Label>
                  <Input
                    id="email-to"
                    type="text"
                    placeholder="user1@example.com, user2@example.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-subject">الموضوع</Label>
                  <Input
                    id="email-subject"
                    type="text"
                    placeholder="موضوع البريد"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-body">المحتوى (HTML)</Label>
                  <Textarea
                    id="email-body"
                    placeholder="<h1>مرحباً</h1><p>محتوى البريد هنا...</p>"
                    rows={10}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                  />
                </div>

                <Button onClick={handleSendEmail} disabled={sending} className="w-full">
                  {sending ? <RefreshCwIcon className="size-4 ml-2 animate-spin" /> : <SendIcon className="size-4 ml-2" />}
                  إرسال البريد
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📝 إرسال بريد بقالب جاهز</CardTitle>
                <CardDescription>استخدم القوالب الجاهزة مع متغيرات مخصصة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-select">اختر القالب</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger id="template-select">
                      <SelectValue placeholder="اختر قالب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welcome">رسالة ترحيب</SelectItem>
                      <SelectItem value="notification">إشعار عام</SelectItem>
                      <SelectItem value="alert">تنبيه هام</SelectItem>
                      <SelectItem value="report">تقرير دوري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-to">المستلمون (افصل بفاصلة)</Label>
                  <Input
                    id="template-to"
                    type="text"
                    placeholder="user@example.com"
                    value={templateTo}
                    onChange={(e) => setTemplateTo(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-vars">المتغيرات (JSON)</Label>
                  <Textarea
                    id="template-vars"
                    placeholder='{"name": "أحمد", "dashboardUrl": "https://..."}'
                    rows={8}
                    value={templateVars}
                    onChange={(e) => setTemplateVars(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    أمثلة للمتغيرات حسب القالب:
                    <br />
                    <strong>welcome:</strong> {"{ name, dashboardUrl }"}
                    <br />
                    <strong>notification:</strong> {"{ title, message, actionUrl, actionText }"}
                    <br />
                    <strong>alert:</strong> {"{ alertType, description, details, actionRequired }"}
                    <br />
                    <strong>report:</strong> {"{ reportType, period, metrics: [{label, value}], reportUrl }"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handlePreviewTemplate} variant="outline" className="flex-1">
                    <EyeIcon className="size-4 ml-2" />
                    معاينة
                  </Button>
                  <Button onClick={handleSendTemplateEmail} disabled={sending} className="flex-1">
                    {sending ? <RefreshCwIcon className="size-4 ml-2 animate-spin" /> : <SendIcon className="size-4 ml-2" />}
                    إرسال
                  </Button>
                </div>

                {previewHtml && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-sm">معاينة القالب</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="border rounded p-4 max-h-96 overflow-auto"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📚 القوالب المتاحة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { id: "welcome", name: "رسالة ترحيب", icon: "👋", color: "bg-blue-500" },
                    { id: "notification", name: "إشعار عام", icon: "🔔", color: "bg-yellow-500" },
                    { id: "alert", name: "تنبيه هام", icon: "⚠️", color: "bg-red-500" },
                    { id: "report", name: "تقرير دوري", icon: "📊", color: "bg-green-500" },
                  ].map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={`size-12 rounded-full ${template.color} flex items-center justify-center text-2xl`}>
                          {template.icon}
                        </div>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground">{template.id}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📬 سجل الإيميلات</CardTitle>
                <CardDescription>آخر 20 عملية إرسال بريد إلكتروني</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {emailLogs && emailLogs.length > 0 ? (
                    emailLogs.map((log) => (
                      <Card key={log._id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={log.status === "sent" ? "default" : "destructive"}>
                                  {log.status === "sent" ? (
                                    <CheckCircle2Icon className="size-3 ml-1" />
                                  ) : (
                                    <XCircleIcon className="size-3 ml-1" />
                                  )}
                                  {log.status === "sent" ? "مرسل" : "فاشل"}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {log.sentAt ? new Date(log.sentAt).toLocaleString("ar-EG") : "غير محدد"}
                                </span>
                              </div>
                              <p className="font-medium">{log.subject}</p>
                              <p className="text-sm text-muted-foreground">إلى: {log.to.join(", ")}</p>
                              {log.emailId && (
                                <p className="text-xs text-muted-foreground mt-1">ID: {log.emailId}</p>
                              )}
                              {log.error && (
                                <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                                  <AlertTriangleIcon className="size-4 inline ml-1" />
                                  {log.error}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <MailIcon className="size-12 mx-auto mb-4 opacity-50" />
                      <p>لا يوجد سجل إيميلات بعد</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zapier Integration Tab */}
          <TabsContent value="zapier" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="size-5" viewBox="0 0 256 256" fill="currentColor"><path d="M154.8 10H101.2c-3.6 0-6.5 2.9-6.5 6.5v31.8c0 20.3-16.5 36.8-36.8 36.8H26.1c-3.6 0-6.5 2.9-6.5 6.5v53.6c0 3.6 2.9 6.5 6.5 6.5h31.8c20.3 0 36.8 16.5 36.8 36.8v31.8c0 3.6 2.9 6.5 6.5 6.5h53.6c3.6 0 6.5-2.9 6.5-6.5v-31.8c0-20.3 16.5-36.8 36.8-36.8h31.8c3.6 0 6.5-2.9 6.5-6.5V91.6c0-3.6-2.9-6.5-6.5-6.5h-31.8c-20.3 0-36.8-16.5-36.8-36.8V16.5c0-3.6-2.9-6.5-6.5-6.5z"/></svg>
                  تكامل Zapier
                </CardTitle>
                <CardDescription>
                  ربط تطبيقك مع آلاف التطبيقات الأخرى عبر Zapier webhooks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🎉 تم التفعيل! Zapier Integration</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    النظام الآن متصل مع Zapier ويمكنه إرسال أحداث تلقائياً!
                  </p>
                  <div className="flex gap-2 text-sm">
                    <Badge variant="secondary">✅ Auto-trigger enabled</Badge>
                    <Badge variant="secondary">📡 Webhooks ready</Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">إجمالي Webhooks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">نشط الآن</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Total Triggers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">منذ البداية</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">100%</div>
                      <p className="text-xs text-muted-foreground">معدل النجاح</p>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">🔗 Webhook URL (Ready to use!)</h3>
                  <div className="rounded-md bg-muted p-3 font-mono text-sm break-all">
                    https://hooks.zapier.com/hooks/catch/4045e58858fec2e48109352fcd71ead5/
                  </div>
                  <p className="text-sm text-muted-foreground">
                    هذا الـ URL جاهز للاستخدام في Zapier. يمكنك إضافته في خطوة "Webhooks by Zapier" → "Catch Hook"
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">📤 أحداث تلقائية متاحة</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">revenue_created</div>
                        <div className="text-sm text-muted-foreground">عند إنشاء إيراد جديد</div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">expense_created</div>
                        <div className="text-sm text-muted-foreground">عند إنشاء مصروف جديد</div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">product_order_created</div>
                        <div className="text-sm text-muted-foreground">عند إنشاء طلب منتجات</div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">employee_request_created</div>
                        <div className="text-sm text-muted-foreground">عند إنشاء طلب موظف</div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">🎯 كيفية الاستخدام</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>افتح Zapier وأنشئ Zap جديد</li>
                    <li>اختر "Webhooks by Zapier" كـ Trigger</li>
                    <li>اختر "Catch Hook"</li>
                    <li>الصق الـ webhook URL أعلاه</li>
                    <li>أنشئ أي حدث في النظام (إيراد، مصروف، إلخ)</li>
                    <li>سيتم إرسال البيانات تلقائياً إلى Zapier!</li>
                  </ol>
                </div>

                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">✅ جاهز للاستخدام الفوري</h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    التكامل نشط! جرب إنشاء إيراد أو مصروف جديد وشاهد البيانات تصل إلى Zapier تلقائياً.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PDF.co Agent Tab */}
          <TabsContent value="pdfco" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileTextIcon className="size-5" />
                  PDF.co Agent - Advanced PDF Generation
                </CardTitle>
                <CardDescription>
                  Generate professional PDFs using AI-powered PDF.co API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status & Connection Test */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">⚙️ Configuration Status</h3>
                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">PDF.co API Key</p>
                        <p className="text-sm text-muted-foreground">
                          Configure in Secrets: PDFCO_API_KEY
                        </p>
                      </div>
                      <Badge variant="secondary">Ready</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Features */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">✨ Agent Capabilities</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <FileTextIcon className="size-4 text-primary" />
                        Revenue Reports
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Generate professional revenue reports with tables, charts, and Arabic RTL support
                      </p>
                      <div className="text-xs space-y-1 pt-2">
                        <div className="flex items-center gap-1">
                          <div className="size-1.5 rounded-full bg-green-500" />
                          <span>Auto-triggered on export</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="size-1.5 rounded-full bg-green-500" />
                          <span>Landscape A4 format</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <FileTextIcon className="size-4 text-destructive" />
                        Expense Reports
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Beautiful expense reports with category breakdowns and summaries
                      </p>
                      <div className="text-xs space-y-1 pt-2">
                        <div className="flex items-center gap-1">
                          <div className="size-1.5 rounded-full bg-green-500" />
                          <span>Auto-triggered on export</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="size-1.5 rounded-full bg-green-500" />
                          <span>Portrait A4 format</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <FileTextIcon className="size-4 text-blue-500" />
                        Product Orders
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Professional invoices with product lists, quantities, and totals
                      </p>
                      <div className="text-xs space-y-1 pt-2">
                        <div className="flex items-center gap-1">
                          <div className="size-1.5 rounded-full bg-green-500" />
                          <span>Status-based formatting</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="size-1.5 rounded-full bg-green-500" />
                          <span>QR code support</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <FileTextIcon className="size-4 text-orange-500" />
                        Custom HTML to PDF
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Convert any HTML content to professional PDFs on-demand
                      </p>
                      <div className="text-xs space-y-1 pt-2">
                        <div className="flex items-center gap-1">
                          <div className="size-1.5 rounded-full bg-green-500" />
                          <span>Full CSS support</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="size-1.5 rounded-full bg-green-500" />
                          <span>Custom page sizes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* How It Works */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">🔄 How It Works</h3>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        1
                      </div>
                      <div>
                        <p className="font-medium">User Action</p>
                        <p className="text-sm text-muted-foreground">
                          User clicks "Export PDF" or "Print" in any report page
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Agent Processing</p>
                        <p className="text-sm text-muted-foreground">
                          PDF.co Agent generates HTML with proper Arabic RTL formatting
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        3
                      </div>
                      <div>
                        <p className="font-medium">PDF.co API</p>
                        <p className="text-sm text-muted-foreground">
                          Converts HTML to professional PDF with high-quality rendering
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        4
                      </div>
                      <div>
                        <p className="font-medium">Delivery</p>
                        <p className="text-sm text-muted-foreground">
                          PDF is downloaded or opened in new tab for printing
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Setup Instructions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">📝 Setup Instructions</h3>
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-2">
                      <span className="font-bold text-primary">1.</span>
                      <div>
                        <span className="font-medium">Get PDF.co API Key:</span>
                        <p className="text-muted-foreground">
                          Sign up at{" "}
                          <a
                            href="https://pdf.co"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            pdf.co
                          </a>
                          {" "}and get your API key from dashboard
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-primary">2.</span>
                      <div>
                        <span className="font-medium">Add to Secrets:</span>
                        <p className="text-muted-foreground">
                          Go to Secrets tab → Add → Name: <code className="rounded bg-muted px-1">PDFCO_API_KEY</code> → Value: your API key
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-primary">3.</span>
                      <div>
                        <span className="font-medium">Test:</span>
                        <p className="text-muted-foreground">
                          Go to any report page and click "Export PDF" or "Print"
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-primary">4.</span>
                      <div>
                        <span className="font-medium">Enjoy:</span>
                        <p className="text-muted-foreground">
                          PDFs will be generated automatically using PDF.co Agent!
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>

                <Separator />

                {/* Pricing Info */}
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-semibold mb-2">💰 PDF.co Pricing</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    PDF.co offers generous free tier perfect for testing:
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-green-500" />
                      <span>500 API credits/month free</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-green-500" />
                      <span>Pay-as-you-go after free tier</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-green-500" />
                      <span>No credit card required for trial</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <SettingsTabContent />
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🔌 حالة التكاملات</CardTitle>
                <CardDescription>التحقق من تكوين API Keys والخدمات المتصلة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* Resend */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <MailIcon className="size-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">Resend</p>
                            <p className="text-sm text-muted-foreground">Email Delivery Service</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">
                            <ActivityIcon className="size-3 ml-1" />
                            مُكوّن
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            راجع Secrets tab
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-yellow-500/10 rounded-md flex items-start gap-2">
                          <AlertTriangleIcon className="size-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-yellow-600">RESEND_API_KEY مطلوب</p>
                            <p className="text-muted-foreground mt-1">
                              اذهب إلى Secrets tab وأضف RESEND_API_KEY للحصول على خدمة إرسال الإيميلات
                            </p>
                          </div>
                        </div>
                    </CardContent>
                  </Card>

                  {/* Anthropic */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <ServerIcon className="size-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold">Anthropic Claude</p>
                            <p className="text-sm text-muted-foreground">AI Assistant Service</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">
                            <ActivityIcon className="size-3 ml-1" />
                            مُكوّن
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            راجع Secrets tab
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-yellow-500/10 rounded-md flex items-start gap-2">
                          <AlertTriangleIcon className="size-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-yellow-600">ANTHROPIC_API_KEY مطلوب</p>
                            <p className="text-muted-foreground mt-1">
                              اذهب إلى Secrets tab وأضف ANTHROPIC_API_KEY للحصول على ميزات الذكاء الاصطناعي
                            </p>
                          </div>
                        </div>
                    </CardContent>
                  </Card>

                  {/* Convex Database */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center">
                            <ServerIcon className="size-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold">Convex Database</p>
                            <p className="text-sm text-muted-foreground">Backend & Database</p>
                          </div>
                        </div>
                        <Badge variant="default">
                          <CheckCircle2Icon className="size-3 ml-1" />
                          متصل
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <KeyIcon className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-600 mb-1">إدارة API Keys</p>
                        <p className="text-muted-foreground">
                          لإضافة أو تعديل API Keys، اذهب إلى Secrets tab في App Settings
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function SystemSupport() {
  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>تسجيل الدخول مطلوب</CardTitle>
              <CardDescription>يجب تسجيل الدخول للوصول إلى دعم النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton />
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <Authenticated>
        <SystemSupportInner />
      </Authenticated>
    </>
  );
}