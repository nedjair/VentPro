/**
 * Configuration publique de l'API côté navigateur.
 *
 * Par défaut, on préfère une URL relative pour laisser Next.js proxyfier
 * `/api/v1/*` vers le backend. Cela évite les problèmes CORS et les erreurs
 * liées à `localhost` en Docker, via IP locale ou derrière un reverse proxy.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '') || ''

const MAX_SAFE_API_LIMIT = 100

function sanitizeApiUrlQuery(path: string): string {
  const [rawPath, rawQuery = ''] = path.split('?')
  if (!rawQuery) {
    return path
  }

  const query = new URLSearchParams(rawQuery)
  const rawLimit = query.get('limit')
  if (rawLimit !== null) {
    const parsedLimit = Number.parseInt(rawLimit, 10)
    if (Number.isFinite(parsedLimit)) {
      query.set('limit', String(Math.min(Math.max(1, parsedLimit), MAX_SAFE_API_LIMIT)))
    }
  }

  const rawPage = query.get('page')
  if (rawPage !== null) {
    const parsedPage = Number.parseInt(rawPage, 10)
    if (Number.isFinite(parsedPage)) {
      query.set('page', String(Math.max(1, parsedPage)))
    }
  }

  const sanitizedQuery = query.toString()
  return sanitizedQuery ? `${rawPath}?${sanitizedQuery}` : rawPath
}

/**
 * Construit une URL API stable.
 *
 * - si `NEXT_PUBLIC_API_BASE_URL` est défini : appel explicite vers cette base
 * - sinon : appel relatif, géré par le rewrite Next.js
 */
export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const sanitizedPath = sanitizeApiUrlQuery(normalizedPath)
  return API_BASE_URL ? `${API_BASE_URL}${sanitizedPath}` : sanitizedPath
}
