/**
 * Zod Validation Schemas
 * PHASE 2: Comprehensive Input Validation
 *
 * Prevents:
 * - SQL Injection via invalid input
 * - Type confusion attacks
 * - Buffer overflow via long strings
 * - Business logic bypass via invalid ranges
 */

import { z } from 'zod';

// =====================================================
// Common Schemas
// =====================================================

export const idSchema = z.string()
  .min(1, 'ID is required')
  .max(100, 'ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format');

export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD required)');

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long');

export const phoneSchema = z.string()
  .regex(/^[\d\s+()-]+$/, 'Invalid phone format')
  .min(7, 'Phone too short')
  .max(20, 'Phone too long')
  .optional();

export const currencySchema = z.number()
  .min(0, 'Amount cannot be negative')
  .max(999999999, 'Amount too large')
  .finite('Amount must be finite');

export const percentageSchema = z.number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

// =====================================================
// Revenue Schemas
// =====================================================

export const createRevenueSchema = z.object({
  branchId: idSchema,
  date: dateSchema,
  cash: currencySchema.optional().default(0),
  network: currencySchema.optional().default(0),
  budget: currencySchema.optional().default(0),
  total: currencySchema,
  employees: z.array(z.object({
    employeeId: idSchema,
    name: z.string().min(1).max(200),
    amount: currencySchema
  })).optional()
});

export const updateRevenueSchema = z.object({
  id: idSchema,
  cash: currencySchema.optional(),
  network: currencySchema.optional(),
  budget: currencySchema.optional(),
  total: currencySchema.optional(),
  employees: z.array(z.object({
    employeeId: idSchema,
    name: z.string().min(1).max(200),
    amount: currencySchema
  })).optional()
});

export const deleteRevenueSchema = z.object({
  id: idSchema
});

// =====================================================
// Expense Schemas
// =====================================================

export const createExpenseSchema = z.object({
  branchId: idSchema,
  date: dateSchema,
  category: z.string()
    .min(1, 'Category is required')
    .max(100, 'Category too long'),
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title too long'),
  amount: currencySchema,
  description: z.string()
    .max(2000, 'Description too long')
    .optional(),
  receipt_url: z.string()
    .url('Invalid URL')
    .max(1000, 'URL too long')
    .optional()
});

export const updateExpenseSchema = z.object({
  id: idSchema,
  category: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(500).optional(),
  amount: currencySchema.optional(),
  description: z.string().max(2000).optional(),
  receipt_url: z.string().url().max(1000).optional()
});

export const deleteExpenseSchema = z.object({
  id: idSchema
});

// =====================================================
// Payroll Schemas
// =====================================================

export const calculatePayrollSchema = z.object({
  branchId: idSchema,
  month: z.string()
    .regex(/^(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)$/, 'Invalid month'),
  year: z.number()
    .int('Year must be integer')
    .min(2020, 'Year too old')
    .max(2100, 'Year too far in future')
});

export const savePayrollSchema = z.object({
  branchId: idSchema,
  month: z.string()
    .regex(/^(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)$/, 'Invalid month'),
  year: z.number()
    .int('Year must be integer')
    .min(2020, 'Year too old')
    .max(2100, 'Year too far in future'),
  employees: z.array(z.object({
    employeeId: idSchema,
    name: z.string().min(1).max(200),
    baseSalary: currencySchema,
    advances: currencySchema.optional().default(0),
    deductions: currencySchema.optional().default(0),
    bonus: currencySchema.optional().default(0),
    netSalary: currencySchema,
    notes: z.string().max(1000).optional()
  })).min(1, 'At least one employee required'),
  totalSalary: currencySchema,
  totalAdvances: currencySchema.optional().default(0),
  totalDeductions: currencySchema.optional().default(0),
  totalBonus: currencySchema.optional().default(0),
  netSalary: currencySchema
});

// =====================================================
// Bonus Schemas
// =====================================================

export const calculateBonusSchema = z.object({
  branchId: idSchema,
  month: z.string()
    .regex(/^(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)$/, 'Invalid month'),
  year: z.number()
    .int('Year must be integer')
    .min(2020, 'Year too old')
    .max(2100, 'Year too far in future'),
  revenueThreshold: currencySchema.optional(),
  bonusPercentage: percentageSchema.optional()
});

export const saveBonusSchema = z.object({
  branchId: idSchema,
  month: z.string()
    .regex(/^(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)$/, 'Invalid month'),
  year: z.number()
    .int('Year must be integer')
    .min(2020, 'Year too old')
    .max(2100, 'Year too far in future'),
  employees: z.array(z.object({
    employeeId: idSchema,
    name: z.string().min(1).max(200),
    bonusAmount: currencySchema,
    revenueContribution: currencySchema.optional(),
    notes: z.string().max(1000).optional()
  })).min(1, 'At least one employee required'),
  totalBonus: currencySchema,
  totalRevenue: currencySchema,
  bonusPercentage: percentageSchema
});

// =====================================================
// User Management Schemas
// =====================================================

export const createUserSchema = z.object({
  username: z.string()
    .min(3, 'Username too short')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore, and dash'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  roleId: idSchema,
  branchId: idSchema.optional(),
  fullName: z.string()
    .min(1, 'Full name is required')
    .max(200, 'Full name too long'),
  email: emailSchema.optional(),
  phone: phoneSchema
});

export const updateUserSchema = z.object({
  id: idSchema,
  username: z.string()
    .min(3, 'Username too short')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore, and dash')
    .optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number')
    .optional(),
  roleId: idSchema.optional(),
  branchId: idSchema.optional(),
  fullName: z.string().min(1).max(200).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  isActive: z.boolean().optional()
});

export const loginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(50, 'Username too long'),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long')
});

// =====================================================
// AI Endpoint Schemas
// =====================================================

export const aiChatSchema = z.object({
  message: z.string()
    .min(1, 'Message is required')
    .max(4000, 'Message too long (max 4000 characters)'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(4000)
  })).max(50, 'Conversation history too long').optional()
});

export const aiAnalyzeSchema = z.object({
  branchId: idSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  analysisType: z.enum(['revenue', 'expenses', 'profit', 'comprehensive'])
    .optional()
    .default('comprehensive')
});

export const mcpChatSchema = z.object({
  message: z.string()
    .min(1, 'Message is required')
    .max(4000, 'Message too long'),
  branchId: idSchema.optional(),
  context: z.object({
    currentPage: z.string().max(200).optional(),
    selectedDate: dateSchema.optional(),
    selectedMonth: z.string().max(50).optional()
  }).optional()
});

// =====================================================
// Email Schemas
// =====================================================

export const sendEmailSchema = z.object({
  to: z.union([
    emailSchema,
    z.array(emailSchema).min(1, 'At least one recipient required').max(50, 'Too many recipients')
  ]),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(500, 'Subject too long'),
  html: z.string()
    .min(1, 'Email body is required')
    .max(100000, 'Email body too long'),
  cc: z.union([
    emailSchema,
    z.array(emailSchema).max(50, 'Too many CC recipients')
  ]).optional(),
  bcc: z.union([
    emailSchema,
    z.array(emailSchema).max(50, 'Too many BCC recipients')
  ]).optional()
});

// =====================================================
// MCP Database Query Schema
// =====================================================

export const mcpD1QuerySchema = z.object({
  query: z.string()
    .min(1, 'Query is required')
    .max(10000, 'Query too long')
    // Prevent dangerous operations
    .refine(
      (q) => !q.toLowerCase().includes('drop table'),
      'DROP TABLE is not allowed'
    )
    .refine(
      (q) => !q.toLowerCase().includes('drop database'),
      'DROP DATABASE is not allowed'
    )
    .refine(
      (q) => !q.toLowerCase().includes('truncate'),
      'TRUNCATE is not allowed'
    ),
  params: z.array(z.union([
    z.string().max(1000),
    z.number(),
    z.boolean(),
    z.null()
  ])).max(100, 'Too many parameters').optional()
});

// =====================================================
// Branch Schemas
// =====================================================

export const createBranchSchema = z.object({
  name: z.string()
    .min(1, 'Branch name is required')
    .max(200, 'Branch name too long'),
  address: z.string()
    .max(500, 'Address too long')
    .optional(),
  phone: phoneSchema,
  isActive: z.boolean().optional().default(true)
});

export const updateBranchSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).optional(),
  phone: phoneSchema,
  isActive: z.boolean().optional()
});

// =====================================================
// Employee Schemas
// =====================================================

export const createEmployeeSchema = z.object({
  branchId: idSchema,
  name: z.string()
    .min(1, 'Employee name is required')
    .max(200, 'Employee name too long'),
  position: z.string()
    .min(1, 'Position is required')
    .max(200, 'Position too long'),
  salary: currencySchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  hireDate: dateSchema,
  isActive: z.boolean().optional().default(true)
});

export const updateEmployeeSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200).optional(),
  position: z.string().min(1).max(200).optional(),
  salary: currencySchema.optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  isActive: z.boolean().optional()
});

// =====================================================
// Validation Helper Function
// =====================================================

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`
      };
    }
    return {
      success: false,
      error: 'Validation failed'
    };
  }
}

// =====================================================
// Validation Middleware
// =====================================================

export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (data: unknown): Promise<{ validated: T } | Response> => {
    const result = validateInput(schema, data);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'خطأ في البيانات المدخلة',
          details: result.error
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return { validated: result.data };
  };
}
