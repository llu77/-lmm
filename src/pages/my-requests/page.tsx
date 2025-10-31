import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { ClipboardListIcon, CheckCircleIcon, XCircleIcon, ClockIcon, EyeIcon, ArrowLeftIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";
import { useBranch } from "@/hooks/use-branch.ts";
import { BranchSelector } from "@/components/branch-selector.tsx";
import { useNavigate } from "react-router-dom";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface Request {
  _id: Id<"employeeRequests">;
  _creationTime: number;
  employeeName: string;
  requestType: string;
  status: string;
  requestDate: number;
  advanceAmount?: number;
  vacationDate?: number;
  duesAmount?: number;
  permissionDate?: number;
  permissionStartTime?: string;
  permissionEndTime?: string;
  permissionHours?: number;
  violationDate?: number;
  objectionReason?: string;
  objectionDetails?: string;
  nationalId?: string;
  resignationText?: string;
  adminResponse?: string;
  responseDate?: number;
}

export default function MyRequestsPage() {
  const { branchId, branchName, isSelected, selectBranch } = useBranch();

  if (!isSelected) {
    return <BranchSelector onBranchSelected={selectBranch} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>طلباتي</CardTitle>
              <CardDescription>يرجى تسجيل الدخول لعرض طلباتك</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <SignInButton />
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="container mx-auto max-w-7xl p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AuthLoading>
      <Authenticated>
        <MyRequestsContent branchId={branchId!} branchName={branchName!} />
      </Authenticated>
    </div>
  );
}

function MyRequestsContent({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const requests = useQuery(
    api.employeeRequests.getMyRequests,
    selectedEmployee ? { branchId, employeeName: selectedEmployee } : "skip"
  );
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const navigate = useNavigate();

  if (requests === undefined) {
    return (
      <div className="container mx-auto max-w-7xl p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const pending = requests.filter((r: Request) => r.status === "تحت الإجراء");
  const approved = requests.filter((r: Request) => r.status === "مقبول");
  const rejected = requests.filter((r: Request) => r.status === "مرفوض");

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">طلباتي</h1>
          <p className="text-muted-foreground">متابعة حالة طلباتك</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.history.back()}
        >
          عودة
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ClockIcon className="size-4 text-yellow-500" />
              تحت الإجراء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircleIcon className="size-4 text-green-500" />
              مقبول
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approved.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <XCircleIcon className="size-4 text-red-500" />
              مرفوض
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejected.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جميع الطلبات</CardTitle>
          <CardDescription>عرض جميع طلباتك وحالتها</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardListIcon className="mx-auto size-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">لا توجد طلبات</p>
              <p className="text-sm text-muted-foreground">لم تقم بإنشاء أي طلبات بعد</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request: Request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{request.requestType}</span>
                      <Badge
                        variant={
                          request.status === "مقبول"
                            ? "default"
                            : request.status === "مرفوض"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      تاريخ الطلب: {format(new Date(request.requestDate), "dd MMMM yyyy", { locale: ar })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <EyeIcon className="size-4 ml-2" />
                    عرض التفاصيل
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
            <DialogDescription>عرض تفاصيل الطلب وحالته</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="font-medium">نوع الطلب:</span>
                  <span>{selectedRequest.requestType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">الحالة:</span>
                  <Badge
                    variant={
                      selectedRequest.status === "مقبول"
                        ? "default"
                        : selectedRequest.status === "مرفوض"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">تاريخ الطلب:</span>
                  <span>{format(new Date(selectedRequest.requestDate), "dd MMMM yyyy", { locale: ar })}</span>
                </div>

                {selectedRequest.requestType === "سلفة" && selectedRequest.advanceAmount && (
                  <div className="flex justify-between">
                    <span className="font-medium">المبلغ:</span>
                    <span>{selectedRequest.advanceAmount.toLocaleString()} ر.س</span>
                  </div>
                )}

                {selectedRequest.requestType === "إجازة" && selectedRequest.vacationDate && (
                  <div className="flex justify-between">
                    <span className="font-medium">تاريخ الإجازة:</span>
                    <span>{format(new Date(selectedRequest.vacationDate), "dd MMMM yyyy", { locale: ar })}</span>
                  </div>
                )}

                {selectedRequest.requestType === "صرف متأخرات" && selectedRequest.duesAmount && (
                  <div className="flex justify-between">
                    <span className="font-medium">المبلغ:</span>
                    <span>{selectedRequest.duesAmount.toLocaleString()} ر.س</span>
                  </div>
                )}

                {selectedRequest.requestType === "استئذان" && (
                  <>
                    {selectedRequest.permissionDate && (
                      <div className="flex justify-between">
                        <span className="font-medium">تاريخ الاستئذان:</span>
                        <span>{format(new Date(selectedRequest.permissionDate), "dd MMMM yyyy", { locale: ar })}</span>
                      </div>
                    )}
                    {selectedRequest.permissionStartTime && (
                      <div className="flex justify-between">
                        <span className="font-medium">وقت الاستئذان:</span>
                        <span>{selectedRequest.permissionStartTime}</span>
                      </div>
                    )}
                    {selectedRequest.permissionEndTime && (
                      <div className="flex justify-between">
                        <span className="font-medium">وقت العودة المتوقع:</span>
                        <span>{selectedRequest.permissionEndTime}</span>
                      </div>
                    )}
                    {selectedRequest.permissionHours && (
                      <div className="flex justify-between">
                        <span className="font-medium">عدد ساعات الاستئذان:</span>
                        <span>{selectedRequest.permissionHours} ساعة</span>
                      </div>
                    )}
                  </>
                )}

                {selectedRequest.requestType === "اعتراض على مخالفة" && (
                  <>
                    {selectedRequest.violationDate && (
                      <div className="flex justify-between">
                        <span className="font-medium">تاريخ المخالفة:</span>
                        <span>{format(new Date(selectedRequest.violationDate), "dd MMMM yyyy", { locale: ar })}</span>
                      </div>
                    )}
                    {selectedRequest.objectionReason && (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">سبب الاعتراض:</span>
                        <span className="text-sm">{selectedRequest.objectionReason}</span>
                      </div>
                    )}
                    {selectedRequest.objectionDetails && (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">تفاصيل إضافية:</span>
                        <span className="text-sm">{selectedRequest.objectionDetails}</span>
                      </div>
                    )}
                  </>
                )}

                {selectedRequest.requestType === "استقالة" && selectedRequest.resignationText && (
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">نص الاستقالة:</span>
                    <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
                      {selectedRequest.resignationText}
                    </div>
                  </div>
                )}

                {selectedRequest.adminResponse && (
                  <>
                    <hr className="my-2" />
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">رد الإدارة:</span>
                      <div className="rounded-lg bg-muted p-4 text-sm">
                        {selectedRequest.adminResponse}
                      </div>
                    </div>
                    {selectedRequest.responseDate && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>تاريخ الرد:</span>
                        <span>{format(new Date(selectedRequest.responseDate), "dd MMMM yyyy - HH:mm", { locale: ar })}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
