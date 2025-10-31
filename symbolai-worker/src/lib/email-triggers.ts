/**
 * SymbolAI Email Triggers
 * 14 Trigger Functions for Automatic Email Sending
 */

import { sendTemplateEmail, type Env } from './email';

// ============================================================================
// TRIGGER 1: Employee Request Created
// ============================================================================
export async function triggerEmployeeRequestCreated(
  env: Env,
  params: {
    requestId: string;
    employeeName: string;
    requestType: string;
    requestDate: string;
    requestDetails: string;
    branchId: string;
    userId?: string;
  }
): Promise<void> {
  try {
    const actionUrl = `https://symbolai.net/manage-requests`;

    await sendTemplateEmail(env, {
      to: env.ADMIN_EMAIL,
      templateId: 'employee_request_created',
      variables: {
        employeeName: params.employeeName,
        requestType: params.requestType,
        requestDate: params.requestDate,
        requestDetails: params.requestDetails,
        requestId: params.requestId.substring(0, 8),
        actionUrl
      },
      priority: 'high',
      triggerType: 'employee_request_created',
      userId: params.userId,
      relatedEntityId: params.requestId
    });

    console.log(`Email triggered: employee_request_created for ${params.employeeName}`);
  } catch (error) {
    console.error('Trigger employee request created error:', error);
  }
}

// ============================================================================
// TRIGGER 2: Employee Request Responded
// ============================================================================
export async function triggerEmployeeRequestResponded(
  env: Env,
  params: {
    requestId: string;
    employeeName: string;
    employeeEmail?: string;
    requestType: string;
    status: string; // 'approved' or 'rejected'
    adminResponse: string;
    responseDate: string;
    userId?: string;
  }
): Promise<void> {
  try {
    // For now, send to admin email until we add email field to users table
    const to = params.employeeEmail || env.ADMIN_EMAIL;

    const statusArabic = params.status === 'approved' ? 'الموافقة على' : 'رفض';
    const statusEmoji = params.status === 'approved' ? '✅' : '❌';
    const statusBadgeClass = params.status === 'approved' ? 'status-approved' : 'status-rejected';

    await sendTemplateEmail(env, {
      to,
      templateId: 'employee_request_responded',
      variables: {
        employeeName: params.employeeName,
        requestType: params.requestType,
        status: statusArabic,
        statusEmoji,
        statusBadgeClass,
        adminResponse: params.adminResponse,
        responseDate: params.responseDate
      },
      priority: 'high',
      triggerType: 'employee_request_responded',
      userId: params.userId,
      relatedEntityId: params.requestId
    });

    console.log(`Email triggered: employee_request_responded for ${params.employeeName}`);
  } catch (error) {
    console.error('Trigger employee request responded error:', error);
  }
}

// ============================================================================
// TRIGGER 3: Product Order Pending
// ============================================================================
export async function triggerProductOrderPending(
  env: Env,
  params: {
    orderId: string;
    employeeName: string;
    orderDate: string;
    products: Array<{ name: string; quantity: number; price: number }>;
    grandTotal: number;
    branchId: string;
    userId?: string;
  }
): Promise<void> {
  try {
    const actionUrl = `https://symbolai.net/product-orders`;

    // Format products list
    const productsList = params.products
      .map(
        (p, i) =>
          `<div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${i + 1}.</strong> ${p.name} -
            الكمية: ${p.quantity} -
            السعر: ${p.price.toFixed(2)} ج.م -
            الإجمالي: ${(p.quantity * p.price).toFixed(2)} ج.م
          </div>`
      )
      .join('');

    await sendTemplateEmail(env, {
      to: env.ADMIN_EMAIL,
      templateId: 'product_order_pending',
      variables: {
        employeeName: params.employeeName,
        orderId: params.orderId.substring(0, 8),
        orderDate: params.orderDate,
        productsCount: params.products.length.toString(),
        orderTotal: `${params.grandTotal.toFixed(2)} ج.م`,
        productsList,
        actionUrl
      },
      priority: 'medium',
      triggerType: 'product_order_pending',
      userId: params.userId,
      relatedEntityId: params.orderId
    });

    console.log(`Email triggered: product_order_pending for order ${params.orderId}`);
  } catch (error) {
    console.error('Trigger product order pending error:', error);
  }
}

// ============================================================================
// TRIGGER 4: Product Order Approved
// ============================================================================
export async function triggerProductOrderApproved(
  env: Env,
  params: {
    orderId: string;
    employeeName: string;
    employeeEmail?: string;
    grandTotal: number;
    approvedBy: string;
    userId?: string;
  }
): Promise<void> {
  try {
    const to = params.employeeEmail || env.ADMIN_EMAIL;
    const actionUrl = `https://symbolai.net/product-orders`;

    await sendTemplateEmail(env, {
      to,
      templateId: 'product_order_approved',
      variables: {
        employeeName: params.employeeName,
        orderId: params.orderId.substring(0, 8),
        orderTotal: `${params.grandTotal.toFixed(2)} ج.م`,
        approvedBy: params.approvedBy,
        actionUrl
      },
      priority: 'medium',
      triggerType: 'product_order_approved',
      userId: params.userId,
      relatedEntityId: params.orderId
    });

    console.log(`Email triggered: product_order_approved for order ${params.orderId}`);
  } catch (error) {
    console.error('Trigger product order approved error:', error);
  }
}

// ============================================================================
// TRIGGER 5: Product Order Rejected
// ============================================================================
export async function triggerProductOrderRejected(
  env: Env,
  params: {
    orderId: string;
    employeeName: string;
    employeeEmail?: string;
    rejectionReason: string;
    userId?: string;
  }
): Promise<void> {
  try {
    const to = params.employeeEmail || env.ADMIN_EMAIL;
    const actionUrl = `https://symbolai.net/product-orders`;

    await sendTemplateEmail(env, {
      to,
      templateId: 'product_order_rejected',
      variables: {
        employeeName: params.employeeName,
        orderId: params.orderId.substring(0, 8),
        rejectionReason: params.rejectionReason,
        actionUrl
      },
      priority: 'low',
      triggerType: 'product_order_rejected',
      userId: params.userId,
      relatedEntityId: params.orderId
    });

    console.log(`Email triggered: product_order_rejected for order ${params.orderId}`);
  } catch (error) {
    console.error('Trigger product order rejected error:', error);
  }
}

// ============================================================================
// TRIGGER 6: Product Order Completed
// ============================================================================
export async function triggerProductOrderCompleted(
  env: Env,
  params: {
    orderId: string;
    employeeName: string;
    employeeEmail?: string;
    completionDate: string;
    userId?: string;
  }
): Promise<void> {
  try {
    const to = params.employeeEmail || env.ADMIN_EMAIL;

    await sendTemplateEmail(env, {
      to,
      templateId: 'product_order_completed',
      variables: {
        employeeName: params.employeeName,
        orderId: params.orderId.substring(0, 8),
        completionDate: params.completionDate
      },
      priority: 'low',
      triggerType: 'product_order_completed',
      userId: params.userId,
      relatedEntityId: params.orderId
    });

    console.log(`Email triggered: product_order_completed for order ${params.orderId}`);
  } catch (error) {
    console.error('Trigger product order completed error:', error);
  }
}

// ============================================================================
// TRIGGER 7: Payroll Generated (Batch for all employees)
// ============================================================================
export async function triggerPayrollGenerated(
  env: Env,
  params: {
    payrollId: string;
    month: string;
    year: number;
    payrollData: Array<{
      employeeId: string;
      employeeName: string;
      employeeEmail?: string;
      baseSalary: number;
      bonus: number;
      totalDeductions: number;
      netSalary: number;
    }>;
    branchId: string;
  }
): Promise<void> {
  try {
    const monthNames = [
      '',
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر'
    ];

    const monthName = monthNames[parseInt(params.month)];

    // Send to each employee
    for (const employee of params.payrollData) {
      try {
        const to = employee.employeeEmail || env.ADMIN_EMAIL;
        const pdfUrl = `https://symbolai.net/api/payroll/pdf/${params.payrollId}/${employee.employeeId}`;

        await sendTemplateEmail(env, {
          to,
          templateId: 'payroll_generated',
          variables: {
            employeeName: employee.employeeName,
            month: monthName,
            year: params.year.toString(),
            baseSalary: `${employee.baseSalary.toFixed(2)} ج.م`,
            bonus: `${employee.bonus.toFixed(2)} ج.م`,
            deductions: `${employee.totalDeductions.toFixed(2)} ج.م`,
            netSalary: `${employee.netSalary.toFixed(2)} ج.م`,
            pdfUrl
          },
          priority: 'high',
          triggerType: 'payroll_generated',
          userId: employee.employeeId,
          relatedEntityId: params.payrollId
        });

        // Small delay between emails to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error sending payroll email to ${employee.employeeName}:`, error);
      }
    }

    console.log(`Email triggered: payroll_generated for ${params.payrollData.length} employees`);
  } catch (error) {
    console.error('Trigger payroll generated error:', error);
  }
}

// ============================================================================
// TRIGGER 8: Payroll Reminder (Scheduled)
// ============================================================================
export async function triggerPayrollReminder(env: Env): Promise<void> {
  try {
    const now = new Date();
    const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

    const monthNames = [
      '',
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر'
    ];

    const actionUrl = `https://symbolai.net/payroll`;

    await sendTemplateEmail(env, {
      to: env.ADMIN_EMAIL,
      templateId: 'payroll_reminder',
      variables: {
        month: monthNames[now.getMonth() + 1],
        year: now.getFullYear().toString(),
        daysRemaining: daysRemaining.toString(),
        actionUrl
      },
      priority: 'medium',
      triggerType: 'payroll_reminder'
    });

    console.log('Email triggered: payroll_reminder');
  } catch (error) {
    console.error('Trigger payroll reminder error:', error);
  }
}

// ============================================================================
// TRIGGER 9: Bonus Approved
// ============================================================================
export async function triggerBonusApproved(
  env: Env,
  params: {
    bonusId: string;
    month: string;
    year: number;
    weekNumber: number;
    employeeBonuses: Array<{
      employeeId: string;
      employeeName: string;
      employeeEmail?: string;
      bonusAmount: number;
      revenueContribution: number;
    }>;
  }
): Promise<void> {
  try {
    const monthNames = [
      '',
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر'
    ];

    const monthName = monthNames[parseInt(params.month)];

    // Send to each employee
    for (const employee of params.employeeBonuses) {
      try {
        const to = employee.employeeEmail || env.ADMIN_EMAIL;

        await sendTemplateEmail(env, {
          to,
          templateId: 'bonus_approved',
          variables: {
            employeeName: employee.employeeName,
            month: monthName,
            year: params.year.toString(),
            weekNumber: params.weekNumber.toString(),
            bonusAmount: `${employee.bonusAmount.toFixed(2)} ج.م`,
            revenueContribution: `${employee.revenueContribution.toFixed(2)} ج.م`
          },
          priority: 'medium',
          triggerType: 'bonus_approved',
          userId: employee.employeeId,
          relatedEntityId: params.bonusId
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error sending bonus email to ${employee.employeeName}:`, error);
      }
    }

    console.log(`Email triggered: bonus_approved for ${params.employeeBonuses.length} employees`);
  } catch (error) {
    console.error('Trigger bonus approved error:', error);
  }
}

// ============================================================================
// TRIGGER 10: Bonus Reminder (Scheduled)
// ============================================================================
export async function triggerBonusReminder(env: Env): Promise<void> {
  try {
    const now = new Date();
    const weekNumber = Math.ceil(now.getDate() / 7);
    const actionUrl = `https://symbolai.net/bonus`;

    await sendTemplateEmail(env, {
      to: env.ADMIN_EMAIL,
      templateId: 'bonus_reminder',
      variables: {
        currentWeek: weekNumber.toString(),
        actionUrl
      },
      priority: 'low',
      triggerType: 'bonus_reminder'
    });

    console.log('Email triggered: bonus_reminder');
  } catch (error) {
    console.error('Trigger bonus reminder error:', error);
  }
}

// ============================================================================
// TRIGGER 11: Backup Completed
// ============================================================================
export async function triggerBackupCompleted(
  env: Env,
  params: {
    backupId: string;
    backupDate: string;
    backupSize: string;
    recordsCount: number;
    backupType: string; // 'manual' or 'automatic'
  }
): Promise<void> {
  try {
    await sendTemplateEmail(env, {
      to: env.ADMIN_EMAIL,
      templateId: 'backup_completed',
      variables: {
        backupDate: params.backupDate,
        backupSize: params.backupSize,
        recordsCount: params.recordsCount.toString(),
        backupType: params.backupType === 'automatic' ? 'تلقائي' : 'يدوي'
      },
      priority: 'high',
      triggerType: 'backup_completed',
      relatedEntityId: params.backupId
    });

    console.log('Email triggered: backup_completed');
  } catch (error) {
    console.error('Trigger backup completed error:', error);
  }
}

// ============================================================================
// TRIGGER 12: Backup Failed
// ============================================================================
export async function triggerBackupFailed(
  env: Env,
  params: {
    backupDate: string;
    errorMessage: string;
    actionRequired: string;
  }
): Promise<void> {
  try {
    await sendTemplateEmail(env, {
      to: env.ADMIN_EMAIL,
      templateId: 'backup_failed',
      variables: {
        backupDate: params.backupDate,
        errorMessage: params.errorMessage,
        actionRequired: params.actionRequired
      },
      priority: 'critical',
      triggerType: 'backup_failed'
    });

    console.log('Email triggered: backup_failed');
  } catch (error) {
    console.error('Trigger backup failed error:', error);
  }
}

// ============================================================================
// TRIGGER 13: Revenue Mismatch
// ============================================================================
export async function triggerRevenueMismatch(
  env: Env,
  params: {
    revenueId: string;
    date: string;
    totalEntered: number;
    calculatedTotal: number;
    branchId: string;
    branchName: string;
  }
): Promise<void> {
  try {
    const difference = Math.abs(params.totalEntered - params.calculatedTotal);
    const actionUrl = `https://symbolai.net/revenues`;

    await sendTemplateEmail(env, {
      to: env.ADMIN_EMAIL,
      templateId: 'revenue_mismatch',
      variables: {
        date: params.date,
        totalEntered: `${params.totalEntered.toFixed(2)} ج.م`,
        calculatedTotal: `${params.calculatedTotal.toFixed(2)} ج.م`,
        difference: `${difference.toFixed(2)} ج.م`,
        branchName: params.branchName,
        actionUrl
      },
      priority: 'high',
      triggerType: 'revenue_mismatch',
      relatedEntityId: params.revenueId
    });

    console.log('Email triggered: revenue_mismatch');
  } catch (error) {
    console.error('Trigger revenue mismatch error:', error);
  }
}

// ============================================================================
// TRIGGER 14: Large Expense
// ============================================================================
export async function triggerLargeExpense(
  env: Env,
  params: {
    expenseId: string;
    expenseTitle: string;
    amount: number;
    category: string;
    date: string;
    description: string;
    branchId: string;
    branchName: string;
  }
): Promise<void> {
  try {
    await sendTemplateEmail(env, {
      to: env.ADMIN_EMAIL,
      templateId: 'large_expense',
      variables: {
        expenseTitle: params.expenseTitle,
        amount: `${params.amount.toFixed(2)} ج.م`,
        category: params.category,
        date: params.date,
        description: params.description || 'لا يوجد وصف',
        branchName: params.branchName
      },
      priority: 'medium',
      triggerType: 'large_expense',
      relatedEntityId: params.expenseId
    });

    console.log('Email triggered: large_expense');
  } catch (error) {
    console.error('Trigger large expense error:', error);
  }
}
