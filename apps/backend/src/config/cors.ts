import { logger } from '../utils/logger'

/**
 * Configuration CORS centralisée pour l'application de gestion commerciale.
 * Cette configuration garantit une liste d'origines explicite et compatible
 * avec le frontend Next.js en local, Docker et production.
 */

export interface CorsConfig {
  allowedOrigins: string[]
  credentials: boolean
  methods: string[]
  allowedHeaders: string[]
  maxAge?: number
}

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

const CORS_ENV_KEYS = [
  'CORS_ORIGIN',
  'FRONTEND_URL',
  'FRONTEND_URL_HTTPS',
  'NEXT_PUBLIC_APP_URL_PRODUCTION',
  'NEXT_PUBLIC_APP_URL_HTTPS',
] as const

function splitOrigins(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== 'null')
}

export function buildAllowedOrigins(runtimeEnv: NodeJS.ProcessEnv = process.env): string[] {
  const origins = new Set(DEFAULT_ALLOWED_ORIGINS)

  for (const envKey of CORS_ENV_KEYS) {
    for (const origin of splitOrigins(runtimeEnv[envKey])) {
      origins.add(origin)
    }
  }

  return Array.from(origins)
}

export function buildCorsConfig(runtimeEnv: NodeJS.ProcessEnv = process.env): CorsConfig {
  return {
    allowedOrigins: buildAllowedOrigins(runtimeEnv),
    credentials: true,
    methods: [
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'OPTIONS',
      'HEAD',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name',
    ],
    // Cache des preflight requests pour 24h.
    maxAge: 86400,
  }
}

export const corsConfig: CorsConfig = buildCorsConfig()

/**
 * Fonction utilitaire pour vérifier si une origine est autorisée
 */
export function isOriginAllowed(origin: string | undefined, config: CorsConfig = corsConfig): boolean {
  if (!origin) return false
  return config.allowedOrigins.includes(origin)
}

/**
 * Fonction utilitaire pour obtenir l'origine autorisée
 * Retourne l'origine si elle est autorisée, sinon le fallback
 */
export function getAllowedOrigin(origin: string | undefined, config: CorsConfig = corsConfig): string {
  if (origin && isOriginAllowed(origin, config)) {
    return origin
  }
  // Si l'origine n'est pas autorisée, ne pas renvoyer d'origine (désactiver CORS)
  return ''
}

/**
 * Headers CORS standardisés pour les réponses manuelles
 */
export function setCorsHeaders(reply: any, origin?: string): void {
  const allowedOrigin = getAllowedOrigin(origin)
  
  if (allowedOrigin) {
    reply.header('Access-Control-Allow-Origin', allowedOrigin)
  }
  reply.header('Access-Control-Allow-Methods', corsConfig.methods.join(', '))
  reply.header('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '))
  reply.header('Access-Control-Allow-Credentials', 'true')
  
  if (corsConfig.maxAge) {
    reply.header('Access-Control-Max-Age', corsConfig.maxAge.toString())
  }
}

/**
 * Configuration pour le plugin @fastify/cors
 */
export const fastifyCorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permettre les requêtes sans origine (ex: Postman, applications mobiles).
    if (!origin) {
      callback(null, true)
      return
    }

    callback(null, isOriginAllowed(origin))
  },
  credentials: corsConfig.credentials,
  methods: corsConfig.methods,
  allowedHeaders: corsConfig.allowedHeaders,
  maxAge: corsConfig.maxAge,
  strictPreflight: true,
  logLevel: 'silent',
  optionsSuccessStatus: 204, // Pour les anciens navigateurs.
}

/**
 * Middleware CORS manuel pour les cas spéciaux
 */
export async function corsMiddleware(request: any, reply: any): Promise<void> {
  const origin = request.headers.origin
  
  // Définir les headers CORS
  setCorsHeaders(reply, origin)
  
  // Gérer les requêtes OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    reply.code(200).send()
    return
  }
}

/**
 * Validation de la configuration CORS
 */
export function validateCorsConfig(config: CorsConfig = corsConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (config.allowedOrigins.length === 0) {
    errors.push('Aucune origine autorisée configurée')
  }
  
  if (!config.allowedOrigins.includes('http://localhost:3000')) {
    errors.push('Port 3000 manquant dans les origines autorisées')
  }

  if (config.allowedOrigins.includes('null')) {
    errors.push('Origine spéciale null interdite dans la configuration CORS')
  }
  
  if (config.methods.length === 0) {
    errors.push('Aucune méthode HTTP autorisée')
  }
  
  if (!config.methods.includes('GET') || !config.methods.includes('POST')) {
    errors.push('Méthodes HTTP de base manquantes (GET, POST)')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Log de la configuration CORS pour le debugging
 */
export function logCorsConfig(): void {
  if (process.env.LOG_CORS_CONFIG !== 'true') {
    return
  }

  const validation = validateCorsConfig()
  logger.info({
    allowedOrigins: corsConfig.allowedOrigins,
    methods: corsConfig.methods,
    allowedHeaders: corsConfig.allowedHeaders,
    credentials: corsConfig.credentials,
    maxAge: corsConfig.maxAge,
  }, 'Configuration CORS')

  if (!validation.isValid) {
    logger.warn({ errors: validation.errors }, 'Problèmes de configuration CORS détectés')
  }
}
