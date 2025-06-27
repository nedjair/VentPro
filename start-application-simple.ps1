# =============================================================================
# SCRIPT DE DÉMARRAGE SIMPLIFIÉ - GESTION COMMERCIALE TPE
# Architecture simplifiée : Frontend Next.js + Backend Fastify
# =============================================================================

Write-Host "DEMARRAGE SIMPLIFIE - GESTION COMMERCIALE TPE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Architecture: Frontend Next.js (3003) + Backend Fastify (3001)" -ForegroundColor Gray
Write-Host ""

# Fonction pour vérifier si un port est utilisé
function Test-Port {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return $connection -ne $null
    } catch {
        return $false
    }
}

# Fonction pour attendre qu'un service soit prêt
function Wait-ForService {
    param([string]$Url, [string]$ServiceName, [int]$MaxWait = 30)
    
    Write-Host "Attente du service $ServiceName..." -ForegroundColor Yellow
    $count = 0
    
    while ($count -lt $MaxWait) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                Write-Host "OK $ServiceName: PRET" -ForegroundColor Green
                return $true
            }
        } catch {
            # Service pas encore prêt
        }
        
        Start-Sleep -Seconds 1
        $count++
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "TIMEOUT $ServiceName: Non accessible après ${MaxWait}s" -ForegroundColor Red
    return $false
}

# =============================================================================
# 1. VÉRIFICATION DES PRÉREQUIS
# =============================================================================
Write-Host "1. VERIFICATION DES PREREQUIS" -ForegroundColor Yellow

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Host "OK Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Node.js non installé" -ForegroundColor Red
    exit 1
}

# Vérifier Docker
try {
    $dockerVersion = docker --version
    Write-Host "OK Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Docker non installé" -ForegroundColor Red
    exit 1
}

# =============================================================================
# 2. DÉMARRAGE DE L'INFRASTRUCTURE
# =============================================================================
Write-Host "`n2. DEMARRAGE DE L'INFRASTRUCTURE" -ForegroundColor Yellow

Write-Host "Démarrage de PostgreSQL + Redis..." -ForegroundColor White
try {
    docker-compose up -d
    Start-Sleep -Seconds 5
    Write-Host "OK Infrastructure: DEMARREE" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Infrastructure: ECHEC" -ForegroundColor Red
    exit 1
}

# =============================================================================
# 3. DÉMARRAGE DU BACKEND
# =============================================================================
Write-Host "`n3. DEMARRAGE DU BACKEND" -ForegroundColor Yellow

# Vérifier si le backend est déjà en cours d'exécution
if (Test-Port -Port 3001) {
    Write-Host "ATTENTION Backend déjà en cours d'exécution sur le port 3001" -ForegroundColor Yellow
} else {
    Write-Host "Démarrage du backend de production..." -ForegroundColor White
    
    # Démarrer le backend en arrière-plan
    Start-Process PowerShell -ArgumentList "-File", "start-production-backend.ps1" -WindowStyle Minimized
    
    # Attendre que le backend soit prêt
    if (Wait-ForService -Url "http://localhost:3001/health" -ServiceName "Backend" -MaxWait 30) {
        Write-Host "OK Backend: OPERATIONNEL" -ForegroundColor Green
    } else {
        Write-Host "ERREUR Backend: ECHEC DU DEMARRAGE" -ForegroundColor Red
        exit 1
    }
}

# =============================================================================
# 4. DÉMARRAGE DU FRONTEND
# =============================================================================
Write-Host "`n4. DEMARRAGE DU FRONTEND" -ForegroundColor Yellow

# Vérifier si le frontend est déjà en cours d'exécution
if (Test-Port -Port 3003) {
    Write-Host "ATTENTION Frontend déjà en cours d'exécution sur le port 3003" -ForegroundColor Yellow
} else {
    Write-Host "Démarrage du frontend Next.js..." -ForegroundColor White
    
    # Démarrer le frontend en arrière-plan
    Start-Process PowerShell -ArgumentList "-File", "start-frontend-nextjs.ps1" -WindowStyle Minimized
    
    # Attendre que le frontend soit prêt
    if (Wait-ForService -Url "http://localhost:3003" -ServiceName "Frontend" -MaxWait 45) {
        Write-Host "OK Frontend: OPERATIONNEL" -ForegroundColor Green
    } else {
        Write-Host "ERREUR Frontend: ECHEC DU DEMARRAGE" -ForegroundColor Red
        exit 1
    }
}

# =============================================================================
# 5. VÉRIFICATION FINALE
# =============================================================================
Write-Host "`n5. VERIFICATION FINALE" -ForegroundColor Yellow

Write-Host "Test de la connexion frontend-backend..." -ForegroundColor White
try {
    # Test simple de l'API
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "OK Connexion API: FONCTIONNELLE" -ForegroundColor Green
    }
} catch {
    Write-Host "ATTENTION Connexion API: PROBLEME" -ForegroundColor Yellow
}

# =============================================================================
# 6. RÉSUMÉ ET ACCÈS
# =============================================================================
Write-Host "`n6. APPLICATION DEMARREE AVEC SUCCES !" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

Write-Host "ACCES A L'APPLICATION :" -ForegroundColor Cyan
Write-Host "  Frontend Next.js       : http://localhost:3003" -ForegroundColor White
Write-Host "  Backend API            : http://localhost:3001" -ForegroundColor White
Write-Host "  Health Check           : http://localhost:3001/health" -ForegroundColor White
Write-Host "  Métriques              : http://localhost:3001/metrics" -ForegroundColor White
Write-Host ""

Write-Host "IDENTIFIANTS DE CONNEXION :" -ForegroundColor Cyan
Write-Host "  Email                  : admin@demo-tpe.fr" -ForegroundColor White
Write-Host "  Mot de passe           : demo123" -ForegroundColor White
Write-Host ""

Write-Host "OUTILS D'ADMINISTRATION :" -ForegroundColor Cyan
Write-Host "  Adminer (PostgreSQL)   : http://localhost:8080" -ForegroundColor White
Write-Host "  Redis Commander        : http://localhost:8081" -ForegroundColor White
Write-Host ""

Write-Host "COMMANDES UTILES :" -ForegroundColor Cyan
Write-Host "  Tests complets         : .\verification-finale-complete.ps1" -ForegroundColor White
Write-Host "  Arrêt backend          : .\stop-production-backend.ps1" -ForegroundColor White
Write-Host "  Arrêt infrastructure   : docker-compose down" -ForegroundColor White
Write-Host ""

Write-Host "L'application Gestion Commerciale TPE est maintenant prête !" -ForegroundColor Green
Write-Host "Accédez à l'interface : http://localhost:3003" -ForegroundColor Cyan

# Ouvrir automatiquement le navigateur
try {
    Start-Process "http://localhost:3003"
    Write-Host "Ouverture automatique du navigateur..." -ForegroundColor Gray
} catch {
    Write-Host "Impossible d'ouvrir automatiquement le navigateur" -ForegroundColor Yellow
}

Write-Host "`nDEMARRAGE TERMINE" -ForegroundColor Green
