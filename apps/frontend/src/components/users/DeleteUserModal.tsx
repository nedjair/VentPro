import { useState } from 'react'
import { X, AlertTriangle, Trash2 } from 'lucide-react'
import { userService } from '@/services/userService'
import { User } from '@/types/user'

interface DeleteUserModalProps {
  user: User
  onClose: () => void
  onUserDeleted: () => void
}

export function DeleteUserModal({ user, onClose, onUserDeleted }: DeleteUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const expectedConfirmText = `${user.firstName} ${user.lastName}`

  const handleDelete = async () => {
    if (confirmText !== expectedConfirmText) {
      setError('Le nom complet ne correspond pas')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      await userService.deleteUser(user.id)
      onUserDeleted()
      
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error)
      
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Erreur lors de la suppression de l\'utilisateur')
      }
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Supprimer l'utilisateur</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Avertissement */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Action irréversible</h3>
                <p className="text-sm text-red-700 mt-1">
                  Cette action supprimera définitivement l'utilisateur et toutes ses données associées. 
                  Cette opération ne peut pas être annulée.
                </p>
              </div>
            </div>
          </div>

          {/* Informations utilisateur */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-lg font-medium text-gray-700">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getRoleLabel(user.role)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Informations supplémentaires */}
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Entreprise:</span>
              <span className="font-medium">{user.company?.name || 'Non définie'}</span>
            </div>
            <div className="flex justify-between">
              <span>Créé le:</span>
              <span className="font-medium">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
            {user.lastLoginAt && (
              <div className="flex justify-between">
                <span>Dernière connexion:</span>
                <span className="font-medium">{new Date(user.lastLoginAt).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>

          {/* Confirmation */}
          <div>
            <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 mb-2">
              Pour confirmer la suppression, tapez le nom complet de l'utilisateur :
            </label>
            <p className="text-sm text-gray-600 mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                {expectedConfirmText}
              </code>
            </p>
            <input
              type="text"
              id="confirmText"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value)
                if (error) setError(null)
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Tapez le nom complet ici"
              autoComplete="off"
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Conséquences */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Conséquences de la suppression :</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• L'utilisateur ne pourra plus se connecter</li>
              <li>• Toutes ses données personnelles seront supprimées</li>
              <li>• Ses actions passées resteront dans l'historique</li>
              <li>• Cette action ne peut pas être annulée</li>
            </ul>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          
          <button
            onClick={handleDelete}
            disabled={loading || confirmText !== expectedConfirmText}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {loading ? 'Suppression...' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </div>
  )
}
