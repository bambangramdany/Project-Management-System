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

// SOP checklist templates — auto-generated as tasks when a project of the
// matching category is created, so no standard step gets skipped.
// `priority` defaults to MEDIUM if omitted.
const GENERAL_SOP_TASKS = [
  { title: 'Brief & kebutuhan klien dikonfirmasi', priority: 'HIGH' },
  { title: 'Susun proposal & RAB awal', priority: 'HIGH' },
  { title: 'Survey lokasi / venue', priority: 'MEDIUM' },
  { title: 'Konfirmasi vendor utama', priority: 'MEDIUM' },
  { title: 'Susun rundown acara', priority: 'MEDIUM' },
  { title: 'Briefing tim & vendor H-1', priority: 'HIGH' },
  { title: 'Pelaksanaan event', priority: 'HIGH' },
  { title: 'Dokumentasi & laporan akhir', priority: 'MEDIUM' },
  { title: 'Invoice & penagihan ke klien', priority: 'MEDIUM' },
]

export const SOP_TEMPLATES = {
  MEETING_CONFERENCE: [
    ...GENERAL_SOP_TASKS,
    { title: 'Setup ruang meeting & perlengkapan AV', priority: 'MEDIUM' },
    { title: 'Konfirmasi daftar peserta & undangan', priority: 'MEDIUM' },
  ],
  ACTIVATION: [
    ...GENERAL_SOP_TASKS,
    { title: 'Desain & produksi materi aktivasi (booth/branding)', priority: 'HIGH' },
    { title: 'Rekrutmen & briefing SPG/SPB/talent', priority: 'MEDIUM' },
  ],
  LAUNCHING: [
    ...GENERAL_SOP_TASKS,
    { title: 'Konsep kreatif & desain panggung disetujui klien', priority: 'HIGH' },
    { title: 'Koordinasi media & undangan press', priority: 'MEDIUM' },
  ],
  EXHIBITION: [
    ...GENERAL_SOP_TASKS,
    { title: 'Desain & produksi booth pameran', priority: 'HIGH' },
    { title: 'Koordinasi dengan penyelenggara pameran', priority: 'MEDIUM' },
  ],
  INCENTIVE_GATHERING: [
    ...GENERAL_SOP_TASKS,
    { title: 'Booking akomodasi & transportasi peserta', priority: 'HIGH' },
    { title: 'Susun itinerary acara/perjalanan', priority: 'MEDIUM' },
  ],
  SPONSORSHIP: [
    ...GENERAL_SOP_TASKS,
    { title: 'Finalisasi perjanjian sponsorship & deliverables', priority: 'HIGH' },
    { title: 'Laporan exposure/deliverables ke sponsor', priority: 'MEDIUM' },
  ],
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

// ── Workload scoring ─────────────────────────────────────────────────────
// Default weight each project stage contributes to a person's workload score —
// separate weights for the PIC (PM/owner of the project) vs. other members,
// since not every stage requires every team member's involvement.
export const DEFAULT_WORKLOAD_WEIGHTS = {
  HOLD:                 { picWeight: 0,   memberWeight: 0 },
  PITCHING:             { picWeight: 1,   memberWeight: 0.5 },
  WAITING_PITCH_RESULT: { picWeight: 1,   memberWeight: 0 },
  PREPARATION:          { picWeight: 1,   memberWeight: 1 },
  EVENT_DAY:            { picWeight: 1.5, memberWeight: 1.5 },
  REPORTING:            { picWeight: 1,   memberWeight: 0.5 },
  INVOICING:            { picWeight: 0.5, memberWeight: 0 },
  DONE:                 { picWeight: 0,   memberWeight: 0 },
  FAILED:               { picWeight: 0,   memberWeight: 0 },
  CANCELED:             { picWeight: 0,   memberWeight: 0 },
}

// ── Finance ──────────────────────────────────────────────────────────────

export const DIVISION_LABEL = {
  EVENT: 'Event',
  CREATIVE: 'Creative',
  PH: 'Production House',
  FINANCE_HRGA: 'Finance / HR / GA',
}

export const EXPENSE_CATEGORIES = [
  'TICKET_TRANSPORT', 'ACCOMMODATION', 'VENUE_DP', 'VENUE_FINAL',
  'VENDOR_DP', 'VENDOR_FINAL', 'TALENT_HONOR', 'OPERATIONAL_OTHER',
]

export const EXPENSE_CATEGORY_LABEL = {
  TICKET_TRANSPORT: 'Tiket & Transport',
  ACCOMMODATION: 'Akomodasi',
  VENUE_DP: 'DP Venue',
  VENUE_FINAL: 'Pelunasan Venue',
  VENDOR_DP: 'DP Vendor',
  VENDOR_FINAL: 'Pelunasan Vendor',
  TALENT_HONOR: 'Talent / Honor',
  OPERATIONAL_OTHER: 'Operasional Lain',
}

export const PAYMENT_STATUS_LABEL = {
  PENDING_DIRECTOR: 'Menunggu Approval Direktur Divisi',
  PENDING_OWNER: 'Menunggu Approval Direktur Utama',
  PENDING_FINANCE_DIRECTOR: 'Menunggu Approval Direktur Finance',
  APPROVED_BY_DIRECTOR: 'Disetujui, Menunggu Pembayaran',
  REJECTED: 'Ditolak',
  PAID: 'Sudah Dibayar',
}

// Ordered approval pipeline, used to render a progress stepper.
// Most requests go straight to the Finance Director; requests submitted by a
// division director (Event/PH) get an extra Owner approval step first.
export const PAYMENT_STAGES = [
  { key: 'PENDING_FINANCE_DIRECTOR', label: 'Direktur Finance' },
  { key: 'APPROVED_BY_DIRECTOR', label: 'Pembayaran' },
  { key: 'PAID', label: 'Selesai' },
]

export const PAYMENT_STAGES_WITH_OWNER = [
  { key: 'PENDING_OWNER', label: 'Direktur Utama' },
  { key: 'PENDING_FINANCE_DIRECTOR', label: 'Direktur Finance' },
  { key: 'APPROVED_BY_DIRECTOR', label: 'Pembayaran' },
  { key: 'PAID', label: 'Selesai' },
]

// ── KPI ──────────────────────────────────────────────────────────────────

// General KPI per role — placeholder for further discussion with each director
export const KPI_BY_ROLE = {
  PROJECT_MANAGER: [
    { key: 'win_rate', label: 'Win rate pitching ≥ 60%' },
    { key: 'on_time_budget', label: 'Project selesai sesuai timeline & budget' },
    { key: 'client_satisfaction', label: 'Kepuasan klien (feedback / repeat order)' },
    { key: 'reporting', label: 'Laporan progress & invoicing tepat waktu' },
  ],
  PROJECT_OFFICER: [
    { key: 'execution_sop', label: 'Eksekusi lapangan sesuai brief & SOP' },
    { key: 'on_time_event', label: 'Ketepatan waktu persiapan & event day' },
    { key: 'documentation', label: 'Dokumentasi & laporan event lengkap' },
  ],
  PRODUCTION: [
    { key: 'equipment_ready', label: 'Kelengkapan & kesiapan alat/produksi' },
    { key: 'zero_issue', label: 'Zero technical issue saat event/shooting' },
    { key: 'budget_efficiency', label: 'Efisiensi penggunaan budget produksi' },
  ],
  CREATIVE_LEAD: [
    { key: 'concept_approved', label: 'Konsep kreatif disetujui klien di percobaan pertama' },
    { key: 'on_time_deliverable', label: 'Ketepatan waktu deliverable tim creative' },
    { key: 'quality_consistency', label: 'Konsistensi kualitas & branding' },
  ],
  GRAPHIC_DESIGNER: [
    { key: 'on_time_design', label: 'Ketepatan waktu desain sesuai deadline' },
    { key: 'minimal_revision', label: 'Revisi minimal (≤2x per deliverable)' },
    { key: 'brand_guideline', label: 'Kesesuaian dengan brand guideline' },
  ],
  STAGE_DESIGNER: [
    { key: 'design_brief_budget', label: 'Desain panggung/3D sesuai brief & budget' },
    { key: 'on_time_file', label: 'Ketepatan waktu delivery file produksi' },
  ],
  CONTENT_CREATOR: [
    { key: 'content_calendar', label: 'Output konten sesuai kalender konten' },
    { key: 'engagement', label: 'Engagement / kualitas konten' },
    { key: 'on_time_publish', label: 'Ketepatan waktu editing & publish' },
  ],
  FINANCE: [
    { key: 'payment_sla', label: 'Proses pembayaran tepat waktu (sesuai SLA)' },
    { key: 'budget_accuracy', label: 'Akurasi laporan budget vs realisasi' },
    { key: 'compliance', label: 'Kepatuhan dokumen & approval' },
  ],
  MEMBER: [
    { key: 'task_on_time', label: 'Penyelesaian task sesuai deadline' },
    { key: 'admin_complete', label: 'Kelengkapan administrasi & dokumentasi' },
  ],
  DIRECTOR: [
    { key: 'approval_speed', label: 'Approval pengajuan tepat waktu' },
    { key: 'team_health', label: 'Kesehatan pipeline & utilisasi tim divisi' },
  ],
}

export const KPI_SCORE_LABEL = { 1: 'Kurang', 2: 'Cukup', 3: 'Baik', 4: 'Sangat Baik', 5: 'Istimewa' }

// Day of month by which the current month's KPI assessment must be submitted.
// Submissions after this date are flagged "late" and the activity/project shifts to next period.
export const KPI_DEADLINE_DAY = 23

// Determine the KPI period (YYYY-MM) a date should be scored under, applying the deadline rule:
// activities/evaluations occurring after the deadline day roll into the next month's period.
export function resolveKpiPeriod(date = new Date()) {
  let y = date.getFullYear()
  let m = date.getMonth() // 0-indexed
  if (date.getDate() > KPI_DEADLINE_DAY) {
    m += 1
    if (m > 11) { m = 0; y += 1 }
  }
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

// ── Project bonus scoring (per-project, independent of monthly KPI cycle) ──
export const PROJECT_SCORE_CRITERIA = [
  { key: 'contribution', label: 'Kontribusi terhadap keberhasilan project' },
  { key: 'quality', label: 'Kualitas eksekusi pekerjaan' },
  { key: 'teamwork', label: 'Kerjasama & komunikasi tim' },
]

export const PAYMENT_TERM_LABEL = {
  DP: 'DP (Uang Muka)',
  PELUNASAN: 'Pelunasan',
  FULL: 'Pelunasan Sekaligus',
}

export const PAYMENT_STATUS_COLOR = {
  PENDING_DIRECTOR: 'bg-yellow-100 text-yellow-700',
  PENDING_OWNER: 'bg-purple-100 text-purple-700',
  PENDING_FINANCE_DIRECTOR: 'bg-orange-100 text-orange-700',
  APPROVED_BY_DIRECTOR: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  PAID: 'bg-green-100 text-green-700',
}

// ── Opex (operational expenses) ─────────────────────────────────────────
export const OPEX_CATEGORIES = [
  'Sewa & Utilitas',
  'Gaji & Tunjangan',
  'Operasional Kantor',
  'Marketing',
  'Transportasi',
  'Langganan & Software',
  'Pajak & Legal',
  'Lainnya',
]

// ── Asset register ───────────────────────────────────────────────────────
export const ASSET_CATEGORY_LABEL = {
  VEHICLE: 'Kendaraan',
  ELECTRONICS: 'Elektronik',
  EQUIPMENT: 'Peralatan',
  PROPERTY: 'Properti',
  FURNITURE: 'Furniture',
  SOFTWARE: 'Software / Lisensi',
  CRYPTO: 'Crypto',
  OTHER: 'Lainnya',
}

export const ASSET_CONDITION_LABEL = {
  BAIK: 'Baik',
  RUSAK_RINGAN: 'Rusak Ringan',
  RUSAK_BERAT: 'Rusak Berat',
}
