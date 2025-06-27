// Mock Redis pour les tests sans Redis
import { logger } from './logger'

// Mock du client Redis
export const redisClient = {
  connect: () => Promise.resolve(),
  disconnect: () => Promise.resolve(),
  on: () => {},
  get: () => Promise.resolve(null),
  set: () => Promise.resolve(),
  del: () => Promise.resolve(),
  exists: () => Promise.resolve(0),
  setEx: () => Promise.resolve(),
  keys: () => Promise.resolve([]),
}

// Mock du service Redis
export class RedisService {
  static async set(key: string, value: string, ttl?: number): Promise<void> {
    logger.info(`Mock Redis SET: ${key} = ${value} (TTL: ${ttl})`)
    // En mémoire temporaire pour les tests
    return Promise.resolve()
  }

  static async get(key: string): Promise<string | null> {
    logger.info(`Mock Redis GET: ${key}`)
    return Promise.resolve(null)
  }

  static async del(key: string): Promise<void> {
    logger.info(`Mock Redis DEL: ${key}`)
    return Promise.resolve()
  }

  static async exists(key: string): Promise<boolean> {
    logger.info(`Mock Redis EXISTS: ${key}`)
    return Promise.resolve(false)
  }

  static async setJson(key: string, value: any, ttl?: number): Promise<void> {
    logger.info(`Mock Redis SET JSON: ${key} = ${JSON.stringify(value)} (TTL: ${ttl})`)
    return Promise.resolve()
  }

  static async getJson<T>(key: string): Promise<T | null> {
    logger.info(`Mock Redis GET JSON: ${key}`)
    return Promise.resolve(null)
  }

  // Gestion des sessions utilisateur (mock)
  static async setUserSession(userId: string, sessionData: any, ttl = 86400): Promise<void> {
    logger.info(`Mock Redis SET USER SESSION: ${userId}`)
    return Promise.resolve()
  }

  static async getUserSession(userId: string): Promise<any | null> {
    logger.info(`Mock Redis GET USER SESSION: ${userId}`)
    return Promise.resolve(null)
  }

  static async deleteUserSession(userId: string): Promise<void> {
    logger.info(`Mock Redis DELETE USER SESSION: ${userId}`)
    return Promise.resolve()
  }

  // Gestion des refresh tokens (mock)
  static async setRefreshToken(userId: string, token: string, ttl = 604800): Promise<void> {
    logger.info(`Mock Redis SET REFRESH TOKEN: ${userId}`)
    return Promise.resolve()
  }

  static async getRefreshToken(userId: string): Promise<string | null> {
    logger.info(`Mock Redis GET REFRESH TOKEN: ${userId}`)
    return Promise.resolve(null)
  }

  static async deleteRefreshToken(userId: string): Promise<void> {
    logger.info(`Mock Redis DELETE REFRESH TOKEN: ${userId}`)
    return Promise.resolve()
  }

  // Cache des données (mock)
  static async cacheData(key: string, data: any, ttl = 3600): Promise<void> {
    logger.info(`Mock Redis CACHE DATA: ${key}`)
    return Promise.resolve()
  }

  static async getCachedData<T>(key: string): Promise<T | null> {
    logger.info(`Mock Redis GET CACHED DATA: ${key}`)
    return Promise.resolve(null)
  }

  static async invalidateCache(pattern: string): Promise<void> {
    logger.info(`Mock Redis INVALIDATE CACHE: ${pattern}`)
    return Promise.resolve()
  }
}

export default redisClient
