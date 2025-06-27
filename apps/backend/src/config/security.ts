/**
 * Configuration de sécurité pour l'application de gestion commerciale
 */

import { FastifyInstance } from 'fastify';

export interface SecurityConfig {
  https: {
    enabled: boolean;
    port: number;
    certificatePath?: string | undefined;
    keyPath?: string | undefined;
    redirectHTTP: boolean;
  };
  headers: {
    hsts: boolean;
    contentSecurityPolicy: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
  };
  rateLimit: {
    enabled: boolean;
    max: number;
    timeWindow: string;
  };
  validation: {
    strictMode: boolean;
    sanitizeInput: boolean;
  };
}

export const securityConfig: SecurityConfig = {
  https: {
    enabled: process.env.NODE_ENV === 'production',
    port: parseInt(process.env.HTTPS_PORT || '443', 10),
    certificatePath: process.env.SSL_CERT_PATH as string | undefined,
    keyPath: process.env.SSL_KEY_PATH as string | undefined,
    redirectHTTP: true,
  },
  
  headers: {
    hsts: true,
    contentSecurityPolicy: true,
    xFrameOptions: true,
    xContentTypeOptions: true,
  },
  
  rateLimit: {
    enabled: true,
    max: 100, // 100 requêtes par fenêtre
    timeWindow: '15 minutes',
  },
  
  validation: {
    strictMode: true,
    sanitizeInput: true,
  },
};

/**
 * Configuration des headers de sécurité
 */
export function configureSecurityHeaders(server: FastifyInstance): void {
  // HSTS (HTTP Strict Transport Security)
  if (securityConfig.headers.hsts) {
    server.addHook('onSend', async (request, reply) => {
      if (request.protocol === 'https') {
        reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
    });
  }

  // Content Security Policy
  if (securityConfig.headers.contentSecurityPolicy) {
    server.addHook('onSend', async (request, reply) => {
      const csp = [
        "default-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self'",
        "img-src 'self' data: https:",
        "base-uri 'self'",
        "font-src 'self' https: data:",
        "form-action 'self'",
        "frame-ancestors 'self'",
        "object-src 'none'",
        "script-src-attr 'none'",
        "upgrade-insecure-requests"
      ].join('; ');
      
      reply.header('Content-Security-Policy', csp);
    });
  }

  // X-Frame-Options
  if (securityConfig.headers.xFrameOptions) {
    server.addHook('onSend', async (request, reply) => {
      reply.header('X-Frame-Options', 'DENY');
    });
  }

  // X-Content-Type-Options
  if (securityConfig.headers.xContentTypeOptions) {
    server.addHook('onSend', async (request, reply) => {
      reply.header('X-Content-Type-Options', 'nosniff');
    });
  }

  // Autres headers de sécurité
  server.addHook('onSend', async (request, reply) => {
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  });
}

/**
 * Configuration du rate limiting
 */
export async function configureRateLimit(server: FastifyInstance): Promise<void> {
  if (!securityConfig.rateLimit.enabled) return;

  await server.register(require('@fastify/rate-limit'), {
    max: securityConfig.rateLimit.max,
    timeWindow: securityConfig.rateLimit.timeWindow,
    errorResponseBuilder: (request: any, context: any) => {
      return {
        success: false,
        message: 'Trop de requêtes. Veuillez réessayer plus tard.',
        retryAfter: context.ttl,
      };
    },
  });
}

/**
 * Configuration HTTPS
 */
export function getHTTPSOptions(): any {
  if (!securityConfig.https.enabled) return null;

  const fs = require('fs');
  
  if (!securityConfig.https.certificatePath || !securityConfig.https.keyPath) {
    throw new Error('Certificat SSL et clé privée requis pour HTTPS');
  }

  try {
    return {
      key: fs.readFileSync(securityConfig.https.keyPath),
      cert: fs.readFileSync(securityConfig.https.certificatePath),
    };
  } catch (error) {
    throw new Error(`Erreur lors du chargement des certificats SSL: ${(error as Error).message}`);
  }
}

/**
 * Middleware de redirection HTTP vers HTTPS
 */
export function httpsRedirectMiddleware(server: FastifyInstance): void {
  if (!securityConfig.https.enabled || !securityConfig.https.redirectHTTP) return;

  server.addHook('onRequest', async (request, reply) => {
    if (request.protocol === 'http') {
      const httpsUrl = `https://${request.hostname}${request.url}`;
      reply.redirect(301, httpsUrl);
    }
  });
}

/**
 * Validation et sanitisation des entrées
 */
export function configureSanitization(server: FastifyInstance): void {
  if (!securityConfig.validation.sanitizeInput) return;

  server.addHook('preValidation', async (request) => {
    // Sanitiser les paramètres de requête
    if (request.query) {
      request.query = sanitizeObject(request.query);
    }

    // Sanitiser le body
    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeObject(request.body);
    }
  });
}

/**
 * Fonction utilitaire pour sanitiser un objet
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Supprimer les caractères potentiellement dangereux
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Log de la configuration de sécurité
 */
export function logSecurityConfig(): void {
  console.log('🔒 Configuration de sécurité :');
  console.log(`   HTTPS: ${securityConfig.https.enabled ? '✅ Activé' : '❌ Désactivé'}`);
  console.log(`   Rate Limiting: ${securityConfig.rateLimit.enabled ? '✅ Activé' : '❌ Désactivé'}`);
  console.log(`   Headers de sécurité: ${securityConfig.headers.hsts ? '✅ Activés' : '❌ Désactivés'}`);
  console.log(`   Sanitisation: ${securityConfig.validation.sanitizeInput ? '✅ Activée' : '❌ Désactivée'}`);
  
  if (securityConfig.https.enabled) {
    console.log(`   Port HTTPS: ${securityConfig.https.port}`);
    console.log(`   Redirection HTTP: ${securityConfig.https.redirectHTTP ? '✅ Activée' : '❌ Désactivée'}`);
  }
}
