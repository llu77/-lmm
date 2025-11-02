import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useBranch } from "@/hooks/use-branch.ts";
import { BranchSelector } from "@/components/branch-selector.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { PlusIcon, TrashIcon, SaveIcon, SendIcon, PackageIcon, PrinterIcon, ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Id } from "@/convex/_generated/dataModel";
import { printProductOrderPDF } from "@/lib/pdf-export.ts";
import type { Doc } from "@/convex/_generated/dataModel";

type ProductOrderDraft = Doc<"productOrders">;

// قائمة المنتجات الكاملة مع الأسعار (SAR)
const PRODUCTS_WITH_PRICES: Record<string, number> = {
  "بلاديكس أمواس أزرق": 24,
  "مناشف استخدام مره واحده 50×100": 21,
  "كرات قطن": 3,
  "أعواد قطن أزرق": 4,
  "شمع بابز أسود أو أزرق": 41,
  "مناشف منعشه 25": 12,
  "جل حلاقة ازرق sahon": 5,
  "سفنج لتنظيف البشرة 12 حبه": 9,
  "واكس للشعر": 27,
  "مناديل رول نظافه": 8,
  "مناديل بلاتينا 600 حبه": 34,
  "قطن": 3,
  "واكس سستم أعود خشبيه 50حبه": 3,
  "مريله بلاستك أصفر كرتون": 41,
  "ورق رقبه": 10,
  "قفازات أسود مقاس اكس لارج 100": 9,
  "قفازات أسود مقاس لارج 100": 9,
  "ليمون منظف للوجه": 3,
  "ماكينة تنعيم": 20,
  "تونك أسود لملئ الفراغات": 12,
  "صابون للارضيات": 9,
  "لمبه لجهاز التعقيم": 5,
  "زيت دقن": 20,
  "غطاء رأس لحمام الزيت": 5,
  "أسبريه ملمع": 12,
  "كمامات": 7,
  "ديتول / منظف أرضيات": 23,
  "مرايه": 12,
  "أسبريه مثبت للشعر": 16,
  "مناشف منشفه منعشه لافاندر": 23,
  "شامبو فاتيكا": 9,
  "أمشاط تدريج": 10,
  "ماسك طين": 15,
  "ماسك نعناع": 15,
  "ماسك خيار": 15,
  "ماسك فحم": 15,
  "ماسك فراوله": 15,
  "ماسك قهوه": 15,
  "بودره": 5,
  "شمع": 44,
  "لزقة انف 20 حبه": 5,
  "اكياس نفايات اصفر 10/8 جالون": 6,
  "اكياس نفايات اسود 50 جالون": 8,
  "صبغه راس بني غامق 303": 15,
  "صبغه دقن بني غامق ابل": 15,
  "حنى اسود": 11,
  "حمام زيت": 15,
  "معطر 500 مل": 150,
  "سيروم فيتامين سي": 15,
  "سيروم كولاجين": 15,
  "مشط بلاستيك": 5,
  "امشاط بلاستيك": 15,
  "علبه بخاخه ماء": 6,
  "مقص حلاقة 5/5": 20,
  "مقص حلاقة 6": 25,
  "مكنسه للارضيات": 10,
  "فتالة ممسحه ارضيات": 10,
};

const PRODUCTS = Object.keys(PRODUCTS_WITH_PRICES);

// أسماء الموظفين حسب الفرع
const EMPLOYEES = {
  "1010": ["عبدالحي جلال", "محمود عمارة", "علاء ناصر", "السيد محمد", "عمرو"],
  "2020": ["محمد إسماعيل", "محمد ناصر", "فارس محمد"],
};

interface Product {
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export default function ProductOrdersPage() {
  const { branchId, branchName, isSelected, selectBranch } = useBranch();

  if (!isSelected) {
    return <BranchSelector onBranchSelected={selectBranch} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>تسجيل الدخول مطلوب</CardTitle>
              <CardDescription>
                يرجى تسجيل الدخول لإنشاء طلبات المنتجات
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Skeleton className="h-96 w-full max-w-4xl" />
        </div>
      </AuthLoading>
      <Authenticated>
        <ProductOrdersContent branchId={branchId!} branchName={branchName!} />
      </Authenticated>
    </div>
  );
}

function ProductOrdersContent({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [employeeName, setEmployeeName] = useState("");
  const [orderName, setOrderName] = useState("");
  const [products, setProducts] = useState<Product[]>([{
    productName: "",
    quantity: 0,
    price: 0,
    total: 0,
  }]);
  const [notes, setNotes] = useState("");
  const [showDrafts, setShowDrafts] = useState(false);

  const drafts = useQuery(
    api.productOrders.getDrafts,
    employeeName ? { branchId, employeeName } : "skip"
  );
  const orders = useQuery(
    api.productOrders.getOrders,
    branchId ? { branchId } : "skip"
  );
  const createOrder = useMutation(api.productOrders.createOrder);
  const updateOrder = useMutation(api.productOrders.updateOrder);
  const deleteDraft = useMutation(api.productOrders.deleteDraft);

  const employees = EMPLOYEES[branchId as keyof typeof EMPLOYEES] || [];

  // حساب المجموع الكلي
  const grandTotal = products.reduce((sum, p) => sum + p.total, 0);

  const addProduct = () => {
    if (products.length < 17) {
      setProducts([...products, { productName: "", quantity: 0, price: 0, total: 0 }]);
    } else {
      toast.error("الحد الأقصى 17 منتج");
    }
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, field: keyof Product, value: string | number) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    
    // إذا تم اختيار منتج، املأ السعر تلقائياً
    if (field === "productName" && typeof value === "string") {
      const price = PRODUCTS_WITH_PRICES[value] || 0;
      newProducts[index].price = price;
      newProducts[index].total = newProducts[index].quantity * price;
    }
    
    // حساب الإجمالي تلقائياً
    if (field === "quantity" || field === "price") {
      newProducts[index].total = newProducts[index].quantity * newProducts[index].price;
    }
    
    setProducts(newProducts);
  };

  const handleSaveDraft = async () => {
    if (!employeeName) {
      toast.error("الرجاء اختيار اسم الموظف");
      return;
    }
    if (!orderName) {
      toast.error("الرجاء إدخال اسم للطلب المحفوظ");
      return;
    }
    if (products.some(p => !p.productName || p.quantity <= 0 || p.price <= 0)) {
      toast.error("الرجاء ملء جميع بيانات المنتجات");
      return;
    }

    try {
      await createOrder({
        orderName,
        products,
        grandTotal,
        isDraft: true,
        employeeName,
        notes,
        branchId,
        branchName,
      });
      toast.success("تم حفظ الطلب كمسودة بنجاح");
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "فشل حفظ المسودة";
      toast.error(errorMessage, { duration: 6000 });
      console.error("Save draft error:", error);
    }
  };

  const handleSendOrder = async () => {
    if (!employeeName) {
      toast.error("الرجاء اختيار اسم الموظف");
      return;
    }
    if (products.some(p => !p.productName || p.quantity <= 0 || p.price <= 0)) {
      toast.error("الرجاء ملء جميع بيانات المنتجات");
      return;
    }

    try {
      await createOrder({
        orderName,
        products,
        grandTotal,
        isDraft: false,
        employeeName,
        notes,
        branchId,
        branchName,
      });
      toast.success("تم إرسال الطلب بنجاح");
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "فشل إرسال الطلب";
      toast.error(errorMessage, { duration: 6000 });
      console.error("Send order error:", error);
    }
  };

  const loadDraft = (draft: { orderName?: string; products: Product[]; notes?: string }) => {
    setOrderName(draft.orderName || "");
    setProducts(draft.products);
    setNotes(draft.notes || "");
    setShowDrafts(false);
    toast.success("تم تحميل المسودة");
  };

  const handleDeleteDraft = async (draftId: Id<"productOrders">) => {
    try {
      await deleteDraft({ orderId: draftId });
      toast.success("تم حذف المسودة");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "فشل حذف المسودة";
      toast.error(errorMessage, { duration: 6000 });
      console.error("Delete draft error:", error);
    }
  };

  const resetForm = () => {
    setOrderName("");
    setProducts([{ productName: "", quantity: 0, price: 0, total: 0 }]);
    setNotes("");
  };

  const handlePrint = async (order: {
    _id: Id<"productOrders">;
    orderName?: string;
    products: Array<{ productName: string; quantity: number; price: number; total: number }>;
    grandTotal: number;
    status: string;
    employeeName: string;
    branchName: string;
    notes?: string;
    _creationTime: number;
  }) => {
    try {
      await printProductOrderPDF(order);
    } catch (error) {
      toast.error("فشل في طباعة الفاتورة");
    }
  };

  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="gap-2"
      >
        <ArrowLeftIcon className="size-4" />
        رجوع
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">طلبات المنتجات</h1>
          <p className="text-muted-foreground">إنشاء وإدارة طلبات المنتجات</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowDrafts(!showDrafts)}
        >
          <PackageIcon className="size-4 ml-2" />
          {showDrafts ? "إخفاء المسودات" : "عرض المسودات المحفوظة"}
        </Button>
      </div>

      {/* Drafts List */}
      {showDrafts && (
        <Card>
          <CardHeader>
            <CardTitle>المسودات المحفوظة</CardTitle>
          </CardHeader>
          <CardContent>
            {!drafts && <Skeleton className="h-20 w-full" />}
            {drafts && drafts.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                لا توجد مسودات محفوظة
              </p>
            )}
            {drafts && drafts.length > 0 && (
              <div className="space-y-2">
              {drafts.map((draft: ProductOrderDraft) => (
                  <div
                    key={draft._id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{draft.orderName}</p>
                      <p className="text-sm text-muted-foreground">
                        {draft.products.length} منتج - المجموع: {draft.grandTotal.toLocaleString()} ر.س
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadDraft(draft)}
                      >
                        تحميل
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteDraft(draft._id)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sent Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>الطلبات المرسلة</CardTitle>
          <CardDescription>
            عرض جميع الطلبات المرسلة للفرع
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!orders && <Skeleton className="h-20 w-full" />}
          {orders && orders.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              لا توجد طلبات مرسلة
            </p>
          )}
          {orders && orders.length > 0 && (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{order.employeeName}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          order.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : order.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {order.status === "pending"
                          ? "قيد الانتظار"
                          : order.status === "approved"
                            ? "معتمد"
                            : order.status === "rejected"
                              ? "مرفوض"
                              : "مكتمل"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.products.length} منتج - الإجمالي: {order.grandTotal.toLocaleString()} ر.س
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order._creationTime).toLocaleDateString("ar-SA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrint(order)}
                  >
                    <PrinterIcon className="size-4 ml-2" />
                    طباعة
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle>طلب جديد</CardTitle>
          <CardDescription>
            يمكنك إضافة حتى 17 منتج في الطلب الواحد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Employee Name */}
          <div className="space-y-2">
            <Label>اسم الموظف *</Label>
            <Select value={employeeName} onValueChange={setEmployeeName}>
              <SelectTrigger>
                <SelectValue placeholder="اختر اسم الموظف" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Order Name (for drafts) */}
          <div className="space-y-2">
            <Label>اسم الطلب (اختياري - للمسودات)</Label>
            <Input
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              placeholder="مثال: طلب شهري - يناير"
            />
          </div>

          {/* Products */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">المنتجات</Label>
              <span className="text-sm text-muted-foreground">
                {products.length} / 17
              </span>
            </div>

            {products.map((product, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">منتج {index + 1}</span>
                  {products.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeProduct(index)}
                    >
                      <TrashIcon className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  {/* Product Name */}
                  <div className="space-y-2">
                    <Label>المنتج *</Label>
                    <Select
                      value={product.productName}
                      onValueChange={(value) => updateProduct(index, "productName", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCTS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label>الكمية *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={product.quantity || ""}
                      onChange={(e) => updateProduct(index, "quantity", Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label>السعر (ر.س) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.price || ""}
                      onChange={(e) => updateProduct(index, "price", Number(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Total */}
                  <div className="space-y-2">
                    <Label>الإجمالي (ر.س)</Label>
                    <Input
                      type="text"
                      value={product.total.toLocaleString()}
                      disabled
                      className="bg-muted font-semibold"
                    />
                  </div>
                </div>
              </div>
            ))}

            {products.length < 17 && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={addProduct}
              >
                <PlusIcon className="size-4 ml-2" />
                إضافة منتج ({products.length}/17)
              </Button>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
            <span className="text-lg font-bold">المجموع الكلي:</span>
            <span className="text-2xl font-bold text-primary">
              {grandTotal.toLocaleString()} ر.س
            </span>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف أي ملاحظات إضافية..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSaveDraft}
              variant="outline"
              className="flex-1"
            >
              <SaveIcon className="size-4 ml-2" />
              حفظ كمسودة
            </Button>
            <Button
              onClick={handleSendOrder}
              className="flex-1"
            >
              <SendIcon className="size-4 ml-2" />
              إرسال الطلب
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
