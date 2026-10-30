import type { APIRoute } from 'astro';
import { financeAuth, ok, canApproveFinance } from '@/lib/finance/http';
import { DEFAULT_PROFILE, getOrganizationProfile } from '@/lib/finance/documents';

// Everything a finance page needs to render for the current user:
// identity, permission flags, the branches they may pick, and the org profile.
export const GET: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;
  const p = session.permissions;

  let branches: Array<{ id: string; name: string }> = [];
  try {
    const result = p.canViewAllBranches
      ? await db.prepare('SELECT * FROM branches WHERE is_active = 1 OR is_active IS NULL').all<Record<string, unknown>>()
      : session.branchId
        ? await db.prepare('SELECT * FROM branches WHERE id = ?').bind(session.branchId).all<Record<string, unknown>>()
        : { results: [] as Record<string, unknown>[] };
    branches = (result.results ?? [])
      .map(row => ({ id: String(row.id), name: String(row.name_ar ?? row.name ?? row.branch_name ?? row.id) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  } catch (error) {
    console.error('Failed to load branches for finance context:', error);
  }

  let org = DEFAULT_PROFILE;
  try {
    org = await getOrganizationProfile(db);
  } catch (error) {
    console.error('Failed to load organization profile for finance context:', error);
  }

  return ok({
    context: {
      user: {
        id: actor.id,
        username: actor.username,
        displayName: actor.displayName,
        roleName: actor.roleName,
        roleNameAr: actor.roleNameAr,
        branchId: session.branchId,
        branchName: p.branchName,
      },
      permissions: {
        canViewAllBranches: p.canViewAllBranches,
        canViewReports: p.canViewReports,
        canManageEmployees: p.canManageEmployees,
        canManageRequests: p.canManageRequests,
        canApproveRequests: p.canApproveRequests,
        canSubmitRequests: p.canSubmitRequests,
        canViewOwnRequests: p.canViewOwnRequests,
        canGeneratePayroll: p.canGeneratePayroll,
        canManageBonus: p.canManageBonus,
        canViewOwnBonus: p.canViewOwnBonus,
        canManageSettings: p.canManageSettings,
        canApproveFinance: canApproveFinance(session),
      },
      branches,
      organization: {
        companyNameAr: org.companyNameAr,
        companyNameEn: org.companyNameEn,
        currency: org.currency,
        vatRate: org.vatRate,
      },
    },
  });
};
