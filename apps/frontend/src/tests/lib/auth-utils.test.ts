import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAuthTokenMock, setAuthTokenMock } = vi.hoisted(() => ({
  getAuthTokenMock: vi.fn(),
  setAuthTokenMock: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    getAuthToken: getAuthTokenMock,
    setAuthToken: setAuthTokenMock,
  },
}))

import { ensureApiAuthentication } from '@/lib/auth-utils'

describe('ensureApiAuthentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  })

  it('returns true when the API client already has a token', async () => {
    getAuthTokenMock.mockReturnValue('token-memory')

    const result = await ensureApiAuthentication()

    expect(result).toBe(true)
    expect(setAuthTokenMock).not.toHaveBeenCalled()
  })

  it('restores the token from the auth cookie when localStorage is empty', async () => {
    getAuthTokenMock.mockReturnValue(null)
    document.cookie = 'auth-token=token-cookie; path=/'

    const result = await ensureApiAuthentication()

    expect(result).toBe(true)
    expect(setAuthTokenMock).toHaveBeenCalledWith('token-cookie')
  })
})