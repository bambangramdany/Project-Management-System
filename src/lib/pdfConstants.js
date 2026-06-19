// src/lib/pdfConstants.js
// Shared constants for all PDF documents (quotation + invoice)

import path from 'path'

// ── Company ───────────────────────────────────────────────────────────────────
export const COMPANY = {
  legalName:   'PT SINEMATIK ANAK BANGSA',
  brand:       'Watermark Indonesia',
  address:     'Jalan Batu Sulaeman Nomor 53 Kel. Kayu Putih, Kec. Pulogadung',
  city:        'Jakarta Timur, 13210',
  bank:        'Bank Central Asia (BCA)',
  bankNumber:  '7061111011',
  bankAccount: 'PT SINEMATIK ANAK BANGSA',
  email:       'watermark.indonesia@gmail.com',
  // Absolute path to logo PNG (place file at /public/logo.png)
  logoPath:    path.join(process.cwd(), 'public', 'logo.png'),
}

// ── Brand colours ─────────────────────────────────────────────────────────────
export const COLOR = {
  brand:   '#1E1B4B',   // dark indigo
  accent:  '#6D28D9',   // purple
  text:    '#1F2937',
  muted:   '#6B7280',
  light:   '#F9FAFB',
  border:  '#E5E7EB',
  white:   '#FFFFFF',
  green:   '#065F46',
  greenBg: '#F0FDF4',
  amber:   '#D97706',
  red:     '#DC2626',
}

// ── Default Terms & Conditions per division ───────────────────────────────────
export function defaultTerms(division, isDP) {
  const bankLine = `Pembayaran dapat ditransfer ke:\n  Bank Central Asia (BCA)\n  No. Rekening: 7061111011 a/n PT SINEMATIK ANAK BANGSA\n  Harap kirim bukti transfer ke: ${COMPANY.email}`

  const shared = [
    'Pembatalan dalam 14 hari sebelum pelaksanaan acara akan dikenakan biaya 50% dari total nilai kontrak.',
    'Biaya tambahan di luar yang tercantum di atas wajib diselesaikan maksimal 7 hari setelah acara selesai.',
    bankLine,
  ]

  if (isDP) {
    return [
      'Pembayaran pertama sebesar nilai DP dilakukan sebelum pelaksanaan produksi/acara dimulai.',
      'Pelunasan dilakukan paling lambat 7 hari setelah acara/project selesai.',
      ...shared,
    ].join('\n')
  }

  if (division === 'PH') {
    return [
      'Pembayaran penuh dilakukan setelah project/konten telah diserahterimakan kepada klien.',
      'Revisi di luar scope yang telah disepakati akan dikenakan biaya tambahan.',
      ...shared,
    ].join('\n')
  }

  // Default EO
  return [
    'Pembayaran penuh dilakukan selambat-lambatnya setelah event selesai dilaksanakan.',
    ...shared,
  ].join('\n')
}
