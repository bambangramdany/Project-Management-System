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
    intro: 'Kamu adalah penanggung jawab utama seluruh divisi Production House — mulai dari quotation, project lead, approval Payment Request tahap pertama, hingga pengawasan & penilaian kinerja tim PH (Bagastya dan Jamaluddin).',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan semua project PH aktif, alert task overdue, dan status tim.' },
      { icon: '📁', name: 'Projects', desc: 'Buat quotation project PH, assign tim, kelola timeline dan RAB.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Task harian dan check-in kamu sendiri sebagai producer/PM.' },
      { icon: '🏢', name: 'Klien', desc: 'Input dan kelola data klien PH — nama, PIC, kontak, riwayat project.' },
      { icon: '🤝', name: 'Vendor', desc: 'Input vendor, kelola daftar, dan isi penilaian vendor setelah project selesai.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Monitor skor kinerja Bagastya dan Jamaluddin setiap bulan.' },
      { icon: '👥', name: 'Workload Tim', desc: 'Cek distribusi beban kerja tim PH agar tidak overload.' },
      { icon: '💰', name: 'Finance', desc: 'Approval Payment Request tahap 1 (Direktur Divisi) untuk project PH.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Nilai kinerja Bagastya dan Jamaluddin, serta isi self-assessment kamu sendiri.' },
    ],
    steps: [
      { title: 'Input data klien', desc: 'Setiap klien baru harus dimasukkan ke sistem. Klien → + Tambah Klien → isi nama perusahaan, PIC, kontak, dan alamat → simpan.' },
      { title: 'Buka project baru & buat quotation', desc: 'Projects → + Project Baru → isi nama, pilih klien, tanggal, pilih divisi PH → simpan. Buat Quotation di tab Quotation → isi RAB → mark sebagai WON setelah deal dengan klien.' },
      { title: 'Tambah tim & task', desc: 'Di halaman project → tab Tim → tambah Bagastya dan/atau Jamaluddin → tab Task → buat task untuk masing-masing dengan deadline jelas.' },
      { title: 'Nilai vendor setelah project selesai', desc: 'Vendor → pilih vendor yang digunakan → isi penilaian vendor (ketepatan waktu, kualitas, harga) → simpan.' },
      { title: 'Approval Payment Request (tahap 1)', desc: 'Finance → tab Perlu Ditindaki → review PR dari tim PH → Setujui atau Tolak. PR yang kamu setujui naik ke Anung (Direktur Finance) untuk approval akhir.' },
      { title: 'Nilai kinerja tim dan diri sendiri', desc: 'Penilaian → pilih bulan → isi evaluasi untuk Bagastya dan Jamaluddin. Isi juga self-assessment kamu sendiri.' },
    ],
    tip: 'Alur payment PH: Bagastya/Jamaluddin ajukan → kamu approve (Direktur PH) → Anung approve (Direktur Finance) → Antoni proses. Pastikan PR ditindaklanjuti dalam 1×24 jam.',
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
    intro: 'Kamu adalah penanggung jawab utama divisi Event — final approval quotation (setelah dicek Wulan), pengawasan kinerja tim, dan approval Payment Request tahap pertama sebelum naik ke Direktur Finance.',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan semua project Event aktif dan alert yang perlu perhatian.' },
      { icon: '📁', name: 'Projects', desc: 'Review dan approve project Event, pantau timeline dan RAB.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Task dan check-in harian kamu sendiri.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Monitor dan input penilaian kinerja seluruh tim Event tiap bulan.' },
      { icon: '👥', name: 'Workload Tim', desc: 'Pantau distribusi beban kerja PM, PO, dan Production.' },
      { icon: '💰', name: 'Finance', desc: 'Approval Payment Request tahap 1 (Direktur Divisi) untuk project Event.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Nilai kinerja anggota tim divisi Event setiap bulan.' },
    ],
    steps: [
      { title: 'Review quotation dari Wulan', desc: 'Quotation project Event akan dicek Wulan terlebih dahulu sebelum diteruskan ke kamu untuk final approval.' },
      { title: 'Pantau semua project Event', desc: 'Dashboard → lihat status tiap project. Klik project untuk detail timeline dan task.' },
      { title: 'Approve Payment Request (tahap 1)', desc: 'Finance → tab Perlu Ditindaki → review PR dari tim Event berstatus "Menunggu Direktur" → Setujui atau Tolak. PR yang kamu setujui akan naik ke Direktur Finance untuk approval tahap 2.' },
      { title: 'Nilai kinerja tim', desc: 'Penilaian → pilih bulan → isi evaluasi untuk anggota tim Event di bawahmu (Wulan, Irham, Julian, Siti Nur, Doddi, Noval, Angga). Koordinasikan juga dengan Wulan yang punya kewenangan menilai tim Event + Creative.' },
      { title: 'Nilai diri sendiri', desc: 'Penilaian → Penilaian Diri → isi self-assessment bulanan kamu sendiri.' },
    ],
    tip: 'Alur payment: PM ajukan → kamu approve (Direktur Divisi) → Anung approve (Direktur Finance) → Finance tandai lunas. Pastikan kamu tindak lanjuti PR yang masuk dalam 1×24 jam.',
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
    intro: 'Kamu adalah penanggung jawab divisi Creative — mendukung project Event dan PH dengan output kreatif, mengawasi kinerja tim, dan menjadi approver Payment Request tahap pertama untuk project Creative.',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan project yang melibatkan tim Creative.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project tempat tim Creative dilibatkan — brief, task, dan deadline.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Task dan check-in harian kamu sebagai Creative Lead.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Monitor skor kinerja Kresensia, Saffira, Kukuh, dan Nauval tiap bulan.' },
      { icon: '👥', name: 'Workload Tim', desc: 'Pastikan beban kreatif tersebar merata di tim.' },
      { icon: '💰', name: 'Finance', desc: 'Approval Payment Request tahap 1 (Direktur Divisi) untuk kebutuhan Creative.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Nilai kinerja tim Creative dan isi self-assessment bulanan.' },
    ],
    steps: [
      { title: 'Cek project yang butuh creative support', desc: 'Dashboard → lihat project Event/PH yang active → pastikan tim Creative sudah ter-assign di project tersebut.' },
      { title: 'Buat atau assign task kreatif', desc: 'Projects → pilih project → + Task → pilih anggota tim Creative yang bertanggung jawab.' },
      { title: 'Pantau output tim', desc: 'Workload Tim → cek task Kresensia, Saffira, Kukuh, Nauval — apakah ada yang overload.' },
      { title: 'Approve Payment Request (tahap 1)', desc: 'Finance → tab Perlu Ditindaki → review PR dari tim Creative → Setujui atau Tolak. PR yang disetujui akan naik ke Direktur Finance (Anung) untuk approval akhir.' },
      { title: 'Nilai kinerja tim dan diri sendiri', desc: 'Penilaian → pilih bulan → isi evaluasi untuk Kresensia, Saffira, Kukuh, Nauval. Isi juga self-assessment kamu sendiri.' },
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
    intro: 'Kamu mengawasi operasional Finance dan GA secara keseluruhan. Di sistem, kamu bisa memantau laporan keuangan, melihat seluruh Payment Request, invoice klien, dan kinerja tim Finance & GA.',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan laporan keuangan dan status operasional.' },
      { icon: '💰', name: 'Finance', desc: 'Monitor semua Payment Request, piutang klien, laporan kas, dan opex.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Pantau kinerja tim Finance & GA (Anung, Antoni, Bimantoro, Sutrisna).' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in dan task harian kamu.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Nilai kinerja tim Finance & GA dan isi self-assessment bulanan.' },
    ],
    steps: [
      { title: 'Monitor laporan keuangan', desc: 'Finance → tab Laporan & Analitik → lihat ringkasan arus kas, piutang, dan realisasi per project.' },
      { title: 'Pantau status Payment Request', desc: 'Finance → tab Pembayaran → cek semua PR yang sedang berjalan: menunggu approval, sudah disetujui, atau sudah dibayar.' },
      { title: 'Cek piutang klien', desc: 'Finance → Piutang / Invoice Klien → pastikan tidak ada invoice yang lewat jatuh tempo.' },
      { title: 'Nilai kinerja tim dan diri sendiri', desc: 'Penilaian → pilih bulan → isi evaluasi tim Finance & GA. Isi juga self-assessment kamu sendiri setiap bulan.' },
    ],
    tip: 'Approval Payment Request tahap Finance Director dilakukan oleh Anung (Direktur Finance & HRGA). Kamu lebih berfungsi sebagai monitor dan pengawas laporan keuangan secara keseluruhan.',
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
    intro: 'Kamu adalah PM Event senior dengan kewenangan khusus: mereview quotation Event sebelum ke David, menilai kinerja tim Event dan Creative, serta mengelola project dari brief hingga selesai.',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan semua project Event yang kamu kelola dan pantau.' },
      { icon: '📁', name: 'Projects', desc: 'Buat dan kelola project Event — quotation, timeline, tim, dan task.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan task kamu sendiri.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Monitor skor kinerja tim Event dan Creative tiap bulan.' },
      { icon: '👥', name: 'Workload Tim', desc: 'Pantau beban kerja tim Event dan atur ulang jika perlu.' },
      { icon: '💰', name: 'Finance', desc: 'Ajukan Payment Request untuk kebutuhan project.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Nilai kinerja tim Event (Irham, Julian, Siti Nur, Doddi, Noval, Angga) dan tim Creative.' },
    ],
    steps: [
      { title: 'Buat project & quotation', desc: 'Projects → + Project Baru → isi detail, pilih klien dan divisi Event → simpan. Buat Quotation di tab Quotation project → isi RAB dan scope → Submit untuk approval David.' },
      { title: 'Review quotation sebelum ke David', desc: 'Setiap quotation project Event baru harus kamu periksa dulu — pastikan RAB dan scope sudah benar. Setelah kamu setujui, quotation naik ke David (Direktur Event) untuk final approval.' },
      { title: 'Assign tim & buat task', desc: 'Di halaman project → tab Tim → tambah anggota → tab Task → buat task per orang dengan deadline jelas.' },
      { title: 'Ajukan Payment Request', desc: 'Finance → + Ajukan Pembayaran → pilih project → isi vendor, kategori, nominal, dan keterangan → Kirim. PR akan masuk ke David (Direktur Divisi) → lalu ke Anung (Direktur Finance).' },
      { title: 'Nilai kinerja tim Event + Creative', desc: 'Penilaian → pilih bulan → isi evaluasi untuk tim Event (Irham, Julian, Siti Nur, Doddi, Noval, Angga) dan tim Creative (Kresensia, Saffira, Kukuh, Nauval). Kamu memiliki kewenangan khusus untuk menilai kedua tim ini.' },
      { title: 'Nilai diri sendiri', desc: 'Penilaian → Penilaian Diri → isi self-assessment bulanan kamu setiap awal bulan.' },
    ],
    tip: 'Kamu adalah jembatan antara tim Event & Creative dengan David. Pastikan semua quotation sudah kamu review sebelum naik ke Direktur, dan penilaian kinerja tim diselesaikan sebelum tanggal 5 tiap bulannya.',
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
    intro: 'Kamu adalah Project Manager Event — bertanggung jawab mengelola project dari brief hingga selesai, mengkoordinasikan tim, mengajukan pembayaran, dan menilai diri sendiri setiap bulan.',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan project yang kamu kelola dan task yang perlu perhatian.' },
      { icon: '📁', name: 'Projects', desc: 'Kelola project Event kamu — tim, timeline, task, dan anggaran.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task yang ditugaskan ke kamu.' },
      { icon: '👥', name: 'Workload Tim', desc: 'Pantau beban kerja anggota tim di project kamu.' },
      { icon: '💰', name: 'Finance', desc: 'Ajukan Payment Request untuk kebutuhan project.' },
      { icon: '🎯', name: 'Event Day', desc: 'Koordinasi rundown, absensi kru, dan laporan masalah saat hari-H event.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Kelola project aktif', desc: 'Projects → pilih project kamu → pantau progress task tim, deadline, dan anggaran.' },
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10 → isi kondisi dan catatan.' },
      { title: 'Update progres task', desc: 'Klik task yang sedang berjalan → Update Progres → tulis pencapaian hari ini.' },
      { title: 'Ajukan Payment Request', desc: 'Finance → + Ajukan Pembayaran → pilih project → isi vendor, kategori, nominal, dan keterangan → Kirim. PR akan diapprove dulu oleh David (Direktur Event), lalu naik ke Anung (Direktur Finance), baru diproses oleh tim Finance.' },
      { title: 'Koordinasi hari-H', desc: 'Pada hari event, buka Event Day → aktifkan rundown → pantau kehadiran kru dan catat masalah real-time.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi evaluasi diri kamu sendiri setiap awal bulan. Kamu hanya bisa menilai diri sendiri — penilaian dari atasan dilakukan oleh Wulan dan David.' },
    ],
    tip: 'Quotation project Event harus melalui review Wulan (Senior PM) sebelum naik ke David. PR payment butuh 2 tahap approval (David → Anung) sebelum diproses Finance.',
  },
  {
    slug: 'bambang-ramdany',
    name: 'Bambang Ramdany',
    email: 'bamramdany@gmail.com',
    password: 'Wmark@PM26',
    unit: 'Event',
    jabatan: 'Project Manager / Direktur Utama',
    accent: '#0F766E',
    accentLight: '#CCFBF1',
    accentText: '#134E4A',
    levelLabel: 'Owner / PM',
    intro: 'Kamu memiliki akses penuh sebagai Direktur Utama (Owner) sekaligus Project Manager — bisa mengelola semua project, menilai kinerja semua anggota tim di semua divisi, dan menyetujui pengajuan pembayaran.',
    menus: [
      { icon: '📊', name: 'Dashboard', desc: 'Ringkasan seluruh project aktif, laporan keuangan, dan kinerja tim.' },
      { icon: '📁', name: 'Projects', desc: 'Kelola semua project lintas divisi — timeline, tim, task, dan anggaran.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task yang ditugaskan ke kamu.' },
      { icon: '👥', name: 'Workload Tim', desc: 'Pantau beban kerja seluruh tim lintas divisi.' },
      { icon: '💰', name: 'Finance', desc: 'Lihat dan approve semua Payment Request sebagai Owner, atau ajukan PR sebagai PM.' },
      { icon: '🎯', name: 'Event Day', desc: 'Koordinasi rundown, absensi kru, dan laporan masalah saat hari-H.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Nilai kinerja semua anggota tim lintas divisi — kecuali Direktur dan sesama Owner.' },
      { icon: '⚙️', name: 'Pengaturan', desc: 'Kelola akun pengguna, impersonasi (lihat sistem sebagai user lain), dan konfigurasi sistem.' },
    ],
    steps: [
      { title: 'Kelola project aktif', desc: 'Projects → pilih project kamu → pantau progress task, deadline, dan anggaran.' },
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Update progres task', desc: 'Klik task → Update Progres → tulis pencapaian hari ini.' },
      { title: 'Ajukan Payment Request', desc: 'Finance → + Ajukan Pembayaran → isi detail vendor, kategori, nominal → Kirim. Sebagai PM, PR kamu tetap perlu approval Direktur Divisi dan Direktur Finance.' },
      { title: 'Nilai kinerja tim (sebagai Owner)', desc: 'Penilaian → pilih bulan → kamu bisa menilai semua anggota tim kecuali sesama Direktur. Ini digunakan saat Direktur Divisi masing-masing tidak tersedia.' },
      { title: 'Self-assessment', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu sendiri setiap bulan.' },
    ],
    tip: 'Check-in dan update progres task dilakukan setiap hari kerja — keduanya masuk ke penilaian kinerja bulanan. Sebagai Owner, kamu juga bisa impersonasi akun siapapun melalui menu Pengaturan untuk memastikan sistem berjalan semestinya.',
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
    intro: 'Kamu adalah Project Officer Event — mendukung PM dalam menjalankan project, memastikan kebutuhan operasional terpenuhi, dan menilai diri sendiri setiap bulan.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Pusat aktivitas harian — check-in, lihat task, dan update progres.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project Event tempat kamu dilibatkan — brief, task, dan deadline.' },
      { icon: '🎯', name: 'Event Day', desc: 'Rundown hari-H, konfirmasi kehadiran, dan laporan masalah.' },
      { icon: '💬', name: 'Sharing Session', desc: 'Jadwal dan materi knowledge sharing internal.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10 → isi kondisi dan catatan singkat.' },
      { title: 'Kerjakan task yang ditugaskan', desc: 'Klik task → baca brief PM → mulai kerjakan → Update Progres minimal 1x sehari.' },
      { title: 'Kelola vendor', desc: 'Jika ada vendor baru yang ditemukan/dikonfirmasi, koordinasikan dengan PM untuk dimasukkan ke sistem.' },
      { title: 'Hari-H event', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → laporkan masalah jika ada.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan. Penilaian dari atasan dilakukan oleh Wulan dan David.' },
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
    intro: 'Kamu adalah Project Officer Event — mendukung PM dalam menjalankan project, memastikan kebutuhan operasional terpenuhi, dan menilai diri sendiri setiap bulan.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Pusat aktivitas harian — check-in, lihat task, dan update progres.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project Event tempat kamu dilibatkan — brief, task, dan deadline.' },
      { icon: '🎯', name: 'Event Day', desc: 'Rundown hari-H, konfirmasi kehadiran, dan laporan masalah.' },
      { icon: '💬', name: 'Sharing Session', desc: 'Jadwal dan materi knowledge sharing internal.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10 → isi kondisi dan catatan singkat.' },
      { title: 'Kerjakan task yang ditugaskan', desc: 'Klik task → baca brief PM → mulai kerjakan → Update Progres minimal 1x sehari.' },
      { title: 'Kelola vendor', desc: 'Jika ada vendor baru yang ditemukan/dikonfirmasi, koordinasikan dengan PM untuk dimasukkan ke sistem.' },
      { title: 'Hari-H event', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → laporkan masalah jika ada.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan. Penilaian dari atasan dilakukan oleh Wulan dan David.' },
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
    intro: 'Kamu adalah bagian dari tim Production Event — mendukung jalannya project di lapangan, memastikan semua kebutuhan teknis tersedia, dan menilai diri sendiri setiap bulan.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project yang kamu ikuti — detail brief dan task.' },
      { icon: '🎯', name: 'Event Day', desc: 'Rundown hari-H, konfirmasi kehadiran, laporan masalah.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi → isi kondisi kehadiran.' },
      { title: 'Kerjakan task produksi', desc: 'Klik task yang ditugaskan PM → kerjakan → Update Progres setiap hari.' },
      { title: 'Hari-H event', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → laporkan masalah atau hambatan teknis.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan. Penilaian dari atasan dilakukan oleh Wulan (Senior PM).' },
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
    intro: 'Kamu adalah bagian dari tim Production Event — mendukung jalannya project di lapangan, memastikan semua kebutuhan teknis tersedia, dan menilai diri sendiri setiap bulan.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project yang kamu ikuti — detail brief dan task.' },
      { icon: '🎯', name: 'Event Day', desc: 'Rundown hari-H, konfirmasi kehadiran, laporan masalah.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi → isi kondisi kehadiran.' },
      { title: 'Kerjakan task produksi', desc: 'Klik task yang ditugaskan PM → kerjakan → Update Progres setiap hari.' },
      { title: 'Hari-H event', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → laporkan masalah atau hambatan teknis.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan. Penilaian dari atasan dilakukan oleh Wulan (Senior PM).' },
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
    intro: 'Kamu adalah bagian dari tim Production Event — mendukung jalannya project di lapangan, memastikan semua kebutuhan teknis tersedia, dan menilai diri sendiri setiap bulan.',
    menus: [
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan semua task yang ditugaskan ke kamu.' },
      { icon: '📁', name: 'Projects', desc: 'Lihat project yang kamu ikuti — detail brief dan task.' },
      { icon: '🎯', name: 'Event Day', desc: 'Rundown hari-H, konfirmasi kehadiran, laporan masalah.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi → isi kondisi kehadiran.' },
      { title: 'Kerjakan task produksi', desc: 'Klik task yang ditugaskan PM → kerjakan → Update Progres setiap hari.' },
      { title: 'Hari-H event', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → laporkan masalah.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan. Penilaian dari atasan dilakukan oleh Wulan (Senior PM).' },
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
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kerjakan task desain', desc: 'Klik task → baca brief dan referensi dari PM/Direktur Creative → mulai kerjakan → Update Progres.' },
      { title: 'Koordinasi dengan Fakhril', desc: 'Untuk arahan desain dan review output, koordinasikan dengan M. Fakhril Islamy selaku Direktur Creative.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan. Penilaian dari atasan dilakukan oleh Wulan (Senior PM) dan Fakhril (Direktur Creative).' },
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
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kerjakan task desain', desc: 'Klik task → baca brief dan referensi dari PM/Direktur Creative → mulai kerjakan → Update Progres.' },
      { title: 'Koordinasi dengan Fakhril', desc: 'Untuk arahan desain dan review output, koordinasikan dengan M. Fakhril Islamy selaku Direktur Creative.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan. Penilaian dari atasan dilakukan oleh Wulan (Senior PM) dan Fakhril (Direktur Creative).' },
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
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kerjakan task desain', desc: 'Klik task → baca brief → kerjakan → Update Progres tiap hari.' },
      { title: 'Koordinasi dengan Fakhril', desc: 'Review output desain dilakukan bersama Direktur Creative sebelum diserahkan ke PM.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan. Penilaian dari atasan dilakukan oleh Wulan (Senior PM) dan Fakhril (Direktur Creative).' },
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
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kerjakan task multimedia', desc: 'Klik task → baca brief → render/kerjakan → Update Progres tiap hari termasuk progress render.' },
      { title: 'Koordinasi dengan Fakhril', desc: 'Review output motion graphic dilakukan bersama Direktur Creative sebelum diserahkan ke PM.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan. Penilaian dari atasan dilakukan oleh Wulan (Senior PM) dan Fakhril (Direktur Creative).' },
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
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kelola project PH', desc: 'Projects → pilih project PH → pantau task, timeline, dan koordinasikan dengan Jamaluddin.' },
      { title: 'Update progres', desc: 'Klik task → Update Progres minimal 1x sehari.' },
      { title: 'Ajukan Payment Request', desc: 'Finance → + Ajukan Pembayaran → isi detail vendor, nominal, dan keterangan → Kirim. PR akan diapprove oleh Gunadarma (Direktur PH) → lalu Anung (Direktur Finance) → baru diproses Finance.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan. Penilaian dari atasan dilakukan oleh Gunadarma (Direktur PH).' },
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
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10.' },
      { title: 'Kelola project PH', desc: 'Projects → pilih project PH → pantau task, timeline, dan koordinasikan dengan Bagastya.' },
      { title: 'Update progres', desc: 'Klik task → Update Progres minimal 1x sehari.' },
      { title: 'Ajukan Payment Request', desc: 'Finance → + Ajukan Pembayaran → isi detail vendor, nominal, dan keterangan → Kirim. PR akan diapprove oleh Gunadarma (Direktur PH) → lalu Anung (Direktur Finance) → baru diproses Finance.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan. Penilaian dari atasan dilakukan oleh Gunadarma (Direktur PH).' },
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
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Check-in harian', desc: 'Tugas Saya → Check-in setiap pagi sebelum jam 10, termasuk di hari produksi lapangan.' },
      { title: 'Pantau task dari berbagai project', desc: 'Tugas Saya menampilkan semua task dari semua project tempat kamu dilibatkan — cek setiap hari.' },
      { title: 'Update dokumentasi', desc: 'Setiap sesi dokumentasi, Update Progres task dengan catatan apa yang sudah diambil/diproduksi.' },
      { title: 'Hari event/produksi', desc: 'Event Day → konfirmasi kehadiran → ikuti rundown → catat momen penting untuk konten.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan.' },
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
    jabatan: 'Direktur Finance & HRGA',
    accent: '#059669',
    accentLight: '#D1FAE5',
    accentText: '#064E3B',
    levelLabel: 'Direktur Finance',
    intro: 'Kamu adalah Direktur Finance & HRGA — approval Payment Request tahap akhir sebelum diproses Finance, mengelola piutang klien, input penilaian HRD bulanan seluruh karyawan, serta memastikan operasional Finance dan GA berjalan lancar.',
    menus: [
      { icon: '💳', name: 'Finance — Pembayaran', desc: 'Approval Payment Request tahap 2 (Direktur Finance) setelah lolos dari Direktur Divisi. Juga bisa langsung memproses pembayaran (Tandai Lunas).' },
      { icon: '📄', name: 'Finance — Piutang', desc: 'Input invoice klien, pantau status pembayaran, tandai lunas saat klien bayar.' },
      { icon: '📝', name: 'Input HRD', desc: 'Input evaluasi HRD bulanan seluruh karyawan — komponen absensi, attitude, sharing session, dan skill development. Harus selesai sebelum tanggal 5 bulan berikutnya.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan task kamu sendiri.' },
      { icon: '📈', name: 'Laporan Kinerja', desc: 'Monitor skor kinerja seluruh tim untuk keperluan evaluasi dan penilaian.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Nilai kinerja tim Finance & GA dan isi self-assessment bulanan.' },
    ],
    steps: [
      { title: 'Approval Payment Request (tahap 2 — Direktur Finance)', desc: 'Finance → tab Perlu Ditindaki → cek PR yang sudah disetujui Direktur Divisi dan menunggu approval kamu → Setujui atau Tolak. PR yang kamu setujui langsung bisa diproses oleh Antoni atau kamu sendiri.' },
      { title: 'Proses pembayaran (Tandai Lunas)', desc: 'Finance → PR berstatus "Siap Dibayarkan" → klik → Tandai Lunas → isi nominal aktual yang ditransfer + tanggal → simpan.' },
      { title: 'Input piutang klien', desc: 'Finance → + Tambah Piutang → isi nama klien, no. invoice, jumlah, dan jatuh tempo → simpan.' },
      { title: 'Input evaluasi HRD bulanan', desc: 'Input HRD → pilih bulan → isi komponen penilaian (absensi, attitude, sharing session, skill development) untuk masing-masing karyawan → simpan. Lakukan sebelum tanggal 5 bulan berikutnya.' },
      { title: 'Nilai kinerja tim dan diri sendiri', desc: 'Penilaian → pilih bulan → isi evaluasi untuk tim Finance & GA (Antoni, Bimantoro, Sutrisna). Isi juga self-assessment kamu sendiri.' },
    ],
    tip: 'Evaluasi HRD yang kamu input berkontribusi langsung ke skor kinerja karyawan. Pastikan semua karyawan aktif dievaluasi setiap bulan — termasuk karyawan baru. Alur payment: Direktur Divisi setujui → kamu setujui → Antoni/kamu proses.',
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
    intro: 'Kamu bertanggung jawab mencatat dan mengelola seluruh pengeluaran perusahaan, serta memproses pembayaran ke vendor. Payment Request yang sudah disetujui Direktur Divisi dan Direktur Finance (Anung) harus kamu tandai lunas di sistem.',
    menus: [
      { icon: '💳', name: 'Finance — Pembayaran', desc: 'Lihat dan proses Payment Request berstatus "Siap Dibayarkan". Tandai Lunas dengan nominal aktual yang ditransfer.' },
      { icon: '📊', name: 'Finance — Laporan', desc: 'Monitor realisasi pengeluaran vs anggaran per project.' },
      { icon: '📋', name: 'Tugas Saya', desc: 'Check-in harian dan task yang ditugaskan ke kamu.' },
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Cek PR yang perlu dibayar', desc: 'Finance → tab Pembayaran & Piutang → lihat PR berstatus "Siap Dibayarkan" (sudah disetujui Direktur Divisi + Direktur Finance).' },
      { title: 'Proses transfer', desc: 'Catat detail penerima dan nominal dari PR → transfer via perbankan seperti biasa.' },
      { title: 'Tandai Lunas di sistem', desc: 'Kembali ke PR → klik Tandai Lunas → isi nominal aktual yang ditransfer + tanggal transfer → simpan. Transaksi otomatis tercatat di laporan kas.' },
      { title: 'Catat pengeluaran lain', desc: 'Pengeluaran yang tidak masuk PR (kas kecil, dsb.) dicatat di Finance → Kas Masuk/Keluar.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan.' },
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
      { icon: '⭐', name: 'Penilaian', desc: 'Isi self-assessment kinerja diri sendiri setiap bulan.' },
    ],
    steps: [
      { title: 'Buat invoice klien', desc: 'Finance → Piutang / Invoice Klien → + Tambah Piutang → isi nama klien, no. invoice, no. PO, jumlah, dan jatuh tempo.' },
      { title: 'Pantau piutang harian', desc: 'Filter "Lewat Tenggat" → cek invoice yang sudah jatuh tempo dan belum dibayar → koordinasikan dengan PM untuk follow-up ke klien.' },
      { title: 'Catat pembayaran masuk', desc: 'Klik invoice yang sudah dibayar klien → Tandai Lunas → isi nominal dan tanggal terima → simpan.' },
      { title: 'Lampirkan no. invoice ke PR', desc: 'Setelah payment request dibayar, lampirkan no. invoice vendor di detail PR untuk dokumentasi.' },
      { title: 'Self-assessment bulanan', desc: 'Penilaian → Penilaian Diri → isi self-assessment kamu setiap awal bulan.' },
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
