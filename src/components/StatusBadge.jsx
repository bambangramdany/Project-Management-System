import { STATUS_LABEL, STATUS_COLOR, PITCH_RESULT_COLOR } from '@/lib/constants'
import clsx from 'clsx'

export function StatusBadge({ status }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLOR[status] || 'bg-gray-100 text-gray-600')}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

export function PitchResultBadge({ result }) {
  if (!result) return null
  const labels = { WIN: 'Win', LOSE: 'Lose', NOT_FINAL: 'Not Final' }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', PITCH_RESULT_COLOR[result] || 'bg-gray-100 text-gray-600')}>
      {labels[result] || result}
    </span>
  )
}

export function CategoryBadge({ category }) {
  const labels = {
    MEETING_CONFERENCE: 'M&C',
    ACTIVATION: 'Activation',
    LAUNCHING: 'Launching',
    EXHIBITION: 'Exhibition',
    INCENTIVE_GATHERING: 'Incentive',
    SPONSORSHIP: 'Sponsorship',
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
      {labels[category] || category}
    </span>
  )
}
