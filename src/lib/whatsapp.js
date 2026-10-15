/**
 * Kirim pesan WhatsApp via Fonnte API.
 * Docs: https://fonnte.com/docs
 *
 * Fonnte menerima nomor dalam format: 08xx, 628xx, atau +628xx
 * — semua format diterima, tidak perlu normalisasi manual.
 */
export async function sendWhatsapp({ phone, message }) {
  const token = process.env.FONNTE_TOKEN
  if (!token) return null
  if (!phone) return null

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phone,
        message,
        countryCode: '62',
      }),
    })
    const data = await res.json()
    if (!data.status) {
      console.error('[whatsapp] Fonnte error:', data)
    }
    return data
  } catch (e) {
    console.error('[whatsapp] sendWhatsapp failed:', e)
    return null
  }
}
