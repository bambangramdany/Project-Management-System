const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '../guides')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const APP_URL = 'project-management-system-six-psi.vercel.app/login'

// ── Data per orang ──────────────────────────────────────────────────────────
const PEOPLE = [
  // ── DIREKTUR ──────────────────────────────────────────────────────────────
  {
    slug: 'gunadarma',
    name: 'Gunadarma',
    email: 'gunadarma.twp@gmail.com',
    password: 'Wmark@Dir26',
    unit: 'Production House',
    jabatan: 'Direktur PH & Producer',
    accent: '#7C3AED',
    accentLight: '#EDE9FE',
    accentText: '#4C1D95',
    levelLabel: 'Direktur PH',
    intro: 'Kamu adalah penanggung jawab utama seluruh divisi Production House — mulai dari quotation, project lead, hingga pengawasan & penilaian kinerja seluruh tim PH (Bagastya dan Jamaluddin).',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan semua project PH aktif, alert task overdue, dan status tim.' },
      { icon: '📁', name: 'Projects', desc: 'Buat quotation project PH, assign tim, kelola timeline dan RAB.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Task harian dan check-in kamu sendiri sebagai producer/PM.' },
      { icon: '🏢', name: 'Klien', desc: 'Input dan kelola data klien PH — nama, PIC, kontak, riwayat project.' },
      { icon: '🤝', name: 'Vendor', desc: 'Input vendor, kelola daftar, dan isi penilaian vendor setelah project selesai.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Monitor skor kinerja Bagastya dan Jamaluddin setiap bulan.' },
      { icon: '👥', name: 'Workload Tim', desc: 'Cek distribusi beban kerja tim PH agar tidak overload.' },
      { icon: '💰', name: 'Finance', desc: 'Ajukan Payment Request untuk kebutuhan project PH.' },
    ],
    steps: [
      { title: 'Input data klien', desc: 'Setiap klien baru harus dimasukkan ke sistem. Klien → + Tambah Klien → isi nama perusahaan, PIC, kontak, dan alamat → simpan.' },
      { title: 'Buka project baru', desc: 'Projects → + Project Baru → isi nama, pilih klien, tanggal, pilih divisi PH → simpan.' },
      { title: 'Tambah tim & task', desc: 'Di halaman project → tab Tim → tambah Bagastya dan/atau Jamaluddin → buat task untuk masing-masing.' },
      { title: 'Input dan nilai vendor', desc: 'Vendor → + Tambah Vendor → isi nama, kategori, kontak, dan keterangan. Setelah project selesai, isi penilaian vendor (ketepatan waktu, kualitas, harga) di halaman vendor tersebut.' },
      { title: 'Pantau kinerja tim', desc: 'Laporan Kinerja → pilih bulan → lihat skor check-in, update progres, dan KPI Bagastya & Jamaluddin.' },
      { title: 'Ajukan pembayaran', desc: 'Finance → + Ajukan Pembayaran → pilih project → isi detail → kirim untuk approval.' },
    ],
    tip: 'Proses pengawasan dan penilaian tim PH dilakukan langsung oleh kamu — pastikan evaluasi bulanan diisi setiap awal bulan untuk Bagastya dan Jamaluddin.',
  },
  {
    slug: 'david-setyawan',
    name: 'David Setyawan',
    email: 'setyawandavid@gmail.com',
    password: 'Wmark@Dir26',
    unit: 'Event',
    jabatan: 'Direktur Event',
    accent: '#0F766E',
    accentLight: '#CCFBF1',
    accentText: '#134E4A',
    levelLabel: 'Direktur Event',
    intro: 'Kamu adalah penanggung jawab utama divisi Event — final approval quotation (setelah dicek Wulan), project lead, dan pengawasan kinerja seluruh tim Event (PM, PO, dan Production).',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan semua project Event aktif dan alert yang perlu perhatian.' },
      { icon: '📁', name: 'Projects', desc: 'Review dan approve project Event, pantau timeline dan RAB.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Task dan check-in harian kamu sendiri.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Monitor skor kinerja seluruh tim Event tiap bulan.' },
      { icon: '👥', name: 'Workload Tim', desc: 'Pantau distribusi beban kerja PM, PO, dan Production.' },
      { icon: '💰', name: 'Finance', desc: 'Approval Payment Request untuk project Event.' },
    ],
    steps: [
      { title: 'Review quotation dari Wulan', desc: 'Quotation project Event akan dicek Wulan terlebih dahulu sebelum diteruskan ke kamu untuk final approval.' },
      { title: 'Pantau semua project Event', desc: 'Dashboard → lihat status tiap project. Klik project untuk detail timeline dan task.' },
      { title: 'Monitor kinerja tim', desc: 'Laporan Kinerja → pilih bulan → cek skor tim Event (Wulan, Irham, Julian, Siti Nur, Doddi, Noval, Angga).' },
      { title: 'Approve Payment Request', desc: 'Finance → tab Perlu Ditindaki → review PR dari tim → Setujui atau Tolak.' },
    ],
    tip: 'Wulan memiliki kewenangan pengawasan dan penilaian tim Event. Koordinasikan dengannya untuk input evaluasi kinerja tim.',
  },
  {
    slug: 'fakhril-islamy',
    name: 'M. Fakhril Islamy',
    email: 'fakhrilislamy@gmail.com',
    password: 'Wmark@Dir26',
    unit: 'Creative',
    jabatan: 'Direktur Creative',
    accent: '#D97706',
    accentLight: '#FEF3C7',
    accentText: '#92400E',
    levelLabel: 'Direktur Creative',
    intro: 'Kamu adalah penanggung jawab divisi Creative — mendukung project Event dan PH dengan output kreatif, sekaligus mengawasi dan menilai kinerja tim Creative (Kresensia, Saffira, Kukuh, Nauval).',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan project yang melibatkan tim Creative.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project tempat tim Creative dilibatkan — brief, task, dan deadline.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Task dan check-in harian kamu sebagai Creative Lead.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Monitor skor kinerja Kresensia, Saffira, Kukuh, dan Nauval tiap bulan.' },
      { icon: '👥', name: 'Workload Tim', desc: 'Pastikan beban kreatif tersebar merata di tim.' },
      { icon: '💰', name: 'Finance', desc: 'Ajukan PR untuk kebutuhan produksi kreatif.' },
    ],
    steps: [
      { title: 'Cek project yang butuh creative support', desc: 'Dashboard → lihat project Event/PH yang active → pastikan tim Creative sudah ter-assign di project tersebut.' },
      { title: 'Buat atau assign task kreatif', desc: 'Projects → pilih project → + Task → pilih anggota tim Creative yang bertanggung jawab.' },
      { title: 'Pantau output tim', desc: 'Workload Tim → cek task Kresensia, Saffira, Kukuh, Nauval — apakah ada yang overload.' },
      { title: 'Evaluasi kinerja bulanan', desc: 'Laporan Kinerja → pilih bulan → input penilaian untuk masing-masing anggota tim Creative.' },
    ],
    tip: 'Tim Creative sering diperbantukan di banyak project sekaligus. Pantau Workload Tim secara rutin agar tidak ada yang burnout.',
  },
  {
    slug: 'henri-sulistianto',
    name: 'Henri Sulistianto',
    email: 'henrisuli10@gmail.com',
    password: 'Wmark@Dir26',
    unit: 'Finance, HRD & GA',
    jabatan: 'Direktur Finance & GA',
    accent: '#059669',
    accentLight: '#D1FAE5',
    accentText: '#064E3B',
    levelLabel: 'Direktur Finance',
    intro: 'Kamu mengawasi operasional kantor (GA) dan mendukung kebutuhan project. Di sistem, peranmu lebih ke monitoring laporan keuangan dan approval PR yang sudah lolos review Direktur Divisi.',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan laporan keuangan dan status operasional.' },
      { icon: '💰', name: 'Finance', desc: 'Monitor semua Payment Request, piutang klien, dan laporan kas.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Pantau kinerja tim Finance & GA (Anung, Antoni, Bimantoro, Sutrisna).' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in dan task harian kamu.' },
    ],
    steps: [
      { title: 'Monitor laporan keuangan', desc: 'Finance → tab Laporan & Analitik → lihat ringkasan arus kas, piutang, dan realisasi per project.' },
      { title: 'Pantau PR yang perlu tindakan', desc: 'Finance → tab Perlu Ditindaki → review Payment Request yang butuh persetujuan.' },
      { title: 'Cek piutang klien', desc: 'Finance → Piutang / Invoice Klien → pastikan tidak ada invoice yang lewat jatuh tempo.' },
    ],
    tip: 'Operasional GA (kebersihan, makan siang, dsb.) dikelola Sutrisna secara offline. Di sistem, pastikan check-in Sutrisna berjalan normal setiap harinya.',
  },

  // ── EVENT PM ──────────────────────────────────────────────────────────────
  {
    slug: 'tri-wulan-aprilia',
    name: 'Tri Wulan Aprilia',
    email: 'triwulanaprilia18@gmail.com',
    password: 'Wmark@PM26',
    unit: 'Event',
    jabatan: 'Senior PM Event',
    accent: '#0F766E',
    accentLight: '#CCFBF1',
    accentText: '#134E4A',
    levelLabel: 'PM Event',
    intro: 'Kamu adalah PM Event senior dengan kewenangan pengawasan kinerja seluruh tim Event. Setiap quotation project Event harus kamu cek terlebih dahulu sebelum diteruskan ke David (Direktur Event).',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan semua project Event yang kamu kelola dan pantau.' },
      { icon: '📁', name: 'Projects', desc: 'Buat dan kelola project Event — quotation, timeline, tim, dan task.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan task kamu sendiri.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Monitor skor kinerja seluruh tim Event (Irham, Julian, Siti Nur, Doddi, Noval, Angga).' },
      { icon: '👥', name: 'Workload Tim', desc: 'Pantau beban kerja tim Event dan atur ulang jika perlu.' },
      { icon: '💰', name: 'Finance', desc: 'Ajukan Payment Request untuk kebutuhan project.' },
    ],
    steps: [
      { title: 'Review quotation sebelum ke David', desc: 'Setiap quotation project Event baru harus kamu periksa dulu — pastikan RAB dan scope sudah benar sebelum diteruskan ke David untuk final approval.' },
      { title: 'Buat project & assign tim', desc: 'Projects → + Project Baru → isi detail → tambah anggota tim Event yang terlibat → buat task.' },
      { title: 'Monitor kinerja harian tim', desc: 'Dashboard → cek siapa yang belum check-in atau belum update task dalam 2+ hari.' },
      { title: 'Evaluasi kinerja bulanan', desc: 'Laporan Kinerja → pilih bulan → koordinasikan dengan David untuk input penilaian tim Event.' },
    ],
    tip: 'Kamu adalah jembatan antara tim Event dan David. Pastikan semua PR dan quotation sudah kamu review sebelum naik ke level Direktur.',
  },
  {
    slug: 'muhammad-irham-alif',
    name: 'Muhammad Irham Alif',
    email: 'irhamalifakhri@gmail.com',
    password: 'Wmark@PM26',
    unit: 'Event',
    jabatan: 'Project Manager Event',
    accent: '#0F766E',
    accentLight: '#CCFBF1',
    accentText: '#134E4A',
    levelLabel: 'PM Event',
    intro: 'Kamu adalah Project Manager Event — bertanggung jawab mengelola project dari awal hingga selesai, mengkoordinasikan tim, dan memastikan semua berjalan sesuai timeline.',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan project yang kamu kelola dan task yang perlu perhatian.' },
      { icon: '📁', name: 'Projects', desc: 'Kelola project Event kamu — tim, timeline, task, dan anggaran.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task yang ditugaskan ke kamu.' },
      { icon: '👥', name: 'Workload Tim', desc: 'Pantau beban kerja anggota tim di project kamu.' },
      { icon: '💰', name: 'Finance', desc: 'Ajukan Payment Request untuk kebutuhan project.' },
      { icon: '🎯', name: 'Event Day', desc: 'Koordinasi rundown, absensi kru, dan laporan masalah saat hari-H event.' },
    ],
    steps: [
      { title: 'Kelola project aktif', desc: 'Projects → pilih project kamu → pantau progress task tim, deadline, dan anggaran.' },
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10 → isi kondisi dan catatan.' },
      { title: 'Update progres task', desc: 'Klik task yang sedang berjalan → Update Progres → tulis pencapaian hari ini.' },
      { title: 'Ajukan pembayaran', desc: 'Finance → + Ajukan Pembayaran → pilih project → isi detail vendor dan nominal → kirim.' },
      { title: 'Koordinasi hari-H', desc: 'Pada hari event, buka Event Day → aktifkan rundown → pantau kehadiran kru dan catat masalah real-time.' },
    ],
    tip: 'Quotation project Event harus melalui review Wulan (Senior PM) sebelum naik ke David. Koordinasikan dengan Wulan sejak awal perencanaan project.',
  },
  {
    slug: 'bambang-ramdany',
    name: 'Bambang Ramdany',
    email: 'bamramdany@gmail.com',
    password: 'Wmark@PM26',
    unit: 'Event',
    jabatan: 'Project Manager',
    accent: '#0F766E',
    accentLight: '#CCFBF1',
    accentText: '#134E4A',
    levelLabel: 'PM',
    intro: 'Kamu adalah Project Manager — bertanggung jawab mengelola project, mengkoordinasikan tim, dan memastikan semua berjalan sesuai timeline dan anggaran.',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan project yang kamu kelola dan task yang perlu perhatian.' },
      { icon: '📁', name: 'Projects', desc: 'Kelola project kamu — tim, timeline, task, dan anggaran.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task yang ditugaskan ke kamu.' },
      { icon: '👥', name: 'Workload Tim', desc: 'Pantau beban kerja anggota tim di project kamu.' },
      { icon: '💰', name: 'Finance', desc: 'Ajukan Payment Request untuk kebutuhan project.' },
      { icon: '🎯', name: 'Event Day', desc: 'Koordinasi rundown, absensi kru, dan laporan masalah saat hari-H.' },
    ],
    steps: [
      { title: 'Kelola project aktif', desc: 'Projects → pilih project kamu → pantau progress task, deadline, dan anggaran.' },
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Update progres task', desc: 'Klik task → Update Progres → tulis pencapaian hari ini.' },
      { title: 'Ajukan pembayaran', desc: 'Finance → + Ajukan Pembayaran → isi detail → kirim untuk approval.' },
    ],
    tip: 'Check-in dan update progres task dilakukan setiap hari kerja — keduanya masuk ke penilaian kinerja bulanan kamu.',
  },

  // ── EVENT PO ──────────────────────────────────────────────────────────────
  {
    slug: 'julian-putra',
    name: 'Julian Putra Pragiwaka',
    email: 'julianputra02@gmail.com',
    password: 'Wmark@PM26',
    unit: 'Event',
    jabatan: 'Project Officer Event',
    accent: '#2563EB',
    accentLight: '#DBEAFE',
    accentText: '#1E40AF',
    levelLabel: 'Project Officer',
    intro: 'Kamu adalah Project Officer Event — mendukung PM dalam menjalankan project, mengelola vendor list, dan memastikan kebutuhan operasional project terpenuhi.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Pusat aktivitas harian — check-in, lihat task, dan update progres.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project Event tempat kamu dilibatkan — brief, task, dan deadline.' },
      { icon: '🎯', name: 'Event Day', desc: 'Rundown hari-H, konfirmasi kehadiran, dan laporan masalah.' },
      { icon: '💬', name: 'Sharing Session', desc: 'Jadwal dan materi knowledge sharing internal.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10 → isi kondisi dan catatan singkat.' },
      { title: 'Kerjakan task yang ditugaskan', desc: 'Klik task → baca brief PM → mulai kerjakan → Update Progres minimal 1x sehari.' },
      { title: 'Kelola vendor', desc: 'Jika ada vendor baru yang ditemukan/dikonfirmasi, koordinasikan dengan PM untuk dimasukkan ke sistem.' },
      { title: 'Hari-H event', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → laporkan masalah jika ada.' },
    ],
    tip: 'Update progres task setiap hari meski hanya singkat — ini yang dilihat PM dan Direktur untuk memantau perkembangan project.',
  },
  {
    slug: 'siti-nur-fitriah',
    name: 'Siti Nur Fitriah',
    email: 'fitriah.salsabilah@gmail.com',
    password: 'Wmark@PM26',
    unit: 'Event',
    jabatan: 'Project Officer Event',
    accent: '#2563EB',
    accentLight: '#DBEAFE',
    accentText: '#1E40AF',
    levelLabel: 'Project Officer',
    intro: 'Kamu adalah Project Officer Event — mendukung PM dalam menjalankan project, mengelola vendor list, dan memastikan kebutuhan operasional project terpenuhi.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Pusat aktivitas harian — check-in, lihat task, dan update progres.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project Event tempat kamu dilibatkan — brief, task, dan deadline.' },
      { icon: '🎯', name: 'Event Day', desc: 'Rundown hari-H, konfirmasi kehadiran, dan laporan masalah.' },
      { icon: '💬', name: 'Sharing Session', desc: 'Jadwal dan materi knowledge sharing internal.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10 → isi kondisi dan catatan singkat.' },
      { title: 'Kerjakan task yang ditugaskan', desc: 'Klik task → baca brief PM → mulai kerjakan → Update Progres minimal 1x sehari.' },
      { title: 'Kelola vendor', desc: 'Jika ada vendor baru yang ditemukan/dikonfirmasi, koordinasikan dengan PM untuk dimasukkan ke sistem.' },
      { title: 'Hari-H event', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → laporkan masalah jika ada.' },
    ],
    tip: 'Update progres task setiap hari meski hanya singkat — ini yang dilihat PM dan Direktur untuk memantau perkembangan project.',
  },

  // ── EVENT PRODUCTION ──────────────────────────────────────────────────────
  {
    slug: 'doddi-chaeril',
    name: 'Doddi Chaeril Fauzi',
    email: 'doddichf@gmail.com',
    password: 'Wmark@PM26',
    unit: 'Event Production',
    jabatan: 'Production Team Event',
    accent: '#2563EB',
    accentLight: '#DBEAFE',
    accentText: '#1E40AF',
    levelLabel: 'Production',
    intro: 'Kamu adalah bagian dari tim Production Event — mendukung jalannya project di lapangan, memastikan semua kebutuhan teknis dan operasional tersedia saat event berlangsung.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project yang kamu ikuti — detail brief dan task.' },
      { icon: '🎯', name: 'Event Day', desc: 'Rundown hari-H, konfirmasi kehadiran, laporan masalah.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi → isi kondisi kehadiran.' },
      { title: 'Kerjakan task produksi', desc: 'Klik task yang ditugaskan PM → kerjakan → Update Progres setiap hari.' },
      { title: 'Hari-H event', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → laporkan masalah atau hambatan teknis.' },
    ],
    tip: 'Laporkan masalah teknis di lapangan melalui fitur Event Day — jangan hanya lewat WhatsApp agar tercatat di sistem dan bisa ditindaklanjuti PM.',
  },
  {
    slug: 'muhammad-noval',
    name: 'Muhammad Noval Suherman',
    email: 'novalsuherman05@gmail.com',
    password: 'Wmark@PO26',
    unit: 'Event Production',
    jabatan: 'Production Team Event',
    accent: '#2563EB',
    accentLight: '#DBEAFE',
    accentText: '#1E40AF',
    levelLabel: 'Production',
    intro: 'Kamu adalah bagian dari tim Production Event — mendukung jalannya project di lapangan dan memastikan semua kebutuhan teknis tersedia.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project yang kamu ikuti — detail brief dan task.' },
      { icon: '🎯', name: 'Event Day', desc: 'Rundown hari-H, konfirmasi kehadiran, laporan masalah.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi → isi kondisi kehadiran.' },
      { title: 'Kerjakan task produksi', desc: 'Klik task yang ditugaskan PM → kerjakan → Update Progres setiap hari.' },
      { title: 'Hari-H event', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → laporkan masalah atau hambatan teknis.' },
    ],
    tip: 'Laporkan masalah teknis di lapangan melalui fitur Event Day agar tercatat di sistem.',
  },
  {
    slug: 'angga-julfikar',
    name: 'Angga Julfikar',
    email: 'anggajulfikar20@gmail.com',
    password: 'Wmark@PM26',
    unit: 'Event Production',
    jabatan: 'Production Team Event',
    accent: '#2563EB',
    accentLight: '#DBEAFE',
    accentText: '#1E40AF',
    levelLabel: 'Production',
    intro: 'Kamu adalah bagian dari tim Production Event — mendukung jalannya project di lapangan dan memastikan semua kebutuhan teknis tersedia.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project yang kamu ikuti — detail brief dan task.' },
      { icon: '🎯', name: 'Event Day', desc: 'Rundown hari-H, konfirmasi kehadiran, laporan masalah.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi → isi kondisi kehadiran.' },
      { title: 'Kerjakan task produksi', desc: 'Klik task yang ditugaskan PM → kerjakan → Update Progres setiap hari.' },
      { title: 'Hari-H event', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → laporkan masalah.' },
    ],
    tip: 'Laporkan masalah teknis di lapangan melalui fitur Event Day agar tercatat di sistem.',
  },

  // ── CREATIVE ──────────────────────────────────────────────────────────────
  {
    slug: 'kresensia-bangun',
    name: 'Kresensia Bangun',
    email: 'kresensiabs@gmail.com',
    password: 'Wmark@PO26',
    unit: 'Creative',
    jabatan: 'Stage Designer & 3D Artist',
    accent: '#D97706',
    accentLight: '#FEF3C7',
    accentText: '#92400E',
    levelLabel: 'Creative',
    intro: 'Kamu adalah Stage Designer & 3D Artist di tim Creative — bertanggung jawab atas desain stage dan visualisasi 3D untuk project Event dan PH Watermark.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task desain yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project yang membutuhkan output kreatif dari kamu.' },
      { icon: '💬', name: 'Sharing Session', desc: 'Knowledge sharing dan inspirasi desain internal tim.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kerjakan task desain', desc: 'Klik task → baca brief dan referensi dari PM/Direktur Creative → mulai kerjakan → Update Progres.' },
      { title: 'Koordinasi dengan Fakhril', desc: 'Untuk arahan desain dan review output, koordinasikan dengan M. Fakhril Islamy selaku Direktur Creative.' },
    ],
    tip: 'Sering diperbantukan di multiple project sekaligus — pantau tab Tugas Saya setiap hari agar tidak ada task yang terlewat.',
  },
  {
    slug: 'saffira-azka',
    name: 'Saffira Azka',
    email: 'saffiraazkaf@gmail.com',
    password: 'Wmark@PO26',
    unit: 'Creative',
    jabatan: 'Stage Designer & 3D Artist',
    accent: '#D97706',
    accentLight: '#FEF3C7',
    accentText: '#92400E',
    levelLabel: 'Creative',
    intro: 'Kamu adalah Stage Designer & 3D Artist di tim Creative — bertanggung jawab atas desain stage dan visualisasi 3D untuk project Event dan PH Watermark.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task desain yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project yang membutuhkan output kreatif dari kamu.' },
      { icon: '💬', name: 'Sharing Session', desc: 'Knowledge sharing dan inspirasi desain internal tim.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kerjakan task desain', desc: 'Klik task → baca brief dan referensi dari PM/Direktur Creative → mulai kerjakan → Update Progres.' },
      { title: 'Koordinasi dengan Fakhril', desc: 'Untuk arahan desain dan review output, koordinasikan dengan M. Fakhril Islamy selaku Direktur Creative.' },
    ],
    tip: 'Sering diperbantukan di multiple project sekaligus — pantau tab Tugas Saya setiap hari agar tidak ada task yang terlewat.',
  },
  {
    slug: 'kukuh-bayu',
    name: 'Kukuh Bayu Perkasa',
    email: 'kukuhbayuperkasa@gmail.com',
    password: 'Wmark@PO26',
    unit: 'Creative',
    jabatan: 'Graphic Designer 2D',
    accent: '#D97706',
    accentLight: '#FEF3C7',
    accentText: '#92400E',
    levelLabel: 'Creative',
    intro: 'Kamu adalah Graphic Designer 2D di tim Creative — bertanggung jawab atas output desain grafis untuk kebutuhan project Event, PH, maupun branding Watermark.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task desain yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project yang membutuhkan output desain 2D dari kamu.' },
      { icon: '💬', name: 'Sharing Session', desc: 'Knowledge sharing internal tim.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kerjakan task desain', desc: 'Klik task → baca brief → kerjakan → Update Progres tiap hari.' },
      { title: 'Koordinasi dengan Fakhril', desc: 'Review output desain dilakukan bersama Direktur Creative sebelum diserahkan ke PM.' },
    ],
    tip: 'Pastikan setiap revisi yang kamu kerjakan dicatat di Update Progres agar PM tahu perkembangan terkini.',
  },
  {
    slug: 'nauval-zikri',
    name: 'Nauval M Zikri',
    email: 'nauvalzikri30@gmail.com',
    password: 'Wmark@PM26',
    unit: 'Creative',
    jabatan: 'Motion Graphic & Multimedia',
    accent: '#D97706',
    accentLight: '#FEF3C7',
    accentText: '#92400E',
    levelLabel: 'Creative',
    intro: 'Kamu adalah spesialis Motion Graphic & Multimedia di tim Creative — bertanggung jawab atas animasi, video motion, dan konten multimedia untuk project Watermark.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task multimedia yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project yang membutuhkan output motion/multimedia dari kamu.' },
      { icon: '💬', name: 'Sharing Session', desc: 'Knowledge sharing internal tim.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kerjakan task multimedia', desc: 'Klik task → baca brief → render/kerjakan → Update Progres tiap hari termasuk progress render.' },
      { title: 'Koordinasi dengan Fakhril', desc: 'Review output motion graphic dilakukan bersama Direktur Creative sebelum diserahkan ke PM.' },
    ],
    tip: 'Untuk task dengan durasi render panjang, tuliskan estimasi selesai di Update Progres agar PM bisa plan deadline dengan tepat.',
  },

  // ── PH ────────────────────────────────────────────────────────────────────
  {
    slug: 'bagastya-indrawan',
    name: 'Bagastya Indrawan',
    email: 'bagastyaindrawan@gmail.com',
    password: 'Wmark@PO26',
    unit: 'Production House',
    jabatan: 'Producer & PM PH',
    accent: '#7C3AED',
    accentLight: '#EDE9FE',
    accentText: '#4C1D95',
    levelLabel: 'Producer PH',
    intro: 'Kamu adalah Producer & PM di divisi Production House — bertanggung jawab menjalankan project PH bersama Jamaluddin, melapor langsung ke Gunadarma selaku Direktur PH.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan task yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Kelola project PH — timeline, task, dan koordinasi dengan Jamaluddin.' },
      { icon: '🎯', name: 'Event Day', desc: 'Koordinasi produksi saat hari shooting/produksi.' },
      { icon: '💰', name: 'Finance', desc: 'Ajukan Payment Request untuk kebutuhan produksi.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kelola project PH', desc: 'Projects → pilih project PH → pantau task, timeline, dan koordinasikan dengan Jamaluddin.' },
      { title: 'Update progres', desc: 'Klik task → Update Progres minimal 1x sehari.' },
      { title: 'Ajukan pembayaran', desc: 'Finance → + Ajukan Pembayaran → isi detail → kirim untuk approval Gunadarma.' },
    ],
    tip: 'Di PH, kamu dan Jamaluddin memiliki posisi yang setara. Koordinasikan pembagian project langsung dengan Gunadarma.',
  },
  {
    slug: 'jamaluddin',
    name: 'Jamaluddin',
    email: 'jamal.ludin.jl7@gmail.com',
    password: 'Wmark@PO26',
    unit: 'Production House',
    jabatan: 'Producer & PM PH',
    accent: '#7C3AED',
    accentLight: '#EDE9FE',
    accentText: '#4C1D95',
    levelLabel: 'Producer PH',
    intro: 'Kamu adalah Producer & PM di divisi Production House — bertanggung jawab menjalankan project PH bersama Bagastya, melapor langsung ke Gunadarma selaku Direktur PH.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan task yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Kelola project PH — timeline, task, dan koordinasi dengan Bagastya.' },
      { icon: '🎯', name: 'Event Day', desc: 'Koordinasi produksi saat hari shooting/produksi.' },
      { icon: '💰', name: 'Finance', desc: 'Ajukan Payment Request untuk kebutuhan produksi.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kelola project PH', desc: 'Projects → pilih project PH → pantau task, timeline, dan koordinasikan dengan Bagastya.' },
      { title: 'Update progres', desc: 'Klik task → Update Progres minimal 1x sehari.' },
      { title: 'Ajukan pembayaran', desc: 'Finance → + Ajukan Pembayaran → isi detail → kirim untuk approval Gunadarma.' },
    ],
    tip: 'Di PH, kamu dan Bagastya memiliki posisi yang setara. Koordinasikan pembagian project langsung dengan Gunadarma.',
  },

  // ── SOCIAL MEDIA ──────────────────────────────────────────────────────────
  {
    slug: 'soultan-aziez',
    name: 'Soultan Aziez Azhar',
    email: 'soultanaziez@gmail.com',
    password: 'Wmark@PM26',
    unit: 'Social Media',
    jabatan: 'Social Media Planner & Content Creator',
    accent: '#DB2777',
    accentLight: '#FCE7F3',
    accentText: '#9D174D',
    levelLabel: 'Content Creator',
    intro: 'Kamu adalah Social Media Planner & Content Creator — bertugas merencanakan konten dan mendokumentasikan seluruh project Watermark sebagai materi untuk media sosial. Kamu akan dilibatkan di semua project lintas divisi.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task dokumentasi/konten dari berbagai project.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat semua project tempat kamu dilibatkan — jadwal, brief, dan task dokumentasi.' },
      { icon: '🎯', name: 'Event Day', desc: 'Hadir saat hari-H untuk dokumentasi — konfirmasi kehadiran dan ikuti rundown.' },
      { icon: '💬', name: 'Sharing Session', desc: 'Jadwal dan materi knowledge sharing internal.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10, termasuk di hari produksi lapangan.' },
      { title: 'Pantau task dari berbagai project', desc: 'Tugas Saya menampilkan semua task dari semua project tempat kamu dilibatkan — cek setiap hari.' },
      { title: 'Update dokumentasi', desc: 'Setiap sesi dokumentasi, Update Progres task dengan catatan apa yang sudah diambil/diproduksi.' },
      { title: 'Hari event/produksi', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → catat momen penting untuk konten.' },
    ],
    tip: 'Karena kamu terlibat di semua divisi, tab Tugas Saya bisa cukup padat. Prioritaskan berdasarkan tanggal deadline dan koordinasikan dengan PM masing-masing project.',
  },

  // ── FINANCE & HRD ─────────────────────────────────────────────────────────
  {
    slug: 'anung-anindita',
    name: 'Anung Anindita',
    email: 'anuinditaa@gmail.com',
    password: 'Wmark@Fin26',
    unit: 'Finance, HR & GA',
    jabatan: 'Finance, HR & GA Lead',
    accent: '#059669',
    accentLight: '#D1FAE5',
    accentText: '#064E3B',
    levelLabel: 'Finance & HRD',
    intro: 'Kamu adalah penanggung jawab Finance, HR, dan GA — mengelola payment & piutang, input absensi dan data HRD, memastikan kebutuhan kantor terpenuhi, serta melakukan pengawasan dan penilaian kinerja tim.',
    menus: [
      { icon: '💳', name: 'Finance — Pembayaran', desc: 'Proses Payment Request yang sudah disetujui Direktur. Tandai Lunas setelah transfer selesai.' },
      { icon: '📄', name: 'Finance — Piutang', desc: 'Input invoice klien, pantau status pembayaran, tandai lunas saat klien bayar.' },
      { icon: '📊', name: 'HRD — Evaluasi', desc: 'Input evaluasi kinerja bulanan seluruh karyawan. Harus selesai sebelum tanggal 5 bulan berikutnya.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan task kamu sendiri.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Monitor skor kinerja seluruh tim untuk keperluan evaluasi dan penilaian.' },
    ],
    steps: [
      { title: 'Proses payment harian', desc: 'Finance → Pembayaran & Piutang → tab Perlu Ditindaki → cek PR yang sudah disetujui Direktur → Tandai Lunas setelah transfer.' },
      { title: 'Input piutang klien', desc: 'Finance → + Tambah Piutang → isi nama klien, no. invoice, jumlah, dan jatuh tempo → simpan.' },
      { title: 'Absensi dan input HRD', desc: 'HRD → Monitor absensi → pastikan check-in harian tim tercatat. Input evaluasi bulanan di awal bulan.' },
      { title: 'Evaluasi kinerja bulanan', desc: 'HRD → Input Evaluasi → pilih bulan → isi form evaluasi untuk masing-masing karyawan → simpan.' },
    ],
    tip: 'Evaluasi HRD berkontribusi 20% dari skor kinerja karyawan. Pastikan semua karyawan aktif dievaluasi setiap bulan, termasuk anggota yang baru bergabung.',
  },
  {
    slug: 'antoni-steven',
    name: 'Antoni Steven',
    email: 'stevenantoni88@gmail.com',
    password: 'Wmark@Fin26',
    unit: 'Finance',
    jabatan: 'Finance Staff — Pembukuan & Pembayaran',
    accent: '#059669',
    accentLight: '#D1FAE5',
    accentText: '#064E3B',
    levelLabel: 'Finance',
    intro: 'Kamu bertanggung jawab mencatat dan mengelola seluruh pendapatan dan pengeluaran perusahaan, serta memproses pembayaran ke vendor. Semua transaksi yang sudah disetujui Direktur harus kamu tandai lunas di sistem.',
    menus: [
      { icon: '💳', name: 'Finance — Pembayaran', desc: 'Lihat dan proses Payment Request yang sudah disetujui. Tandai Lunas dengan nominal aktual yang ditransfer.' },
      { icon: '📊', name: 'Finance — Laporan', desc: 'Monitor realisasi pengeluaran vs anggaran per project.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan task yang ditugaskan ke kamu.' },
    ],
    steps: [
      { title: 'Cek PR yang perlu dibayar', desc: 'Finance → tab Pembayaran & Piutang → tab Perlu Ditindaki → lihat PR berstatus "Siap Dibayarkan".' },
      { title: 'Proses transfer', desc: 'Catat detail penerima dan nominal dari PR → transfer via perbankan seperti biasa.' },
      { title: 'Tandai Lunas di sistem', desc: 'Kembali ke PR → klik Tandai Lunas → isi nominal aktual yang ditransfer + tanggal transfer → simpan.' },
      { title: 'Catat pengeluaran lain', desc: 'Pengeluaran yang tidak masuk PR (kas kecil, dsb.) dicatat di Finance → Pengeluaran Langsung project terkait.' },
    ],
    tip: 'Nominal yang kamu isi saat Tandai Lunas adalah yang masuk ke laporan kas — pastikan sesuai dengan yang benar-benar ditransfer, bukan nominal yang diajukan.',
  },
  {
    slug: 'humam-bimantoro',
    name: 'Humam Bimantoro',
    email: 'hbimantoro@gmail.com',
    password: 'Wmark@Fin26',
    unit: 'Finance',
    jabatan: 'Finance Staff — Invoicing',
    accent: '#059669',
    accentLight: '#D1FAE5',
    accentText: '#064E3B',
    levelLabel: 'Finance',
    intro: 'Kamu fokus pada pengelolaan invoice — membuat dan memantau invoice klien, memastikan tidak ada piutang yang lewat jatuh tempo, dan mencatat pembayaran masuk dari klien.',
    menus: [
      { icon: '📄', name: 'Finance — Piutang', desc: 'Buat invoice klien, pantau status, dan tandai lunas saat pembayaran masuk.' },
      { icon: '💳', name: 'Finance — Pembayaran', desc: 'Lihat status Payment Request untuk referensi pengeluaran project.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan task yang ditugaskan ke kamu.' },
    ],
    steps: [
      { title: 'Buat invoice klien', desc: 'Finance → Piutang / Invoice Klien → + Tambah Piutang → isi nama klien, no. invoice, no. PO, jumlah, dan jatuh tempo.' },
      { title: 'Pantau piutang harian', desc: 'Filter "Lewat Tenggat" → cek invoice yang sudah jatuh tempo dan belum dibayar → koordinasikan dengan PM untuk follow-up ke klien.' },
      { title: 'Catat pembayaran masuk', desc: 'Klik invoice yang sudah dibayar klien → Tandai Lunas → isi nominal dan tanggal terima → simpan.' },
      { title: 'Lampirkan no. invoice ke PR', desc: 'Setelah payment request dibayar, lampirkan no. invoice vendor di detail PR untuk dokumentasi.' },
    ],
    tip: 'Piutang yang lewat jatuh tempo akan muncul sebagai alert merah di halaman Finance. Cek setiap hari dan segera follow-up ke PM project yang bersangkutan.',
  },
  {
    slug: 'sutrisna',
    name: 'Sutrisna',
    email: 'sutrisna.soutrs@gmail.com',
    password: 'Wmark@Fin26',
    unit: 'GA',
    jabatan: 'General Affairs',
    accent: '#059669',
    accentLight: '#D1FAE5',
    accentText: '#064E3B',
    levelLabel: 'GA',
    intro: 'Kamu bertanggung jawab atas kebersihan, kenyamanan, dan keamanan kantor, serta menyiapkan makan siang untuk anggota tim. Di sistem, tugasmu cukup sederhana — cukup check-in setiap hari dan update task jika ada yang ditugaskan.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Halaman utamamu — check-in harian dan task yang ditugaskan ke kamu.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Setiap pagi sebelum jam 10, buka aplikasi → Tugas Saya → Check-in → isi kondisi kehadiran → simpan.' },
      { title: 'Kerjakan task jika ada', desc: 'Jika ada task yang ditugaskan (misal belanja kebutuhan kantor), klik task → Update Progres setelah selesai.' },
    ],
    tip: 'Cukup check-in setiap hari. Kalau ada keperluan pembelian untuk kantor, koordinasikan dulu dengan Henri atau Anung sebelum diproses.',
  },
]

// ── Template HTML ────────────────────────────────────────────────────────────
function buildHTML(p) {
  const menuCards = p.menus.map(m => `
    <div class="menu-card">
      <div class="menu-icon">${m.icon}</div>
      <div>
        <div class="menu-name">${m.name}</div>
        <p>${m.desc}</p>
      </div>
    </div>`).join('')

  const stepItems = p.steps.map((s, i) => `
    <li>
      <div class="step-num">${i + 1}</div>
      <div>
        <div class="step-title">${s.title}</div>
        <p>${s.desc}</p>
      </div>
    </li>`).join('')

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Panduan — ${p.name}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap">
<style>
  :root {
    --navy: #1E2B4A;
    --accent: ${p.accent};
    --accent-light: ${p.accentLight};
    --accent-text: ${p.accentText};
    --ground: #F7F8FC;
    --surface: #FFFFFF;
    --border: #E2E8F0;
    --text: #1A202C;
    --muted: #64748B;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: var(--ground); color: var(--text); font-size: 14px; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: 720px; margin: 0 auto; background: var(--surface); min-height: 100vh; }

  /* Header */
  .header { background: var(--navy); color: white; padding: 28px 40px 24px; }
  .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .brand-mark { width: 32px; height: 32px; background: linear-gradient(135deg, #7C3AED, #A78BFA); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 16px; color: white; }
  .brand-name { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 14px; color: rgba(255,255,255,0.85); }
  .level-badge { background: var(--accent); color: white; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase; padding: 3px 10px; border-radius: 4px; }
  .header h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 22px; line-height: 1.2; margin-bottom: 3px; }
  .header .jabatan { font-size: 13px; color: rgba(255,255,255,0.6); }

  /* Content */
  .content { padding: 28px 40px 40px; }

  /* Login box */
  .login-box { background: var(--navy); border-radius: 10px; padding: 20px 24px; margin-bottom: 24px; color: white; }
  .login-box h2 { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
  .login-url { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; }
  .login-url .lbl { font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(255,255,255,0.45); flex-shrink: 0; }
  .login-url a { color: #93C5FD; font-weight: 600; font-size: 12px; text-decoration: none; }
  .login-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .login-item .li-label { font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 3px; }
  .login-item .li-val { font-size: 13px; font-weight: 500; color: white; }
  .login-item .li-pass { font-family: 'SF Mono', monospace; font-size: 13px; background: rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 4px; color: ${p.accent === '#059669' ? '#6EE7B7' : p.accent === '#D97706' ? '#FCD34D' : p.accent === '#DB2777' ? '#F9A8D4' : '#C4B5FD'}; }

  /* Section */
  .section { margin-bottom: 22px; }
  .section-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid var(--border); }

  /* Intro */
  .intro-box { background: var(--accent-light); border-left: 3px solid var(--accent); border-radius: 0 6px 6px 0; padding: 12px 14px; font-size: 13px; color: var(--accent-text); margin-bottom: 22px; line-height: 1.55; }

  /* Menu cards */
  .menu-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .menu-card { display: flex; align-items: flex-start; gap: 10px; background: var(--ground); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
  .menu-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
  .menu-name { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 12.5px; color: var(--navy); margin-bottom: 2px; }
  .menu-card p { font-size: 11.5px; color: var(--muted); line-height: 1.4; }

  /* Steps */
  .step-list { list-style: none; counter-reset: steps; }
  .step-list li { counter-increment: steps; display: flex; gap: 12px; margin-bottom: 10px; }
  .step-num { flex-shrink: 0; width: 22px; height: 22px; background: var(--accent); color: white; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 11px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: 2px; }
  .step-title { font-weight: 600; font-size: 12.5px; color: var(--navy); margin-bottom: 1px; }
  .step-list li p { font-size: 12px; color: var(--muted); line-height: 1.5; }

  /* Tip */
  .tip-box { background: var(--accent-light); border-left: 3px solid var(--accent); border-radius: 0 6px 6px 0; padding: 10px 14px; font-size: 12.5px; color: var(--accent-text); margin-top: 14px; }

  /* Footer */
  .footer { border-top: 1px solid var(--border); padding: 12px 40px; display: flex; justify-content: space-between; font-size: 10.5px; color: var(--muted); background: var(--ground); }

  @media print {
    body { background: white; }
    .page { max-width: 100%; min-height: auto; }
    .header, .login-box { -webkit-print-color-adjust: exact; }
    .footer { display: none; }
    @page { margin: 0; size: A4; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-top">
      <div class="brand">
        <div class="brand-mark">W</div>
        <span class="brand-name">Watermark PM</span>
      </div>
      <span class="level-badge">${p.levelLabel}</span>
    </div>
    <h1>${p.name}</h1>
    <div class="jabatan">${p.jabatan} · ${p.unit}</div>
  </div>

  <div class="content">
    <div class="login-box">
      <h2>Informasi Login</h2>
      <div class="login-url">
        <span class="lbl">Alamat</span>
        <a href="https://${APP_URL}">${APP_URL}</a>
      </div>
      <div class="login-grid">
        <div class="login-item">
          <div class="li-label">Email</div>
          <div class="li-val">${p.email}</div>
        </div>
        <div class="login-item">
          <div class="li-label">Password</div>
          <div class="li-val"><span class="li-pass">${p.password}</span></div>
        </div>
      </div>
    </div>

    <div class="intro-box">${p.intro}</div>

    ${p.menus.length ? `
    <div class="section">
      <div class="section-title">Menu yang Kamu Gunakan</div>
      <div class="menu-list">${menuCards}</div>
    </div>` : ''}

    <div class="section">
      <div class="section-title">Cara Menggunakan Sistem</div>
      <ol class="step-list">${stepItems}</ol>
      ${p.tip ? `<div class="tip-box"><strong>Catatan:</strong> ${p.tip}</div>` : ''}
    </div>
  </div>

  <div class="footer">
    <span>Watermark PM — Panduan Personal · ${p.name}</span>
    <span>PT Sinematik Anak Bangsa · 2026</span>
  </div>
</div>
</body>
</html>`
}

// ── Generate semua file ──────────────────────────────────────────────────────
let count = 0
for (const p of PEOPLE) {
  const html = buildHTML(p)
  const file = path.join(OUT, `${p.slug}.html`)
  fs.writeFileSync(file, html, 'utf8')
  count++
  console.log(`✓ ${p.name} → guides/${p.slug}.html`)
}
console.log(`\nSelesai: ${count} panduan dibuat di folder guides/`)
