// Database utility functions for D1
// All queries use prepared statements to prevent SQL injection

import type { D1Database } from '@cloudflare/workers-types';

export interface DatabaseEnv {
  DB: D1Database;
}

// Generate unique IDs (similar to Convex)
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format date to YYYY-MM-DD
export function formatDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

// Parse JSON fields safely
export function parseJSON<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

// Convert boolean to SQLite integer
export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

// Convert SQLite integer to boolean
export function intToBool(value: number): boolean {
  return value === 1;
}

// User queries
export const userQueries = {
  async getByTokenIdentifier(db: D1Database, tokenIdentifier: string) {
    return await db
      .prepare('SELECT * FROM users WHERE token_identifier = ?')
      .bind(tokenIdentifier)
      .first();
  },

  async getByUsername(db: D1Database, username: string) {
    return await db
      .prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first();
  },

  async create(db: D1Database, user: {
    id: string;
    tokenIdentifier: string;
    name?: string;
    email?: string;
    username?: string;
    role?: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO users (id, token_identifier, name, email, username, role)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        user.id,
        user.tokenIdentifier,
        user.name || null,
        user.email || null,
        user.username || null,
        user.role || 'employee'
      )
      .run();
  },

  async update(db: D1Database, id: string, updates: {
    name?: string;
    email?: string;
    bio?: string;
    avatar?: string;
    role?: string;
  }) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.bio !== undefined) {
      fields.push('bio = ?');
      values.push(updates.bio);
    }
    if (updates.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(updates.avatar);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }

    if (fields.length === 0) return { success: true };

    values.push(id);

    return await db
      .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
};

// Branch queries
export const branchQueries = {
  async getAll(db: D1Database) {
    return await db
      .prepare('SELECT * FROM branches WHERE is_active = 1 ORDER BY branch_name')
      .all();
  },

  async getById(db: D1Database, branchId: string) {
    return await db
      .prepare('SELECT * FROM branches WHERE branch_id = ?')
      .bind(branchId)
      .first();
  },

  async create(db: D1Database, branch: {
    id: string;
    branchId: string;
    branchName: string;
    supervisorEmail?: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO branches (id, branch_id, branch_name, supervisor_email)
         VALUES (?, ?, ?, ?)`
      )
      .bind(
        branch.id,
        branch.branchId,
        branch.branchName,
        branch.supervisorEmail || null
      )
      .run();
  }
};

// Employee queries
export const employeeQueries = {
  async getByBranch(db: D1Database, branchId: string) {
    return await db
      .prepare(
        `SELECT * FROM employees
         WHERE branch_id = ? AND is_active = 1
         ORDER BY employee_name`
      )
      .bind(branchId)
      .all();
  },

  async getById(db: D1Database, id: string) {
    return await db
      .prepare('SELECT * FROM employees WHERE id = ?')
      .bind(id)
      .first();
  },

  async create(db: D1Database, employee: {
    id: string;
    branchId: string;
    employeeName: string;
    nationalId?: string;
    baseSalary: number;
    supervisorAllowance?: number;
    incentives?: number;
  }) {
    return await db
      .prepare(
        `INSERT INTO employees
         (id, branch_id, employee_name, national_id, base_salary, supervisor_allowance, incentives)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        employee.id,
        employee.branchId,
        employee.employeeName,
        employee.nationalId || null,
        employee.baseSalary,
        employee.supervisorAllowance || 0,
        employee.incentives || 0
      )
      .run();
  },

  async update(db: D1Database, id: string, updates: {
    employeeName?: string;
    baseSalary?: number;
    supervisorAllowance?: number;
    incentives?: number;
    isActive?: boolean;
  }) {
    const fields = [];
    const values = [];

    if (updates.employeeName !== undefined) {
      fields.push('employee_name = ?');
      values.push(updates.employeeName);
    }
    if (updates.baseSalary !== undefined) {
      fields.push('base_salary = ?');
      values.push(updates.baseSalary);
    }
    if (updates.supervisorAllowance !== undefined) {
      fields.push('supervisor_allowance = ?');
      values.push(updates.supervisorAllowance);
    }
    if (updates.incentives !== undefined) {
      fields.push('incentives = ?');
      values.push(updates.incentives);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(boolToInt(updates.isActive));
    }

    if (fields.length === 0) return { success: true };

    values.push(id);

    return await db
      .prepare(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
};

// Revenue queries
export const revenueQueries = {
  async getByDateRange(db: D1Database, branchId: string, startDate: string, endDate: string) {
    return await db
      .prepare(
        `SELECT * FROM revenues
         WHERE branch_id = ? AND date >= ? AND date <= ?
         ORDER BY date DESC`
      )
      .bind(branchId, startDate, endDate)
      .all();
  },

  async create(db: D1Database, revenue: {
    id: string;
    branchId: string;
    date: string;
    cash: number;
    network: number;
    budget: number;
    total: number;
    employees?: string; // JSON
  }) {
    const calculatedTotal = revenue.cash + revenue.network + revenue.budget;
    const isMatched = Math.abs(calculatedTotal - revenue.total) < 0.01;

    return await db
      .prepare(
        `INSERT INTO revenues
         (id, branch_id, date, cash, network, budget, total, calculated_total, is_matched, employees)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        revenue.id,
        revenue.branchId,
        revenue.date,
        revenue.cash,
        revenue.network,
        revenue.budget,
        revenue.total,
        calculatedTotal,
        boolToInt(isMatched),
        revenue.employees || null
      )
      .run();
  },

  async update(db: D1Database, id: string, updates: {
    cash?: number;
    network?: number;
    budget?: number;
    total?: number;
    employees?: string;
  }) {
    // Recalculate totals if components change
    let calculatedTotal: number | undefined;
    if (updates.cash !== undefined || updates.network !== undefined || updates.budget !== undefined) {
      // Get current values
      const current = await db.prepare('SELECT cash, network, budget FROM revenues WHERE id = ?').bind(id).first() as any;
      const cash = updates.cash ?? current.cash;
      const network = updates.network ?? current.network;
      const budget = updates.budget ?? current.budget;
      calculatedTotal = cash + network + budget;
    }

    const fields = [];
    const values = [];

    if (updates.cash !== undefined) {
      fields.push('cash = ?');
      values.push(updates.cash);
    }
    if (updates.network !== undefined) {
      fields.push('network = ?');
      values.push(updates.network);
    }
    if (updates.budget !== undefined) {
      fields.push('budget = ?');
      values.push(updates.budget);
    }
    if (updates.total !== undefined) {
      fields.push('total = ?');
      values.push(updates.total);
    }
    if (calculatedTotal !== undefined) {
      fields.push('calculated_total = ?');
      values.push(calculatedTotal);
      fields.push('is_matched = ?');
      const isMatched = Math.abs(calculatedTotal - (updates.total ?? 0)) < 0.01;
      values.push(boolToInt(isMatched));
    }
    if (updates.employees !== undefined) {
      fields.push('employees = ?');
      values.push(updates.employees);
    }

    if (fields.length === 0) return { success: true };

    values.push(id);

    return await db
      .prepare(`UPDATE revenues SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
};

// Expense queries
export const expenseQueries = {
  async getByDateRange(db: D1Database, branchId: string, startDate: string, endDate: string) {
    return await db
      .prepare(
        `SELECT * FROM expenses
         WHERE branch_id = ? AND date >= ? AND date <= ?
         ORDER BY date DESC`
      )
      .bind(branchId, startDate, endDate)
      .all();
  },

  async create(db: D1Database, expense: {
    id: string;
    branchId: string;
    title: string;
    amount: number;
    category?: string;
    description?: string;
    date: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO expenses
         (id, branch_id, title, amount, category, description, date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        expense.id,
        expense.branchId,
        expense.title,
        expense.amount,
        expense.category || null,
        expense.description || null,
        expense.date
      )
      .run();
  },

  async delete(db: D1Database, id: string) {
    return await db
      .prepare('DELETE FROM expenses WHERE id = ?')
      .bind(id)
      .run();
  }
};

// Bonus queries
export const bonusQueries = {
  async getByBranchAndPeriod(db: D1Database, branchId: string, month: string, year: number) {
    return await db
      .prepare(
        `SELECT * FROM bonus_records
         WHERE branch_id = ? AND month = ? AND year = ?
         ORDER BY week_number`
      )
      .bind(branchId, month, year)
      .all();
  },

  async create(db: D1Database, bonus: {
    id: string;
    branchId: string;
    weekNumber: number;
    month: string;
    year: number;
    employeeBonuses: string; // JSON
    totalBonusPaid: number;
    revenueSnapshot?: string; // JSON
  }) {
    return await db
      .prepare(
        `INSERT INTO bonus_records
         (id, branch_id, week_number, month, year, employee_bonuses, total_bonus_paid, revenue_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        bonus.id,
        bonus.branchId,
        bonus.weekNumber,
        bonus.month,
        bonus.year,
        bonus.employeeBonuses,
        bonus.totalBonusPaid,
        bonus.revenueSnapshot || null
      )
      .run();
  },

  async approve(db: D1Database, id: string, approvedBy: string) {
    return await db
      .prepare(
        `UPDATE bonus_records
         SET approved_by = ?, approved_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(approvedBy, id)
      .run();
  }
};

// Product order queries
export const productOrderQueries = {
  async getByBranch(db: D1Database, branchId: string, includeDrafts: boolean = false) {
    const query = includeDrafts
      ? `SELECT * FROM product_orders WHERE branch_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM product_orders WHERE branch_id = ? AND is_draft = 0 ORDER BY created_at DESC`;

    return await db
      .prepare(query)
      .bind(branchId)
      .all();
  },

  async getByEmployee(db: D1Database, employeeName: string) {
    return await db
      .prepare(
        `SELECT * FROM product_orders
         WHERE employee_name = ?
         ORDER BY created_at DESC`
      )
      .bind(employeeName)
      .all();
  },

  async create(db: D1Database, order: {
    id: string;
    branchId: string;
    employeeName: string;
    products: string; // JSON
    grandTotal: number;
    status?: string;
    isDraft?: boolean;
    notes?: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO product_orders
         (id, branch_id, employee_name, products, grand_total, status, is_draft, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        order.id,
        order.branchId,
        order.employeeName,
        order.products,
        order.grandTotal,
        order.status || 'pending',
        boolToInt(order.isDraft || false),
        order.notes || null
      )
      .run();
  },

  async updateStatus(db: D1Database, id: string, status: string) {
    return await db
      .prepare(
        `UPDATE product_orders
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(status, id)
      .run();
  }
};

// Employee order queries
export const employeeOrderQueries = {
  async getByBranch(db: D1Database, branchId: string) {
    return await db
      .prepare(
        `SELECT * FROM employee_orders
         WHERE branch_id = ?
         ORDER BY created_at DESC`
      )
      .bind(branchId)
      .all();
  },

  async create(db: D1Database, order: {
    id: string;
    branchId: string;
    requestType: string;
    description?: string;
    status?: string;
    priority?: string;
    requestedBy: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO employee_orders
         (id, branch_id, request_type, description, status, priority, requested_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        order.id,
        order.branchId,
        order.requestType,
        order.description || null,
        order.status || 'pending',
        order.priority || 'medium',
        order.requestedBy
      )
      .run();
  }
};

// Employee request queries
export const employeeRequestQueries = {
  async getByUser(db: D1Database, userId: string) {
    return await db
      .prepare(
        `SELECT * FROM employee_requests
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .bind(userId)
      .all();
  },

  async getByBranch(db: D1Database, branchId: string, status?: string) {
    if (status) {
      return await db
        .prepare(
          `SELECT * FROM employee_requests
           WHERE branch_id = ? AND status = ?
           ORDER BY created_at DESC`
        )
        .bind(branchId, status)
        .all();
    }

    return await db
      .prepare(
        `SELECT * FROM employee_requests
         WHERE branch_id = ?
         ORDER BY created_at DESC`
      )
      .bind(branchId)
      .all();
  },

  async create(db: D1Database, request: {
    id: string;
    branchId: string;
    employeeName: string;
    nationalId?: string;
    requestType: string;
    requestDate: string;
    userId?: string;
    advanceAmount?: number;
    vacationDate?: string;
    duesAmount?: number;
    permissionDate?: string;
    violationDate?: string;
    violationDescription?: string;
    resignationDate?: string;
    resignationReason?: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO employee_requests
         (id, branch_id, employee_name, national_id, request_type, request_date, user_id,
          advance_amount, vacation_date, dues_amount, permission_date,
          violation_date, violation_description, resignation_date, resignation_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        request.id,
        request.branchId,
        request.employeeName,
        request.nationalId || null,
        request.requestType,
        request.requestDate,
        request.userId || null,
        request.advanceAmount || null,
        request.vacationDate || null,
        request.duesAmount || null,
        request.permissionDate || null,
        request.violationDate || null,
        request.violationDescription || null,
        request.resignationDate || null,
        request.resignationReason || null
      )
      .run();
  },

  async respond(db: D1Database, id: string, status: string, adminResponse: string) {
    return await db
      .prepare(
        `UPDATE employee_requests
         SET status = ?, admin_response = ?, response_date = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(status, adminResponse, id)
      .run();
  }
};

// Advance queries
export const advanceQueries = {
  async getByEmployee(db: D1Database, employeeId: string, month: string, year: number) {
    return await db
      .prepare(
        `SELECT * FROM advances
         WHERE employee_id = ? AND month = ? AND year = ?`
      )
      .bind(employeeId, month, year)
      .all();
  },

  async create(db: D1Database, advance: {
    id: string;
    employeeId: string;
    employeeName: string;
    amount: number;
    month: string;
    year: number;
    description?: string;
    recordedBy?: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO advances
         (id, employee_id, employee_name, amount, month, year, description, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        advance.id,
        advance.employeeId,
        advance.employeeName,
        advance.amount,
        advance.month,
        advance.year,
        advance.description || null,
        advance.recordedBy || null
      )
      .run();
  }
};

// Deduction queries
export const deductionQueries = {
  async getByEmployee(db: D1Database, employeeId: string, month: string, year: number) {
    return await db
      .prepare(
        `SELECT * FROM deductions
         WHERE employee_id = ? AND month = ? AND year = ?`
      )
      .bind(employeeId, month, year)
      .all();
  },

  async create(db: D1Database, deduction: {
    id: string;
    employeeId: string;
    employeeName: string;
    amount: number;
    month: string;
    year: number;
    reason?: string;
    recordedBy?: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO deductions
         (id, employee_id, employee_name, amount, month, year, reason, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        deduction.id,
        deduction.employeeId,
        deduction.employeeName,
        deduction.amount,
        deduction.month,
        deduction.year,
        deduction.reason || null,
        deduction.recordedBy || null
      )
      .run();
  }
};

// Payroll queries
export const payrollQueries = {
  async getByBranch(db: D1Database, branchId: string, month: string, year: number) {
    return await db
      .prepare(
        `SELECT * FROM payroll_records
         WHERE branch_id = ? AND month = ? AND year = ?`
      )
      .bind(branchId, month, year)
      .first();
  },

  async create(db: D1Database, payroll: {
    id: string;
    branchId: string;
    month: string;
    year: number;
    employees: string; // JSON
    totalNetSalary: number;
    generatedBy?: string;
    pdfUrl?: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO payroll_records
         (id, branch_id, month, year, employees, total_net_salary, generated_by, pdf_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        payroll.id,
        payroll.branchId,
        payroll.month,
        payroll.year,
        payroll.employees,
        payroll.totalNetSalary,
        payroll.generatedBy || null,
        payroll.pdfUrl || null
      )
      .run();
  },

  async markEmailSent(db: D1Database, id: string) {
    return await db
      .prepare(`UPDATE payroll_records SET email_sent = 1 WHERE id = ?`)
      .bind(id)
      .run();
  }
};

// Notification queries
export const notificationQueries = {
  async getByBranch(db: D1Database, branchId: string, includeRead: boolean = false) {
    const query = includeRead
      ? `SELECT * FROM notifications WHERE branch_id = ? AND is_dismissed = 0 ORDER BY created_at DESC LIMIT 50`
      : `SELECT * FROM notifications WHERE branch_id = ? AND is_read = 0 AND is_dismissed = 0 ORDER BY created_at DESC LIMIT 50`;

    return await db
      .prepare(query)
      .bind(branchId)
      .all();
  },

  async create(db: D1Database, notification: {
    id: string;
    branchId?: string;
    type: string;
    severity?: string;
    title: string;
    message: string;
    aiGenerated?: boolean;
    actionRequired?: boolean;
    relatedEntity?: string;
    expiresAt?: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO notifications
         (id, branch_id, type, severity, title, message, ai_generated, action_required, related_entity, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        notification.id,
        notification.branchId || null,
        notification.type,
        notification.severity || 'medium',
        notification.title,
        notification.message,
        boolToInt(notification.aiGenerated || false),
        boolToInt(notification.actionRequired || false),
        notification.relatedEntity || null,
        notification.expiresAt || null
      )
      .run();
  },

  async markAsRead(db: D1Database, id: string) {
    return await db
      .prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`)
      .bind(id)
      .run();
  },

  async dismiss(db: D1Database, id: string) {
    return await db
      .prepare(`UPDATE notifications SET is_dismissed = 1 WHERE id = ?`)
      .bind(id)
      .run();
  }
};

// Backup queries
export const backupQueries = {
  async getAll(db: D1Database, limit: number = 30) {
    return await db
      .prepare(`SELECT * FROM backups ORDER BY date DESC LIMIT ?`)
      .bind(limit)
      .all();
  },

  async create(db: D1Database, backup: {
    id: string;
    date: string;
    type: string;
    dataSnapshot: string; // JSON
    revenuesData?: string;
    expensesData?: string;
    productOrdersData?: string;
    employeeRequestsData?: string;
    bonusRecordsData?: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO backups
         (id, date, type, data_snapshot, revenues_data, expenses_data,
          product_orders_data, employee_requests_data, bonus_records_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        backup.id,
        backup.date,
        backup.type,
        backup.dataSnapshot,
        backup.revenuesData || null,
        backup.expensesData || null,
        backup.productOrdersData || null,
        backup.employeeRequestsData || null,
        backup.bonusRecordsData || null
      )
      .run();
  },

  async getById(db: D1Database, id: string) {
    return await db
      .prepare(`SELECT * FROM backups WHERE id = ?`)
      .bind(id)
      .first();
  }
};

// Email log queries
export const emailLogQueries = {
  async create(db: D1Database, log: {
    id: string;
    toAddresses: string; // JSON array
    subject: string;
    status: string;
    emailId?: string;
    error?: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO email_logs
         (id, to_addresses, subject, status, email_id, error)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        log.id,
        log.toAddresses,
        log.subject,
        log.status,
        log.emailId || null,
        log.error || null
      )
      .run();
  },

  async getRecent(db: D1Database, limit: number = 50) {
    return await db
      .prepare(`SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT ?`)
      .bind(limit)
      .all();
  }
};

// Email settings queries
export const emailSettingsQueries = {
  async get(db: D1Database, key: string) {
    return await db
      .prepare(`SELECT setting_value FROM email_settings WHERE setting_key = ?`)
      .bind(key)
      .first();
  },

  async set(db: D1Database, key: string, value: string) {
    return await db
      .prepare(
        `INSERT INTO email_settings (id, setting_key, setting_value)
         VALUES (?, ?, ?)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP`
      )
      .bind(generateId(), key, value, value)
      .run();
  }
};

// Zapier webhook queries
export const zapierWebhookQueries = {
  async getAll(db: D1Database, activeOnly: boolean = false) {
    const query = activeOnly
      ? `SELECT * FROM zapier_webhooks WHERE is_active = 1`
      : `SELECT * FROM zapier_webhooks`;

    return await db.prepare(query).all();
  },

  async create(db: D1Database, webhook: {
    id: string;
    name: string;
    webhookUrl: string;
    eventType: string;
    isActive?: boolean;
  }) {
    return await db
      .prepare(
        `INSERT INTO zapier_webhooks
         (id, name, webhook_url, event_type, is_active)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        webhook.id,
        webhook.name,
        webhook.webhookUrl,
        webhook.eventType,
        boolToInt(webhook.isActive !== false)
      )
      .run();
  },

  async updateTriggerCount(db: D1Database, id: string) {
    return await db
      .prepare(
        `UPDATE zapier_webhooks
         SET trigger_count = trigger_count + 1, last_triggered = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(id)
      .run();
  }
};

// Zapier log queries
export const zapierLogQueries = {
  async create(db: D1Database, log: {
    id: string;
    webhookId: string;
    eventType: string;
    payload: string; // JSON
    status: string;
    responseCode?: number;
    error?: string;
  }) {
    return await db
      .prepare(
        `INSERT INTO zapier_logs
         (id, webhook_id, event_type, payload, status, response_code, error)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        log.id,
        log.webhookId,
        log.eventType,
        log.payload,
        log.status,
        log.responseCode || null,
        log.error || null
      )
      .run();
  },

  async getByWebhook(db: D1Database, webhookId: string, limit: number = 50) {
    return await db
      .prepare(
        `SELECT * FROM zapier_logs
         WHERE webhook_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(webhookId, limit)
      .all();
  }
};
