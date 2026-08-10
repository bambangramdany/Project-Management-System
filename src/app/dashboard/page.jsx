'use client'
import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import Navbar from '@/components/Navbar'
import { StatusBadge } from '@/components/StatusBadge'
import { STATUS_LABEL, ACTIVE_STATUSES, WON_STATUSES, CATEGORY_LABEL, STATUS_GROUP_COLOR } from '@/lib/constants'
import { HEALTH_LABEL, HEALTH_COLOR, HEALTH_DOT } from '@/lib/health'
import { isFinanceDirector } from '@/lib/rbac'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const RevenueTrendCharts = dynamic(() => import('@/components/RevenueTrendChart'), { ssr: false })

const PIPELINE_STAGES = [
  { key: 'HOLD', label: 'Hold' },
  { key: 'PITCHING', label: 'Pitching' },
  { key: 'WAITING_PITCH_RESULT', label: 'Waiting Result' },
  { key: 'PREPARATION', label: 'Preparation' },
  { key: 'EVENT_DAY', label: 'Event Day' },
  { key: 'REPORTING', label: 'Reporting' },
  { key: 'INVOICING', label: 'Invoicing' },
]

// Order for the morning briefing list — pitching through invoicing
const BRIEFING_ORDER = ['PITCHING', 'WAITING_PITCH_RESULT', 'PREPARATION', 'EVENT_DAY', 'REPORTING', 'INVOICING']

function getHoroscope(birthDate) {
  const d = new Date(birthDate)
  const m = d.getMonth() + 1
  const day = d.getDate()
  // Pick message variation based on today's date — rotates daily, no randomness for SSR safety
  const msgIdx = new Date().getDate() % 3
  const signs = [
    { sign: 'Capricorn',   symbol: '♑', from: [12,22], to: [1,19],  msgs: [
      "The stars have aligned perfectly for you today, Capricorn — your patience and perseverance are your greatest gifts. Wishing you a year full of well-deserved victories! 🏆",
      "Capricorn, your quiet strength moves mountains. On this special day, may the universe return every ounce of dedication you've poured into your work and the people you love. 🌟",
      "A true architect of dreams, Capricorn. Your ambition and discipline are legendary — here's to a birthday that marks the beginning of your greatest chapter yet! 🎯",
    ]},
    { sign: 'Aquarius',    symbol: '♒', from: [1,20],  to: [2,18],  msgs: [
      "Aquarius, your visionary spirit lights up every room you walk into. On your special day, may the universe reward your brilliant, boundless mind! 💡",
      "You were born to change the world, Aquarius. Your originality and heart for humanity make you truly one of a kind — have a birthday as extraordinary as you are! 🌈",
      "Dear Aquarius, your ideas spark revolutions and your kindness sparks connections. May this birthday be filled with the innovation and freedom your soul craves! ✨",
    ]},
    { sign: 'Pisces',      symbol: '♓', from: [2,19],  to: [3,20],  msgs: [
      "Dear Pisces, your creativity and empathy are truly a gift to everyone around you. May this birthday bring you the magic you so freely give to others! 🌊",
      "Pisces, your imagination and compassion create ripples of beauty wherever you go. Here's to a birthday as dreamy and magical as your soul! 🎨",
      "You feel the world more deeply than most, Pisces, and that sensitivity is your superpower. May this birthday fill your heart with all the wonder and love you deserve! 🌙",
    ]},
    { sign: 'Aries',       symbol: '♈', from: [3,21],  to: [4,19],  msgs: [
      "Bold Aries, you lead the way with fire and courage! On your birthday, may your unstoppable energy open every door you've been meant to walk through. 🔥",
      "Aries, your fearless spirit is the spark that ignites every room. Happy birthday to the trailblazer who never backs down from a challenge! ⚡",
      "First and fiercest, Aries — your passion and drive inspire everyone around you. May this birthday charge you up for your most triumphant year yet! 🎉",
    ]},
    { sign: 'Taurus',      symbol: '♉', from: [4,20],  to: [5,20],  msgs: [
      "Steadfast Taurus, your loyalty and warmth make you irreplaceable. Here's to a birthday as beautiful and abundant as the world you build for those you love! 🌸",
      "Taurus, you are the rock everyone leans on — dependable, generous, and wonderful. On your special day, it's time for others to celebrate YOU! 🌺",
      "Dear Taurus, your strength and grace make the world a more beautiful place. May this birthday bring you every comfort, joy, and well-deserved indulgence! 🎂",
    ]},
    { sign: 'Gemini',      symbol: '♊', from: [5,21],  to: [6,20],  msgs: [
      "Gemini, your wit and adaptability are endlessly fascinating. May this birthday bring you twice the joy, twice the adventure, and twice the fun! 🎊",
      "You light up every conversation and every room, Gemini. Your curiosity and charm make life so much more vibrant — here's to a birthday as lively as you! 🗣️",
      "Gemini, your dual nature is your superpower — clever and kind, bold and playful. May this birthday be a beautiful mix of everything your wonderful soul loves! 🌟",
    ]},
    { sign: 'Cancer',      symbol: '♋', from: [6,21],  to: [7,22],  msgs: [
      "Caring Cancer, your heart holds an ocean of love. May this birthday fill you with the same warmth and happiness you generously pour into everyone else! 🌊",
      "Cancer, your nurturing spirit creates a safe harbor for everyone you love. On your birthday, let others be that haven for you — you deserve it! 🏠",
      "Dear Cancer, your emotional depth and fierce loyalty are rare treasures. Wishing you a birthday as warm, cozy, and full of love as you make everything around you! 💙",
    ]},
    { sign: 'Leo',         symbol: '♌', from: [7,23],  to: [8,22],  msgs: [
      "Magnificent Leo, the whole world brightens when you shine. On your birthday, may you roar with joy and receive the royal celebration you deserve! 👑",
      "Leo, your generosity, warmth, and unshakable confidence inspire everyone around you. Today, the spotlight is all yours — own it completely! 🌟",
      "Born to lead and born to shine, Leo — your heart is as big as your presence. May this birthday be the grandest, most glorious day of your incredible year! 🎺",
    ]},
    { sign: 'Virgo',       symbol: '♍', from: [8,23],  to: [9,22],  msgs: [
      "Detail-perfect Virgo, your dedication and thoughtfulness inspire everyone around you. Wishing you a birthday as beautifully curated as everything you do! 🌿",
      "Virgo, your precision and care elevate everything you touch. Today, may every detail of your birthday be as perfect as you always make things for others! ✨",
      "Dear Virgo, your humble brilliance and servant heart make the world run better. Wishing you a birthday full of the peace, order, and beauty you bring to everyone else! 🌱",
    ]},
    { sign: 'Libra',       symbol: '♎', from: [9,23],  to: [10,22], msgs: [
      "Harmonious Libra, you bring balance and grace wherever you go. May your birthday be surrounded by the beauty and love you always seek to create! ⚖️",
      "Libra, your sense of fairness, charm, and elegance make you a joy to be around. On your special day, may the scales tip toward pure happiness for you! 🌸",
      "Dear Libra, your artistic soul and peaceful heart create harmony in every space you occupy. Wishing you a birthday as lovely and balanced as you are! 🎨",
    ]},
    { sign: 'Scorpio',     symbol: '♏', from: [10,23], to: [11,21], msgs: [
      "Intense Scorpio, your passion and determination are truly unmatched. On your birthday, may the depth of your spirit carry you to extraordinary new heights! 🦂",
      "Scorpio, your magnetic presence and unwavering focus make you unstoppable. Today, may the universe reveal all the wonderful things your power has been building toward! 🔮",
      "Dear Scorpio, beneath your strength lies a loyalty and sensitivity few ever see — those who do are truly blessed. Wishing you a birthday as deep and transformative as your soul! 🌙",
    ]},
    { sign: 'Sagittarius', symbol: '♐', from: [11,22], to: [12,21], msgs: [
      "Free-spirited Sagittarius, your optimism and sense of adventure inspire everyone around you. May this birthday launch you toward your most exciting chapter yet! 🏹",
      "Sagittarius, your laughter is contagious and your wanderlust is legendary. Here's to a birthday full of new horizons, bold discoveries, and pure joy! 🌍",
      "Dear Sagittarius, your philosophical mind and adventurous heart make life so much bigger and brighter. Wishing you a birthday as limitless as your spirit! 🎉",
    ]},
  ]
  for (const s of signs) {
    const [fm, fd] = s.from
    const [tm, td] = s.to
    if (fm > tm) { // wraps year (Capricorn)
      if ((m === fm && day >= fd) || (m === 1 && day <= td)) return { ...s, msg: s.msgs[msgIdx] }
    } else {
      if ((m === fm && day >= fd) || (m > fm && m < tm) || (m === tm && day <= td)) return { ...s, msg: s.msgs[msgIdx] }
    }
  }
  return { ...signs[0], msg: signs[0].msgs[msgIdx] }
}

function AnnouncementBanner() {
  const [data, setData] = useState(null)
  const [dismissed, setDismissed] = useState(new Set())

  useEffect(() => {
    fetch('/api/announcements').then(r => r.json()).then(d => setData(d)).catch(() => {})
  }, [])

  if (!data) return null

  const birthdayPeople = data.birthdayToday || []
  const announcements = (data.announcements || []).filter(a => !dismissed.has(a.id))

  if (birthdayPeople.length === 0 && announcements.length === 0) return null

  const TYPE_CONFIG = {
    WARNING: {
      gradient: 'linear-gradient(120deg, #78350f 0%, #92400e 40%, #b45309 100%)',
      rail: '#fbbf24',
      ring: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
      tag: 'Peringatan',
      tagBg: 'rgba(251,191,36,.22)',
      tagColor: '#fde68a',
      icon: '⚠️',
      textColor: '#fef3c7',
    },
    INFO: {
      gradient: 'linear-gradient(120deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)',
      rail: '#818cf8',
      ring: 'linear-gradient(135deg, #6366f1, #818cf8)',
      tag: 'Informasi',
      tagBg: 'rgba(129,140,248,.2)',
      tagColor: '#c7d2fe',
      icon: 'ℹ️',
      textColor: '#e0e7ff',
    },
    EVENT: {
      gradient: 'linear-gradient(120deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
      rail: '#38bdf8',
      ring: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
      tag: 'Event',
      tagBg: 'rgba(56,189,248,.18)',
      tagColor: '#bae6fd',
      icon: '📅',
      textColor: '#e0f2fe',
    },
    BIRTHDAY: {
      gradient: 'linear-gradient(120deg, #831843 0%, #9d174d 30%, #be185d 60%, #a21caf 100%)',
      rail: 'linear-gradient(180deg, #f9a8d4, #e879f9)',
      ring: 'linear-gradient(135deg, #ec4899, #d946ef)',
      tag: 'Ulang Tahun Hari Ini 🎉',
      tagBg: 'rgba(249,168,212,.2)',
      tagColor: '#fbcfe8',
      icon: '🎂',
      textColor: '#fdf2f8',
    },
  }

  return (
    <div className="space-y-2.5 mb-2">
      {birthdayPeople.map(u => {
        const horo = u.birthDate ? getHoroscope(u.birthDate) : null
        const cfg = TYPE_CONFIG.BIRTHDAY
        return (
          <div key={u.id} className="relative overflow-hidden rounded-2xl flex items-stretch"
            style={{ background: cfg.gradient, boxShadow: '0 4px 20px -4px rgba(0,0,0,.25), 0 1px 4px rgba(0,0,0,.1)' }}>
            {/* Left rail */}
            <div className="w-1.5 flex-shrink-0" style={{ background: cfg.rail }} />
            {/* Icon */}
            <div className="flex-shrink-0 flex items-center justify-center px-3 py-3.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ background: cfg.ring, boxShadow: '0 0 0 3px rgba(255,255,255,.22), 0 2px 10px rgba(0,0,0,.18)' }}>
                {cfg.icon}
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 py-3 pr-3">
              <div className="text-[9px] font-extrabold tracking-widest uppercase rounded px-1.5 py-0.5 inline-block mb-1"
                style={{ background: cfg.tagBg, color: cfg.tagColor }}>{cfg.tag}</div>
              <p className="text-sm font-extrabold leading-snug" style={{ color: cfg.textColor }}>
                Happy Birthday, {u.name}! 🥳
              </p>
              {horo && <p className="text-xs mt-1 leading-relaxed opacity-90" style={{ color: cfg.textColor }}>{horo.msg}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {horo && (
                  <span className="text-[10px] font-bold rounded-full px-2 py-0.5 inline-flex items-center gap-1"
                    style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.28)', color: cfg.textColor }}>
                    {horo.symbol} {horo.sign}
                  </span>
                )}
                <span className="text-sm tracking-wider select-none" style={{ letterSpacing: '4px' }}>🎁🎈🎺🎶🪅</span>
              </div>
            </div>
            {/* Confetti overlay */}
            <div className="absolute top-1.5 right-10 text-sm opacity-20 pointer-events-none select-none tracking-widest">
              🎊 🎈 ✨ 🎉 ⭐
            </div>
          </div>
        )
      })}
      {announcements.map(ann => {
        const cfg = TYPE_CONFIG[ann.type] || TYPE_CONFIG.INFO
        return (
          <div key={ann.id} className="relative overflow-hidden rounded-2xl flex items-stretch"
            style={{ background: cfg.gradient, boxShadow: '0 4px 20px -4px rgba(0,0,0,.22), 0 1px 4px rgba(0,0,0,.08)' }}>
            {/* Left rail */}
            <div className="w-1.5 flex-shrink-0" style={{ background: cfg.rail }} />
            {/* Icon */}
            <div className="flex-shrink-0 flex items-center justify-center px-3 py-3.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ background: cfg.ring, boxShadow: '0 0 0 3px rgba(255,255,255,.22), 0 2px 10px rgba(0,0,0,.18)' }}>
                {cfg.icon}
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 py-3 pr-2">
              <div className="text-[9px] font-extrabold tracking-widest uppercase rounded px-1.5 py-0.5 inline-block mb-1"
                style={{ background: cfg.tagBg, color: cfg.tagColor }}>{cfg.tag}</div>
              <p className="text-sm font-extrabold leading-snug" style={{ color: cfg.textColor }}>{ann.title}</p>
              {ann.content && <p className="text-xs mt-0.5 leading-relaxed line-clamp-2 opacity-85" style={{ color: cfg.textColor }}>{ann.content}</p>}
            </div>
            {/* Dismiss */}
            <div className="flex-shrink-0 flex items-start pt-3 pr-3">
              <button onClick={() => setDismissed(d => new Set([...d, ann.id]))}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all"
                style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)', color: cfg.textColor }}
                aria-label="Tutup">✕</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [cashPosition, setCashPosition] = useState(null)
  const [debtSummary, setDebtSummary] = useState(null)
  const [cashSummary, setCashSummary] = useState(null)
  const [overview, setOverview] = useState(null)
  const [overviewRange, setOverviewRange] = useState(null) // { from: 'YYYY-MM', to: 'YYYY-MM' }
  const [trendsData, setTrendsData] = useState(null)
  const [trendsYear, setTrendsYear] = useState(new Date().getFullYear())
  const [piutangAlerts, setPiutangAlerts] = useState(null)
  const [pendingPRCount, setPendingPRCount] = useState(null)
  const [teamStats, setTeamStats] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchProjects = () => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }

  // One combined request: projects + role-gated finance widgets, fetched
  // server-side in parallel instead of 4-5 separate client round-trips.
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/dashboard/summary').then(r => r.ok ? r.json() : null).then(data => {
      if (!data) { setLoading(false); return }
      setProjects(Array.isArray(data.projects) ? data.projects : [])
      if (data.cashPosition) setCashPosition(data.cashPosition)
      if (data.cashSummary) setCashSummary(data.cashSummary)
      if (data.debtSummary) setDebtSummary(data.debtSummary)
      if (data.overview) {
        setOverview(data.overview)
        skipNextOverviewFetch.current = true
        setOverviewRange({ from: data.overview.from, to: data.overview.to })
      }
      if (data.piutangAlerts)  setPiutangAlerts(data.piutangAlerts)
      if (data.pendingPRCount) setPendingPRCount(data.pendingPRCount)
      setLoading(false)
    })
  }, [status])

  const skipNextOverviewFetch = useRef(false)
  useEffect(() => {
    if (!overviewRange) return
    if (skipNextOverviewFetch.current) { skipNextOverviewFetch.current = false; return }
    const params = new URLSearchParams(overviewRange)
    fetch(`/api/finance/overview?${params}`).then(r => r.ok ? r.json() : null).then(data => { if (data) setOverview(data) })
  }, [overviewRange])

  // Fetch company-wide team stats (all roles, no user filter)
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/dashboard/team-stats').then(r => r.ok ? r.json() : null).then(d => { if (d) setTeamStats(d) })
  }, [status])

  // Fetch trend charts (Owner/Finance/Director only)
  useEffect(() => {
    if (status !== 'authenticated') return
    const role = session?.user?.role
    if (!['OWNER', 'FINANCE', 'DIRECTOR'].includes(role) && !isFinanceDirector(session?.user)) return
    fetch(`/api/dashboard/trends?year=${trendsYear}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setTrendsData(data) })
  }, [status, trendsYear, session])

  if (status === 'loading' || loading) return <LoadingScreen />

  const activeProjects = projects.filter(p => ACTIVE_STATUSES.includes(p.status))
  const wonProjects = projects.filter(p => p.pitchResult === 'WIN')
  const loseProjects = projects.filter(p => p.pitchResult === 'LOSE')
  const pitchedTotal = wonProjects.length + loseProjects.length
  const winRate = pitchedTotal > 0 ? Math.round((wonProjects.length / pitchedTotal) * 100) : 0

  const eoProjects = projects.filter(p => (p.division || 'EVENT') !== 'PH')
  const phProjects = projects.filter(p => p.division === 'PH')
  const attentionProjects = projects.filter(p => p.health && ['red', 'yellow'].includes(p.health.level))
    .sort((a, b) => (a.health.level === 'red' ? -1 : 1) - (b.health.level === 'red' ? -1 : 1))

  const uid = session?.user?.id
  const role = session?.user?.role
  const myProjects = projects.filter(p =>
    p.picId === uid || p.members?.some(m => m.user?.id === uid)
  )
  const myActive   = myProjects.filter(p => ACTIVE_STATUSES.includes(p.status))
  const myWon      = myProjects.filter(p => p.pitchResult === 'WIN')
  const myLose     = myProjects.filter(p => p.pitchResult === 'LOSE')
  const myPitched  = myWon.length + myLose.length
  const myWinRate  = myPitched > 0 ? Math.round((myWon.length / myPitched) * 100) : 0
  const myAsPic    = myProjects.filter(p => p.picId === uid)
  const isLeadRole = ['OWNER', 'PROJECT_MANAGER', 'PRODUCER', 'DIRECTOR'].includes(role)
  const isFinanceHrd = ['FINANCE', 'FINANCE_STAFF'].includes(role) ||
    (session?.user?.canHrdEvaluate && role !== 'OWNER') ||
    (role === 'DIRECTOR' && session?.user?.divisi === 'FINANCE_HRGA')

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <AnnouncementBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Selamat datang, {session?.user.name}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {['OWNER', 'DIRECTOR', 'PROJECT_MANAGER'].includes(session?.user?.role) && (
              <Link href="/admin/audit"
                className="text-sm px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium">
                🔍 Audit Data
              </Link>
            )}
            {isLeadRole && (
              <Link href="/projects/new" className="btn-primary self-start sm:self-auto">
                + Project Baru
              </Link>
            )}
          </div>
        </div>

        {/* Finance overview — Owner / Finance / Directors only */}
        {overview && overviewRange && (
          <FinanceOverviewCard data={overview} range={overviewRange} setRange={setOverviewRange} role={session?.user?.role} />
        )}

        {/* Trend Charts — Owner / Finance / Directors only */}
        {trendsData && (
          <RevenueTrendCharts
            data={trendsData}
            year={trendsYear}
            onYearChange={setTrendsYear}
          />
        )}

        {/* ── Overview panels — company-wide stats from dedicated endpoint ── */}
        {teamStats && (
          <div className="space-y-4">
            {/* Row 1: Overall + EO + PH */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <OverviewCard
                title="Watermark Keseluruhan"
                icon="🏢"
                gradient="linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)"
                labelColor="text-violet-300"
                data={teamStats.all}
                linkBase="/projects"
              />
              <OverviewCard
                title="Tim Event Organizer"
                icon="🎪"
                gradient="linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)"
                labelColor="text-orange-200"
                data={teamStats.eo}
                linkBase="/projects?division=EVENT"
              />
              <OverviewCard
                title="Tim Production House"
                icon="🎬"
                gradient="linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)"
                labelColor="text-blue-200"
                data={teamStats.ph}
                linkBase="/projects?division=PH"
              />
            </div>

            {/* Row 2: Personal — hidden for Finance/HRD */}
            {!isFinanceHrd && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)' }}>
                  <span className="text-base">🙋</span>
                  <h3 className="text-sm font-bold text-white">Pencapaian Saya</h3>
                  <span className="ml-auto text-[10px] font-semibold text-emerald-200 uppercase tracking-wide">{session?.user?.name?.split(' ')[0]}</span>
                </div>
                {myProjects.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-gray-400">Belum terlibat di project manapun tahun ini</p>
                    {isLeadRole && (
                      <Link href="/projects/new" className="text-xs text-violet-500 hover:underline mt-1 block">+ Buat project baru</Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
                    <div className="p-4">
                      <p className="text-xs text-gray-400">Project Saya</p>
                      <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{myProjects.length}</p>
                      <p className="text-[11px] text-gray-400">
                        dari {teamStats.all.total} total
                        {teamStats.all.total > 0 && <span className="ml-1 font-semibold text-emerald-600">({Math.round(myProjects.length/teamStats.all.total*100)}%)</span>}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-400">Aktif Sekarang</p>
                      <p className="text-2xl font-extrabold text-orange-500 mt-0.5">{myActive.length}</p>
                      <p className="text-[11px] text-gray-400">
                        dari {teamStats.all.active} aktif tim
                        {teamStats.all.active > 0 && <span className="ml-1 font-semibold text-orange-500">({Math.round(myActive.length/teamStats.all.active*100)}%)</span>}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-400">Win Rate Saya</p>
                      <p className="text-2xl font-extrabold mt-0.5"
                        style={{ color: myPitched === 0 ? '#9ca3af' : myWinRate >= (teamStats.all.winRate ?? 0) ? '#16a34a' : '#dc2626' }}>
                        {myPitched > 0 ? `${myWinRate}%` : '—'}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {myPitched > 0
                          ? <>{myWon.length} menang dari {myPitched} pitch{myWinRate >= (teamStats.all.winRate ?? 0) ? ' 🔥' : ''}</>
                          : 'belum ada pitch'}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-400">{isLeadRole ? 'Saya sebagai PIC' : 'Selesai'}</p>
                      <p className="text-2xl font-extrabold text-blue-600 mt-0.5">
                        {isLeadRole ? myAsPic.length : myProjects.filter(p => p.status === 'DONE').length}
                      </p>
                      <p className="text-[11px] text-gray-400">{isLeadRole ? 'project dipimpin' : 'project lunas'}</p>
                    </div>
                    {myActive.length > 0 && (
                      <div className="col-span-2 sm:col-span-4 px-5 py-3 border-t border-gray-100 bg-gray-50">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Project aktif saya</p>
                        <div className="flex flex-wrap gap-2">
                          {myActive.slice(0, 5).map(p => (
                            <Link key={p.id} href={`/projects/${p.id}`}
                              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-violet-300 hover:text-violet-700 transition-colors">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.health?.level === 'red' ? 'bg-red-400' : p.health?.level === 'yellow' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                              <span className="truncate max-w-[160px]">{p.name}</span>
                            </Link>
                          ))}
                          {myActive.length > 5 && (
                            <Link href="/my-tasks" className="text-[11px] text-violet-500 hover:underline self-center">+{myActive.length - 5} lainnya →</Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Finance alerts: overdue piutang + pending approvals */}
        {((piutangAlerts?.count ?? 0) > 0 || (pendingPRCount?.count ?? 0) > 0) && (
          <div className="card border-t-4 border-red-400 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-xs">🚨</span>
              <h3 className="text-sm font-semibold text-gray-700">Perlu Tindakan Segera</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {(piutangAlerts?.count ?? 0) > 0 && (
                <Link href="/finance" className="flex items-center gap-4 px-5 py-3 hover:bg-red-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-lg shrink-0">📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-red-600">Piutang Jatuh Tempo</p>
                    <p className="text-xs text-gray-500">{piutangAlerts.count} invoice melewati batas waktu pembayaran</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">
                      Rp {Math.round(piutangAlerts.total).toLocaleString('id-ID')}
                    </p>
                    <span className="text-[10px] text-red-400">overdue</span>
                  </div>
                </Link>
              )}
              {(pendingPRCount?.count ?? 0) > 0 && (
                <Link href="/finance" className="flex items-center gap-4 px-5 py-3 hover:bg-orange-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg shrink-0">⏳</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-600">Pengajuan Menunggu Approval</p>
                    <p className="text-xs text-gray-500">{pendingPRCount.count} payment request belum disetujui</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-orange-600">
                      Rp {Math.round(pendingPRCount.total).toLocaleString('id-ID')}
                    </p>
                    <span className="text-[10px] text-orange-400">pending</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Cash position — Owner / Finance / Finance Director only */}
        {cashPosition && <CashPositionCard data={cashPosition} />}

        {/* Simplified read-only cash condition — division Directors */}
        {cashSummary && <CashConditionCard data={cashSummary} />}

        {/* Debt obligations — Owner / Finance / Directors */}
        {debtSummary && debtSummary.activeDebtCount > 0 && <DebtSummaryCard data={debtSummary} />}

        {/* Projects needing attention */}
        {attentionProjects.length > 0 && (
          <div className="card border-t-4 border-blue-400">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs">⚠️</span>Project Perlu Perhatian ({attentionProjects.length})</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {attentionProjects.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[p.health.level]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 truncate">{p.health.reasons.join(' · ')}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${HEALTH_COLOR[p.health.level]}`}>
                    {HEALTH_LABEL[p.health.level]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* EO / Event division */}
        <DivisionSection title="Event Organizer (EO)" projects={eoProjects}
          onProjectUpdate={updated => setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))} />

        {/* Production House division */}
        <DivisionSection title="Production House (PH)" projects={phProjects}
          onProjectUpdate={updated => setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))} />

      </main>
    </div>
  )
}

function OverviewCard({ title, icon, gradient, labelColor, data, linkBase }) {
  const STAGE_LABEL = {
    HOLD: 'Hold', PITCHING: 'Pitching', WAITING_PITCH_RESULT: 'Waiting Result',
    PREPARATION: 'Preparation', EVENT_DAY: 'Event Day', REPORTING: 'Reporting', INVOICING: 'Invoicing',
  }
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: gradient }}>
        <span className="text-sm">{icon}</span>
        <h3 className="text-xs font-bold text-white truncate">{title}</h3>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
        <div className="p-3">
          <p className="text-[11px] text-gray-400">Total Project</p>
          <p className="text-xl font-extrabold text-gray-900">{data.total}</p>
          <p className="text-[10px] text-gray-400">sepanjang tahun ini</p>
        </div>
        <div className="p-3">
          <p className="text-[11px] text-gray-400">Sedang Berjalan</p>
          <p className="text-xl font-extrabold text-orange-500">{data.active}</p>
          <p className="text-[10px] text-gray-400">project aktif</p>
        </div>
        <div className="p-3">
          <p className="text-[11px] text-gray-400">Win Rate</p>
          <p className="text-xl font-extrabold text-green-600">{data.winRate !== null ? `${data.winRate}%` : '—'}</p>
          <p className="text-[10px] text-gray-400">{data.won} menang dari {data.pitched} pitch</p>
        </div>
        <div className="p-3">
          <p className="text-[11px] text-gray-400">Selesai</p>
          <p className="text-xl font-extrabold text-blue-600">{data.done}</p>
          <p className="text-[10px] text-gray-400">project lunas</p>
        </div>
      </div>
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(data.pipeline).map(([key, cnt]) => {
            if (cnt === 0) return null
            return (
              <Link key={key} href={`${linkBase}${linkBase.includes('?') ? '&' : '?'}status=${key}`}
                className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 transition-colors">
                <span className="w-3.5 h-3.5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-[8px]">{cnt}</span>
                {STAGE_LABEL[key]}
              </Link>
            )
          })}
          {Object.values(data.pipeline).every(v => v === 0) && (
            <span className="text-[10px] text-gray-400">Tidak ada project aktif</span>
          )}
        </div>
      </div>
    </div>
  )
}

function DivisionSection({ title, projects, onProjectUpdate }) {
  const { data: session } = useSession()
  const [allUsers, setAllUsers] = useState([])
  useEffect(() => {
    fetch('/api/team').then(r => r.ok ? r.json() : []).then(d => setAllUsers(Array.isArray(d) ? d : []))
  }, [])
  const active = projects.filter(p => ACTIVE_STATUSES.includes(p.status))
  const countByStatus = {}
  PIPELINE_STAGES.forEach(s => { countByStatus[s.key] = projects.filter(p => p.status === s.key).length })
  // Sort for morning briefing: Pitching -> Waiting Result -> Preparation -> Event Day -> Reporting -> Invoicing
  const briefingActive = [...active].sort((a, b) => BRIEFING_ORDER.indexOf(a.status) - BRIEFING_ORDER.indexOf(b.status))
  const role = session?.user?.role
  const canEditBase = ['OWNER', 'PROJECT_MANAGER', 'PRODUCER'].includes(role)

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
        {title}
        <span className="text-xs font-normal text-gray-400">({active.length} aktif dari {projects.length})</span>
      </h2>

      {/* Pipeline overview, ordered to end with Reporting & Invoicing for morning briefing */}
      <div className="card p-5 border-t-4 border-orange-400">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs">📈</span>Pipeline Project</h3>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {PIPELINE_STAGES.map((stage, i) => (
            <Link key={stage.key} href={`/projects?status=${stage.key}`} className="group text-center shrink-0 min-w-[60px]">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center mx-auto text-base font-bold text-orange-600 group-hover:bg-orange-100 group-hover:scale-110 group-hover:border-orange-300 transition-all duration-200">
                  {countByStatus[stage.key]}
                </div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <div className="hidden sm:block absolute top-1/2 -right-1 w-2 h-0.5 bg-gray-200" />
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1 leading-tight">{stage.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Active projects list — ordered for morning briefing */}
      <div className="card border-t-4 border-emerald-400">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">📋</span>Project Aktif (urutan briefing)</h3>
          <Link href="/projects" className="text-xs text-orange-500 hover:text-orange-600">Lihat semua →</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {briefingActive.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Tidak ada project aktif</p>
          )}
          {ACTIVE_STATUSES.filter(s => briefingActive.some(p => p.status === s)).map(s => {
            const projectsInStatus = briefingActive.filter(p => p.status === s)
            return (
              <details key={s} open className="group">
                <summary className={clsx('px-5 py-2.5 flex items-center justify-between gap-2 cursor-pointer select-none list-none', STATUS_GROUP_COLOR[s] || 'bg-gray-500 text-white')}>
                  <span className="flex items-center gap-2 text-sm font-bold">
                    {STATUS_LABEL[s] || s}
                    <span className="text-xs font-normal opacity-80">({projectsInStatus.length})</span>
                  </span>
                  <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="divide-y divide-gray-50 border-t border-gray-50">
                  {projectsInStatus.map(p => (
                    <ProjectRow key={p.id} project={p} canEdit={canEditBase || (role === 'DIRECTOR' && p.division === session?.user?.divisi)} onProjectUpdate={onProjectUpdate} allUsers={allUsers} />
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ProjectRow({ project: p, canEdit, onProjectUpdate, allUsers = [] }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setForm({
      status:    p.status,
      briefDate: p.briefDate ? p.briefDate.slice(0, 10) : '',
      startDate: p.startDate ? p.startDate.slice(0, 10) : '',
      endDate:   p.endDate   ? p.endDate.slice(0, 10)   : '',
      picId:     p.picId || '',
      memberIds: (p.members?.map(m => m.user?.id).filter(Boolean)) || [],
      note:      '',
    })
    setOpen(true)
  }

  function toggleMember(uid) {
    setForm(f => ({
      ...f,
      memberIds: f.memberIds.includes(uid) ? f.memberIds.filter(id => id !== uid) : [...f.memberIds, uid],
    }))
  }

  async function save() {
    setSaving(true)
    const data = {
      status:    form.status,
      briefDate: form.briefDate || null,
      startDate: form.startDate || null,
      endDate:   form.endDate   || null,
      picId:     form.picId     || null,
      memberIds: form.memberIds,
    }
    if (form.note.trim()) {
      data.notes = p.notes
        ? `${p.notes}\n[${new Date().toLocaleDateString('id-ID')}] ${form.note.trim()}`
        : form.note.trim()
    }
    const res = await fetch(`/api/projects/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      // Update lokal — tidak perlu re-fetch seluruh halaman, scroll tetap di tempat
      onProjectUpdate?.({ ...updated, client: p.client, pic: allUsers.find(u => u.id === form.picId) ? { id: form.picId, name: allUsers.find(u => u.id === form.picId)?.name } : p.pic })
      setOpen(false)
    }
    else alert('Gagal menyimpan perubahan')
  }

  return (
    <div className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        <Link href={`/projects/${p.id}`} className="flex-1 min-w-0">
          <span className="text-xs text-gray-400 font-mono">{p.code} · {CATEGORY_LABEL[p.category] || p.category}</span>
          <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{p.name}</p>
          <p className="text-xs text-gray-500">{p.client?.name} · PIC: {p.pic?.name || '—'}</p>
        </Link>
        <div className="shrink-0 mt-0.5 flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => open ? setOpen(false) : startEdit()}
              className="text-xs text-gray-400 hover:text-orange-500 border border-gray-200 rounded px-1.5 py-0.5"
            >
              {open ? 'Tutup' : 'Update'}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-3">
          {/* Baris 1: Status */}
          <div>
            <label className="label">Stage / Status</label>
            <select className="select text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              <option value="DONE">Done</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>
          {/* Baris 2: Tanggal */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Tgl Brief</label>
              <input type="date" className="input text-sm" value={form.briefDate} onChange={e => setForm(f => ({ ...f, briefDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tgl Mulai</label>
              <input type="date" className="input text-sm" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tgl Selesai</label>
              <input type="date" className="input text-sm" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          {/* Baris 3: PIC */}
          {allUsers.length > 0 && (
            <div>
              <label className="label">PIC / Project Manager</label>
              <select className="select text-sm" value={form.picId} onChange={e => setForm(f => ({ ...f, picId: e.target.value }))}>
                <option value="">— Belum ada PIC —</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}{u.jobTitle ? ` (${u.jobTitle})` : ''}</option>)}
              </select>
            </div>
          )}
          {/* Baris 4: Anggota Tim */}
          {allUsers.length > 0 && (
            <div>
              <label className="label">Anggota Tim</label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-white">
                {allUsers.map(u => (
                  <button key={u.id} type="button" onClick={() => toggleMember(u.id)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${form.memberIds?.includes(u.id) ? 'bg-brand text-white border-brand' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                    {form.memberIds?.includes(u.id) && '✓ '}{u.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Catatan */}
          <div>
            <label className="label">Catatan Tambahan</label>
            <textarea className="input text-sm" rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Opsional — catatan update ini" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => setOpen(false)} className="btn-secondary text-xs px-3 py-1.5">Batal</button>
            <Link href={`/projects/${p.id}`} className="text-xs px-3 py-1.5 text-gray-400 hover:text-brand-600 ml-auto">
              Buka Detail →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function formatRupiah(n) {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
}

// Compact display: "Rp 6,6 M" (miliar) / "Rp 234 jt" (juta) / plain rupiah for small values
function formatCompactRupiah(n) {
  const v = Math.round(n || 0)
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (abs >= 1_000_000) return `Rp ${Math.round(v / 1_000_000)} jt`
  return formatRupiah(v)
}

const MONTH_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function MonthYearSelect({ value, onChange }) {
  const [y, m] = value.split('-').map(Number)
  const years = []
  const nowY = new Date().getFullYear()
  for (let yr = nowY - 2; yr <= nowY + 1; yr++) years.push(yr)
  return (
    <div className="flex items-center gap-1">
      <select className="select text-xs py-1 w-16 px-1" value={m} onChange={e => onChange(`${y}-${String(Number(e.target.value)).padStart(2, '0')}`)}>
        {MONTH_LABEL.map((lbl, i) => <option key={i} value={i + 1}>{lbl}</option>)}
      </select>
      <select className="select text-xs py-1 w-[4.5rem] px-1" value={y} onChange={e => onChange(`${e.target.value}-${String(m).padStart(2, '0')}`)}>
        {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
      </select>
    </div>
  )
}

const DEBT_ROLES = ['OWNER', 'DIRECTOR', 'FINANCE'] // Hutang termasuk Finance (PPh 21)

function FinanceOverviewCard({ data, range, setRange, role }) {
  const showDebt = DEBT_ROLES.includes(role)
  const cards = [
    { key: 'omset', label: 'Total Omset', value: formatCompactRupiah(data.totalOmset), sub: `${MONTH_LABEL[Number(range.from.split('-')[1]) - 1]} ${range.from.split('-')[0]} – ${MONTH_LABEL[Number(range.to.split('-')[1]) - 1]} ${range.to.split('-')[0]}`, icon: '📈', color: 'blue', href: '/finance' },
    { key: 'ekspektasi', label: 'Ekspektasi Profit', value: formatCompactRupiah(data.ekspektasiProfit), sub: 'estimasi margin vs forecast', icon: '📊', color: 'emerald', href: '/finance' },
    { key: 'aktual', label: 'Aktual Nett Profit', value: formatCompactRupiah(data.aktualNettProfit), sub: 'margin aktual − opex', icon: '✅', color: 'emerald', href: '/finance' },
    { key: 'opex', label: 'Total Opex', value: formatCompactRupiah(data.totalOpex), sub: 'biaya operasional', icon: '↙️', color: 'rose', href: '/opex' },
    { key: 'piutang', label: 'Piutang', value: formatCompactRupiah(data.piutang.amount), sub: `${data.piutang.count} project invoicing`, icon: '📄', color: 'orange', href: '/invoice' },
    { key: 'pitchgagal', label: 'Pitch Gagal', value: formatCompactRupiah(data.pitchGagal.value), sub: `Profit hilang: ${formatCompactRupiah(data.pitchGagal.lostProfit)}`, icon: '📉', color: 'rose', href: '/projects?pitchResult=LOSE' },
    { key: 'aset', label: 'Total Nilai Aset', value: formatCompactRupiah(data.totalNilaiAset.value), sub: `${data.totalNilaiAset.count} aset tercatat`, icon: '🗂️', color: 'blue', href: '/assets' },
    ...(showDebt ? [{ key: 'hutang', label: 'Total Hutang Aktif', value: formatCompactRupiah(data.totalHutangAktif.value), sub: `Bunga/bln: ${formatCompactRupiah(data.totalHutangAktif.monthlyInterest)}`, icon: '🏦', color: 'rose', href: '/debts' }] : []),
  ]
  const colorMap = {
    blue: { border: 'border-blue-400', bg: 'bg-blue-100', text: 'text-blue-600' },
    emerald: { border: 'border-emerald-400', bg: 'bg-emerald-100', text: 'text-emerald-600' },
    orange: { border: 'border-orange-400', bg: 'bg-orange-100', text: 'text-orange-600' },
    rose: { border: 'border-rose-400', bg: 'bg-rose-100', text: 'text-rose-600' },
  }
  return (
    <div className="card p-5 border-t-4 border-indigo-400">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">💼</span>
          Overview Keuangan Perusahaan
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>Dari</span>
          <MonthYearSelect value={range.from} onChange={v => setRange(r => ({ ...r, from: v }))} />
          <span>Sampai</span>
          <MonthYearSelect value={range.to} onChange={v => setRange(r => ({ ...r, to: v }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => {
          const cm = colorMap[c.color]
          return (
            <Link key={c.key} href={c.href} className={`block p-3 rounded-xl border-t-4 ${cm.border} bg-gray-50 hover:bg-white hover:shadow-md transition-all duration-150 group`}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 group-hover:text-gray-700">{c.label}</p>
                <span className={`w-5 h-5 rounded-full ${cm.bg} ${cm.text} flex items-center justify-center text-[10px]`}>{c.icon}</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-gray-900 mt-1 break-words">{c.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate group-hover:text-gray-500">{c.sub}</p>
              <p className={`text-[10px] font-medium mt-1.5 ${cm.text} opacity-0 group-hover:opacity-100 transition-opacity`}>Lihat detail →</p>
            </Link>
          )
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">Hanya terlihat oleh Direksi & Management.</p>
    </div>
  )
}

function CashPositionCard({ data }) {
  return (
    <div className="card p-5 border-t-4 border-purple-400">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs">💰</span>Posisi Kas</h3>
        <Link href="/cashflow" className="text-xs font-medium text-brand hover:underline">Kelola Kas →</Link>
      </div>
      <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
        <p className="text-xs text-gray-500">Saldo Kas Saat Ini</p>
        <p className={`text-2xl font-bold ${data.cashBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatRupiah(data.cashBalance)}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-orange-50">
          <p className="text-xs text-gray-500">Menunggu Approval</p>
          <p className="text-lg font-bold text-orange-600">{formatRupiah(data.pendingApproval.amount)}</p>
          <p className="text-xs text-gray-400">{data.pendingApproval.count} pengajuan</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50">
          <p className="text-xs text-gray-500">Siap Dibayar</p>
          <p className="text-lg font-bold text-blue-600">{formatRupiah(data.readyToPay.amount)}</p>
          <p className="text-xs text-gray-400">{data.readyToPay.count} pengajuan</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50">
          <p className="text-xs text-gray-500">Sudah Dibayar Bulan Ini</p>
          <p className="text-lg font-bold text-green-600">{formatRupiah(data.paidThisMonth.amount)}</p>
          <p className="text-xs text-gray-400">{data.paidThisMonth.count} pembayaran</p>
        </div>
      </div>

      {data.upcoming.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Jatuh Tempo 14 Hari ke Depan</p>
          <div className="space-y-1.5">
            {data.upcoming.map(item => (
              <Link key={item.id} href={`/projects/${item.project.id}`} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 hover:shadow-sm transition-all duration-200">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{item.label} <span className="text-gray-400">— {item.project.name}</span></p>
                  <p className="text-xs text-gray-400">{new Date(item.neededDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-800">{formatRupiah(item.amount)}</p>
                  {item.hasPendingPayment ? (
                    <p className="text-[10px] text-blue-500">Sudah diajukan</p>
                  ) : (
                    <p className="text-[10px] text-red-500">Belum diajukan</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

function DivisionSummaryCard({ title, projects }) {
  const active = projects.filter(p => ACTIVE_STATUSES.includes(p.status))
  const won = projects.filter(p => p.pitchResult === 'WIN')
  const lose = projects.filter(p => p.pitchResult === 'LOSE')
  const pitchedTotal = won.length + lose.length
  const winRate = pitchedTotal > 0 ? Math.round((won.length / pitchedTotal) * 100) : 0
  const done = projects.filter(p => p.status === 'DONE')

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500">Total Project</p>
          <p className="text-xl font-bold text-gray-900">{projects.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Aktif</p>
          <p className="text-xl font-bold text-orange-600">{active.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Win Rate</p>
          <p className="text-xl font-bold text-green-600">{winRate}%</p>
          <p className="text-[11px] text-gray-400">{won.length} dari {pitchedTotal} pitch</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Selesai</p>
          <p className="text-xl font-bold text-blue-600">{done.length}</p>
        </div>
      </div>
    </div>
  )
}

function CashConditionCard({ data }) {
  return (
    <div className="card p-5 border-t-4 border-pink-400">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center text-xs">🏦</span>Kondisi Keuangan Watermark</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
          <p className="text-xs text-gray-500">Saldo Kas Saat Ini</p>
          <p className={`text-2xl font-bold ${data.cashBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatRupiah(data.cashBalance)}</p>
        </div>
        <div className="p-3 rounded-lg bg-orange-50">
          <p className="text-xs text-gray-500">Kebutuhan Dana Menunggu Cair</p>
          <p className="text-2xl font-bold text-orange-600">{formatRupiah(data.pendingDisbursement)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Pengajuan yang sudah disetujui/dalam proses approval</p>
        </div>
      </div>
    </div>
  )
}

function DebtSummaryCard({ data }) {
  const dueItems = [...data.overdue, ...data.dueThisMonth]
  const overdueCount = data.overdue?.length || 0
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card border-t-4 border-teal-400 overflow-hidden">
      {/* Header — always visible, clickable to expand/collapse */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-sm">📉</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">Kewajiban Hutang</p>
            <p className="text-xs text-gray-400">{data.activeDebtCount} pinjaman · {dueItems.length} cicilan jatuh tempo{overdueCount > 0 && <span className="ml-1 text-red-500 font-medium">({overdueCount} lewat tenggat)</span>}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">Sisa pokok</p>
            <p className="text-sm font-bold text-gray-900">{formatRupiah(data.outstandingPrincipal)}</p>
          </div>
          <span className={`text-gray-400 transition-transform duration-200 text-lg leading-none ${expanded ? 'rotate-180' : ''}`}>⌄</span>
        </div>
      </button>

      {/* Expandable body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 mb-4">
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-500">Sisa Pokok Hutang</p>
              <p className="text-lg font-bold text-gray-900 break-words">{formatRupiah(data.outstandingPrincipal)}</p>
              <p className="text-xs text-gray-400">{data.activeDebtCount} pinjaman aktif</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-50">
              <p className="text-xs text-gray-500">Wajib Dibayar Bulan Ini</p>
              <p className="text-lg font-bold text-orange-600 break-words">{formatRupiah(data.monthlyObligation)}</p>
              <p className="text-xs text-gray-400">{dueItems.length} cicilan</p>
            </div>
          </div>

          {dueItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cicilan Jatuh Tempo</p>
              <div className="space-y-2">
                {dueItems.map(item => {
                  const overdue = new Date(item.dueDate) < new Date()
                  const total = item.principalAmount + item.interestAmount
                  return (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 p-2.5 rounded-lg bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800">
                          <span className="break-words">{item.lenderName} · cicilan ke-{item.installmentNo}</span>
                          {overdue && <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium align-middle">Lewat Tenggat</span>}
                        </p>
                        <p className="text-xs text-gray-400">Jatuh tempo {new Date(item.dueDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 shrink-0">{formatRupiah(total)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100">
            <Link href="/debts" className="text-xs font-medium text-brand hover:underline">Kelola Hutang →</Link>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500 mt-3">Memuat...</p>
      </div>
    </div>
  )
}
