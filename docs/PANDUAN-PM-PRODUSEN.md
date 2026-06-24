# Panduan Penggunaan Sistem Watermark PM
### Untuk Tim Project Manager & Produser

---

## Daftar Isi

1. [Gambaran Sistem](#1-gambaran-sistem)
2. [Alur Kerja Utama: Dari Brief hingga Done](#2-alur-kerja-utama-dari-brief-hingga-done)
3. [Membuat Project Baru](#3-membuat-project-baru)
4. [Status Project & Kapan Mengubahnya](#4-status-project--kapan-mengubahnya)
5. [Manajemen Task](#5-manajemen-task)
6. [Budget & Pengeluaran (Forecast)](#6-budget--pengeluaran-forecast)
7. [Pengajuan Pembayaran (Payment Request)](#7-pengajuan-pembayaran-payment-request)
8. [Quotation](#8-quotation)
9. [Tim Project](#9-tim-project)
10. [Client Brief](#10-client-brief)
11. [Catatan Evaluasi Tim](#11-catatan-evaluasi-tim)
12. [Vendor & Klien](#12-vendor--klien)
13. [Piutang (Finance)](#13-piutang-finance)
14. [Penilaian Tim](#14-penilaian-tim)
15. [Dashboard & Workload](#15-dashboard--workload)
16. [Tips & Hal yang Perlu Diperhatikan](#16-tips--hal-yang-perlu-diperhatikan)

---

## 1. Gambaran Sistem

Watermark PM adalah sistem manajemen project internal yang mencakup:

| Modul | Fungsi |
|---|---|
| **Projects** | Pusat kendali semua project: task, budget, tim, dokumen |
| **Finance** | Piutang, laporan margin, forecast keuangan |
| **Quotation** | Buat dan kelola penawaran ke klien |
| **Invoice** | Kelola penagihan ke klien |
| **Vendor** | Database vendor dengan riwayat kerja sama |
| **Klien** | Database klien dan histori project |
| **Penilaian** | KPI bulanan & penilaian per-project |
| **Workload Tim** | Melihat beban kerja tim secara keseluruhan |

**Divisi yang ada di sistem:**
- **Event (EO)** — Meeting & Conference, Activation, Launching, Exhibition, Incentive & Gathering, Sponsorship
- **Production House (PH)** — Corporate Profile, Commercial, Event Documentation, Social Media Content, Training Video, Product Explainer, Motion Graphic, Documentary

---

## 2. Alur Kerja Utama: Dari Brief hingga Done

```
BRIEF MASUK
    │
    ▼
[HOLD] ──────────────────────────────────────┐
    │                                         │
    │  Mulai proses pitch                     │ Project dibatalkan
    ▼                                         │
[PITCHING] ──────── submit proposal ─────────┤
    │                                         │
    ▼                                         │
[WAITING_PITCH_RESULT] ──── tunggu hasil ────┤
    │                                         │
    ├── LOSE ─────── evaluasi + dokumentasi ──┤
    │                                         │
    └── WIN ──────────────────────────────────┤
         │                                    │
         ▼                                    │
    [PREPARATION] ── eksekusi project ────────┤
         │                                    │
         ▼                                    │
    [EVENT_DAY] ── hari-H ────────────────────┤
         │                                    │
         ▼                                    │
    [REPORTING] ── laporan pasca event ───────┤
         │                                    │
         ▼                                    │
    [INVOICING] ── kirim invoice ke klien ────┤
         │                                    │
         ▼                                    │
    [DONE] ────── project selesai ────────────┘
                                              │
                                          [CANCELED]
```

---

## 3. Membuat Project Baru

### Cara membuat project

1. Buka halaman **Projects** → klik tombol **+ Project Baru**
2. Isi detail project:

| Field | Keterangan | Wajib? |
|---|---|---|
| **Nama Project** | Nama lengkap project | ✅ |
| **Klien** | Pilih dari database klien | ✅ |
| **Kategori** | Pilih tipe project (EO atau PH) | ✅ |
| **Divisi** | Event / Production House | ✅ |
| **PIC** | Project Manager penanggung jawab | ✅ |
| **Nilai Project (Rp)** | Nilai project yang disepakati dengan klien | ⚠️ Isi segera |
| **Budget Tier** | Low / Medium / High — menentukan bobot workload | ⬜ |
| **Kompleksitas** | Simple / Medium / Complex / High | ⬜ |
| **Tanggal Brief** | Kapan brief pertama diterima | ⬜ |
| **Tanggal Mulai** | Tanggal mulai persiapan/event | ⬜ |
| **Tanggal Selesai** | Tanggal event/deliverable selesai | ⬜ |
| **Pitch Status** | PITCH / PITCH+ / AUTO WIN / CANCEL | ⬜ |
| **Catatan** | Informasi tambahan | ⬜ |

> ⚠️ **Penting:** Isi **Nilai Project** sesegera mungkin. Ini yang dipakai untuk laporan omset dan margin perusahaan. Kalau kosong, project tidak terhitung di laporan keuangan.

### SOP Checklist otomatis

Ketika project dibuat, sistem otomatis membuat **checklist task SOP** berdasarkan kategori project. Contoh untuk kategori **Meeting & Conference**:

- Brief & kebutuhan klien dikonfirmasi
- Susun proposal & RAB awal
- Survey lokasi / venue
- Konfirmasi vendor utama
- Susun rundown acara
- Briefing tim & vendor H-1
- Pelaksanaan event
- Dokumentasi & laporan akhir
- Invoice & penagihan ke klien
- Setup ruang meeting & perlengkapan AV
- Konfirmasi daftar peserta & undangan

> Task-task ini bisa diubah, ditambah, atau dihapus sesuai kebutuhan project.

---

## 4. Status Project & Kapan Mengubahnya

Selalu update status project secara real-time agar laporan akurat.

| Status | Artinya | Kapan Diset |
|---|---|---|
| **HOLD** | Brief masuk, belum ada tindakan | Saat project pertama dibuat |
| **PITCHING** | Sedang menyiapkan proposal/pitch | Saat mulai mengerjakan proposal |
| **WAITING PITCH RESULT** | Proposal sudah dikirim, tunggu keputusan klien | Setelah proposal/penawaran dikirim |
| **PREPARATION** | Project dimenangkan, sedang persiapan | Segera setelah konfirmasi WIN dari klien |
| **EVENT DAY** | Hari pelaksanaan event/shooting | Di hari-H event berlangsung |
| **REPORTING** | Pasca event, sedang buat laporan | Setelah event selesai |
| **INVOICING** | Invoice sudah dikirim, menunggu pembayaran | Setelah invoice dikirim ke klien |
| **DONE** | Project selesai & lunas | Setelah pembayaran klien diterima |
| **FAILED** | Pitch kalah | Setelah konfirmasi kalah dari klien |
| **CANCELED** | Project dibatalkan | Saat project batal di tahap manapun |

### Cara ubah status

- Di halaman Projects (list): klik langsung pada badge status project → muncul dropdown
- Di halaman detail project (tab Info): edit di bagian Info

### Pitch Result

Selain status, isi juga **Pitch Result** setelah hasil pitch diketahui:

| Pitch Result | Kapan Diisi |
|---|---|
| **WIN** | Klien konfirmasi kita menang pitch |
| **LOSE** | Klien konfirmasi kita kalah |
| **NOT FINAL** | Keputusan klien belum final |

---

## 5. Manajemen Task

### Membuat task

Di halaman detail project, tab **Tasks** → klik **+ Task Baru**

| Field | Keterangan |
|---|---|
| **Judul Task** | Deskripsi singkat pekerjaan |
| **Assignee** | Siapa yang bertanggung jawab mengerjakan |
| **Priority** | LOW / MEDIUM / HIGH / URGENT |
| **Due Date** | Deadline task |
| **Open-ended** | Centang jika task tidak punya deadline tetap |

### Status task

| Status | Artinya |
|---|---|
| **TODO** | Belum mulai dikerjakan |
| **IN_PROGRESS** | Sedang dikerjakan |
| **DONE** | Selesai |
| **BLOCKED** | Ada hambatan, tidak bisa dilanjutkan |

Klik badge status di baris task untuk mengubahnya langsung.

### Komentar & Mention

Setiap task punya fitur komentar. Gunakan **@nama** untuk mention anggota tim — mereka akan dapat notifikasi.

### Task dependency

Task bisa dibuat saling bergantung: task B tidak bisa dimulai sebelum task A selesai. Ini membantu PM mengelola urutan pekerjaan.

---

## 6. Budget & Pengeluaran (Forecast)

Tab **Budget** di halaman detail project adalah tempat merencanakan dan mencatat semua pengeluaran project.

### Struktur Budget

Setiap item budget memiliki:

| Field | Keterangan |
|---|---|
| **Label** | Nama komponen biaya (cth: "Sewa Venue Ballroom X") |
| **Qty** | Jumlah unit |
| **Harga Satuan** | Harga per unit |
| **Kategori** | Jenis pengeluaran (lihat tabel di bawah) |
| **Forecast (Rp)** | Perkiraan biaya (dari quotation/RAB) |
| **Aktual Modal (Rp)** | Biaya yang benar-benar dikeluarkan |
| **Tanggal Butuh** | Kapan dana ini dibutuhkan |
| **Modal Awal** | Centang jika termasuk DP/uang muka |

### Kategori Pengeluaran

| Kode | Label |
|---|---|
| TICKET_TRANSPORT | Tiket & Transport |
| ACCOMMODATION | Akomodasi |
| VENUE_DP | DP Venue |
| VENUE_FINAL | Pelunasan Venue |
| VENDOR_DP | DP Vendor |
| VENDOR_FINAL | Pelunasan Vendor |
| TALENT_HONOR | Talent / Honor |
| OPERATIONAL_OTHER | Operasional Lain |

### Titipan

Jika ada biaya yang sifatnya **titipan klien** (dibayarkan dulu oleh Watermark, akan dikembalikan klien), centang kolom **Titipan**. Biaya titipan **tidak dihitung** sebagai modal Watermark dalam laporan margin.

### Best Practice Pengisian Budget

1. **Isi Forecast dulu** saat awal project (dari RAB/quotation) — ini yang jadi acuan ekspektasi profit
2. **Isi Aktual** setelah pembayaran dilakukan — ini yang jadi dasar laporan realisasi
3. Jika ada pengeluaran mendadak yang belum ada di RAB, tambah baris baru dengan kategori yang sesuai

---

## 7. Pengajuan Pembayaran (Payment Request)

Ketika ada tagihan vendor/biaya yang perlu dibayarkan, buat **Payment Request (PR)** dari item budget.

### Cara membuat PR

1. Di tab Budget, klik tombol **💳 Ajukan Bayar** di baris item yang ingin dibayarkan
2. Isi detail pengajuan:
   - Jumlah yang diajukan
   - Keterangan/memo
   - Upload bukti tagihan (jika ada)
3. Submit → PR masuk ke alur approval

### Alur Approval PR

```
PM mengajukan PR
       │
       ▼
  [PENDING OWNER]
  Direktur Utama approve
       │
       ▼
  [PENDING FINANCE DIRECTOR]
  Direktur Finance approve
       │
       ▼
  [APPROVED BY DIRECTOR]
  Menunggu eksekusi pembayaran oleh Finance
       │
       ▼
  [PAID] ✅ Pembayaran selesai
```

> Jika PR **ditolak**, PM akan mendapat notifikasi. Pastikan cek keterangan penolakan dan revisi jika perlu.

---

## 8. Quotation

Tab **Quotation** di halaman detail project untuk mengelola penawaran ke klien.

### Yang bisa dilakukan

- **Lihat daftar quotation** yang sudah dibuat untuk project ini
- **Buat quotation baru** — untuk membuat dokumen penawaran resmi
- **Upload file PDF quotation** yang sudah ditandatangani

### Info Quotation di tab Info

Di tab **Info**, ada bagian khusus untuk mencatat:
- **Nomor Quotation** — nomor dokumen penawaran (untuk referensi)
- **Nomor Invoice** — nomor invoice yang dikirim ke klien
- **Nilai Project** — nilai final yang disepakati

> Bagian ini bisa diisi/diupdate oleh PM dan Finance.

---

## 9. Tim Project

Tab **Tim** di halaman detail project untuk mengelola anggota tim yang terlibat.

### Menambah anggota tim

1. Klik **+ Tambah Anggota**
2. Cari nama dari daftar tim
3. Pilih dan konfirmasi

### Yang perlu diperhatikan

- **PIC** adalah Project Manager utama — diset saat project dibuat dan bisa diubah di tab Info
- Anggota yang ditambahkan ke tim akan bisa melihat dan mengerjakan task di project ini
- Anggota akan masuk dalam perhitungan **workload** berdasarkan status project dan peran

### Workload Score

Setiap status project memberi beban kerja berbeda:

| Status | Beban PIC | Beban Anggota |
|---|---|---|
| HOLD | 0 | 0 |
| PITCHING | 1x | 0.5x |
| WAITING RESULT | 1x | 0 |
| PREPARATION | 1x | 1x |
| EVENT DAY | 1.5x | 1.5x |
| REPORTING | 1x | 0.5x |
| INVOICING | 0.5x | 0 |

Makin tinggi nilai, makin berat beban kerja yang ditanggung orang tersebut di project itu.

---

## 10. Client Brief

Tab **Brief** di halaman detail project menyediakan template pertanyaan terstruktur untuk brief klien.

### Template EVENT

- Tujuan utama event (Brand awareness / Launch / Lead generation / dll)
- KPI utama yang ingin dicapai
- Target audience utama
- Format event yang diinginkan
- Aktivitas utama di dalam event
- Lokasi & kebutuhan operasional
- Timeline dan alur approval
- Range budget
- Definisi sukses menurut klien
- *(dan beberapa pertanyaan lainnya)*

### Template PH (Production House)

- Tujuan utama video
- Platform distribusi
- Pendekatan konten (Story-driven / Informative / Emotional / dll)
- Elemen wajib ditampilkan
- Gaya visual & tone komunikasi
- Deliverable (durasi, format, subtitle)
- Timeline produksi & approval
- *(dan beberapa pertanyaan lainnya)*

> Jawaban brief ini tersimpan di sistem dan bisa dirujuk kapanpun oleh tim.

---

## 11. Catatan Evaluasi Tim

Bagian penting untuk **dokumentasi pembelajaran** tim — ada di tab **Info**, bagian bawah.

### Kapan diisi

| Kondisi Project | Yang Perlu Didokumentasikan |
|---|---|
| **Project DONE (WIN)** | Evaluasi dari klien, evaluasi internal tim, evaluasi vendor & crew |
| **Project FAILED (LOSE)** | Alasan kalah pitch, kompetitor yang menang, dokumen surat pengumuman klien |
| **Project CANCELED** | Catatan mengapa project dibatalkan |

### Pengisian untuk project yang KALAH PITCH

1. Centang satu atau lebih **Alasan Kalah**:
   - Proposal kurang detail
   - Creative kurang menarik
   - Budget terlalu tinggi
   - Telat submit
   - Relasi/koneksi klien dengan kompetitor lebih kuat
2. Isi **Kompetitor** yang ikut serta (tulis siapa yang menang)
3. Upload **Surat Pengumuman Klien (PDF)** jika ada — tombol upload ada di bagian bawah section ini

### Cara upload surat pengumuman

- Klik **"Upload surat pengumuman (PDF)"**
- Pilih file PDF dari komputer
- File tersimpan otomatis dan bisa diakses kembali dari halaman project

> Dokumentasi ini sangat penting untuk evaluasi win rate dan improvement strategi pitching ke depan.

---

## 12. Vendor & Klien

### Database Vendor

Halaman **Vendor** menyimpan semua vendor yang pernah atau sedang bekerjasama.

**Tipe vendor yang tersedia:**
- Venue
- Talent / Entertainment (MC, Band, Singer, DJ, Dancer, dll)
- Production (Sound System, Lighting, Multimedia/LED, dll)
- Equipment & Rental
- Catering & F&B
- Merchandise & Printing
- Creative & Design
- Agency / Specialist
- Logistic & Operational
- Digital & Technology

**Yang bisa dilakukan:**
- Lihat profil lengkap vendor (kontak, tipe, sub-kategori)
- Catat riwayat kerja sama
- Tandai status vendor: **Active / Inactive / Blacklist**

### Database Klien

Halaman **Klien** menyimpan semua data klien beserta riwayat project.

- Bisa search berdasarkan nama klien
- Melihat berapa project yang pernah dikerjakan bersama klien tersebut
- Informasi kontak dan industri klien

> Klien baru otomatis muncul ketika project baru dibuat dan klien belum ada di database.

---

## 13. Piutang (Finance)

Halaman **Finance** → bagian **Piutang** mencatat semua tagihan ke klien yang belum dibayar.

> ⚠️ Halaman Finance hanya bisa diakses oleh: **Owner, Director, Project Manager, Finance, Finance Staff**

### Status Piutang

| Status | Arti |
|---|---|
| **Belum Lunas (UNPAID)** | Invoice sudah dikirim, belum ada pembayaran |
| **⚠ Lewat Tenggat (OVERDUE)** | Sudah melewati tanggal jatuh tempo, belum lunas |
| **Lunas (PAID)** | Klien sudah membayar |
| **Draft** | Invoice belum resmi dikirim, sedang dalam proses |

### Fitur Search Piutang

- Gunakan kotak pencarian untuk cari berdasarkan: nama klien, nama project, nomor invoice, nomor PO, nomor faktur pajak
- Gunakan tab filter: **Semua / Belum Lunas / ⚠ Lewat Tenggat / Lunas / Draft**

### Tanggung Jawab PM terkait Piutang

- Segera informasikan ke Finance ketika klien konfirmasi akan membayar
- Pantau piutang project yang kamu handle — jangan biarkan lewat tenggat tanpa follow up
- Koordinasi dengan Finance untuk penagihan jika ada keterlambatan pembayaran

---

## 14. Penilaian Tim

### KPI Bulanan

Halaman **Penilaian** untuk menilai kinerja tim setiap bulan.

**5 Kompetensi Inti (semua role):**
1. Kecepatan Respons & Komunikasi
2. Ketepatan Waktu (Disiplin Deadline)
3. Kualitas Hasil Kerja
4. Tanggung Jawab & Inisiatif
5. Kolaborasi Tim

**Untuk Project Manager, tambahan:**
- Ketepatan Pengambilan Keputusan
- Arahan & Delegasi Tugas
- Pengembangan & Pembinaan Tim
- Win rate pitching sesuai target
- Project berjalan sesuai timeline & budget
- Kepuasan klien (feedback / repeat order)

**Skala Penilaian:** 1 (Kurang) → 2 (Cukup) → 3 (Baik) → 4 (Sangat Baik) → 5 (Istimewa)

**Deadline penilaian:** Tanggal **23** setiap bulan. Penilaian yang masuk setelah tanggal 23 dihitung ke bulan berikutnya.

### Penilaian Per-Project

Di halaman detail project, tab **Penilaian Tim** — PM bisa menilai kinerja setiap anggota tim **setelah project selesai**.

**3 Kriteria Universal:**
1. Kontribusi terhadap keberhasilan project
2. Kualitas eksekusi pekerjaan
3. Kerjasama & komunikasi tim

**Tambahan untuk PM:**
- Profitabilitas project vs RAB
- Kepuasan klien pada project ini

---

## 15. Dashboard & Workload

### Dashboard

Halaman **Dashboard** menampilkan ringkasan semua project aktif yang kamu tangani:
- Status dan health indicator setiap project
- Task yang mendekati deadline atau sudah lewat
- Notifikasi payment request yang menunggu approval

### Workload Tim

Halaman **Workload Tim** — lihat distribusi beban kerja seluruh anggota tim.

Berguna untuk:
- Cek siapa yang sedang overload sebelum assign project baru
- Pantau utilisasi tim divisi
- Perencanaan kapasitas untuk project mendatang

### Health Indicator Project

Di halaman Projects, setiap project punya indikator kesehatan:
- 🟢 **Sehat** — semua task on track
- 🟡 **Perhatian** — ada task yang mendekati deadline
- 🔴 **Bermasalah** — ada task yang sudah lewat deadline atau project butuh tindakan segera

---

## 16. Tips & Hal yang Perlu Diperhatikan

### ✅ Yang Harus Selalu Dilakukan

| Kapan | Apa yang dilakukan |
|---|---|
| **Brief masuk** | Buat project baru, isi klien, kategori, PIC, nilai project |
| **Proposal selesai dibuat** | Ubah status → PITCHING, buat Quotation di sistem |
| **Proposal dikirim ke klien** | Ubah status → WAITING PITCH RESULT |
| **Hasil pitch diketahui** | Set Pitch Result (WIN/LOSE/NOT FINAL) |
| **Kalah pitch** | Ubah status → FAILED, isi Catatan Evaluasi, upload surat pengumuman |
| **Menang pitch** | Ubah status → PREPARATION, tambah anggota tim, isi budget |
| **Akan bayar vendor** | Buat Payment Request dari item budget |
| **Hari-H event** | Ubah status → EVENT DAY |
| **Pasca event** | Ubah status → REPORTING, buat laporan |
| **Invoice dikirim** | Ubah status → INVOICING, catat di Finance/Piutang |
| **Klien sudah bayar lunas** | Ubah status → DONE, tandai piutang LUNAS di Finance |
| **Project selesai** | Isi Catatan Evaluasi Tim di tab Info |

### ⚠️ Yang Sering Terlewat

1. **Lupa update status project** → laporan pipeline tidak akurat, PM dan Direksi tidak bisa monitoring
2. **Nilai project tidak diisi** → project tidak masuk laporan omset & margin
3. **Budget tidak diisi** → tidak bisa request pembayaran, laporan keuangan bolong
4. **Catatan evaluasi tidak diisi** → tim tidak punya data untuk improve win rate dan eksekusi
5. **Piutang tidak di-update** → Finance tidak tahu kapan harus follow up klien

### 🔍 Cara Search Project

Di halaman Projects, fitur search bisa cari berdasarkan:
- **Nama project**
- **Kode project** (cth: EO037, PH001)
- **Nama klien**

### 📱 Akses dari HP

Sistem bisa diakses dari browser HP. Tampilan sudah responsive untuk layar kecil, tapi untuk input data yang banyak (budget, brief) lebih nyaman pakai laptop/desktop.

---

## Ringkasan Alur Cepat (Quick Reference)

```
BRIEF MASUK
  → Buat project (isi: nama, klien, kategori, PIC, nilai project)
  → Status: HOLD

MULAI PITCH
  → Status: PITCHING
  → Buat Quotation di sistem
  → Isi budget forecast (RAB)

PROPOSAL DIKIRIM
  → Status: WAITING PITCH RESULT

KALAH
  → Status: FAILED + Pitch Result: LOSE
  → Isi Catatan Evaluasi (alasan kalah, kompetitor)
  → Upload surat pengumuman klien (jika ada)

MENANG
  → Status: PREPARATION + Pitch Result: WIN
  → Tambah anggota tim
  → Lengkapi budget item per item
  → Buat PR untuk setiap pembayaran vendor

HARI-H
  → Status: EVENT DAY

PASCA EVENT
  → Status: REPORTING
  → Buat laporan

INVOICE DIKIRIM
  → Status: INVOICING
  → Catat piutang di Finance

KLIEN BAYAR
  → Status: DONE
  → Tandai piutang LUNAS
  → Isi Catatan Evaluasi Tim (evaluasi dari klien, internal, vendor)
  → Beri penilaian project untuk anggota tim
```

---

*Dokumen ini dibuat berdasarkan versi sistem Watermark PM per Juni 2026.*
*Untuk pertanyaan atau kendala teknis, hubungi tim pengembang sistem.*
