/**
 * Frontend Permission Management System
 * Handles permission checks, branch selection, and role-based UI rendering
 */

// ==============================================
// Storage Keys
// ==============================================
const STORAGE_KEYS = {
  PERMISSIONS: 'user_permissions',
  SELECTED_BRANCH: 'selected_branch_id',
  SESSION_DATA: 'session_data'
};

// ==============================================
// Session & Permissions Management
// ==============================================

/**
 * Fetch and store user permissions from the session API
 */
async function loadUserPermissions() {
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/auth/login';
        return null;
      }
      throw new Error('Failed to load session');
    }

    const data = await response.json();
    if (data.success && data.session) {
      // Store permissions in localStorage
      localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(data.session.permissions));
      localStorage.setItem(STORAGE_KEYS.SESSION_DATA, JSON.stringify(data.session));

      // Set default branch if user has a branch
      if (data.session.permissions.branchId && !localStorage.getItem(STORAGE_KEYS.SELECTED_BRANCH)) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_BRANCH, data.session.permissions.branchId);
      }

      return data.session.permissions;
    }
    return null;
  } catch (error) {
    console.error('Error loading permissions:', error);
    return null;
  }
}

/**
 * Get cached user permissions from localStorage
 */
function getUserPermissions() {
  const permissionsJson = localStorage.getItem(STORAGE_KEYS.PERMISSIONS);
  if (!permissionsJson) {
    return null;
  }
  try {
    return JSON.parse(permissionsJson);
  } catch (error) {
    console.error('Error parsing permissions:', error);
    return null;
  }
}

/**
 * Get cached session data
 */
function getSessionData() {
  const sessionJson = localStorage.getItem(STORAGE_KEYS.SESSION_DATA);
  if (!sessionJson) {
    return null;
  }
  try {
    return JSON.parse(sessionJson);
  } catch (error) {
    console.error('Error parsing session:', error);
    return null;
  }
}

/**
 * Clear all cached permissions and session data
 */
function clearPermissions() {
  localStorage.removeItem(STORAGE_KEYS.PERMISSIONS);
  localStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
  localStorage.removeItem(STORAGE_KEYS.SELECTED_BRANCH);
}

// ==============================================
// Permission Checking Functions
// ==============================================

/**
 * Check if user has a specific permission
 * @param {string} permission - Permission name (e.g., 'canAddRevenue')
 * @returns {boolean}
 */
function hasPermission(permission) {
  const permissions = getUserPermissions();
  if (!permissions) return false;
  return permissions[permission] === true || permissions[permission] === 1;
}

/**
 * Check if user has any of the specified permissions
 * @param {string[]} permissionList - Array of permission names
 * @returns {boolean}
 */
function hasAnyPermission(...permissionList) {
  return permissionList.some(perm => hasPermission(perm));
}

/**
 * Check if user has all of the specified permissions
 * @param {string[]} permissionList - Array of permission names
 * @returns {boolean}
 */
function hasAllPermissions(...permissionList) {
  return permissionList.every(perm => hasPermission(perm));
}

/**
 * Check if user is an admin
 * @returns {boolean}
 */
function isAdmin() {
  const permissions = getUserPermissions();
  return permissions?.roleName === 'Admin';
}

/**
 * Check if user is a supervisor
 * @returns {boolean}
 */
function isSupervisor() {
  const permissions = getUserPermissions();
  return permissions?.roleName === 'Supervisor';
}

/**
 * Check if user is an employee
 * @returns {boolean}
 */
function isEmployee() {
  const permissions = getUserPermissions();
  return permissions?.roleName === 'Employee';
}

/**
 * Check if user is a partner
 * @returns {boolean}
 */
function isPartner() {
  const permissions = getUserPermissions();
  return permissions?.roleName === 'Partner';
}

/**
 * Get user's role name (in Arabic)
 * @returns {string}
 */
function getRoleName() {
  const permissions = getUserPermissions();
  return permissions?.roleNameAr || 'غير معروف';
}

/**
 * Get user's branch ID
 * @returns {string|null}
 */
function getUserBranchId() {
  const permissions = getUserPermissions();
  return permissions?.branchId || null;
}

/**
 * Get user's branch name
 * @returns {string|null}
 */
function getUserBranchName() {
  const permissions = getUserPermissions();
  return permissions?.branchName || null;
}

/**
 * Get username
 * @returns {string}
 */
function getUsername() {
  const permissions = getUserPermissions();
  return permissions?.username || 'مستخدم';
}

// ==============================================
// Branch Selection
// ==============================================

/**
 * Get currently selected branch ID
 * @returns {string|null}
 */
function getSelectedBranchId() {
  return localStorage.getItem(STORAGE_KEYS.SELECTED_BRANCH);
}

/**
 * Set selected branch ID
 * @param {string} branchId
 */
function setSelectedBranchId(branchId) {
  localStorage.setItem(STORAGE_KEYS.SELECTED_BRANCH, branchId);
  // Trigger custom event for branch change
  window.dispatchEvent(new CustomEvent('branchChanged', { detail: { branchId } }));
}

/**
 * Check if user can access specific branch
 * @param {string} branchId
 * @returns {boolean}
 */
function canAccessBranch(branchId) {
  const permissions = getUserPermissions();
  if (!permissions) return false;

  // Admins with canViewAllBranches can access any branch
  if (permissions.canViewAllBranches) return true;

  // Others can only access their own branch
  return permissions.branchId === branchId;
}

// ==============================================
// UI Helper Functions
// ==============================================

/**
 * Show element if user has permission, hide otherwise
 * @param {string|HTMLElement} elementOrSelector
 * @param {string} permission
 */
function showIfHasPermission(elementOrSelector, permission) {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector;

  if (!element) return;

  if (hasPermission(permission)) {
    element.style.display = '';
    element.classList.remove('hidden');
  } else {
    element.style.display = 'none';
    element.classList.add('hidden');
  }
}

/**
 * Show element if user has any of the permissions, hide otherwise
 * @param {string|HTMLElement} elementOrSelector
 * @param {string[]} permissions
 */
function showIfHasAnyPermission(elementOrSelector, ...permissions) {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector;

  if (!element) return;

  if (hasAnyPermission(...permissions)) {
    element.style.display = '';
    element.classList.remove('hidden');
  } else {
    element.style.display = 'none';
    element.classList.add('hidden');
  }
}

/**
 * Enable/disable element based on permission
 * @param {string|HTMLElement} elementOrSelector
 * @param {string} permission
 */
function enableIfHasPermission(elementOrSelector, permission) {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector;

  if (!element) return;

  if (hasPermission(permission)) {
    element.disabled = false;
    element.classList.remove('opacity-50', 'cursor-not-allowed');
  } else {
    element.disabled = true;
    element.classList.add('opacity-50', 'cursor-not-allowed');
  }
}

/**
 * Show role badge in the UI
 * @param {string|HTMLElement} elementOrSelector
 */
function displayRoleBadge(elementOrSelector) {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector;

  if (!element) return;

  const roleName = getRoleName();
  const roleColors = {
    'مدير النظام': 'bg-red-100 text-red-800',
    'مشرف': 'bg-blue-100 text-blue-800',
    'موظف': 'bg-green-100 text-green-800',
    'شريك': 'bg-purple-100 text-purple-800'
  };

  const colorClass = roleColors[roleName] || 'bg-gray-100 text-gray-800';
  element.innerHTML = `<span class="px-2 py-1 text-xs rounded-full ${colorClass}">${roleName}</span>`;
}

/**
 * Display branch info in the UI
 * @param {string|HTMLElement} elementOrSelector
 */
function displayBranchInfo(elementOrSelector) {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector;

  if (!element) return;

  const branchName = getUserBranchName();
  if (branchName) {
    element.textContent = branchName;
  } else {
    element.textContent = 'جميع الفروع';
  }
}

// ==============================================
// Permission-based Navigation
// ==============================================

/**
 * Get navigation items based on user permissions
 * @returns {Array<{name: string, href: string, icon: string, permission?: string}>}
 */
function getNavigationItems() {
  const allItems = [
    { name: 'لوحة التحكم', href: '/dashboard', icon: 'dashboard' },
    { name: 'الإيرادات', href: '/revenues', icon: 'revenue', permission: 'canViewReports' },
    { name: 'المصروفات', href: '/expenses', icon: 'expense', permission: 'canViewReports' },
    { name: 'الموظفين', href: '/employees', icon: 'employees', permission: 'canViewReports' },
    { name: 'البونص', href: '/bonus', icon: 'bonus', permission: 'canManageBonus' },
    { name: 'طلبات الموظفين', href: '/employee-requests', icon: 'requests', permission: 'canManageRequests' },
    { name: 'طلباتي', href: '/my-requests', icon: 'my-requests', permission: 'canSubmitRequests' },
    { name: 'السلف والخصومات', href: '/advances-deductions', icon: 'advances', permission: 'canManageEmployees' },
    { name: 'طلبات المنتجات', href: '/product-orders', icon: 'orders', permission: 'canManageOrders' },
    { name: 'الرواتب', href: '/payroll', icon: 'payroll', permission: 'canGeneratePayroll' },
    { name: 'الفروع', href: '/branches', icon: 'branches', permission: 'canManageBranches' },
    { name: 'المستخدمين', href: '/users', icon: 'users', permission: 'canManageUsers' },
    { name: 'إعدادات البريد', href: '/email-settings', icon: 'email', permission: 'canManageSettings' },
    { name: 'المساعد الذكي', href: '/ai-assistant', icon: 'ai' }
  ];

  // Filter items based on permissions
  return allItems.filter(item => {
    if (!item.permission) return true; // No permission required
    return hasPermission(item.permission);
  });
}

// ==============================================
// Initialization
// ==============================================

/**
 * Initialize permissions on page load
 * Call this function when the page loads
 */
async function initPermissions() {
  const permissions = await loadUserPermissions();

  if (!permissions) {
    console.warn('Failed to load user permissions');
    return false;
  }

  // Display user info
  displayRoleBadge('#user-role-badge');
  displayBranchInfo('#user-branch-info');

  // Trigger permission-loaded event
  window.dispatchEvent(new CustomEvent('permissionsLoaded', { detail: { permissions } }));

  return true;
}

// ==============================================
// Export (for use in other scripts)
// ==============================================

window.PermissionsManager = {
  // Init
  init: initPermissions,

  // Storage management
  load: loadUserPermissions,
  get: getUserPermissions,
  clear: clearPermissions,

  // Permission checks
  has: hasPermission,
  hasAny: hasAnyPermission,
  hasAll: hasAllPermissions,

  // Role checks
  isAdmin,
  isSupervisor,
  isEmployee,
  isPartner,

  // User info
  getUsername,
  getRoleName,
  getUserBranchId,
  getUserBranchName,
  getSessionData,

  // Branch management
  getSelectedBranchId,
  setSelectedBranchId,
  canAccessBranch,

  // UI helpers
  showIfHasPermission,
  showIfHasAnyPermission,
  enableIfHasPermission,
  displayRoleBadge,
  displayBranchInfo,

  // Navigation
  getNavigationItems
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPermissions);
} else {
  initPermissions();
}
