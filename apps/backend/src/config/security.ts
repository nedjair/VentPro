/**
 * Configuration sécurité centralisée.
 *
 * Objectif : éviter que plusieurs morceaux du backend appliquent des règles
 * différentes pour la résolution du secret JWT.
 */

export const MINIMUM_JWT_SECRET_LENGTH = 32
export const DEFAULT_DEVELOPMENT_JWT_SECRET = 'change-this-development-jwt-secret-min-32-chars'

const KNOWN_INSECURE_JWT_SECRETS = new Set([
  'your-secret-key-change-in-production',
  'your_jwt_secret_key_here_2024',
  'your_jwt_refresh_secret_key_here_2024',
  'your-super-secret-jwt-key-change-in-production-min-32-chars',
  'your-super-secret-refresh-key-change-in-production-min-32-chars',
  DEFAULT_DEVELOPMENT_JWT_SECRET,
])

export interface JwtSecretResolution {
  secret: string
  source: 'environment' | 'development-fallback'
  warning?: string
}

function isProductionEnvironment(runtimeEnv: NodeJS.ProcessEnv): boolean {
  return (runtimeEnv.NODE_ENV || '').trim().toLowerCase() === 'production'
}

/**
 * Résout le secret JWT à utiliser.
 *
 * - en production : secret obligatoire, non trivial et suffisamment long
 * - hors production : fallback dev autorisé pour ne pas casser le local
 */
export function resolveJwtSecret(runtimeEnv: NodeJS.ProcessEnv = process.env): JwtSecretResolution {
  const configuredSecret = runtimeEnv.JWT_SECRET?.trim()
  const isProduction = isProductionEnvironment(runtimeEnv)

  if (!configuredSecret) {
    if (isProduction) {
      throw new Error('JWT_SECRET est obligatoire en production')
    }

    return {
      secret: DEFAULT_DEVELOPMENT_JWT_SECRET,
      source: 'development-fallback',
      warning: 'JWT_SECRET absent : utilisation d’un secret de développement temporaire. Configurez un secret dédié avant tout usage partagé.',
    }
  }

  if (configuredSecret.length < MINIMUM_JWT_SECRET_LENGTH) {
    if (isProduction) {
      throw new Error(`JWT_SECRET doit contenir au moins ${MINIMUM_JWT_SECRET_LENGTH} caractères en production`)
    }

    return {
      secret: configuredSecret,
      source: 'environment',
      warning: `JWT_SECRET est plus court que ${MINIMUM_JWT_SECRET_LENGTH} caractères : acceptable en développement, déconseillé autrement.`,
    }
  }

  if (KNOWN_INSECURE_JWT_SECRETS.has(configuredSecret)) {
    if (isProduction) {
      throw new Error('JWT_SECRET utilise encore une valeur d’exemple/dev interdite en production')
    }

    return {
      secret: configuredSecret,
      source: 'environment',
      warning: 'JWT_SECRET correspond à une valeur d’exemple/dev. Remplacez-le avant un déploiement partagé.',
    }
  }

  return {
    secret: configuredSecret,
    source: 'environment',
  }
}