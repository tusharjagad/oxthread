import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'OxThread — Self-Service Infrastructure Platform',
  description:
    'A production-ready DevOps Self-Service Portal for automating PostgreSQL, CI/CD Pipelines, Azure Resources, and more.',
  keywords: ['DevOps', 'Self-Service', 'Azure', 'CI/CD', 'PostgreSQL', 'Infrastructure'],
  authors: [{ name: 'OxThread' }],
  robots: 'noindex, nofollow',
  icons: { icon: '/icon.png' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
