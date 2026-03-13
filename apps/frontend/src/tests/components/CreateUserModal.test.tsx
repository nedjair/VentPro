import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateUserModal } from '../../components/users/CreateUserModal'
import { userService } from '../../services/userService'
import { User } from '../../types/user'

// Mock du service utilisateur
vi.mock('../../services/userService', () => ({
  userService: {
    createUser: vi.fn(),
  },
}))

// Mock des icônes Lucide React
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="close-icon">X</div>,
  User: () => <div data-testid="user-icon">User</div>,
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  Lock: () => <div data-testid="lock-icon">Lock</div>,
  Building: () => <div data-testid="building-icon">Building</div>,
  Shield: () => <div data-testid="shield-icon">Shield</div>,
}))

// Mock du toast
vi.mock('../../components/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('CreateUserModal', () => {
  const mockOnClose = vi.fn()
  const mockOnUserCreated = vi.fn()

  const defaultProps = {
    onClose: mockOnClose,
    onUserCreated: mockOnUserCreated,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render modal with all form fields', () => {
    render(<CreateUserModal {...defaultProps} />)

    expect(screen.getByText('Créer un Utilisateur')).toBeInTheDocument()
    expect(screen.getByLabelText('Prénom')).toBeInTheDocument()
    expect(screen.getByLabelText('Nom')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmer le mot de passe')).toBeInTheDocument()
    expect(screen.getByLabelText('Rôle')).toBeInTheDocument()
    expect(screen.getByText('Créer')).toBeInTheDocument()
    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    render(<CreateUserModal {...defaultProps} />)

    const closeButton = screen.getByTestId('close-icon').parentElement!
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should call onClose when cancel button is clicked', () => {
    render(<CreateUserModal {...defaultProps} />)

    const cancelButton = screen.getByText('Annuler')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should validate required fields', async () => {
    render(<CreateUserModal {...defaultProps} />)

    const createButton = screen.getByText('Créer')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Le prénom est requis')).toBeInTheDocument()
      expect(screen.getByText('Le nom est requis')).toBeInTheDocument()
      expect(screen.getByText('L\'email est requis')).toBeInTheDocument()
      expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    render(<CreateUserModal {...defaultProps} />)

    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const createButton = screen.getByText('Créer')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Format d\'email invalide')).toBeInTheDocument()
    })
  })

  it('should validate password strength', async () => {
    render(<CreateUserModal {...defaultProps} />)

    const passwordInput = screen.getByLabelText('Mot de passe')
    fireEvent.change(passwordInput, { target: { value: 'weak' } })

    const createButton = screen.getByText('Créer')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre')).toBeInTheDocument()
    })
  })

  it('should validate password confirmation', async () => {
    render(<CreateUserModal {...defaultProps} />)

    const passwordInput = screen.getByLabelText('Mot de passe')
    const confirmPasswordInput = screen.getByLabelText('Confirmer le mot de passe')

    fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword123!' } })

    const createButton = screen.getByText('Créer')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
    })
  })

  it('should create user successfully with valid data', async () => {
    const mockCreatedUser: User = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'EMPLOYEE',
      isActive: true,
      companyId: 'company-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      company: {
        id: 'company-1',
        name: 'Test Company'
      }
    }

    vi.mocked(userService.createUser).mockResolvedValue(mockCreatedUser)

    render(<CreateUserModal {...defaultProps} />)

    // Remplir le formulaire
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'Password123!' } })
    
    const roleSelect = screen.getByLabelText('Rôle')
    fireEvent.change(roleSelect, { target: { value: 'EMPLOYEE' } })

    const createButton = screen.getByText('Créer')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(userService.createUser).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'Password123!',
        role: 'EMPLOYEE',
        companyId: expect.any(String)
      })
      expect(mockOnUserCreated).toHaveBeenCalled()
    })
  })

  it('should handle creation error', async () => {
    vi.mocked(userService.createUser).mockRejectedValue(new Error('Email déjà utilisé'))

    render(<CreateUserModal {...defaultProps} />)

    // Remplir le formulaire avec des données valides
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'existing@example.com' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'Password123!' } })

    const createButton = screen.getByText('Créer')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Email déjà utilisé')).toBeInTheDocument()
    })
  })

  it('should show loading state during creation', async () => {
    // Mock une promesse qui ne se résout pas immédiatement
    vi.mocked(userService.createUser).mockImplementation(() => new Promise(() => {}))

    render(<CreateUserModal {...defaultProps} />)

    // Remplir le formulaire
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'Password123!' } })

    const createButton = screen.getByText('Créer')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Création...')).toBeInTheDocument()
      expect(createButton).toBeDisabled()
    })
  })

  it('should display role options correctly', () => {
    render(<CreateUserModal {...defaultProps} />)

    const roleSelect = screen.getByLabelText('Rôle')
    
    expect(roleSelect).toBeInTheDocument()
    
    // Vérifier que les options sont présentes
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(4) // Option par défaut + 3 rôles
    
    expect(screen.getByRole('option', { name: 'Sélectionner un rôle' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Administrateur' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Manager' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Employé' })).toBeInTheDocument()
  })

  it('should close modal when clicking outside', () => {
    render(<CreateUserModal {...defaultProps} />)

    const modalOverlay = screen.getByRole('dialog').parentElement!
    fireEvent.click(modalOverlay)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should prevent form submission on Enter key in input fields', () => {
    render(<CreateUserModal {...defaultProps} />)

    const firstNameInput = screen.getByLabelText('Prénom')
    fireEvent.keyDown(firstNameInput, { key: 'Enter', code: 'Enter' })

    // Le formulaire ne devrait pas être soumis car les champs ne sont pas remplis
    expect(userService.createUser).not.toHaveBeenCalled()
  })
})
