export const STATUS_PIPELINE = [
  'HOLD', 'PITCHING', 'WAITING_PITCH_RESULT', 'PREPARATION',
  'EVENT_DAY', 'REPORTING', 'INVOICING', 'DONE', 'FAILED', 'CANCELED',
]

export const STATUS_LABEL = {
  HOLD: 'Hold',
  PITCHING: 'Pitching',
  WAITING_PITCH_RESULT: 'Waiting Result',
  PREPARATION: 'Preparation',
  EVENT_DAY: 'Event Day',
  REPORTING: 'Reporting',
  INVOICING: 'Invoicing',
  DONE: 'Done',
  FAILED: 'Failed',
  CANCELED: 'Canceled',
}

export const STATUS_COLOR = {
  HOLD: 'bg-gray-100 text-gray-600',
  PITCHING: 'bg-blue-100 text-blue-700',
  WAITING_PITCH_RESULT: 'bg-yellow-100 text-yellow-700',
  PREPARATION: 'bg-orange-100 text-orange-700',
  EVENT_DAY: 'bg-purple-100 text-purple-700',
  REPORTING: 'bg-indigo-100 text-indigo-700',
  INVOICING: 'bg-teal-100 text-teal-700',
  DONE: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELED: 'bg-slate-100 text-slate-500',
}

export const PITCH_RESULT_COLOR = {
  WIN: 'bg-green-100 text-green-700',
  LOSE: 'bg-red-100 text-red-700',
  NOT_FINAL: 'bg-yellow-100 text-yellow-700',
}

export const CATEGORY_LABEL = {
  MEETING_CONFERENCE: 'Meeting & Conference',
  ACTIVATION: 'Activation',
  LAUNCHING: 'Launching',
  EXHIBITION: 'Exhibition',
  INCENTIVE_GATHERING: 'Incentive & Gathering',
  SPONSORSHIP: 'Sponsorship',
}

export const BUDGET_TIER_LABEL = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

export const RECOMMENDATION_ICON = {
  MAINTAIN: '👍 Maintain',
  PRIORITIZE: '🔥 Prioritize',
  EVALUATE: '⚠️ Evaluate',
}

export const ACTIVE_STATUSES = ['HOLD', 'PITCHING', 'WAITING_PITCH_RESULT', 'PREPARATION', 'EVENT_DAY', 'REPORTING', 'INVOICING']
export const CLOSED_STATUSES = ['DONE', 'FAILED', 'CANCELED']
export const WON_STATUSES = ['PREPARATION', 'EVENT_DAY', 'REPORTING', 'INVOICING', 'DONE']
