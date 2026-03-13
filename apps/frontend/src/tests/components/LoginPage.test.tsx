import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginPage } from '@/components/pages/login'

const replaceMock = vi.fn()
const refreshMock = vi.fn()
const loginMock = vi.fn()
const clearErrorMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: refreshMock,
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuth: () => ({
    login: loginMock,
    isLoading: false,
    error: null,
    clearError: clearErrorMock,
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.pushState({}, '', '/login')
  })

  it('uses the auth store and redirects to the requested page after login', async () => {
    loginMock.mockResolvedValue(undefined)
    window.history.pushState({}, '', '/login?redirect=%2Forders')

    render(<LoginPage />)

    await screen.findByText('Connexion à votre compte')
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(clearErrorMock).toHaveBeenCalled()
      expect(loginMock).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'admin123',
        rememberMe: false,
      })
      expect(replaceMock).toHaveBeenCalledWith('/orders')
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('does not redirect when the auth store rejects the login', async () => {
    loginMock.mockRejectedValue(new Error('Authentification refusée'))

    render(<LoginPage />)

    await screen.findByText('Connexion à votre compte')
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledTimes(1)
    })

    expect(replaceMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
  })
})

