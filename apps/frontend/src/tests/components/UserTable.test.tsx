import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserTable } from '../../components/users/UserTable'
import { User, UserRole } from '../../types/user'

// Mock des icônes Lucide React
vi.mock('lucide-react', () => ({
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  Key: () => <div data-testid="key-icon">Key</div>,
  ToggleLeft: () => <div data-testid="toggle-left-icon">ToggleLeft</div>,
  ToggleRight: () => <div data-testid="toggle-right-icon">ToggleRight</div>,
  ChevronLeft: () => <div data-testid="chevron-left-icon">ChevronLeft</div>,
  ChevronRight: () => <div data-testid="chevron-right-icon">ChevronRight</div>,
}))

describe('UserTable', () => {
  const mockUsers: User[] = [
    {
      id: '1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'EMPLOYEE' as UserRole,
      isActive: true,
      companyId: 'company-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastLoginAt: '2024-01-02T00:00:00Z',
      company: {
        id: 'company-1',
        name: 'Test Company'
      }
    },
    {
      id: '2',
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'MANAGER' as UserRole,
      isActive: false,
      companyId: 'company-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastLoginAt: null,
      company: {
        id: 'company-1',
        name: 'Test Company'
      }
    }
  ]

  const mockCurrentUser: User = {
    id: 'admin-1',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN' as UserRole,
    isActive: true,
    companyId: 'company-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-01-02T00:00:00Z',
    company: {
      id: 'company-1',
      name: 'Test Company'
    }
  }

  const mockPagination = {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  }

  const mockProps = {
    users: mockUsers,
    currentUser: mockCurrentUser,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleStatus: vi.fn(),
    onChangePassword: vi.fn(),
    pagination: mockPagination,
    onPageChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render user table with correct data', () => {
    render(<UserTable {...mockProps} />)

    // Vérifier les en-têtes
    expect(screen.getByText('Utilisateur')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Rôle')).toBeInTheDocument()
    expect(screen.getByText('Statut')).toBeInTheDocument()
    expect(screen.getByText('Entreprise')).toBeInTheDocument()
    expect(screen.getByText('Créé le')).toBeInTheDocument()
    expect(screen.getByText('Dernière connexion')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()

    // Vérifier les données des utilisateurs
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
  })

  it('should display correct role badges', () => {
    render(<UserTable {...mockProps} />)

    expect(screen.getByText('Employé')).toBeInTheDocument()
    expect(screen.getByText('Manager')).toBeInTheDocument()
  })

  it('should display correct status indicators', () => {
    render(<UserTable {...mockProps} />)

    expect(screen.getByText('Actif')).toBeInTheDocument()
    expect(screen.getByText('Inactif')).toBeInTheDocument()
  })

  it('should display company names', () => {
    render(<UserTable {...mockProps} />)

    const companyNames = screen.getAllByText('Test Company')
    expect(companyNames).toHaveLength(2)
  })

  it('should display formatted dates', () => {
    render(<UserTable {...mockProps} />)

    // Les dates sont formatées, donc on vérifie qu'elles sont présentes
    expect(screen.getByText(/01\/01\/2024/)).toBeInTheDocument()
    expect(screen.getByText(/02\/01\/2024/)).toBeInTheDocument()
    expect(screen.getByText('Jamais')).toBeInTheDocument()
  })

  it('should call onEdit when edit button is clicked', () => {
    render(<UserTable {...mockProps} />)

    const editButtons = screen.getAllByTestId('edit-icon')
    fireEvent.click(editButtons[0].parentElement!)

    expect(mockProps.onEdit).toHaveBeenCalledWith(mockUsers[0])
  })

  it('should call onChangePassword when password button is clicked', () => {
    render(<UserTable {...mockProps} />)

    const passwordButtons = screen.getAllByTestId('key-icon')
    fireEvent.click(passwordButtons[0].parentElement!)

    expect(mockProps.onChangePassword).toHaveBeenCalledWith(mockUsers[0])
  })

  it('should call onToggleStatus when toggle button is clicked', () => {
    render(<UserTable {...mockProps} />)

    const toggleButtons = screen.getAllByTestId('toggle-right-icon')
    fireEvent.click(toggleButtons[0].parentElement!)

    expect(mockProps.onToggleStatus).toHaveBeenCalledWith(mockUsers[0])
  })

  it('should call onDelete when delete button is clicked', () => {
    render(<UserTable {...mockProps} />)

    const deleteButtons = screen.getAllByTestId('trash-icon')
    fireEvent.click(deleteButtons[0].parentElement!)

    expect(mockProps.onDelete).toHaveBeenCalledWith(mockUsers[0])
  })

  it('should show pagination when there are multiple pages', () => {
    const paginationProps = {
      ...mockProps,
      pagination: {
        ...mockPagination,
        totalPages: 3,
        hasNext: true,
        hasPrev: false
      }
    }

    render(<UserTable {...paginationProps} />)

    expect(screen.getByText('Page 1 sur 3')).toBeInTheDocument()
    expect(screen.getByText('Suivant')).toBeInTheDocument()
  })

  it('should call onPageChange when pagination buttons are clicked', () => {
    const paginationProps = {
      ...mockProps,
      pagination: {
        ...mockPagination,
        page: 2,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      }
    }

    render(<UserTable {...paginationProps} />)

    const prevButton = screen.getByText('Précédent')
    const nextButton = screen.getByText('Suivant')

    fireEvent.click(prevButton)
    expect(mockProps.onPageChange).toHaveBeenCalledWith(1)

    fireEvent.click(nextButton)
    expect(mockProps.onPageChange).toHaveBeenCalledWith(3)
  })

  it('should not show action buttons for users without permissions', () => {
    const employeeUser: User = {
      ...mockCurrentUser,
      role: 'EMPLOYEE' as UserRole
    }

    const propsWithEmployee = {
      ...mockProps,
      currentUser: employeeUser
    }

    render(<UserTable {...propsWithEmployee} />)

    // Les employés ne devraient pas voir les boutons d'action
    expect(screen.queryByTestId('edit-icon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('trash-icon')).not.toBeInTheDocument()
  })

  it('should highlight current user row', () => {
    const propsWithCurrentUser = {
      ...mockProps,
      users: [...mockUsers, mockCurrentUser],
      currentUser: mockCurrentUser
    }

    render(<UserTable {...propsWithCurrentUser} />)

    expect(screen.getByText('(Vous)')).toBeInTheDocument()
  })

  it('should display empty state when no users', () => {
    const emptyProps = {
      ...mockProps,
      users: []
    }

    render(<UserTable {...emptyProps} />)

    expect(screen.getByText('Aucun utilisateur trouvé')).toBeInTheDocument()
  })

  it('should show correct toggle icons based on user status', () => {
    render(<UserTable {...mockProps} />)

    // Utilisateur actif devrait avoir l'icône ToggleRight
    expect(screen.getByTestId('toggle-right-icon')).toBeInTheDocument()
    
    // Utilisateur inactif devrait avoir l'icône ToggleLeft
    expect(screen.getByTestId('toggle-left-icon')).toBeInTheDocument()
  })

  it('should display correct button titles', () => {
    render(<UserTable {...mockProps} />)

    const editButton = screen.getAllByTestId('edit-icon')[0].parentElement!
    const passwordButton = screen.getAllByTestId('key-icon')[0].parentElement!
    const deleteButton = screen.getAllByTestId('trash-icon')[0].parentElement!

    expect(editButton).toHaveAttribute('title', 'Modifier')
    expect(passwordButton).toHaveAttribute('title', 'Changer le mot de passe')
    expect(deleteButton).toHaveAttribute('title', 'Supprimer')
  })
})
