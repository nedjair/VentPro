#!/usr/bin/env tsx

/**
 * Debug du ClientType
 */

import { ClientType } from '@prisma/client'
import { ClientService } from '../src/services/client.service'

async function debugClientType() {
  console.log('🔍 DEBUG CLIENT TYPE')
  console.log('====================\n')
  
  try {
    // 1. Vérifier l'enum ClientType
    console.log('1. 📋 Vérification de l\'enum ClientType...')
    console.log('ClientType:', ClientType)
    console.log('ClientType.INDIVIDUAL:', ClientType?.INDIVIDUAL)
    console.log('ClientType.COMPANY:', ClientType?.COMPANY)
    console.log('typeof ClientType:', typeof ClientType)
    
    // 2. Récupérer un client de test
    console.log('\n2. 🔍 Récupération d\'un client de test...')
    const companyId = 'company-test'
    const { data: clients } = await ClientService.getClients(companyId, {})
    
    if (clients.length > 0) {
      const client = clients[0]
      console.log('Premier client:')
      console.log('  ID:', client.id)
      console.log('  Type:', client.type)
      console.log('  typeof type:', typeof client.type)
      console.log('  FirstName:', client.firstName)
      console.log('  LastName:', client.lastName)
      console.log('  CompanyName:', client.companyName)
      
      // 3. Test de comparaison
      console.log('\n3. 🧪 Test de comparaison...')
      console.log('client.type === "INDIVIDUAL":', client.type === 'INDIVIDUAL')
      console.log('client.type === "COMPANY":', client.type === 'COMPANY')
      console.log('client.type === ClientType.INDIVIDUAL:', client.type === ClientType?.INDIVIDUAL)
      console.log('client.type === ClientType.COMPANY:', client.type === ClientType?.COMPANY)
      
      // 4. Test de la fonction getClientFullName
      console.log('\n4. 🔧 Test de la fonction getClientFullName...')
      
      const getClientFullNameFixed = (client: any): string => {
        console.log('  Dans getClientFullName:')
        console.log('    client.type:', client.type)
        console.log('    ClientType:', ClientType)
        console.log('    ClientType?.INDIVIDUAL:', ClientType?.INDIVIDUAL)
        
        if (client.type === 'INDIVIDUAL') {
          return `${client.firstName || ''} ${client.lastName || ''}`.trim();
        }
        return client.companyName || '';
      };
      
      const fullName = getClientFullNameFixed(client)
      console.log('  Nom complet:', fullName)
    }
    
    return true
    
  } catch (error: any) {
    console.error('❌ Erreur lors du debug:', error.message)
    console.error('Stack:', error.stack)
    return false
  }
}

async function main() {
  const success = await debugClientType()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main()
}
