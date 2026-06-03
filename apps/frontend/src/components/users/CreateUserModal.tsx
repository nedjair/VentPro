import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, User, Mail, Lock, Building, Shield } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { userService } from '@/services/userService'
import { CreateUserData, UserRole } from '@/types/user'
import { useUserForm } from '@/hooks/useUserForm'
import { useCompany } from '@/hooks/useCompany'

interface CreateUserModalProps {
  onClose: () => void
  onUserCreated: () => void
}

export function CreateUserModal({ onClose, onUserCreated }: CreateUserModalProps) {
  const { user: currentUser, isLoading: authLoading } = useAuthStore()
  const { currentCompany, allCompanies } = useCompany()

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Attendre que l'authentification soit chargée
  useEffect(() => {
    if (!authLoading && currentUser) {
    }
  }, [authLoading, currentUser])

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
    mode: 'create',
    initialData: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      role: 'EMPLOYEE' as UserRole,
      companyId: currentCompany?.id || 'auto-detect'
    }
  })

  // Helper function pour définir une erreur sur un champ spécifique
  const setFieldError = (field: string, message: string) => {
    setErrors({ ...errors, [field]: message })
  }




  // Mettre à jour automatiquement le companyId quand currentCompany est chargé
  useEffect(() => {
    if (currentCompany?.id && !formData.companyId) {
      setFieldValue('companyId', currentCompany.id)
    }
  }, [currentCompany?.id, formData.companyId, setFieldValue])



  // Gestion des changements de champs avec validation en temps réel
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFieldValue(name, value)

    // Validation en temps réel
    setTimeout(() => {
      validateField(name)
    }, 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation complète avant soumission
    const fieldValidationResults = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'role']
      .map(field => ({ field, error: validateField(field) }))

    const allFieldsValid = fieldValidationResults.every(result => result.error === null)

    if (!isValid || !allFieldsValid) {
      return
    }

    try {
      setLoading(true)

      const { confirmPassword, ...userData } = formData

      // Vérifier si companyId est un CUID valide (commence par 'c' et fait ~25 caractères)
      if (!userData.companyId || userData.companyId === 'company-test' || userData.companyId.length < 20) {
        delete userData.companyId
      }

      const result = await userService.createUser(userData)
      onUserCreated()
      onClose()

    } catch (error: any) {
      console.error('❌ ERROR DETAILS:', JSON.stringify(error, null, 2))

      // Gérer les erreurs Axios avec codes de statut spécifiques
      if (error?.response?.status === 409) {
        // Erreur 409 Conflict - Email déjà existant
        const errorMessage = error?.response?.data?.message || "Un utilisateur avec cet email existe déjà"
        setFieldError('email', errorMessage)
        console.error('❌ Conflit détecté:', errorMessage)
      } else if (error?.response?.status === 400) {
        // Erreur 400 Bad Request - Données invalides
        const errorMessage = error?.response?.data?.message || "Données invalides"
        console.error('❌ Données invalides:', errorMessage)
        // Vous pouvez ajouter une logique pour afficher l'erreur générale
      } else if (error instanceof Error) {
        console.error('❌ ERROR MESSAGE:', error.message)
        console.error('❌ ERROR STACK:', error.stack)

        // Gérer les erreurs génériques
        if (error.message.includes('email')) {
          setFieldError('email', 'Erreur liée à l\'email')
        } else {
          console.error('❌ Erreur générale:', error.message)
        }
      } else {
        console.error('❌ Erreur inconnue:', error)
      }
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Créer un utilisateur</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Erreur générale */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Prénom */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Prénom *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.firstName ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Entrez le prénom"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          {/* Nom */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Nom *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.lastName ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Entrez le nom"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="exemple@entreprise.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="w-4 h-4 inline mr-1" />
              Mot de passe *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Mot de passe sécurisé"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
            <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <p className="text-blue-700 font-medium">Exigences du mot de passe :</p>
              <ul className="text-blue-600 mt-1 space-y-1">
                <li>• Au moins 8 caractères</li>
                <li>• Une majuscule (A-Z)</li>
                <li>• Une minuscule (a-z)</li>
                <li>• Un chiffre (0-9)</li>
                <li>• Un caractère spécial (!@#$%^&*+=_-)</li>
              </ul>
              <p className="text-blue-600 mt-1 font-medium">Exemple : MonMotDePasse123!</p>
            </div>
          </div>

          {/* Confirmation mot de passe */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="w-4 h-4 inline mr-1" />
              Confirmer le mot de passe *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirmez le mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Rôle */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              <Shield className="w-4 h-4 inline mr-1" />
              Rôle *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {getAvailableRoles().map(role => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </select>
          </div>

          {/* Entreprise */}
          <div>
            <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-1">
              <Building className="w-4 h-4 inline mr-1" />
              Entreprise *
            </label>

            {currentUser?.role === 'ADMIN' && allCompanies && allCompanies.length > 1 ? (
              // Liste déroulante pour les administrateurs avec plusieurs entreprises
              <select
                id="companyId"
                name="companyId"
                value={formData.companyId}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.companyId ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner une entreprise</option>
                {allCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.city || 'Ville non spécifiée'})
                  </option>
                ))}
              </select>
            ) : (
              // Affichage en lecture seule pour les autres utilisateurs
              <>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                  {currentCompany?.name || 'Chargement...'}
                  {currentCompany?.city && ` - ${currentCompany.city}`}
                </div>
                {/* Champ caché pour s'assurer que companyId est défini */}
                <input
                  type="hidden"
                  name="companyId"
                  value={formData.companyId || currentCompany?.id || ''}
                  onChange={handleInputChange}
                />
              </>
            )}

            {errors.companyId && (
              <p className="mt-1 text-sm text-red-600">{errors.companyId}</p>
            )}

            {currentUser?.role !== 'ADMIN' && (
              <p className="mt-1 text-xs text-gray-500">
                L'utilisateur sera créé dans votre entreprise : {currentCompany?.name || 'Chargement...'}
              </p>
            )}
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !isValid}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer l\'utilisateur'}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateUserModal
