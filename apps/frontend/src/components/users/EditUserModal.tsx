import { useState, useEffect } from 'react'
import { X, User, Mail, Shield } from 'lucide-react'
import { useAuth } from '@/stores/auth'
import { userService } from '@/services/userService'
import { User as UserType, UpdateUserData, UserRole } from '@/types/user'
import { useUserForm } from '@/hooks/useUserForm'

interface EditUserModalProps {
  user: UserType
  onClose: () => void
  onUserUpdated: () => void
}

export function EditUserModal({ user, onClose, onUserUpdated }: EditUserModalProps) {
  const { user: currentUser } = useAuth()

  const [loading, setLoading] = useState(false)

  // Utilisation du hook personnalisé pour la gestion du formulaire
  const {
    formData,
    errors,
    isValid,
    setFieldValue,
    setErrors,
    validateField,
    resetForm
  } = useUserForm({
    mode: 'edit',
    user: user,
    initialData: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive
    }
  })

  // Mettre à jour les données du formulaire quand l'utilisateur change
  useEffect(() => {
    resetForm({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive
    })
  }, [user, resetForm])

  // Gestion des changements de champs avec validation en temps réel
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFieldValue(name, checked)
    } else {
      setFieldValue(name, value)
    }

    // Validation en temps réel
    setTimeout(() => validateField(name), 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation complète avant soumission
    const allFieldsValid = ['firstName', 'lastName', 'email', 'role']
      .every(field => !validateField(field))

    if (!isValid || !allFieldsValid) {
      return
    }

    try {
      setLoading(true)

      await userService.updateUser(user.id, formData)

      onUserUpdated()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error)

      if (error.response?.data?.errors) {
        // Gérer les erreurs spécifiques du serveur
        const serverErrors: Record<string, string> = {}
        Object.entries(error.response.data.errors).forEach(([field, message]) => {
          serverErrors[field] = message as string
        })
        setErrors(serverErrors)
      } else {
        console.error('Erreur générale:', error.response?.data?.message || 'Erreur lors de la mise à jour')
      }
    } finally {
      setLoading(false)
    }
  }

  const canEditRole = () => {
    // Admin peut modifier tous les rôles
    if (currentUser?.role === 'ADMIN') return true
    
    // Manager peut modifier les employés de sa compagnie
    if (currentUser?.role === 'MANAGER') {
      return user.role === 'EMPLOYEE' && user.companyId === currentUser.companyId
    }

    return false
  }

  const canEditStatus = () => {
    // Admin peut modifier tous les statuts (sauf le sien)
    if (currentUser?.role === 'ADMIN') {
      return user.id !== currentUser.id
    }
    
    // Manager peut modifier les employés de sa compagnie
    if (currentUser?.role === 'MANAGER') {
      return user.role === 'EMPLOYEE' && user.companyId === currentUser.companyId
    }

    return false
  }

  const getAvailableRoles = (): UserRole[] => {
    if (currentUser?.role === 'ADMIN') {
      return ['ADMIN', 'MANAGER', 'EMPLOYEE']
    } else if (currentUser?.role === 'MANAGER') {
      return ['MANAGER', 'EMPLOYEE']
    }
    return ['EMPLOYEE']
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur'
      case 'MANAGER':
        return 'Manager'
      case 'EMPLOYEE':
        return 'Employé'
      default:
        return role
    }
  }

  const isOwnProfile = user.id === currentUser?.id

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isOwnProfile ? 'Modifier mon profil' : 'Modifier l\'utilisateur'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenu */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Erreur générale */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Prénom */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-2" />
              Prénom
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.firstName ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          {/* Nom */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-2" />
              Nom
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.lastName ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>

          {/* Rôle */}
          {canEditRole() && (
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                <Shield className="w-4 h-4 inline mr-2" />
                Rôle
              </label>
              <select
                id="role"
                name="role"
                value={formData.role || ''}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.role ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="">Sélectionner un rôle</option>
                {getAvailableRoles().map(role => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
            </div>
          )}

          {/* Statut actif */}
          {canEditStatus() && (
            <div>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Compte actif
                </span>
                <button
                  type="button"
                  onClick={() => setFieldValue('isActive', !formData.isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isActive ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  disabled={loading}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !isValid}
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
