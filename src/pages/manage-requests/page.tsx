import { Authenticated, Unauthenticated, AuthLoading } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { SignInButton } from "@/components/ui/signin";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClipboardListIcon, CheckCircleIcon, XCircleIcon, ClockIcon, EyeIcon, PackageIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState, useEffect } from "react";
import { useBranch } from "@/hooks/use-branch";
import { BranchSelector } from "@/components/branch-selector";
import { toast } from "sonner";

interface Request {
  _id: string;
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

interface ProductOrder {
  _id: string;
  orderName?: string;
  products: Array<{ productName: string; quantity: number; price: number; total: number }>;
  grandTotal: number;
  status: string;
  employeeName: string;
  branchName: string;
  notes?: string;
  _creationTime: number;
}

export default function ManageRequestsPage() {
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
              <CardTitle>إدارة الطلبات</CardTitle>
              <CardDescription>يرجى تسجيل الدخول أولاً</CardDescription>
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
        </div>
      </AuthLoading>
      <Authenticated>
        <ManageRequestsContent branchId={branchId!} branchName={branchName!} />
      </Authenticated>
    </div>
  );
}

function ManageRequestsContent({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [requests] = useState<Request[] | undefined>(undefined);
  const [productOrders, setProductOrders] = useState<ProductOrder[] | undefined>(undefined);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [selectedProductOrder, setSelectedProductOrder] = useState<ProductOrder | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showProductOrderDialog, setShowProductOrderDialog] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [activeTab, setActiveTab] = useState<"employee" | "product">("employee");

  useEffect(() => {
    // TODO: Create API endpoint /api/employee-requests/all
    // fetch('/api/employee-requests/all').then(r => r.json()).then(setRequests);
  }, []);

  useEffect(() => {
    if (!branchId) {
      setProductOrders(undefined);
      return;
    }
    // TODO: Create API endpoint /api/product-orders/list
    // fetch(`/api/product-orders/list?branchId=${branchId}`).then(r => r.json()).then(setProductOrders);
  }, [branchId]);

  if (requests === undefined || productOrders === undefined) {
    return (
      <div className="container mx-auto max-w-7xl p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const requestsList = requests ?? [];
  const productOrdersList = productOrders ?? [];

  const pendingRequests = requestsList.filter((request) => request.status === "تحت الإجراء");
  const approvedRequests = requestsList.filter((request) => request.status === "مقبول");
  const rejectedRequests = requestsList.filter((request) => request.status === "مرفوض");

  const handleReview = async (action: "approve" | "reject") => {
    if (!selectedRequest) return;

    try {
      const status = action === "approve" ? "مقبول" : "مرفوض";
      // TODO: Create API endpoint /api/employee-requests/update-status
      await apiClient.post('/api/employee-requests/update-status', {
        requestId: selectedRequest._id,
        status,
        adminResponse: adminResponse.trim() || undefined,
      });

      toast.success(`تم ${status === "مقبول" ? "قبول" : "رفض"} الطلب بنجاح`);
      setShowReviewDialog(false);
      setSelectedRequest(null);
      setAdminResponse("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "فشل في تحديث الطلب";
      toast.error(errorMessage, { duration: 6000 });
      console.error("Update request error:", error);
    }
  };

  const renderRequestDetails = (request: Request) => {
    switch (request.requestType) {
      case "سلفة":
        return (
          <div className="space-y-2">
            <p><strong>المبلغ:</strong> {request.advanceAmount?.toLocaleString()} ر.س</p>
          </div>
        );
      case "إجازة":
        return (
          <div className="space-y-2">
            <p><strong>تاريخ الإجازة:</strong> {request.vacationDate ? format(request.vacationDate, "dd/MM/yyyy", { locale: ar }) : "-"}</p>
          </div>
        );
      case "صرف متأخرات":
        return (
          <div className="space-y-2">
            <p><strong>المبلغ المطلوب:</strong> {request.duesAmount?.toLocaleString()} ر.س</p>
          </div>
        );
      case "استئذان":
        return (
          <div className="space-y-2">
            <p><strong>تاريخ الاستئذان:</strong> {request.permissionDate ? format(request.permissionDate, "dd/MM/yyyy", { locale: ar }) : "-"}</p>
            <p><strong>من الساعة:</strong> {request.permissionStartTime}</p>
            <p><strong>إلى الساعة:</strong> {request.permissionEndTime}</p>
            <p><strong>عدد الساعات:</strong> {request.permissionHours} ساعة</p>
          </div>
        );
      case "اعتراض على مخالفة":
        return (
          <div className="space-y-2">
            <p><strong>تاريخ المخالفة:</strong> {request.violationDate ? format(request.violationDate, "dd/MM/yyyy", { locale: ar }) : "-"}</p>
            <p><strong>سبب الاعتراض:</strong> {request.objectionReason}</p>
            {request.objectionDetails && (
              <p><strong>التفاصيل:</strong> {request.objectionDetails}</p>
            )}
          </div>
        );
      case "استقالة":
        return (
          <div className="space-y-2">
            <p><strong>رقم الهوية:</strong> {request.nationalId}</p>
            <div className="mt-2 rounded-md bg-muted p-3">
              <p className="whitespace-pre-wrap text-sm">{request.resignationText}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto max-w-7xl p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة الطلبات</h1>
          <p className="text-muted-foreground">{branchName}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            <ClipboardListIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تحت الإجراء</CardTitle>
            <ClockIcon className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مقبول</CardTitle>
            <CheckCircleIcon className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مرفوض</CardTitle>
            <XCircleIcon className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List with Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "employee" | "product")}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="employee" className="flex items-center gap-2">
            <ClipboardListIcon className="size-4" />
            طلبات الموظفين
          </TabsTrigger>
          <TabsTrigger value="product" className="flex items-center gap-2">
            <PackageIcon className="size-4" />
            طلبات المنتجات
          </TabsTrigger>
        </TabsList>

        {/* Employee Requests Tab */}
        <TabsContent value="employee">
          <Card>
            <CardHeader>
              <CardTitle>طلبات الموظفين</CardTitle>
              <CardDescription>إدارة طلبات الموظفين (سلفة، إجازة، إلخ)</CardDescription>
            </CardHeader>
            <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد طلبات حالياً
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{request.employeeName}</h3>
                      <Badge variant="outline">{request.requestType}</Badge>
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
                      تاريخ الطلب: {format(request.requestDate, "dd MMMM yyyy - hh:mm a", { locale: ar })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowReviewDialog(true);
                        setReviewAction("approve");
                        setAdminResponse(request.adminResponse || "");
                      }}
                    >
                      <EyeIcon className="size-4 ml-2" />
                      عرض
                    </Button>
                    {request.status === "تحت الإجراء" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setReviewAction("approve");
                            setAdminResponse("");
                            setShowReviewDialog(true);
                          }}
                        >
                          <CheckCircleIcon className="size-4 ml-2" />
                          قبول
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setReviewAction("reject");
                            setAdminResponse("");
                            setShowReviewDialog(true);
                          }}
                        >
                          <XCircleIcon className="size-4 ml-2" />
                          رفض
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Product Orders Tab */}
        <TabsContent value="product">
          <Card>
            <CardHeader>
              <CardTitle>طلبات المنتجات</CardTitle>
              <CardDescription>إدارة طلبات المنتجات من الموظفين</CardDescription>
            </CardHeader>
            <CardContent>
              {productOrders === undefined ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : productOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد طلبات منتجات
                </div>
              ) : (
                <div className="space-y-4">
                  {productOrders.map((order) => (
                    <Card key={order._id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <PackageIcon className="size-5 text-primary" />
                              <p className="font-semibold">{order.employeeName}</p>
                              <Badge variant={
                                order.status === "pending" ? "secondary" :
                                order.status === "approved" ? "default" :
                                order.status === "rejected" ? "destructive" : "outline"
                              }>
                                {order.status === "pending" ? "قيد المراجعة" :
                                 order.status === "approved" ? "موافق عليه" :
                                 order.status === "rejected" ? "مرفوض" : order.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p>الفرع: {order.branchName}</p>
                              <p>عدد المنتجات: {order.products.length}</p>
                              <p>الإجمالي: {order.grandTotal.toLocaleString()} ر.س</p>
                              <p>التاريخ: {format(order._creationTime, "dd/MM/yyyy HH:mm", { locale: ar })}</p>
                              {order.notes && <p className="text-sm mt-1">ملاحظات: {order.notes}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProductOrder(order);
                                setShowProductOrderDialog(true);
                              }}
                            >
                              <EyeIcon className="size-4 ml-1" />
                              التفاصيل
                            </Button>
                            {order.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      // TODO: Create API endpoint /api/product-orders/update-status
                                      await apiClient.post('/api/product-orders/update-status', {
                                        orderId: order._id,
                                        status: "approved",
                                      });
                                      toast.success("تم قبول الطلب");
                                    } catch {
                                      toast.error("فشل في تحديث الطلب");
                                    }
                                  }}
                                >
                                  <CheckCircleIcon className="size-4 ml-1" />
                                  قبول
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    try {
                                      // TODO: Create API endpoint /api/product-orders/update-status
                                      await apiClient.post('/api/product-orders/update-status', {
                                        orderId: order._id,
                                        status: "rejected",
                                      });
                                      toast.success("تم رفض الطلب");
                                    } catch {
                                      toast.error("فشل في تحديث الطلب");
                                    }
                                  }}
                                >
                                  <XCircleIcon className="size-4 ml-1" />
                                  رفض
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Order Details Dialog */}
      <Dialog open={showProductOrderDialog} onOpenChange={setShowProductOrderDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل طلب المنتجات</DialogTitle>
            <DialogDescription>معلومات الطلب والمنتجات</DialogDescription>
          </DialogHeader>
          {selectedProductOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الموظف</Label>
                  <p className="text-sm">{selectedProductOrder.employeeName}</p>
                </div>
                <div>
                  <Label>الفرع</Label>
                  <p className="text-sm">{selectedProductOrder.branchName}</p>
                </div>
                <div>
                  <Label>الحالة</Label>
                  <Badge variant={
                    selectedProductOrder.status === "pending" ? "secondary" :
                    selectedProductOrder.status === "approved" ? "default" :
                    selectedProductOrder.status === "rejected" ? "destructive" : "outline"
                  }>
                    {selectedProductOrder.status === "pending" ? "قيد المراجعة" :
                     selectedProductOrder.status === "approved" ? "موافق عليه" :
                     selectedProductOrder.status === "rejected" ? "مرفوض" : selectedProductOrder.status}
                  </Badge>
                </div>
                <div>
                  <Label>التاريخ</Label>
                  <p className="text-sm">{format(selectedProductOrder._creationTime, "dd/MM/yyyy HH:mm", { locale: ar })}</p>
                </div>
              </div>

              {selectedProductOrder.notes && (
                <div>
                  <Label>ملاحظات</Label>
                  <p className="text-sm rounded-md bg-muted p-3">{selectedProductOrder.notes}</p>
                </div>
              )}

              <div>
                <Label>قائمة المنتجات</Label>
                <div className="mt-2 border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-right p-2">المنتج</th>
                        <th className="text-center p-2">الكمية</th>
                        <th className="text-right p-2">السعر</th>
                        <th className="text-right p-2">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProductOrder.products.map((product, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{product.productName}</td>
                          <td className="text-center p-2">{product.quantity}</td>
                          <td className="p-2">{product.price.toLocaleString()} ر.س</td>
                          <td className="p-2">{product.total.toLocaleString()} ر.س</td>
                        </tr>
                      ))}
                      <tr className="border-t font-bold bg-muted">
                        <td colSpan={3} className="p-2 text-right">الإجمالي الكلي</td>
                        <td className="p-2">{selectedProductOrder.grandTotal.toLocaleString()} ر.س</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductOrderDialog(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="review-dialog-description">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "قبول الطلب" : "رفض الطلب"}
            </DialogTitle>
            <DialogDescription id="review-dialog-description">
              مراجعة تفاصيل الطلب وإضافة رد الإدارة
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>الموظف</Label>
                <p className="text-sm">{selectedRequest.employeeName}</p>
              </div>
              <div>
                <Label>نوع الطلب</Label>
                <p className="text-sm">{selectedRequest.requestType}</p>
              </div>
              <div>
                <Label>التفاصيل</Label>
                {renderRequestDetails(selectedRequest)}
              </div>
              {selectedRequest.status !== "تحت الإجراء" && selectedRequest.adminResponse && (
                <div>
                  <Label>رد الإدارة السابق</Label>
                  <p className="text-sm rounded-md bg-muted p-3">{selectedRequest.adminResponse}</p>
                </div>
              )}
              {selectedRequest.status === "تحت الإجراء" && (
                <div className="space-y-2">
                  <Label htmlFor="adminResponse">رد الإدارة (اختياري)</Label>
                  <Textarea
                    id="adminResponse"
                    placeholder="أضف رد الإدارة هنا..."
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              إلغاء
            </Button>
            {selectedRequest?.status === "تحت الإجراء" && (
              <Button
                variant={reviewAction === "approve" ? "default" : "destructive"}
                onClick={() => handleReview(reviewAction)}
              >
                {reviewAction === "approve" ? "قبول" : "رفض"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}