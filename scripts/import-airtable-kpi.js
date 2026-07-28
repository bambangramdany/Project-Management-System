/**
 * Import KPI assessment data from Airtable CSV exports into the app database.
 *
 * Usage:
 *   node scripts/import-airtable-kpi.js
 *
 * Reads: Downloads/Gap Summary-Grid view.csv
 * Maps Airtable criteria to app KPI keys and inserts KpiAssessment records.
 */

import { PrismaClient } from '@prisma/client'
import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { resolve } from 'path'
import { homedir } from 'os'

const prisma = new PrismaClient()

// ── Criterion mapping: Airtable col → app kpiKey ──────────────────────────
// TJ + I are merged into responsibility_initiative (average)
// KomT + KolbT are merged into teamwork (average)
const CRITERIA_MAP = {
  KR:   'response_communication',
  KW:   'on_time_discipline',
  KHK:  'work_quality',
  TJ:   '_tj',          // intermediate — averaged with I → responsibility_initiative
  I:    '_i',           // intermediate
  KomT: '_komt',        // intermediate — averaged with KolbT → teamwork
  KolbT:'_kolbt',       // intermediate
  Kep:  'team_development',
  Ket:  'decision_making',
  AD:   'delegation',
}

// ── Name → user id map (from DB) ──────────────────────────────────────────
const NAME_MAP = {
  'TRI WULAN APRILIA':          'cmq6hegre0001scr0nic3wws8',
  'MUHAMMAD IRHAM ALIF FAKHRI': 'cmq6hegss0008scr03e66k82n',
  'KRESENSIA BANGUN':           'cmq6hegy5000gscr0apc432a1',
  'CLARISSA JENNIFER H':        'cmq6hegsj0007scr0gae5oib3',
  'ANGGA JULFIKAR':             'cmq6hegtb000dscr0bndguv2o',
  'JULIAN PUTRA PRAGIWAKA':     'cmq6hegvs000fscr0iuzs20xo',
  'NAUVAL M. ZIKRI K.P.':          'cmq7of0m5000ks8noqs77p20f',
  'NAUVAL M ZIKRI KUSHARI PUTRA':  'cmq7of0m5000ks8noqs77p20f',
  'DODDI CHAERIL FAUZI':        'cmq6hegta000ascr0mpz2jbso',
  'SOULTAN AZIEZ AZHAR':        'cmq6hegtb000bscr0o9wrghnl',
  'SAFFIRA AZKA FIRASYANI':     'cmq6hegrp0002scr0j0tk71py',
  'SITI NUR FITRIAH SALSABILAH':'cmq6hegl20000scr047ndhtla',
  // Mohammad Rizky Prayogi & Muhammad Syaifullah not in DB — skip
}

// Supervisor evaluators
const EVALUATOR_MAP = {
  'DAVID SETYAWAN':            'cmq6hegtb000cscr0co3e5i1i',
  'CLARISSA JENNIFER H':       'cmq6hegsj0007scr0gae5oib3',
  'CLARISSA JENNIFER HERIYANTO':'cmq6hegsj0007scr0gae5oib3',
}

// ── Month → period YYYY-MM ────────────────────────────────────────────────
const MONTH_MAP = {
  'Januari':  '2026-01',
  'Februari': '2026-02',
  'Maret':    '2026-03',
  'April':    '2026-04',
  'Mei':      '2026-05',
}

function cleanName(raw) {
  return (raw || '').split(',')[0].trim().toUpperCase()
}

function cleanPeriod(raw) {
  const p = (raw || '').split(',')[0].trim()
  return MONTH_MAP[p] || null
}

function avg(...vals) {
  const nums = vals.filter(v => v != null && !isNaN(v) && v !== 'NaN' && v !== '')
  if (!nums.length) return null
  return nums.reduce((a, b) => a + parseFloat(b), 0) / nums.length
}

async function main() {
  const csvPath = resolve(homedir(), 'Downloads', 'Gap Summary-Grid view.csv')
  console.log('Reading:', csvPath)

  const records = []

  await new Promise((res, rej) => {
    createReadStream(csvPath)
      .pipe(parse({ columns: true, bom: true, skip_empty_lines: true }))
      .on('data', row => records.push(row))
      .on('end', res)
      .on('error', rej)
  })

  console.log(`Parsed ${records.length} rows`)

  let inserted = 0, skipped = 0, errors = 0

  for (const row of records) {
    const rawName   = cleanName(row['Nama Dinilai'] || '')
    const rawPeriod = cleanPeriod(row['Periode Penilaian'] || '')

    if (!rawName || !rawPeriod) { skipped++; continue }

    const userId = NAME_MAP[rawName]
    if (!userId) {
      console.log(`  SKIP (no user): ${rawName}`)
      skipped++; continue
    }

    // Determine evaluator for supervisor assessment
    // The CSV has "Linked Penilaian" which mentions evaluator type but not name.
    // David Setyawan is the Event supervisor; Clarissa for Creative.
    // We'll infer from the user's division via DB.
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { divisi: true } })
    const supId = user?.divisi === 'CREATIVE'
      ? 'cmq6hegsj0007scr0gae5oib3'  // Clarissa
      : 'cmq6hegtb000cscr0co3e5i1i'  // David

    const period = rawPeriod

    // ── Parse self scores ──────────────────────────────────────────────
    const selfRaw = {
      KR:    row['Self KR'],
      KW:    row['Self KW'],
      KHK:   row['Self KHK'],
      TJ:    row['Self TJ'],
      I:     row['Self I'],
      KomT:  row['Self KomT'],
      KolbT: row['Self KolbT'],
      Kep:   row['Self Kep'],
      Ket:   row['Self Ket'],
      AD:    row['Self AD'],
    }

    // ── Parse supervisor scores ─────────────────────────────────────────
    const supRaw = {
      KR:    row['Supervisor KR'],
      KW:    row['Supervisor KW'],
      KHK:   row['Supervisor KHK'],
      TJ:    row['Supervisor TJ'],
      I:     row['Supervisor I'],
      KomT:  row['Supervisor KomT'],
      KolbT: row['Supervisor KolbT'],
      Kep:   row['Supervisor Kep'],
      Ket:   row['Supervisor Ket'],
      AD:    row['Supervisor AD'],
    }

    function toScore(v) {
      const n = parseFloat(v)
      if (isNaN(n) || n <= 0) return null
      return Math.round(Math.min(5, Math.max(1, n)))
    }

    // Build app-key → score maps (with merging)
    function buildAppMap(raw) {
      const map = {}
      // Direct mappings
      for (const [atKey, appKey] of Object.entries(CRITERIA_MAP)) {
        if (appKey.startsWith('_')) continue // intermediates handled below
        const v = toScore(raw[atKey])
        if (v != null) map[appKey] = v
      }
      // Merge TJ + I → responsibility_initiative
      const tj = toScore(raw.TJ), i = toScore(raw.I)
      const ri = avg(tj, i)
      if (ri != null) map['responsibility_initiative'] = Math.round(ri)
      // Merge KomT + KolbT → teamwork
      const komt = toScore(raw.KomT), kolbt = toScore(raw.KolbT)
      const tw = avg(komt, kolbt)
      if (tw != null) map['teamwork'] = Math.round(tw)
      return map
    }

    const selfScores = buildAppMap(selfRaw)
    const supScores  = buildAppMap(supRaw)

    // Upsert self-assessment records
    for (const [kpiKey, score] of Object.entries(selfScores)) {
      try {
        await prisma.kpiAssessment.upsert({
          where: { userId_evaluatorId_period_kpiKey: { userId, evaluatorId: userId, period, kpiKey } },
          update: { score, late: false },
          create: { userId, evaluatorId: userId, period, kpiKey, score, late: false },
        })
        inserted++
      } catch (e) {
        console.error(`  ERR self ${rawName} ${period} ${kpiKey}:`, e.message)
        errors++
      }
    }

    // Upsert supervisor assessment records
    for (const [kpiKey, score] of Object.entries(supScores)) {
      if (score === 0) continue // 0 = not rated in Airtable
      try {
        await prisma.kpiAssessment.upsert({
          where: { userId_evaluatorId_period_kpiKey: { userId, evaluatorId: supId, period, kpiKey } },
          update: { score, late: false },
          create: { userId, evaluatorId: supId, period, kpiKey, score, late: false },
        })
        inserted++
      } catch (e) {
        console.error(`  ERR sup ${rawName} ${period} ${kpiKey}:`, e.message)
        errors++
      }
    }

    console.log(`  ✓ ${rawName} ${period} — self:${Object.keys(selfScores).length} sup:${Object.keys(supScores).length}`)
  }

  console.log(`\nDone. Inserted/updated: ${inserted} | Skipped: ${skipped} | Errors: ${errors}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
