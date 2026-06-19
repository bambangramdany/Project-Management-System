'use client'
import { useRouter } from 'next/navigation'
import QuotationForm from '@/components/QuotationForm'

export default function NewQuotationPage() {
  const router = useRouter()
  return (
    <QuotationForm
      onSaved={(q) => router.push(`/quotation/${q.id}`)}
      onCancel={() => router.back()}
    />
  )
}
