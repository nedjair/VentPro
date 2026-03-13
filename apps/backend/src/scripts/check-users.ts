#!/usr/bin/env ts-node

/**
 * Script pour vérifier et créer des utilisateurs de test
 */

import { prisma } from '@gestion/database'
import bcrypt from 'bcryptjs'

async function checkAndCreateUsers() {
  console.log('🔍 Vérification des utilisateurs dans la base de données...\n')

  try {
    // Vérifier les utilisateurs existants
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        createdAt: true,
      },
    })

    console.log(`📊 Nombre d'utilisateurs trouvés: ${users.length}`)

    if (users.length > 0) {
      console.log('\n👥 Utilisateurs existants:')
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.firstName} ${user.lastName})`)
        console.log(`     Rôle: ${user.role}`)
        console.log(`     Entreprise: ${user.companyId}`)
        console.log(`     Créé: ${user.createdAt.toLocaleDateString('fr-FR')}`)
        console.log('')
      })
    } else {
      console.log('\n❌ Aucun utilisateur trouvé dans la base de données')
      console.log('🔧 Création d\'un utilisateur de test...\n')

      // Vérifier s'il y a des entreprises
      const companies = await prisma.company.findMany()
      let companyId: string

      if (companies.length === 0) {
        console.log('📢 Création d\'une entreprise de test...')
        const testCompany = await prisma.company.create({
          data: {
            name: 'Entreprise Test',
            email: 'contact@test.dz',
            phone: '+213 21 123 456',
            address: '123 Rue de la Paix, Alger',
            nif: '123456789012345',
            nis: '123456789012345',
            rc: '16/24-1234567',
            ai: '16123456789',
          },
        })
        companyId = testCompany.id
        console.log(`✅ Entreprise créée: ${testCompany.name} (ID: ${companyId})`)
      } else {
        companyId = companies[0].id
        console.log(`📢 Utilisation de l'entreprise existante: ${companies[0].name}`)
      }

      // Créer un utilisateur admin de test
      const hashedPassword = await bcrypt.hash('admin123', 10)
      
      const testUser = await prisma.user.create({
        data: {
          email: 'admin@test.dz',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'Test',
          role: 'ADMIN',
          companyId: companyId,
        },
      })

      console.log('\n✅ Utilisateur de test créé:')
      console.log(`   Email: admin@test.dz`)
      console.log(`   Mot de passe: admin123`)
      console.log(`   Rôle: ADMIN`)
      console.log(`   ID: ${testUser.id}`)

      // Créer aussi un utilisateur manager
      const managerUser = await prisma.user.create({
        data: {
          email: 'manager@test.dz',
          password: hashedPassword,
          firstName: 'Manager',
          lastName: 'Test',
          role: 'MANAGER',
          companyId: companyId,
        },
      })

      console.log('\n✅ Utilisateur manager créé:')
      console.log(`   Email: manager@test.dz`)
      console.log(`   Mot de passe: admin123`)
      console.log(`   Rôle: MANAGER`)
      console.log(`   ID: ${managerUser.id}`)
    }

    console.log('\n🎯 Identifiants de connexion disponibles:')
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
      },
    })

    allUsers.forEach((user) => {
      console.log(`   📧 ${user.email} (${user.role})`)
    })

    console.log('\n💡 Mot de passe par défaut pour les comptes de test: admin123')

  } catch (error) {
    console.error('❌ Erreur lors de la vérification des utilisateurs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
checkAndCreateUsers()
