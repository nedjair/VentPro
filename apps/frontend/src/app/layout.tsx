import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Gestion Commerciale TPE',
    template: '%s | Gestion Commerciale TPE'
  },
  description: 'Application de gestion commerciale pour TPE - Dashboard, clients, produits, facturation',
  keywords: ['gestion', 'commercial', 'TPE', 'clients', 'produits', 'facturation'],
  authors: [{ name: 'Équipe Développement' }],
  creator: 'Gestion Commerciale TPE',
  publisher: 'Gestion Commerciale TPE',
  robots: {
    index: false,
    follow: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1d4ed8' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="application-name" content="Gestion Commerciale TPE" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
