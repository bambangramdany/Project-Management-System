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

// ── KPI RBAC ─────────────────────────────────────────────────────────────

// Wulan has cross-team scoring privilege (can score other PMs and any team member)
export const CROSS_TEAM_PM_EMAIL = 'wulan@watermark.co.id'

// Roles that may act as evaluator (superior / task giver)
export function canScoreKpi(evaluator, target) {
  if (!evaluator || !target) return false
  if (evaluator.id === target.id) return false
  if (evaluator.role === 'OWNER') return true
  if (['OWNER', 'DIRECTOR'].includes(target.role)) return false
  if (evaluator.role === 'DIRECTOR') return evaluator.divisi === target.divisi
  if (evaluator.email === CROSS_TEAM_PM_EMAIL) return true
  if (evaluator.role === 'PROJECT_MANAGER') return target.role !== 'PROJECT_MANAGER'
  if (['CREATIVE_LEAD', 'FINANCE'].includes(evaluator.role)) return true
  return false
}

// Roles that can view the KPI summary (HR / management)
export function canViewKpiSummary(user) {
  return ['OWNER', 'DIRECTOR', 'FINANCE'].includes(user?.role)
}

// ── Project bonus scoring RBAC ──────────────────────────────────────────

// Can the user open the bonus-scoring tab at all for this project?
export function canScoreProject(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER') return true
  if (user.email === CROSS_TEAM_PM_EMAIL) return true
  if (project.picId === user.id) return true
  if (user.role === 'DIRECTOR' && user.divisi === project.division) return true
  return false
}

// Can `evaluator` score this specific `target` member for this `project`?
// Rules:
// - Nobody scores themselves
// - Directors/Owner are not scored here (use canSubmitDirectorNote instead)
// - OWNER and the special cross-team PM (Wulan) can score anyone, including other PMs
// - A regular PM (PIC of the project) can score their team members, but NOT other PMs
// - Below-PM members can peer-review each other within the same project
export function canScoreProjectMember(evaluator, target, project) {
  if (!evaluator || !target || !project) return false
  if (evaluator.id === target.id) return false
  if (['OWNER', 'DIRECTOR'].includes(target.role)) return false

  if (evaluator.role === 'OWNER') return true
  if (evaluator.email === CROSS_TEAM_PM_EMAIL) return true

  if (evaluator.role === 'PROJECT_MANAGER') {
    if (project.picId !== evaluator.id) return false
    return target.role !== 'PROJECT_MANAGER'
  }

  if (evaluator.role === 'DIRECTOR' && evaluator.divisi === project.division) return true

  // Peer review among non-PM/director/owner members of the same project
  return target.role !== 'PROJECT_MANAGER'
}

// ── Anonymous notes to directors ────────────────────────────────────────

// Anyone below Director/Owner can leave an anonymous note for a director
export function canSubmitDirectorNote(user) {
  if (!user) return false
  return !['OWNER', 'DIRECTOR'].includes(user.role)
}

// Only Owner and the Finance/HRGA director (HR) can see who authored a note
export function canViewDirectorNoteAuthors(user) {
  if (!user) return false
  if (user.role === 'OWNER') return true
  return user.role === 'DIRECTOR' && user.divisi === 'FINANCE_HRGA'
}

// Roles that can see ALL bonus scores & notes across the company (Owner + HR)
export function canViewAllScores(user) {
  if (!user) return false
  if (user.role === 'OWNER') return true
  return user.role === 'DIRECTOR' && user.divisi === 'FINANCE_HRGA'
}
