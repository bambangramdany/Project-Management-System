const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '../guides')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const APP_URL = 'project-management-system-six-psi.vercel.app'
const DEFAULT_PASSWORD = 'watermark2026'

// ── HTML template ────────────────────────────────────────────────────────────
function buildGuide(p) {
  const { name, email, password, jabatan, divisi, levelLabel, intro, accent, accentLight, accentText, menus, dailyRoutine, workflows, kpiIndicators } = p
  const pass = password || DEFAULT_PASSWORD

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Panduan ${name} — Watermark PM</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;font-size:10pt;color:#1a1a2e;background:#fff;line-height:1.5}
.hdr{background:linear-gradient(135deg,${accent} 0%,${accentText} 100%);color:#fff;padding:28px 32px 24px}
.hdr-meta{font-size:8pt;opacity:.75;margin-bottom:6px;letter-spacing:.05em;text-transform:uppercase}
.hdr-brand{font-size:22pt;font-weight:700;letter-spacing:-.02em;margin-bottom:4px}
.hdr-sub{font-size:9pt;opacity:.85}
.hdr-name{font-size:18pt;font-weight:700;margin:16px 0 4px}
.hdr-role{font-size:10pt;opacity:.9;margin-bottom:2px}
.hdr-lvl{display:inline-block;background:rgba(255,255,255,.2);border-radius:20px;padding:3px 12px;font-size:8.5pt;font-weight:600;margin-top:4px}
.body{padding:0 32px 32px}
.intro{background:${accentLight};border-left:4px solid ${accent};border-radius:8px;padding:14px 16px;margin:20px 0 24px;color:${accentText};font-size:9.5pt;line-height:1.6}
.sec{margin-bottom:24px}
.sec-title{font-size:12pt;font-weight:700;color:${accent};margin-bottom:12px;display:flex;align-items:center;gap:8px;border-bottom:2px solid ${accentLight};padding-bottom:6px}
.login-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:16px}
.login-hdr{background:${accent};color:#fff;padding:8px 16px;font-size:8.5pt;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.ltbl{width:100%;border-collapse:collapse}
.ltbl td{padding:8px 16px;border-bottom:1px solid #e2e8f0;font-size:9pt}
.ltbl td:first-child{font-weight:600;color:#64748b;width:100px}
.ltbl td:last-child{font-family:'Courier New',monospace;color:#1e293b}
.ltbl tr:last-child td{border-bottom:none}
.warn{background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:10px 14px;font-size:8.5pt;color:#92400e;margin-bottom:16px}
.steps{list-style:none;counter-reset:sc}
.steps li{counter-increment:sc;display:flex;gap:12px;align-items:flex-start;margin-bottom:8px}
.steps li::before{content:counter(sc);display:flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:50%;background:${accent};color:#fff;font-size:8pt;font-weight:700;flex-shrink:0;margin-top:1px}
.steps li span{font-size:9pt;color:#334155;padding-top:2px}
.routine-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rc{background:${accentLight};border-radius:8px;padding:12px 14px}
.rc-time{font-size:13pt;font-weight:700;color:${accent};margin-bottom:2px}
.rc-title{font-size:9pt;font-weight:600;color:${accentText};margin-bottom:8px}
.rc ul{list-style:none;padding:0}
.rc ul li{font-size:8pt;color:#334155;padding:2px 0 2px 12px;position:relative}
.rc ul li::before{content:'•';position:absolute;left:0;color:${accent}}
.menus{display:flex;flex-direction:column;gap:8px}
.mc{border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;background:#fafafa}
.mc-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.mc-icon{font-size:14pt}
.mc-name{font-weight:700;font-size:9.5pt;color:${accentText}}
.mc-url{font-size:7.5pt;color:#94a3b8;font-family:monospace;margin-left:auto}
.mc-desc{font-size:8.5pt;color:#475569;margin-bottom:4px}
.mc-steps{list-style:none;padding:0;margin:6px 0 0}
.mc-steps li{font-size:8.5pt;color:#334155;padding:3px 0 3px 14px;position:relative;border-top:1px solid #f1f5f9}
.mc-steps li::before{content:'→';position:absolute;left:0;color:${accent};font-weight:700}
.wf{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:12px}
.wf-title{font-weight:700;font-size:9.5pt;color:${accentText};margin-bottom:10px}
.wf-steps{list-style:none}
.wf-steps li{display:flex;gap:10px;align-items:flex-start;margin-bottom:7px}
.wf-num{display:flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:4px;background:${accent};color:#fff;font-size:7.5pt;font-weight:700;flex-shrink:0}
.wf-text{font-size:8.5pt;color:#334155;padding-top:1px}
.wf-text strong{color:${accentText}}
.wf-tip{background:${accentLight};border-radius:6px;padding:8px 12px;font-size:8pt;color:${accentText};margin-top:10px}
.kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.kc{border:1px solid ${accentLight};border-radius:8px;padding:10px 12px;background:#fafafa}
.kc-cat{font-size:7.5pt;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:4px;font-weight:600}
.kc ul{list-style:none;padding:0}
.kc ul li{font-size:8.5pt;color:#334155;padding:2px 0 2px 14px;position:relative}
.kc ul li::before{content:'★';position:absolute;left:0;color:${accent};font-size:8pt}
.badge-new{display:inline-block;background:#dc2626;color:#fff;font-size:6.5pt;font-weight:700;padding:1px 5px;border-radius:4px;text-transform:uppercase;letter-spacing:.05em;vertical-align:middle;margin-left:4px}
.ftr{background:#f1f5f9;padding:14px 32px;border-top:1px solid #e2e8f0;margin-top:24px}
.ftr p{font-size:8pt;color:#64748b;text-align:center;line-height:1.7}
.ftr strong{color:#334155}
hr.div{border:none;border-top:1px dashed #e2e8f0;margin:20px 0}
@media print{body,*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="hdr">
  <div class="hdr-meta">September 2026 · Dokumen Personal &amp; Rahasia · Update v3</div>
  <div class="hdr-brand">W Watermark PM</div>
  <div class="hdr-sub">Sistem Manajemen Project — panduan penggunaan lengkap</div>
  <div class="hdr-name">${name}</div>
  <div class="hdr-role">${jabatan} · Divisi ${divisi}</div>
  <div class="hdr-lvl">${levelLabel}</div>
</div>
<div class="body">
  <div class="intro">${intro}</div>

  <div class="sec">
    <div class="sec-title">🔐 DATA LOGIN</div>
    <div class="login-box">
      <div class="login-hdr">INFORMASI LOGIN SISTEM</div>
      <table class="ltbl">
        <tr><td>URL</td><td>${APP_URL}</td></tr>
        <tr><td>Email</td><td>${email}</td></tr>
        <tr><td>Password</td><td>${pass}</td></tr>
      </table>
    </div>
    <div class="warn">⚠️ Segera ganti password setelah login: pojok kanan atas → Profil → isi form ganti password. Jangan bagikan dokumen ini.</div>
  </div>

  <div class="sec">
    <div class="sec-title">🚀 CARA LOGIN</div>
    <ol class="steps">
      <li><span>Buka <strong>${APP_URL}</strong> di browser</span></li>
      <li><span>Masukkan email dan password di atas, klik <strong>Masuk</strong></span></li>
      <li><span>Kamu akan diarahkan ke <strong>Dashboard</strong> — mulai check-in pagi dari sini</span></li>
      <li><span>Segera ganti password: pojok kanan atas → Profil → isi form ganti password</span></li>
    </ol>
  </div>

  <hr class="div">

  <div class="sec">
    <div class="sec-title">📅 RUTINITAS HARIAN WAJIB</div>
    <div class="routine-grid">
      <div class="rc">
        <div class="rc-time">Sebelum 08:00</div>
        <div class="rc-title">☀️ Check-In Pagi</div>
        <ul>${(dailyRoutine.morning || []).map(s=>`<li>${s}</li>`).join('')}</ul>
      </div>
      <div class="rc">
        <div class="rc-time">17:00 – 20:00</div>
        <div class="rc-title">🌙 Laporan Progress Sore</div>
        <ul>${(dailyRoutine.evening || []).map(s=>`<li>${s}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="warn" style="margin-top:10px">⚠️ <strong>Penting:</strong> Check-in pagi dan laporan sore dicatat otomatis ke sistem KPI sebagai komponen <strong>Disiplin Harian</strong>. Jika melewati batas waktu, skor absensimu akan terpengaruh. Sistem mengirim notifikasi ke atasanmu jika kamu belum check-in pukul 08:00 WIB.</div>
  </div>

  <hr class="div">

  <div class="sec">
    <div class="sec-title">📋 PANDUAN PENGGUNAAN SISTEM</div>
    <div class="menus">
      ${menus.map(m=>`
      <div class="mc">
        <div class="mc-head">
          <span class="mc-icon">${m.icon}</span>
          <span class="mc-name">${m.name}</span>
          ${m.url?`<span class="mc-url">${m.url}</span>`:''}
        </div>
        <div class="mc-desc">${m.desc}</div>
        ${m.steps&&m.steps.length?`<ul class="mc-steps">${m.steps.map(s=>`<li>${s}</li>`).join('')}</ul>`:''}
      </div>`).join('')}
    </div>
  </div>

  <hr class="div">

  <div class="sec">
    <div class="sec-title">⚡ SIMULASI ALUR KERJA</div>
    ${workflows.map(w=>`
    <div class="wf">
      <div class="wf-title">${w.icon} ${w.title}</div>
      <ol class="wf-steps">
        ${w.steps.map((s,i)=>`<li><div class="wf-num">${i+1}</div><div class="wf-text">${s}</div></li>`).join('')}
      </ol>
      ${w.tip?`<div class="wf-tip">💡 ${w.tip}</div>`:''}
    </div>`).join('')}
  </div>

  <hr class="div">

  <div class="sec">
    <div class="sec-title">⭐ INDIKATOR KPI YANG DINILAI</div>
    <div class="kpi-grid">
      ${kpiIndicators.map(k=>`
      <div class="kc">
        <div class="kc-cat">${k.category}</div>
        <ul>${k.items.map(i=>`<li>${i}</li>`).join('')}</ul>
      </div>`).join('')}
    </div>
  </div>
</div>
<div class="ftr">
  <p>Dokumen ini dibuat khusus untuk <strong>${name}</strong> dan bersifat rahasia. Jangan bagikan ke pihak lain.<br>
  Butuh bantuan atau ada masalah teknis? Hubungi <strong>Bambang Ramdany (Owner/Admin)</strong>.<br>
  Watermark Indonesia · September 2026 · Update v3</p>
</div>
</body></html>`
}

// ── Shared workflow blocks ──────────────────────────────────────────────────
const WF_MORNING = {
  icon:'☀️', title:'ALUR MORNING BRIEFING (Check-In Pagi)',
  steps:[
    'Buka aplikasi sebelum <strong>08:00 WIB</strong> — pastikan sudah ada koneksi internet',
    'Di halaman Dashboard, muncul banner/tombol <strong>"Check-In Pagi"</strong> — klik tombol tersebut',
    'Sistem mencatat timestamp check-in kamu secara otomatis (tidak perlu isi apapun)',
    'Setelah check-in, lanjut review Dashboard: lihat project aktif, cek notifikasi dan task hari ini',
    'Sistem otomatis mengirim notifikasi ke atasanmu jika kamu belum check-in pukul 08:00 WIB',
  ],
  tip:'Check-in pagi dihitung sebagai komponen Absensi dalam akumulasi KPI bulanan. Pastikan check-in SETIAP hari kerja (Senin–Jumat).',
}

const WF_EVENING = {
  icon:'🌙', title:'ALUR LAPORAN PROGRESS SORE / TO-DO LIST',
  steps:[
    'Antara pukul <strong>17:00–20:00 WIB</strong>, buka Dashboard',
    'Klik tombol <strong>"Laporan Sore"</strong> atau <strong>"Progress Hari Ini"</strong> yang muncul di dashboard',
    'Isi ringkasan kegiatan hari ini: apa saja yang sudah dikerjakan dan diselesaikan',
    'Catat <strong>to-do list untuk besok</strong>: task yang pending atau perlu dilanjutkan',
    'Tambahkan catatan khusus jika ada kondisi yang perlu perhatian atasanmu',
    'Klik <strong>Submit Laporan</strong> — data tersimpan dan dicatat ke komponen KPI Disiplin Harian',
    'Laporan sore juga dapat dilihat oleh Owner/atasan sebagai bentuk transparansi harian',
  ],
  tip:'Laporan sore adalah bentuk akuntabilitas harian. Isi dengan jujur dan detail — ini bukan formalitas, tapi tool komunikasi dengan atasan.',
}

const WF_SELF_ASSESS = {
  icon:'⭐', title:'ALUR SELF-ASSESSMENT & PENILAIAN KPI',
  steps:[
    'Buka menu <strong>Scores (Penilaian)</strong> → tab <strong>Penilaian Diri</strong>',
    'Pilih bulan penilaian — biasanya minggu terakhir bulan (deadline tanggal 23)',
    'Nilai dirimu sendiri secara objektif untuk setiap indikator KPI (skala 1–5)',
    'Tambahkan catatan pencapaian bulan ini dan rencana pengembangan diri bulan depan',
    'Klik <strong>Submit Self-Assessment</strong> — data tersimpan',
    'Self-assessment kamu akan dibandingkan dengan penilaian dari atasanmu untuk menghasilkan nilai KPI final',
  ],
  tip:'Skor 1=Sangat Kurang, 2=Kurang, 3=Cukup, 4=Baik, 5=Sangat Baik. Deadline: tanggal 23 setiap bulan. Penilaian kamu dari atasan tidak bisa dilihat sebelum kamu submit self-assessment.',
}

const WF_PR_SUBMIT = {
  icon:'💳', title:'ALUR PENGAJUAN PAYMENT REQUEST',
  steps:[
    'Buka menu <strong>Finance</strong> → klik <strong>+ Ajukan Payment Request</strong>',
    'Pilih <strong>project</strong> yang terkait dengan pengeluaran ini',
    'Pilih <strong>vendor/penerima</strong> dari database, atau isi manual jika belum terdaftar',
    'Isi <strong>deskripsi kebutuhan</strong> secara jelas: untuk apa, kapan digunakan',
    'Input <strong>nominal</strong> dan upload <strong>lampiran</strong> (invoice, kwitansi, atau dokumen pendukung)',
    'Klik <strong>Submit</strong> — PR masuk ke antrian Direktur Divisimu untuk approval tahap 1',
    'Pantau status PR di tab <strong>Riwayat Pengajuan</strong> — kamu akan dapat notifikasi jika disetujui atau ditolak',
    'Jika ditolak: baca catatan penolakan, perbaiki, lalu ajukan ulang',
  ],
  tip:'Alur payment: kamu ajukan → Direktur Divisi approve → Direktur Finance (Anung) approve → Finance Staff tandai lunas. Pastikan lampiran lengkap agar tidak ditolak.',
}

const WF_PR_DIR1 = {
  icon:'✅', title:'ALUR APPROVAL PAYMENT REQUEST (Persetujuan Tahap 1 — Direktur Divisi)',
  steps:[
    '<strong>Notifikasi masuk</strong>: kamu menerima notif di Dashboard — "Ada Payment Request menunggu persetujuanmu"',
    'Buka menu <strong>Finance → tab Perlu Ditindaki</strong> — lihat daftar PR berstatus "Menunggu Direktur"',
    'Klik PR → review detail: nama vendor, deskripsi kebutuhan, nominal, dan lampiran',
    'Jika setuju: klik <strong>Setujui</strong> → PR berubah status dan naik ke Direktur Finance (Anung) untuk approval tahap 2',
    'Jika tidak setuju: klik <strong>Tolak</strong> → isi alasan penolakan → notifikasi otomatis dikirim ke pengaju',
    'Pantau PR yang sudah kamu approve di tab <strong>Sudah Ditindaki</strong>',
  ],
  tip:'Target SLA: tindak lanjuti PR dalam 1×24 jam setelah masuk. PR yang sudah disetujui tahap 1 akan diteruskan otomatis ke Direktur Finance.',
}

const WF_PR_DIR2 = {
  icon:'💳', title:'ALUR APPROVAL PAYMENT REQUEST (Persetujuan Tahap 2 — Direktur Finance)',
  steps:[
    '<strong>Notifikasi masuk</strong>: PR yang sudah disetujui Direktur Divisi masuk ke antrian kamu',
    'Buka <strong>Finance → tab Perlu Ditindaki</strong> — lihat PR berstatus "Menunggu Direktur Finance"',
    'Klik PR → review detail dan pastikan PR sudah disetujui Direktur Divisi (tertera di riwayat)',
    'Jika setuju: klik <strong>Setujui</strong> → status berubah "Disetujui Direktur Finance" → masuk antrian Finance Staff',
    'Jika tidak setuju: klik <strong>Tolak</strong> → isi alasan → notifikasi dikirim ke pengaju dan Direktur Divisi',
    'Finance Staff akan memproses transfer dan menandai PR sebagai PAID',
  ],
  tip:'Target SLA: dalam 1×24 jam setelah PR masuk. PR tidak boleh menunggu lebih dari 1 hari kerja di antrian kamu.',
}

const WF_SCORE_TEAM = (teamDesc) => ({
  icon:'📊', title:'ALUR PENILAIAN KPI TIM',
  steps:[
    'Buka menu <strong>Scores (Penilaian)</strong> → tab <strong>Nilai Tim</strong>',
    'Pilih bulan penilaian — deadline tanggal 23 setiap bulan',
    `Pilih karyawan yang akan dinilai: ${teamDesc}`,
    'Isi setiap indikator KPI (skala 1–5): Kecepatan Respons, Ketepatan Waktu, Kualitas Kerja, Tanggung Jawab, Kolaborasi',
    'Tambahkan catatan pendukung untuk setiap karyawan — feedback yang spesifik lebih berguna',
    'Klik <strong>Simpan Nilai</strong> untuk setiap karyawan yang dinilai',
    'Setelah selesai menilai tim, isi juga self-assessment kamu sendiri di tab <strong>Penilaian Diri</strong>',
  ],
  tip:'Nilai yang kamu berikan akan diakumulasikan dengan evaluasi HRD (dari Anung) dan disiplin harian (otomatis). Deadline: tanggal 23.',
})

// ── PEOPLE DATA ──────────────────────────────────────────────────────────────
const PEOPLE = [

  // ── 1. BAMBANG — Owner ───────────────────────────────────────────────────
  {
    slug:'bambang',
    name:'Bambang Ramdany',
    email:'bambang@watermark.co.id',
    jabatan:'Owner / Direktur Utama',
    divisi:'Semua Divisi',
    levelLabel:'Owner',
    accent:'#1E40AF', accentLight:'#DBEAFE', accentText:'#1E3A8A',
    intro:'Sebagai Owner, kamu memiliki akses penuh ke seluruh sistem — semua project, semua divisi, semua laporan keuangan, dan semua data karyawan. Kamu adalah approver akhir untuk kebijakan sistem, dan kamu memiliki akses <strong>impersonasi</strong> untuk login sebagai user lain guna testing atau troubleshooting. Kamu juga menilai KPI semua Direktur dan karyawan yang tidak dinilai Direktur Divisi.',
    dailyRoutine:{
      morning:['Buka Dashboard','Cek status seluruh divisi dan project aktif','Review notifikasi penting yang masuk','Pantau check-in pagi tim'],
      evening:['Buka Dashboard → Laporan Sore','Isi ringkasan keputusan dan kegiatan hari ini','Catat agenda prioritas untuk esok hari','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Pantau status seluruh perusahaan — project, finance, tim, dan notifikasi.',steps:['Lihat ringkasan semua project aktif dari semua divisi','Alert PR yang menunggu, task overdue, dan anomali keuangan','Check-in pagi dan laporan sore harian']},
      {icon:'📁',name:'Projects',url:'/projects',desc:'Akses dan kelola semua project dari semua divisi.',steps:['Buat, edit, dan pantau project di seluruh divisi','Review profitabilitas, timeline, vendor, dan task','Akses tab Penilaian Tim untuk setiap project']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan aktivitas harianmu sendiri.',steps:['Lihat task yang di-assign kepadamu','Pantau progress dan update status task']},
      {icon:'👥',name:'Klien',url:'/clients',desc:'Database klien perusahaan.',steps:['Lihat dan kelola semua data klien','Riwayat project per klien']},
      {icon:'🤝',name:'Vendor',url:'/vendors',desc:'Database vendor perusahaan.',steps:['Lihat semua vendor, tier, dan rating','Pantau kinerja vendor lintas project']},
      {icon:'💰',name:'Finance',url:'/finance',desc:'Monitoring penuh seluruh keuangan perusahaan.',steps:['Pantau semua PR dari semua divisi','Akses laporan P&L, cashflow, opex, piutang, hutang','Monitoring payment yang sudah diproses']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Nilai KPI semua karyawan dan pantau akumulasi.',steps:['Nilai semua Direktur dan karyawan yang tidak punya atasan langsung di sistem','Tab Akumulasi: pantau nilai tertimbang akhir semua karyawan','Isi self-assessment kamu sendiri']},
      {icon:'📜',name:'SOP & Peraturan',url:'/peraturan',desc:'Kelola dan baca seluruh SOP perusahaan.',steps:['Akses seluruh SOP dari semua divisi','Section H: ketentuan PIP, SP, dan PHK']},
      {icon:'📢',name:'Pengumuman & HR',url:'/hr/announcements',desc:'Buat pengumuman dan surat pembinaan.',steps:['Buat pengumuman untuk semua karyawan atau personal','Buat surat pembinaan: Teguran Lisan, PIP, SP-1 hingga SP-3']},
      {icon:'👥',name:'Input HRD',url:'/hrd/evaluations',desc:'Input evaluasi HRD bulanan semua karyawan.',steps:['Evaluasi Attitude Score dan Skill Score per karyawan','Tambah catatan evaluasi dan skill activities']},
      {icon:'⚙️',name:'Pengaturan',url:'/settings',desc:'Pengaturan sistem dan audit log.',steps:['Lihat Audit Log: semua aktivitas sistem','Kelola user, impersonasi untuk testing']},
    ],
    workflows:[
      WF_MORNING,
      WF_EVENING,
      WF_SELF_ASSESS,
      WF_SCORE_TEAM('semua karyawan — terutama Direktur dan karyawan yang tidak punya atasan langsung di sistem'),
      {icon:'🔍',title:'ALUR IMPERSONASI (Login sebagai User Lain)',steps:[
        'Buka menu <strong>Pengaturan / Settings</strong>',
        'Cari fitur <strong>Impersonasi</strong> atau "Login sebagai..."',
        'Pilih user yang ingin kamu akses',
        'Kamu akan masuk ke sistem dengan tampilan persis seperti user tersebut melihatnya',
        'Gunakan untuk testing, troubleshooting, atau membantu user yang kesulitan',
        'Klik <strong>Keluar Impersonasi</strong> atau tombol serupa untuk kembali ke akunmu sendiri',
      ],tip:'Impersonasi adalah fitur admin. Gunakan hanya untuk keperluan teknis, testing fitur, atau membantu user. Semua aktivitas dalam mode impersonasi tercatat di Audit Log.'},
    ],
    kpiIndicators:[
      {category:'Kepemimpinan',items:['Ketepatan Keputusan Strategis','Arahan & Visi Perusahaan','Pengembangan Kompetensi Tim']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 2. ANUNG — Direktur Finance & HRGA ───────────────────────────────────
  {
    slug:'anung',
    name:'Anung Anindita Atmaja',
    email:'anung@watermark.co.id',
    jabatan:'Direktur Finance & HRGA',
    divisi:'FINANCE_HRGA',
    levelLabel:'Direktur Finance',
    accent:'#7C3AED', accentLight:'#EDE9FE', accentText:'#4C1D95',
    intro:'Sebagai Direktur Finance & HRGA, kamu memegang dua peran strategis: <strong>final approver pembayaran seluruh perusahaan</strong> dan <strong>pengawas evaluasi SDM</strong>. Setiap pengajuan pembayaran dari semua divisi wajib melewati persetujuanmu setelah disetujui Direktur Divisi masing-masing. Kamu juga memiliki akses penuh ke seluruh data keuangan (P&L, cashflow, opex) dan dapat menginput evaluasi HRD bulanan untuk semua karyawan.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik tombol "Check-In Pagi"','Cek notifikasi PR yang masuk semalam','Review status project aktif dan alert keuangan'],
      evening:['Buka Dashboard → tombol "Laporan Sore"','Isi ringkasan PR yang sudah diproses','Catat PR yang pending untuk besok','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Pusat informasi utama kamu setiap hari.',steps:['Lihat ringkasan project aktif di seluruh divisi perusahaan','Notifikasi pengajuan pembayaran yang menunggu persetujuanmu','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📁',name:'Projects',url:'/projects',desc:'Pantau semua project dari seluruh divisi.',steps:['Akses semua project dari semua divisi','Tab Profitabilitas: pantau margin dan realisasi budget','Validasi alur keuangan project']},
      {icon:'💰',name:'Finance',url:'/finance',desc:'Menu utamamu sebagai Finance Director.',steps:['Tab <strong>Perlu Ditindaki</strong>: PR yang sudah disetujui Direktur Divisi dan menunggu persetujuanmu','Klik PR → review detail, nominal, dan attachment → <strong>Setujui</strong> atau <strong>Tolak</strong>','Akses penuh laporan P&L, cashflow, opex, piutang, dan hutang perusahaan','Tab <strong>Tandai Lunas</strong>: pantau progress eksekusi pembayaran oleh Finance Staff']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Nilai dan pantau performa tim FINANCE_HRGA.',steps:['Tab <strong>Nilai Tim</strong>: nilai Antoni, Henri, Sutrisna, Bima','Tab <strong>Akumulasi</strong>: pantau nilai tertimbang akhir seluruh karyawan perusahaan','Isi self-assessment kamu sendiri di tab Penilaian Diri (deadline tanggal 23)']},
      {icon:'📜',name:'SOP & Peraturan',url:'/peraturan',desc:'Baca dan pahami seluruh SOP.',steps:['Baca seluruh SOP — kamu adalah narasumber SOP keuangan dan kepegawaian','<span style="color:#dc2626;font-weight:700">BARU</span> Section H: PIP → SP-1 → SP-2 → SP-3 → PHK, dasar hukum UU No.6/2023','Pahami hak karyawan sebelum proses pembinaan dijalankan']},
      {icon:'📢',name:'Pengumuman & HR',url:'/hr/announcements',desc:'Kelola pengumuman dan surat pembinaan.',steps:['Tab Pengumuman: buat pengumuman untuk semua atau personal — Info, Reminder, Peringatan, Event, Libur','Tab Surat Pembinaan: buat Teguran Lisan, PIP, SP-1, SP-2, atau SP-3','Pantau siapa yang sudah membaca pengumuman','Karyawan wajib konfirmasi digital — tersimpan sebagai bukti legal']},
      {icon:'👥',name:'Input HRD',url:'/hrd/evaluations',desc:'Input evaluasi HRD bulanan untuk semua karyawan.',steps:['Pilih bulan dan karyawan yang dievaluasi','Isi Attitude Score (1-5) dan Skill Score (1-5)','Tambah catatan dan skill activities','Deadline: tanggal 23 bersamaan dengan deadline KPI']},
      {icon:'⚙️',name:'Pengaturan',url:'/settings',desc:'Audit log sistem.',steps:['Lihat Audit Log: riwayat seluruh aktivitas sistem']},
    ],
    workflows:[
      WF_MORNING,
      WF_EVENING,
      WF_PR_DIR2,
      {icon:'📊',title:'ALUR INPUT EVALUASI HRD BULANAN',steps:[
        'Akses menu <strong>Input HRD</strong> di navbar',
        'Pilih <strong>bulan evaluasi</strong> — biasanya minggu terakhir bulan (deadline tanggal 23)',
        'Pilih <strong>karyawan</strong> yang akan dievaluasi dari dropdown',
        'Isi <strong>Attitude Score</strong> (1–5): penilaian sikap kerja, komunikasi, dan profesionalisme',
        'Isi <strong>Skill Score</strong> (1–5): penilaian kompetensi teknis dan perkembangan skill',
        'Tambahkan <strong>catatan naratif</strong>: apa yang baik, apa yang perlu diperbaiki',
        'Klik <strong>Simpan Evaluasi</strong> → data masuk ke akumulasi skor bulan tersebut',
        'Ulangi untuk semua karyawan yang perlu dievaluasi',
      ],tip:'Evaluasi HRD masuk ke komponen akumulasi: Attitude (15%) dan Skill (10%). Skor 1=Sangat Kurang, 5=Sangat Baik.'},
      WF_SCORE_TEAM('Antoni, Henri, Sutrisna, Bima'),
      WF_SELF_ASSESS,
    ],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Kecepatan Respons & Komunikasi','Ketepatan Waktu Eksekusi','Kualitas Kerja & Ketelitian','Tanggung Jawab & Inisiatif']},
      {category:'Kepemimpinan',items:['Ketepatan Keputusan Financial','Arahan & Delegasi ke Tim','Pengembangan Kompetensi Tim']},
      {category:'Spesifik Finance Director',items:['Approval PR dalam 1×24 jam','Akurasi laporan keuangan','Evaluasi HRD selesai tanggal 23']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB','Kehadiran hari kerja']},
    ],
  },

  // ── 3. GUNADARMA — Direktur PH ───────────────────────────────────────────
  {
    slug:'gunadarma',
    name:'Gunadarma',
    email:'gunadarma@watermark.co.id',
    jabatan:'Direktur PH & Producer',
    divisi:'PH',
    levelLabel:'Direktur PH',
    accent:'#7C3AED', accentLight:'#EDE9FE', accentText:'#4C1D95',
    intro:'Kamu adalah penanggung jawab utama seluruh divisi Production House — mulai dari quotation, project lead, <strong>approval Payment Request tahap pertama</strong>, hingga pengawasan dan penilaian kinerja tim PH (Bastya dan Jamal). Setiap PR dari divisi PH harus kamu setujui terlebih dahulu sebelum naik ke Direktur Finance.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek notifikasi PR dari tim PH','Review status project PH aktif'],
      evening:['Buka Dashboard → Laporan Sore','Isi ringkasan kegiatan project PH hari ini','Catat PR yang perlu ditindaklanjuti','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan semua project PH aktif dan notifikasi.',steps:['Pantau project PH aktif dan alert task overdue','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📁',name:'Projects',url:'/projects',desc:'Buat dan kelola project PH.',steps:['Buat project baru: isi nama, klien, tanggal, divisi PH','Buat Quotation di tab Quotation → isi RAB → mark WON setelah deal','Tab Tim: tambah Bastya dan/atau Jamal ke project','Tab Task: buat task untuk masing-masing anggota dengan deadline jelas','Tab Profitabilitas: pantau margin dan realisasi budget project PH']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harianmu sebagai Producer.',steps:['Lihat task yang di-assign kepadamu','Update status task dan progress harian']},
      {icon:'👥',name:'Klien',url:'/clients',desc:'Input dan kelola data klien PH.',steps:['+ Tambah Klien: isi nama perusahaan, PIC, kontak, alamat','Lihat riwayat project per klien']},
      {icon:'🤝',name:'Vendor',url:'/vendors',desc:'Database vendor dan penilaian.',steps:['Lihat database vendor dan tier','Beri rating vendor setelah project selesai: kualitas, ketepatan waktu, nilai']},
      {icon:'💰',name:'Finance',url:'/finance',desc:'Approval PR tahap 1 untuk project PH.',steps:['Tab <strong>Perlu Ditindaki</strong>: review PR dari Bastya dan Jamal','<strong>Setujui</strong> atau <strong>Tolak</strong> PR — yang disetujui naik ke Anung (Direktur Finance)','Pantau status pembayaran project PH']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Nilai Bastya dan Jamal + self-assessment.',steps:['Tab Nilai Tim: nilai Bastya dan Jamal setiap bulan (deadline tanggal 23)','Tab Penilaian Diri: isi self-assessment kamu sendiri']},
    ],
    workflows:[
      WF_MORNING,
      WF_EVENING,
      {icon:'📁',title:'ALUR MEMBUAT PROJECT & QUOTATION PH',steps:[
        'Klien → <strong>+ Tambah Klien</strong> → isi nama perusahaan, PIC, dan kontak → Simpan',
        'Projects → <strong>+ Project Baru</strong> → isi nama project, pilih klien, tanggal, pilih divisi PH → Simpan',
        'Di halaman project → tab <strong>Quotation</strong> → <strong>+ Buat Quotation</strong> → isi RAB (item, unit, harga)',
        'Setelah deal dengan klien: ubah status quotation menjadi <strong>WON</strong>',
        'Tab <strong>Tim</strong> → tambah Bastya dan/atau Jamal ke project → assign peran masing-masing',
        'Tab <strong>Task</strong> → <strong>+ Buat Task</strong> → isi nama task, assign ke anggota, set deadline → Simpan',
        'Monitor progress di tab <strong>Timeline</strong> — update task jika ada perubahan jadwal',
      ],tip:'Quotation yang sudah WON menjadi dasar anggaran project. Pastikan RAB detail dan realistis sebelum di-approve.'},
      WF_PR_DIR1,
      WF_SCORE_TEAM('Bastya dan Jamal'),
      WF_SELF_ASSESS,
    ],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Kecepatan Respons & Komunikasi','Ketepatan Waktu','Kualitas Kerja','Tanggung Jawab & Inisiatif']},
      {category:'Kepemimpinan',items:['Ketepatan Keputusan','Arahan & Delegasi','Pengembangan Tim PH']},
      {category:'Spesifik Direktur',items:['Approval PR tepat waktu','Kesehatan pipeline project PH','Utilisasi tim PH']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 4. DAVID — Direktur Event ────────────────────────────────────────────
  {
    slug:'david-setyawan',
    name:'David Setyawan',
    email:'david@watermark.co.id',
    jabatan:'Direktur Event',
    divisi:'EVENT',
    levelLabel:'Direktur Event',
    accent:'#0F766E', accentLight:'#CCFBF1', accentText:'#134E4A',
    intro:'Kamu adalah penanggung jawab utama divisi Event — final review quotation (setelah dicek Wulan), pengawasan kinerja tim, dan <strong>approval Payment Request tahap pertama</strong> untuk semua project Event sebelum naik ke Direktur Finance (Anung).',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek PR masuk dari tim Event','Review status project Event aktif'],
      evening:['Buka Dashboard → Laporan Sore','Isi ringkasan kegiatan Event hari ini','Catat PR dan agenda esok','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan semua project Event aktif.',steps:['Pantau project Event aktif dan notifikasi PR','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📁',name:'Projects',url:'/projects',desc:'Review dan pantau project Event.',steps:['Review quotation yang sudah dicek Wulan','Pantau timeline, task, dan vendor AVL project Event','Tab Profitabilitas: pantau margin project divisi Event']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task dan progress']},
      {icon:'💰',name:'Finance',url:'/finance',desc:'Approval PR tahap 1 untuk project Event.',steps:['Tab <strong>Perlu Ditindaki</strong>: review PR dari tim Event (Wulan, Irham, Doddi, Reghy, Putra, Eca)','<strong>Setujui</strong> atau <strong>Tolak</strong> PR dengan keterangan → yang disetujui naik ke Anung','Pantau status pembayaran project Event']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Nilai tim Event dan self-assessment.',steps:['Tab Nilai Tim: nilai semua anggota divisi Event setiap bulan (deadline tanggal 23)','Koordinasikan dengan Wulan yang juga memiliki kewenangan menilai tim Event + Creative','Tab Penilaian Diri: isi self-assessment kamu sendiri']},
    ],
    workflows:[
      WF_MORNING,
      WF_EVENING,
      WF_PR_DIR1,
      WF_SCORE_TEAM('Wulan, Irham, Doddi, Reghy, Putra, Eca, Sultan, Boni — koordinasikan dengan Wulan yang juga menilai tim Event+Creative'),
      WF_SELF_ASSESS,
    ],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Kecepatan Respons & Komunikasi','Ketepatan Waktu','Kualitas Kerja','Tanggung Jawab & Inisiatif']},
      {category:'Kepemimpinan',items:['Ketepatan Keputusan','Arahan & Delegasi','Pengembangan Tim Event']},
      {category:'Spesifik Direktur',items:['Approval PR tepat waktu','Kesehatan pipeline Event','Utilisasi tim Event']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 5. FAKHRIL — Direktur Creative ──────────────────────────────────────
  {
    slug:'fakhril-islamy',
    name:'M. Fakhril Islamy',
    email:'fakhril@watermark.co.id',
    jabatan:'Direktur Creative',
    divisi:'CREATIVE',
    levelLabel:'Direktur Creative',
    accent:'#D97706', accentLight:'#FEF3C7', accentText:'#92400E',
    intro:'Kamu adalah penanggung jawab divisi Creative — mendukung project Event dan PH dengan output kreatif, mengawasi kinerja tim, dan menjadi <strong>approver Payment Request tahap pertama</strong> untuk kebutuhan Creative sebelum naik ke Direktur Finance (Anung).',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek PR dari tim Creative','Review brief creative yang masuk'],
      evening:['Buka Dashboard → Laporan Sore','Isi ringkasan output kreatif hari ini','Catat brief dan deadline yang pending','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan project yang melibatkan tim Creative.',steps:['Pantau project yang melibatkan Creative dan notifikasi PR','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📁',name:'Projects',url:'/projects',desc:'Lihat project tempat tim Creative dilibatkan.',steps:['Lihat brief, task, dan deadline Creative di setiap project','Buat atau assign task kreatif: Projects → pilih project → + Task → pilih anggota Creative','Workload Tim: cek distribusi beban kerja Kres, Saffira, Kukuh, Noval']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task']},
      {icon:'💰',name:'Finance',url:'/finance',desc:'Approval PR tahap 1 untuk kebutuhan Creative.',steps:['Tab <strong>Perlu Ditindaki</strong>: review PR dari tim Creative','<strong>Setujui</strong> atau <strong>Tolak</strong> PR → yang disetujui naik ke Anung (Direktur Finance)']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Nilai tim Creative dan self-assessment.',steps:['Tab Nilai Tim: nilai Kres, Saffira, Kukuh, Noval setiap bulan (deadline tanggal 23)','Catatan: Wulan (Event) juga memiliki kewenangan menilai tim Creative','Tab Penilaian Diri: isi self-assessment kamu sendiri']},
    ],
    workflows:[
      WF_MORNING,
      WF_EVENING,
      WF_PR_DIR1,
      WF_SCORE_TEAM('Kres, Saffira, Kukuh, Noval — catatan: Wulan juga memiliki kewenangan menilai tim Creative'),
      WF_SELF_ASSESS,
    ],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Kecepatan Respons & Komunikasi','Ketepatan Waktu','Kualitas Output Kreatif','Tanggung Jawab & Inisiatif']},
      {category:'Kepemimpinan',items:['Ketepatan Keputusan Kreatif','Arahan & Delegasi','Pengembangan Tim Creative']},
      {category:'Spesifik Direktur',items:['Approval PR tepat waktu','Utilisasi tim Creative']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 6. WULAN — PM Event (dengan kewenangan Quotation & Scoring) ──────────
  {
    slug:'wulan',
    name:'Wulan',
    email:'wulan@watermark.co.id',
    jabatan:'Project Manager Event',
    divisi:'EVENT',
    levelLabel:'Project Manager',
    accent:'#0F766E', accentLight:'#CCFBF1', accentText:'#134E4A',
    intro:'Sebagai Project Manager senior Event, kamu memiliki kewenangan khusus: <strong>membuat quotation</strong> untuk project Event, dan <strong>menilai tim Event + Creative</strong>. Kamu juga dapat mengajukan Payment Request untuk kebutuhan project. Quotation yang kamu buat akan diteruskan ke David (Direktur Event) untuk final approval.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek briefing project aktif dan task hari ini','Review status task tim'],
      evening:['Buka Dashboard → Laporan Sore','Isi update progress project yang kamu pegang','Catat task yang pending untuk besok','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan project yang kamu kelola.',steps:['Pantau project Event yang kamu pegang','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📁',name:'Projects',url:'/projects',desc:'Kelola project dan buat quotation.',steps:['Lihat semua project Event','Buat Quotation: project → tab Quotation → + Buat Quotation → isi RAB → submit ke David untuk review','Assign task, pantau timeline, kelola vendor AVL','Beri rating vendor setelah project selesai']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task dan progress harian']},
      {icon:'💰',name:'Finance',url:'/finance',desc:'Ajukan Payment Request untuk project Event.',steps:['+ Ajukan PR: pilih project, vendor, isi nominal dan deskripsi, upload lampiran','Pantau status PR yang sudah kamu ajukan','PR akan disetujui David (tahap 1) lalu Anung (tahap 2)']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Nilai tim Event + Creative, dan self-assessment.',steps:['Tab Nilai Tim: kamu memiliki kewenangan menilai tim Event (Irham, Doddi, Reghy, Putra, Eca, Sultan, Boni) DAN tim Creative (Kres, Saffira, Kukuh, Noval)','Tab Penilaian Diri: isi self-assessment kamu (deadline tanggal 23)']},
    ],
    workflows:[
      WF_MORNING,
      WF_EVENING,
      {icon:'📝',title:'ALUR MEMBUAT QUOTATION PROJECT EVENT',steps:[
        'Buka menu <strong>Projects</strong> → pilih atau buat project baru',
        'Di halaman project → tab <strong>Quotation</strong> → klik <strong>+ Buat Quotation</strong>',
        'Isi RAB: tambah item-item biaya (venue, catering, dekorasi, dll.) dengan unit dan harga',
        'Review total RAB — pastikan margin sesuai target perusahaan',
        'Submit quotation → David (Direktur Event) akan mereview dan memberikan final approval',
        'Setelah David approve dan klien deal: ubah status quotation menjadi <strong>WON</strong>',
        'Quotation WON menjadi dasar anggaran resmi project',
      ],tip:'Buat quotation dengan detail yang cukup agar mudah di-review. Jangan lupa update jika ada perubahan scope dengan klien.'},
      WF_PR_SUBMIT,
      WF_SCORE_TEAM('tim Event (Irham, Doddi, Reghy, Putra, Eca, Sultan, Boni) DAN tim Creative (Kres, Saffira, Kukuh, Noval)'),
      WF_SELF_ASSESS,
    ],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Kecepatan Respons & Komunikasi','Ketepatan Waktu Delivery','Kualitas Output PM','Tanggung Jawab & Inisiatif']},
      {category:'Kerja Tim',items:['Kolaborasi Tim','Koordinasi Lintas Divisi']},
      {category:'Spesifik PM',items:['Kualitas quotation yang dibuat','Ketepatan anggaran vs realisasi']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 7. IRHAM — PM Event ──────────────────────────────────────────────────
  {
    slug:'irham',
    name:'Irham',
    email:'irham@watermark.co.id',
    jabatan:'Project Manager Event',
    divisi:'EVENT',
    levelLabel:'Project Manager',
    accent:'#0F766E', accentLight:'#CCFBF1', accentText:'#134E4A',
    intro:'Sebagai Project Manager Event, kamu bertanggung jawab mengelola project Event dari perencanaan hingga eksekusi — assign tim, buat task, pantau progress, dan ajukan pembayaran. Kamu juga mengisi self-assessment bulanan sebagai bagian dari KPI.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek task hari ini dan briefing project','Review update tim'],
      evening:['Buka Dashboard → Laporan Sore','Isi update progress project','Catat task pending untuk besok','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan project yang kamu kelola.',steps:['Pantau project Event aktif','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📁',name:'Projects',url:'/projects',desc:'Kelola project Event.',steps:['Pantau project yang kamu manage: timeline, task, vendor','Assign task ke tim, update progress','Vendor AVL: kelola shortlist vendor di project']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task dan progress']},
      {icon:'💰',name:'Finance',url:'/finance',desc:'Ajukan Payment Request.',steps:['+ Ajukan PR: pilih project, vendor, isi nominal dan deskripsi, upload lampiran','Pantau status PR — disetujui David (tahap 1) lalu Anung (tahap 2)']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment bulanan (deadline tanggal 23)','Kamu dinilai oleh David (Direktur Event)']},
    ],
    workflows:[
      WF_MORNING,
      WF_EVENING,
      WF_PR_SUBMIT,
      WF_SELF_ASSESS,
    ],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Kecepatan Respons & Komunikasi','Ketepatan Waktu','Kualitas Output PM','Tanggung Jawab & Inisiatif']},
      {category:'Kerja Tim',items:['Kolaborasi Tim','Koordinasi dengan Wulan dan tim Event']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 8. BASTYA — PM PH ────────────────────────────────────────────────────
  {
    slug:'bastya',
    name:'Bastya',
    email:'bastya@watermark.co.id',
    jabatan:'Project Manager PH',
    divisi:'PH',
    levelLabel:'Project Manager',
    accent:'#7C3AED', accentLight:'#EDE9FE', accentText:'#4C1D95',
    intro:'Sebagai Project Manager Production House, kamu bertanggung jawab mengelola project PH — dari brief klien, assign tim, buat task, hingga ajukan pembayaran. Laporan harianmu ke Gunadarma (Direktur PH).',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek task hari ini dan brief project PH','Review update tim PH'],
      evening:['Buka Dashboard → Laporan Sore','Isi update progress project PH','Catat task pending','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan project PH yang kamu kelola.',steps:['Pantau project PH aktif','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📁',name:'Projects',url:'/projects',desc:'Kelola project PH.',steps:['Pantau project PH: timeline, task, vendor','Assign task ke Jamal, update progress','Vendor AVL: kelola vendor yang digunakan']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task dan progress']},
      {icon:'💰',name:'Finance',url:'/finance',desc:'Ajukan Payment Request.',steps:['+ Ajukan PR: pilih project, vendor, isi nominal, upload lampiran','Pantau status PR — disetujui Gunadarma (tahap 1) lalu Anung (tahap 2)']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment bulanan (deadline tanggal 23)','Kamu dinilai oleh Gunadarma (Direktur PH)']},
    ],
    workflows:[
      WF_MORNING,
      WF_EVENING,
      WF_PR_SUBMIT,
      WF_SELF_ASSESS,
    ],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Kecepatan Respons & Komunikasi','Ketepatan Waktu','Kualitas Output PH','Tanggung Jawab & Inisiatif']},
      {category:'Kerja Tim',items:['Kolaborasi Tim PH','Koordinasi dengan Gunadarma']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 9. ANTONI — Finance Staff ────────────────────────────────────────────
  {
    slug:'antoni',
    name:'Antoni',
    email:'antoni@watermark.co.id',
    jabatan:'Finance & HRGA Staff',
    divisi:'FINANCE_HRGA',
    levelLabel:'Finance Staff',
    accent:'#7C3AED', accentLight:'#EDE9FE', accentText:'#4C1D95',
    intro:'Sebagai Finance Staff, kamu bertugas memproses pembayaran aktual setelah PR disetujui Direktur Finance — transfer dana ke vendor dan <strong>tandai pembayaran sebagai PAID</strong>. Kamu juga mengelola data keuangan operasional harian.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek PR yang sudah disetujui dan perlu dieksekusi','Siapkan dokumen transfer yang diperlukan'],
      evening:['Buka Dashboard → Laporan Sore','Isi update pembayaran yang sudah diproses hari ini','Catat yang masih pending','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan kegiatan finance harian.',steps:['Cek notifikasi PR yang sudah disetujui dan perlu dieksekusi','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'💰',name:'Finance',url:'/finance',desc:'Proses pembayaran dan tandai lunas.',steps:['Lihat daftar PR yang sudah disetujui Direktur Finance (Anung)','Eksekusi transfer ke vendor sesuai nominal yang disetujui','Tandai PR sebagai <strong>PAID</strong>: klik PR → upload bukti transfer → isi tanggal realisasi → Tandai Lunas','Pantau riwayat pembayaran yang sudah diproses']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment (deadline tanggal 23)','Kamu dinilai oleh Anung (Direktur Finance & HRGA)']},
    ],
    workflows:[
      WF_MORNING,
      WF_EVENING,
      {icon:'💸',title:'ALUR TANDAI PEMBAYARAN (PAID)',steps:[
        'Buka menu <strong>Finance</strong> — cari PR berstatus "Disetujui Direktur Finance"',
        'Klik PR → periksa detail: nama vendor, nominal, rekening tujuan',
        'Lakukan transfer via internet banking / transfer fisik sesuai nominal PR',
        'Kembali ke sistem → klik tombol <strong>Tandai Lunas / Mark as Paid</strong>',
        'Upload <strong>bukti transfer</strong> (screenshot/foto struk)',
        'Isi <strong>tanggal realisasi pembayaran</strong>',
        'Klik <strong>Konfirmasi</strong> → status PR berubah menjadi PAID',
        'Pengaju dan Direktur mendapat notifikasi otomatis bahwa pembayaran sudah dieksekusi',
      ],tip:'Pastikan nomor rekening tujuan sesuai dengan yang tercantum di PR sebelum melakukan transfer. Upload bukti transfer segera setelah transfer selesai.'},
      WF_SELF_ASSESS,
    ],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Kecepatan Eksekusi Pembayaran','Ketelitian dalam Verifikasi','Kerapian Dokumentasi','Tanggung Jawab']},
      {category:'Kerja Tim',items:['Kolaborasi dengan tim Finance','Responsif terhadap pengaju PR']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 10. BIMA — Finance & HRD ─────────────────────────────────────────────
  {
    slug:'bima',
    name:'Bima',
    email:'bima@watermark.co.id',
    jabatan:'Finance & HRD Staff',
    divisi:'FINANCE_HRGA',
    levelLabel:'Finance & HRD',
    accent:'#7C3AED', accentLight:'#EDE9FE', accentText:'#4C1D95',
    intro:'Sebagai Finance & HRD Staff, kamu membantu operasional keuangan dan administrasi SDM — memproses pembayaran yang sudah disetujui dan mendukung kegiatan HRD di bawah koordinasi Anung (Direktur Finance & HRGA).',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek PR yang perlu diproses','Cek agenda HRD hari ini'],
      evening:['Buka Dashboard → Laporan Sore','Isi update kegiatan finance dan HRD hari ini','Catat yang pending','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan kegiatan harian.',steps:['Cek notifikasi dan PR yang perlu dieksekusi','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'💰',name:'Finance',url:'/finance',desc:'Proses pembayaran dan tandai lunas.',steps:['Lihat PR yang sudah disetujui Direktur Finance','Eksekusi transfer dan tandai PAID: upload bukti transfer, isi tanggal realisasi']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment (deadline tanggal 23)','Kamu dinilai oleh Anung (Direktur Finance & HRGA)']},
    ],
    workflows:[
      WF_MORNING,
      WF_EVENING,
      {icon:'💸',title:'ALUR TANDAI PEMBAYARAN (PAID)',steps:[
        'Buka menu <strong>Finance</strong> — cari PR berstatus "Disetujui Direktur Finance"',
        'Klik PR → periksa detail: nama vendor, nominal, rekening tujuan',
        'Lakukan transfer sesuai nominal PR',
        'Di sistem: klik <strong>Tandai Lunas</strong> → upload bukti transfer → isi tanggal realisasi → Konfirmasi',
        'Status PR berubah PAID — pengaju dan Direktur mendapat notifikasi otomatis',
      ],tip:'Pastikan bukti transfer diupload segera setelah pembayaran dilakukan untuk kelengkapan dokumen.'},
      WF_SELF_ASSESS,
    ],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Ketepatan Waktu','Ketelitian','Kualitas Kerja','Tanggung Jawab']},
      {category:'Kerja Tim',items:['Kolaborasi Finance & HRD','Responsif terhadap kebutuhan tim']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 11. HENRI — GA & Driver ──────────────────────────────────────────────
  {
    slug:'henri',
    name:'Henri',
    email:'henri@watermark.co.id',
    jabatan:'General Affairs & Driver Kantor',
    divisi:'FINANCE_HRGA',
    levelLabel:'General Affairs',
    accent:'#64748b', accentLight:'#F1F5F9', accentText:'#334155',
    intro:'Sebagai General Affairs & Driver Kantor, kamu bertugas mendukung operasional harian perusahaan — mengurus kebutuhan kantor, logistik, dan kebutuhan mobilitas tim. Kamu mengisi check-in pagi dan laporan sore setiap hari, serta self-assessment bulanan.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek task GA dan agenda hari ini'],
      evening:['Buka Dashboard → Laporan Sore','Isi ringkasan kegiatan GA hari ini','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan kegiatan harianmu.',steps:['Cek notifikasi dan task hari ini','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task setelah selesai']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment (deadline tanggal 23)','Kamu dinilai oleh Anung (Direktur Finance & HRGA)']},
    ],
    workflows:[
      WF_MORNING,
      WF_EVENING,
      WF_SELF_ASSESS,
    ],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Ketepatan Waktu','Kualitas Kerja GA','Tanggung Jawab','Responsivitas']},
      {category:'Kerja Tim',items:['Dukungan ke seluruh tim','Kolaborasi dengan tim FINANCE_HRGA']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 12. SUTRISNA — GA & Officer ──────────────────────────────────────────
  {
    slug:'sutrisna',
    name:'Sutrisna',
    email:'sutrisna@watermark.co.id',
    jabatan:'General Affairs & Officer',
    divisi:'FINANCE_HRGA',
    levelLabel:'GA Officer',
    accent:'#64748b', accentLight:'#F1F5F9', accentText:'#334155',
    intro:'Sebagai GA Officer, kamu bertugas mendukung operasional dan administrasi kantor harian di bawah koordinasi divisi FINANCE_HRGA. Kamu mengisi check-in pagi, laporan sore, dan self-assessment bulanan.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek task dan agenda GA hari ini'],
      evening:['Buka Dashboard → Laporan Sore','Isi ringkasan kegiatan GA hari ini','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan kegiatan harian.',steps:['Cek notifikasi dan task','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task setelah selesai']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment (deadline tanggal 23)','Kamu dinilai oleh Anung (Direktur Finance & HRGA)']},
    ],
    workflows:[WF_MORNING, WF_EVENING, WF_SELF_ASSESS],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Ketepatan Waktu','Kualitas Kerja','Tanggung Jawab','Inisiatif']},
      {category:'Kerja Tim',items:['Dukungan operasional ke seluruh tim']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 13–16. CREATIVE TEAM ─────────────────────────────────────────────────
  ...[
    {slug:'kres',name:'Kres',email:'kres@watermark.co.id',jabatan:'Stage Designer',peran:'Stage Designer — merancang dan mengeksekusi desain panggung untuk project Event dan PH.',penilai:'Fakhril (Direktur Creative) dan Wulan (PM Event)'},
    {slug:'saffira',name:'Saffira',email:'saffira@watermark.co.id',jabatan:'Stage Designer',peran:'Stage Designer — merancang dan mengeksekusi desain panggung untuk project Event dan PH.',penilai:'Fakhril (Direktur Creative) dan Wulan (PM Event)'},
    {slug:'kukuh',name:'Kukuh',email:'kukuh@watermark.co.id',jabatan:'Stage Designer',peran:'Stage Designer — merancang dan mengeksekusi desain panggung untuk project Event dan PH.',penilai:'Fakhril (Direktur Creative) dan Wulan (PM Event)'},
    {slug:'noval',name:'Noval',email:'noval@watermark.co.id',jabatan:'Motion Graphic / Content Creator',peran:'Motion Graphic & Content Creator — membuat konten visual dan motion graphic untuk kebutuhan project dan perusahaan.',penilai:'Fakhril (Direktur Creative) dan Wulan (PM Event)'},
  ].map(c => ({
    slug: c.slug,
    name: c.name,
    email: c.email,
    jabatan: c.jabatan,
    divisi: 'CREATIVE',
    levelLabel: 'Tim Creative',
    accent:'#D97706', accentLight:'#FEF3C7', accentText:'#92400E',
    intro:`Sebagai ${c.peran} Kamu berkontribusi di project Event dan PH sesuai brief yang diberikan. Isi check-in pagi, laporan sore, dan self-assessment bulanan setiap bulan.`,
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek task kreatif hari ini dan brief yang masuk'],
      evening:['Buka Dashboard → Laporan Sore','Isi update progress output kreatif hari ini','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan task dan kegiatan harianmu.',steps:['Cek task dan brief yang masuk','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task dan progress output']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:[`Tab Penilaian Diri: isi self-assessment (deadline tanggal 23)`,`Kamu dinilai oleh ${c.penilai}`]},
    ],
    workflows:[WF_MORNING, WF_EVENING, WF_SELF_ASSESS],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Kualitas Output Kreatif','Ketepatan Waktu Delivery','Tanggung Jawab','Responsivitas terhadap Revisi']},
      {category:'Kerja Tim',items:['Kolaborasi dengan PM dan Direktur','Sharing Session']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  })),

  // ── 17. DODDI — Production Event ─────────────────────────────────────────
  {
    slug:'doddi',
    name:'Doddi',
    email:'doddi@watermark.co.id',
    jabatan:'Production Event',
    divisi:'EVENT',
    levelLabel:'Tim Produksi',
    accent:'#0F766E', accentLight:'#CCFBF1', accentText:'#134E4A',
    intro:'Sebagai anggota tim Production Event, kamu bertanggung jawab pada eksekusi teknis lapangan project Event. Kamu mengisi check-in pagi, laporan sore harian, dan self-assessment bulanan.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek task produksi hari ini'],
      evening:['Buka Dashboard → Laporan Sore','Isi update progress produksi','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan task harian.',steps:['Cek task dan notifikasi','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task dan progress']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment (deadline tanggal 23)','Kamu dinilai oleh David (Direktur Event) dan Wulan (PM Event)']},
    ],
    workflows:[WF_MORNING, WF_EVENING, WF_SELF_ASSESS],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Ketepatan Waktu Eksekusi','Kualitas Kerja Lapangan','Tanggung Jawab','Inisiatif']},
      {category:'Kerja Tim',items:['Kolaborasi Tim Produksi','Koordinasi dengan PM']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 18. REGHY ────────────────────────────────────────────────────────────
  {
    slug:'reghy',
    name:'Reghy',
    email:'reghy@watermark.co.id',
    jabatan:'Production Event',
    divisi:'EVENT',
    levelLabel:'Tim Produksi',
    accent:'#0F766E', accentLight:'#CCFBF1', accentText:'#134E4A',
    intro:'Sebagai anggota tim Production Event, kamu bertanggung jawab pada eksekusi teknis lapangan project Event. Kamu mengisi check-in pagi, laporan sore harian, dan self-assessment bulanan.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek task produksi hari ini'],
      evening:['Buka Dashboard → Laporan Sore','Isi update progress produksi','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan task harian.',steps:['Cek task dan notifikasi','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment (deadline tanggal 23)','Kamu dinilai oleh David (Direktur Event) dan Wulan (PM Event)']},
    ],
    workflows:[WF_MORNING, WF_EVENING, WF_SELF_ASSESS],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Ketepatan Waktu','Kualitas Kerja','Tanggung Jawab','Inisiatif']},
      {category:'Kerja Tim',items:['Kolaborasi Tim Produksi','Koordinasi dengan PM']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 19. JAMAL — Production PH ────────────────────────────────────────────
  {
    slug:'jamal',
    name:'Jamal',
    email:'jamal@watermark.co.id',
    jabatan:'Video Production PH',
    divisi:'PH',
    levelLabel:'Video Production',
    accent:'#7C3AED', accentLight:'#EDE9FE', accentText:'#4C1D95',
    intro:'Sebagai Video Production PH, kamu bertanggung jawab pada produksi video dan konten visual untuk project Production House. Kamu mengisi check-in pagi, laporan sore harian, dan self-assessment bulanan.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek task video produksi hari ini'],
      evening:['Buka Dashboard → Laporan Sore','Isi update progress produksi video','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan task harian.',steps:['Cek task dan notifikasi','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task dan progress']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment (deadline tanggal 23)','Kamu dinilai oleh Gunadarma (Direktur PH)']},
    ],
    workflows:[WF_MORNING, WF_EVENING, WF_SELF_ASSESS],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Kualitas Output Video','Ketepatan Waktu Delivery','Tanggung Jawab','Inisiatif']},
      {category:'Kerja Tim',items:['Kolaborasi dengan Tim PH','Koordinasi dengan Bastya']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 20. PUTRA — Project Officer Event ────────────────────────────────────
  {
    slug:'putra',
    name:'Putra',
    email:'putra@watermark.co.id',
    jabatan:'Project Officer Event',
    divisi:'EVENT',
    levelLabel:'Project Officer',
    accent:'#0F766E', accentLight:'#CCFBF1', accentText:'#134E4A',
    intro:'Sebagai Project Officer Event, kamu mendukung PM dalam koordinasi operasional project Event — vendor, logistik, dan administrasi. Kamu mengisi check-in pagi, laporan sore, dan self-assessment bulanan.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek task dan agenda project hari ini'],
      evening:['Buka Dashboard → Laporan Sore','Isi update progress kegiatan PO','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan task harian.',steps:['Cek task dan notifikasi','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task dan progress']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment (deadline tanggal 23)','Kamu dinilai oleh David (Direktur Event) dan Wulan (PM Event)']},
    ],
    workflows:[WF_MORNING, WF_EVENING, WF_SELF_ASSESS],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Ketepatan Waktu','Kualitas Koordinasi','Tanggung Jawab','Inisiatif']},
      {category:'Kerja Tim',items:['Kolaborasi dengan PM','Koordinasi Vendor & Logistik']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 21. ECA — Project Officer Event ─────────────────────────────────────
  {
    slug:'eca',
    name:'Eca',
    email:'eca@watermark.co.id',
    jabatan:'Project Officer Event',
    divisi:'EVENT',
    levelLabel:'Project Officer',
    accent:'#0F766E', accentLight:'#CCFBF1', accentText:'#134E4A',
    intro:'Sebagai Project Officer Event, kamu mendukung PM dalam koordinasi operasional project Event. Kamu mengisi check-in pagi, laporan sore, dan self-assessment bulanan.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek task dan agenda project hari ini'],
      evening:['Buka Dashboard → Laporan Sore','Isi update progress kegiatan','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan task harian.',steps:['Cek task dan notifikasi','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment (deadline tanggal 23)','Kamu dinilai oleh David (Direktur Event) dan Wulan (PM Event)']},
    ],
    workflows:[WF_MORNING, WF_EVENING, WF_SELF_ASSESS],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Ketepatan Waktu','Kualitas Koordinasi','Tanggung Jawab','Inisiatif']},
      {category:'Kerja Tim',items:['Kolaborasi dengan PM','Dukungan Operasional Event']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 22. SULTAN — Content Creator Event ───────────────────────────────────
  {
    slug:'sultan',
    name:'Sultan',
    email:'sultan@watermark.co.id',
    jabatan:'Content Creator',
    divisi:'EVENT',
    levelLabel:'Content Creator',
    accent:'#0F766E', accentLight:'#CCFBF1', accentText:'#134E4A',
    intro:'Sebagai Content Creator di divisi Event, kamu membuat konten digital untuk kebutuhan project Event dan dokumentasi perusahaan. Kamu mengisi check-in pagi, laporan sore, dan self-assessment bulanan.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek brief konten dan task hari ini'],
      evening:['Buka Dashboard → Laporan Sore','Isi update output konten hari ini','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan task harian.',steps:['Cek task dan brief konten','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task dan progress konten']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment (deadline tanggal 23)','Kamu dinilai oleh David (Direktur Event) dan Wulan (PM Event)']},
    ],
    workflows:[WF_MORNING, WF_EVENING, WF_SELF_ASSESS],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Kualitas Output Konten','Ketepatan Waktu','Kreativitas','Tanggung Jawab']},
      {category:'Kerja Tim',items:['Kolaborasi dengan PM','Responsivitas terhadap Brief']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },

  // ── 23. BONI — Internship Event ───────────────────────────────────────────
  {
    slug:'boni',
    name:'Boni',
    email:'boni@watermark.co.id',
    jabatan:'Internship Event',
    divisi:'EVENT',
    levelLabel:'Internship',
    accent:'#0F766E', accentLight:'#CCFBF1', accentText:'#134E4A',
    intro:'Sebagai Internship Event, kamu mendukung kegiatan divisi Event selama masa magang. Kamu wajib check-in pagi sebelum 08:00 WIB, isi laporan sore, dan mengikuti alur kerja yang sama dengan anggota tim lainnya.',
    dailyRoutine:{
      morning:['Buka Dashboard','Klik "Check-In Pagi"','Cek task dan agenda magang hari ini'],
      evening:['Buka Dashboard → Laporan Sore','Isi update kegiatan magang hari ini','Submit laporan']
    },
    menus:[
      {icon:'🏠',name:'Dashboard',url:'/dashboard',desc:'Ringkasan task dan kegiatan harian.',steps:['Cek task yang diberikan','Check-in pagi sebelum 08:00 WIB dan laporan sore 17:00–20:00 WIB']},
      {icon:'📋',name:'Tugas Saya',url:'/my-tasks',desc:'Task dan check-in harian.',steps:['Lihat task yang di-assign kepadamu','Update status task dan progress']},
      {icon:'⭐',name:'Scores / Penilaian',url:'/scores',desc:'Self-assessment bulanan.',steps:['Tab Penilaian Diri: isi self-assessment bulanan (deadline tanggal 23)','Kamu dinilai oleh David (Direktur Event) dan Wulan (PM Event)']},
    ],
    workflows:[WF_MORNING, WF_EVENING, WF_SELF_ASSESS],
    kpiIndicators:[
      {category:'Kompetensi Individu',items:['Ketepatan Waktu','Kualitas Kerja','Semangat Belajar','Tanggung Jawab']},
      {category:'Kerja Tim',items:['Kolaborasi dengan Tim Event','Responsivitas terhadap Tugas']},
      {category:'Disiplin Harian (Otomatis)',items:['Check-in pagi sebelum 08:00 WIB','Laporan progress sore 17:00–20:00 WIB']},
    ],
  },
]

// ── Generate all HTML files ──────────────────────────────────────────────────
// Map slug → full name for filename
const FILENAME_MAP = {
  'bambang':'Bambang_Ramdany',
  'anung':'Anung_Anindita_Atmaja',
  'gunadarma':'Gunadarma',
  'david-setyawan':'David_Setyawan',
  'fakhril-islamy':'M_Fakhril_Islamy',
  'wulan':'Wulan',
  'irham':'Irham',
  'bastya':'Bastya',
  'antoni':'Antoni',
  'bima':'Bima',
  'henri':'Henri',
  'sutrisna':'Sutrisna',
  'kres':'Kres',
  'saffira':'Saffira',
  'kukuh':'Kukuh',
  'noval':'Noval',
  'doddi':'Doddi',
  'reghy':'Reghy',
  'jamal':'Jamal',
  'putra':'Putra',
  'eca':'Eca',
  'sultan':'Sultan',
  'boni':'Boni',
}

let count = 0
for (const person of PEOPLE) {
  const filename = FILENAME_MAP[person.slug] || person.slug
  const html = buildGuide(person)
  const outPath = path.join(OUT, `Panduan_${filename}.html`)
  fs.writeFileSync(outPath, html)
  console.log(`✓ ${outPath}`)
  count++
}
console.log(`\nDone: ${count} guides generated in ${OUT}`)
