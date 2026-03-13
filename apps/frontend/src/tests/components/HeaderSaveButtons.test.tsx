import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock, ensureApiAuthenticationMock, apiMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  ensureApiAuthenticationMock: vi.fn(),
  apiMock: {
    getSuppliers: vi.fn(),
    getSupplier: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ actions, children }: { actions?: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <div>{actions}</div>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('@/lib/auth-utils', () => ({
  ensureApiAuthentication: ensureApiAuthenticationMock,
}))

vi.mock('@/lib/api', () => ({
  api: apiMock,
}))

import { SupplierFormPage } from '@/components/pages/suppliers/supplier-form'
import { ProductFormPage } from '@/components/pages/products/product-form'

describe('Header save buttons', () => {
  let requestSubmitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    ensureApiAuthenticationMock.mockResolvedValue(true)
    apiMock.getSuppliers.mockResolvedValue({ success: true, data: { data: [] } })
    requestSubmitSpy = vi.spyOn(HTMLFormElement.prototype, 'requestSubmit').mockImplementation(() => {})
  })

  afterEach(() => {
    requestSubmitSpy.mockRestore()
  })

  it('uses requestSubmit for the supplier form header button', () => {
    render(<SupplierFormPage mode="create" />)

    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))

    expect(requestSubmitSpy).toHaveBeenCalledTimes(1)
  })

  it('uses requestSubmit for the product form header button', async () => {
    render(<ProductFormPage mode="create" />)

    await waitFor(() => {
      expect(apiMock.getSuppliers).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: /^sauvegarder$/i }))

    expect(requestSubmitSpy).toHaveBeenCalledTimes(1)
  })
})