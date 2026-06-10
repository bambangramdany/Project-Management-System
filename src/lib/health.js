// Computes a simple "health" indicator for a project based on overdue tasks,
// budget overrun, and event-readiness — used to flag projects needing attention.

const PRE_EVENT_STATUSES = ['HOLD', 'PITCHING', 'WAITING_PITCH_RESULT', 'PREPARATION']
const CLOSED_STATUSES = ['DONE', 'FAILED', 'CANCELED']

export function computeProjectHealth(project, now = new Date()) {
  if (CLOSED_STATUSES.includes(project.status)) {
    return { level: 'gray', reasons: [] }
  }

  const reasons = []
  const tasks = project.tasks || []
  const budgetItems = project.budgetItems || []

  const overdueTasks = tasks.filter(t => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now)
  if (overdueTasks.length > 0) {
    reasons.push(`${overdueTasks.length} task lewat deadline`)
  }

  const totalQuoted = budgetItems.reduce((s, b) => s + (b.quotedAmount || 0), 0)
  const totalActual = budgetItems.reduce((s, b) => s + (b.actualAmount ?? b.quotedAmount ?? 0), 0)
  let overrunPct = 0
  if (totalQuoted > 0) {
    overrunPct = ((totalActual - totalQuoted) / totalQuoted) * 100
    if (overrunPct > 0) {
      reasons.push(`Budget over ${overrunPct.toFixed(0)}%`)
    }
  }

  let eventSoonNotReady = false
  if (project.startDate && PRE_EVENT_STATUSES.includes(project.status)) {
    const daysToEvent = (new Date(project.startDate) - now) / (1000 * 60 * 60 * 24)
    if (daysToEvent <= 7 && daysToEvent >= 0 && project.status !== 'PREPARATION' || (project.status === 'PREPARATION' && daysToEvent <= 2 && daysToEvent >= 0)) {
      eventSoonNotReady = true
      reasons.push(`Event ${daysToEvent < 1 ? 'hari ini/besok' : `${Math.ceil(daysToEvent)} hari lagi`}, status masih ${project.status}`)
    }
  }

  let level = 'green'
  if (overdueTasks.length >= 3 || overrunPct > 10 || eventSoonNotReady) {
    level = 'red'
  } else if (overdueTasks.length >= 1 || overrunPct > 0) {
    level = 'yellow'
  }

  return { level, reasons }
}

export const HEALTH_LABEL = {
  green: 'Sehat',
  yellow: 'Perlu Perhatian',
  red: 'Kritis',
  gray: 'Selesai',
}

export const HEALTH_COLOR = {
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-400',
}

export const HEALTH_DOT = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-gray-300',
}
