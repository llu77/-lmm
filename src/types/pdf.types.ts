/**
 * PDF Export Type Definitions
 * Centralized types for PDF generation functionality
 */

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

export type PDFOutputMode = 'download' | 'print';

export interface PDFGeneratorOptions<T> {
  data: T;
  branchName: string;
  config?: Partial<PDFConfig>;
  mode: PDFOutputMode;
  dateRange?: { start: Date; end: Date };
}

export interface DateRange {
  start: Date;
  end: Date;
}
