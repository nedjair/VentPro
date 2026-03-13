/**
 * Configuration publique de l'API côté navigateur.
 *
 * Par défaut, on préfère une URL relative pour laisser Next.js proxyfier
 * `/api/v1/*` vers le backend. Cela évite les problèmes CORS et les erreurs
 * liées à `localhost` en Docker, via IP locale ou derrière un reverse proxy.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '') || ''

/**
 * Construit une URL API stable.
 *
 * - si `NEXT_PUBLIC_API_BASE_URL` est défini : appel explicite vers cette base
 * - sinon : appel relatif, géré par le rewrite Next.js
 */
export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath
}