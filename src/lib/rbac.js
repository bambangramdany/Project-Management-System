// Roles that can see ALL projects regardless of assignment
export const MANAGER_ROLES = ['OWNER', 'PROJECT_MANAGER', 'PRODUCER']

export function canViewAllProjects(role) {
  return MANAGER_ROLES.includes(role) || ['DIRECTOR', 'FINANCE', 'FINANCE_STAFF'].includes(role)
}

// Team leads who maintain the project list (divisi/status/tanggal pelaksanaan)
// for their division even if their role isn't PROJECT_MANAGER/DIRECTOR.
export const PROJECT_LIST_EDITOR_EMAILS = [
  'triwulanaprilia18@gmail.com',
  'irhamalifakhri@gmail.com',
  'bagastyaindrawan@gmail.com',
  'jamal.ludin.jl7@gmail.com',
]

// Can the user use the quick-edit (divisi/status/tanggal) on the projects list?
export function canQuickEditProjects(user) {
  if (!user) return false
  if (canViewAllProjects(user.role)) return true
  return PROJECT_LIST_EDITOR_EMAILS.includes(user.email)
}

export function canEditProject(user, project) {
  if (!user) return false
  if (['OWNER', 'PROJECT_MANAGER', 'PRODUCER'].includes(user.role)) return true
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
  if (user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF') return true
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
  if (user.role === 'FINANCE' || user.role === 'FINANCE_STAFF' || user.role === 'OWNER') return true
  return isFinanceDirector(user)
}

// Can edit budget forecast figures
export function canEditBudget(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF') return true
  if (isFinanceDirector(user)) return true
  if (user.role === 'DIRECTOR' && user.divisi === project.division) return true
  if (project.picId === user.id) return true
  if (user.role === 'PRODUCER') return true
  return false
}

// Margin / project-value forecast: visible only to PM (PIC), Finance team, and Direksi/Owner.
export function canViewMargin(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF') return true
  if (user.role === 'DIRECTOR') return true
  if (project.picId === user.id) return true
  return false
}

// Editing project value (contract value): PM (PIC) and Production roles, plus Finance/Owner.
export function canEditProjectValue(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF') return true
  if (isFinanceDirector(user)) return true
  if (project.picId === user.id) return true
  if (user.role === 'PRODUCER') return true
  return false
}

// Lock/unlock the baseline forecast (quotedAmount/label/rows) once quotation is final.
// Once locked, only actual amounts and notes can still be edited (until unlocked).
export function canLockBudget(user, project) {
  if (!user || !project) return false
  if (user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF') return true
  if (isFinanceDirector(user)) return true
  if (user.role === 'DIRECTOR' && user.divisi === project.division) return true
  return false
}

// ── KPI RBAC ─────────────────────────────────────────────────────────────

// Wulan has cross-team scoring privilege (can score other PMs and any team member)
export const CROSS_TEAM_PM_EMAIL = 'triwulanaprilia18@gmail.com'

// Creative-division peers who may evaluate each other (excluding direksi)
// Jennifer tidak ada penggantinya — posisi dicover Fakhril (Direktur Creative)
const CREATIVE_PEER_EMAILS = [
  'kresensiabs@gmail.com', 'saffiraazkaf@gmail.com',
  'nauvalzikri30@gmail.com', 'kukuhbayuperkasa@gmail.com',
]

// Explicit KPI-scoring org chart per division (in addition to self-assessment,
// which is always allowed). Mirrors the company's reporting structure so each
// person only sees/scores the teammates relevant to them.
export function canScoreKpi(evaluator, target) {
  if (!evaluator || !target) return false
  // Self-assessment: everyone may score their own monthly KPI
  if (evaluator.id === target.id) return true

  const eEmail = evaluator.email
  const tEmail = target.email

  // Owner: can score anyone except fellow Direksi/Owner (those are peers —
  // handled informally / via anonymous notes, not formal KPI scoring)
  if (evaluator.role === 'OWNER') return !['OWNER', 'DIRECTOR'].includes(target.role)

  // Division Directors: score everyone below in their own division
  if (evaluator.role === 'DIRECTOR') {
    if (['OWNER', 'DIRECTOR'].includes(target.role)) return false
    return evaluator.divisi === target.divisi
  }

  // ── Event division ──────────────────────────────────────────────────
  // Wulan (PM Event): nilai tim EVENT + CREATIVE saja, tidak termasuk Finance/PH/GA
  if (eEmail === CROSS_TEAM_PM_EMAIL) {
    if (['OWNER', 'DIRECTOR'].includes(target.role)) return false
    return ['EVENT', 'CREATIVE'].includes(target.divisi)
  }

  // Irham: everyone below (non-PM), plus Wulan specifically
  if (eEmail === 'irhamalifakhri@gmail.com') {
    if (['OWNER', 'DIRECTOR'].includes(target.role)) return false
    if (tEmail === CROSS_TEAM_PM_EMAIL) return true
    return target.role !== 'PROJECT_MANAGER'
  }

  // Julian (Putra) -> Siti Nur (Eca)
  if (eEmail === 'julianputra02@gmail.com') return tEmail === 'fitriah.salsabilah@gmail.com'

  // Doddi <-> Noval Suherman (Reggy), keduanya juga nilai Angga (Boni)
  if (eEmail === 'doddichf@gmail.com') return ['novalsuherman05@gmail.com', 'anggajulfikar20@gmail.com'].includes(tEmail)
  if (eEmail === 'novalsuherman05@gmail.com') return ['doddichf@gmail.com', 'anggajulfikar20@gmail.com'].includes(tEmail)
  // Angga juga bisa nilai Doddi dan Noval (timbal balik)
  if (eEmail === 'anggajulfikar20@gmail.com') return ['doddichf@gmail.com', 'novalsuherman05@gmail.com'].includes(tEmail)

  // ── PH division ──────────────────────────────────────────────────────
  // Bagastya <-> Jamaluddin
  if (eEmail === 'bagastyaindrawan@gmail.com') return tEmail === 'jamal.ludin.jl7@gmail.com'
  if (eEmail === 'jamal.ludin.jl7@gmail.com') return tEmail === 'bagastyaindrawan@gmail.com'

  // ── Creative division ───────────────────────────────────────────────
  // Kresensia/Saffira/Nauval/Kukuh saling nilai sesama Creative (Jennifer tidak ada pengganti)
  if (CREATIVE_PEER_EMAILS.includes(eEmail)) {
    return target.divisi === 'CREATIVE' && !['OWNER', 'DIRECTOR'].includes(target.role)
  }

  // ── Finance / HR / GA division ──────────────────────────────────────
  // Antoni -> Bimantoro
  if (eEmail === 'stevenantoni88@gmail.com') return tEmail === 'hbimantoro@gmail.com'

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
