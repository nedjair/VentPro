import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Pages qui nécessitent une authentification
const protectedRoutes = [
  '/dashboard',
  '/users',
  '/products',
  '/clients',
  '/suppliers',
  '/stocks',
  '/orders',
  '/invoices',
  '/payments',
  '/purchase-orders',
  '/quotes',
  '/reports',
  '/analytics',
  '/settings',
  '/profile',
  '/diagnostic',
  '/diagnostic-stock'
]

// Pages publiques (pas besoin d'authentification)
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password'
]

// Pages de test (toujours accessibles)
const testRoutes = [
  '/test-hydration',
  '/test-js',
  '/test-basic',
  '/test-minimal',
  '/test-auth'
]

// Fonction pour décoder un JWT sans vérification de signature (pour les tests)
function decodeJWT(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Token JWT invalide')
    }

    // Décoder le payload (partie 2)
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch (error) {
    throw new Error('Impossible de décoder le token JWT')
  }
}

// Fonction pour vérifier si le token est expiré
function isTokenExpired(payload: any): boolean {
  if (!payload.exp) {
    return false // Pas d'expiration définie
  }

  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp < currentTime
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permettre l'accès aux pages de test
  if (testRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Permettre l'accès aux fichiers statiques et API
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Vérifier si la route nécessite une authentification
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (!isProtectedRoute && !isPublicRoute) {
    // Route non définie, permettre l'accès
    return NextResponse.next()
  }

  // Récupérer le token depuis le cookie
  const authToken = request.cookies.get('auth-token')?.value

  // Si c'est une route protégée
  if (isProtectedRoute) {
    if (!authToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Vérifier la validité du token (décodage simple sans vérification de signature pour les tests)
    try {
      const decoded = decodeJWT(authToken)

      // Vérifier si le token est expiré
      if (isTokenExpired(decoded)) {
        throw new Error('Token expiré')
      }

      // Token valide, permettre l'accès
      return NextResponse.next()
    } catch (error) {

      // Token invalide, supprimer le cookie et rediriger
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.set('auth-token', '', {
        path: '/',
        expires: new Date(0)
      })
      return response
    }
  }

  // Si c'est une route publique et l'utilisateur est authentifié
  if (isPublicRoute && authToken) {
    try {
      const decoded = decodeJWT(authToken)

      // Vérifier si le token est expiré
      if (!isTokenExpired(decoded)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch (error) {
      // Token invalide, permettre l'accès à la route publique
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
