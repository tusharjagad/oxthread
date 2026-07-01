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
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('oxthread-theme') || 'dark';
                document.documentElement.classList.add(theme);
              } catch(e) {}
            })();
          `,
        }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}