// Roles that can see ALL projects regardless of assignment
export const MANAGER_ROLES = ['OWNER', 'PROJECT_MANAGER']

export function canViewAllProjects(role) {
  return MANAGER_ROLES.includes(role)
}

export function canEditProject(role) {
  return ['OWNER', 'PROJECT_MANAGER'].includes(role)
}

export function canManageUsers(role) {
  return role === 'OWNER'
}

export function canDeleteProject(role) {
  return role === 'OWNER'
}

// ── Finance / Budget RBAC ────────────────────────────────────────────────

// Can view a project's budget forecast & payment amounts
export function canViewBudget(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER' || user.role === 'FINANCE') return true
  if (user.role === 'DIRECTOR' && user.divisi === project.division) return true
  if (project.picId === user.id) return true
  return false
}

// Can create a payment request (PM/PIC of the project, or Owner)
export function canRequestPayment(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER') return true
  if (user.role === 'PROJECT_MANAGER' && project.picId === user.id) return true
  return false
}

// Can approve/reject as the division Director
export function canApproveAsDirector(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER') return true
  return user.role === 'DIRECTOR' && user.divisi === project.division
}

// Can mark a payment as PAID (Finance team / Owner)
export function canProcessPayment(user) {
  return user?.role === 'FINANCE' || user?.role === 'OWNER'
}

// Can edit budget forecast figures
export function canEditBudget(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER' || user.role === 'FINANCE') return true
  if (user.role === 'DIRECTOR' && user.divisi === project.division) return true
  return false
}
