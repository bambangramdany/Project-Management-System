// Roles that can see ALL projects regardless of assignment
export const MANAGER_ROLES = ['OWNER', 'PROJECT_MANAGER']

export function canViewAllProjects(role) {
  return MANAGER_ROLES.includes(role) || ['DIRECTOR', 'FINANCE'].includes(role)
}

export function canEditProject(user, project) {
  if (!user) return false
  if (['OWNER', 'PROJECT_MANAGER'].includes(user.role)) return true
  // Division directors (Event/PH/Creative) can edit projects in their own division
  if (user.role === 'DIRECTOR' && project && user.divisi === project.division) return true
  return false
}

export function canManageUsers(role) {
  return role === 'OWNER'
}

export function canDeleteProject(role) {
  return role === 'OWNER'
}

// ── Finance / Budget RBAC ────────────────────────────────────────────────

// Anung — the Finance & HRGA Director — has full finance visibility/control
// equivalent to the Owner, since he runs approval & payment execution.
export function isFinanceDirector(user) {
  return !!user && user.role === 'DIRECTOR' && user.divisi === 'FINANCE_HRGA'
}

// Can view a project's budget forecast & payment amounts
export function canViewBudget(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER' || user.role === 'FINANCE') return true
  if (isFinanceDirector(user)) return true
  if (user.role === 'DIRECTOR' && user.divisi === project.division) return true
  if (project.picId === user.id) return true
  return false
}

// Can create a payment request (PM/PIC of the project, division director, or Owner)
export function canRequestPayment(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER') return true
  if (user.role === 'PROJECT_MANAGER' && project.picId === user.id) return true
  if (user.role === 'DIRECTOR' && user.divisi === project.division) return true
  return false
}

// Legacy stage: division Director (Event/PH/Creative) approval — kept for any
// payment requests still pending under the old single-track flow.
export function canApproveAsDirector(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER') return true
  return user.role === 'DIRECTOR' && user.divisi === project.division
}

// Stage 1 (only when the requester is a division Director): Owner approves first
export function canApproveAsOwner(user) {
  return user?.role === 'OWNER'
}

// Stage 1: Finance & HRGA Director (Anung) approval — required for ALL expenses
export function canApproveAsFinanceDirector(user) {
  if (!user) return false
  if (user.role === 'OWNER') return true
  return isFinanceDirector(user)
}

// Stage 2: Can mark a payment as PAID (Finance team / Anung as backup / Owner)
export function canProcessPayment(user) {
  if (!user) return false
  if (user.role === 'FINANCE' || user.role === 'OWNER') return true
  return isFinanceDirector(user)
}

// Can edit budget forecast figures
export function canEditBudget(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER' || user.role === 'FINANCE') return true
  if (isFinanceDirector(user)) return true
  if (user.role === 'DIRECTOR' && user.divisi === project.division) return true
  if (project.picId === user.id) return true
  if (user.role === 'PRODUCTION') return true
  return false
}

// Margin / project-value forecast: visible only to PM (PIC), Finance team, and Direksi/Owner.
export function canViewMargin(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER' || user.role === 'FINANCE') return true
  if (user.role === 'DIRECTOR') return true
  if (project.picId === user.id) return true
  return false
}

// Editing project value (contract value): PM (PIC) and Production roles, plus Finance/Owner.
export function canEditProjectValue(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER' || user.role === 'FINANCE') return true
  if (isFinanceDirector(user)) return true
  if (project.picId === user.id) return true
  if (user.role === 'PRODUCTION') return true
  return false
}

// Lock/unlock the baseline forecast (quotedAmount/label/rows) once quotation is final.
// Once locked, only actual amounts and notes can still be edited (until unlocked).
export function canLockBudget(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER' || user.role === 'FINANCE') return true
  if (isFinanceDirector(user)) return true
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
