'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import QuotationForm from '@/components/QuotationForm'

function NewQuotationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  return (
    <QuotationForm
      initial={projectId ? { projectId } : null}
      onSaved={(q) => {
        // If came from a project page, go back to that project's quotation tab
        if (projectId) {
          router.push(`/projects/${projectId}?tab=quotation`)
        } else {
          router.push(`/quotation/${q.id}`)
        }
      }}
      onCancel={() => {
        if (projectId) router.push(`/projects/${projectId}?tab=quotation`)
        else router.back()
      }}
    />
  )
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={null}>
      <NewQuotationContent />
    </Suspense>
  )
}
