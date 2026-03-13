#!/usr/bin/env ts-node

import { PrismaClient } from '@gestion/database'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function fixUserCreation() {
  console.log('🔧 Correction des problèmes de création d\'utilisateur...\n')

  try {
    // 1. Vérifier la structure de la base de données
    console.log('📊 Vérification de la structure de la base de données...')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        companyId: true,
        createdAt: true
      }
    })

    console.log(`✅ ${users.length} utilisateurs trouvés`)

    // 2. Vérifier les entreprises
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    console.log(`✅ ${companies.length} entreprises trouvées`)

    if (companies.length === 0) {
      console.log('🏢 Création d\'une entreprise par défaut...')
      
      const defaultCompany = await prisma.company.create({
        data: {
          name: 'Entreprise Test DZ',
          email: 'contact@test.dz',
          phone: '+213 21 123 456',
          address: '123 Rue Didouche Mourad, Alger',
          city: 'Alger',
          postalCode: '16000',
          country: 'Algérie',
          currency: 'DZD',
          timezone: 'Africa/Algiers',
        }
      })
      
      console.log(`✅ Entreprise créée: ${defaultCompany.name} (ID: ${defaultCompany.id})`)
    }

    // 3. Créer un utilisateur admin de test si nécessaire
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@test.dz' }
    })

    if (!adminUser) {
      console.log('👤 Création d\'un utilisateur administrateur de test...')
      
      const company = await prisma.company.findFirst()
      if (!company) {
        throw new Error('Aucune entreprise trouvée')
      }

      const hashedPassword = await bcrypt.hash('admin123', 10)
      
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@test.dz',
          passwordHash: hashedPassword,
          firstName: 'Admin',
          lastName: 'Test',
          role: 'ADMIN',
          isActive: true,
          companyId: company.id
        }
      })

      console.log('✅ Utilisateur administrateur créé:')
      console.log(`   📧 Email: ${newAdmin.email}`)
      console.log(`   🔑 Mot de passe: admin123`)
      console.log(`   👤 Rôle: ${newAdmin.role}`)
      console.log(`   🏢 Entreprise: ${company.name}`)
    } else {
      console.log('✅ Utilisateur administrateur existe déjà')
      console.log(`   📧 Email: ${adminUser.email}`)
      console.log(`   👤 Rôle: ${adminUser.role}`)
    }

    // 4. Vérifier la cohérence des mots de passe
    console.log('\n🔍 Vérification de la cohérence des mots de passe...')
    
    // Récupérer tous les utilisateurs pour vérifier leurs mots de passe
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        passwordHash: true
      }
    })

    const usersWithPasswordIssues = allUsers.filter(user => 
      !user.passwordHash || user.passwordHash === ''
    )

    if (usersWithPasswordIssues.length > 0) {
      console.log(`⚠️  ${usersWithPasswordIssues.length} utilisateurs avec des mots de passe invalides détectés`)
      
      for (const user of usersWithPasswordIssues) {
        const hashedPassword = await bcrypt.hash('password123', 10)
        
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hashedPassword }
        })
        
        console.log(`✅ Mot de passe corrigé pour: ${user.email}`)
      }
    } else {
      console.log('✅ Tous les mots de passe sont cohérents')
    }

    console.log('\n🎯 RÉSUMÉ:')
    console.log('✅ Structure de la base de données vérifiée')
    console.log('✅ Utilisateur administrateur disponible')
    console.log('✅ Mots de passe cohérents')
    console.log('\n🔗 Vous pouvez maintenant vous connecter avec:')
    console.log('   📧 Email: admin@test.dz')
    console.log('   🔑 Mot de passe: admin123')

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécution du script
if (require.main === module) {
  fixUserCreation()
    .then(() => {
      console.log('\n✅ Correction terminée avec succès!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Erreur fatale:', error)
      process.exit(1)
    })
}

export default fixUserCreation 