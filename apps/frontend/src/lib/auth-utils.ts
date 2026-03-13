'use client'

import { api } from '@/lib/api'

interface EnsureApiAuthenticationOptions {
  redirectToLogin?: boolean
  redirectPath?: string
}

function readStoredAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    // Le store d'auth persiste les jetons dans localStorage.
    const storedTokens = localStorage.getItem('auth-tokens')
    if (!storedTokens) {
      return null
    }

    const parsedTokens = JSON.parse(storedTokens)
    return parsedTokens?.accessToken || null
  } catch (error) {
    console.error('❌ Impossible de restaurer les tokens du client:', error)
    return null
  }
}

function readCookieAccessToken(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookieMatch = document.cookie.match(/(?:^|; )auth-token=([^;]+)/)
  return cookieMatch?.[1] ? decodeURIComponent(cookieMatch[1]) : null
}

export async function ensureApiAuthentication(
  options: EnsureApiAuthenticationOptions = {}
): Promise<boolean> {
  // Cas nominal : le client API a déjà le token en mémoire.
  if (api.getAuthToken()) {
    return true
  }

  const restoredToken = readStoredAccessToken() || readCookieAccessToken()
  if (restoredToken) {
    api.setAuthToken(restoredToken)
    return true
  }

  if (options.redirectToLogin && typeof window !== 'undefined') {
    const redirectPath = options.redirectPath || `${window.location.pathname}${window.location.search}`
    window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`
  }

  return false
}