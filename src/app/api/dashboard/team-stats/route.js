import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ACTIVE_STATUSES = ['HOLD', 'PITCHING', 'WAITING_PITCH_RESULT', 'PREPARATION', 'EVENT_DAY', 'REPORTING', 'INVOICING']
const PIPELINE_STAGES = ['HOLD', 'PITCHING', 'WAITING_PITCH_RESULT', 'PREPARATION', 'EVENT_DAY', 'REPORTING', 'INVOICING']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      status: true,
      division: true,
      pitchResult: true,
    },
  })

  function stats(list) {
    const active = list.filter(p => ACTIVE_STATUSES.includes(p.status))
    const won    = list.filter(p => p.pitchResult === 'WIN')
    const lost   = list.filter(p => p.pitchResult === 'LOSE')
    const pitched = won.length + lost.length
    const pipeline = {}
    for (const s of PIPELINE_STAGES) pipeline[s] = list.filter(p => p.status === s).length
    return {
      total:    list.length,
      active:   active.length,
      done:     list.filter(p => p.status === 'DONE').length,
      won:      won.length,
      pitched,
      winRate:  pitched > 0 ? Math.round((won.length / pitched) * 100) : null,
      pipeline,
    }
  }

  const eo = projects.filter(p => (p.division || 'EVENT') !== 'PH')
  const ph = projects.filter(p => p.division === 'PH')

  return Response.json({
    all: stats(projects),
    eo:  stats(eo),
    ph:  stats(ph),
  })
}
