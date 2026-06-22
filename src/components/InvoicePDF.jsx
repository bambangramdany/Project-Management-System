// src/components/InvoicePDF.jsx
// React PDF template for Invoice (DETAIL + SUMMARY modes)
// Server-side only — called from /api/invoices/[id]/pdf

import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { COMPANY, COLOR } from '@/lib/pdfConstants'
import { existsSync } from 'fs'

// ── Shared helpers ─────────────────────────────────────────────────────────────
export const rp = (n) => {
  if (n == null) return '—'
  return 'Rp ' + Math.round(n).toLocaleString('id-ID')
}
export const dateStr = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
const hasLogo = () => existsSync(COMPANY.logoPath)

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

  // ── Letterhead ──
  letterhead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 6 },
  logo: { width: 44, height: 44, objectFit: 'contain' },
  logoPlaceholder: {
    width: 44, height: 44, backgroundColor: COLOR.brand,
    borderRadius: 4, alignItems: 'center', justifyContent: 'center',
  },
  logoPlaceholderText: { color: COLOR.white, fontSize: 18, fontFamily: 'Helvetica-Bold' },
  companyBlock:  { flex: 1 },
  companyLegal:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLOR.brand, letterSpacing: 0.3 },
  companyBrand:  { fontSize: 8, color: COLOR.accent, marginTop: 1 },
  companyAddr:   { fontSize: 7.5, color: COLOR.muted, marginTop: 2, lineHeight: 1.5 },
  docBadge:      { alignItems: 'flex-end' },
  docTitle:      { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLOR.accent, letterSpacing: 1 },
  docNumber:     { fontSize: 8, color: COLOR.muted, marginTop: 2 },
  docDP:         { fontSize: 7.5, color: COLOR.amber, marginTop: 1, fontFamily: 'Helvetica-Bold' },

  dividerThick: { height: 2, backgroundColor: COLOR.brand, marginVertical: 8 },
  dividerThin:  { height: 0.5, backgroundColor: COLOR.border, marginVertical: 7 },

  // ── Meta / To ──
  metaRow:        { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metaBlock:      { flex: 1 },
  metaLabel:      { fontSize: 6.5, color: COLOR.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1.5 },
  metaValue:      { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLOR.text },
  metaValueLight: { fontSize: 8.5, color: COLOR.text },
  toBlock: { marginBottom: 12, padding: 10, backgroundColor: COLOR.light, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: COLOR.brand },
  toLabel: { fontSize: 6.5, color: COLOR.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  toName:  { fontSize: 12, fontFamily: 'Helvetica-Bold', color: COLOR.brand },
  toEvent: { fontSize: 8.5, color: COLOR.text, marginTop: 2 },
  toPo:    { fontSize: 7.5, color: COLOR.muted, marginTop: 2 },

  // ── Table ──
  table:       { marginBottom: 10 },
  tableHead:   { flexDirection: 'row', backgroundColor: COLOR.brand, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 2 },
  th:          { color: COLOR.white, fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow:    { flexDirection: 'row', paddingVertical: 4.5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: COLOR.border },
  tableRowAlt: { backgroundColor: COLOR.light },
  sectionRow:  { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, backgroundColor: '#EEF2FF', marginTop: 3 },
  sectionLbl:  { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLOR.accent, flex: 1 },
  td:          { fontSize: 8, color: COLOR.text },
  tdBold:      { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLOR.text },
  tdMuted:     { fontSize: 7, color: COLOR.muted, marginTop: 1 },
  tdByClient:  { fontSize: 7, color: COLOR.amber, fontFamily: 'Helvetica-Bold' },
  // DETAIL cols
  cNo:   { width: 18 },
  cDesc: { flex: 1 },
  cRate: { width: 70, textAlign: 'right' },
  cUnit: { width: 38, textAlign: 'center' },
  cQty:  { width: 22, textAlign: 'center' },
  cDay:  { width: 22, textAlign: 'center' },
  cSub:  { width: 70, textAlign: 'right' },
  // SUMMARY cols
  cSNo:   { width: 22 },
  cSDesc: { flex: 1 },
  cSAmt:  { width: 88, textAlign: 'right' },

  // ── Totals ──
  totalsWrap: { alignSelf: 'flex-end', width: 210, marginTop: 6, marginBottom: 12 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  totalLbl:   { fontSize: 8, color: COLOR.muted },
  totalVal:   { fontSize: 8, color: COLOR.text },
  grandRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: COLOR.brand, borderRadius: 3, marginTop: 4 },
  grandLbl:   { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLOR.white },
  grandVal:   { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: COLOR.white },

  // ── Terms ──
  termsBlock: { marginBottom: 10, padding: 9, borderWidth: 0.5, borderColor: COLOR.border, borderRadius: 4 },
  termsTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLOR.text, marginBottom: 5 },
  termsText:  { fontSize: 7.5, color: COLOR.text, lineHeight: 1.6 },

  // ── Payment ──
  payBlock: { padding: 9, backgroundColor: COLOR.greenBg, borderRadius: 4, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  payTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLOR.green, marginBottom: 4 },
  payRow:   { flexDirection: 'row', marginBottom: 2 },
  payLbl:   { fontSize: 7.5, color: COLOR.muted, width: 88 },
  payVal:   { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLOR.text, flex: 1 },

  // ── Signatures ──
  sigRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  sigCol:   { width: '30%', alignItems: 'center' },
  sigTitle: { fontSize: 7, color: COLOR.muted, textAlign: 'center', marginBottom: 32 },
  sigLine:  { height: 0.5, backgroundColor: COLOR.border, width: '100%', marginBottom: 4 },
  sigName:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLOR.text, textAlign: 'center' },
  sigRole:  { fontSize: 6.5, color: COLOR.muted, textAlign: 'center', marginTop: 1.5 },

  // ── Footer ──
  footer:     { position: 'absolute', bottom: 22, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: COLOR.border, paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 6.5, color: COLOR.muted },
  notesBlock: { marginBottom: 10 },
  notesTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLOR.muted, marginBottom: 2 },
  notesText:  { fontSize: 8, color: COLOR.text, lineHeight: 1.5 },
})

// ── Reusable Letterhead ───────────────────────────────────────────────────────
export function Letterhead({ docTitle, docNumber, docSubtitle }) {
  return (
    <>
      <View style={s.letterhead}>
        {hasLogo()
          ? <Image src={COMPANY.logoPath} style={s.logo} />
          : <View style={s.logoPlaceholder}><Text style={s.logoPlaceholderText}>W</Text></View>
        }
        <View style={s.companyBlock}>
          <Text style={s.companyLegal}>{COMPANY.legalName}</Text>
          <Text style={s.companyBrand}>{COMPANY.brand}</Text>
          <Text style={s.companyAddr}>{COMPANY.address}{'\n'}{COMPANY.city}</Text>
        </View>
        <View style={s.docBadge}>
          <Text style={s.docTitle}>{docTitle}</Text>
          <Text style={s.docNumber}>{docNumber}</Text>
          {docSubtitle && <Text style={s.docDP}>{docSubtitle}</Text>}
        </View>
      </View>
      <View style={s.dividerThick} />
    </>
  )
}

function DetailTable({ invoice, sections }) {
  let n = 1
  return (
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
      {sections.map(sec => {
        const vis = (sec.items || []).filter(it => {
          const inv = (invoice.items || []).find(i => i.description === it.description)
          return inv ? inv.showInDetail : it.showInInvoiceDetail
        })
        if (!vis.length) return null
        return (
          <View key={sec.id}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLbl}>{sec.letter}. {sec.name}</Text>
            </View>
            {vis.map((it, i) => (
              <View key={it.id || i} style={[s.tableRow, i % 2 === 1 && s.tableRowAlt]}>
                <Text style={[s.td, s.cNo]}>{n++}</Text>
                <View style={s.cDesc}>
                  <Text style={s.tdBold}>{it.description}</Text>
                  {it.detailText && <Text style={s.tdMuted}>{it.detailText}</Text>}
                </View>
                <Text style={[s.td, s.cRate]}>
                  {it.rate == null ? <Text style={s.tdByClient}>by client</Text> : rp(it.rate)}
                </Text>
                <Text style={[s.td, s.cUnit]}>{it.unitType}</Text>
                <Text style={[s.td, s.cQty]}>{it.qty}</Text>
                <Text style={[s.td, s.cDay]}>{it.days}</Text>
                <Text style={[s.td, s.cSub]}>{it.rate == null ? '—' : rp(it.subtotal)}</Text>
              </View>
            ))}
          </View>
        )
      })}
    </View>
  )
}

function SummaryTable({ invoice }) {
  const div = invoice.quotation?.division === 'PH' ? 'Production House' : 'Event Organizer'
  return (
    <View style={s.table}>
      <View style={s.tableHead}>
        <Text style={[s.th, s.cSNo]}>No</Text>
        <Text style={[s.th, s.cSDesc]}>Keterangan</Text>
        <Text style={[s.th, s.cSAmt]}>Jumlah</Text>
      </View>
      <View style={s.tableRow}>
        <Text style={[s.td, s.cSNo]}>1</Text>
        <View style={s.cSDesc}>
          <Text style={s.tdBold}>Jasa {div}</Text>
          <Text style={s.tdMuted}>{invoice.financeEventName || invoice.quotation?.eventName}</Text>
        </View>
        <Text style={[s.tdBold, s.cSAmt]}>{rp(invoice.subtotal)}</Text>
      </View>
    </View>
  )
}

function TotalsBlock({ invoice }) {
  const fullGrand = invoice.subtotal + invoice.agencyFeeAmount + invoice.ppnAmount

  if (invoice.isDP) {
    // Hitung DP ratio dan nilai proporsional per komponen
    const dpExcludePpn = !!invoice.dpExcludePpn
    const dpBase  = dpExcludePpn
      ? (invoice.subtotal + invoice.agencyFeeAmount)   // base tanpa PPN
      : fullGrand
    const ratio   = dpBase > 0 ? invoice.totalAmount / dpBase : 0
    const pct     = Math.round(ratio * 100)

    const dpSubtotal   = invoice.subtotal        * ratio
    const dpAgencyFee  = invoice.agencyFeeAmount * ratio
    const dpPpn        = dpExcludePpn ? 0 : invoice.ppnAmount * ratio
    const ppnPct       = invoice.quotation?.ppnPercent || 11

    return (
      <View style={s.totalsWrap}>
        {/* Baris info: Total Budget Event */}
        <View style={[s.totalRow, { borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB', paddingBottom: 4, marginBottom: 4 }]}>
          <Text style={[s.totalLbl, { fontFamily: 'Helvetica-Bold', color: '#374151' }]}>Total Budget Event</Text>
          <Text style={[s.totalVal, { fontFamily: 'Helvetica-Bold', color: '#374151' }]}>{rp(fullGrand)}</Text>
        </View>
        {/* DP proportional breakdown */}
        <View style={s.totalRow}>
          <Text style={s.totalLbl}>Sub Total (DP {pct}%)</Text>
          <Text style={s.totalVal}>{rp(dpSubtotal)}</Text>
        </View>
        {invoice.agencyFeeAmount > 0 && (
          <View style={s.totalRow}>
            <Text style={s.totalLbl}>Agency Fee (DP {pct}%)</Text>
            <Text style={s.totalVal}>{rp(dpAgencyFee)}</Text>
          </View>
        )}
        {!dpExcludePpn && invoice.ppnAmount > 0 && (
          <View style={s.totalRow}>
            <Text style={s.totalLbl}>PPN {ppnPct}% (DP {pct}%)</Text>
            <Text style={s.totalVal}>{rp(dpPpn)}</Text>
          </View>
        )}
        {dpExcludePpn && invoice.ppnAmount > 0 && (
          <View style={s.totalRow}>
            <Text style={[s.totalLbl, { color: '#F59E0B', fontSize: 7 }]}>PPN {ppnPct}% (dibayar saat pelunasan)</Text>
            <Text style={[s.totalVal, { color: '#F59E0B', fontSize: 7 }]}>{rp(invoice.ppnAmount)}</Text>
          </View>
        )}
        <View style={s.grandRow}>
          <Text style={s.grandLbl}>TOTAL TAGIHAN (DP)</Text>
          <Text style={s.grandVal}>{rp(invoice.totalAmount)}</Text>
        </View>
      </View>
    )
  }

  // Non-DP invoice (unchanged)
  return (
    <View style={s.totalsWrap}>
      <View style={s.totalRow}>
        <Text style={s.totalLbl}>Sub Total</Text>
        <Text style={s.totalVal}>{rp(invoice.subtotal)}</Text>
      </View>
      {invoice.agencyFeeAmount > 0 && (
        <View style={s.totalRow}>
          <Text style={s.totalLbl}>Agency Fee</Text>
          <Text style={s.totalVal}>{rp(invoice.agencyFeeAmount)}</Text>
        </View>
      )}
      {invoice.ppnAmount > 0 && (
        <View style={s.totalRow}>
          <Text style={s.totalLbl}>PPN {invoice.quotation?.ppnPercent || 11}%</Text>
          <Text style={s.totalVal}>{rp(invoice.ppnAmount)}</Text>
        </View>
      )}
      <View style={s.grandRow}>
        <Text style={s.grandLbl}>GRAND TOTAL</Text>
        <Text style={s.grandVal}>{rp(invoice.totalAmount)}</Text>
      </View>
    </View>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function InvoicePDF({ invoice, financeDirector }) {
  const q        = invoice.quotation || {}
  const sections = q.sections || []
  const isDetail = invoice.mode === 'DETAIL'

  return (
    <Document title={invoice.invoiceNumber} author={COMPANY.legalName} creator="Watermark PM">
      <Page size="A4" style={s.page}>

        <Letterhead
          docTitle="INVOICE"
          docNumber={invoice.invoiceNumber}
          docSubtitle={invoice.isDP ? 'TERMIN DOWN PAYMENT' : null}
        />

        {/* Meta */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Tanggal Invoice</Text>
            <Text style={s.metaValue}>{dateStr(invoice.issueDate)}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Jatuh Tempo</Text>
            <Text style={[s.metaValue, { color: COLOR.red }]}>{dateStr(invoice.dueDate)}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>No. Quotation</Text>
            <Text style={s.metaValueLight}>{q.quotationNumber || '—'}</Text>
          </View>
          {invoice.poNumber && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>No. PO</Text>
              <Text style={s.metaValueLight}>{invoice.poNumber}</Text>
            </View>
          )}
          {invoice.taxInvoiceNumber && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>No. Faktur Pajak</Text>
              <Text style={s.metaValueLight}>{invoice.taxInvoiceNumber}</Text>
            </View>
          )}
        </View>

        {/* To */}
        <View style={s.toBlock}>
          <Text style={s.toLabel}>Kepada Yth.</Text>
          <Text style={s.toName}>{invoice.financeClientName || q.clientName}</Text>
          <Text style={s.toEvent}>
            {invoice.financeEventName || q.eventName}
            {q.eventDate ? `  ·  ${q.eventDate}` : ''}
            {q.location  ? `  ·  ${q.location}`  : ''}
          </Text>
          {invoice.poNumber && <Text style={s.toPo}>Ref. PO: {invoice.poNumber}</Text>}
        </View>

        {/* Table */}
        {isDetail
          ? <DetailTable invoice={invoice} sections={sections} />
          : <SummaryTable invoice={invoice} />
        }

        <TotalsBlock invoice={invoice} />

        {/* Notes */}
        {invoice.notes && (
          <View style={s.notesBlock}>
            <Text style={s.notesTitle}>Catatan:</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        <View style={s.dividerThin} />

        {/* Terms & Conditions */}
        {invoice.termsConditions && (
          <View style={s.termsBlock}>
            <Text style={s.termsTitle}>TERMS &amp; CONDITIONS</Text>
            <Text style={s.termsText}>{invoice.termsConditions}</Text>
          </View>
        )}

        {/* Payment info */}
        <View style={s.payBlock}>
          <Text style={s.payTitle}>INFORMASI PEMBAYARAN</Text>
          <View style={s.payRow}><Text style={s.payLbl}>Bank</Text><Text style={s.payVal}>{COMPANY.bank}</Text></View>
          <View style={s.payRow}><Text style={s.payLbl}>No. Rekening</Text><Text style={s.payVal}>{COMPANY.bankNumber}</Text></View>
          <View style={s.payRow}><Text style={s.payLbl}>Atas Nama</Text><Text style={s.payVal}>{COMPANY.bankAccount}</Text></View>
          <View style={s.payRow}><Text style={s.payLbl}>Konfirmasi ke</Text><Text style={s.payVal}>{COMPANY.email}</Text></View>
          {invoice.dueDate && (
            <View style={[s.payRow, { marginTop: 4 }]}>
              <Text style={[s.payLbl, { color: COLOR.red }]}>Jatuh tempo</Text>
              <Text style={[s.payVal, { color: COLOR.red }]}>{dateStr(invoice.dueDate)}</Text>
            </View>
          )}
        </View>

        {/* Signature — hanya Direktur Keuangan, dengan ruang materai */}
        <View style={[s.sigRow, { justifyContent: 'flex-end', marginTop: 24 }]}>
          <View style={[s.sigCol, { width: '40%', alignItems: 'center' }]}>
            <Text style={s.sigTitle}>Mengetahui,{'\n'}(Direktur Keuangan)</Text>
            {/* Kotak ruang materai */}
            <View style={{
              width: 56, height: 56,
              borderWidth: 0.75, borderColor: COLOR.border, borderStyle: 'dashed',
              borderRadius: 4,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 6,
            }}>
              <Text style={{ fontSize: 5.5, color: COLOR.muted, textAlign: 'center' }}>Materai</Text>
            </View>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{financeDirector?.name || '________________________'}</Text>
            <Text style={s.sigRole}>{financeDirector?.jobTitle || 'Finance & HRGA Director'}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{COMPANY.legalName}  ·  {invoice.invoiceNumber}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
