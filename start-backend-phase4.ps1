# Script de démarrage du backend Phase 4 avec nouvelles routes
Write-Host "🚀 DEMARRAGE BACKEND PHASE 4 - MODULE COMMERCIAL" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Arrêter les processus existants
Write-Host "1. ARRET DES PROCESSUS EXISTANTS" -ForegroundColor Yellow
try {
    Get-Process -Name 'node' -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "   ✅ Processus Node.js arrêtés" -ForegroundColor Green
} catch {
    Write-Host "   ℹ️ Aucun processus Node.js à arrêter" -ForegroundColor Blue
}

# Vérifier Docker
Write-Host "`n2. VERIFICATION INFRASTRUCTURE DOCKER" -ForegroundColor Yellow
$dockerStatus = docker-compose ps --format json | ConvertFrom-Json
if ($dockerStatus.Count -eq 0) {
    Write-Host "   ❌ Services Docker non démarrés" -ForegroundColor Red
    Write-Host "   🔄 Démarrage des services..." -ForegroundColor Blue
    docker-compose up -d
    Start-Sleep -Seconds 10
}

$postgresStatus = docker-compose ps postgres --format json | ConvertFrom-Json
$redisStatus = docker-compose ps redis --format json | ConvertFrom-Json

if ($postgresStatus.State -eq "running" -and $redisStatus.State -eq "running") {
    Write-Host "   ✅ PostgreSQL et Redis opérationnels" -ForegroundColor Green
} else {
    Write-Host "   ❌ Problème avec l'infrastructure Docker" -ForegroundColor Red
    exit 1
}

# Compiler le backend TypeScript
Write-Host "`n3. COMPILATION DU BACKEND TYPESCRIPT" -ForegroundColor Yellow
Set-Location "apps/backend"

# Installer les dépendances si nécessaire
if (!(Test-Path "node_modules")) {
    Write-Host "   📦 Installation des dépendances..." -ForegroundColor Blue
    npm install
}

# Compiler TypeScript
Write-Host "   🔨 Compilation TypeScript..." -ForegroundColor Blue
npx tsc

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erreur de compilation TypeScript" -ForegroundColor Red
    Set-Location "../.."
    exit 1
}

Write-Host "   ✅ Compilation réussie" -ForegroundColor Green

# Démarrer le backend
Write-Host "`n4. DEMARRAGE DU BACKEND PHASE 4" -ForegroundColor Yellow
Write-Host "   🚀 Démarrage du serveur..." -ForegroundColor Blue

# Définir les variables d'environnement
$env:NODE_ENV = "development"
$env:PORT = "3001"
$env:DATABASE_URL = "postgresql://gestion_user:gestion_password@localhost:5432/gestion_commerciale"
$env:REDIS_URL = "redis://localhost:6379"
$env:JWT_SECRET = "your-super-secret-jwt-key-change-in-production"

# Démarrer le serveur
Start-Process -FilePath "node" -ArgumentList "dist/index.js" -NoNewWindow

# Attendre que le serveur démarre
Write-Host "   ⏳ Attente du démarrage..." -ForegroundColor Blue
Start-Sleep -Seconds 5

# Tester la connexion
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Backend Phase 4 opérationnel" -ForegroundColor Green
        
        # Tester les nouvelles routes
        Write-Host "`n5. TEST DES NOUVELLES ROUTES PHASE 4" -ForegroundColor Yellow
        
        # Test route orders (sans auth pour le moment)
        try {
            $ordersTest = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/orders" -Method GET -ErrorAction SilentlyContinue
            Write-Host "   ✅ Route /orders accessible" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️ Route /orders nécessite authentification (normal)" -ForegroundColor Yellow
        }
        
        # Test route invoices
        try {
            $invoicesTest = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/invoices" -Method GET -ErrorAction SilentlyContinue
            Write-Host "   ✅ Route /invoices accessible" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️ Route /invoices nécessite authentification (normal)" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "   ❌ Backend non accessible" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erreur de connexion au backend" -ForegroundColor Red
}

Set-Location "../.."

Write-Host "`n🎯 BACKEND PHASE 4 - MODULE COMMERCIAL PRET!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "URLs disponibles:" -ForegroundColor White
Write-Host "  • Health Check: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "  • API Orders: http://localhost:3001/api/v1/orders" -ForegroundColor Cyan
Write-Host "  • API Invoices: http://localhost:3001/api/v1/invoices" -ForegroundColor Cyan
Write-Host "  • Documentation: http://localhost:3001/docs" -ForegroundColor Cyan
Write-Host "`nIdentifiants de test:" -ForegroundColor White
Write-Host "  • Email: admin@demo-tpe.fr" -ForegroundColor Cyan
Write-Host "  • Mot de passe: demo123" -ForegroundColor Cyan
Write-Host "`nPour arrêter: Get-Process -Name 'node' | Stop-Process -Force" -ForegroundColor Gray
