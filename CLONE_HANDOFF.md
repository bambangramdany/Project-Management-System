# Watermark PM — Clone Handoff

## Tujuan
Membuat instalasi kedua dari sistem ini (Watermark PM) dengan database Supabase baru dan akun yang sepenuhnya terpisah dari instalasi produksi milik Watermark Event Management. Kedua instalasi berjalan independen — perubahan di satu tidak mempengaruhi yang lain.

---

## Stack
- **Next.js 14** App Router, `'use client'` + `export const dynamic = 'force-dynamic'`
- **Prisma ORM** (v5) — schema di `prisma/schema.prisma`
- **Supabase PostgreSQL** — transaction pooler (pgbouncer), IPv4-compatible
- **NextAuth v4** — JWT strategy, halaman login custom di `/login`
- **Tailwind CSS** — utility classes + custom classes di `globals.css` (`.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.select`, `.label`)
- **Vercel** — deployment + Cron Jobs untuk reminder harian

---

## Langkah Clone

### 1. Duplikasi repo
```bash
# Clone repo yang sudah ada
git clone <repo-url> watermark-pm-clone
cd watermark-pm-clone
npm install
```

### 2. Buat project Supabase baru
- Buka supabase.com → New Project
- Catat: Project URL, anon key (tidak dipakai), dan **connection strings**
- Di Settings → Database → Connection String:
  - Ambil **Transaction pooler** (port 6543) untuk `DATABASE_URL`
  - Ambil **Direct connection** (port 5432) untuk `DIRECT_URL`
- **PENTING**: Supabase project baru = IPv6-only pada direct connection. Pakai transaction pooler untuk `DATABASE_URL` agar Vercel (IPv4) bisa konek.

### 3. Buat file `.env.local` (JANGAN commit ke git)
```env
DATABASE_URL="postgresql://postgres.XXXX:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.XXXX:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="generate-dengan-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```
- `DATABASE_URL` wajib ada `?pgbouncer=true` — tanpa ini setiap query di production lempar `PrismaClientUnknownRequestError`
- `NEXTAUTH_SECRET`: jalankan `openssl rand -base64 32` di terminal untuk generate

### 4. Push schema ke database baru
```bash
npx prisma db push
```
Ini membuat semua tabel dari scratch di Supabase project baru.

### 5. Seed akun pertama (Owner/Admin)
Karena database kosong, perlu buat user pertama manual. Jalankan script ini sekali:
```bash
node scripts/seed-owner.js
```
Jika script belum ada, buat `scripts/seed-owner.js`:
```js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('password-baru-anda', 10)
  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@perusahaan.com',
      hashedPassword: hash,
      role: 'OWNER',
    }
  })
  console.log('Owner created')
}
main().finally(() => prisma.$disconnect())
```
Sesuaikan email dan password sebelum dijalankan.

### 6. Jalankan dev server
```bash
npm run dev
```
Buka `http://localhost:3000`, login dengan akun owner yang baru dibuat.

### 7. Deploy ke Vercel (opsional)
- Buat project Vercel baru (jangan pakai project yang sama dengan produksi)
- Set environment variables: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (isi dengan URL Vercel setelah deploy)
- Untuk Cron Jobs (reminder harian), tambahkan `CRON_SECRET` di env Vercel dan pastikan `vercel.json` sudah ada

---

## Fitur yang Sudah Ada

### Manajemen Project & Tim
- CRUD project dengan status, divisi, client, PIC, anggota tim
- Task assignment per project + personal task
- Workload monitoring + Gantt chart timeline
- Project profitability tab (RAB vs realisasi)

### Daily Operations (Tim Operasional)
- `/my-tasks` — halaman utama staff: update status tugas (Berjalan/Terlambat/Hold/Bermasalah/Selesai), dikelompokkan berdasarkan urgensi
- Daily check-in: morning ack (09:30) + evening report (17:00–20:00 WIB)
- Event Day Mode — banner khusus saat ada event hari ini: rundown, crew status, laporan masalah
- Staff non-manajerial otomatis redirect ke `/my-tasks` setelah login
- Widget kinerja bulanan: streak check-in, persentase update, on-time rate

### Finance
- Payment Request dengan approval flow: PENDING_OWNER → PENDING_FINANCE_DIRECTOR → APPROVED_BY_DIRECTOR → PAID
- Invoice tracking (nomor, tanggal, URL scan) dengan aging alert
- Cash ledger, piutang (receivables), OPEX, aset, gaji
- Quotation builder + invoice generator

### SDM & Evaluasi
- KPI assessment per role per periode
- HRD monthly evaluation (sikap + skill)
- Sharing session tracking
- `/reports` — Laporan Kinerja Tim: check-in rate, update rate, KPI avg, skor HRD, total skor tertimbang per bulan, per divisi

### Supply Chain
- Vendor database dengan tier (A/B/C) + 5-dimensi scorecard
- AVL (Approved Vendor List) per kategori
- Vendor picker di QuotationForm dengan badge tier + skor

### Lainnya
- Client database dengan revenue analytics, riwayat project, CRUD kontak PIC
- Notifikasi in-app
- Audit log
- Pengumuman tim (termasuk auto-generate birthday)

---

## Struktur File Penting
```
src/
  app/
    api/              ← semua API routes
      my-tasks/       ← GET task list + POST progress update
      event-day/      ← GET event hari ini + crew status
      event-issues/   ← POST laporan masalah
      reports/team-performance/ ← GET laporan kinerja bulanan
      daily-checkin/  ← GET/POST/PATCH check-in pagi & sore
      payments/       ← approval flow payment request
      ...
    my-tasks/page.jsx ← halaman utama tim operasional
    reports/page.jsx  ← laporan kinerja (manajer)
    finance/page.jsx  ← approval & invoice tracker
    workload/page.jsx ← workload + Gantt
    dashboard/page.jsx← dashboard manajerial
  components/
    EventDayBanner.jsx    ← event day mode UI
    PersonalStatsWidget.jsx ← widget kinerja bulanan
    ProjectProfitabilityTab.jsx
    Navbar.jsx
    ...
lib/
  prisma.ts  ← WAJIB: import { prisma } from '@/lib/prisma' (named export, bukan default)
  auth.js    ← NextAuth config
  rbac.js    ← role-based access helpers
  notify.js  ← notifikasi in-app
prisma/
  schema.prisma ← source of truth semua model
```

---

## Hal Penting / Gotcha

| Masalah | Solusi |
|---|---|
| `PrismaClientUnknownRequestError` di production | Tambahkan `?pgbouncer=true` ke `DATABASE_URL` |
| Supabase direct connection gagal di Vercel | Pakai transaction pooler (port 6543) untuk `DATABASE_URL` |
| Dev server crash setelah `prisma db push` | Restart `npm run dev` — Prisma client perlu di-refresh |
| `next build` saat dev server jalan | Jangan build saat dev running — `.next` cache bisa corrupt |
| Flex container overflow tidak terpotong | Tambahkan `min-h-0` pada flex child + `h-screen` (bukan `min-h-screen`) pada ancestor |
| Import prisma | Selalu `import { prisma } from '@/lib/prisma'` — bukan default import |
| `.env.*` files | JANGAN commit ke git — sudah di-cover `.gitignore` |

---

## Role System
```
OWNER           → akses penuh semua fitur, lihat semua tim
DIRECTOR        → akses manajemen divisinya sendiri
PROJECT_MANAGER → kelola project, lihat workload
PRODUCER        → mirip PM
FINANCE         → akses penuh modul keuangan
FINANCE_STAFF   → akses terbatas keuangan
PRODUCTION / PROJECT_OFFICER / CREATIVE_LEAD /
GRAPHIC_DESIGNER / STAGE_DESIGNER / CONTENT_CREATOR /
EDITOR / INTERNSHIP / MEMBER
                → redirect ke /my-tasks setelah login
```

---

## Yang TIDAK perlu diubah untuk clone
Semua kode aplikasi bisa dipakai langsung. Yang berbeda hanya:
1. File `.env.local` (koneksi database + secret baru)
2. Data di database (user, project, client, dll — semuanya kosong di awal)
3. URL Vercel deployment (jika di-deploy)
