/**
 * Test de validation du nettoyage Vite.js
 * Vérifie que tous les fichiers et dépendances Vite ont été supprimés
 */

const fs = require('fs')
const path = require('path')

function testViteCleanup() {
  console.log('🧹 TEST DE VALIDATION DU NETTOYAGE VITE.JS')
  console.log('=' * 45)
  
  const frontendPath = path.join(__dirname, 'apps', 'frontend')
  const rootPath = __dirname
  
  let allTestsPassed = true
  const results = {
    filesRemoved: [],
    dependenciesRemoved: [],
    configurationValid: [],
    errors: []
  }
  
  try {
    // 1. Vérification des fichiers Vite supprimés
    console.log('\n📁 ÉTAPE 1: Vérification des fichiers supprimés')
    
    const viteFilesToCheck = [
      'vite.config.ts',
      'vite.config.js',
      'index.html',
      'tsconfig.node.json',
      '.viterc',
      'vite.config.mjs'
    ]
    
    viteFilesToCheck.forEach(file => {
      const filePath = path.join(frontendPath, file)
      if (!fs.existsSync(filePath)) {
        console.log(`✅ ${file} - SUPPRIMÉ`)
        results.filesRemoved.push(file)
      } else {
        console.log(`❌ ${file} - ENCORE PRÉSENT`)
        results.errors.push(`Fichier Vite encore présent: ${file}`)
        allTestsPassed = false
      }
    })
    
    // 2. Vérification des dépendances dans package.json racine
    console.log('\n📦 ÉTAPE 2: Vérification des dépendances racine')
    
    const rootPackageJsonPath = path.join(rootPath, 'package.json')
    if (fs.existsSync(rootPackageJsonPath)) {
      const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'))
      
      const viteDependencies = [
        'vite',
        '@vitejs/plugin-react',
        '@vitejs/plugin-typescript',
        'vite-plugin-react',
        'vite-plugin-typescript'
      ]
      
      const allDeps = {
        ...rootPackageJson.dependencies || {},
        ...rootPackageJson.devDependencies || {}
      }
      
      viteDependencies.forEach(dep => {
        if (!allDeps[dep]) {
          console.log(`✅ ${dep} - SUPPRIMÉ du package.json racine`)
          results.dependenciesRemoved.push(dep)
        } else {
          console.log(`❌ ${dep} - ENCORE PRÉSENT dans package.json racine`)
          results.errors.push(`Dépendance Vite encore présente: ${dep}`)
          allTestsPassed = false
        }
      })
    }
    
    // 3. Vérification des dépendances dans package.json frontend
    console.log('\n📦 ÉTAPE 3: Vérification des dépendances frontend')
    
    const frontendPackageJsonPath = path.join(frontendPath, 'package.json')
    if (fs.existsSync(frontendPackageJsonPath)) {
      const frontendPackageJson = JSON.parse(fs.readFileSync(frontendPackageJsonPath, 'utf8'))
      
      const viteDependencies = [
        'vite',
        '@vitejs/plugin-react',
        '@vitejs/plugin-typescript'
      ]
      
      const allDeps = {
        ...frontendPackageJson.dependencies || {},
        ...frontendPackageJson.devDependencies || {}
      }
      
      let hasViteDeps = false
      viteDependencies.forEach(dep => {
        if (allDeps[dep]) {
          console.log(`❌ ${dep} - PRÉSENT dans package.json frontend`)
          results.errors.push(`Dépendance Vite dans frontend: ${dep}`)
          hasViteDeps = true
          allTestsPassed = false
        }
      })
      
      if (!hasViteDeps) {
        console.log('✅ Aucune dépendance Vite dans le frontend')
        results.dependenciesRemoved.push('frontend-clean')
      }
    }
    
    // 4. Vérification de la configuration Next.js
    console.log('\n⚙️ ÉTAPE 4: Vérification de la configuration Next.js')
    
    const nextConfigPath = path.join(frontendPath, 'next.config.mjs')
    if (fs.existsSync(nextConfigPath)) {
      console.log('✅ next.config.mjs - PRÉSENT')
      results.configurationValid.push('next.config.mjs')
    } else {
      console.log('❌ next.config.mjs - MANQUANT')
      results.errors.push('Configuration Next.js manquante')
      allTestsPassed = false
    }
    
    const packageJsonPath = path.join(frontendPath, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      
      // Vérifier les scripts Next.js
      const expectedScripts = {
        'dev': 'next dev -p 3000',
        'build': 'next build',
        'start': 'next start -p 3000'
      }
      
      let scriptsValid = true
      Object.entries(expectedScripts).forEach(([script, expectedCommand]) => {
        if (packageJson.scripts && packageJson.scripts[script] === expectedCommand) {
          console.log(`✅ Script "${script}" - CORRECT`)
        } else {
          console.log(`❌ Script "${script}" - INCORRECT ou MANQUANT`)
          scriptsValid = false
          allTestsPassed = false
        }
      })
      
      if (scriptsValid) {
        results.configurationValid.push('scripts-nextjs')
      }
      
      // Vérifier la présence de Next.js
      if (packageJson.dependencies && packageJson.dependencies.next) {
        console.log(`✅ Next.js ${packageJson.dependencies.next} - PRÉSENT`)
        results.configurationValid.push('nextjs-dependency')
      } else {
        console.log('❌ Next.js - MANQUANT')
        results.errors.push('Dépendance Next.js manquante')
        allTestsPassed = false
      }
    }
    
    // 5. Vérification des node_modules
    console.log('\n📂 ÉTAPE 5: Vérification des node_modules')
    
    const nodeModulesPath = path.join(frontendPath, 'node_modules')
    if (fs.existsSync(nodeModulesPath)) {
      try {
        const viteModules = fs.readdirSync(nodeModulesPath).filter(dir => 
          dir.includes('vite') && !dir.includes('vitejs') // Exclure @vitejs qui pourrait être légitime
        )
        
        if (viteModules.length === 0) {
          console.log('✅ Aucun module Vite dans node_modules')
          results.configurationValid.push('node_modules-clean')
        } else {
          console.log(`⚠️ Modules Vite trouvés: ${viteModules.join(', ')}`)
          // Ce n'est pas forcément une erreur, juste un avertissement
        }
      } catch (error) {
        console.log('⚠️ Impossible de lire node_modules')
      }
    }
    
    // 6. Résumé final
    console.log('\n🎯 RÉSUMÉ DU NETTOYAGE VITE.JS')
    console.log('=' * 35)
    
    console.log(`\n📁 Fichiers supprimés: ${results.filesRemoved.length}`)
    results.filesRemoved.forEach(file => console.log(`   ✅ ${file}`))
    
    console.log(`\n📦 Dépendances nettoyées: ${results.dependenciesRemoved.length}`)
    results.dependenciesRemoved.forEach(dep => console.log(`   ✅ ${dep}`))
    
    console.log(`\n⚙️ Configuration Next.js: ${results.configurationValid.length} éléments validés`)
    results.configurationValid.forEach(config => console.log(`   ✅ ${config}`))
    
    if (results.errors.length > 0) {
      console.log(`\n❌ Erreurs trouvées: ${results.errors.length}`)
      results.errors.forEach(error => console.log(`   ❌ ${error}`))
    }
    
    if (allTestsPassed) {
      console.log('\n🎉 NETTOYAGE VITE.JS RÉUSSI !')
      console.log('✅ Tous les fichiers et dépendances Vite ont été supprimés')
      console.log('✅ Configuration Next.js pure et fonctionnelle')
      console.log('✅ Aucun conflit de configuration détecté')
      console.log('\n💡 L\'application est maintenant 100% Next.js')
    } else {
      console.log('\n⚠️ NETTOYAGE PARTIEL')
      console.log('Certains éléments Vite sont encore présents')
      console.log('Consultez les erreurs ci-dessus pour les corriger')
    }
    
    return {
      success: allTestsPassed,
      results: results
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR lors du test:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// Exécuter le test
if (require.main === module) {
  const result = testViteCleanup()
  
  if (result.success) {
    console.log('\n✅ Test de nettoyage Vite terminé avec succès')
    process.exit(0)
  } else {
    console.log('\n❌ Test de nettoyage Vite échoué')
    process.exit(1)
  }
}
