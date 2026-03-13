'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { 
  Shield, User, Users, Crown, 
  Eye, Edit, Trash2, Plus, Package,
  CheckCircle, XCircle, AlertTriangle
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface PermissionTest {
  action: string
  description: string
  admin: boolean
  manager: boolean
  employee: boolean
  icon: React.ComponentType<any>
}

const permissionTests: PermissionTest[] = [
  {
    action: 'Voir les commandes',
    description: 'Consulter la liste des commandes fournisseurs',
    admin: true,
    manager: true,
    employee: true,
    icon: Eye
  },
  {
    action: 'Créer une commande',
    description: 'Créer une nouvelle commande fournisseur',
    admin: true,
    manager: true,
    employee: false,
    icon: Plus
  },
  {
    action: 'Modifier une commande',
    description: 'Modifier une commande existante (statut brouillon)',
    admin: true,
    manager: true,
    employee: false,
    icon: Edit
  },
  {
    action: 'Supprimer une commande',
    description: 'Supprimer une commande sans réception',
    admin: true,
    manager: true,
    employee: false,
    icon: Trash2
  },
  {
    action: 'Confirmer une commande',
    description: 'Changer le statut de brouillon à commandé',
    admin: true,
    manager: true,
    employee: false,
    icon: CheckCircle
  },
  {
    action: 'Réceptionner des marchandises',
    description: 'Enregistrer la réception de marchandises',
    admin: true,
    manager: true,
    employee: true,
    icon: Package
  },
  {
    action: 'Voir les statistiques',
    description: 'Accéder aux rapports et statistiques',
    admin: true,
    manager: true,
    employee: false,
    icon: Users
  },
  {
    action: 'Exporter des données',
    description: 'Exporter les commandes en PDF/Excel',
    admin: true,
    manager: true,
    employee: false,
    icon: Users
  },
  {
    action: 'Gérer les fournisseurs',
    description: 'Ajouter/modifier les informations fournisseurs',
    admin: true,
    manager: true,
    employee: false,
    icon: Users
  },
  {
    action: 'Annuler une commande',
    description: 'Annuler une commande confirmée',
    admin: true,
    manager: false,
    employee: false,
    icon: XCircle
  }
]

export function PermissionTest() {
  const { user } = useAuth()
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>(
    user?.role || 'EMPLOYEE'
  )

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'MANAGER':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'EMPLOYEE':
        return <User className="h-4 w-4 text-gray-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="default" className="bg-yellow-600">Administrateur</Badge>
      case 'MANAGER':
        return <Badge variant="default" className="bg-blue-600">Manager</Badge>
      case 'EMPLOYEE':
        return <Badge variant="outline">Employé</Badge>
      default:
        return <Badge variant="secondary">Inconnu</Badge>
    }
  }

  const hasPermission = (test: PermissionTest, role: string): boolean => {
    switch (role) {
      case 'ADMIN':
        return test.admin
      case 'MANAGER':
        return test.manager
      case 'EMPLOYEE':
        return test.employee
      default:
        return false
    }
  }

  const getPermissionIcon = (hasAccess: boolean) => {
    return hasAccess ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  const getPermissionBadge = (hasAccess: boolean) => {
    return hasAccess ? (
      <Badge variant="default" className="bg-green-600">Autorisé</Badge>
    ) : (
      <Badge variant="destructive">Interdit</Badge>
    )
  }

  const getStats = () => {
    const total = permissionTests.length
    const allowed = permissionTests.filter(test => hasPermission(test, selectedRole)).length
    const denied = total - allowed
    
    return { total, allowed, denied }
  }

  const stats = getStats()

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Test des Permissions</h2>
          <p className="text-gray-600">Vérification des droits d'accès par rôle utilisateur</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Utilisateur actuel:</span>
            {user ? (
              <div className="flex items-center gap-2">
                {getRoleIcon(user.role)}
                {getRoleBadge(user.role)}
              </div>
            ) : (
              <Badge variant="secondary">Non connecté</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Sélecteur de rôle pour simulation */}
      <Card>
        <CardHeader>
          <CardTitle>Simulation de rôle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Tester avec le rôle:</span>
            <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    Administrateur
                  </div>
                </SelectItem>
                <SelectItem value="MANAGER">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Manager
                  </div>
                </SelectItem>
                <SelectItem value="EMPLOYEE">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    Employé
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Actions totales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.allowed}</div>
            <div className="text-sm text-gray-600">Autorisées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.denied}</div>
            <div className="text-sm text-gray-600">Interdites</div>
          </CardContent>
        </Card>
      </div>

      {/* Matrice des permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Matrice des permissions pour {selectedRole}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {permissionTests.map((test, index) => {
              const hasAccess = hasPermission(test, selectedRole)
              const Icon = test.icon
              
              return (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    hasAccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">{test.action}</h4>
                        <p className="text-sm text-gray-600">{test.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPermissionIcon(hasAccess)}
                      {getPermissionBadge(hasAccess)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tableau comparatif */}
      <Card>
        <CardHeader>
          <CardTitle>Comparaison des rôles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Action</th>
                  <th className="text-center p-3">
                    <div className="flex items-center justify-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-600" />
                      Admin
                    </div>
                  </th>
                  <th className="text-center p-3">
                    <div className="flex items-center justify-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      Manager
                    </div>
                  </th>
                  <th className="text-center p-3">
                    <div className="flex items-center justify-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      Employé
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {permissionTests.map((test, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <test.icon className="h-4 w-4 text-gray-600" />
                        {test.action}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {test.admin ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {test.manager ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {test.employee ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommandations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recommandations de sécurité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-blue-800">
            <p>• <strong>Employés</strong> : Accès en lecture seule + réception de marchandises</p>
            <p>• <strong>Managers</strong> : Gestion complète des commandes + rapports</p>
            <p>• <strong>Administrateurs</strong> : Accès total + actions critiques (annulation)</p>
            <p>• Toujours vérifier les permissions côté backend pour la sécurité</p>
            <p>• Implémenter des logs d'audit pour les actions sensibles</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
