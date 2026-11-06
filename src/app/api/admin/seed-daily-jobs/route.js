import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Daily job list dari Excel "DAILY JOB LIST FINANCE_HRGA 2026"
// ✅ = primary responsibility, 🔶 = support/backup
const DAILY_JOBS = {
  Antoni: [
    { title: 'Klik BCA – Create', timing: 'Daily', deadline: 'Senin & Kamis', dept: 'Finance', role: 'primary' },
    { title: 'LK Mingguan (LK, Control Payment, All Client)', timing: 'Weekly', deadline: "Jum'at", dept: 'Finance', role: 'primary' },
    { title: 'LK Bulanan (All)', timing: 'Weekly', deadline: 'Selasa (Week 1)', dept: 'Finance', role: 'primary' },
    { title: 'LK Tahunan', timing: 'Yearly', deadline: 'Feb', dept: 'Finance', role: 'primary' },
    { title: 'LK Pajak dan SPT Tahunan', timing: 'Yearly', deadline: 'Feb', dept: 'Finance', role: 'support' },
    { title: 'Laporan Piutang → Control Payment', timing: 'Weekly', deadline: "Jum'at", dept: 'Finance', role: 'primary' },
    { title: 'Laporan Hutang → Rekonsiliasi', timing: 'Monthly', dept: 'Finance', role: 'primary' },
    { title: 'Budgeting', timing: 'Monthly', deadline: 'Tgl 2', dept: 'Finance', role: 'support' },
    { title: 'Report Payroll – BPJS TK, BPJS Kesehatan, PPh 21', timing: 'Monthly', deadline: 'Tgl 21', dept: 'Finance', role: 'primary' },
    { title: 'Report Payroll – Salary', timing: 'Monthly', deadline: 'Tgl 21', dept: 'Finance', role: 'support' },
    { title: 'Bayar dan Lapor Payroll → BPJS TK, BPJS Kesehatan, PPh 21', timing: 'Monthly', deadline: 'Tgl 8', dept: 'Finance', role: 'primary' },
    { title: 'Jurnal Project', timing: 'If Any', dept: 'Finance', role: 'primary' },
    { title: 'Jurnal Reimbursement', timing: 'Weekly', deadline: 'Kamis', dept: 'Finance', role: 'primary' },
    { title: 'Pertanggungjawaban Kasbon Project', timing: 'If Any', deadline: 'H+1 day', dept: 'Finance', role: 'primary' },
    { title: 'Pihak ke-3 Project', timing: 'If Any', deadline: 'H+1 week', dept: 'Finance', role: 'support' },
    { title: 'Pajak Project (PPh 21, PPh 23, PPh 4(2), PPh Final)', timing: 'If Any', dept: 'Finance', role: 'support' },
    { title: 'Klaim Pengobatan Karyawan', timing: 'Weekly', deadline: 'Kamis', dept: 'HRD', role: 'primary' },
    { title: 'Klaim Ganti Hari/Uang', timing: 'Weekly', deadline: "Jum'at", dept: 'HRD', role: 'primary' },
    { title: 'Reimbursement & Kartu Kredit WTM', timing: 'Weekly', deadline: 'Rabu', dept: 'HRD', role: 'primary' },
    { title: 'Penilaian Kinerja Karyawan', timing: 'Monthly', dept: 'HRD', role: 'support' },
    { title: 'Standard Operation Procedure (SOP)', timing: 'Yearly', dept: 'HRD', role: 'support' },
    { title: 'Struktur Organisasi', timing: 'If Any', dept: 'HRD', role: 'support' },
    { title: 'BPJS Karyawan (TK dan Kes)', timing: 'If Any', dept: 'HRD', role: 'primary' },
    { title: 'Data Legal Perusahaan', timing: 'If Any', dept: 'HRD', role: 'primary' },
    { title: 'Akta Perusahaan', timing: 'Yearly', deadline: 'Jan 2029', dept: 'HRD', role: 'support' },
    { title: 'Perijinan Perusahaan (NIB)', timing: 'Yearly', dept: 'HRD', role: 'support' },
    { title: 'Stock Opname (STO) – Data Accounting', timing: '6 Monthly', deadline: 'Des & Jul', dept: 'Bagian Umum', role: 'primary' },
    { title: 'Administrasi Gudang', timing: 'Daily', dept: 'Bagian Umum', role: 'support' },
    { title: 'Support Event & PH (Based on Request User)', timing: 'If Any', dept: 'Bagian Umum', role: 'support' },
  ],
  Bima: [
    { title: 'Laporan Piutang → Control Payment', timing: 'Weekly', deadline: "Jum'at", dept: 'Finance', role: 'support' },
    { title: 'Invoicing', timing: 'Daily', dept: 'Finance', role: 'primary' },
    { title: 'Budgeting', timing: 'Monthly', deadline: 'Tgl 2', dept: 'Finance', role: 'support' },
    { title: 'Bayar dan Lapor PPN', timing: 'Monthly', deadline: 'Tgl 8', dept: 'Finance', role: 'primary' },
    { title: 'Bayar dan Lapor Pajak (PPh 21, PPh 23, PPh 4(2), PPh Final)', timing: 'Monthly', deadline: 'Tgl 8', dept: 'Finance', role: 'primary' },
    { title: 'Bukti Potong PPh 23 → Invoice Client', timing: 'Monthly', deadline: 'End of Month', dept: 'Finance', role: 'primary' },
    { title: 'Asset (Update Penomoran Data)', timing: 'Monthly', dept: 'Finance', role: 'primary' },
    { title: 'Perlengkapan & Peralatan', timing: 'Monthly', dept: 'Finance', role: 'primary' },
    { title: 'Petty Cash', timing: 'Weekly', deadline: 'Senin', dept: 'Finance', role: 'primary' },
    { title: 'Jurnal Project', timing: 'If Any', dept: 'Finance', role: 'support' },
    { title: 'Jurnal Reimbursement', timing: 'Weekly', deadline: 'Kamis', dept: 'Finance', role: 'support' },
    { title: 'Pertanggungjawaban Kasbon Project', timing: 'If Any', dept: 'Finance', role: 'support' },
    { title: 'Pihak ke-3 Project', timing: 'If Any', dept: 'Finance', role: 'primary' },
    { title: 'Pajak Project (PPh 21, PPh 23, PPh 4(2), PPh Final)', timing: 'If Any', dept: 'Finance', role: 'primary' },
    { title: 'Absensi (Absen Kehadiran dan Morning Briefing)', timing: 'Daily', deadline: "Jum'at", dept: 'HRD', role: 'primary' },
    { title: 'Reimbursement & Kartu Kredit WTM', timing: 'Weekly', deadline: 'Rabu', dept: 'HRD', role: 'support' },
    { title: 'Proses Seleksi Rekrutmen', timing: 'Monthly', dept: 'HRD', role: 'primary' },
    { title: 'Aplikasi Rekrutmen', timing: 'Monthly', dept: 'HRD', role: 'primary' },
    { title: 'Psikotest by Gratyo', timing: 'If Any', dept: 'HRD', role: 'support' },
    { title: 'Seminar/Training', timing: 'Monthly', dept: 'HRD', role: 'primary' },
    { title: 'Standard Operation Procedure (SOP)', timing: 'Yearly', dept: 'HRD', role: 'support' },
    { title: 'Struktur Organisasi', timing: 'If Any', dept: 'HRD', role: 'support' },
    { title: 'Hampers Hari Raya Idul Fitri', timing: 'Yearly', deadline: 'Feb', dept: 'HRD', role: 'primary' },
    { title: 'Hampers Hari Natal & Tahun Baru', timing: 'Yearly', deadline: 'Nov', dept: 'HRD', role: 'primary' },
    { title: 'Databased Karyawan', timing: 'Monthly', deadline: 'Tgl 5', dept: 'HRD', role: 'primary' },
    { title: 'Kontrak Magang', timing: 'If Any', dept: 'HRD', role: 'primary' },
    { title: 'Data Legal Perusahaan', timing: 'If Any', dept: 'HRD', role: 'support' },
    { title: 'Akta Perusahaan', timing: 'Yearly', deadline: 'Jan 2029', dept: 'HRD', role: 'support' },
    { title: 'Perijinan Perusahaan (NIB)', timing: 'Yearly', dept: 'HRD', role: 'primary' },
    { title: 'WLKP-Kemenaker', timing: '3 Monthly', deadline: 'Mar, Jun, Sep, Des', dept: 'HRD', role: 'primary' },
    { title: 'OSS', timing: '6 Monthly', deadline: 'Juni & Des', dept: 'HRD', role: 'primary' },
    { title: 'Medical Check Up', timing: 'Yearly', deadline: 'Feb', dept: 'HRD', role: 'primary' },
    { title: 'Outing/Gathering Karyawan', timing: 'Yearly', deadline: 'Mei - Agust', dept: 'HRD', role: 'primary' },
    { title: 'Belanja Bulanan & Makan', timing: 'Weekly', deadline: 'Senin', dept: 'Bagian Umum', role: 'primary' },
    { title: 'Listrik, Internet, Air, Keamanan, Sumbangan', timing: 'Monthly', dept: 'Bagian Umum', role: 'primary' },
    { title: 'Pajak Mobil', timing: 'Yearly', deadline: 'Agust', dept: 'Bagian Umum', role: 'primary' },
    { title: 'Service AC dan Maintenance Barang Kantor', timing: 'If Any', dept: 'Bagian Umum', role: 'primary' },
    { title: 'Kaos Watermark', timing: 'If Any', dept: 'Bagian Umum', role: 'primary' },
    { title: 'Stock Opname (STO) – Barang', timing: '6 Monthly', deadline: 'Des & Jul', dept: 'Bagian Umum', role: 'primary' },
    { title: 'Stock Opname (STO) – Data Accounting', timing: '6 Monthly', dept: 'Bagian Umum', role: 'support' },
    { title: 'Administrasi Gudang', timing: 'Daily', dept: 'Bagian Umum', role: 'primary' },
    { title: 'Tiket dan Hotel (Sistem Velosita)', timing: 'If Any', dept: 'Bagian Umum', role: 'primary' },
    { title: 'Support Event & PH (Based on Request User)', timing: 'If Any', dept: 'Bagian Umum', role: 'support' },
    { title: 'Aplikasi Project Pitching Client (ADM, Pertamina Tugu, Epson)', timing: 'If Any', dept: 'Bagian Umum', role: 'primary' },
    { title: 'Masak Makan Siang', timing: 'Daily', dept: 'GA', role: 'support' },
    { title: 'Belanja Kantor', timing: 'Monthly', dept: 'GA', role: 'support' },
    { title: 'Service/Cleaning AC', timing: '4 Monthly', dept: 'GA', role: 'support' },
  ],
  Sutrisna: [
    { title: 'Service AC dan Maintenance Barang Kantor', timing: 'If Any', dept: 'Bagian Umum', role: 'support' },
    { title: 'Stock Opname (STO) – Barang', timing: '6 Monthly', dept: 'Bagian Umum', role: 'support' },
    { title: 'Cleaning Lantai 1 + Dapur', timing: 'Daily', deadline: 'Jam 15.00', dept: 'GA', role: 'primary' },
    { title: 'Cleaning Lantai Mezzanin & Gudang', timing: 'Daily', deadline: 'Jam 10.00', dept: 'GA', role: 'support' },
    { title: 'Cleaning Lantai 2', timing: 'Daily', deadline: 'Jam 10.00', dept: 'GA', role: 'primary' },
    { title: 'Cleaning Lantai 3', timing: 'Daily', deadline: 'Jam 10.00', dept: 'GA', role: 'primary' },
    { title: 'Cleaning Lantai 4 + Musholla', timing: 'Daily', deadline: 'Jam 14.00', dept: 'GA', role: 'primary' },
    { title: 'Cleaning Kamar Mandi Lantai 1 & 2', timing: 'Daily', deadline: 'Jam 10.00', dept: 'GA', role: 'primary' },
    { title: 'Kebersihan Tempat Sampah', timing: 'Daily', deadline: 'Jam 16.30', dept: 'GA', role: 'primary' },
    { title: 'Belanja Pasar', timing: 'Daily', deadline: 'Jam 09.00', dept: 'GA', role: 'primary' },
    { title: 'Masak Makan Siang', timing: 'Daily', deadline: 'Jam 12.00', dept: 'GA', role: 'primary' },
    { title: 'Administrasi dan Prosedur Barang Gudang', timing: 'Daily', dept: 'GA', role: 'primary' },
    { title: 'Cek Listrik dan Peralatan Kantor', timing: 'Weekly', dept: 'GA', role: 'primary' },
    { title: 'Monitor Penggunaan AC Harian', timing: 'Working Day', dept: 'GA', role: 'primary' },
    { title: 'Service/Cleaning AC', timing: '4 Monthly', dept: 'GA', role: 'primary' },
    { title: 'Support Event & PH (Based on Request User)', timing: 'If Any', dept: 'GA', role: 'support' },
    { title: 'Logistik Project', timing: 'If Any', dept: 'GA', role: 'support' },
  ],
  Henri: [
    { title: 'Pajak Mobil', timing: 'Yearly', deadline: 'Agust', dept: 'Bagian Umum', role: 'support' },
    { title: 'Service AC dan Maintenance Barang Kantor', timing: 'If Any', dept: 'Bagian Umum', role: 'support' },
    { title: 'Stock Opname (STO) – Barang', timing: '6 Monthly', dept: 'Bagian Umum', role: 'support' },
    { title: 'Cleaning Lantai 1 + Dapur', timing: 'Daily', deadline: 'Jam 15.00', dept: 'GA', role: 'support' },
    { title: 'Cleaning Lantai Mezzanin & Gudang', timing: 'Daily', deadline: 'Jam 10.00', dept: 'GA', role: 'primary' },
    { title: 'Cleaning Lantai 2', timing: 'Daily', deadline: 'Jam 10.00', dept: 'GA', role: 'support' },
    { title: 'Cleaning Lantai 3', timing: 'Daily', deadline: 'Jam 10.00', dept: 'GA', role: 'support' },
    { title: 'Cleaning Lantai 4 + Musholla', timing: 'Daily', deadline: 'Jam 14.00', dept: 'GA', role: 'support' },
    { title: 'Cleaning Kamar Mandi Lantai 1 & 2', timing: 'Daily', deadline: 'Jam 10.00', dept: 'GA', role: 'support' },
    { title: 'Kebersihan Tempat Sampah', timing: 'Daily', deadline: 'Jam 16.30', dept: 'GA', role: 'support' },
    { title: 'Belanja Pasar', timing: 'Daily', deadline: 'Jam 09.00', dept: 'GA', role: 'support' },
    { title: 'Masak Makan Siang', timing: 'Daily', deadline: 'Jam 12.00', dept: 'GA', role: 'support' },
    { title: 'Administrasi dan Prosedur Barang Gudang', timing: 'Daily', dept: 'GA', role: 'support' },
    { title: 'Kebersihan Luar & Dalam Mobil', timing: 'Daily', deadline: 'Jam 12.00', dept: 'GA', role: 'primary' },
    { title: 'Cek Kondisi Mobil', timing: 'Daily', dept: 'GA', role: 'primary' },
    { title: 'Cek Listrik dan Peralatan Kantor', timing: 'Weekly', dept: 'GA', role: 'primary' },
    { title: 'Belanja Kantor', timing: 'Monthly', dept: 'GA', role: 'primary' },
    { title: 'Operational Delivery Kantor', timing: 'If Any', dept: 'GA', role: 'primary' },
    { title: 'Monitor Penggunaan AC Harian', timing: 'Working Day', dept: 'GA', role: 'primary' },
    { title: 'Service/Cleaning AC', timing: '4 Monthly', dept: 'GA', role: 'primary' },
    { title: 'Support Event & PH (Based on Request User)', timing: 'If Any', dept: 'GA', role: 'support' },
    { title: 'Logistik Project', timing: 'If Any', dept: 'GA', role: 'primary' },
  ],
}

const USER_IDS = {
  Antoni:   'cmu6fu5ig000h62ezazzdikyu',
  Bima:     'cmu6fu5mv000s62ezdrf2nsg2',
  Sutrisna: 'cmu6fu5mh000p62ezvoodf7ey',
  Henri:    'cmu6fu5lx000n62ez8fwh6q6x',
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden — hanya OWNER' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  // mode: 'check' (dry run) | 'insert' (actual insert)
  const mode = body.mode || 'check'

  const results = {}
  let totalInserted = 0

  for (const [name, jobs] of Object.entries(DAILY_JOBS)) {
    const userId = USER_IDS[name]

    // Check existing to avoid duplicates
    const existingTitles = await prisma.personalTask.findMany({
      where: { userId },
      select: { title: true },
    }).then(r => new Set(r.map(t => t.title)))

    const toInsert = jobs.filter(j => !existingTitles.has(j.title))

    if (mode === 'insert' && toInsert.length > 0) {
      await prisma.personalTask.createMany({
        data: toInsert.map((j, idx) => ({
          userId,
          title: j.title,
          description: `[${j.role === 'primary' ? 'Tanggung Jawab Utama' : 'Peran Support'}] ${j.dept} · ${j.timing}${j.deadline ? ' · ' + j.deadline : ''}`,
          order: 1000 + idx, // append after existing tasks
        })),
      })
      totalInserted += toInsert.length
    }

    results[name] = {
      total: jobs.length,
      existing: existingTitles.size,
      toInsert: toInsert.length,
      ...(mode === 'insert' ? { inserted: toInsert.length } : {}),
    }
  }

  return NextResponse.json({ mode, results, totalInserted: mode === 'insert' ? totalInserted : undefined })
}
