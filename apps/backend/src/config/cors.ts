/**
 * Configuration CORS centralisée pour l'application de gestion commerciale
 * Cette configuration garantit la cohérence entre tous les serveurs backend
 */

export interface CorsConfig {
  allowedOrigins: string[]
  credentials: boolean
  methods: string[]
  allowedHeaders: string[]
  maxAge?: number
}

/**
 * Configuration CORS standardisée
 * Port 3000 pour le frontend Next.js en production
 * Port 3001 pour le backend Fastify
 */
export const corsConfig: CorsConfig = {
  allowedOrigins: [
    // Frontend Next.js - Port standardisé 3000
    'http://localhost:3000',
    'http://127.0.0.1:3000',

    // Variables d'environnement pour la production
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.NEXT_PUBLIC_APP_URL_PRODUCTION,

    // Support pour HTTPS en production
    process.env.FRONTEND_URL_HTTPS,
    process.env.NEXT_PUBLIC_APP_URL_HTTPS,

    // TEMPORAIRE: Frontend sur port 3002 pour tests
    'http://localhost:3002',
    'http://127.0.0.1:3002',

    // TEMPORAIRE: Backend sur port 3003 pour éviter les conflits
    'http://localhost:3003',
    'http://127.0.0.1:3003',

    // AJOUT: Support pour le port 3001 (souvent utilisé pour les tests)
    'http://localhost:3001',
    'http://127.0.0.1:3001',

    // AJOUT: Support pour le port 3004 et 3005 (environnements de test)
    'http://localhost:3004',
    'http://127.0.0.1:3004',
    'http://localhost:3005',
    'http://127.0.0.1:3005',

    // TEMPORAIRE: Autoriser les requêtes depuis des fichiers locaux pour les tests
    'null',
  ].filter(Boolean) as string[], // Enlever les valeurs undefined/null

  credentials: true,
  
  methods: [
    'GET',
    'POST', 
    'PUT',
    'DELETE',
    'PATCH',
    'OPTIONS',
    'HEAD'
  ],
  
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  
  // Cache des preflight requests pour 24h
  maxAge: 86400
}

/**
 * Fonction utilitaire pour vérifier si une origine est autorisée
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false
  return corsConfig.allowedOrigins.includes(origin)
}

/**
 * Fonction utilitaire pour obtenir l'origine autorisée
 * Retourne l'origine si elle est autorisée, sinon le fallback
 */
export function getAllowedOrigin(origin: string | undefined): string {
  if (origin && isOriginAllowed(origin)) {
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
    console.log(`🔍 CORS Check - Origin reçue: ${origin || 'undefined'}`);

    // Permettre les requêtes sans origine (ex: Postman, applications mobiles)
    if (!origin) {
      console.log(`✅ CORS - Requête sans origine autorisée`);
      callback(null, true);
      return;
    }

    // En développement, être plus permissif
    if (process.env.NODE_ENV === 'development') {
      // Autoriser tous les localhost et 127.0.0.1
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        console.log(`✅ CORS - Origine localhost autorisée: ${origin}`);
        callback(null, true);
        return;
      }
    }

    // Vérifier si l'origine est autorisée
    if (corsConfig.allowedOrigins.includes(origin)) {
      console.log(`✅ CORS - Origine autorisée: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`🚫 CORS - Origine non autorisée: ${origin}`);
      console.log(`📋 CORS - Origines autorisées: ${corsConfig.allowedOrigins.join(', ')}`);
      callback(null, false);
    }
  },
  credentials: corsConfig.credentials,
  methods: corsConfig.methods,
  allowedHeaders: corsConfig.allowedHeaders,
  maxAge: corsConfig.maxAge,
  optionsSuccessStatus: 204 // Pour les anciens navigateurs
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
export function validateCorsConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (corsConfig.allowedOrigins.length === 0) {
    errors.push('Aucune origine autorisée configurée')
  }
  
  if (!corsConfig.allowedOrigins.includes('http://localhost:3000')) {
    errors.push('Port 3000 manquant dans les origines autorisées')
  }
  
  if (corsConfig.methods.length === 0) {
    errors.push('Aucune méthode HTTP autorisée')
  }
  
  if (!corsConfig.methods.includes('GET') || !corsConfig.methods.includes('POST')) {
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
  console.log('🔒 Configuration CORS:')
  console.log('   Origines autorisées:', corsConfig.allowedOrigins)
  console.log('   Méthodes:', corsConfig.methods.join(', '))
  console.log('   Headers autorisés:', corsConfig.allowedHeaders.join(', '))
  console.log('   Credentials:', corsConfig.credentials)
  console.log('   Max Age:', corsConfig.maxAge)
  
  const validation = validateCorsConfig()
  if (!validation.isValid) {
    console.warn('⚠️ Problèmes de configuration CORS détectés:')
    validation.errors.forEach(error => console.warn('   -', error))
  } else {
    console.log('✅ Configuration CORS valide')
  }
}
