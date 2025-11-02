/**
 * Branch-Specific Notification System
 * Routes email notifications to branch supervisors
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface BranchSupervisor {
  userId: string;
  username: string;
  email: string | null;
  fullName: string;
  branchId: string;
  branchName: string;
}

/**
 * Get supervisor emails for a specific branch
 * Returns supervisor emails who should receive notifications for this branch
 *
 * @param db - D1 Database instance
 * @param branchId - Branch ID to get supervisors for
 * @returns Array of supervisor email addresses
 */
export async function getBranchSupervisorEmails(
  db: D1Database,
  branchId: string
): Promise<string[]> {
  try {
    const result = await db
      .prepare(
        `
        SELECT u.email
        FROM users_new u
        WHERE u.branch_id = ?
          AND u.role_id = 'role_supervisor'
          AND u.is_active = 1
          AND u.email IS NOT NULL
          AND u.email != ''
      `
      )
      .bind(branchId)
      .all();

    if (!result.results || result.results.length === 0) {
      return [];
    }

    return result.results.map((row: any) => row.email).filter(Boolean);
  } catch (error) {
    console.error('Error fetching branch supervisor emails:', error);
    return [];
  }
}

/**
 * Get all supervisor details for a branch
 *
 * @param db - D1 Database instance
 * @param branchId - Branch ID to get supervisors for
 * @returns Array of supervisor details
 */
export async function getBranchSupervisors(
  db: D1Database,
  branchId: string
): Promise<BranchSupervisor[]> {
  try {
    const result = await db
      .prepare(
        `
        SELECT
          u.id as userId,
          u.username,
          u.email,
          u.full_name as fullName,
          u.branch_id as branchId,
          b.name_ar as branchName
        FROM users_new u
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.branch_id = ?
          AND u.role_id = 'role_supervisor'
          AND u.is_active = 1
      `
      )
      .bind(branchId)
      .all();

    if (!result.results || result.results.length === 0) {
      return [];
    }

    return result.results as BranchSupervisor[];
  } catch (error) {
    console.error('Error fetching branch supervisors:', error);
    return [];
  }
}

/**
 * Get all admin emails (for system-wide notifications)
 *
 * @param db - D1 Database instance
 * @returns Array of admin email addresses
 */
export async function getAdminEmails(db: D1Database): Promise<string[]> {
  try {
    const result = await db
      .prepare(
        `
        SELECT u.email
        FROM users_new u
        WHERE u.role_id = 'role_admin'
          AND u.is_active = 1
          AND u.email IS NOT NULL
          AND u.email != ''
      `
      )
      .all();

    if (!result.results || result.results.length === 0) {
      return [];
    }

    return result.results.map((row: any) => row.email).filter(Boolean);
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    return [];
  }
}

/**
 * Get notification recipients for a branch event
 * Returns both branch supervisors and admins
 *
 * @param db - D1 Database instance
 * @param branchId - Branch ID
 * @param includeAdmins - Whether to include admins in recipients (default: true)
 * @returns Array of email addresses
 */
export async function getNotificationRecipients(
  db: D1Database,
  branchId: string,
  includeAdmins: boolean = true
): Promise<string[]> {
  const supervisorEmails = await getBranchSupervisorEmails(db, branchId);

  if (includeAdmins) {
    const adminEmails = await getAdminEmails(db);
    return [...new Set([...supervisorEmails, ...adminEmails])]; // Remove duplicates
  }

  return supervisorEmails;
}

/**
 * Send notification to branch supervisors and optionally admins
 *
 * @param db - D1 Database instance
 * @param branchId - Branch ID
 * @param sendEmailFn - Function to send email (receives array of email addresses)
 * @param includeAdmins - Whether to include admins (default: true)
 */
export async function notifyBranch(
  db: D1Database,
  branchId: string,
  sendEmailFn: (recipients: string[]) => Promise<void>,
  includeAdmins: boolean = true
): Promise<void> {
  try {
    const recipients = await getNotificationRecipients(db, branchId, includeAdmins);

    if (recipients.length === 0) {
      console.warn(`No notification recipients found for branch ${branchId}`);
      return;
    }

    await sendEmailFn(recipients);

    console.log(
      `Branch notification sent to ${recipients.length} recipients for branch ${branchId}`
    );
  } catch (error) {
    console.error('Error sending branch notification:', error);
    throw error;
  }
}
