/**
 * Helper: menentukan siapa saja yang harus dinotifikasi ketika seorang user
 * tidak melakukan daily check-in atau evening report.
 *
 * Aturan hierarki (sesuai kesepakatan):
 *
 *   User divisi/role               → Notifikasi ke
 *   ─────────────────────────────────────────────────────────────────────────
 *   Anggota Tim Event              → PM Event + Director Event + Owner
 *   Wulan (PM · EVENT)             → Director Event + Owner
 *   Anggota Tim Creative           → Director Creative + Director Event + PM Event + Owner
 *   David (Director · EVENT)       → Owner
 *   Fakhril (Director · CREATIVE)  → Owner
 *   Anggota Tim PH                 → Director PH + Owner
 *   Guna (Director · PH)           → Owner
 *   Anggota Tim Finance/HRGA       → Director Finance + Owner
 *   Anung (Director · FINANCE_HRGA)→ Owner
 *   Bima (FINANCE_STAFF · FINANCE) → Director Finance + Owner
 *   Owner                          → (tidak ada superior)
 */

/**
 * Mengembalikan array userId yang harus dinotifikasi ketika `user` tidak check-in.
 * @param {object} user      - user yang absen (id, role, divisi)
 * @param {object[]} allUsers - semua user aktif (id, role, divisi)
 * @returns {string[]} array of userId (tanpa duplikat, tanpa diri sendiri)
 */
export function getSuperiorIds(user, allUsers) {
  const find = (role, divisi) =>
    allUsers.filter(u => u.role === role && (!divisi || u.divisi === divisi))

  const owner        = find('OWNER')
  const dirEvent     = find('DIRECTOR', 'EVENT')
  const dirCreative  = find('DIRECTOR', 'CREATIVE')
  const dirPH        = find('DIRECTOR', 'PH')
  const dirFinance   = find('DIRECTOR', 'FINANCE_HRGA')
  const pmEvent      = find('PROJECT_MANAGER', 'EVENT')

  let superiors = []

  if (user.role === 'OWNER') {
    // Owner tidak punya superior
    return []
  }

  if (user.role === 'DIRECTOR') {
    // Semua Director → hanya Owner
    superiors = [...owner]
  } else if (user.role === 'PROJECT_MANAGER' && user.divisi === 'EVENT') {
    // Wulan (PM · EVENT) → Director Event + Owner
    superiors = [...dirEvent, ...owner]
  } else if (user.divisi === 'EVENT') {
    // Anggota Tim Event → PM Event + Director Event + Owner
    superiors = [...pmEvent, ...dirEvent, ...owner]
  } else if (user.divisi === 'CREATIVE') {
    // Anggota Tim Creative → Director Creative + Director Event + PM Event + Owner
    superiors = [...dirCreative, ...dirEvent, ...pmEvent, ...owner]
  } else if (user.divisi === 'PH') {
    // Anggota Tim PH → Director PH + Owner
    superiors = [...dirPH, ...owner]
  } else if (user.divisi === 'FINANCE_HRGA') {
    // Anggota Tim Finance/HRGA (incl. Bima) → Director Finance + Owner
    superiors = [...dirFinance, ...owner]
  } else {
    // Fallback: hanya Owner
    superiors = [...owner]
  }

  // Hapus diri sendiri dan duplikat
  const ids = [...new Set(superiors.map(u => u.id).filter(id => id !== user.id))]
  return ids
}
