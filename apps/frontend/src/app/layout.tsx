import './globals.css'
import { DM_Sans, Outfit } from 'next/font/google'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/components/ui/toast'
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata = {
  title: 'Gestion Commerciale TPE',
  description: 'Application de gestion commerciale pour TPE',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#F7F8FC" />
      </head>
      <body className={`${dmSans.variable} ${outfit.variable} min-h-screen transition-colors duration-300`}>
        <ChunkErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              {children}
              <ToastProvider />
            </AuthProvider>
          </ThemeProvider>
        </ChunkErrorBoundary>
      </body>
    </html>
  )
}
