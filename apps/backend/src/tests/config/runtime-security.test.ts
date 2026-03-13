import { describe, expect, it } from 'vitest'

import { buildAllowedOrigins, buildCorsConfig, validateCorsConfig } from '../../config/cors'
import {
  DEFAULT_DEVELOPMENT_JWT_SECRET,
  MINIMUM_JWT_SECRET_LENGTH,
  resolveJwtSecret,
} from '../../config/security'

describe('runtime security configuration', () => {
  it('builds an explicit allowlist from local defaults and env origins', () => {
    const origins = buildAllowedOrigins({
      CORS_ORIGIN: 'https://front.example.com, https://ops.example.com',
      FRONTEND_URL: 'https://portal.example.com',
      NEXT_PUBLIC_APP_URL_HTTPS: 'https://secure.example.com',
    })

    expect(origins).toContain('http://localhost:3000')
    expect(origins).toContain('http://127.0.0.1:3000')
    expect(origins).toContain('https://front.example.com')
    expect(origins).toContain('https://ops.example.com')
    expect(origins).toContain('https://portal.example.com')
    expect(origins).toContain('https://secure.example.com')
    expect(origins).not.toContain('null')
  })

  it('validates that the generated CORS config stays strict enough', () => {
    const corsConfig = buildCorsConfig({
      CORS_ORIGIN: 'https://front.example.com',
    })

    expect(validateCorsConfig(corsConfig)).toEqual({
      isValid: true,
      errors: [],
    })
  })

  it('uses a development fallback JWT secret when the env is missing', () => {
    expect(resolveJwtSecret({ NODE_ENV: 'development' })).toEqual({
      secret: DEFAULT_DEVELOPMENT_JWT_SECRET,
      source: 'development-fallback',
      warning: 'JWT_SECRET absent : utilisation d’un secret de développement temporaire. Configurez un secret dédié avant tout usage partagé.',
    })
  })

  it('rejects insecure JWT secrets in production', () => {
    expect(() => resolveJwtSecret({
      NODE_ENV: 'production',
      JWT_SECRET: DEFAULT_DEVELOPMENT_JWT_SECRET,
    })).toThrow('JWT_SECRET utilise encore une valeur d’exemple/dev interdite en production')
  })

  it('rejects JWT secrets that are too short in production', () => {
    expect(() => resolveJwtSecret({
      NODE_ENV: 'production',
      JWT_SECRET: 'short-secret',
    })).toThrow(`JWT_SECRET doit contenir au moins ${MINIMUM_JWT_SECRET_LENGTH} caractères en production`)
  })
})