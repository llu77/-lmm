/**
 * نظام تصدير PDF محسّن مع معالجة أخطاء متقدمة
 * - خط Cairo العربي من Google Fonts
 * - معالجة آمنة للأخطاء مع fallbacks
 * - تحميل صور محسّن
 * - تنسيق عربي محسّن
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// ================== Types ==================

export interface RevenueData {
  date: Date;
  cash: number;
  network: number;
  budget: number;
  total: number;
  calculatedTotal: number;
  isMatched: boolean;
}

export interface ExpenseData {
  date: Date;
  amount: number;
  category: string;
  description: string;
}

export interface ProductOrderData {
  _id: string;
  orderName?: string;
  products: Array<{
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  grandTotal: number;
  status: string;
  employeeName: string;
  branchName: string;
  notes?: string;
  _creationTime: number;
}

export interface PayrollData {
  branchName: string;
  supervisorName?: string;
  month: number;
  year: number;
  employees: Array<{
    employeeName: string;
    nationalId?: string;
    baseSalary: number;
    supervisorAllowance: number;
    incentives: number;
    totalAdvances: number;
    totalDeductions: number;
    netSalary: number;
  }>;
  totalNetSalary: number;
  generatedAt: number;
}

export interface PDFConfig {
  companyName?: string;
  companyLogo?: string;
  stampImage?: string;
  supervisorName?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

// ================== Constants ==================

const DEFAULT_CONFIG: Required<PDFConfig> = {
  companyName: 'النظام المالي',
  companyLogo: 'https://cdn.hercules.app/file_2EDW4ulZlmwarzzXHgYjO1Hv',
  stampImage: 'https://cdn.hercules.app/file_KxtpKU0KZ8CJ5zEVgJRzSTOG',
  supervisorName: '',
  colors: {
    primary: '#64B5F6',
    secondary: '#90CAF9',
    accent: '#E3F2FD',
  },
};

const SUPERVISOR_MAP: Record<string, string> = {
  '1010': 'عبدالهاي جلال',
  'لبن': 'عبدالهاي جلال',
  '2020': 'محمد إسماعيل',
  'طويق': 'محمد إسماعيل',
};

// ================== Utilities ==================

/**
 * تنسيق التاريخ بالعربية مع معالجة آمنة
 */
function formatArabicDate(date: Date): string {
  try {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Date formatting error:', error);
    return format(new Date(), 'dd/MM/yyyy');
  }
}

/**
 * تنسيق الأرقام بالفواصل
 */
function formatNumber(num: number): string {
  try {
    if (typeof num !== 'number' || isNaN(num)) {
      return '0.00';
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch (error) {
    console.error('Number formatting error:', error);
    return num.toFixed(2);
  }
}

/**
 * استخراج اسم المشرف من اسم الفرع
 */
function getSupervisorName(branchName: string): string {
  for (const [key, supervisor] of Object.entries(SUPERVISOR_MAP)) {
    if (branchName.includes(key)) {
      return supervisor;
    }
  }
  return '';
}

/**
 * تحميل صورة وتحويلها لـ base64 بشكل آمن
 */
async function loadImage(url: string): Promise<string> {
  // إذا كانت base64 بالفعل
  if (url.startsWith('data:image')) {
    return url;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Image load error (${url}):`, error);
    return ''; // fallback - لا صورة
  }
}

/**
 * تحميل خط Cairo العربي من Google Fonts
 */
async function loadCairoFont(): Promise<string> {
  try {
    // خط Cairo Regular من Google Fonts
    const fontUrl =
      'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpcWmhzfH5lkSs2SgRjCAGMQ1z0hGA-W1ToLQ-HmkA.ttf';

    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error('Font fetch failed');

    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    return base64;
  } catch (error) {
    console.error('Cairo font loading error:', error);
    return ''; // سيستخدم Helvetica الافتراضي
  }
}

/**
 * إعداد jsPDF مع الخط العربي
 */
async function setupPDF(
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  try {
    // محاولة تحميل وإضافة خط Cairo
    const cairoFont = await loadCairoFont();
    if (cairoFont) {
      doc.addFileToVFS('Cairo-Regular.ttf', cairoFont);
      doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
      doc.setFont('Cairo');
    } else {
      // fallback to Helvetica
      doc.setFont('Helvetica');
    }
  } catch (error) {
    console.warn('Using Helvetica font due to error:', error);
    doc.setFont('Helvetica');
  }

  return doc;
}

/**
 * رسم تدرج أزرق (محاكاة)
 */
function drawBlueGradient(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const steps = 20;
  const stepHeight = height / steps;

  // من أزرق داكن إلى أزرق فاتح
  for (let i = 0; i < steps; i++) {
    const ratio = i / steps;
    const r = Math.round(33 + (100 - 33) * ratio);
    const g = Math.round(150 + (181 - 150) * ratio);
    const b = Math.round(243 + (246 - 243) * ratio);

    doc.setFillColor(r, g, b);
    doc.rect(x, y + i * stepHeight, width, stepHeight, 'F');
  }
}

/**
 * إضافة هيدر للصفحة
 */
async function addHeader(
  doc: jsPDF,
  title: string,
  config: Required<PDFConfig>,
  branchName: string,
  dateRange?: { start: Date; end: Date }
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // تدرج الهيدر
  drawBlueGradient(doc, 0, 0, pageWidth, 50);

  // الشعار
  if (config.companyLogo) {
    try {
      const logo = await loadImage(config.companyLogo);
      if (logo) {
        doc.addImage(logo, 'PNG', pageWidth / 2 - 15, yPos, 30, 30);
        yPos += 35;
      } else {
        yPos += 10;
      }
    } catch (error) {
      console.warn('Logo loading failed:', error);
      yPos += 10;
    }
  }

  // عنوان التقرير
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // خط فاصل
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(3);
  doc.line(pageWidth / 2 - 30, yPos, pageWidth / 2 + 30, yPos);

  // معلومات الفرع (صندوق أبيض)
  yPos = 60;
  const boxX = 15;
  const boxWidth = pageWidth - 30;
  const boxHeight = 22;

  // صندوق أبيض مع إطار أزرق
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(100, 181, 246);
  doc.setLineWidth(1.5);
  doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 4, 4, 'FD');

  // النصوص داخل الصندوق
  yPos += 8;

  // اسم الفرع
  doc.setFontSize(14);
  doc.setTextColor(13, 71, 161);
  doc.text(`الفرع: ${branchName}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  // اسم المشرف
  const supervisor = config.supervisorName || getSupervisorName(branchName);
  if (supervisor) {
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text(`المشرف: ${supervisor}`, pageWidth / 2, yPos, {
      align: 'center',
    });
  }

  // الفترة الزمنية
  if (dateRange) {
    yPos += 10;
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    const startDate = formatArabicDate(dateRange.start);
    const endDate = formatArabicDate(dateRange.end);
    doc.text(`الفترة: من ${startDate} إلى ${endDate}`, pageWidth / 2, yPos, {
      align: 'center',
    });
  }
}

/**
 * إضافة ختم وكلمة "معتمد"
 */
async function addStampWithApproval(
  doc: jsPDF,
  config: Required<PDFConfig>
): Promise<void> {
  if (!config.stampImage) return;

  try {
    const stamp = await loadImage(config.stampImage);
    if (!stamp) return;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // الختم في الأسفل (مركز)
    const stampSize = 35;
    const stampX = pageWidth / 2 - stampSize / 2;
    const stampY = pageHeight - 80;

    doc.addImage(stamp, 'PNG', stampX, stampY, stampSize, stampSize);

    // كلمة "معتمد" أسفل الختم
    doc.setFontSize(16);
    doc.setTextColor(33, 150, 243);
    doc.text('معتمد', pageWidth / 2, stampY + stampSize + 8, {
      align: 'center',
    });
  } catch (error) {
    console.warn('Stamp loading failed:', error);
  }
}

/**
 * إضافة تذييل للصفحة
 */
function addFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number
): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  const dateTime = format(now, 'dd/MM/yyyy HH:mm');

  // خط متدرج
  const steps = 20;
  const stepWidth = pageWidth / steps;
  for (let i = 0; i < steps; i++) {
    const ratio = i / steps;
    const r = Math.round(144 + (187 - 144) * ratio);
    const g = Math.round(202 + (222 - 202) * ratio);
    const b = Math.round(249 + (251 - 249) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(i * stepWidth, pageHeight - 15, stepWidth, 1, 'F');
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  // تاريخ الإنشاء - يسار
  doc.text(`تاريخ الإنشاء: ${dateTime}`, 20, pageHeight - 8);

  // رقم الصفحة - يمين
  doc.text(`صفحة ${pageNum} / ${totalPages}`, pageWidth - 20, pageHeight - 8, {
    align: 'right',
  });
}

// ================== Revenue PDF ==================

/**
 * تصدير تقرير الإيرادات
 */
export async function generateRevenuesPDF(
  data: RevenueData[],
  branchName: string,
  startDate: Date,
  endDate: Date,
  config: Partial<PDFConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // إنشاء PDF
    const doc = await setupPDF('portrait');

    // إضافة الهيدر
    await addHeader(doc, 'تقرير الإيرادات', fullConfig, branchName, {
      start: startDate,
      end: endDate,
    });

    // إعداد البيانات للجدول
    const tableData = data.map((row) => [
      formatArabicDate(row.date),
      formatNumber(row.cash),
      formatNumber(row.network),
      formatNumber(row.budget),
      formatNumber(row.total),
      row.isMatched ? 'متطابق ✓' : 'غير متطابق ✗',
    ]);

    // حساب الإجماليات
    const totals = data.reduce(
      (acc, row) => ({
        cash: acc.cash + row.cash,
        network: acc.network + row.network,
        budget: acc.budget + row.budget,
        total: acc.total + row.total,
      }),
      { cash: 0, network: 0, budget: 0, total: 0 }
    );

    // إنشاء الجدول
    autoTable(doc, {
      head: [['التاريخ', 'كاش', 'شبكة', 'موازنة', 'الإجمالي', 'الحالة']],
      body: tableData,
      startY: 95,
      theme: 'grid',
      styles: {
        font: 'Cairo',
        fontSize: 11,
        cellPadding: 5,
        halign: 'center',
        valign: 'middle',
        lineColor: [144, 202, 249],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [100, 181, 246],
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [33, 150, 243],
        lineWidth: 1,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 },
        1: { halign: 'right', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 35 },
      },
      didParseCell: (hookData) => {
        // تلوين الحالة
        if (
          hookData.column.index === 5 &&
          hookData.section === 'body'
        ) {
          const cellText = hookData.cell.text[0];
          if (cellText.includes('متطابق')) {
            hookData.cell.styles.textColor = [16, 185, 129]; // أخضر
          } else {
            hookData.cell.styles.textColor = [239, 68, 68]; // أحمر
          }
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // صندوق الإجماليات
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    const boxX = 15;
    const boxWidth = doc.internal.pageSize.getWidth() - 30;
    const boxHeight = 25;

    // تدرج أزرق
    drawBlueGradient(doc, boxX, finalY, boxWidth, boxHeight);

    // إطار
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1.5);
    doc.roundedRect(boxX, finalY, boxWidth, boxHeight, 4, 4, 'D');

    // النصوص
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `إجمالي الكاش: ${formatNumber(totals.cash)} ريال`,
      boxX + 10,
      finalY + 8
    );
    doc.text(
      `إجمالي الشبكة: ${formatNumber(totals.network)} ريال`,
      boxX + 10,
      finalY + 15
    );
    doc.text(
      `المجموع الكلي: ${formatNumber(totals.total)} ريال`,
      boxX + 10,
      finalY + 22
    );

    // إضافة الختم
    await addStampWithApproval(doc, fullConfig);

    // إضافة التذييل
    const totalPages = (doc.internal as { pages: unknown[] }).pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, i, totalPages);
    }

    // حفظ PDF
    const fileName = `تقرير_الإيرادات_${branchName}_${format(startDate, 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(
      'فشل في إنشاء تقرير الإيرادات. يرجى المحاولة مرة أخرى.'
    );
  }
}

/**
 * طباعة تقرير الإيرادات
 */
export async function printRevenuesPDF(
  data: RevenueData[],
  branchName: string,
  startDate: Date,
  endDate: Date,
  config: Partial<PDFConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const doc = await setupPDF('portrait');
    await addHeader(doc, 'تقرير الإيرادات', fullConfig, branchName, {
      start: startDate,
      end: endDate,
    });

    const tableData = data.map((row) => [
      formatArabicDate(row.date),
      formatNumber(row.cash),
      formatNumber(row.network),
      formatNumber(row.budget),
      formatNumber(row.total),
      row.isMatched ? 'متطابق ✓' : 'غير متطابق ✗',
    ]);

    const totals = data.reduce(
      (acc, row) => ({
        cash: acc.cash + row.cash,
        network: acc.network + row.network,
        budget: acc.budget + row.budget,
        total: acc.total + row.total,
      }),
      { cash: 0, network: 0, budget: 0, total: 0 }
    );

    autoTable(doc, {
      head: [['التاريخ', 'كاش', 'شبكة', 'موازنة', 'الإجمالي', 'الحالة']],
      body: tableData,
      startY: 95,
      theme: 'grid',
      styles: {
        font: 'Cairo',
        fontSize: 11,
        cellPadding: 5,
        halign: 'center',
        valign: 'middle',
        lineColor: [144, 202, 249],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [100, 181, 246],
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [33, 150, 243],
        lineWidth: 1,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 },
        1: { halign: 'right', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 35 },
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 5 && hookData.section === 'body') {
          const cellText = hookData.cell.text[0];
          if (cellText.includes('متطابق')) {
            hookData.cell.styles.textColor = [16, 185, 129];
          } else {
            hookData.cell.styles.textColor = [239, 68, 68];
          }
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    const boxX = 15;
    const boxWidth = doc.internal.pageSize.getWidth() - 30;
    const boxHeight = 25;

    drawBlueGradient(doc, boxX, finalY, boxWidth, boxHeight);
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1.5);
    doc.roundedRect(boxX, finalY, boxWidth, boxHeight, 4, 4, 'D');

    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `إجمالي الكاش: ${formatNumber(totals.cash)} ريال`,
      boxX + 10,
      finalY + 8
    );
    doc.text(
      `إجمالي الشبكة: ${formatNumber(totals.network)} ريال`,
      boxX + 10,
      finalY + 15
    );
    doc.text(
      `المجموع الكلي: ${formatNumber(totals.total)} ريال`,
      boxX + 10,
      finalY + 22
    );

    await addStampWithApproval(doc, fullConfig);

    const totalPages = (doc.internal as { pages: unknown[] }).pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, i, totalPages);
    }

    // طباعة
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } catch (error) {
    console.error('Print error:', error);
    throw new Error(
      'فشل في طباعة تقرير الإيرادات. يرجى المحاولة مرة أخرى.'
    );
  }
}

// ================== Expenses PDF ==================

export async function generateExpensesPDF(
  data: ExpenseData[],
  branchName: string,
  config: Partial<PDFConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const doc = await setupPDF('portrait');
    await addHeader(doc, 'تقرير المصروفات', fullConfig, branchName);

    const tableData = data.map((row) => [
      formatArabicDate(row.date),
      row.category,
      formatNumber(row.amount),
      row.description || '-',
    ]);

    const total = data.reduce((acc, row) => acc + row.amount, 0);

    autoTable(doc, {
      head: [['التاريخ', 'التصنيف', 'المبلغ (ريال)', 'الوصف']],
      body: tableData,
      startY: 95,
      theme: 'grid',
      styles: {
        font: 'Cairo',
        fontSize: 11,
        cellPadding: 5,
        halign: 'center',
        valign: 'middle',
        lineColor: [144, 202, 249],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [100, 181, 246],
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [33, 150, 243],
        lineWidth: 1,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 },
        1: { halign: 'center', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        3: { halign: 'right', cellWidth: 'auto' },
      },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    const boxX = 15;
    const boxWidth = doc.internal.pageSize.getWidth() - 30;
    const boxHeight = 20;

    drawBlueGradient(doc, boxX, finalY, boxWidth, boxHeight);
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1.5);
    doc.roundedRect(boxX, finalY, boxWidth, boxHeight, 4, 4, 'D');

    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `إجمالي المصروفات: ${formatNumber(total)} ريال`,
      boxX + 10,
      finalY + 8
    );
    doc.text(`عدد العمليات: ${data.length}`, boxX + 10, finalY + 15);

    await addStampWithApproval(doc, fullConfig);

    const totalPages = (doc.internal as { pages: unknown[] }).pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, i, totalPages);
    }

    const fileName = `تقرير_المصروفات_${branchName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(
      'فشل في إنشاء تقرير المصروفات. يرجى المحاولة مرة أخرى.'
    );
  }
}

export async function printExpensesPDF(
  data: ExpenseData[],
  branchName: string,
  config: Partial<PDFConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const doc = await setupPDF('portrait');
    await addHeader(doc, 'تقرير المصروفات', fullConfig, branchName);

    const tableData = data.map((row) => [
      formatArabicDate(row.date),
      row.category,
      formatNumber(row.amount),
      row.description || '-',
    ]);

    const total = data.reduce((acc, row) => acc + row.amount, 0);

    autoTable(doc, {
      head: [['التاريخ', 'التصنيف', 'المبلغ (ريال)', 'الوصف']],
      body: tableData,
      startY: 95,
      theme: 'grid',
      styles: {
        font: 'Cairo',
        fontSize: 11,
        cellPadding: 5,
        halign: 'center',
        valign: 'middle',
        lineColor: [144, 202, 249],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [100, 181, 246],
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [33, 150, 243],
        lineWidth: 1,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 },
        1: { halign: 'center', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        3: { halign: 'right', cellWidth: 'auto' },
      },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    const boxX = 15;
    const boxWidth = doc.internal.pageSize.getWidth() - 30;
    const boxHeight = 20;

    drawBlueGradient(doc, boxX, finalY, boxWidth, boxHeight);
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1.5);
    doc.roundedRect(boxX, finalY, boxWidth, boxHeight, 4, 4, 'D');

    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `إجمالي المصروفات: ${formatNumber(total)} ريال`,
      boxX + 10,
      finalY + 8
    );
    doc.text(`عدد العمليات: ${data.length}`, boxX + 10, finalY + 15);

    await addStampWithApproval(doc, fullConfig);

    const totalPages = (doc.internal as { pages: unknown[] }).pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, i, totalPages);
    }

    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } catch (error) {
    console.error('Print error:', error);
    throw new Error(
      'فشل في طباعة تقرير المصروفات. يرجى المحاولة مرة أخرى.'
    );
  }
}

// ================== Product Orders PDF ==================

/**
 * تصدير فاتورة طلب منتجات
 */
export async function generateProductOrderPDF(
  order: ProductOrderData,
  config: Partial<PDFConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const doc = await setupPDF('portrait');

    // Header
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Logo
    if (fullConfig.companyLogo) {
      try {
        const logo = await loadImage(fullConfig.companyLogo);
        if (logo) {
          doc.addImage(logo, 'PNG', pageWidth / 2 - 15, yPos, 30, 15);
          yPos += 20;
        }
      } catch (error) {
        console.warn('Logo loading failed:', error);
        yPos += 5;
      }
    }

    // Title
    doc.setFontSize(20);
    doc.setTextColor(100, 181, 246);
    doc.text('فاتورة طلب منتجات', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Order Info Box
    const infoBoxY = yPos;
    const infoBoxHeight = 35;
    drawBlueGradient(doc, 15, infoBoxY, pageWidth - 30, infoBoxHeight);
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1);
    doc.roundedRect(15, infoBoxY, pageWidth - 30, infoBoxHeight, 3, 3, 'D');

    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    
    const orderDate = new Date(order._creationTime);
    const orderNumber = order._id.slice(-8).toUpperCase();
    
    doc.text(`رقم الطلب: ${orderNumber}`, 25, infoBoxY + 8);
    doc.text(`التاريخ: ${formatArabicDate(orderDate)}`, 25, infoBoxY + 15);
    doc.text(`الفرع: ${order.branchName}`, 25, infoBoxY + 22);
    doc.text(`الموظف: ${order.employeeName}`, 25, infoBoxY + 29);

    // Status Badge
    const statusText = order.status === 'pending' ? 'قيد الانتظار' 
      : order.status === 'approved' ? 'معتمد'
      : order.status === 'rejected' ? 'مرفوض'
      : order.status === 'completed' ? 'مكتمل'
      : order.status;
      
    const statusColor: [number, number, number] = order.status === 'approved' ? [34, 197, 94]
      : order.status === 'rejected' ? [239, 68, 68]
      : order.status === 'completed' ? [59, 130, 246]
      : [234, 179, 8];

    doc.setFillColor(...statusColor);
    doc.roundedRect(pageWidth - 55, infoBoxY + 8, 35, 8, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(statusText, pageWidth - 37.5, infoBoxY + 13, { align: 'center' });

    yPos = infoBoxY + infoBoxHeight + 10;

    // Products Table
    const tableData = order.products.map((product) => [
      product.productName,
      product.quantity.toString(),
      formatNumber(product.price),
      formatNumber(product.total),
    ]);

    autoTable(doc, {
      head: [['المنتج', 'الكمية', 'السعر', 'الإجمالي']],
      body: tableData,
      startY: yPos,
      styles: {
        font: 'Cairo',
        fontSize: 10,
        cellPadding: 4,
        halign: 'center',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [100, 181, 246],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'right', cellWidth: 80 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
      },
    });

    // Grand Total Box
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    const totalBoxHeight = 15;
    
    drawBlueGradient(doc, 15, finalY, pageWidth - 30, totalBoxHeight);
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1.5);
    doc.roundedRect(15, finalY, pageWidth - 30, totalBoxHeight, 4, 4, 'D');

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `الإجمالي الكلي: ${formatNumber(order.grandTotal)} ريال`,
      pageWidth / 2,
      finalY + 10,
      { align: 'center' }
    );

    // Notes Section
    if (order.notes) {
      const notesY = finalY + totalBoxHeight + 10;
      doc.setFontSize(11);
      doc.setTextColor(66, 66, 66);
      doc.text('ملاحظات:', 20, notesY);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const notesLines = doc.splitTextToSize(order.notes, pageWidth - 40);
      doc.text(notesLines, 20, notesY + 7);
    }

    // Stamp
    await addStampWithApproval(doc, fullConfig);

    // Footer
    const totalPages = (doc.internal as { pages: unknown[] }).pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, i, totalPages);
    }

    // Save PDF
    const fileName = `order_${orderNumber}_${format(orderDate, 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('فشل في إنشاء فاتورة الطلب. يرجى المحاولة مرة أخرى.');
  }
}

/**
 * طباعة فاتورة طلب منتجات
 */
export async function printProductOrderPDF(
  order: ProductOrderData,
  config: Partial<PDFConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const doc = await setupPDF('portrait');

    // Header
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Logo
    if (fullConfig.companyLogo) {
      try {
        const logo = await loadImage(fullConfig.companyLogo);
        if (logo) {
          doc.addImage(logo, 'PNG', pageWidth / 2 - 15, yPos, 30, 15);
          yPos += 20;
        }
      } catch (error) {
        console.warn('Logo loading failed:', error);
        yPos += 5;
      }
    }

    // Title
    doc.setFontSize(20);
    doc.setTextColor(100, 181, 246);
    doc.text('فاتورة طلب منتجات', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Order Info Box
    const infoBoxY = yPos;
    const infoBoxHeight = 35;
    drawBlueGradient(doc, 15, infoBoxY, pageWidth - 30, infoBoxHeight);
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1);
    doc.roundedRect(15, infoBoxY, pageWidth - 30, infoBoxHeight, 3, 3, 'D');

    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    
    const orderDate = new Date(order._creationTime);
    const orderNumber = order._id.slice(-8).toUpperCase();
    
    doc.text(`رقم الطلب: ${orderNumber}`, 25, infoBoxY + 8);
    doc.text(`التاريخ: ${formatArabicDate(orderDate)}`, 25, infoBoxY + 15);
    doc.text(`الفرع: ${order.branchName}`, 25, infoBoxY + 22);
    doc.text(`الموظف: ${order.employeeName}`, 25, infoBoxY + 29);

    // Status Badge
    const statusText = order.status === 'pending' ? 'قيد الانتظار' 
      : order.status === 'approved' ? 'معتمد'
      : order.status === 'rejected' ? 'مرفوض'
      : order.status === 'completed' ? 'مكتمل'
      : order.status;
      
    const statusColor: [number, number, number] = order.status === 'approved' ? [34, 197, 94]
      : order.status === 'rejected' ? [239, 68, 68]
      : order.status === 'completed' ? [59, 130, 246]
      : [234, 179, 8];

    doc.setFillColor(...statusColor);
    doc.roundedRect(pageWidth - 55, infoBoxY + 8, 35, 8, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(statusText, pageWidth - 37.5, infoBoxY + 13, { align: 'center' });

    yPos = infoBoxY + infoBoxHeight + 10;

    // Products Table
    const tableData = order.products.map((product) => [
      product.productName,
      product.quantity.toString(),
      formatNumber(product.price),
      formatNumber(product.total),
    ]);

    autoTable(doc, {
      head: [['المنتج', 'الكمية', 'السعر', 'الإجمالي']],
      body: tableData,
      startY: yPos,
      styles: {
        font: 'Cairo',
        fontSize: 10,
        cellPadding: 4,
        halign: 'center',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [100, 181, 246],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'right', cellWidth: 80 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
      },
    });

    // Grand Total Box
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    const totalBoxHeight = 15;
    
    drawBlueGradient(doc, 15, finalY, pageWidth - 30, totalBoxHeight);
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1.5);
    doc.roundedRect(15, finalY, pageWidth - 30, totalBoxHeight, 4, 4, 'D');

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `الإجمالي الكلي: ${formatNumber(order.grandTotal)} ريال`,
      pageWidth / 2,
      finalY + 10,
      { align: 'center' }
    );

    // Notes Section
    if (order.notes) {
      const notesY = finalY + totalBoxHeight + 10;
      doc.setFontSize(11);
      doc.setTextColor(66, 66, 66);
      doc.text('ملاحظات:', 20, notesY);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const notesLines = doc.splitTextToSize(order.notes, pageWidth - 40);
      doc.text(notesLines, 20, notesY + 7);
    }

    // Stamp
    await addStampWithApproval(doc, fullConfig);

    // Footer
    const totalPages = (doc.internal as { pages: unknown[] }).pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, i, totalPages);
    }

    // Print
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } catch (error) {
    console.error('Print error:', error);
    throw new Error('فشل في طباعة فاتورة الطلب. يرجى المحاولة مرة أخرى.');
  }
}

// ================== Payroll Functions ==================

/**
 * تصدير مسير الرواتب إلى PDF
 */
export async function generatePayrollPDF(
  payrollData: PayrollData,
  config: Partial<PDFConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Override supervisor name if provided in payroll data
  if (payrollData.supervisorName) {
    fullConfig.supervisorName = payrollData.supervisorName;
  } else if (SUPERVISOR_MAP[payrollData.branchName]) {
    fullConfig.supervisorName = SUPERVISOR_MAP[payrollData.branchName];
  }

  try {
    // إنشاء PDF
    const doc = await setupPDF('landscape'); // استخدام landscape لعرض أفضل للأعمدة الكثيرة

    // الشهر بالعربية
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const monthName = arabicMonths[payrollData.month - 1];
    const title = `مسير رواتب - ${monthName} ${payrollData.year}`;

    // إضافة الهيدر
    await addHeader(doc, title, fullConfig, payrollData.branchName);

    // معلومات إضافية
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(10);
    doc.setTextColor(66, 66, 66);
    doc.text(
      `تاريخ الإنشاء: ${formatArabicDate(new Date(payrollData.generatedAt))}`,
      pageWidth - 20,
      85,
      { align: 'right' }
    );

    // إعداد البيانات للجدول
    const tableData = payrollData.employees.map((emp, index) => {
      const grossSalary = emp.baseSalary + emp.supervisorAllowance + emp.incentives;
      return [
        (index + 1).toString(), // الرقم
        emp.employeeName,
        emp.nationalId || '-',
        formatNumber(emp.baseSalary),
        formatNumber(emp.supervisorAllowance),
        formatNumber(emp.incentives),
        formatNumber(grossSalary),
        formatNumber(emp.totalAdvances),
        formatNumber(emp.totalDeductions),
        formatNumber(emp.netSalary),
      ];
    });

    // إنشاء الجدول
    autoTable(doc, {
      head: [[
        '#',
        'اسم الموظف',
        'رقم الهوية',
        'الراتب الأساسي',
        'بدل إشراف',
        'حوافز',
        'الإجمالي',
        'السلف',
        'الخصومات',
        'الصافي',
      ]],
      body: tableData,
      startY: 95,
      theme: 'grid',
      styles: {
        font: 'Cairo',
        fontSize: 9,
        cellPadding: 4,
        halign: 'center',
        valign: 'middle',
        lineColor: [144, 202, 249],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [100, 181, 246],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [33, 150, 243],
        lineWidth: 1,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' }, // #
        1: { cellWidth: 45, halign: 'right' }, // الاسم
        2: { cellWidth: 35, halign: 'center' }, // الهوية
        3: { cellWidth: 30, halign: 'right' }, // الراتب الأساسي
        4: { cellWidth: 25, halign: 'right' }, // بدل إشراف
        5: { cellWidth: 25, halign: 'right' }, // حوافز
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }, // الإجمالي
        7: { cellWidth: 25, halign: 'right' }, // السلف
        8: { cellWidth: 25, halign: 'right' }, // الخصومات
        9: { cellWidth: 35, halign: 'right', fontStyle: 'bold', fillColor: [227, 242, 253] }, // الصافي
      },
      didParseCell: (hookData) => {
        // تلوين عمود الصافي
        if (hookData.column.index === 9 && hookData.section === 'body') {
          hookData.cell.styles.textColor = [21, 101, 192]; // أزرق داكن
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // صندوق الإجمالي
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    const boxX = 15;
    const boxWidth = pageWidth - 30;
    const boxHeight = 20;

    // تدرج أزرق
    drawBlueGradient(doc, boxX, finalY, boxWidth, boxHeight);

    // إطار
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1.5);
    doc.roundedRect(boxX, finalY, boxWidth, boxHeight, 4, 4, 'D');

    // النصوص
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `إجمالي صافي الرواتب: ${formatNumber(payrollData.totalNetSalary)} ريال`,
      pageWidth / 2,
      finalY + 13,
      { align: 'center' }
    );

    // ملاحظة
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `عدد الموظفين: ${payrollData.employees.length} | الفرع: ${payrollData.branchName}`,
      pageWidth / 2,
      finalY + boxHeight + 8,
      { align: 'center' }
    );

    // إضافة الختم
    await addStampWithApproval(doc, fullConfig);

    // إضافة التذييل
    const totalPages = (doc.internal as { pages: unknown[] }).pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, i, totalPages);
    }

    // حفظ PDF
    const fileName = `مسير_رواتب_${payrollData.branchName}_${monthName}_${payrollData.year}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('فشل في إنشاء مسير الرواتب. يرجى المحاولة مرة أخرى.');
  }
}

/**
 * طباعة مسير الرواتب
 */
export async function printPayrollPDF(
  payrollData: PayrollData,
  config: Partial<PDFConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Override supervisor name if provided
  if (payrollData.supervisorName) {
    fullConfig.supervisorName = payrollData.supervisorName;
  } else if (SUPERVISOR_MAP[payrollData.branchName]) {
    fullConfig.supervisorName = SUPERVISOR_MAP[payrollData.branchName];
  }

  try {
    // إنشاء PDF
    const doc = await setupPDF('landscape');

    // الشهر بالعربية
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const monthName = arabicMonths[payrollData.month - 1];
    const title = `مسير رواتب - ${monthName} ${payrollData.year}`;

    // إضافة الهيدر
    await addHeader(doc, title, fullConfig, payrollData.branchName);

    // معلومات إضافية
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(10);
    doc.setTextColor(66, 66, 66);
    doc.text(
      `تاريخ الإنشاء: ${formatArabicDate(new Date(payrollData.generatedAt))}`,
      pageWidth - 20,
      85,
      { align: 'right' }
    );

    // إعداد البيانات للجدول
    const tableData = payrollData.employees.map((emp, index) => {
      const grossSalary = emp.baseSalary + emp.supervisorAllowance + emp.incentives;
      return [
        (index + 1).toString(),
        emp.employeeName,
        emp.nationalId || '-',
        formatNumber(emp.baseSalary),
        formatNumber(emp.supervisorAllowance),
        formatNumber(emp.incentives),
        formatNumber(grossSalary),
        formatNumber(emp.totalAdvances),
        formatNumber(emp.totalDeductions),
        formatNumber(emp.netSalary),
      ];
    });

    // إنشاء الجدول
    autoTable(doc, {
      head: [[
        '#',
        'اسم الموظف',
        'رقم الهوية',
        'الراتب الأساسي',
        'بدل إشراف',
        'حوافز',
        'الإجمالي',
        'السلف',
        'الخصومات',
        'الصافي',
      ]],
      body: tableData,
      startY: 95,
      theme: 'grid',
      styles: {
        font: 'Cairo',
        fontSize: 9,
        cellPadding: 4,
        halign: 'center',
        valign: 'middle',
        lineColor: [144, 202, 249],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [100, 181, 246],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [33, 150, 243],
        lineWidth: 1,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 45, halign: 'right' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 25, halign: 'right' },
        8: { cellWidth: 25, halign: 'right' },
        9: { cellWidth: 35, halign: 'right', fontStyle: 'bold', fillColor: [227, 242, 253] },
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 9 && hookData.section === 'body') {
          hookData.cell.styles.textColor = [21, 101, 192];
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // صندوق الإجمالي
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    const boxX = 15;
    const boxWidth = pageWidth - 30;
    const boxHeight = 20;

    drawBlueGradient(doc, boxX, finalY, boxWidth, boxHeight);

    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1.5);
    doc.roundedRect(boxX, finalY, boxWidth, boxHeight, 4, 4, 'D');

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `إجمالي صافي الرواتب: ${formatNumber(payrollData.totalNetSalary)} ريال`,
      pageWidth / 2,
      finalY + 13,
      { align: 'center' }
    );

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `عدد الموظفين: ${payrollData.employees.length} | الفرع: ${payrollData.branchName}`,
      pageWidth / 2,
      finalY + boxHeight + 8,
      { align: 'center' }
    );

    // إضافة الختم
    await addStampWithApproval(doc, fullConfig);

    // إضافة التذييل
    const totalPages = (doc.internal as { pages: unknown[] }).pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, i, totalPages);
    }

    // طباعة
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } catch (error) {
    console.error('Print error:', error);
    throw new Error('فشل في طباعة مسير الرواتب. يرجى المحاولة مرة أخرى.');
  }
}
