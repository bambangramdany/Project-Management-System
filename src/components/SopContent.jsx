export default function SopContent() {
  return (
    <div className="prose prose-sm max-w-none text-gray-800">

      {/* ── Cover ─────────────────────────────────────────────────────── */}
      <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
        <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">PT Sinematik Anak Bangsa</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Pedoman & Standard Operating Procedure</h1>
        <p className="text-lg font-semibold text-purple-700">Watermark Indonesia</p>
        <div className="mt-4 inline-flex gap-6 text-xs text-gray-500">
          <span>Dokumen: WM-SOP-000 s.d. WM-GA-SOP-01</span>
          <span>Versi: 1.0</span>
          <span>Status: Internal Use Only</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PEDOMAN INDUK
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="A. PEDOMAN INDUK (WM-SOP-000)" color="purple">

        <H2>I. Latar Belakang & Tujuan</H2>
        <p>Dokumen ini adalah pedoman induk yang menaungi seluruh Standard Operating Procedure (SOP) di Watermark Indonesia. SOP turunan — Tim Creative, Tim Production House (PH), Tim Event, Tim Keuangan, Tim General Affairs (GA), dan Tim HRD — mengacu pada dokumen ini untuk hal-hal lintas divisi: prinsip kerja, kerangka metrik, standar pelaporan, dan mekanisme pengawasan.</p>
        <ul>
          <li>Menyatukan standar kerja seluruh divisi dalam satu bahasa dan satu sistem ukur.</li>
          <li>Menyediakan dasar objektif bagi atasan dan HRD untuk pengawasan, evaluasi, dan pengambilan keputusan.</li>
          <li>Memastikan seluruh progres kerja terlacak di <strong>Watermark PM</strong>, bukan hanya di grup WhatsApp.</li>
          <li>Menjadi rujukan tunggal saat terjadi perbedaan pendapat mengenai standar kerja.</li>
        </ul>

        <H2>II. Lima Prinsip Kerja</H2>
        <ol>
          <li><strong>Terukur</strong> — setiap klaim "sudah selesai" harus bisa ditunjukkan datanya.</li>
          <li><strong>Tercatat</strong> — seluruh progres, kendala, dan keputusan penting didokumentasikan di Watermark PM.</li>
          <li><strong>Tepat Waktu</strong> — keterlambatan adalah risiko bisnis; setiap peran memiliki SLA yang eksplisit.</li>
          <li><strong>Tanggung Jawab Penuh</strong> — pemilik tugas bertanggung jawab dari awal hingga dampaknya ke klien/perusahaan.</li>
          <li><strong>Naik Kelas Bersama</strong> — evaluasi ditujukan untuk pengembangan, bukan semata mencari kesalahan.</li>
        </ol>

        <H2>III. Struktur Organisasi & Alur Eskalasi</H2>
        <p>Alur eskalasi standar: <strong>Pelaksana → Lead/Manager Tim → Direktur</strong>. Eskalasi yang melompati jenjang hanya diperbolehkan untuk isu yang berdampak langsung pada keselamatan atau risiko hukum/keuangan material.</p>
        <ul>
          <li><strong>Lead/Manager</strong> wajib merespons eskalasi dari anggota tim maksimal dalam <strong>4 jam kerja</strong>.</li>
          <li><strong>Direktur</strong> merespons eskalasi dari Lead/Manager maksimal dalam <strong>1×24 jam kerja</strong>.</li>
        </ul>

        <H2>IV. Standar Respons Komunikasi (Berlaku untuk Seluruh Tim)</H2>
        <p>Selama jam kerja <strong>09.00–18.00 WIB</strong>, setiap karyawan wajib merespons dalam batas waktu berikut:</p>
        <ul>
          <li><strong>WhatsApp</strong> (grup & pesan pribadi terkait pekerjaan): maksimal <strong>30 menit</strong>.</li>
          <li><strong>Email</strong> (internal maupun dari klien/vendor): maksimal <strong>1 jam</strong>.</li>
        </ul>
        <p>Respons minimal adalah acknowledgment ("Noted, sedang ditangani"). Pesan di luar jam kerja wajib direspons paling lambat pukul 09.30 WIB hari kerja berikutnya.</p>

        <H2>V. Kerangka Metrik Kinerja</H2>
        <p>Formula Skor Kinerja Individu (bulanan):</p>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
          Skor Kinerja = (40% × Ketepatan Waktu) + (35% × Kualitas Output) + (25% × Completion Rate)
        </div>
        <Table headers={['Rentang Skor', 'Predikat', 'Konsekuensi']} rows={[
          ['90–100', 'Istimewa', 'Prioritas bonus tier tertinggi & promosi'],
          ['80–89,9', 'Baik', 'Memenuhi standar, layak bonus penuh'],
          ['70–79,9', 'Cukup', 'Bonus proporsional, dibahas di review bulanan'],
          ['60–69,9', 'Perlu Perbaikan', 'Wajib rencana perbaikan tertulis, direview 30 hari'],
          ['< 60', 'Kritis', 'Masuk Performance Improvement Plan (PIP), direview 60 hari'],
        ]} />

        <H2>VI. Standar Pelaporan Harian</H2>
        <ul>
          <li><strong>To Do List Harian</strong> — diisi di Watermark PM paling lambat pukul <strong>09.00 WIB</strong>.</li>
          <li><strong>EOD Report</strong> — diisi di Watermark PM paling lambat pukul <strong>18.00 WIB</strong>, memuat: tugas selesai, tugas berjalan, kendala, dan bantuan yang dibutuhkan.</li>
          <li>Keterlambatan input lebih dari 3 kali dalam satu bulan dicatat otomatis oleh sistem dan menjadi bahan review kinerja.</li>
        </ul>

        <H2>VII. Check-In Harian</H2>
        <p>Setiap hari kerja, seluruh karyawan wajib melakukan check-in pagi di Watermark PM paling lambat pukul <strong>09.30 WIB</strong> sebagai konfirmasi kehadiran dan kesiapan kerja. EOD check-out dilakukan pukul <strong>17.00–20.00 WIB</strong> disertai laporan progres singkat.</p>

        <H2>VIII. Pemeliharaan & Pengembalian Aset Perusahaan</H2>
        <p>Seluruh aset perusahaan (elektronik, kamera, peralatan produksi, furnitur, kendaraan operasional, dll.) adalah milik PT Sinematik Anak Bangsa dan wajib dijaga dengan standar berikut:</p>
        <ul>
          <li>Aset dikembalikan ke tempat penyimpanan setelah digunakan; tidak boleh dibawa pulang tanpa persetujuan tertulis atasan.</li>
          <li>Kerusakan atau kehilangan wajib dilaporkan ke Tim GA maksimal <strong>1×24 jam kerja</strong> setelah diketahui.</li>
          <li>Karyawan yang terbukti lalai menyebabkan kerusakan atau kehilangan aset bertanggung jawab atas penggantian/perbaikan.</li>
          <li>Kondisi aset dipantau berkala oleh Tim GA dan dicatat dalam inventarisasi Watermark PM.</li>
        </ul>
        <p><strong>Pengembalian aset saat keluar (resign atau PHK):</strong> Seluruh aset wajib dikembalikan kepada Tim GA pada hari terakhir kerja. Pembayaran akhir baru diproses setelah konfirmasi pengembalian aset selesai.</p>

        <H2>IX. Standar Penampilan & Perilaku Profesional</H2>
        <Table headers={['Situasi', 'Standar']} rows={[
          ['Kerja harian di kantor', 'Kaos nyaman & rapi, celana/rok panjang rapi, sepatu kasual (hindari sandal)'],
          ['Di lokasi event/lapangan', 'Kaos tim berlogo perusahaan, celana panjang/kargo, sepatu tertutup'],
          ['Bertemu klien', 'Kaos berkerah/kemeja, celana/rok profesional, sepatu formal/kasual rapi'],
          ['Event formal', 'Kemeja hitam, jas/blazer hitam disarankan, celana/rok formal, sepatu formal'],
        ]} />
        <p>Grooming: bersih dan rapi, rambut panjang diikat, makeup natural, parfum tidak menyengat. Perilaku di media sosial pribadi tidak boleh merugikan nama baik perusahaan.</p>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SOP CREATIVE
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="B. SOP TIM CREATIVE (WM-CR-SOP-01)" color="blue">

        <H2>I. Ruang Lingkup</H2>
        <p>Berlaku untuk: <strong>Creative Lead, 2D Designer, 3D Designer, Motion Graphics/Multimedia Designer</strong>. Dalam aktivitas: pitching, pengembangan konsep, produksi, revisi, dan evaluasi proyek.</p>

        <H2>II. Tanggung Jawab per Peran</H2>
        <ul>
          <li><strong>Creative Lead</strong> — arah konsep, big idea, main moodboard, quality control, approval internal sebelum pitch, evaluasi tim. Diukur melalui Pitch Win Rate (target ≥ 40%).</li>
          <li><strong>2D Designer</strong> — key visual, layout deck, visual asset/collateral. Checklist wajib: hierarki visual jelas, tidak ada typo, warna sesuai brand guideline.</li>
          <li><strong>3D Designer</strong> — visualisasi ruang/panggung, presisi ukuran (toleransi deviasi ≤2%), render realistis, file teknis build-ready.</li>
          <li><strong>Motion Graphics/Multimedia Designer</strong> — animasi grafis, konten video promosi/bumper, material multimedia untuk presentasi dan media sosial, file siap tayang sesuai spesifikasi platform.</li>
        </ul>

        <H2>III. Proses Pitching</H2>
        <Table headers={['Tahap', 'Target Waktu']} rows={[
          ['Brief Clarification (5 hal wajib terpenuhi sebelum desain dimulai)', '≤ 1×24 jam kerja sejak brief diterima'],
          ['Insight & Big Idea', '≤ 1 hari kerja setelah Brief Clarification'],
          ['Concept Lock (approval Creative Lead)', '≤ 4 jam kerja setelah draf konsep diajukan'],
          ['Visual Development', '≤ 2 hari kerja (Tier 1) sejak Concept Lock'],
          ['Internal Review per level', '≤ 4 jam kerja'],
        ]} />

        <H2>IV. Standar Revisi</H2>
        <ul>
          <li><strong>Minor</strong> (warna, layout kecil): selesai ≤ 4 jam kerja.</li>
          <li><strong>Major</strong> (konsep berubah): selesai ≤ 1 hari kerja, wajib diskusi ulang dengan Creative Lead.</li>
          <li>Setiap revisi major dicatat di Watermark PM dan menjadi komponen Skor Kualitas Output.</li>
        </ul>

        <H2>V. Standar Kualitas (Non-Negotiable)</H2>
        <p>Pekerjaan dianggap tidak memenuhi standar jika: visual generik/tidak orisinal, ada typo, layout berantakan, hasil 3D tidak realistis/tidak feasible, atau deadline molor tanpa eskalasi sebelumnya. "Deadline mepet" bukan alasan yang sah untuk menurunkan standar kualitas.</p>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SOP PH
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="C. SOP TIM PRODUCTION HOUSE (WM-PH-SOP-01)" color="indigo">

        <H2>I. SOP Produser</H2>
        <ul>
          <li>Briefing awal & dokumen rencana produksi rinci diunggah ke Watermark PM: <strong>≤ 1×24 jam kerja</strong> setelah proyek di-assign.</li>
          <li>Pertemuan mingguan tim proyek: minimal 1 kali per minggu, didokumentasikan.</li>
          <li>Toleransi budget variance: <strong>≤ 5%</strong>. Proyeksi lewat 5% wajib approval Direktur/Keuangan ≤ 1×24 jam kerja sebelum pengeluaran.</li>
        </ul>

        <H2>II. SOP Editor</H2>
        <Table headers={['Tahapan', 'Target Waktu']} rows={[
          ['Import & organize footage', '≤ 1 hari kerja sejak footage diterima'],
          ['Rough cut pertama', '≤ 3 hari kerja sejak footage lengkap'],
          ['Revisi minor per putaran', '≤ 1 hari kerja'],
          ['Revisi major per putaran', '≤ 2 hari kerja'],
          ['Final cut', '≤ 2 hari kerja sejak rough cut disetujui'],
        ]} />
        <p>Pengecekan & update software/hardware: minimal <strong>1 kali per bulan</strong>. Insiden kegagalan akibat hardware/software wajib dilaporkan di Watermark PM maksimal 1 hari kerja.</p>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SOP EVENT
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="D. SOP TIM EVENT (WM-EV-SOP-01)" color="green">

        <H2>I. SOP Account Executive/Project Manager (AE/PM)</H2>
        <Table headers={['Aktivitas', 'Target Waktu']} rows={[
          ['Pertemuan awal klien baru sejak lead masuk', '≤ 2×24 jam kerja'],
          ['Konfirmasi rangkuman kebutuhan klien', '≤ 1×24 jam kerja setelah pertemuan'],
          ['Pembaruan rutin progres ke klien', 'Min. 1 kali per minggu'],
          ['Respons awal keluhan klien', '≤ 4 jam kerja'],
          ['Solusi/rencana tindak lanjut keluhan', '≤ 1×24 jam kerja sejak keluhan diterima'],
          ['Kick-off meeting internal sejak kontrak diteken', '≤ 1×24 jam kerja'],
          ['Dokumentasi instruksi klien ke Watermark PM', '≤ 4 jam kerja sejak instruksi diterima'],
        ]} />

        <H2>II. SOP Production & Logistics Officer</H2>
        <ul>
          <li>Seleksi vendor: ≤ 3 hari kerja sejak kebutuhan ditetapkan.</li>
          <li>Kontrak vendor selesai: <strong>H-5 sebelum event</strong>.</li>
          <li>Pemasangan peralatan selesai: <strong>H-1 pukul 18.00 WIB</strong>.</li>
          <li>Technical check akhir: minimal <strong>2 jam sebelum acara dimulai</strong>; 100% peralatan harus berfungsi.</li>
        </ul>

        <H2>III. SOP Event Officer</H2>
        <ul>
          <li>Kontak talent/artis/MC: ≤ 2 hari kerja sejak kebutuhan ditetapkan.</li>
          <li>Finalisasi kontrak & raider talent: <strong>H-7 sebelum event</strong>.</li>
          <li>Dealing venue: <strong>H-14 sebelum event</strong>.</li>
          <li>Koordinasi meals/logistik tim: <strong>H-2 sebelum event</strong>.</li>
          <li>Seluruh kontrak, approval, dan raider wajib terdokumentasi di Watermark PM sebelum event: <strong>kepatuhan 100%</strong>.</li>
        </ul>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SOP KEUANGAN
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="E. SOP TIM KEUANGAN (WM-FN-SOP-01)" color="yellow">

        <H2>I. Pengelolaan Anggaran Proyek</H2>
        <ul>
          <li>Briefing anggaran proyek ke Tim Keuangan: ≤ 1×24 jam kerja sejak proyek di-assign.</li>
          <li>Toleransi variance anggaran: <strong>≤ 5%</strong>. Selisih &gt;5% wajib dilaporkan ke Direktur ≤ 1×24 jam kerja sejak diketahui.</li>
        </ul>

        <H2>II. Pembayaran</H2>
        <ul>
          <li>Dokumen lengkap (invoice, kontrak, approval) diproses: <strong>≤ 1×24 jam kerja</strong> sejak diterima.</li>
          <li>Ketepatan waktu pembayaran ke vendor/staf sesuai jatuh tempo kontrak: target <strong>100%</strong>, tanpa toleransi keterlambatan.</li>
          <li>Potensi keterlambatan wajib dieskalasi ke Direktur minimal <strong>3 hari kerja</strong> sebelum jatuh tempo.</li>
        </ul>

        <H2>III. Pelaporan Keuangan</H2>
        <Table headers={['Laporan', 'Target Waktu']} rows={[
          ['Laporan keuangan sementara proyek', 'Mingguan selama persiapan & pelaksanaan'],
          ['Laporan keuangan final proyek', '≤ 5 hari kerja setelah proyek closing'],
          ['Laporan keuangan bulanan perusahaan', '≤ tanggal 5 bulan berikutnya'],
          ['Laporan keuangan tahunan', '≤ akhir Februari tahun berikutnya'],
        ]} />
        <p>Selisih laporan vs rekonsiliasi akhir: toleransi <strong>≤ 1%</strong>. Selisih &gt;1% wajib diinvestigasi dan didokumentasikan sebelum laporan difinalisasi.</p>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SOP GA
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="F. SOP TIM GENERAL AFFAIRS (WM-GA-SOP-01)" color="orange">

        <H2>I. Ruang Lingkup</H2>
        <p>Berlaku untuk seluruh anggota Tim GA: pengelolaan fasilitas kantor, inventarisasi aset, pengadaan kebutuhan operasional, keamanan, dan layanan pendukung umum (termasuk konsumsi/makan siang tim).</p>

        <H2>II. Tanggung Jawab Utama</H2>
        <ul>
          <li><strong>Fasilitas & kebersihan</strong> — inspeksi visual seluruh area kantor setiap pagi sebelum 08.30 WIB; pelaporan kerusakan ke atasan ≤ 1×24 jam kerja.</li>
          <li><strong>Inventarisasi aset</strong> — seluruh aset tercatat di Watermark PM; pemeriksaan kondisi minimal <strong>1 kali per bulan</strong>; koordinasi pengembalian aset saat offboarding pada hari terakhir kerja karyawan.</li>
          <li><strong>Pengadaan</strong> — pengadaan &gt; Rp 500.000 wajib min. 2 penawaran & persetujuan tertulis. Bukti pembelian diserahkan ke Keuangan ≤ 1×24 jam kerja setelah transaksi.</li>
          <li><strong>Konsumsi tim</strong> — konfirmasi jumlah porsi makan siang paling lambat pukul <strong>09.30 WIB</strong> setiap hari kerja.</li>
          <li><strong>Keamanan</strong> — akses tamu tercatat; insiden keamanan dilaporkan ke Direktur ≤ 2 jam kerja sejak diketahui.</li>
        </ul>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SOP HRD
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="G. SOP TIM HRD (WM-HR-SOP-01)" color="pink">

        <H2>I. Rekrutmen</H2>
        <Table headers={['Tahapan', 'Target Waktu']} rows={[
          ['Posting lowongan sejak permintaan disetujui', '≤ 2 hari kerja'],
          ['Screening CV awal', '≤ 3 hari kerja sejak lowongan ditutup'],
          ['Penjadwalan wawancara', '≤ 5 hari kerja setelah screening'],
          ['Total Time to Hire', '≤ 30 hari kalender'],
          ['Kesiapan materi onboarding', 'Selesai H-1 sebelum hari pertama kerja'],
        ]} />

        <H2>II. Prosedur Offboarding</H2>
        <p>Checklist offboarding wajib diselesaikan pada hari terakhir kerja:</p>
        <ul>
          <li>Pengembalian seluruh aset perusahaan ke Tim GA dengan konfirmasi tertulis kondisi aset.</li>
          <li>Pencabutan akses sistem (Watermark PM, email perusahaan, akses cloud).</li>
          <li>Exit interview — didokumentasikan di Watermark PM.</li>
          <li>Serah terima pekerjaan dan dokumen proyek yang masih berjalan.</li>
        </ul>
        <p>Pembayaran akhir baru diproses setelah seluruh checklist offboarding selesai dan dikonfirmasi HRD.</p>

        <H2>III. Manajemen Kinerja</H2>
        <ul>
          <li>Kalibrasi Skor Kinerja lintas tim: setiap kuartal.</li>
          <li>Hasil evaluasi kinerja disampaikan ke karyawan: ≤ 5 hari kerja setelah kalibrasi.</li>
          <li>Karyawan dengan Skor &lt; 60 masuk PIP dalam ≤ 5 hari kerja setelah skor diketahui.</li>
        </ul>

        <H2>IV. Pelatihan & Pengembangan</H2>
        <ul>
          <li>Survei kebutuhan pelatihan: minimal 1 kali per kuartal.</li>
          <li>Program pelatihan per divisi: minimal 1 kali per kuartal.</li>
          <li>Target skor kepuasan pelatihan: ≥ 4,0 (skala 1–5).</li>
        </ul>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          PENUTUP
      ══════════════════════════════════════════════════════════════════ */}
      <div className="mt-10 p-6 bg-gray-900 text-white rounded-xl text-sm">
        <p className="font-bold text-base mb-2">Pernyataan Kesepakatan</p>
        <p className="text-gray-300 leading-relaxed">
          Seluruh ketentuan dalam dokumen ini berlaku sebagai <strong className="text-white">kontrak kerja digital</strong> antara karyawan dan PT Sinematik Anak Bangsa. Dengan menyetujui dokumen ini, karyawan menyatakan telah membaca, memahami, dan berkomitmen untuk menjalankan seluruh standar dan prosedur yang tercantum. Pelanggaran terhadap ketentuan ini dapat mengakibatkan tindakan disipliner sesuai kebijakan perusahaan. Dokumen ini ditinjau dan dapat diperbarui secara berkala; karyawan akan diminta menyetujui ulang setiap kali ada pembaruan.
        </p>
        <p className="mt-3 text-gray-400 text-xs">PT Sinematik Anak Bangsa — Watermark Indonesia · 2026</p>
      </div>

    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, color, children }) {
  const colors = {
    purple: 'bg-purple-50 border-purple-300',
    blue:   'bg-blue-50 border-blue-300',
    indigo: 'bg-indigo-50 border-indigo-300',
    green:  'bg-green-50 border-green-300',
    yellow: 'bg-yellow-50 border-yellow-300',
    orange: 'bg-orange-50 border-orange-300',
    pink:   'bg-pink-50 border-pink-300',
  }
  const titleColors = {
    purple: 'text-purple-800',
    blue:   'text-blue-800',
    indigo: 'text-indigo-800',
    green:  'text-green-800',
    yellow: 'text-yellow-800',
    orange: 'text-orange-800',
    pink:   'text-pink-800',
  }
  return (
    <div className={`mb-8 rounded-xl border-l-4 ${colors[color]} p-5`}>
      <h2 className={`text-base font-bold mb-4 ${titleColors[color]}`}>{title}</h2>
      {children}
    </div>
  )
}

function H2({ children }) {
  return <h3 className="text-sm font-bold text-gray-800 mt-5 mb-2 uppercase tracking-wide">{children}</h3>
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {headers.map((h, i) => (
              <th key={i} className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, j) => (
                <td key={j} className="border border-gray-200 px-3 py-2 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
