# Watermark PM — Project Management System

Aplikasi manajemen project untuk tim Watermark Event Management.

---

## Fitur (Fase 1)

- **Auth** — Login per user, role-based access
- **Projects** — Full pipeline dari Hold → Done/Failed/Canceled, sesuai data Airtable
- **Tasks** — Checklist per project dengan dependency engine (task terkunci otomatis)
- **Workload Tim** — Heatmap beban kerja per anggota, breakdown PIC vs member
- **Team** — Direktori tim per divisi (Event/Creative)
- **Data seed** — 17 user, 29 klien, 30 project dari data Airtable asli

---

## Quick Start (Lokal)

### 1. Clone & Install

```bash
cd watermark-pm
npm install
```

### 2. Setup Database

Buat database PostgreSQL. Cara tercepat: buat project di [Supabase](https://supabase.com) (gratis), copy connection string.

```bash
cp .env.example .env
# Edit .env: isi DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 3. Inisialisasi Database

```bash
npm run db:push    # buat tabel
npm run db:seed    # isi data awal
```

### 4. Jalankan

```bash
npm run dev
# Buka http://localhost:3000
```

---

## Login Credentials (setelah seed)

| User | Email | Password |
|------|-------|----------|
| HRD (Owner/Admin) | hrdwatermark@gmail.com | watermark2026 |
| Wulan (PM) | wulan@watermark.co.id | watermark2026 |
| Irham (PM) | irham@watermark.co.id | watermark2026 |
| Semua tim | [nama]@watermark.co.id | watermark2026 |

> **Wajib**: Ganti password semua user setelah production deploy!

---

## Deploy ke Vercel + Supabase (Gratis)

### Database: Supabase
1. Buka [supabase.com](https://supabase.com) → New Project
2. Tunggu setup selesai → Settings → Database → Connection string (URI)
3. Copy URL, paste ke `DATABASE_URL` di env

### App: Vercel
1. Push folder ini ke GitHub
2. Buka [vercel.com](https://vercel.com) → New Project → import repo
3. Tambahkan environment variables:
   - `DATABASE_URL` = connection string Supabase
   - `NEXTAUTH_SECRET` = string acak (openssl rand -base64 32)
   - `NEXTAUTH_URL` = https://nama-project.vercel.app
4. Deploy → setelah deploy, jalankan seed via Vercel CLI:
   ```bash
   npx vercel env pull .env.local
   npm run db:push
   npm run db:seed
   ```

---

## Role & Akses

| Role | Lihat Semua Project | Edit Project | Kelola User |
|------|--------------------|--------------|----|
| OWNER | ✓ | ✓ | ✓ |
| PROJECT_MANAGER | ✓ | ✓ | ✗ |
| Semua lainnya | Hanya project sendiri | ✗ | ✗ |

---

## Pipeline Project

```
HOLD → PITCHING → WAITING_PITCH_RESULT → PREPARATION → EVENT_DAY → REPORTING → INVOICING → DONE
                                                                                          ↘ FAILED
                                                                                          ↘ CANCELED
```

---

## Roadmap

- **Fase 2**: Communication log, file upload, approval workflow
- **Fase 3**: Notifikasi email, reporting & export PDF/Excel
- **Fase 4**: AI assistant (brief → generate tasks otomatis via Claude API)
