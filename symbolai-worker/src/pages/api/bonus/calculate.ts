import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess } from '@/lib/permissions';
import { bonusQueries, revenueQueries, employeeQueries, generateId } from '@/lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check authentication with permissions
  const authResult = await requireAuthWithPermissions(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  // Check permission to manage bonus
  const permError = requirePermission(authResult, 'canManageBonus');
  if (permError) {
    return permError;
  }

  try {
    const { branchId, weekNumber, month, year } = await request.json();

    // Validation
    if (!branchId || !weekNumber || !month || !year) {
      return new Response(
        JSON.stringify({ error: 'البيانات المطلوبة ناقصة' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate branch access
    const branchError = validateBranchAccess(authResult, branchId);
    if (branchError) {
      return branchError;
    }

    if (weekNumber < 1 || weekNumber > 5) {
      return new Response(
        JSON.stringify({ error: 'رقم الأسبوع يجب أن يكون بين 1 و 5' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate week date range
    const weekRanges = getWeekDateRange(month, year, weekNumber);

    // Get revenues for this week
    const revenuesResult = await revenueQueries.getByDateRange(
      locals.runtime.env.DB,
      branchId,
      weekRanges.startDate,
      weekRanges.endDate
    );

    const revenues = revenuesResult.results || [];

    // Get active employees
    const employeesResult = await employeeQueries.getByBranch(
      locals.runtime.env.DB,
      branchId
    );
    const employees = employeesResult.results || [];

    // Calculate bonus per employee
    const employeeBonuses = calculateEmployeeBonuses(revenues, employees);

    const totalBonusPaid = employeeBonuses.reduce((sum, eb) => sum + eb.bonusAmount, 0);

    // Check if already exists
    const existing = await bonusQueries.getByBranchAndPeriod(
      locals.runtime.env.DB,
      branchId,
      month,
      year
    );

    const alreadyExists = existing.results?.some((r: any) => r.week_number === weekNumber);

    return new Response(
      JSON.stringify({
        success: true,
        weekRange: weekRanges,
        employeeBonuses,
        totalBonusPaid,
        alreadyExists,
        revenueCount: revenues.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Calculate bonus error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء حساب البونص' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// Helper: Get week date range
function getWeekDateRange(month: string, year: number, weekNumber: number): { startDate: string; endDate: string } {
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const monthIndex = monthNames.indexOf(month);

  // Week ranges (simplified - 7 days each)
  const weekStarts = [1, 8, 15, 22, 29];
  const startDay = weekStarts[weekNumber - 1];

  const startDate = new Date(year, monthIndex, startDay);
  let endDay = startDay + 6;

  // Adjust for last week (may go to next month)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  if (endDay > daysInMonth) {
    endDay = daysInMonth;
  }

  const endDate = new Date(year, monthIndex, endDay);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// Helper: Calculate bonus per employee based on tiered thresholds
function calculateEmployeeBonuses(revenues: any[], employees: any[]): Array<{
  employeeId: string;
  employeeName: string;
  totalRevenue: number;
  bonusAmount: number;
  bonusStatus: string;
  threshold: number;
}> {
  // Tiered bonus system (SAR)
  const BONUS_TIERS = [
    { threshold: 2400, bonus: 175, label: 'مستحق 175 ريال' },
    { threshold: 1800, bonus: 100, label: 'مستحق 100 ريال' },
    { threshold: 1300, bonus: 50, label: 'مستحق 50 ريال' }
  ];

  const employeeBonuses: Map<string, { name: string; revenue: number }> = new Map();

  // Parse revenues and extract employee contributions
  revenues.forEach(revenue => {
    if (revenue.employees) {
      try {
        const employeeData = JSON.parse(revenue.employees);
        if (Array.isArray(employeeData)) {
          employeeData.forEach((emp: any) => {
            const existing = employeeBonuses.get(emp.name) || { name: emp.name, revenue: 0 };
            existing.revenue += emp.revenue || 0;
            employeeBonuses.set(emp.name, existing);
          });
        }
      } catch (error) {
        console.error('Error parsing employee revenue data:', error);
      }
    }
  });

  // Match with employee IDs and calculate bonus based on tiers
  const result: Array<{
    employeeId: string;
    employeeName: string;
    totalRevenue: number;
    bonusAmount: number;
    bonusStatus: string;
    threshold: number;
  }> = [];

  employeeBonuses.forEach((data, employeeName) => {
    const employee = employees.find((e: any) =>
      e.employee_name === employeeName && e.is_active === 1
    );

    if (employee) {
      // Determine bonus tier
      let bonusAmount = 0;
      let bonusStatus = `غير مستحق (${data.revenue.toFixed(2)} ريال)`;
      let threshold = 1300;

      for (const tier of BONUS_TIERS) {
        if (data.revenue >= tier.threshold) {
          bonusAmount = tier.bonus;
          bonusStatus = tier.label;
          threshold = tier.threshold;
          break;
        }
      }

      result.push({
        employeeId: employee.id,
        employeeName: employee.employee_name,
        totalRevenue: data.revenue,
        bonusAmount,
        bonusStatus,
        threshold
      });
    }
  });

  return result;
}
