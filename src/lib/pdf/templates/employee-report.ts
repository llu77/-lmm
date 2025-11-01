import { PDFGenerator, createPDF } from "../pdf-generator";

/**
 * Employee Report Template - قالب تقرير الموظفين
 */

export interface EmployeeData {
  id: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  hireDate: string;
  status: string;
}

export interface EmployeeReportOptions {
  /**
   * عنوان التقرير
   */
  title?: string;

  /**
   * بيانات الموظفين
   */
  employees: EmployeeData[];

  /**
   * الفرع
   */
  branch?: string;

  /**
   * القسم (اختياري)
   */
  department?: string;

  /**
   * تاريخ من
   */
  dateFrom?: string;

  /**
   * تاريخ إلى
   */
  dateTo?: string;

  /**
   * معلومات إحصائية
   */
  stats?: {
    totalEmployees: number;
    totalSalaries: number;
    activeEmployees: number;
    inactiveEmployees: number;
  };
}

/**
 * إنشاء تقرير الموظفين
 */
export function generateEmployeeReport(options: EmployeeReportOptions): PDFGenerator {
  const {
    title = "تقرير الموظفين",
    employees,
    branch,
    department,
    dateFrom,
    dateTo,
    stats
  } = options;

  // إنشاء PDF
  const pdf = createPDF({
    title,
    subtitle: department ? `قسم ${department}` : "جميع الأقسام",
    filename: `employee-report-${Date.now()}`,
    orientation: "landscape",
    includeHeaderFooter: true,
    includeWatermark: false,
    headerInfo: [
      { label: "الفرع", value: branch || "الفرع الرئيسي" },
      { label: "التاريخ", value: new Date().toLocaleDateString("ar-SA") },
      ...(dateFrom ? [{ label: "من", value: dateFrom }] : []),
      ...(dateTo ? [{ label: "إلى", value: dateTo }] : [])
    ]
  });

  const doc = pdf.getDoc();
  let yPosition = 60;

  // إضافة الإحصائيات
  if (stats) {
    yPosition += 5;

    const statsBoxWidth = 60;
    const statsBoxHeight = 25;
    const statsGap = 10;
    const totalWidth = (statsBoxWidth + statsGap) * 4 - statsGap;
    const startX = (doc.internal.pageSize.getWidth() - totalWidth) / 2;

    const statsData = [
      { label: "إجمالي الموظفين", value: stats.totalEmployees.toString(), color: "#3B82F6" },
      { label: "الموظفون النشطون", value: stats.activeEmployees.toString(), color: "#10B981" },
      { label: "الموظفون غير النشطين", value: stats.inactiveEmployees.toString(), color: "#EF4444" },
      { label: "إجمالي الرواتب", value: `${stats.totalSalaries.toLocaleString()} ر.س`, color: "#FF6B00" }
    ];

    statsData.forEach((stat, index) => {
      const x = startX + (statsBoxWidth + statsGap) * index;

      // رسم المربع
      doc.setFillColor(stat.color);
      doc.roundedRect(x, yPosition, statsBoxWidth, statsBoxHeight, 3, 3, "F");

      // إضافة القيمة
      doc.setTextColor("#FFFFFF");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(stat.value, x + statsBoxWidth / 2, yPosition + 12, { align: "center" });

      // إضافة التسمية
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(stat.label, x + statsBoxWidth / 2, yPosition + 20, { align: "center" });
    });

    yPosition += statsBoxHeight + 15;
  }

  // إعداد بيانات الجدول
  const headers = ["الرقم", "الاسم", "المسمى الوظيفي", "القسم", "الراتب", "تاريخ التعيين", "الحالة"];

  const rows = employees.map((emp, index) => [
    (index + 1).toString(),
    emp.name,
    emp.position,
    emp.department,
    `${emp.salary.toLocaleString()} ر.س`,
    emp.hireDate,
    emp.status
  ]);

  // إضافة الجدول
  pdf.addTable(headers, rows, {
    startY: yPosition,
    headerColor: "#FF6B00",
    rowColor: "#3A3A3A",
    alternateRowColor: "#2D2D2D"
  });

  // إضافة الملاحظات في الأسفل
  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 100;

  if (finalY < doc.internal.pageSize.getHeight() - 50) {
    doc.setFontSize(10);
    doc.setTextColor("#808080");
    doc.setFont("helvetica", "italic");
    doc.text(
      "ملاحظة: هذا التقرير تم إنشاؤه تلقائياً من نظام Jobfit Community",
      20,
      finalY + 10
    );
  }

  return pdf;
}

/**
 * مثال على الاستخدام:
 *
 * const employees = [
 *   {
 *     id: "1",
 *     name: "أحمد محمد",
 *     position: "مدير مبيعات",
 *     department: "المبيعات",
 *     salary: 15000,
 *     hireDate: "2023-01-15",
 *     status: "نشط"
 *   },
 *   // ... more employees
 * ];
 *
 * const pdf = generateEmployeeReport({
 *   employees,
 *   branch: "الفرع الرئيسي",
 *   stats: {
 *     totalEmployees: employees.length,
 *     totalSalaries: employees.reduce((sum, emp) => sum + emp.salary, 0),
 *     activeEmployees: employees.filter(e => e.status === "نشط").length,
 *     inactiveEmployees: employees.filter(e => e.status !== "نشط").length
 *   }
 * });
 *
 * pdf.save(); // أو pdf.print() للطباعة
 */
