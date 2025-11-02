import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useBranch } from "@/hooks/use-branch.ts";
import { BranchSelector } from "@/components/branch-selector.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import Navbar from "@/components/navbar.tsx";
import { FileTextIcon, CalendarIcon, DollarSignIcon, ClockIcon, AlertCircleIcon, LogOutIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const BRANCH_EMPLOYEES = {
  "1010": ["عبدالحي جلال", "محمود عمارة", "علاء ناصر", "السيد محمد", "عمرو"],
  "2020": ["محمد إسماعيل", "محمد ناصر", "فارس محمد"],
};

const BRANCH_SUPERVISORS = {
  "1010": "عبدالحي جلال",
  "2020": "محمد إسماعيل",
};

const OBJECTION_REASONS = [
  "لم أقم بعمل المخالفة إطلاقاً",
  "كان هناك سبب اضطراري",
  "طلب مراجعة الكاميرا",
  "المشرف قام بتبليغ التفاصيل بشكل غير دقيق",
  "هذه المرة الأولى للمخالفة",
  "المشرف لم يخبرني عن التعليمات من قبل",
  "أنا أتحمل جزء من المخالفة فقط",
];

export default function EmployeeRequests() {
  const { branchId, branchName, selectBranch } = useBranch();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [requestType, setRequestType] = useState("");

  
  // Advance fields
  const [advanceAmount, setAdvanceAmount] = useState("");
  
  // Vacation fields
  const [vacationDate, setVacationDate] = useState("");
  
  // Dues fields
  const [duesAmount, setDuesAmount] = useState("");
  
  // Permission fields
  const [permissionDate, setPermissionDate] = useState("");
  const [permissionStartTime, setPermissionStartTime] = useState("");
  const [permissionEndTime, setPermissionEndTime] = useState("");
  
  // Objection fields
  const [violationDate, setViolationDate] = useState("");
  const [objectionReason, setObjectionReason] = useState("");
  const [objectionDetails, setObjectionDetails] = useState("");
  
  // Resignation fields
  const [nationalId, setNationalId] = useState("");

  const createRequest = useMutation(api.employeeRequests.create);

  if (!branchId) {
    return <BranchSelector onBranchSelected={selectBranch} />;
  }

  const employees = BRANCH_EMPLOYEES[branchId as keyof typeof BRANCH_EMPLOYEES] || [];
  const supervisor = BRANCH_SUPERVISORS[branchId as keyof typeof BRANCH_SUPERVISORS] || "";

  const calculatePermissionHours = () => {
    if (!permissionStartTime || !permissionEndTime) return 0;
    const [startH, startM] = permissionStartTime.split(":").map(Number);
    const [endH, endM] = permissionEndTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diffMinutes = endMinutes - startMinutes;
    return Math.max(0, diffMinutes / 60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast.error("الرجاء اختيار اسم الموظف");
      return;
    }

    if (!requestType) {
      toast.error("الرجاء اختيار نوع الطلب");
      return;
    }

    try {
      const baseData = {
        branchId,
        branchName: branchName || "",
        employeeName: selectedEmployee,
        requestType,

      };

      let specificData: Record<string, unknown> = {};

      switch (requestType) {
        case "سلفة": {
          if (!advanceAmount || Number(advanceAmount) <= 0) {
            toast.error("الرجاء إدخال قيمة السلفة");
            return;
          }
          specificData = { advanceAmount: Number(advanceAmount) };
          break;
        }

        case "إجازة": {
          if (!vacationDate) {
            toast.error("الرجاء تحديد تاريخ الإجازة");
            return;
          }
          specificData = { vacationDate: new Date(vacationDate).getTime() };
          break;
        }

        case "صرف متأخرات": {
          if (!duesAmount || Number(duesAmount) <= 0) {
            toast.error("الرجاء إدخال المبلغ المطلوب");
            return;
          }
          specificData = { duesAmount: Number(duesAmount) };
          break;
        }

        case "استئذان": {
          if (!permissionDate || !permissionStartTime || !permissionEndTime) {
            toast.error("الرجاء تحديد تاريخ الاستئذان ووقت الذهاب والعودة");
            return;
          }
          const hours = calculatePermissionHours();
          if (hours <= 0) {
            toast.error("وقت العودة يجب أن يكون بعد وقت الذهاب");
            return;
          }
          specificData = {
            permissionDate: new Date(permissionDate).getTime(),
            permissionStartTime,
            permissionEndTime,
            permissionHours: hours,
          };
          break;
        }

        case "اعتراض على مخالفة": {
          if (!violationDate || !objectionReason) {
            toast.error("الرجاء تحديد تاريخ المخالفة وسبب الاعتراض");
            return;
          }
          specificData = {
            violationDate: new Date(violationDate).getTime(),
            objectionReason,
            objectionDetails: objectionReason === "كان هناك سبب اضطراري" ? objectionDetails : undefined,
          };
          break;
        }

        case "استقالة": {
          if (!nationalId || nationalId.length !== 10) {
            toast.error("الرجاء إدخال رقم الهوية (10 أرقام)");
            return;
          }
          const resignationText = `السلام عليكم ورحمة الله وبركاته،\n\nأنا الموظف ${selectedEmployee}، أتقدم بطلب استقالة من ${branchName} وعدم رغبتي (رقم الهوية: ${nationalId}) في استكمال المدة المتبقية من العقد، وذلك لأسباب شخصية تعود لي.\n\nولذلك أرجو قبول استقالتي وشكراً.\n\nالموظف: ${selectedEmployee}\nالتاريخ: ${format(new Date(), "dd/MM/yyyy", { locale: ar })}\n\nالجهة الأخرى:\n${branchName}\nالمشرف: ${supervisor}`;
          specificData = { nationalId, resignationText };
          break;
        }
      }

      await createRequest({ ...baseData, ...specificData });
      
      toast.success("تم إرسال الطلب بنجاح");
      
      // Reset form
      setSelectedEmployee("");
      setRequestType("");
      setAdvanceAmount("");
      setVacationDate("");
      setDuesAmount("");
      setPermissionDate("");
      setPermissionStartTime("");
      setPermissionEndTime("");
      setViolationDate("");
      setObjectionReason("");
      setObjectionDetails("");
      setNationalId("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "فشل إرسال الطلب";
      toast.error(errorMessage, { duration: 6000 });
      console.error("Create request error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">طلبات الموظفين</CardTitle>
            <CardDescription>إنشاء طلب جديد للموظف</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Employee Selection */}
              <div className="space-y-2">
                <Label>اسم الموظف *</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الموظف" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp} value={emp}>
                        {emp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Request Type */}
              <div className="space-y-2">
                <Label>نوع الطلب *</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الطلب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="سلفة">سلفة</SelectItem>
                    <SelectItem value="إجازة">إجازة</SelectItem>
                    <SelectItem value="صرف متأخرات">صرف متأخرات</SelectItem>
                    <SelectItem value="استئذان">استئذان</SelectItem>
                    <SelectItem value="اعتراض على مخالفة">اعتراض على مخالفة</SelectItem>
                    <SelectItem value="استقالة">استقالة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Fields Based on Request Type */}
              {requestType === "سلفة" && (
                <div className="space-y-2">
                  <Label>قيمة السلفة (ر.س) *</Label>
                  <Input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
              )}

              {requestType === "إجازة" && (
                <div className="space-y-2">
                  <Label>تاريخ الإجازة *</Label>
                  <Input
                    type="date"
                    value={vacationDate}
                    onChange={(e) => setVacationDate(e.target.value)}
                  />
                </div>
              )}

              {requestType === "صرف متأخرات" && (
                <div className="space-y-2">
                  <Label>المبلغ المطلوب (ر.س) *</Label>
                  <Input
                    type="number"
                    value={duesAmount}
                    onChange={(e) => setDuesAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
              )}

              {requestType === "استئذان" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>تاريخ الاستئذان *</Label>
                    <Input
                      type="date"
                      value={permissionDate}
                      onChange={(e) => setPermissionDate(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>وقت الاستئذان *</Label>
                      <Input
                        type="time"
                        value={permissionStartTime}
                        onChange={(e) => setPermissionStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>وقت العودة المتوقع *</Label>
                      <Input
                        type="time"
                        value={permissionEndTime}
                        onChange={(e) => setPermissionEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  {permissionStartTime && permissionEndTime && (
                    <div className="text-sm text-muted-foreground">
                      ساعات الاستئذان: {calculatePermissionHours().toFixed(2)} ساعة
                    </div>
                  )}
                </div>
              )}

              {requestType === "اعتراض على مخالفة" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>تاريخ المخالفة *</Label>
                    <Input
                      type="date"
                      value={violationDate}
                      onChange={(e) => setViolationDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>سبب الاعتراض *</Label>
                    <Select value={objectionReason} onValueChange={setObjectionReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر السبب" />
                      </SelectTrigger>
                      <SelectContent>
                        {OBJECTION_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {objectionReason === "كان هناك سبب اضطراري" && (
                    <div className="space-y-2">
                      <Label>تفاصيل السبب *</Label>
                      <Textarea
                        value={objectionDetails}
                        onChange={(e) => setObjectionDetails(e.target.value)}
                        placeholder="اكتب تفاصيل السبب الاضطراري..."
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              )}

              {requestType === "استقالة" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>رقم الهوية (10 أرقام) *</Label>
                    <Input
                      type="text"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="0000000000"
                      maxLength={10}
                    />
                  </div>
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="whitespace-pre-line text-sm leading-relaxed">
                        السلام عليكم ورحمة الله وبركاته،{"\n\n"}
                        أنا الموظف <span className="font-semibold">{selectedEmployee || "..."}</span>، أتقدم بطلب استقالة من <span className="font-semibold">{branchName}</span> وعدم رغبتي (رقم الهوية: <span className="font-semibold">{nationalId || "..."}</span>) في استكمال المدة المتبقية من العقد، وذلك لأسباب شخصية تعود لي.{"\n\n"}
                        ولذلك أرجو قبول استقالتي وشكراً.{"\n\n"}
                        الموظف: <span className="font-semibold">{selectedEmployee || "..."}</span>{"\n"}
                        التاريخ: <span className="font-semibold">{format(new Date(), "dd/MM/yyyy", { locale: ar })}</span>{"\n\n"}
                        الجهة الأخرى:{"\n"}
                        <span className="font-semibold">{branchName}</span>{"\n"}
                        المشرف: <span className="font-semibold">{supervisor}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                إرسال الطلب
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}