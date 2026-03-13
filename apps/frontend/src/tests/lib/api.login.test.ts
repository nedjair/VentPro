import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

describe('api.login', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('returns the backend authentication message without exposing the HTTP prefix', async () => {
    // Le backend métier renvoie une 401 JSON : l'UI doit afficher le message utile.
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        success: false,
        message: 'Email ou mot de passe incorrect',
      })),
    } as unknown as Response)

    await expect(api.login({ email: 'admin@example.com', password: 'wrong-password' }))
      .rejects
      .toThrow('Email ou mot de passe incorrect')

    // Sans variable publique, le frontend doit passer par le proxy Next.js.
    expect(fetch).toHaveBeenCalledWith('/api/v1/auth/login', expect.any(Object))
  })

  it('maps browser fetch failures to a clear French login error message', async () => {
    // Une erreur réseau/CORS ne doit plus remonter telle quelle en "Failed to fetch".
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(api.login({ email: 'admin@example.com', password: 'admin123' }))
      .rejects
      .toThrow('Impossible de joindre le serveur de connexion. Vérifiez que le backend est démarré et que la configuration réseau/CORS est correcte.')
  })
})