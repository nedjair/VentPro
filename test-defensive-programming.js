/**
 * Test de la programmation défensive
 * Vérifie les protections Array.isArray() et la gestion des erreurs
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function searchInFile(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = {};
    
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.regex, 'gi');
      const matches = content.match(regex) || [];
      results[pattern.name] = {
        count: matches.length,
        matches: matches.slice(0, 5), // Limiter à 5 exemples
        lines: []
      };
      
      // Trouver les numéros de ligne
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          results[pattern.name].lines.push({
            number: index + 1,
            content: line.trim()
          });
        }
      });
      
      // Réinitialiser le regex pour la prochaine utilisation
      regex.lastIndex = 0;
    });
    
    return results;
  } catch (error) {
    return null;
  }
}

function findReactFiles(dir, files = []) {
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        findReactFiles(fullPath, files);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.jsx') || item.endsWith('.js')) {
        files.push(fullPath);
      }
    });
  } catch (error) {
    // Ignorer les erreurs d'accès aux dossiers
  }
  
  return files;
}

async function testDefensiveProgramming() {
  log('🚀 TEST DE PROGRAMMATION DÉFENSIVE', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  const frontendDir = path.join(process.cwd(), 'apps', 'frontend', 'src');
  
  if (!fs.existsSync(frontendDir)) {
    log('❌ Dossier frontend non trouvé', 'red');
    return false;
  }
  
  // Patterns à rechercher
  const defensivePatterns = [
    {
      name: 'Array.isArray',
      regex: 'Array\\.isArray\\s*\\(',
      description: 'Vérifications Array.isArray()'
    },
    {
      name: 'ensureArray',
      regex: 'ensureArray\\s*\\(',
      description: 'Utilisation de ensureArray()'
    },
    {
      name: 'safeFilter',
      regex: 'safeFilter\\s*\\(',
      description: 'Utilisation de safeFilter()'
    },
    {
      name: 'safeMap',
      regex: 'safeMap\\s*\\(',
      description: 'Utilisation de safeMap()'
    },
    {
      name: 'safeFind',
      regex: 'safeFind\\s*\\(',
      description: 'Utilisation de safeFind()'
    },
    {
      name: 'useState_array',
      regex: 'useState\\s*\\(\\s*\\[\\s*\\]',
      description: 'useState initialisé avec tableau vide'
    },
    {
      name: 'optional_chaining',
      regex: '\\?\\.',
      description: 'Optional chaining (?.) utilisé'
    },
    {
      name: 'nullish_coalescing',
      regex: '\\?\\?',
      description: 'Nullish coalescing (??) utilisé'
    }
  ];
  
  // Patterns problématiques à éviter
  const problematicPatterns = [
    {
      name: 'direct_map',
      regex: '\\.map\\s*\\(',
      description: 'Utilisation directe de .map() (potentiellement dangereuse)'
    },
    {
      name: 'direct_filter',
      regex: '\\.filter\\s*\\(',
      description: 'Utilisation directe de .filter() (potentiellement dangereuse)'
    },
    {
      name: 'direct_find',
      regex: '\\.find\\s*\\(',
      description: 'Utilisation directe de .find() (potentiellement dangereuse)'
    }
  ];
  
  log('\n🔍 Recherche des fichiers React/TypeScript...', 'blue');
  const files = findReactFiles(frontendDir);
  log(`📁 ${files.length} fichiers trouvés`, 'cyan');
  
  const results = {
    defensive: {},
    problematic: {},
    fileStats: {
      total: files.length,
      withDefensive: 0,
      withProblematic: 0
    }
  };
  
  // Initialiser les compteurs
  defensivePatterns.forEach(pattern => {
    results.defensive[pattern.name] = { count: 0, files: [] };
  });
  
  problematicPatterns.forEach(pattern => {
    results.problematic[pattern.name] = { count: 0, files: [] };
  });
  
  log('\n🔍 Analyse des patterns défensifs...', 'blue');
  
  files.forEach(file => {
    const relativePath = path.relative(process.cwd(), file);
    let hasDefensive = false;
    let hasProblematic = false;
    
    // Rechercher les patterns défensifs
    const defensiveResults = searchInFile(file, defensivePatterns);
    if (defensiveResults) {
      Object.entries(defensiveResults).forEach(([patternName, result]) => {
        if (result.count > 0) {
          hasDefensive = true;
          results.defensive[patternName].count += result.count;
          results.defensive[patternName].files.push({
            path: relativePath,
            count: result.count,
            examples: result.lines.slice(0, 2)
          });
        }
      });
    }
    
    // Rechercher les patterns problématiques
    const problematicResults = searchInFile(file, problematicPatterns);
    if (problematicResults) {
      Object.entries(problematicResults).forEach(([patternName, result]) => {
        if (result.count > 0) {
          hasProblematic = true;
          results.problematic[patternName].count += result.count;
          results.problematic[patternName].files.push({
            path: relativePath,
            count: result.count,
            examples: result.lines.slice(0, 2)
          });
        }
      });
    }
    
    if (hasDefensive) results.fileStats.withDefensive++;
    if (hasProblematic) results.fileStats.withProblematic++;
  });
  
  // Afficher les résultats
  log('\n📊 RÉSULTATS - PATTERNS DÉFENSIFS', 'green');
  log('=' .repeat(50), 'green');
  
  defensivePatterns.forEach(pattern => {
    const result = results.defensive[pattern.name];
    const status = result.count > 0 ? '✅' : '⚠️';
    const color = result.count > 0 ? 'green' : 'yellow';
    
    log(`${status} ${pattern.description}: ${result.count} occurrences`, color);
    
    if (result.files.length > 0) {
      result.files.slice(0, 3).forEach(file => {
        log(`   📁 ${file.path} (${file.count}x)`, 'cyan');
        if (file.examples.length > 0) {
          file.examples.forEach(example => {
            log(`      L${example.number}: ${example.content.substring(0, 80)}...`, 'cyan');
          });
        }
      });
      
      if (result.files.length > 3) {
        log(`   ... et ${result.files.length - 3} autres fichiers`, 'cyan');
      }
    }
    log('');
  });
  
  log('\n⚠️ RÉSULTATS - PATTERNS PROBLÉMATIQUES', 'yellow');
  log('=' .repeat(50), 'yellow');
  
  problematicPatterns.forEach(pattern => {
    const result = results.problematic[pattern.name];
    const status = result.count > 0 ? '⚠️' : '✅';
    const color = result.count > 0 ? 'red' : 'green';
    
    log(`${status} ${pattern.description}: ${result.count} occurrences`, color);
    
    if (result.files.length > 0) {
      result.files.slice(0, 3).forEach(file => {
        log(`   📁 ${file.path} (${file.count}x)`, 'red');
        if (file.examples.length > 0) {
          file.examples.slice(0, 1).forEach(example => {
            log(`      L${example.number}: ${example.content.substring(0, 80)}...`, 'red');
          });
        }
      });
      
      if (result.files.length > 3) {
        log(`   ... et ${result.files.length - 3} autres fichiers`, 'red');
      }
    }
    log('');
  });
  
  // Statistiques globales
  log('\n📈 STATISTIQUES GLOBALES', 'magenta');
  log('=' .repeat(50), 'magenta');
  
  log(`📁 Fichiers analysés: ${results.fileStats.total}`, 'cyan');
  log(`✅ Fichiers avec programmation défensive: ${results.fileStats.withDefensive}`, 'green');
  log(`⚠️ Fichiers avec patterns problématiques: ${results.fileStats.withProblematic}`, 'yellow');
  
  const defensiveScore = results.fileStats.withDefensive / results.fileStats.total;
  const problematicScore = results.fileStats.withProblematic / results.fileStats.total;
  
  log(`📊 Score défensif: ${(defensiveScore * 100).toFixed(1)}%`, defensiveScore > 0.5 ? 'green' : 'yellow');
  log(`📊 Score problématique: ${(problematicScore * 100).toFixed(1)}%`, problematicScore < 0.3 ? 'green' : 'red');
  
  // Recommandations
  log('\n💡 RECOMMANDATIONS', 'blue');
  log('=' .repeat(50), 'blue');
  
  const totalDefensive = Object.values(results.defensive).reduce((sum, r) => sum + r.count, 0);
  const totalProblematic = Object.values(results.problematic).reduce((sum, r) => sum + r.count, 0);
  
  if (totalDefensive > totalProblematic) {
    log('✅ Bonne utilisation de la programmation défensive !', 'green');
  } else {
    log('⚠️ Améliorer la programmation défensive recommandé', 'yellow');
  }
  
  if (results.defensive.Array.isArray.count === 0) {
    log('📝 Ajouter des vérifications Array.isArray() avant les opérations sur tableaux', 'yellow');
  }
  
  if (results.defensive.ensureArray.count === 0) {
    log('📝 Utiliser ensureArray() pour garantir des tableaux valides', 'yellow');
  }
  
  if (results.problematic.direct_map.count > results.defensive.safeMap.count) {
    log('📝 Remplacer .map() par safeMap() pour plus de sécurité', 'yellow');
  }
  
  if (results.problematic.direct_filter.count > results.defensive.safeFilter.count) {
    log('📝 Remplacer .filter() par safeFilter() pour plus de sécurité', 'yellow');
  }
  
  // Score final
  const finalScore = Math.max(0, (totalDefensive - totalProblematic) / Math.max(1, totalDefensive + totalProblematic));
  
  log(`\n🎯 SCORE FINAL DE PROGRAMMATION DÉFENSIVE: ${(finalScore * 100).toFixed(1)}%`, 
      finalScore > 0.7 ? 'green' : finalScore > 0.4 ? 'yellow' : 'red');
  
  if (finalScore > 0.7) {
    log('🎉 Excellente programmation défensive !', 'green');
  } else if (finalScore > 0.4) {
    log('👍 Programmation défensive correcte, améliorations possibles', 'yellow');
  } else {
    log('⚠️ Programmation défensive insuffisante, corrections nécessaires', 'red');
  }
  
  return finalScore > 0.4;
}

// Exécution
testDefensiveProgramming().catch(error => {
  log(`💥 Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
