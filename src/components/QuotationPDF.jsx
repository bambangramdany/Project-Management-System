// src/components/QuotationPDF.jsx
// React PDF template for Quotation documents
// Server-side only — called from /api/quotations/[id]/pdf

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { COMPANY, COLOR } from '@/lib/pdfConstants'
import { Letterhead, rp, dateStr } from '@/components/InvoicePDF'

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: COLOR.text,
    paddingTop: 32,
    paddingBottom: 52,
    paddingHorizontal: 40,
    backgroundColor: COLOR.white,
  },
  dividerThin:  { height: 0.5, backgroundColor: COLOR.border, marginVertical: 7 },

  // ── Meta row ──
  metaRow:   { flexDirection: 'row', gap: 10, marginBottom: 10 },
  metaBlock: { flex: 1 },
  metaLabel: { fontSize: 6.5, color: COLOR.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1.5 },
  metaValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLOR.text },
  metaLight: { fontSize: 8.5, color: COLOR.text },

  // ── To block ──
  toBlock:  { marginBottom: 12, padding: 10, backgroundColor: COLOR.light, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: COLOR.brand },
  toLabel:  { fontSize: 6.5, color: COLOR.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  toName:   { fontSize: 12, fontFamily: 'Helvetica-Bold', color: COLOR.brand },
  toEvent:  { fontSize: 8.5, color: COLOR.text, marginTop: 2 },
  toDetail: { fontSize: 7.5, color: COLOR.muted, marginTop: 1.5 },

  // ── Table ──
  table:       { marginBottom: 10 },
  tableHead:   { flexDirection: 'row', backgroundColor: COLOR.brand, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 2 },
  th:          { color: COLOR.white, fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow:    { flexDirection: 'row', paddingVertical: 4.5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: COLOR.border },
  tableRowAlt: { backgroundColor: COLOR.light },
  sectionRow:  { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, backgroundColor: '#EEF2FF', marginTop: 4 },
  sectionLbl:  { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLOR.accent, flex: 1 },
  td:          { fontSize: 8, color: COLOR.text },
  tdBold:      { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLOR.text },
  tdMuted:     { fontSize: 7, color: COLOR.muted, marginTop: 1 },
  tdByClient:  { fontSize: 7, color: COLOR.amber, fontFamily: 'Helvetica-Bold' },
  // cols
  cNo:   { width: 18 },
  cDesc: { flex: 1 },
  cRate: { width: 72, textAlign: 'right' },
  cUnit: { width: 38, textAlign: 'center' },
  cQty:  { width: 22, textAlign: 'center' },
  cDay:  { width: 22, textAlign: 'center' },
  cSub:  { width: 72, textAlign: 'right' },

  // ── Section subtotal row ──
  secTotalRow: { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 4, backgroundColor: '#F5F3FF' },
  secTotalLbl: { flex: 1, fontSize: 7.5, color: COLOR.accent, textAlign: 'right', fontFamily: 'Helvetica-Bold', paddingRight: 4 },
  secTotalVal: { width: 72, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLOR.accent, textAlign: 'right' },

  // ── Grand totals ──
  totalsWrap: { alignSelf: 'flex-end', width: 220, marginTop: 6, marginBottom: 12 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  totalLbl:   { fontSize: 8, color: COLOR.muted },
  totalVal:   { fontSize: 8, color: COLOR.text },
  grandRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: COLOR.brand, borderRadius: 3, marginTop: 4 },
  grandLbl:   { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLOR.white },
  grandVal:   { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: COLOR.white },
  dpRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3.5, paddingHorizontal: 8, backgroundColor: '#78350F', borderRadius: 3, marginTop: 2 },

  // ── Notes ──
  notesBlock: { marginBottom: 10 },
  notesTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLOR.muted, marginBottom: 3 },
  notesText:  { fontSize: 8, color: COLOR.text, lineHeight: 1.5 },

  // ── Terms ──
  termsBlock: { marginBottom: 10, padding: 9, borderWidth: 0.5, borderColor: COLOR.border, borderRadius: 4 },
  termsTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLOR.text, marginBottom: 5 },
  termsText:  { fontSize: 7.5, color: COLOR.text, lineHeight: 1.6 },

  // ── Payment ──
  payBlock: { padding: 9, backgroundColor: COLOR.greenBg, borderRadius: 4, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  payTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLOR.green, marginBottom: 4 },
  payRow:   { flexDirection: 'row', marginBottom: 2 },
  payLbl:   { fontSize: 7.5, color: COLOR.muted, width: 88 },
  payVal:   { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLOR.text, flex: 1 },

  // ── Signatures ──
  sigRow:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  sigCol:    { width: '30%', alignItems: 'center' },
  sigTitle:  { fontSize: 7, color: COLOR.muted, textAlign: 'center', marginBottom: 32 },
  sigLine:   { height: 0.5, backgroundColor: COLOR.border, width: '100%', marginBottom: 4 },
  sigName:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLOR.text, textAlign: 'center' },
  sigRole:   { fontSize: 6.5, color: COLOR.muted, textAlign: 'center', marginTop: 1.5 },

  // ── Footer ──
  footer:     { position: 'absolute', bottom: 22, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: COLOR.border, paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 6.5, color: COLOR.muted },

  // ── Draft watermark ──
  draftWatermark: {
    position: 'absolute', top: 220, left: 40, right: 40,
    textAlign: 'center', fontSize: 88, fontFamily: 'Helvetica-Bold',
    color: '#FEE2E2', opacity: 0.55, transform: 'rotate(-35deg)',
    letterSpacing: 18,
  },

  // ── Draft banner ──
  draftBanner: {
    backgroundColor: '#DC2626', borderRadius: 4,
    paddingVertical: 7, paddingHorizontal: 10,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  draftBannerText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff', flex: 1 },
  draftBannerNote: { fontSize: 7, color: '#FCA5A5' },

  // ── Internal breakdown table ──
  internalWrap:   { marginTop: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 4 },
  internalHead:   { flexDirection: 'row', backgroundColor: '#7F1D1D', paddingVertical: 5, paddingHorizontal: 4, borderRadius: 3 },
  internalThTxt:  { color: '#fff', fontSize: 6.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.3 },
  internalRow:    { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: '#FEE2E2' },
  internalRowAlt: { backgroundColor: '#FFF1F2' },
  internalSec:    { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, backgroundColor: '#FEE2E2' },
  internalSecTxt: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#7F1D1D', flex: 1 },
  internalTd:     { fontSize: 7.5, color: '#1F2937' },
  internalTdMuted:{ fontSize: 7, color: '#6B7280', marginTop: 1 },
  internalTdRed:  { fontSize: 7.5, color: '#DC2626', fontFamily: 'Helvetica-Bold' },
  // internal cols
  ciNo:     { width: 18 },
  ciDesc:   { flex: 1 },
  ciHpp:    { width: 72, textAlign: 'right' },
  ciTitipan:{ width: 72, textAlign: 'right' },
  ciMargin: { width: 60, textAlign: 'right' },
  ciQuot:   { width: 72, textAlign: 'right' },

  // ── Internal summary ──
  internalSummaryWrap: { alignSelf: 'flex-end', width: 240, marginTop: 6, padding: 8, backgroundColor: '#FFF1F2', borderRadius: 4, borderWidth: 0.5, borderColor: '#FCA5A5' },
  internalSummaryTitle:{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#7F1D1D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  internalSummaryRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  internalSummaryLbl:  { fontSize: 7.5, color: '#6B7280' },
  internalSummaryVal:  { fontSize: 7.5, color: '#1F2937', fontFamily: 'Helvetica-Bold' },
  internalSummaryGrand:{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#7F1D1D', borderRadius: 3, marginTop: 4 },
  internalSummaryGLbl: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
  internalSummaryGVal: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#FCA5A5' },
})

// ── Totals calc ───────────────────────────────────────────────────────────────
function calcTotals(q) {
  const allItems = (q.sections || []).flatMap(sec => sec.items || [])
  let sub = 0, agBase = 0
  allItems.forEach(it => {
    sub += it.subtotal || 0
    if (it.includeAgencyFee) agBase += it.subtotal || 0
  })
  const agencyFeeAmt = agBase * ((q.agencyFeePercent || 0) / 100)
  const ppnBase      = sub + agencyFeeAmt
  const ppnAmt       = q.includesPpn ? ppnBase * ((q.ppnPercent || 11) / 100) : 0
  const grand        = ppnBase + ppnAmt
  return { sub, agencyFeeAmt, ppnAmt, grand }
}

function sectionTotal(sec) {
  return (sec.items || []).reduce((a, it) => a + (it.subtotal || 0), 0)
}

// ── Internal draft helpers ────────────────────────────────────────────────────
function calcInternalTotals(q) {
  const allItems = (q.sections || []).flatMap(sec => sec.items || [])
  let totalHpp = 0, totalTitipan = 0, totalQuot = 0, hppFilled = 0
  allItems.forEach(it => {
    if (it.hppSubtotal != null) { totalHpp += it.hppSubtotal; hppFilled++ }
    if (it.titipanKlien != null) totalTitipan += (it.titipanKlien * (it.qty || 1) * (it.days || 1))
    totalQuot += it.subtotal || 0
  })
  const grossMargin = totalQuot - totalHpp - totalTitipan
  const marginPct   = totalQuot > 0 ? (grossMargin / totalQuot) * 100 : null
  return { totalHpp, totalTitipan, totalQuot, grossMargin, marginPct, hppFilled, itemCount: allItems.length }
}

// ── Main export ───────────────────────────────────────────────────────────────
export function QuotationPDF({ quotation: q, isDraft = false }) {
  const totals = calcTotals(q)
  const internal = isDraft ? calcInternalTotals(q) : null
  let globalNo = 1
  let globalNoInternal = 1

  return (
    <Document title={isDraft ? `[DRAFT] ${q.quotationNumber}` : q.quotationNumber} author={COMPANY.legalName} creator="Watermark PM">
      <Page size="A4" style={s.page}>

        {/* DRAFT watermark — fixed so it appears on every page */}
        {isDraft && (
          <Text style={s.draftWatermark} fixed>DRAFT</Text>
        )}

        <Letterhead
          docTitle={isDraft ? 'QUOTATION — DRAFT INTERNAL' : 'QUOTATION'}
          docNumber={q.quotationNumber}
          docSubtitle={null}
        />

        {/* Draft banner */}
        {isDraft && (
          <View style={s.draftBanner}>
            <View style={{ flex: 1 }}>
              <Text style={s.draftBannerText}>⚠  DOKUMEN INTERNAL — JANGAN DIKIRIM KE KLIEN</Text>
              <Text style={s.draftBannerNote}>Draft ini berisi data HPP &amp; titipan klien yang bersifat rahasia. Hanya untuk review internal oleh reviewer dan direktur.</Text>
            </View>
          </View>
        )}

        {/* Meta */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Tanggal</Text>
            <Text style={s.metaValue}>{dateStr(q.createdAt)}</Text>
          </View>
          {q.eventDate && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Tanggal Event</Text>
              <Text style={s.metaValue}>{q.eventDate}</Text>
            </View>
          )}
          {q.venue && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Venue</Text>
              <Text style={s.metaLight}>{q.venue}</Text>
            </View>
          )}
          {q.location && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Lokasi</Text>
              <Text style={s.metaLight}>{q.location}</Text>
            </View>
          )}
        </View>

        {/* To */}
        <View style={s.toBlock}>
          <Text style={s.toLabel}>Kepada Yth.</Text>
          <Text style={s.toName}>{q.clientName}</Text>
          <Text style={s.toEvent}>{q.eventName}</Text>
          {q.venue    && <Text style={s.toDetail}>📍 {q.venue}</Text>}
          {q.location && <Text style={s.toDetail}>🌏 {q.location}</Text>}
        </View>

        {/* Items table */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.th, s.cNo]}>No</Text>
            <Text style={[s.th, s.cDesc]}>Item / Keterangan</Text>
            <Text style={[s.th, s.cRate]}>Rate</Text>
            <Text style={[s.th, s.cUnit]}>Unit</Text>
            <Text style={[s.th, s.cQty]}>Qty</Text>
            <Text style={[s.th, s.cDay]}>Day</Text>
            <Text style={[s.th, s.cSub]}>Sub Total</Text>
          </View>

          {(q.sections || []).map(sec => (
            <View key={sec.id}>
              {/* Section header */}
              <View style={s.sectionRow}>
                <Text style={s.sectionLbl}>{sec.letter}. {sec.name}</Text>
              </View>

              {(sec.items || []).map((it, i) => (
                <View key={it.id || i} style={[s.tableRow, i % 2 === 1 && s.tableRowAlt]}>
                  <Text style={[s.td, s.cNo]}>{globalNo++}</Text>
                  <View style={s.cDesc}>
                    <Text style={s.tdBold}>{it.description}</Text>
                    {it.detailText && <Text style={s.tdMuted}>{it.detailText}</Text>}
                  </View>
                  <Text style={[s.td, s.cRate]}>
                    {it.rate == null
                      ? <Text style={s.tdByClient}>by client</Text>
                      : rp(it.rate)
                    }
                  </Text>
                  <Text style={[s.td, s.cUnit]}>{it.unitType}</Text>
                  <Text style={[s.td, s.cQty]}>{it.qty}</Text>
                  <Text style={[s.td, s.cDay]}>{it.days}</Text>
                  <Text style={[s.td, s.cSub]}>
                    {it.rate == null ? '—' : rp(it.subtotal)}
                  </Text>
                </View>
              ))}

              {/* Section subtotal */}
              <View style={s.secTotalRow}>
                <Text style={s.secTotalLbl}>Sub Total {sec.letter}:</Text>
                <Text style={s.secTotalVal}>{rp(sectionTotal(sec))}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Grand totals */}
        <View style={s.totalsWrap}>
          <View style={s.totalRow}>
            <Text style={s.totalLbl}>Sub Total</Text>
            <Text style={s.totalVal}>{rp(totals.sub)}</Text>
          </View>
          {totals.agencyFeeAmt > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLbl}>Agency Fee ({q.agencyFeePercent}%)</Text>
              <Text style={s.totalVal}>{rp(totals.agencyFeeAmt)}</Text>
            </View>
          )}
          {totals.ppnAmt > 0 && (
            <>
              <View style={[s.totalRow, { borderTopWidth: 0.5, borderTopColor: '#E5E7EB', paddingTop: 4, marginTop: 2 }]}>
                <Text style={[s.totalLbl, { fontFamily: 'Helvetica-Bold' }]}>Total (excl. PPN)</Text>
                <Text style={[s.totalVal, { fontFamily: 'Helvetica-Bold' }]}>{rp(totals.sub + totals.agencyFeeAmt)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={s.totalLbl}>PPN {q.ppnPercent || 11}%</Text>
                <Text style={s.totalVal}>{rp(totals.ppnAmt)}</Text>
              </View>
            </>
          )}
          <View style={s.grandRow}>
            <Text style={s.grandLbl}>GRAND TOTAL</Text>
            <Text style={s.grandVal}>{rp(totals.grand)}</Text>
          </View>
          {/* DP info */}
          {(q.dpPercent || q.dpAmount) && (
            <View style={s.dpRow}>
              <Text style={[s.grandLbl, { fontSize: 8 }]}>
                DP {q.dpPercent ? `${q.dpPercent}%` : ''}
              </Text>
              <Text style={[s.grandVal, { fontSize: 8.5 }]}>
                {rp(q.dpAmount || Math.round(totals.grand * (q.dpPercent || 0) / 100))}
              </Text>
            </View>
          )}
        </View>

        {/* ── INTERNAL BREAKDOWN (draft only) ── */}
        {isDraft && (
          <>
            <View style={s.internalWrap}>
              {/* Header */}
              <View style={s.internalHead}>
                <Text style={[s.internalThTxt, s.ciNo]}>No</Text>
                <Text style={[s.internalThTxt, s.ciDesc]}>Item</Text>
                <Text style={[s.internalThTxt, s.ciHpp]}>HPP/Modal 🔒</Text>
                <Text style={[s.internalThTxt, s.ciTitipan]}>Titipan Klien 🔒</Text>
                <Text style={[s.internalThTxt, s.ciMargin]}>Margin 🔒</Text>
                <Text style={[s.internalThTxt, s.ciQuot]}>QUOT</Text>
              </View>

              {(q.sections || []).map(sec => {
                let secHpp = 0, secTitipan = 0, secQuot = 0
                return (
                  <View key={sec.id}>
                    <View style={s.internalSec}>
                      <Text style={s.internalSecTxt}>{sec.letter}. {sec.name}</Text>
                    </View>
                    {(sec.items || []).map((it, i) => {
                      const hpp      = it.hppSubtotal ?? null
                      const titipan  = it.titipanKlien != null ? it.titipanKlien * (it.qty || 1) * (it.days || 1) : null
                      const quot     = it.subtotal || 0
                      const margin   = hpp != null ? quot - hpp - (titipan || 0) : null
                      const marginP  = hpp != null && quot > 0 ? ((quot - hpp - (titipan || 0)) / quot * 100) : null
                      secHpp     += hpp     ?? 0
                      secTitipan += titipan ?? 0
                      secQuot    += quot
                      return (
                        <View key={it.id || i} style={[s.internalRow, i % 2 === 1 && s.internalRowAlt]}>
                          <Text style={[s.internalTd, s.ciNo]}>{globalNoInternal++}</Text>
                          <View style={s.ciDesc}>
                            <Text style={[s.internalTd, { fontFamily: 'Helvetica-Bold' }]}>{it.description}</Text>
                            {it.vendorName && <Text style={s.internalTdMuted}>🏢 {it.vendorName}</Text>}
                          </View>
                          <Text style={[hpp == null ? s.internalTdMuted : s.internalTd, s.ciHpp]}>
                            {hpp != null ? rp(hpp) : '—'}
                          </Text>
                          <Text style={[titipan == null ? s.internalTdMuted : s.internalTd, s.ciTitipan]}>
                            {titipan != null ? rp(titipan) : '—'}
                          </Text>
                          <Text style={[margin == null ? s.internalTdMuted : s.internalTdRed, s.ciMargin]}>
                            {margin != null ? `${rp(margin)}${marginP != null ? ` (${marginP.toFixed(1)}%)` : ''}` : '—'}
                          </Text>
                          <Text style={[s.internalTd, s.ciQuot]}>{rp(quot)}</Text>
                        </View>
                      )
                    })}
                  </View>
                )
              })}
            </View>

            {/* Internal summary */}
            <View style={s.internalSummaryWrap}>
              <Text style={s.internalSummaryTitle}>🔒 Ringkasan Internal</Text>
              {internal.totalHpp > 0 && (
                <View style={s.internalSummaryRow}>
                  <Text style={s.internalSummaryLbl}>Total HPP/Modal ({internal.hppFilled}/{internal.itemCount} item)</Text>
                  <Text style={s.internalSummaryVal}>{rp(internal.totalHpp)}</Text>
                </View>
              )}
              {internal.totalTitipan > 0 && (
                <View style={s.internalSummaryRow}>
                  <Text style={s.internalSummaryLbl}>Total Titipan Klien</Text>
                  <Text style={s.internalSummaryVal}>{rp(internal.totalTitipan)}</Text>
                </View>
              )}
              <View style={s.internalSummaryRow}>
                <Text style={s.internalSummaryLbl}>Total QUOT (sebelum PPN)</Text>
                <Text style={s.internalSummaryVal}>{rp(internal.totalQuot)}</Text>
              </View>
              {internal.totalHpp > 0 && (
                <View style={s.internalSummaryGrand}>
                  <Text style={s.internalSummaryGLbl}>
                    Gross Margin
                  </Text>
                  <Text style={s.internalSummaryGVal}>
                    {rp(internal.grossMargin)}{internal.marginPct != null ? `  (${internal.marginPct.toFixed(1)}%)` : ''}
                  </Text>
                </View>
              )}
              {internal.hppFilled < internal.itemCount && (
                <Text style={{ fontSize: 6.5, color: '#DC2626', marginTop: 4 }}>
                  ⚠ {internal.itemCount - internal.hppFilled} item belum diisi HPP — margin belum lengkap
                </Text>
              )}
            </View>
          </>
        )}

        {/* Notes */}
        {q.notes && (
          <View style={s.notesBlock}>
            <Text style={s.notesTitle}>Catatan:</Text>
            <Text style={s.notesText}>{q.notes}</Text>
          </View>
        )}

        <View style={s.dividerThin} />

        {/* Terms & Conditions */}
        {q.termsConditions && (
          <View style={s.termsBlock} wrap={false}>
            <Text style={s.termsTitle}>TERMS &amp; CONDITIONS</Text>
            <Text style={s.termsText}>{q.termsConditions}</Text>
          </View>
        )}

        {/* Payment info + Signatures — dibungkus wrap={false} agar tidak
            pernah terpisah: signature selalu satu halaman dengan payment info */}
        <View wrap={false}>
          {/* Payment info */}
          <View style={s.payBlock}>
            <Text style={s.payTitle}>INFORMASI PEMBAYARAN</Text>
            <View style={s.payRow}><Text style={s.payLbl}>Bank</Text><Text style={s.payVal}>{COMPANY.bank}</Text></View>
            <View style={s.payRow}><Text style={s.payLbl}>No. Rekening</Text><Text style={s.payVal}>{COMPANY.bankNumber}</Text></View>
            <View style={s.payRow}><Text style={s.payLbl}>Atas Nama</Text><Text style={s.payVal}>{COMPANY.bankAccount}</Text></View>
            <View style={s.payRow}><Text style={s.payLbl}>Konfirmasi ke</Text><Text style={s.payVal}>{COMPANY.email}</Text></View>
          </View>

          {/* Signatures */}
          <View style={s.sigRow}>
            {/* Prepared by — PM */}
            <View style={s.sigCol}>
              <Text style={s.sigTitle}>Prepared by</Text>
              <View style={s.sigLine} />
              <Text style={s.sigName}>{q.picQuotation?.name || q.createdBy?.name || '________________________'}</Text>
              <Text style={s.sigRole}>{q.picQuotation?.jobTitle || 'Project Manager'}</Text>
            </View>

            {/* Approved by #1 — Wulan */}
            <View style={s.sigCol}>
              <Text style={s.sigTitle}>Checked by</Text>
              <View style={s.sigLine} />
              <Text style={s.sigName}>{q.approver1?.name || '________________________'}</Text>
              <Text style={s.sigRole}>{q.approver1?.jobTitle || 'Manager'}</Text>
            </View>

            {/* Approved by #2 — Director */}
            <View style={s.sigCol}>
              <Text style={s.sigTitle}>Approved by</Text>
              <View style={s.sigLine} />
              <Text style={s.sigName}>{q.approver2?.name || '________________________'}</Text>
              <Text style={s.sigRole}>{q.approver2?.jobTitle || 'Direktur'}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={[s.footerText, isDraft && { color: '#DC2626', fontFamily: 'Helvetica-Bold' }]}>
            {isDraft ? '🔒 DRAFT INTERNAL — RAHASIA  ·  ' : ''}{COMPANY.legalName}  ·  {q.quotationNumber}
          </Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
