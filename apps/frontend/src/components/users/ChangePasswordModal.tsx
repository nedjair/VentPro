import { useState } from 'react'
import { X, Eye, EyeOff, Lock, Shield } from 'lucide-react'
import { userService } from '@/services/userService'
import { usePasswordForm } from '@/hooks/useUserForm'

interface ChangePasswordModalProps {
  user: { id: string }
  onClose: () => void
  onPasswordChanged: () => void
}

export function ChangePasswordModal({ user, onClose, onPasswordChanged }: ChangePasswordModalProps) {
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Utilisation du hook personnalisé pour la gestion du formulaire
  const {
    formData,
    errors,
    isValid,
    setFieldValue,
    validateField,
    validateForm,
    resetForm
  } = usePasswordForm()

  // Gestion des changements de champs avec validation en temps réel
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFieldValue(name, value)

    // Validation en temps réel
    setTimeout(() => validateField(name), 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation complète avant soumission
    if (!validateForm()) {
      return
    }

    // Vérifier que tous les champs sont remplis
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      return
    }

    try {
      setLoading(true)

      await userService.changePassword(user.id, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      })
      resetForm()
      onPasswordChanged()

    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error)

      if (error instanceof Error) {
        alert(`Erreur: ${error.message}`)
      } else {
        alert('Erreur inconnue lors du changement de mot de passe')
      }
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ]
    
    strength = checks.filter(Boolean).length
    
    if (strength <= 2) return { level: 'Faible', color: 'bg-red-500', width: '20%' }
    if (strength <= 3) return { level: 'Moyen', color: 'bg-yellow-500', width: '60%' }
    if (strength <= 4) return { level: 'Bon', color: 'bg-blue-500', width: '80%' }
    return { level: 'Excellent', color: 'bg-green-500', width: '100%' }
  }

  const passwordStrength = getPasswordStrength(formData.newPassword)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Changer le mot de passe</h2>
          </div>
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

          {/* Information de sécurité */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Sécurité du mot de passe</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Choisissez un mot de passe fort pour protéger votre compte. 
                  Évitez d'utiliser des informations personnelles facilement devinables.
                </p>
              </div>
            </div>
          </div>

          {/* Mot de passe actuel */}
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="w-4 h-4 inline mr-1" />
              Mot de passe actuel *
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Entrez votre mot de passe actuel"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
            )}
          </div>

          {/* Nouveau mot de passe */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="w-4 h-4 inline mr-1" />
              Nouveau mot de passe *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.newPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Entrez votre nouveau mot de passe"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
            )}
            
            {/* Indicateur de force du mot de passe */}
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Force du mot de passe:</span>
                  <span className={`text-xs font-medium ${
                    passwordStrength.level === 'Faible' ? 'text-red-600' :
                    passwordStrength.level === 'Moyen' ? 'text-yellow-600' :
                    passwordStrength.level === 'Bon' ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {passwordStrength.level}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: passwordStrength.width }}
                  ></div>
                </div>
              </div>
            )}
            
            <p className="mt-1 text-xs text-gray-500">
              8+ caractères, majuscule, minuscule, chiffre et caractère spécial
            </p>
          </div>

          {/* Confirmation nouveau mot de passe */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="w-4 h-4 inline mr-1" />
              Confirmer le nouveau mot de passe *
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
                placeholder="Confirmez votre nouveau mot de passe"
                autoComplete="new-password"
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

          {/* Conseils de sécurité */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Conseils pour un mot de passe sécurisé :</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Utilisez au moins 8 caractères</li>
              <li>• Mélangez majuscules et minuscules</li>
              <li>• Incluez des chiffres et des caractères spéciaux</li>
              <li>• Évitez les informations personnelles</li>
              <li>• N'utilisez pas le même mot de passe ailleurs</li>
            </ul>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !isValid}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changement...' : 'Changer le mot de passe'}
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
