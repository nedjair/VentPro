Write-Host "Creation d'un frontend Next.js minimal" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Nom du nouveau repertoire
$newFrontendDir = "frontend-nextjs-minimal"

# Supprimer l'ancien s'il existe
if (Test-Path $newFrontendDir) {
    Write-Host "Suppression de l'ancien repertoire..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $newFrontendDir
}

# Creer le nouveau repertoire
Write-Host "Creation du nouveau repertoire..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $newFrontendDir | Out-Null
Set-Location $newFrontendDir

# Creer package.json minimal
Write-Host "Creation de package.json..." -ForegroundColor Yellow
$packageJson = @"
{
  "name": "frontend-nextjs-minimal",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start -p 3003",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "axios": "^1.9.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.9",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.2"
  }
}
"@

$packageJson | Out-File -FilePath "package.json" -Encoding UTF8

# Creer next.config.js minimal
Write-Host "Creation de next.config.js..." -ForegroundColor Yellow
$nextConfig = @"
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001',
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'http://localhost:3001/:path*',
      }
    ]
  },
}

module.exports = nextConfig
"@

$nextConfig | Out-File -FilePath "next.config.js" -Encoding UTF8

# Creer tsconfig.json
Write-Host "Creation de tsconfig.json..." -ForegroundColor Yellow
$tsConfig = @"
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
"@

$tsConfig | Out-File -FilePath "tsconfig.json" -Encoding UTF8

# Creer la structure des dossiers
Write-Host "Creation de la structure des dossiers..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "src" | Out-Null
New-Item -ItemType Directory -Path "src/app" | Out-Null
New-Item -ItemType Directory -Path "public" | Out-Null

# Creer layout.tsx
Write-Host "Creation de layout.tsx..." -ForegroundColor Yellow
$layout = @"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestion Commerciale TPE',
  description: 'Application de gestion commerciale',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
"@

$layout | Out-File -FilePath "src/app/layout.tsx" -Encoding UTF8

# Creer page.tsx
Write-Host "Creation de page.tsx..." -ForegroundColor Yellow
$page = @"
'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [backendStatus, setBackendStatus] = useState('Verification...')

  useEffect(() => {
    // Tester la connexion au backend
    fetch('http://localhost:3001/health')
      .then(response => response.json())
      .then(data => {
        setBackendStatus('Backend connecte: ' + data.status)
      })
      .catch(() => {
        setBackendStatus('Backend non accessible')
      })
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏢 Gestion Commerciale TPE</h1>
      <h2>Frontend Next.js Minimal</h2>
      
      <div style={{ 
        padding: '15px', 
        margin: '20px 0', 
        backgroundColor: '#f0f0f0', 
        borderRadius: '5px' 
      }}>
        <h3>Status:</h3>
        <p>✅ Next.js: Operationnel</p>
        <p>🔗 {backendStatus}</p>
        <p>🌐 Port: 3003</p>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>🎯 Prochaines etapes:</h3>
        <ul>
          <li>Ajouter l'authentification</li>
          <li>Creer les pages de gestion</li>
          <li>Integrer les API</li>
        </ul>
      </div>
    </div>
  )
}
"@

$page | Out-File -FilePath "src/app/page.tsx" -Encoding UTF8

# Installer les dependances
Write-Host "Installation des dependances..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend Next.js minimal cree avec succes!" -ForegroundColor Green
    Write-Host "Repertoire: $newFrontendDir" -ForegroundColor Cyan
    Write-Host "Pour demarrer: cd $newFrontendDir && npm run dev" -ForegroundColor Cyan
} else {
    Write-Host "❌ Erreur lors de l'installation des dependances" -ForegroundColor Red
}

Set-Location ..
