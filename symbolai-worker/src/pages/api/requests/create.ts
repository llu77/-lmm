// POST /api/requests/create — submit an employee request (سلفة، إجازة، صرف
// متأخرات، استئذان، مخالفة، استقالة). The request is linked to an employee
// record (picked by a manager, or — for self-service — matched by the
// account's full name only) so that its approval can be posted to payroll.

import type { APIRoute } from 'astro';
import {
  financeAuth,
  ok,
  fail,
  readJsonObject,
  str,
  optStr,
  isIsoDate,
  resolveBranchId,
  newId,
  clientIp,
} from '@/lib/finance/http';
import { REQUEST_TYPES, todayIso, type RequestType } from '@/lib/finance/catalog';
import { formatMoney, parsePositiveAmount } from '@/lib/finance/money';
import { buildAdaptiveInsert } from '@/lib/finance/schema';
import { getBranchEmployee } from '@/lib/finance/ledger';
import { notifyByPermission } from '@/lib/finance/notify';
import { logAudit } from '@/lib/permissions';
import { triggerEmployeeRequestCreated } from '@/lib/email-triggers';
import {
  LEAVE_TYPES,
  getOrgCurrency,
  getRequestColumns,
  inclusiveDays,
  isLeaveType,
  loadBranchEmployees,
  loadRequest,
  matchEmployee,
  runSideEffect,
  emailEnv,
  emailSafe,
  type LeaveType,
} from './_lib';

const MAX_LEAVE_DAYS = 366;

export const POST: APIRoute = async context => {
  const auth = await financeAuth(context, ['canSubmitRequests']);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;
  const p = session.permissions;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة');

  const requestType = str(body.requestType, 40) as RequestType;
  if (!(REQUEST_TYPES as readonly string[]).includes(requestType)) return fail('نوع الطلب غير صحيح');

  const canFileForOthers = p.canManageRequests || p.canManageEmployees;
  const isSupervisor = p.canManageRequests || p.canApproveRequests;
  if (requestType === 'مخالفة' && !isSupervisor) {
    return fail('تسجيل المخالفات متاح للمشرفين والإدارة فقط', 403);
  }

  const branchId = resolveBranchId(session, body.branchId);
  if (branchId instanceof Response) return branchId;

  const reason = optStr(body.reason, 1000);

  // ---- type-specific validation -------------------------------------------
  let advanceAmount: number | undefined;
  let requestedInstallments: number | null = null;
  let duesAmount: number | undefined;
  let leaveType: LeaveType | null = null;
  let leaveStart: string | null = null;
  let leaveEnd: string | null = null;
  let leaveDays: number | null = null;
  let permissionDate: string | undefined;
  let permissionHours: number | null = null;
  let violationDate: string | undefined;
  let violationDescription: string | undefined;
  let resignationDate: string | undefined;
  let resignationReason: string | undefined;
  let vacationDate: string | undefined;

  switch (requestType) {
    case 'سلفة': {
      const amount = parsePositiveAmount(body.advanceAmount ?? body.amount);
      if (amount === null) return fail('مبلغ السلفة مطلوب ويجب أن يكون رقماً موجباً (بحد أقصى منزلتين عشريتين)');
      advanceAmount = amount;
      const rawInstallments = body.installments ?? body.requestedInstallments;
      if (rawInstallments !== undefined && rawInstallments !== null && rawInstallments !== '') {
        const n = Number(rawInstallments);
        if (!Number.isInteger(n) || n < 1 || n > 24) return fail('عدد الأقساط يجب أن يكون بين 1 و 24');
        requestedInstallments = n;
      } else {
        requestedInstallments = 1;
      }
      break;
    }
    case 'إجازة': {
      const start = body.leaveStart ?? body.vacationStart;
      const end = body.leaveEnd ?? body.vacationEnd;
      if (!isIsoDate(start) || !isIsoDate(end)) return fail('تاريخ بداية ونهاية الإجازة مطلوبان');
      if (end < start) return fail('تاريخ نهاية الإجازة يجب أن يكون بعد تاريخ البداية أو مساوياً له');
      const days = inclusiveDays(start, end);
      if (days > MAX_LEAVE_DAYS) return fail('مدة الإجازة طويلة جداً');
      const type = body.leaveType === undefined || body.leaveType === null || body.leaveType === '' ? 'annual' : body.leaveType;
      if (!isLeaveType(type)) return fail('نوع الإجازة غير صحيح');
      leaveType = type;
      leaveStart = start;
      leaveEnd = end;
      leaveDays = days;
      vacationDate = `${start} إلى ${end}`;
      break;
    }
    case 'صرف متأخرات': {
      const amount = parsePositiveAmount(body.duesAmount ?? body.amount);
      if (amount === null) return fail('مبلغ المتأخرات مطلوب ويجب أن يكون رقماً موجباً');
      duesAmount = amount;
      break;
    }
    case 'استئذان': {
      if (!isIsoDate(body.permissionDate)) return fail('تاريخ الاستئذان مطلوب');
      const time = optStr(body.permissionTime, 5);
      if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return fail('وقت الاستئذان غير صحيح');
      const hours = Number(body.permissionHours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 8) return fail('مدة الاستئذان يجب أن تكون أكبر من صفر ولا تتجاوز 8 ساعات');
      permissionHours = Math.round(hours * 100) / 100;
      permissionDate = time ? `${body.permissionDate} ${time}` : body.permissionDate;
      break;
    }
    case 'مخالفة': {
      if (!isIsoDate(body.violationDate)) return fail('تاريخ المخالفة مطلوب');
      const description = optStr(body.violationDescription, 1000);
      if (!description) return fail('وصف المخالفة مطلوب');
      violationDate = body.violationDate;
      violationDescription = description;
      break;
    }
    case 'استقالة': {
      if (!isIsoDate(body.resignationDate)) return fail('تاريخ الاستقالة مطلوب');
      const text = optStr(body.resignationReason, 1000) ?? reason;
      if (!text) return fail('سبب الاستقالة مطلوب');
      resignationDate = body.resignationDate;
      resignationReason = text;
      break;
    }
  }

  try {
    // ---- employee link -----------------------------------------------------
    const requestedEmployeeId = str(body.employeeId, 100);
    const typedName = str(body.employeeName, 150);
    const typedNationalId = str(body.nationalId, 30);
    const branchEmployees = await loadBranchEmployees(db, branchId);

    let linked: { id: string; name: string; nationalId: string | null } | null = null;
    const accountHasFullName = actor.displayName !== actor.username;

    if (canFileForOthers) {
      if (requestedEmployeeId) {
        const employee = await getBranchEmployee(db, requestedEmployeeId);
        if (!employee || employee.branchId !== branchId || !employee.isActive) {
          return fail('الموظف المختار غير موجود في هذا الفرع أو غير نشط');
        }
        linked = employee;
      } else {
        linked = matchEmployee(branchEmployees, [typedName || actor.displayName], typedNationalId);
      }
    } else {
      // Self-service: linked ONLY by the account's own full name. Anything the
      // user types (a national id, a name) is unverified and could be a
      // colleague's, so it never selects the employee record — an unmatched
      // request stays unlinked and the supervisor links it when approving.
      linked = accountHasFullName ? matchEmployee(branchEmployees, [actor.displayName]) : null;
      if (requestedEmployeeId && requestedEmployeeId !== linked?.id) {
        return fail('لا يمكنك تقديم طلب باسم موظف آخر', 403);
      }
    }

    if (requestType === 'مخالفة' && !linked && !typedName) return fail('يرجى اختيار الموظف المخالف');

    // Self-service users file under their account name; a typed name is only
    // used when the account has no full name. A linked record's own name and
    // national id win over typed values.
    const employeeName =
      linked?.name || (canFileForOthers || !accountHasFullName ? typedName || actor.displayName : actor.displayName);
    const nationalId = linked && !canFileForOthers ? linked.nationalId || null : linked?.nationalId || typedNationalId || null;
    if (!employeeName) return fail('اسم الموظف مطلوب');

    // ---- write request + meta atomically -------------------------------------
    const id = newId('req');
    const requestDate = todayIso();
    const cols = await getRequestColumns(db);
    const insert = buildAdaptiveInsert('employee_requests', cols.all, {
      id,
      branch_id: branchId,
      user_id: actor.id,
      employee_name: employeeName,
      national_id: nationalId,
      request_type: requestType,
      request_date: requestDate,
      status: 'pending',
      advance_amount: advanceAmount,
      vacation_date: vacationDate,
      dues_amount: duesAmount,
      permission_date: permissionDate,
      violation_date: violationDate,
      violation_description: violationDescription,
      resignation_date: resignationDate,
      resignation_reason: resignationReason,
    });

    await db.batch([
      db.prepare(insert.sql).bind(...insert.params),
      db
        .prepare(
          `INSERT INTO employee_request_meta
             (request_id, employee_id, reason, leave_type, leave_start, leave_end, leave_days, permission_hours, requested_installments)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, linked?.id ?? null, reason, leaveType, leaveStart, leaveEnd, leaveDays, permissionHours, requestedInstallments),
    ]);

    // ---- side effects: never fail the request after the commit -------------
    try {
      const currency = await getOrgCurrency(db);
      const details = describeNewRequest(requestType, {
        advanceAmount, requestedInstallments, duesAmount, leaveType, leaveStart, leaveEnd, leaveDays,
        permissionDate, permissionHours, violationDate, violationDescription, resignationDate, resignationReason, reason,
      }, currency);

      await notifyByPermission(
        db,
        branchId,
        'can_approve_requests',
        {
          type: 'request_created',
          title: 'طلب موظف جديد',
          message: `${employeeName}: طلب ${requestType}${details.summary ? ` — ${details.summary}` : ''}`,
          severity: requestType === 'مخالفة' || requestType === 'استقالة' ? 'warning' : 'info',
          link: '/manage-requests',
          relatedEntity: id,
        },
        { excludeUserId: actor.id },
      );

      // Every user-supplied string is escaped: the e-mail templates splice
      // variables into HTML verbatim (and through String.replace).
      await runSideEffect(context, async () => {
        await triggerEmployeeRequestCreated(emailEnv(context), {
          requestId: id,
          employeeName: emailSafe(employeeName),
          requestType: emailSafe(requestType),
          requestDate,
          requestDetails: emailSafe(details.full),
          branchId,
          userId: actor.id,
        });
      });

      await logAudit(
        db,
        session,
        'create',
        'employee_request',
        id,
        { branchId, employeeName, employeeId: linked?.id ?? null, requestType, advanceAmount, duesAmount, leaveDays },
        clientIp(context.request),
        context.request.headers.get('User-Agent') || undefined,
      );
    } catch (error) {
      console.error('Post-commit side effects of request creation failed:', error);
    }

    let request = null;
    try {
      request = await loadRequest(db, id);
    } catch (error) {
      console.error('Reloading created request failed:', error);
    }

    return ok(
      {
        requestId: id,
        request,
        linkedEmployee: linked ? { id: linked.id, name: linked.name } : null,
        message: linked
          ? 'تم تقديم الطلب بنجاح وسيتم مراجعته من الإدارة'
          : 'تم تقديم الطلب بنجاح — لم يُربط بسجل موظف، وسيحدده المشرف عند الاعتماد',
      },
      201,
    );
  } catch (error) {
    console.error('Create request error:', error);
    return fail('حدث خطأ أثناء إنشاء الطلب', 500);
  }
};

interface NewRequestDetails {
  advanceAmount?: number;
  requestedInstallments: number | null;
  duesAmount?: number;
  leaveType: LeaveType | null;
  leaveStart: string | null;
  leaveEnd: string | null;
  leaveDays: number | null;
  permissionDate?: string;
  permissionHours: number | null;
  violationDate?: string;
  violationDescription?: string;
  resignationDate?: string;
  resignationReason?: string;
  reason: string | null;
}

function describeNewRequest(type: RequestType, d: NewRequestDetails, currency: Parameters<typeof formatMoney>[1]) {
  const lines: string[] = [];
  let summary = '';
  switch (type) {
    case 'سلفة':
      summary = `${formatMoney(d.advanceAmount ?? 0, currency)}${d.requestedInstallments && d.requestedInstallments > 1 ? ` على ${d.requestedInstallments} أقساط` : ''}`;
      lines.push(`مبلغ السلفة: ${summary}`);
      break;
    case 'إجازة':
      summary = `${d.leaveType ? LEAVE_TYPES[d.leaveType] : ''} ${d.leaveDays ?? ''} يوم`.trim();
      lines.push(`إجازة ${d.leaveType ? LEAVE_TYPES[d.leaveType] : ''} من ${d.leaveStart} إلى ${d.leaveEnd} (${d.leaveDays} يوم)`);
      break;
    case 'صرف متأخرات':
      summary = formatMoney(d.duesAmount ?? 0, currency);
      lines.push(`مبلغ المتأخرات: ${summary}`);
      break;
    case 'استئذان':
      summary = `${d.permissionHours} ساعة`;
      lines.push(`التاريخ: ${d.permissionDate} — المدة: ${d.permissionHours} ساعة`);
      break;
    case 'مخالفة':
      summary = d.violationDate ?? '';
      lines.push(`التاريخ: ${d.violationDate}`, `الوصف: ${d.violationDescription}`);
      break;
    case 'استقالة':
      summary = d.resignationDate ?? '';
      lines.push(`تاريخ الاستقالة: ${d.resignationDate}`, `السبب: ${d.resignationReason}`);
      break;
  }
  if (d.reason && type !== 'استقالة') lines.push(`السبب: ${d.reason}`);
  return { summary, full: lines.join('\n') };
}
