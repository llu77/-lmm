# Implementation Plan for Bonus & Payroll System Changes
## Date: 2025-11-13
## Status: PENDING REVIEW

---

## Overview

Major changes requested to the Bonus and Payroll systems to improve automation, prevent manipulation, and enforce business rules.

---

## 1. Bonus System Changes

### 1.1 New Tiered Bonus Structure ✅ IMPLEMENTED

**OLD System:** 10% of employee revenue
**NEW System:** Tiered thresholds

| Revenue (SAR) | Bonus (SAR) | Status |
|---------------|-------------|---------|
| < 1300        | 0           | غير مستحق |
| ≥ 1300        | 50          | مستحق 50 ريال |
| ≥ 1800        | 100         | مستحق 100 ريال |
| ≥ 2400        | 175         | مستحق 175 ريال |

**Implementation Status:**
- ✅ Updated `calculateEmployeeBonuses()` function in `/src/pages/api/bonus/calculate.ts`
- ✅ Changed from percentage-based to tiered system
- ✅ Added `bonusStatus` field to show eligibility
- ✅ Added `threshold` field for tracking

### 1.2 Auto-Population & Automation 🔄 PENDING

**Requirements:**
1. Auto-populate Month/Year/Week based on current date
2. Calculate current week number automatically
3. Pre-select current period on page load
4. Remove manual intervention to prevent manipulation

**Implementation Needed:**
- Update `bonus.astro` to auto-set dates on page load
- Add JavaScript function to calculate current week:
  ```javascript
  function getCurrentWeek() {
    const now = new Date();
    const day = now.getDate();
    if (day <= 7) return 1;
    if (day <= 14) return 2;
    if (day <= 21) return 3;
    if (day <= 28) return 4;
    return 5;
  }
  ```
- Make Month/Year/Week fields read-only or remove manual selection

### 1.3 Revenue Data Synchronization & Validation 🔄 PENDING

**Requirements:**
1. Must match exactly 7 days of revenue data
2. Validate that revenue dates match bonus period dates
3. Show validation errors if mismatch detected
4. Prevent saving if validation fails

**Implementation Needed:**
- Add validation in `calculate.ts`:
  ```typescript
  // Count unique dates in revenue data
  const revenueDates = new Set(revenues.map(r => r.date));
  const expectedDays = 7;
  
  if (revenueDates.size !== expectedDays) {
    return new Response(
      JSON.stringify({
        error: `خطأ في البيانات: يجب أن تكون البيانات لمدة 7 أيام بالضبط. الأيام الموجودة: ${revenueDates.size}`,
        revenueDates: Array.from(revenueDates).sort()
      }),
      { status: 400 }
    );
  }
  ```

- Validate date ranges match:
  ```typescript
  const startDate = new Date(weekRanges.startDate);
  const endDate = new Date(weekRanges.endDate);
  
  revenues.forEach(rev => {
    const revDate = new Date(rev.date);
    if (revDate < startDate || revDate > endDate) {
      throw new Error(`Revenue date ${rev.date} outside week range`);
    }
  });
  ```

### 1.4 Weekly Bonus Request & Save 🔄 PENDING

**Requirements:**
1. Only allow bonus request at end of week
2. Automatically save and close week
3. Start new week automatically
4. Prevent duplicate bonus for same week

**Implementation Needed:**
- Add date validation for bonus request (must be end of week):
  ```typescript
  const today = new Date();
  const isEndOfWeek = today.getDay() === 6; // Saturday
  
  if (!isEndOfWeek && !isAdmin) {
    return new Response(
      JSON.stringify({ error: 'يمكن طلب البونص فقط في نهاية الأسبوع' }),
      { status: 403 }
    );
  }
  ```

- Enhanced duplicate detection (already exists, needs UI update)
- Add auto-archive feature after save

### 1.5 UI Updates for New System 🔄 PENDING

**Changes Needed:**
1. Update table headers:
   - Remove "النسبة" (Percentage) column
   - Change "مبلغ البونص" to show status
   - Add "الحالة" (Status) column

2. Update display logic:
   ```html
   <td>${emp.bonusStatus}</td>
   <td class="${emp.bonusAmount > 0 ? 'text-green-600 font-bold' : 'text-red-600'}">
     ${emp.bonusAmount > 0 ? formatCurrency(emp.bonusAmount) : 'غير مستحق'}
   </td>
   ```

3. Add visual indicators:
   - Green checkmark for eligible employees
   - Red X for non-eligible
   - Progress bar showing revenue progress to next tier

---

## 2. Payroll System Changes

### 2.1 Day 30 Restriction 🔄 PENDING

**Requirement:** Only allow payroll generation on day 30 of each month

**Implementation Needed:**
- Add date validation in `/src/pages/api/payroll/calculate.ts`:
  ```typescript
  const today = new Date();
  const dayOfMonth = today.getDate();
  
  // Allow on day 30 only (or last day of month if < 30 days)
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const allowedDay = Math.min(30, daysInMonth);
  
  if (dayOfMonth !== allowedDay && !authResult.permissions.isSuperAdmin) {
    return new Response(
      JSON.stringify({
        error: `يمكن إصدار مسير الرواتب فقط في يوم ${allowedDay} من كل شهر. اليوم الحالي: ${dayOfMonth}`,
        allowedDay,
        currentDay: dayOfMonth
      }),
      { status: 403 }
    );
  }
  ```

- Update UI to show restriction:
  ```javascript
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const allowedDay = Math.min(30, daysInMonth);
  
  if (dayOfMonth !== allowedDay) {
    document.getElementById('calculate-btn').disabled = true;
    document.getElementById('restriction-msg').textContent = 
      `سيتم تفعيل إصدار الرواتب في يوم ${allowedDay} من الشهر الحالي`;
  }
  ```

### 2.2 Admin Approval Requirement 🔄 PENDING

**Requirement:** Payroll must be approved by main admin before being applied

**Implementation Needed:**
1. Add `status` field to payroll records:
   - `pending` - Awaiting approval
   - `approved` - Approved by admin
   - `rejected` - Rejected
   - `applied` - Applied to system

2. Update `save.ts` to save as pending:
   ```typescript
   await locals.runtime.env.DB.prepare(`
     INSERT INTO payroll_records (
       id, branch_id, month, year, 
       payroll_data, totals, 
       status, generated_by, generated_at
     ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
   `).bind(
     payrollId, branchId, month, year,
     JSON.stringify(payrollData), JSON.stringify(totals),
     authResult.permissions.username,
     new Date().toISOString()
   ).run();
   ```

3. Add approval API `/src/pages/api/payroll/approve.ts`:
   ```typescript
   export const POST: APIRoute = async ({ request, locals }) => {
     // Check if user is super admin
     if (!authResult.permissions.isSuperAdmin) {
       return new Response(
         JSON.stringify({ error: 'يتطلب صلاحيات الأدمن الرئيسي' }),
         { status: 403 }
       );
     }
     
     // Update status to approved
     await locals.runtime.env.DB.prepare(`
       UPDATE payroll_records
       SET status = 'approved', 
           approved_by = ?,
           approved_at = ?
       WHERE id = ?
     `).bind(
       authResult.permissions.username,
       new Date().toISOString(),
       payrollId
     ).run();
   };
   ```

4. Add approval UI in payroll page:
   - Show pending payrolls
   - Add "موافقة" button for admins
   - Add "رفض" button for admins
   - Show approval status

### 2.3 One-Time Generation Per Month ✅ PARTIALLY IMPLEMENTED

**Requirement:** Only one payroll generation allowed per month

**Current Status:**
- Duplicate checking exists but only warns user
- Need to enforce as hard block

**Implementation Needed:**
- Update `calculate.ts` to check existing approved payroll:
  ```typescript
  const existing = await locals.runtime.env.DB.prepare(`
    SELECT id FROM payroll_records
    WHERE branch_id = ? 
      AND month = ? 
      AND year = ?
      AND status IN ('approved', 'applied')
    LIMIT 1
  `).bind(branchId, month, year).first();
  
  if (existing) {
    return new Response(
      JSON.stringify({
        error: 'تم إصدار مسير رواتب لهذا الشهر مسبقاً',
        existingPayrollId: existing.id
      }),
      { status: 400 }
    );
  }
  ```

### 2.4 Timestamp Addition ✅ IMPLEMENTED

**Status:** Already implemented in save API with `generated_at` field

---

## 3. Minor Improvements

### 3.1 Bonus Approval Tracking ✅ IMPLEMENTED

**Status:** Already implemented in `/src/pages/api/bonus/save.ts`:
- `approved` field
- `approved_by` field (via `bonusQueries.approve()`)
- Audit logging

### 3.2 Payroll Timestamp ✅ IMPLEMENTED

**Status:** Already implemented with `generated_at` field

### 3.3 PDF/Print for Product Orders 🔄 PENDING

**Implementation Needed:**
1. Add print stylesheet in `product-orders.astro`:
   ```css
   @media print {
     .no-print { display: none; }
     .print-only { display: block; }
     /* Order print layout */
   }
   ```

2. Add print function:
   ```typescript
   function printOrder(orderId: string) {
     const order = orders.find(o => o.id === orderId);
     if (!order) return;
     
     // Generate print-friendly HTML
     const printContent = generatePrintHTML(order);
     
     // Open print window
     const printWindow = window.open('', '_blank');
     printWindow.document.write(printContent);
     printWindow.document.close();
     printWindow.print();
   }
   ```

3. Add print button in order details modal:
   ```html
   <button onclick="printOrder('${order.id}')" class="no-print">
     🖨️ طباعة
   </button>
   ```

### 3.4 Bulk Operations 🔄 PENDING

**Potential Additions:**
1. Bulk approve/reject orders
2. Bulk email sending
3. Batch bonus calculation for multiple branches
4. Excel export for all pages

---

## 4. Implementation Priority

### Phase 1 - Critical (Immediate)
1. ✅ Update bonus calculation to tiered system
2. 🔄 Add payroll day 30 restriction
3. 🔄 Add payroll one-time-per-month enforcement
4. 🔄 Add admin approval workflow for payroll

### Phase 2 - Important (This Week)
1. 🔄 Auto-population of bonus dates
2. 🔄 Revenue data validation (7-day match)
3. 🔄 Update bonus UI for new system
4. 🔄 Weekly bonus request timing

### Phase 3 - Enhancement (Next Week)
1. 🔄 PDF/Print functionality
2. 🔄 Bulk operations
3. 🔄 Enhanced reporting
4. 🔄 Export features

---

## 5. Testing Requirements

### Bonus System Tests
- [ ] Test tier thresholds (1300, 1800, 2400)
- [ ] Test "غير مستحق" status for < 1300
- [ ] Test revenue validation (must be exactly 7 days)
- [ ] Test duplicate prevention
- [ ] Test auto-date population
- [ ] Test weekly request timing

### Payroll System Tests
- [ ] Test day 30 restriction
- [ ] Test approval workflow
- [ ] Test one-time-per-month enforcement
- [ ] Test admin-only approval
- [ ] Test timestamp generation

### Integration Tests
- [ ] Test bonus data flows to payroll correctly
- [ ] Test audit trails for all operations
- [ ] Test permission checks
- [ ] Test branch isolation

---

## 6. Database Schema Changes

### Payroll Records Table
```sql
ALTER TABLE payroll_records ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE payroll_records ADD COLUMN approved_by TEXT;
ALTER TABLE payroll_records ADD COLUMN approved_at TEXT;
```

### Bonus Records Table (Already has needed fields)
- `approved` BOOLEAN
- `approved_by` TEXT (via separate table/update)

---

## 7. Deployment Checklist

Before deploying these changes:
- [ ] Run all tests
- [ ] Verify database migrations
- [ ] Test with sample data
- [ ] Review audit logging
- [ ] Test permission restrictions
- [ ] Verify email notifications work
- [ ] Test print/PDF functionality
- [ ] Backup production database
- [ ] Deploy to staging first
- [ ] Get user acceptance testing
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 8. Rollback Plan

If issues arise:
1. Revert code changes via git
2. Run database rollback script:
   ```sql
   ALTER TABLE payroll_records DROP COLUMN status;
   ALTER TABLE payroll_records DROP COLUMN approved_by;
   ALTER TABLE payroll_records DROP COLUMN approved_at;
   ```
3. Clear application cache
4. Notify users of rollback

---

## 9. Documentation Updates

- [ ] Update user guide for new bonus tiers
- [ ] Document payroll approval workflow
- [ ] Update API documentation
- [ ] Add troubleshooting guide
- [ ] Update configuration guide

---

## Notes

- Changes are significant and require thorough testing
- Some changes may impact existing data
- User training may be required
- Consider gradual rollout

**Estimated Implementation Time:** 
- Phase 1: 2-3 days
- Phase 2: 3-4 days
- Phase 3: 2-3 days
- Testing: 2-3 days
- **Total: 9-13 days**
