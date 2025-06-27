#!/usr/bin/env node

/**
 * Diagnostic approfondi du problème Next.js
 * Identifie pourquoi les boutons ne fonctionnent pas dans l'application
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🔍 DIAGNOSTIC APPROFONDI - PROBLÈME NEXT.JS\n');

const frontendPath = 'frontend-nextjs-production';

// Vérifier la structure des fichiers
function checkFileStructure() {
  console.log('📁 Vérification de la structure des fichiers:\n');
  
  const criticalFiles = [
    'package.json',
    'next.config.mjs',
    'tsconfig.json',
    'tailwind.config.ts',
    'src/app/layout.tsx',
    'src/app/page.tsx',
    'src/components/ui/button.tsx'
  ];
  
  criticalFiles.forEach(file => {
    const filePath = path.join(frontendPath, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} - Présent`);
    } else {
      console.log(`❌ ${file} - MANQUANT`);
    }
  });
}

// Vérifier les erreurs de compilation TypeScript
function checkTypeScriptErrors() {
  console.log('\n🔧 Vérification des erreurs TypeScript:\n');
  
  const filesToCheck = [
    'src/components/pages/clients.tsx',
    'src/components/pages/products.tsx',
    'src/components/pages/orders/index.tsx',
    'src/components/pages/invoices/index.tsx'
  ];
  
  filesToCheck.forEach(file => {
    const filePath = path.join(frontendPath, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Vérifier les imports React
        if (!content.includes("'use client'") && !content.includes('"use client"')) {
          console.log(`⚠️  ${file} - Directive 'use client' manquante`);
        } else {
          console.log(`✅ ${file} - Directive 'use client' présente`);
        }
        
        // Vérifier les imports useState/useEffect
        const hasUseState = content.includes('useState');
        const hasUseEffect = content.includes('useEffect');
        const hasReactImport = content.includes('from \'react\'') || content.includes('from "react"');
        
        if ((hasUseState || hasUseEffect) && !hasReactImport) {
          console.log(`❌ ${file} - Hooks utilisés mais React non importé`);
        }
        
        // Vérifier les gestionnaires d'événements
        const onClickCount = (content.match(/onClick={/g) || []).length;
        const handlersCount = (content.match(/const handle\w+/g) || []).length;
        
        console.log(`   📊 ${file} - onClick: ${onClickCount}, Handlers: ${handlersCount}`);
        
      } catch (error) {
        console.log(`❌ ${file} - Erreur de lecture: ${error.message}`);
      }
    } else {
      console.log(`❌ ${file} - Fichier manquant`);
    }
  });
}

// Vérifier la configuration Next.js
function checkNextConfig() {
  console.log('\n⚙️  Vérification de la configuration Next.js:\n');
  
  const nextConfigPath = path.join(frontendPath, 'next.config.mjs');
  if (fs.existsSync(nextConfigPath)) {
    try {
      const content = fs.readFileSync(nextConfigPath, 'utf8');
      console.log('✅ next.config.mjs contenu:');
      console.log(content);
    } catch (error) {
      console.log(`❌ Erreur lecture next.config.mjs: ${error.message}`);
    }
  }
  
  const packagePath = path.join(frontendPath, 'package.json');
  if (fs.existsSync(packagePath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      console.log('\n📦 Versions des dépendances:');
      console.log(`   - Next.js: ${packageJson.dependencies?.next || 'non trouvé'}`);
      console.log(`   - React: ${packageJson.dependencies?.react || 'non trouvé'}`);
      console.log(`   - TypeScript: ${packageJson.devDependencies?.typescript || 'non trouvé'}`);
    } catch (error) {
      console.log(`❌ Erreur lecture package.json: ${error.message}`);
    }
  }
}

// Tester la compilation Next.js
function testNextCompilation() {
  console.log('\n🔨 Test de compilation Next.js:\n');
  
  return new Promise((resolve) => {
    const nextBuild = spawn('npx', ['next', 'build'], {
      cwd: frontendPath,
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    nextBuild.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    nextBuild.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    nextBuild.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Compilation Next.js réussie');
        console.log('📊 Output:', output.slice(-200)); // Dernières 200 chars
      } else {
        console.log('❌ Compilation Next.js échouée');
        console.log('📊 Erreurs:', errorOutput.slice(-500)); // Dernières 500 chars
      }
      resolve(code === 0);
    });
    
    // Timeout après 60 secondes
    setTimeout(() => {
      nextBuild.kill();
      console.log('⏰ Timeout de compilation - processus arrêté');
      resolve(false);
    }, 60000);
  });
}

// Créer un composant de test minimal
function createMinimalTest() {
  console.log('\n🧪 Création d\'un composant de test minimal:\n');
  
  const testComponentPath = path.join(frontendPath, 'src/app/test-minimal/page.tsx');
  const testComponentDir = path.dirname(testComponentPath);
  
  // Créer le répertoire si nécessaire
  if (!fs.existsSync(testComponentDir)) {
    fs.mkdirSync(testComponentDir, { recursive: true });
  }
  
  const testComponent = `'use client'

import { useState } from 'react'

export default function TestMinimalPage() {
  const [count, setCount] = useState(0)
  
  const handleClick = () => {
    setCount(prev => prev + 1)
    console.log('Bouton cliqué, nouveau count:', count + 1)
    alert('Bouton fonctionne ! Count: ' + (count + 1))
  }
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 Test Minimal Next.js</h1>
      <p>Ce composant teste si les boutons React fonctionnent.</p>
      
      <div style={{ margin: '20px 0' }}>
        <button 
          onClick={handleClick}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Cliquez-moi ! (Count: {count})
        </button>
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Cliquez sur le bouton ci-dessus</li>
          <li>Vérifiez que le compteur s'incrémente</li>
          <li>Vérifiez qu'une alerte s'affiche</li>
          <li>Ouvrez la console (F12) pour voir les logs</li>
        </ol>
        
        <p><strong>Si ce bouton fonctionne:</strong> Le problème est dans les autres composants</p>
        <p><strong>Si ce bouton ne fonctionne pas:</strong> Le problème est avec Next.js/React</p>
      </div>
    </div>
  )
}`;
  
  try {
    fs.writeFileSync(testComponentPath, testComponent);
    console.log('✅ Composant de test créé: /test-minimal');
    console.log('🔗 URL de test: http://localhost:3003/test-minimal');
  } catch (error) {
    console.log(`❌ Erreur création composant test: ${error.message}`);
  }
}

// Fonction principale
async function runDiagnostic() {
  console.log('🚀 Démarrage du diagnostic approfondi...\n');
  
  checkFileStructure();
  checkTypeScriptErrors();
  checkNextConfig();
  createMinimalTest();
  
  console.log('\n📋 RÉSUMÉ DU DIAGNOSTIC:\n');
  
  console.log('🔧 SOLUTIONS RECOMMANDÉES:\n');
  
  console.log('1. 🔄 REDÉMARRER NEXT.JS PROPREMENT:');
  console.log('   cd frontend-nextjs-production');
  console.log('   rm -rf .next');
  console.log('   npm run dev');
  
  console.log('\n2. 🧪 TESTER LE COMPOSANT MINIMAL:');
  console.log('   - Démarrer Next.js');
  console.log('   - Aller sur http://localhost:3003/test-minimal');
  console.log('   - Tester le bouton simple');
  
  console.log('\n3. 🔍 VÉRIFIER LES ERREURS:');
  console.log('   - Ouvrir la console du navigateur (F12)');
  console.log('   - Chercher les erreurs JavaScript');
  console.log('   - Vérifier les erreurs de compilation Next.js');
  
  console.log('\n4. 🐛 DEBUGGING ÉTAPE PAR ÉTAPE:');
  console.log('   - Si le test minimal fonctionne: problème dans les composants');
  console.log('   - Si le test minimal ne fonctionne pas: problème Next.js/React');
  console.log('   - Vérifier les directives "use client"');
  console.log('   - Vérifier les imports React');
  
  console.log('\n5. 🔧 CORRECTIONS POSSIBLES:');
  console.log('   - Ajouter "use client" en haut des composants');
  console.log('   - Vérifier les imports useState/useEffect');
  console.log('   - Corriger les erreurs TypeScript');
  console.log('   - Réinstaller les dépendances si nécessaire');
  
  console.log('\n📊 PROCHAINES ÉTAPES:');
  console.log('1. Exécuter: cd frontend-nextjs-production && npm run dev');
  console.log('2. Tester: http://localhost:3003/test-minimal');
  console.log('3. Si ça marche: corriger les autres composants');
  console.log('4. Si ça ne marche pas: problème de configuration Next.js');
  
  console.log('\n🎯 OBJECTIF: Identifier si le problème vient de:');
  console.log('   - Configuration Next.js ❌');
  console.log('   - Erreurs de compilation ❌');
  console.log('   - Composants spécifiques ❌');
  console.log('   - Directives "use client" manquantes ❌');
}

// Exécution
if (require.main === module) {
  runDiagnostic().catch(console.error);
}

module.exports = { runDiagnostic };
