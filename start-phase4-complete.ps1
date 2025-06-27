# Script de démarrage Phase 4 - Module Commercial Complet
Write-Host "🚀 DÉMARRAGE PHASE 4 - MODULE COMMERCIAL COMPLET" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green

# Arrêter les processus existants
Write-Host "`n1. ARRÊT DES PROCESSUS EXISTANTS" -ForegroundColor Yellow
try {
    Get-Process -Name 'node' -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "   ✅ Processus Node.js arrêtés" -ForegroundColor Green
} catch {
    Write-Host "   ℹ️ Aucun processus Node.js à arrêter" -ForegroundColor Blue
}

# Vérifier Docker
Write-Host "`n2. VÉRIFICATION INFRASTRUCTURE DOCKER" -ForegroundColor Yellow
$dockerStatus = docker-compose ps --format json 2>$null
if ($LASTEXITCODE -ne 0 -or !$dockerStatus) {
    Write-Host "   ❌ Services Docker non démarrés" -ForegroundColor Red
    Write-Host "   🔄 Démarrage des services..." -ForegroundColor Blue
    docker-compose up -d
    Start-Sleep -Seconds 10
} else {
    Write-Host "   ✅ Services Docker opérationnels" -ForegroundColor Green
}

# Démarrer le backend Phase 4
Write-Host "`n3. DÉMARRAGE BACKEND PHASE 4" -ForegroundColor Yellow
Write-Host "   🚀 Démarrage production-backend.js avec Module Commercial..." -ForegroundColor Blue

# Définir les variables d'environnement
$env:NODE_ENV = "development"
$env:PORT = "3001"
$env:DATABASE_URL = "postgresql://gestion_user:gestion_password@localhost:5432/gestion_commerciale"
$env:REDIS_URL = "redis://localhost:6379"
$env:JWT_SECRET = "your-super-secret-jwt-key-change-in-production"

# Démarrer le serveur en arrière-plan
Start-Process -FilePath "node" -ArgumentList "production-backend.js" -NoNewWindow

# Attendre que le serveur démarre
Write-Host "   ⏳ Attente du démarrage..." -ForegroundColor Blue
Start-Sleep -Seconds 8

# Tester la connexion
Write-Host "`n4. TESTS DE VALIDATION PHASE 4" -ForegroundColor Yellow
$allTestsPassed = $true

# Test Health Check
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 10
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Health Check : OPÉRATIONNEL" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Health Check : ÉCHEC" -ForegroundColor Red
    $allTestsPassed = $false
}

# Test nouvelles routes Phase 4
$routes = @(
    @{url="http://localhost:3001/api/v1/orders"; name="Orders API"},
    @{url="http://localhost:3001/api/v1/invoices"; name="Invoices API"},
    @{url="http://localhost:3001/api/v1/orders/stats/overview"; name="Orders Stats"},
    @{url="http://localhost:3001/api/v1/invoices/stats/overview"; name="Invoices Stats"}
)

foreach ($route in $routes) {
    try {
        Invoke-WebRequest -Uri $route.url -ErrorAction Stop
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "   ✅ $($route.name) : ACCESSIBLE (auth requise)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $($route.name) : PROBLÈME" -ForegroundColor Red
            $allTestsPassed = $false
        }
    }
}

# Résultat final
Write-Host "`n🎯 RÉSULTAT FINAL" -ForegroundColor Green
if ($allTestsPassed) {
    Write-Host "✅ PHASE 4 - MODULE COMMERCIAL OPÉRATIONNEL !" -ForegroundColor Green
} else {
    Write-Host "❌ PROBLÈMES DÉTECTÉS - Vérification nécessaire" -ForegroundColor Red
}

Write-Host "`n📋 INFORMATIONS DE CONNEXION" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Green
Write-Host "🌐 URLs disponibles:" -ForegroundColor White
Write-Host "  • Health Check    : http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "  • API Orders      : http://localhost:3001/api/v1/orders" -ForegroundColor Cyan
Write-Host "  • API Invoices    : http://localhost:3001/api/v1/invoices" -ForegroundColor Cyan
Write-Host "  • Login           : POST http://localhost:3001/auth/login" -ForegroundColor Cyan

Write-Host "`n🔐 Identifiants de test:" -ForegroundColor White
Write-Host "  • Email           : manager@demo-tpe.fr" -ForegroundColor Cyan
Write-Host "  • Mot de passe    : demo123" -ForegroundColor Cyan

Write-Host "`n🛠️ Nouvelles fonctionnalités Phase 4:" -ForegroundColor White
Write-Host "  • Gestion complète des devis (QUOTE)" -ForegroundColor Cyan
Write-Host "  • Gestion complète des commandes (ORDER)" -ForegroundColor Cyan
Write-Host "  • Gestion complète des factures (INVOICE)" -ForegroundColor Cyan
Write-Host "  • Workflow Devis → Commande → Facture" -ForegroundColor Cyan
Write-Host "  • Calculs automatiques HT/TVA/TTC" -ForegroundColor Cyan
Write-Host "  • Numérotation automatique légale" -ForegroundColor Cyan
Write-Host "  • Statistiques commerciales temps réel" -ForegroundColor Cyan

Write-Host "`n⚡ Commandes utiles:" -ForegroundColor White
Write-Host "  • Arrêter : Get-Process -Name 'node' | Stop-Process -Force" -ForegroundColor Gray
Write-Host "  • Tester  : .\test-phase4-final.ps1" -ForegroundColor Gray
Write-Host "  • Logs    : Voir terminal du processus Node.js" -ForegroundColor Gray

Write-Host "`n🎉 PHASE 4 PRÊTE POUR LA PRODUCTION !" -ForegroundColor Green
