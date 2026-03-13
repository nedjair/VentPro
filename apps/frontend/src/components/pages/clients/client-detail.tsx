'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Building2, User, Calendar } from 'lucide-react'
import { api, Client } from '@/lib/api'

interface ClientDetailPageProps {
  clientId: string
}

export function ClientDetailPage({ clientId }: ClientDetailPageProps) {
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadClient()
  }, [clientId])

  const loadClient = async () => {
    try {
      setLoading(true)
      console.log('🔍 Chargement du client:', clientId)
      
      const response = await api.getClient(clientId)
      
      if (response.success && response.data) {
        setClient(response.data)
        setError(null)
      } else {
        throw new Error('Client non trouvé')
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement du client:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    router.push(`/clients/${clientId}/edit`)
  }

  const handleDelete = async () => {
    if (!client) return
    
    const clientName = client.type === 'COMPANY' 
      ? client.companyName 
      : `${client.firstName} ${client.lastName}`
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le client "${clientName}" ?\n\nCette action est irréversible.`)) {
      try {
        console.log('Suppression du client:', clientId)
        await api.deleteClient(clientId)
        console.log('✅ Client supprimé avec succès')
        router.push('/clients')
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error)
        setError('Erreur lors de la suppression du client')
      }
    }
  }

  const handleBack = () => {
    router.push('/clients')
  }

  if (loading) {
    return (
      <MainLayout title="Détails du client" subtitle="Chargement...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Chargement des données...</span>
        </div>
      </MainLayout>
    )
  }

  if (error || !client) {
    return (
      <MainLayout title="Détails du client" subtitle="Erreur">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <Trash2 className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Client non trouvé</h3>
          <p className="text-gray-600 mb-6">{error || 'Le client demandé n\'existe pas.'}</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
        </div>
      </MainLayout>
    )
  }

  const clientName = client.type === 'COMPANY' 
    ? client.companyName 
    : `${client.firstName} ${client.lastName}`

  return (
    <MainLayout 
      title={clientName || 'Client'} 
      subtitle={`Détails du client • ${client.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}`}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Informations principales */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-6">
            <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
              {client.type === 'COMPANY' ? (
                <Building2 className="h-8 w-8 text-white" />
              ) : (
                <User className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">{clientName}</h2>
              <p className="text-gray-600">
                {client.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">{client.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Adresse */}
            {(client.address || client.city || client.country) && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Adresse</h3>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div className="text-gray-900">
                    {client.address && <div>{client.address}</div>}
                    <div>
                      {client.city && client.postalCode 
                        ? `${client.postalCode} ${client.city}`
                        : client.city || client.postalCode
                      }
                    </div>
                    {client.country && <div>{client.country}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Informations détaillées */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Informations détaillées</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {client.type === 'INDIVIDUAL' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prénom</label>
                  <p className="mt-1 text-gray-900">{client.firstName || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom</label>
                  <p className="mt-1 text-gray-900">{client.lastName || '-'}</p>
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Nom de l'entreprise</label>
                <p className="mt-1 text-gray-900">{client.companyName || '-'}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Type de client</label>
              <p className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  client.type === 'COMPANY' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {client.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                </span>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Date de création</label>
              <div className="mt-1 flex items-center text-gray-900">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                {new Date(client.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {client.notes && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500">
              Vous pouvez revenir à la liste, modifier cette fiche ou supprimer le client si nécessaire.
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la liste
              </Button>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>

        {/* Historique des commandes/factures (placeholder) */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Historique</h3>
          <div className="text-center py-8 text-gray-500">
            <p>Aucun historique de commandes ou factures pour ce client.</p>
            <p className="text-sm mt-2">Cette fonctionnalité sera bientôt disponible.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
