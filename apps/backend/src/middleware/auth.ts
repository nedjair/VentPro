import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { JwtPayload, AuthUser } from '../types/user.js';
import { resolveJwtSecret } from '../config/security.js';

function getJwtSecret(): string {
  return resolveJwtSecret(process.env).secret;
}

function normalizeRole(role?: string): AuthUser['role'] {
  const normalizedRole = (role || 'EMPLOYEE').toUpperCase();

  if (normalizedRole === 'ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'EMPLOYEE') {
    return normalizedRole;
  }

  return 'EMPLOYEE';
}

// Étendre le type FastifyRequest pour inclure l'utilisateur
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

/**
 * Middleware d'authentification JWT
 * Vérifie la présence et la validité du token JWT dans l'en-tête Authorization
 */
export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return reply.status(401).send({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
    
    if (!token) {
      return reply.status(401).send({
        success: false,
        message: 'Format de token invalide'
      });
    }

    const jwtSecret = getJwtSecret();

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Créer l'objet utilisateur à partir du payload JWT
    const user: AuthUser = {
      id: decoded.userId,
      email: decoded.email,
      firstName: '', // Ces champs peuvent être ajoutés au JWT si nécessaire
      lastName: '',
      role: normalizeRole(decoded.role),
      companyId: decoded.companyId,
      isActive: true // Assumé actif si le token est valide
    };

    // Attacher l'utilisateur à la requête
    request.user = user;

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return reply.status(401).send({
        success: false,
        message: 'Token expiré'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return reply.status(401).send({
        success: false,
        message: 'Token invalide'
      });
    }

    request.log.error('Erreur lors de la vérification du token:', error);
    return reply.status(500).send({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
}

/**
 * Middleware d'authentification optionnel
 * Tente d'authentifier l'utilisateur mais ne rejette pas la requête si le token est absent
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return; // Pas de token, mais on continue
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return; // Token mal formaté, mais on continue
    }

    const jwtSecret = getJwtSecret();

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    const user: AuthUser = {
      id: decoded.userId,
      email: decoded.email,
      firstName: '',
      lastName: '',
      role: normalizeRole(decoded.role),
      companyId: decoded.companyId,
      isActive: true
    };

    request.user = user;

  } catch (error) {
    // En cas d'erreur, on log mais on continue sans utilisateur
    request.log.warn('Erreur lors de l\'authentification optionnelle:', error);
  }
}

/**
 * Utilitaire pour générer un token JWT
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const jwtSecret = getJwtSecret();

  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  return jwt.sign(payload, jwtSecret, { expiresIn });
}

/**
 * Utilitaire pour décoder un token sans le vérifier
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Utilitaire pour vérifier si un token est expiré
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}

/**
 * Utilitaire pour extraire l'utilisateur du token
 */
export function getUserFromToken(token: string): AuthUser | null {
  try {
    const jwtSecret = getJwtSecret();

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    return {
      id: decoded.userId,
      email: decoded.email,
      firstName: '',
      lastName: '',
      role: normalizeRole(decoded.role),
      companyId: decoded.companyId,
      isActive: true
    };
  } catch (error) {
    return null;
  }
}

/**
 * Middleware pour vérifier que l'utilisateur est actif
 */
export async function requireActiveUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      message: 'Authentification requise'
    });
  }

  if (!request.user.isActive) {
    return reply.status(403).send({
      success: false,
      message: 'Compte utilisateur désactivé'
    });
  }
}

/**
 * Plugin Fastify pour l'authentification
 */
export async function authPlugin(fastify: any) {
  // Décorer la requête avec les utilitaires d'authentification
  fastify.decorateRequest('user', null);
  
  // Ajouter les hooks d'authentification
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Ce hook peut être utilisé pour des vérifications globales
    // Par exemple, logging des requêtes authentifiées
    if (request.user) {
      request.log.info(`Requête authentifiée par l'utilisateur ${request.user.id}`);
    }
  });
}

/**
 * Utilitaire pour créer un middleware d'authentification personnalisé
 */
export function createAuthMiddleware(options: {
  required?: boolean;
  checkActive?: boolean;
} = {}) {
  const { required = true, checkActive = true } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (required) {
      await authenticateToken(request, reply);
    } else {
      await optionalAuth(request, reply);
    }

    if (checkActive && request.user) {
      await requireActiveUser(request, reply);
    }
  };
}
