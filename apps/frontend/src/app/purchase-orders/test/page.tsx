'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { PurchaseOrderTestSuite } from '@/components/pages/purchase-orders/purchase-order-test-suite'
import { PurchaseOrderValidation } from '@/components/pages/purchase-orders/purchase-order-validation'
import { PermissionTest } from '@/components/pages/purchase-orders/permission-test'
import { SupplierSelectTest } from '@/components/pages/purchase-orders/supplier-select-test'
import { ApiDiagnostic } from '@/components/pages/purchase-orders/api-diagnostic'
import { AuthStatus } from '@/components/pages/purchase-orders/auth-status'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TestTube, Settings, Shield, Users, Network, User, Play } from 'lucide-react'

export default function PurchaseOrdersTest() {
  const [activeTab, setActiveTab] = useState<'tests' | 'validation' | 'permissions' | 'supplier' | 'api' | 'auth'>('auth')

  return (
    <MainLayout
      title="Tests - Achats"
      subtitle="Suite de tests automatisés et validation technique"
    >
      <div className="space-y-6">
        {/* Onglets */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                variant={activeTab === 'auth' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('auth')}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                État Auth
              </Button>
              <Button
                variant={activeTab === 'tests' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('tests')}
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                Tests Fonctionnels
              </Button>
              <Button
                variant={activeTab === 'validation' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('validation')}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Validation Technique
              </Button>
              <Button
                variant={activeTab === 'permissions' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('permissions')}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Test Permissions
              </Button>
              <Button
                variant={activeTab === 'supplier' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('supplier')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Test Fournisseurs
              </Button>
              <Button
                variant={activeTab === 'api' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('api')}
                className="flex items-center gap-2"
              >
                <Network className="h-4 w-4" />
                Diagnostic API
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contenu */}
        {activeTab === 'auth' && <AuthStatus />}
        {activeTab === 'tests' && <PurchaseOrderTestSuite />}
        {activeTab === 'validation' && <PurchaseOrderValidation />}
        {activeTab === 'permissions' && <PermissionTest />}
        {activeTab === 'supplier' && <SupplierSelectTest />}
        {activeTab === 'api' && <ApiDiagnostic />}
      </div>
    </MainLayout>
  )
}
