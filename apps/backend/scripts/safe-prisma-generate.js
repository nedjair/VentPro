const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Génération Sécurisée de Prisma');
console.log('=' .repeat(50));

async function safePrismaGenerate() {
  try {
    const projectRoot = path.join(__dirname, '..', '..', '..');
    const prismaClientPath = path.join(projectRoot, 'packages', 'database', 'generated', 'client');
    const schemaPath = path.join(projectRoot, 'packages', 'database', 'schema.prisma');
    
    // 1. Vérifier si le client Prisma existe déjà
    console.log('\n1. 🔍 Vérification du client Prisma...');
    
    const clientIndexPath = path.join(prismaClientPath, 'index.js');
    if (fs.existsSync(clientIndexPath)) {
      console.log('   ✅ Client Prisma déjà généré');
      console.log('   ℹ️ Utilisation du client existant');
      return true;
    }
    
    console.log('   ⚠️ Client Prisma manquant, génération nécessaire');
    
    // 2. Nettoyer les fichiers temporaires
    console.log('\n2. 🧹 Nettoyage des fichiers temporaires...');
    
    if (fs.existsSync(prismaClientPath)) {
      try {
        const files = fs.readdirSync(prismaClientPath);
        const tempFiles = files.filter(file => file.includes('.tmp'));
        
        for (const tempFile of tempFiles) {
          const tempFilePath = path.join(prismaClientPath, tempFile);
          try {
            fs.unlinkSync(tempFilePath);
            console.log(`   ✅ Supprimé: ${tempFile}`);
          } catch (error) {
            console.log(`   ⚠️ Impossible de supprimer ${tempFile}: ${error.message}`);
          }
        }
        
        if (tempFiles.length === 0) {
          console.log('   ℹ️ Aucun fichier temporaire trouvé');
        }
      } catch (error) {
        console.log(`   ⚠️ Erreur lors du nettoyage: ${error.message}`);
      }
    }
    
    // 3. Générer Prisma avec retry
    console.log('\n3. 🔄 Génération de Prisma...');
    
    const maxRetries = 3;
    let attempt = 0;
    let success = false;
    
    while (attempt < maxRetries && !success) {
      attempt++;
      console.log(`   📦 Tentative ${attempt}/${maxRetries}...`);
      
      try {
        // Si ce n'est pas la première tentative, supprimer le dossier client
        if (attempt > 1 && fs.existsSync(prismaClientPath)) {
          console.log('   🗂️ Suppression du dossier client pour retry...');
          fs.rmSync(prismaClientPath, { recursive: true, force: true });
        }
        
        const generateProcess = spawn('npx', ['prisma', 'generate', `--schema=${schemaPath}`], {
          stdio: 'pipe',
          shell: true
        });
        
        let output = '';
        let errorOutput = '';
        
        generateProcess.stdout.on('data', (data) => {
          const text = data.toString();
          output += text;
          if (text.includes('Generated') || text.includes('✔')) {
            console.log(`   ✅ ${text.trim()}`);
          }
        });
        
        generateProcess.stderr.on('data', (data) => {
          const text = data.toString();
          errorOutput += text;
          if (!text.includes('EPERM')) {
            console.log(`   ⚠️ ${text.trim()}`);
          }
        });
        
        const exitCode = await new Promise((resolve) => {
          generateProcess.on('close', resolve);
        });
        
        if (exitCode === 0) {
          console.log(`   ✅ Génération réussie (tentative ${attempt})`);
          success = true;
        } else {
          console.log(`   ❌ Échec tentative ${attempt} (code: ${exitCode})`);
          
          if (errorOutput.includes('EPERM')) {
            console.log('   🔒 Erreur de permissions détectée');
            
            if (attempt < maxRetries) {
              console.log('   ⏳ Attente avant retry...');
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } else {
            console.log(`   📋 Erreur: ${errorOutput.trim()}`);
            break;
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Erreur lors de la tentative ${attempt}: ${error.message}`);
      }
    }
    
    // 4. Vérifier le résultat
    console.log('\n4. ✅ Vérification finale...');
    
    if (fs.existsSync(clientIndexPath)) {
      console.log('   ✅ Client Prisma généré avec succès');
      return true;
    } else {
      console.log('   ❌ Échec de la génération du client Prisma');
      
      console.log('\n💡 Solutions manuelles:');
      console.log('   1. Fermer VS Code et autres éditeurs');
      console.log('   2. Redémarrer PowerShell en administrateur');
      console.log('   3. Exécuter: npm run dev:force (sans génération Prisma)');
      console.log('   4. Utiliser: start-backend-safe.bat');
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération sécurisée:', error.message);
    return false;
  }
}

// Exécuter la génération sécurisée
safePrismaGenerate().then(success => {
  if (success) {
    console.log('\n🎯 Génération Prisma terminée avec succès');
    process.exit(0);
  } else {
    console.log('\n❌ Échec de la génération Prisma');
    console.log('💡 Utilisez npm run dev:force pour démarrer sans régénération');
    process.exit(1);
  }
});
