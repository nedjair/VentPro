import { describe, expect, it, vi } from 'vitest'

async function loadApiConfig(publicApiBaseUrl?: string) {
  vi.resetModules()

  if (publicApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = publicApiBaseUrl
  }

  return import('@/lib/api-config')
}

describe('api-config', () => {
  it('uses relative API paths by default to let Next.js handle rewrites', async () => {
    const { API_BASE_URL, buildApiUrl } = await loadApiConfig()

    expect(API_BASE_URL).toBe('')
    expect(buildApiUrl('/api/v1/auth/login')).toBe('/api/v1/auth/login')
  })

  it('normalizes explicit public API bases by trimming the trailing slash', async () => {
    const { API_BASE_URL, buildApiUrl } = await loadApiConfig('https://api.example.com/')

    expect(API_BASE_URL).toBe('https://api.example.com')
    expect(buildApiUrl('api/v1/quotes')).toBe('https://api.example.com/api/v1/quotes')
  })
})