const fs = require('fs');
const path = require('path');

console.log('🔧 Diagnostic et correction de l\'erreur de chargement de chunks Next.js');
console.log('=' .repeat(70));

async function fixChunkLoadingError() {
  try {
    // 1. Vérifier la configuration Next.js
    console.log('\n1. 📋 Vérification de la configuration Next.js...');
    
    const nextConfigPath = path.join(__dirname, 'next.config.mjs');
    if (fs.existsSync(nextConfigPath)) {
      const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
      console.log('   ✅ next.config.mjs trouvé');
      
      // Vérifier si la configuration contient des optimisations problématiques
      if (nextConfig.includes('experimental')) {
        console.log('   ⚠️ Configuration expérimentale détectée');
      }
      if (nextConfig.includes('webpack')) {
        console.log('   ⚠️ Configuration webpack personnalisée détectée');
      }
    } else {
      console.log('   ❌ next.config.mjs non trouvé');
    }
    
    // 2. Vérifier les dépendances
    console.log('\n2. 📦 Vérification des dépendances...');
    
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log(`   ✅ Next.js version: ${packageJson.dependencies?.next || 'Non trouvé'}`);
      console.log(`   ✅ React version: ${packageJson.dependencies?.react || 'Non trouvé'}`);
      
      // Vérifier les versions problématiques
      const nextVersion = packageJson.dependencies?.next;
      if (nextVersion && nextVersion.includes('14.2.30')) {
        console.log('   ⚠️ Version Next.js 14.2.30 détectée - version avec problèmes connus');
      }
    }
    
    // 3. Nettoyer les fichiers de cache
    console.log('\n3. 🧹 Nettoyage des caches...');
    
    const cacheDirs = [
      '.next',
      'node_modules/.cache',
      '.next/cache'
    ];
    
    for (const dir of cacheDirs) {
      const dirPath = path.join(__dirname, dir);
      if (fs.existsSync(dirPath)) {
        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`   ✅ ${dir} supprimé`);
        } catch (error) {
          console.log(`   ⚠️ Erreur lors de la suppression de ${dir}: ${error.message}`);
        }
      } else {
        console.log(`   ℹ️ ${dir} n'existe pas`);
      }
    }
    
    // 4. Créer une configuration Next.js optimisée
    console.log('\n4. ⚙️ Création d\'une configuration Next.js optimisée...');
    
    const optimizedConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour éviter les erreurs de chunks
  experimental: {
    // Désactiver les optimisations expérimentales qui peuvent causer des problèmes
    optimizePackageImports: false,
  },
  
  // Configuration webpack pour améliorer la stabilité
  webpack: (config, { dev, isServer }) => {
    // Optimisations pour éviter les timeouts de chunks
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
              maxSize: 244000, // Limiter la taille des chunks
            },
            vendor: {
              test: /[\\\\/]node_modules[\\\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
              maxSize: 244000,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Configuration pour améliorer les performances
  poweredByHeader: false,
  compress: true,
  
  // Configuration des images
  images: {
    domains: ['localhost'],
    unoptimized: true, // Désactiver l'optimisation d'images pour éviter les problèmes
  },
  
  // Configuration TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Configuration ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Configuration pour le développement
  ...(process.env.NODE_ENV === 'development' && {
    reactStrictMode: false, // Désactiver en développement pour éviter les double-renders
  }),
};

export default nextConfig;
`;
    
    const backupConfigPath = path.join(__dirname, 'next.config.mjs.backup');
    if (fs.existsSync(nextConfigPath)) {
      fs.copyFileSync(nextConfigPath, backupConfigPath);
      console.log('   ✅ Sauvegarde de la configuration existante');
    }
    
    fs.writeFileSync(nextConfigPath, optimizedConfig);
    console.log('   ✅ Configuration Next.js optimisée créée');
    
    // 5. Créer un script de redémarrage propre
    console.log('\n5. 🔄 Création d\'un script de redémarrage...');
    
    const restartScript = `#!/bin/bash
echo "🔄 Redémarrage propre de l'application Next.js..."

# Arrêter tous les processus Node.js
echo "🛑 Arrêt des processus existants..."
pkill -f "next" || true
pkill -f "node.*3002" || true

# Nettoyer les caches
echo "🧹 Nettoyage des caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache

# Réinstaller les dépendances si nécessaire
if [ "$1" = "--reinstall" ]; then
  echo "📦 Réinstallation des dépendances..."
  rm -rf node_modules
  rm -f package-lock.json
  npm install
fi

# Redémarrer l'application
echo "🚀 Redémarrage de l'application..."
npm run dev

echo "✅ Redémarrage terminé"
`;
    
    const restartScriptPath = path.join(__dirname, 'restart-clean.sh');
    fs.writeFileSync(restartScriptPath, restartScript);
    
    // Rendre le script exécutable (sur Unix)
    try {
      fs.chmodSync(restartScriptPath, '755');
    } catch (error) {
      // Ignorer sur Windows
    }
    
    console.log('   ✅ Script de redémarrage créé: restart-clean.sh');
    
    // 6. Créer un composant de gestion d'erreur de chunks
    console.log('\n6. 🛡️ Création d\'un composant de gestion d\'erreur...');
    
    const errorBoundaryComponent = `'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Détecter les erreurs de chunks
    if (error.message.includes('Loading chunk') || 
        error.message.includes('ChunkLoadError') ||
        error.name === 'ChunkLoadError') {
      return { hasError: true, error }
    }
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ChunkErrorBoundary caught an error:', error, errorInfo)
    
    // Si c'est une erreur de chunk, recharger la page
    if (error.message.includes('Loading chunk') || 
        error.message.includes('ChunkLoadError') ||
        error.name === 'ChunkLoadError') {
      console.log('🔄 Erreur de chunk détectée, rechargement de la page...')
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-medium text-gray-900">
                Erreur de chargement
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Une erreur s'est produite lors du chargement de l'application.
                La page va se recharger automatiquement.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Recharger maintenant
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
`;
    
    const errorBoundaryPath = path.join(__dirname, 'src/components/ChunkErrorBoundary.tsx');
    fs.writeFileSync(errorBoundaryPath, errorBoundaryComponent);
    console.log('   ✅ Composant ChunkErrorBoundary créé');
    
    // 7. Instructions de correction
    console.log('\n7. 📋 Instructions de correction...');
    
    const instructions = `
INSTRUCTIONS POUR CORRIGER L'ERREUR DE CHUNKS:

1. 🛑 Arrêter le serveur de développement (Ctrl+C)

2. 🧹 Nettoyer complètement:
   npm run clean (si disponible) ou:
   rm -rf .next
   rm -rf node_modules/.cache

3. 🔄 Redémarrer proprement:
   npm run dev

4. 🛡️ Si le problème persiste, utiliser le script de redémarrage:
   ./restart-clean.sh
   ou sur Windows:
   npm run dev

5. 📦 Si le problème continue, réinstaller les dépendances:
   ./restart-clean.sh --reinstall
   ou manuellement:
   rm -rf node_modules
   rm package-lock.json
   npm install
   npm run dev

6. 🔧 Intégrer le composant d'erreur dans layout.tsx:
   Envelopper {children} avec <ChunkErrorBoundary>

CAUSES POSSIBLES:
- Cache Next.js corrompu
- Conflit de versions de dépendances
- Configuration webpack problématique
- Processus Node.js zombie
- Problème de réseau/timeout

PRÉVENTION:
- Redémarrer régulièrement le serveur de développement
- Nettoyer les caches après les mises à jour
- Éviter les modifications de configuration webpack complexes
`;
    
    const instructionsPath = path.join(__dirname, 'CHUNK_ERROR_FIX.md');
    fs.writeFileSync(instructionsPath, instructions);
    console.log('   ✅ Instructions sauvegardées dans CHUNK_ERROR_FIX.md');
    
    // 8. Résumé
    console.log('\n' + '=' .repeat(70));
    console.log('✅ DIAGNOSTIC ET CORRECTION TERMINÉS');
    console.log('=' .repeat(70));
    
    console.log('\n🔧 Actions effectuées:');
    console.log('   ✅ Nettoyage des caches (.next, node_modules/.cache)');
    console.log('   ✅ Configuration Next.js optimisée créée');
    console.log('   ✅ Script de redémarrage propre créé');
    console.log('   ✅ Composant de gestion d\'erreur créé');
    console.log('   ✅ Instructions détaillées fournies');
    
    console.log('\n🚀 PROCHAINES ÉTAPES:');
    console.log('   1. Redémarrer le serveur: npm run dev');
    console.log('   2. Si le problème persiste: ./restart-clean.sh');
    console.log('   3. Consulter: CHUNK_ERROR_FIX.md');
    
    console.log('\n💡 CONSEIL: Cette erreur est souvent temporaire et se résout avec un redémarrage propre.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
  }
}

fixChunkLoadingError();
