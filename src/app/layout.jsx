import './globals.css'
import Providers from '@/components/Providers'

export const metadata = {
  title: 'Watermark PM',
  description: 'Project Management System - Watermark',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-brand-50 text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
