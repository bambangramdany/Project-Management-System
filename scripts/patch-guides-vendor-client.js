/**
 * Patch guide HTML files to add vendor & client data tasks
 * PM/Producer: input klien + input & nilai vendor
 * PO: bantu cari & daftarkan vendor ke PM
 * Production: laporkan kebutuhan vendor/peralatan ke PM
 */
const fs = require('fs')
const path = require('path')
const OUT = path.join(__dirname, '../guides')

// ── Helper: inject before closing </ol> in "Cara Menggunakan Sistem" ────────
function addSteps(html, newSteps) {
  // Find the step-list and insert before its closing </ol>
  return html.replace(
    /(<ol class="step-list">)([\s\S]*?)(<\/ol>)/,
    (_, open, content, close) => open + content + newSteps + close
  )
}

// ── Helper: inject menu cards ────────────────────────────────────────────────
function addMenuCards(html, newCards) {
  return html.replace(
    /(<div class="menu-list">)([\s\S]*?)(<\/div>\s*<\/div>\s*<div class="section">)/,
    (_, open, content, after) => open + content + newCards + after
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

function stepItem(num, title, desc) {
  // num is used for step-num circle
  return `
    <li>
      <div class="step-num">${num}</div>
      <div>
        <div class="step-title">${title}</div>
        <p>${desc}</p>
      </div>
    </li>`
}

// Count existing steps in file
function countSteps(html) {
  return (html.match(/<div class="step-num">/g) || []).length
}

// ── Patches per role ─────────────────────────────────────────────────────────

// PM & Producer: klien + vendor (input + penilaian)
const PM_MENUS = menuCard('🏢', 'Klien', 'Input dan kelola data klien — nama perusahaan, PIC, kontak, dan riwayat project.') +
                 menuCard('🤝', 'Vendor', 'Input vendor baru, kelola daftar vendor, dan isi penilaian vendor setelah project selesai.')

function patchPM(html) {
  const n = countSteps(html)
  const newSteps =
    stepItem(n + 1, 'Input data klien', 'Klien → + Tambah Klien → isi nama perusahaan, PIC, kontak, dan alamat → simpan. Lakukan setiap ada klien baru sebelum membuat project.') +
    stepItem(n + 2, 'Input dan nilai vendor', 'Vendor → + Tambah Vendor → isi nama, kategori layanan, dan kontak. Setelah project selesai, buka halaman vendor tersebut → Isi Penilaian → nilai ketepatan waktu, kualitas, dan harga.')
  return addMenuCards(addSteps(html, newSteps), PM_MENUS)
}

// PO: input vendor + penilaian vendor
const PO_MENUS = menuCard('🤝', 'Vendor', 'Input vendor baru ke sistem, kelola daftar vendor, dan isi penilaian kinerja vendor setelah project selesai.')

function patchPO(html) {
  const n = countSteps(html)
  const newSteps =
    stepItem(n + 1, 'Input vendor baru', 'Vendor → + Tambah Vendor → isi nama, kategori layanan, dan kontak → simpan. Lakukan setiap ada vendor baru yang digunakan di project.') +
    stepItem(n + 2, 'Nilai kinerja vendor', 'Setelah project selesai, buka halaman vendor → Isi Penilaian → nilai ketepatan waktu, kualitas output, dan kesesuaian harga → simpan.')
  return addMenuCards(addSteps(html, newSteps), PO_MENUS)
}

// Production: input vendor + penilaian vendor
const PRODUCTION_MENUS = menuCard('🤝', 'Vendor', 'Input vendor yang digunakan di lapangan dan isi penilaian kinerja vendor setelah project selesai.')

function patchProduction(html) {
  const n = countSteps(html)
  const newSteps =
    stepItem(n + 1, 'Input vendor yang digunakan', 'Vendor → + Tambah Vendor → isi nama, kategori (transportasi, catering, peralatan, dsb.), dan kontak → simpan.') +
    stepItem(n + 2, 'Nilai kinerja vendor', 'Setelah project selesai, buka halaman vendor → Isi Penilaian → nilai ketepatan waktu, kualitas, dan harga berdasarkan pengalaman langsung di lapangan.')
  return addMenuCards(addSteps(html, newSteps), PRODUCTION_MENUS)
}

// ── Apply patches ────────────────────────────────────────────────────────────
const patches = {
  // PM & Producer level — input klien + vendor
  'gunadarma.html':          patchPM,
  'david-setyawan.html':     patchPM,
  'tri-wulan-aprilia.html':  patchPM,
  'muhammad-irham-alif.html':patchPM,
  'bambang-ramdany.html':    patchPM,
  'bagastya-indrawan.html':  patchPM,
  'jamaluddin.html':         patchPM,

  // PO level — cari & input vendor
  'julian-putra.html':       patchPO,
  'siti-nur-fitriah.html':   patchPO,

  // Production — laporkan kebutuhan ke PM
  'doddi-chaeril.html':      patchProduction,
  'muhammad-noval.html':     patchProduction,
  'angga-julfikar.html':     patchProduction,
}

let updated = 0
for (const [file, patchFn] of Object.entries(patches)) {
  const filePath = path.join(OUT, file)
  if (!fs.existsSync(filePath)) { console.log(`SKIP (not found): ${file}`); continue }
  const original = fs.readFileSync(filePath, 'utf8')
  const patched = patchFn(original)
  if (patched === original) { console.log(`WARN (unchanged): ${file}`); continue }
  fs.writeFileSync(filePath, patched, 'utf8')
  console.log(`✓ patched: ${file}`)
  updated++
}
console.log(`\nSelesai: ${updated} file diupdate.`)
