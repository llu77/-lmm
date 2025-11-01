import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BRAND } from "@/lib/brand-constants";

/**
 * PDF Generator Utility - نظام متقدم لإنشاء تقارير PDF
 *
 * Features:
 * - إضافة اللوجو تلقائياً
 * - Header و Footer احترافي
 * - دعم اللغة العربية
 * - جداول منسقة
 * - ألوان نظام التصميم
 * - Watermark (اختياري)
 */

export interface PDFOptions {
  /**
   * عنوان التقرير
   */
  title: string;

  /**
   * عنوان فرعي (اختياري)
   */
  subtitle?: string;

  /**
   * اسم الملف (بدون امتداد)
   */
  filename: string;

  /**
   * توجيه الصفحة
   */
  orientation?: "portrait" | "landscape";

  /**
   * إضافة Header و Footer؟
   */
  includeHeaderFooter?: boolean;

  /**
   * إضافة Watermark؟
   */
  includeWatermark?: boolean;

  /**
   * نص Watermark المخصص
   */
  watermarkText?: string;

  /**
   * معلومات إضافية في Header
   */
  headerInfo?: {
    label: string;
    value: string;
  }[];
}

export class PDFGenerator {
  private doc: jsPDF;
  private options: Required<PDFOptions>;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;

  constructor(options: PDFOptions) {
    this.options = {
      orientation: "portrait",
      includeHeaderFooter: true,
      includeWatermark: false,
      watermarkText: "سري",
      subtitle: "",
      headerInfo: [],
      ...options
    };

    this.doc = new jsPDF({
      orientation: this.options.orientation,
      unit: "mm",
      format: "a4"
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();

    // إضافة الخطوط العربية (إذا كانت متوفرة)
    this.setupFonts();

    // إضافة Header و Footer للصفحة الأولى
    if (this.options.includeHeaderFooter) {
      this.addHeader();
      this.addFooter();
    }

    // إضافة Watermark
    if (this.options.includeWatermark) {
      this.addWatermark();
    }
  }

  /**
   * إعداد الخطوط
   */
  private setupFonts() {
    // TODO: Add Arabic fonts support
    // For now, we'll use the default fonts
    this.doc.setFont("helvetica");
  }

  /**
   * إضافة Header مع اللوجو
   */
  private addHeader() {
    const yStart = this.margin;

    // إضافة اللوجو (مربع ملون كـ placeholder)
    this.doc.setFillColor(BRAND.colors.primary.main);
    this.doc.rect(this.margin, yStart, 20, 20, "F");

    // إضافة نص "JF" في المربع
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(14);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("JF", this.margin + 10, yStart + 13, { align: "center" });

    // إضافة عنوان التقرير
    this.doc.setTextColor(BRAND.colors.text.primary);
    this.doc.setFontSize(20);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(this.options.title, this.margin + 25, yStart + 10);

    // إضافة العنوان الفرعي
    if (this.options.subtitle) {
      this.doc.setFontSize(12);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(BRAND.colors.text.secondary);
      this.doc.text(this.options.subtitle, this.margin + 25, yStart + 17);
    }

    // إضافة معلومات إضافية (على اليمين)
    if (this.options.headerInfo.length > 0) {
      const xRight = this.pageWidth - this.margin;
      let yInfo = yStart + 5;

      this.doc.setFontSize(9);
      this.doc.setFont("helvetica", "normal");

      this.options.headerInfo.forEach((info) => {
        this.doc.setTextColor(BRAND.colors.text.muted);
        this.doc.text(`${info.label}:`, xRight, yInfo, { align: "right" });
        this.doc.setTextColor(BRAND.colors.text.primary);
        this.doc.text(info.value, xRight, yInfo + 4, { align: "right" });
        yInfo += 10;
      });
    }

    // خط فاصل
    this.doc.setDrawColor(BRAND.colors.neutral.border);
    this.doc.setLineWidth(0.5);
    this.doc.line(
      this.margin,
      yStart + 25,
      this.pageWidth - this.margin,
      yStart + 25
    );
  }

  /**
   * إضافة Footer
   */
  private addFooter() {
    const yFooter = this.pageHeight - 15;

    // خط فاصل
    this.doc.setDrawColor(BRAND.colors.neutral.border);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, yFooter, this.pageWidth - this.margin, yFooter);

    // معلومات الشركة
    this.doc.setFontSize(8);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(BRAND.colors.text.muted);

    this.doc.text(
      `${BRAND.name} - ${BRAND.tagline}`,
      this.pageWidth / 2,
      yFooter + 5,
      { align: "center" }
    );

    this.doc.text(
      `${BRAND.contact.email} | ${BRAND.contact.phone}`,
      this.pageWidth / 2,
      yFooter + 9,
      { align: "center" }
    );

    // رقم الصفحة
    const pageNum = this.doc.getCurrentPageInfo().pageNumber;
    this.doc.text(
      `صفحة ${pageNum}`,
      this.pageWidth - this.margin,
      yFooter + 7,
      { align: "right" }
    );

    // تاريخ الإنشاء
    const date = new Date().toLocaleDateString("ar-SA");
    this.doc.text(date, this.margin, yFooter + 7, { align: "left" });
  }

  /**
   * إضافة Watermark
   */
  private addWatermark() {
    this.doc.setTextColor(200, 200, 200);
    this.doc.setFontSize(60);
    this.doc.setFont("helvetica", "bold");

    const text = this.options.watermarkText;
    const pageWidth = this.pageWidth;
    const pageHeight = this.pageHeight;

    // حفظ الحالة الحالية
    this.doc.saveGraphicsState();

    // تطبيق الشفافية والدوران
    this.doc.setGState(new this.doc.GState({ opacity: 0.1 }));

    // رسم النص بشكل مائل
    this.doc.text(text, pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45
    });

    // استعادة الحالة
    this.doc.restoreGraphicsState();
  }

  /**
   * إضافة نص
   */
  addText(
    text: string,
    x: number,
    y: number,
    options?: {
      fontSize?: number;
      fontStyle?: "normal" | "bold" | "italic";
      color?: string;
      align?: "left" | "center" | "right";
    }
  ) {
    if (options?.fontSize) this.doc.setFontSize(options.fontSize);
    if (options?.fontStyle) this.doc.setFont("helvetica", options.fontStyle);
    if (options?.color) this.doc.setTextColor(options.color);

    this.doc.text(text, x, y, { align: options?.align || "left" });

    // Reset to defaults
    this.doc.setTextColor(BRAND.colors.text.primary);
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "normal");
  }

  /**
   * إضافة جدول
   */
  addTable(
    headers: string[],
    rows: any[][],
    options?: {
      startY?: number;
      headerColor?: string;
      rowColor?: string;
      alternateRowColor?: string;
    }
  ) {
    autoTable(this.doc, {
      head: [headers],
      body: rows,
      startY: options?.startY || 60,
      margin: { left: this.margin, right: this.margin },
      styles: {
        font: "helvetica",
        fontSize: 10,
        textColor: BRAND.colors.text.primary,
        fillColor: options?.rowColor || BRAND.colors.neutral.surface
      },
      headStyles: {
        fillColor: options?.headerColor || BRAND.colors.primary.main,
        textColor: "#FFFFFF",
        fontStyle: "bold",
        halign: "center"
      },
      alternateRowStyles: {
        fillColor: options?.alternateRowColor || BRAND.colors.neutral.background
      },
      tableLineColor: BRAND.colors.neutral.border,
      tableLineWidth: 0.1
    });
  }

  /**
   * إضافة صفحة جديدة
   */
  addPage() {
    this.doc.addPage();

    if (this.options.includeHeaderFooter) {
      this.addHeader();
      this.addFooter();
    }

    if (this.options.includeWatermark) {
      this.addWatermark();
    }
  }

  /**
   * الحصول على كائن jsPDF
   */
  getDoc(): jsPDF {
    return this.doc;
  }

  /**
   * حفظ PDF
   */
  save() {
    this.doc.save(`${this.options.filename}.pdf`);
  }

  /**
   * الحصول على PDF كـ Blob
   */
  getBlob(): Blob {
    return this.doc.output("blob");
  }

  /**
   * الحصول على PDF كـ Data URL
   */
  getDataURL(): string {
    return this.doc.output("dataurlstring");
  }

  /**
   * طباعة PDF
   */
  print() {
    this.doc.autoPrint();
    window.open(this.doc.output("bloburl"), "_blank");
  }
}

/**
 * دالة مساعدة لإنشاء PDF بسرعة
 */
export function createPDF(options: PDFOptions): PDFGenerator {
  return new PDFGenerator(options);
}
