import { PDFGenerator, createPDF } from "../pdf-generator";

/**
 * Financial Report Template - قالب التقارير المالية
 */

export interface TransactionData {
  id: string;
  date: string;
  description: string;
  type: "revenue" | "expense";
  category: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
}

export interface FinancialReportOptions {
  /**
   * نوع التقرير
   */
  reportType: "revenue" | "expense" | "combined";

  /**
   * بيانات المعاملات
   */
  transactions: TransactionData[];

  /**
   * الفترة الزمنية
   */
  period: {
    from: string;
    to: string;
  };

  /**
   * الفرع
   */
  branch?: string;

  /**
   * معلومات إحصائية
   */
  summary?: {
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
    transactionCount: number;
  };
}

/**
 * إنشاء تقرير مالي
 */
export function generateFinancialReport(options: FinancialReportOptions): PDFGenerator {
  const { reportType, transactions, period, branch, summary } = options;

  // تحديد عنوان التقرير
  const titles = {
    revenue: "تقرير الإيرادات",
    expense: "تقرير المصروفات",
    combined: "التقرير المالي الشامل"
  };

  const pdf = createPDF({
    title: titles[reportType],
    subtitle: `من ${period.from} إلى ${period.to}`,
    filename: `financial-report-${reportType}-${Date.now()}`,
    orientation: "landscape",
    includeHeaderFooter: true,
    includeWatermark: false,
    headerInfo: [
      { label: "الفرع", value: branch || "الفرع الرئيسي" },
      { label: "تاريخ التقرير", value: new Date().toLocaleDateString("ar-SA") },
      { label: "من", value: period.from },
      { label: "إلى", value: period.to }
    ]
  });

  const doc = pdf.getDoc();
  let yPosition = 60;

  // إضافة الملخص المالي
  if (summary) {
    yPosition += 5;

    const boxWidth = 65;
    const boxHeight = 30;
    const gap = 10;
    const totalBoxes = reportType === "combined" ? 4 : 2;
    const totalWidth = (boxWidth + gap) * totalBoxes - gap;
    const startX = (doc.internal.pageSize.getWidth() - totalWidth) / 2;

    let summaryBoxes: Array<{ label: string; value: string; color: string }> = [];

    if (reportType === "revenue") {
      summaryBoxes = [
        {
          label: "إجمالي الإيرادات",
          value: `${summary.totalRevenue.toLocaleString()} ر.س`,
          color: "#10B981"
        },
        {
          label: "عدد المعاملات",
          value: summary.transactionCount.toString(),
          color: "#3B82F6"
        }
      ];
    } else if (reportType === "expense") {
      summaryBoxes = [
        {
          label: "إجمالي المصروفات",
          value: `${summary.totalExpense.toLocaleString()} ر.س`,
          color: "#EF4444"
        },
        {
          label: "عدد المعاملات",
          value: summary.transactionCount.toString(),
          color: "#3B82F6"
        }
      ];
    } else {
      summaryBoxes = [
        {
          label: "إجمالي الإيرادات",
          value: `${summary.totalRevenue.toLocaleString()} ر.س`,
          color: "#10B981"
        },
        {
          label: "إجمالي المصروفات",
          value: `${summary.totalExpense.toLocaleString()} ر.س`,
          color: "#EF4444"
        },
        {
          label: "صافي الربح",
          value: `${summary.netProfit.toLocaleString()} ر.س`,
          color: summary.netProfit >= 0 ? "#FF6B00" : "#DC2626"
        },
        {
          label: "عدد المعاملات",
          value: summary.transactionCount.toString(),
          color: "#3B82F6"
        }
      ];
    }

    summaryBoxes.forEach((box, index) => {
      const x = startX + (boxWidth + gap) * index;

      // رسم المربع بتدرج لوني
      doc.setFillColor(box.color);
      doc.roundedRect(x, yPosition, boxWidth, boxHeight, 3, 3, "F");

      // إضافة القيمة
      doc.setTextColor("#FFFFFF");
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(box.value, x + boxWidth / 2, yPosition + 14, { align: "center" });

      // إضافة التسمية
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(box.label, x + boxWidth / 2, yPosition + 24, { align: "center" });
    });

    yPosition += boxHeight + 15;
  }

  // إعداد بيانات الجدول
  const headers = [
    "م",
    "التاريخ",
    "البيان",
    "النوع",
    "الفئة",
    "المبلغ",
    "طريقة الدفع",
    "ملاحظات"
  ];

  const rows = transactions.map((txn, index) => [
    (index + 1).toString(),
    txn.date,
    txn.description,
    txn.type === "revenue" ? "إيراد" : "مصروف",
    txn.category,
    `${txn.amount.toLocaleString()} ر.س`,
    txn.paymentMethod || "-",
    txn.notes || "-"
  ]);

  // إضافة الجدول
  pdf.addTable(headers, rows, {
    startY: yPosition,
    headerColor: "#FF6B00",
    rowColor: "#3A3A3A",
    alternateRowColor: "#2D2D2D"
  });

  // إضافة الإجماليات في نهاية الجدول
  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 100;

  if (finalY < doc.internal.pageSize.getHeight() - 60) {
    const totalsY = finalY + 10;
    const rightX = doc.internal.pageSize.getWidth() - 60;

    // رسم مربع الإجماليات
    doc.setFillColor("#2D2D2D");
    doc.roundedRect(rightX - 80, totalsY, 120, 40, 3, 3, "F");

    doc.setTextColor("#FFFFFF");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");

    if (reportType === "revenue" || reportType === "combined") {
      doc.text("إجمالي الإيرادات:", rightX - 5, totalsY + 10, { align: "right" });
      doc.setTextColor("#10B981");
      doc.text(
        `${summary?.totalRevenue.toLocaleString() || 0} ر.س`,
        rightX - 5,
        totalsY + 16,
        { align: "right" }
      );
    }

    if (reportType === "expense" || reportType === "combined") {
      doc.setTextColor("#FFFFFF");
      doc.text("إجمالي المصروفات:", rightX - 5, totalsY + 23, { align: "right" });
      doc.setTextColor("#EF4444");
      doc.text(
        `${summary?.totalExpense.toLocaleString() || 0} ر.س`,
        rightX - 5,
        totalsY + 29,
        { align: "right" }
      );
    }

    if (reportType === "combined" && summary) {
      doc.setDrawColor("#FF6B00");
      doc.setLineWidth(1);
      doc.line(rightX - 75, totalsY + 31, rightX + 35, totalsY + 31);

      doc.setTextColor("#FFFFFF");
      doc.setFontSize(11);
      doc.text("صافي الربح:", rightX - 5, totalsY + 37, { align: "right" });
      doc.setTextColor(summary.netProfit >= 0 ? "#FF6B00" : "#DC2626");
      doc.setFontSize(12);
      doc.text(
        `${summary.netProfit.toLocaleString()} ر.س`,
        rightX + 35,
        totalsY + 37,
        { align: "right" }
      );
    }
  }

  return pdf;
}

/**
 * مثال على الاستخدام:
 *
 * const transactions = [
 *   {
 *     id: "1",
 *     date: "2024-01-15",
 *     description: "مبيعات المنتجات",
 *     type: "revenue",
 *     category: "مبيعات",
 *     amount: 50000,
 *     paymentMethod: "نقداً"
 *   },
 *   // ... more transactions
 * ];
 *
 * const pdf = generateFinancialReport({
 *   reportType: "combined",
 *   transactions,
 *   period: { from: "2024-01-01", to: "2024-01-31" },
 *   branch: "الفرع الرئيسي",
 *   summary: {
 *     totalRevenue: 150000,
 *     totalExpense: 80000,
 *     netProfit: 70000,
 *     transactionCount: transactions.length
 *   }
 * });
 *
 * pdf.save();
 */
