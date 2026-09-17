/**
 * Patch guide HTML files to add:
 * 1. Self-assessment (Penilaian Saya) → semua orang kecuali Owner
 * 2. Penilaian Tim (Nilai Tim) → yang punya pairing/tim
 * 3. Penilaian per Project → PM/Wulan/Direktur
 */
const fs = require('fs')
const path = require('path')
const OUT = path.join(__dirname, '../guides')

function addMenuCards(html, newCards) {
  return html.replace(
    /(<div class="menu-list">)([\s\S]*?)(<\/div>\s*<\/div>\s*<div class="section">)/,
    (_, open, content, after) => open + content + newCards + after
  )
}

function addSteps(html, newSteps) {
  return html.replace(
    /(<ol class="step-list">)([\s\S]*?)(<\/ol>)/,
    (_, open, content, close) => open + content + newSteps + close
  )
}

function menuCard(icon, name, desc) {
  return `\n    <div class="menu-card">
      <div class="menu-icon">${icon}</div>
      <div>
        <div class="menu-name">${name}</div>
        <p>${desc}</p>
      </div>
    </div>`
}

function countSteps(html) {
  return (html.match(/<div class="step-num">/g) || []).length
}

function stepItem(num, title, desc) {
  return `
    <li>
      <div class="step-num">${num}</div>
      <div>
        <div class="step-title">${title}</div>
        <p>${desc}</p>
      </div>
    </li>`
}

// ── Self-assessment menu card (semua non-Owner) ──────────────────────────────
const SELF_ASSESS_MENU = menuCard('📊', 'Penilaian Saya', 'Isi self-assessment KPI bulanan kamu sendiri dan lihat skor serta akumulasi kinerja.')

function selfAssessStep(n) {
  return stepItem(n + 1, 'Isi self-assessment bulanan',
    'Penilaian Tim → tab "Penilaian Saya" → pilih periode bulan ini → isi nilai untuk setiap kriteria KPI → kirim. Lakukan sebelum tanggal 5 bulan berikutnya.')
}

// ── Penilaian Tim menu card ──────────────────────────────────────────────────
const NILAI_TIM_MENU = menuCard('⭐', 'Nilai Tim', 'Beri penilaian KPI bulanan dan penilaian per project untuk anggota tim pasanganmu.')

function nilaiTimStep(n, who) {
  return stepItem(n + 1, 'Beri penilaian tim',
    `Penilaian Tim → tab "Nilai Tim" → ${who} → isi skor untuk setiap kriteria → simpan.`)
}

function nilaiProjectStep(n) {
  return stepItem(n + 1, 'Nilai anggota per project',
    'Penilaian Tim → tab "Nilai Tim" → "Nilai Per Project/Event" → pilih project WIN/DONE → pilih anggota → isi penilaian → simpan.')
}

// ── Patches per orang ────────────────────────────────────────────────────────
const patches = {
  // ── Direktur (punya Laporan Kinerja, tapi tambah self-assess) ──────────
  'david-setyawan.html': html => {
    const n = countSteps(html)
    return addMenuCards(addSteps(html, selfAssessStep(n)), SELF_ASSESS_MENU)
  },
  'fakhril-islamy.html': html => {
    const n = countSteps(html)
    return addMenuCards(addSteps(html, selfAssessStep(n)), SELF_ASSESS_MENU)
  },
  'henri-sulistianto.html': html => {
    const n = countSteps(html)
    return addMenuCards(addSteps(html, selfAssessStep(n)), SELF_ASSESS_MENU)
  },

  // ── Wulan: self-assess + nilai tim EVENT+CREATIVE + nilai per project ──
  'tri-wulan-aprilia.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih anggota tim Event atau Creative yang ingin kamu nilai') +
      nilaiProjectStep(n + 2)
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },

  // ── Irham: self-assess + nilai non-PM Event (termasuk nilai Wulan) ─────
  'muhammad-irham-alif.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih anggota tim Event (PO dan Production) atau Wulan → isi penilaian') +
      nilaiProjectStep(n + 2)
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },

  // ── Bambang: self-assess + nilai per project (PM biasa) ───────────────
  'bambang-ramdany.html': html => {
    const n = countSteps(html)
    const steps = selfAssessStep(n) + nilaiProjectStep(n + 1)
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },

  // ── Julian: self-assess + nilai Siti Nur (pair) ───────────────────────
  'julian-putra.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih Siti Nur Fitriah (pasangan penilaianmu) → isi penilaian KPI bulanan')
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },

  // ── Siti Nur: self-assess saja (Julian yang menilai dia, tapi dia tidak punya pair outgoing) ─
  'siti-nur-fitriah.html': html => {
    const n = countSteps(html)
    return addMenuCards(addSteps(html, selfAssessStep(n)), SELF_ASSESS_MENU)
  },

  // ── Doddi: self-assess + nilai Noval + Angga ──────────────────────────
  'doddi-chaeril.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih Noval Suherman atau Angga Julfikar (pasangan penilaianmu) → isi penilaian KPI bulanan')
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },

  // ── Noval Suherman: self-assess + nilai Doddi + Angga ─────────────────
  'muhammad-noval.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih Doddi Chaeril atau Angga Julfikar (pasangan penilaianmu) → isi penilaian KPI bulanan')
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },

  // ── Angga: self-assess + nilai Doddi + Noval ──────────────────────────
  'angga-julfikar.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih Doddi Chaeril atau Noval Suherman (pasangan penilaianmu) → isi penilaian KPI bulanan')
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },

  // ── Bagastya <-> Jamaluddin ────────────────────────────────────────────
  'bagastya-indrawan.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih Jamaluddin (pasangan penilaianmu) → isi penilaian KPI bulanan') +
      nilaiProjectStep(n + 2)
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },
  'jamaluddin.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih Bagastya Indrawan (pasangan penilaianmu) → isi penilaian KPI bulanan') +
      nilaiProjectStep(n + 2)
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },

  // ── Creative peers: saling nilai ──────────────────────────────────────
  'kresensia-bangun.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih anggota tim Creative lainnya (Saffira, Nauval, atau Kukuh) → isi penilaian KPI bulanan')
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },
  'saffira-azka.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih anggota tim Creative lainnya (Kresensia, Nauval, atau Kukuh) → isi penilaian KPI bulanan')
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },
  'nauval-zikri.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih anggota tim Creative lainnya (Kresensia, Saffira, atau Kukuh) → isi penilaian KPI bulanan')
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },
  'kukuh-bayu.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih anggota tim Creative lainnya (Kresensia, Saffira, atau Nauval) → isi penilaian KPI bulanan')
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },

  // ── Soultan: self-assess saja ──────────────────────────────────────────
  'soultan-aziez.html': html => {
    const n = countSteps(html)
    return addMenuCards(addSteps(html, selfAssessStep(n)), SELF_ASSESS_MENU)
  },

  // ── Finance: self-assess ────────────────────────────────────────────────
  'anung-anindita.html': html => {
    const n = countSteps(html)
    return addMenuCards(addSteps(html, selfAssessStep(n)), SELF_ASSESS_MENU)
  },
  'antoni-steven.html': html => {
    const n = countSteps(html)
    const steps =
      selfAssessStep(n) +
      nilaiTimStep(n + 1, 'KPI Tim → pilih Humam Bimantoro (pasangan penilaianmu) → isi penilaian KPI bulanan')
    return addMenuCards(addSteps(html, steps), SELF_ASSESS_MENU + NILAI_TIM_MENU)
  },
  'humam-bimantoro.html': html => {
    const n = countSteps(html)
    return addMenuCards(addSteps(html, selfAssessStep(n)), SELF_ASSESS_MENU)
  },

  // ── Sutrisna: self-assess saja ──────────────────────────────────────────
  'sutrisna.html': html => {
    const n = countSteps(html)
    return addMenuCards(addSteps(html, selfAssessStep(n)), SELF_ASSESS_MENU)
  },
}

let updated = 0
for (const [file, patchFn] of Object.entries(patches)) {
  const filePath = path.join(OUT, file)
  if (!fs.existsSync(filePath)) { console.log(`SKIP (not found): ${file}`); continue }
  const original = fs.readFileSync(filePath, 'utf8')
  const patched = patchFn(original)
  if (patched === original) { console.log(`WARN (unchanged): ${file}`); continue }
  fs.writeFileSync(filePath, patched, 'utf8')
  console.log(`✓ ${file}`)
  updated++
}
console.log(`\nSelesai: ${updated} file diupdate.`)
