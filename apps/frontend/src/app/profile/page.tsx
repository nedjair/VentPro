'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, Building, Calendar, Shield, Key, Save, Edit } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { userService } from '@/services/userService'
import { ChangePasswordModal } from '@/components/users/ChangePasswordModal'
import { toast } from '@/components/ui/toast'

interface ProfileFormData {
  firstName: string
  lastName: string
  email: string
}

export default function ProfilePage() {
  const { user: currentUser, updateUser } = useAuthStore()
  
  // États
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: ''
  })

  // Initialiser le formulaire avec les données utilisateur
  useEffect(() => {
    if (currentUser) {
      setFormData({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email
      })
    }
  }, [currentUser])

  // Gestionnaires d'événements
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUser) return
    
    try {
      setLoading(true)
      
      // Validation basique
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        toast.error('Tous les champs sont obligatoires')
        return
      }
      
      // Validation email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        toast.error('Format d\'email invalide')
        return
      }
      
      // Mettre à jour le profil
      const updatedUser = await userService.updateUser(currentUser.id, formData)
      
      // Mettre à jour le contexte d'authentification
      updateUser(updatedUser)
      
      setIsEditing(false)
      toast.success('Profil mis à jour avec succès')
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error)
      toast.error('Erreur lors de la mise à jour du profil')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (currentUser) {
      setFormData({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email
      })
    }
    setIsEditing(false)
  }

  const handlePasswordChanged = () => {
    setShowChangePasswordModal(false)
    toast.success('Mot de passe changé avec succès')
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'MANAGER':
        return 'bg-orange-100 text-orange-800'
      case 'EMPLOYEE':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
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

  if (!currentUser) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-center text-gray-600">Chargement du profil...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-gray-600">Gérez vos informations personnelles</p>
        </div>
        
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  required
                />
              </div>
              
              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </form>
          </div>
          
          {/* Sécurité */}
          <div className="bg-white rounded-lg shadow border p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sécurité</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Mot de passe</p>
                    <p className="text-sm text-gray-600">Dernière modification il y a plus de 30 jours</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Informations du compte */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations du compte</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Nom complet</p>
                  <p className="font-medium text-gray-900">
                    {currentUser.firstName} {currentUser.lastName}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{currentUser.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Rôle</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(currentUser.role)}`}>
                    {getRoleLabel(currentUser.role)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Entreprise</p>
                  <p className="font-medium text-gray-900">
                    {currentUser.company?.name || 'Non définie'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Membre depuis</p>
                  <p className="font-medium text-gray-900">
                    {new Date(currentUser.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              
              {currentUser.lastLoginAt && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Dernière connexion</p>
                    <p className="font-medium text-gray-900">
                      {new Date(currentUser.lastLoginAt).toLocaleDateString('fr-FR')} à{' '}
                      {new Date(currentUser.lastLoginAt).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Statut du compte */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statut du compte</h2>
            
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${currentUser.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`font-medium ${currentUser.isActive ? 'text-green-700' : 'text-red-700'}`}>
                {currentUser.isActive ? 'Compte actif' : 'Compte désactivé'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de changement de mot de passe */}
      {showChangePasswordModal && (
        <ChangePasswordModal
          userId={currentUser.id}
          onClose={() => setShowChangePasswordModal(false)}
          onPasswordChanged={handlePasswordChanged}
        />
      )}
    </div>
  )
}
