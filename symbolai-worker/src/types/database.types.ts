/**
 * Database and Data Model Types
 * Core data structures for the financial system
 */

/**
 * Branch entity
 */
export interface Branch {
  id: string;
  name: string;
  location?: string;
  isActive: boolean;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Employee entity
 */
export interface Employee {
  id: string;
  name: string;
  position: string;
  branchId: string;
  salary: number;
  hireDate: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Expense entity
 */
export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  branchId: string;
  createdBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  attachments?: string[];
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Revenue entity
 */
export interface Revenue {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  branchId: string;
  createdBy: string;
  source?: string;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Product Order entity
 */
export interface ProductOrder {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplier?: string;
  orderDate: string;
  deliveryDate?: string;
  branchId: string;
  status: 'pending' | 'ordered' | 'delivered' | 'cancelled';
  createdBy: string;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Payroll entry
 */
export interface Payroll {
  id: string;
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  month: string;
  year: number;
  branchId: string;
  status: 'draft' | 'processed' | 'paid';
  processedBy?: string;
  processedAt?: number;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Employee Request
 */
export interface EmployeeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'leave' | 'advance' | 'bonus' | 'other';
  description: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  status: 'pending' | 'approved' | 'rejected';
  branchId: string;
  createdBy: string;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Financial summary by period
 */
export interface FinancialSummary {
  period: string;
  branchId?: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalPayroll: number;
  employeeCount: number;
  orderCount: number;
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalBranches: number;
  totalEmployees: number;
  totalRevenue: number;
  totalExpenses: number;
  pendingRequests: number;
  monthlyProfit: number;
  recentActivities: Activity[];
}

/**
 * Activity log entry
 */
export interface Activity {
  id: string;
  type: 'expense' | 'revenue' | 'payroll' | 'order' | 'request' | 'user';
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected';
  description: string;
  userId: string;
  username: string;
  branchId?: string;
  timestamp: number;
}

/**
 * Query filters
 */
export interface QueryFilters {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}
