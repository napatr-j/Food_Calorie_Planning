import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FoodCalorie',
  description: 'AI-powered food calorie tracking',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-ink">{children}</body>
    </html>
  )
}
