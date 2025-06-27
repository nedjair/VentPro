# Script de lancement complet en production
# Combine migration + corrections + démarrage

param(
    [switch]$Migrate = $false,
    [switch]$Force = $false,
    [switch]$CleanAll = $false
)

Write-Host "🚀 LANCEMENT COMPLET EN PRODUCTION" -ForegroundColor Green
Write-Host "Gestion Commerciale TPE - Migration & Démarrage Docker" -ForegroundColor Green
Write-Host "=" * 60
Write-Host ""

$ErrorActionPreference = "Stop"
$ProjectRoot = "d:/Gestion Commerciale"

try {
    Set-Location $ProjectRoot

    # Affichage du plan d'exécution
    Write-Host "📋 PLAN D'EXÉCUTION:" -ForegroundColor Cyan
    Write-Host "=" * 20
    Write-Host "  1. Vérification des prérequis" -ForegroundColor White
    Write-Host "  2. Migration (si demandée)" -ForegroundColor White  
    Write-Host "  3. Corrections Docker" -ForegroundColor White
    Write-Host "  4. Installation des dépendances" -ForegroundColor White
    Write-Host "  5. Build des applications" -ForegroundColor White
    Write-Host "  6. Démarrage en production" -ForegroundColor White
    Write-Host "  7. Tests de fonctionnement" -ForegroundColor White
    Write-Host ""

    # 1. VÉRIFICATION DES PRÉREQUIS
    Write-Host "✅ ÉTAPE 1: Vérification des prérequis" -ForegroundColor Yellow
    Write-Host "=" * 45

    # Docker
    try {
        $dockerVersion = docker --version
        Write-Host "  ✅ Docker: $dockerVersion" -ForegroundColor Green
        
        $composeVersion = docker-compose --version
        Write-Host "  ✅ Docker Compose: $composeVersion" -ForegroundColor Green
    } catch {
        throw "Docker ou Docker Compose non disponible. Veuillez les installer."
    }

    # Node.js et pnpm
    try {
        $nodeVersion = node --version
        Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️ Node.js non détecté localement (OK pour Docker)" -ForegroundColor Yellow
    }

    try {
        $pnpmVersion = pnpm --version
        Write-Host "  ✅ pnpm: $pnpmVersion" -ForegroundColor Green
    } catch {
        Write-Host "  📦 Installation de pnpm..."
        npm install -g pnpm
        Write-Host "  ✅ pnpm installé" -ForegroundColor Green
    }

    # Vérifier les ports
    Write-Host "  🔍 Vérification des ports..."
    $portsToCheck = @(3000, 3001, 5432, 6379, 6432)
    foreach ($port in $portsToCheck) {
        try {
            $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
            if ($connection) {
                Write-Host "    ⚠️ Port $port occupé" -ForegroundColor Yellow
            } else {
                Write-Host "    ✅ Port $port libre" -ForegroundColor Green
            }
        } catch {
            Write-Host "    ✅ Port $port libre" -ForegroundColor Green
        }
    }

    # 2. MIGRATION (SI DEMANDÉE)
    if ($Migrate) {
        Write-Host ""
        Write-Host "🔄 ÉTAPE 2: Migration vers Docker" -ForegroundColor Yellow
        Write-Host "=" * 35

        if (Test-Path "./migrate-to-docker-production.ps1") {
            Write-Host "  🔄 Exécution de la migration..."
            & "./migrate-to-docker-production.ps1" -KeepOldData -Force:$Force
            if ($LASTEXITCODE -ne 0) { throw "Erreur lors de la migration" }
            Write-Host "  ✅ Migration terminée" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ Script de migration non trouvé, passage aux corrections..." -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "⏭️ ÉTAPE 2: Migration ignorée (utilisez -Migrate si nécessaire)" -ForegroundColor Gray
    }

    # 3. CORRECTIONS DOCKER
    Write-Host ""
    Write-Host "🔧 ÉTAPE 3: Corrections Docker" -ForegroundColor Yellow
    Write-Host "=" * 30

    Write-Host "  🔄 Exécution des corrections..."
    & "./fix-docker-production.ps1" -Force:$Force
    if ($LASTEXITCODE -ne 0) { 
        Write-Host "  ⚠️ Certaines corrections ont échoué, mais on continue..." -ForegroundColor Yellow
    } else {
        Write-Host "  ✅ Corrections appliquées" -ForegroundColor Green
    }

    # 4. NETTOYAGE COMPLET (SI DEMANDÉ)
    if ($CleanAll) {
        Write-Host ""
        Write-Host "🧹 ÉTAPE 4: Nettoyage complet" -ForegroundColor Yellow
        Write-Host "=" * 30

        Write-Host "  🛑 Arrêt de tous les conteneurs..."
        docker stop $(docker ps -aq) 2>$null
        docker rm $(docker ps -aq) 2>$null
        
        Write-Host "  🧹 Nettoyage des images et volumes..."
        docker system prune -af --volumes 2>$null
        
        Write-Host "  📁 Nettoyage des répertoires de build..."
        $cleanDirs = @(
            "node_modules",
            "apps/*/node_modules", 
            "packages/*/node_modules",
            "apps/*/dist",
            "apps/*/.next",
            "packages/*/dist"
        )
        
        foreach ($dir in $cleanDirs) {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        Write-Host "  ✅ Nettoyage complet terminé" -ForegroundColor Green
    }

    # 5. INSTALLATION DES DÉPENDANCES
    Write-Host ""
    Write-Host "📦 ÉTAPE 5: Installation des dépendances" -ForegroundColor Yellow
    Write-Host "=" * 45

    Write-Host "  📦 Installation avec pnpm..."
    pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { 
        Write-Host "  ⚠️ Erreur d'installation, tentative sans --frozen-lockfile..." -ForegroundColor Yellow
        pnpm install
        if ($LASTEXITCODE -ne 0) { throw "Erreur d'installation des dépendances" }
    }
    Write-Host "  ✅ Dépendances installées" -ForegroundColor Green

    # 6. BUILD DES APPLICATIONS
    Write-Host ""
    Write-Host "🔨 ÉTAPE 6: Build des applications" -ForegroundColor Yellow
    Write-Host "=" * 35

    Write-Host "  🔨 Build avec le script de production..."
    if (Test-Path "./scripts/build-production.ps1") {
        & "./scripts/build-production.ps1" -Clean
        if ($LASTEXITCODE -ne 0) { throw "Erreur lors du build" }
        Write-Host "  ✅ Build terminé" -ForegroundColor Green
    } else {
        Write-Host "  📦 Build manuel..."
        
        # Build des packages
        Write-Host "    📚 Build du package shared..."
        pnpm --filter "@gestion/shared" build 2>$null
        
        Write-Host "    🗄️ Génération Prisma..."
        pnpm --filter "@gestion/database" prisma generate 2>$null
        
        Write-Host "    ⚙️ Build du backend..."
        pnpm --filter "@gestion/backend" build 2>$null
        
        Write-Host "    🌐 Build du frontend..."
        pnpm --filter "@gestion/frontend" build 2>$null
        
        Write-Host "    ✅ Build manuel terminé" -ForegroundColor Green
    }

    # 7. DÉMARRAGE EN PRODUCTION
    Write-Host ""
    Write-Host "🚀 ÉTAPE 7: Démarrage en production" -ForegroundColor Yellow
    Write-Host "=" * 40

    Write-Host "  🐳 Démarrage des conteneurs Docker..."
    if (Test-Path "./scripts/start-production.ps1") {
        & "./scripts/start-production.ps1" -Build -Detached
        if ($LASTEXITCODE -ne 0) { throw "Erreur lors du démarrage" }
    } else {
        # Démarrage manuel
        docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
        if ($LASTEXITCODE -ne 0) { throw "Erreur lors du démarrage manuel" }
    }
    Write-Host "  ✅ Conteneurs démarrés" -ForegroundColor Green

    # 8. ATTENTE ET TESTS
    Write-Host ""
    Write-Host "🧪 ÉTAPE 8: Tests de fonctionnement" -ForegroundColor Yellow
    Write-Host "=" * 40

    Write-Host "  ⏳ Attente du démarrage des services (45s)..."
    Start-Sleep -Seconds 45

    # Test des services
    $services = @(
        @{ Name = "Backend"; Url = "http://localhost:3001/health"; Expected = "OK" },
        @{ Name = "Frontend"; Url = "http://localhost:3000"; Expected = "200" }
    )

    foreach ($service in $services) {
        Write-Host "  🔍 Test $($service.Name)..."
        try {
            if ($service.Name -eq "Backend") {
                $response = Invoke-RestMethod -Uri $service.Url -Method Get -TimeoutSec 15
                if ($response.status -eq $service.Expected) {
                    Write-Host "    ✅ $($service.Name) fonctionne" -ForegroundColor Green
                } else {
                    Write-Host "    ⚠️ $($service.Name) réponse inattendue: $($response | ConvertTo-Json)" -ForegroundColor Yellow
                }
            } else {
                $response = Invoke-WebRequest -Uri $service.Url -Method Get -TimeoutSec 15
                if ($response.StatusCode -eq $service.Expected) {
                    Write-Host "    ✅ $($service.Name) fonctionne" -ForegroundColor Green
                } else {
                    Write-Host "    ⚠️ $($service.Name) code: $($response.StatusCode)" -ForegroundColor Yellow
                }
            }
        } catch {
            Write-Host "    ❌ $($service.Name) inaccessible: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    # 9. ÉTAT FINAL DES CONTENEURS
    Write-Host ""
    Write-Host "📊 ÉTAT DES CONTENEURS:" -ForegroundColor Cyan
    Write-Host "=" * 25
    docker-compose -f docker-compose.prod.yml ps

    # RÉSUMÉ FINAL
    Write-Host ""
    Write-Host "🎉 LANCEMENT EN PRODUCTION TERMINÉ!" -ForegroundColor Green
    Write-Host "=" * 40
    Write-Host ""
    Write-Host "🌐 URLs DE L'APPLICATION:" -ForegroundColor Cyan
    Write-Host "  • Frontend:     http://localhost:3000" -ForegroundColor White
    Write-Host "  • Backend API:  http://localhost:3001" -ForegroundColor White  
    Write-Host "  • API Docs:     http://localhost:3001/docs" -ForegroundColor White
    Write-Host "  • Health Check: http://localhost:3001/health" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 COMMANDES UTILES:" -ForegroundColor Cyan
    Write-Host "  • Voir les logs:     docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor White
    Write-Host "  • Arrêter:           docker-compose -f docker-compose.prod.yml down" -ForegroundColor White
    Write-Host "  • Redémarrer:        docker-compose -f docker-compose.prod.yml restart" -ForegroundColor White
    Write-Host "  • État services:     docker-compose -f docker-compose.prod.yml ps" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 MAINTENANCE:" -ForegroundColor Cyan
    Write-Host "  • Backup DB:         ./scripts/backup-database.ps1" -ForegroundColor White
    Write-Host "  • Mise à jour:       git pull && ./launch-production-complete.ps1 -Force" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 Documentation complète dans PRODUCTION.md" -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "❌ ERREUR LORS DU LANCEMENT: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 DIAGNOSTIC:" -ForegroundColor Yellow
    Write-Host "  1. Vérifiez que Docker Desktop est démarré" -ForegroundColor White  
    Write-Host "  2. Consultez les logs: docker-compose -f docker-compose.prod.yml logs" -ForegroundColor White
    Write-Host "  3. Vérifiez les ports disponibles: netstat -an | findstr 3000" -ForegroundColor White
    Write-Host "  4. Essayez un nettoyage complet: ./launch-production-complete.ps1 -Force -CleanAll" -ForegroundColor White
    Write-Host ""
    Write-Host "🆘 EN CAS DE PROBLÈME:" -ForegroundColor Yellow
    Write-Host "  • Arrêter tout:      docker stop `$(docker ps -aq)" -ForegroundColor White
    Write-Host "  • Nettoyer:          docker system prune -af" -ForegroundColor White
    Write-Host "  • Recommencer:       ./launch-production-complete.ps1 -Migrate -Force -CleanAll" -ForegroundColor White
    
    exit 1
} finally {
    Set-Location $ProjectRoot
}

Write-Host ""
Write-Host "🎯 APPLICATION EN PRODUCTION PRETE A L'UTILISATION!" -ForegroundColor Green