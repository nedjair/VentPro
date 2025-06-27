# Script PowerShell pour créer l'utilisateur demo via l'API
Write-Host "🔧 CRÉATION DE L'UTILISATEUR DEMO VIA API" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Configuration
$API_BASE_URL = "http://localhost:3001"
$ADMIN_EMAIL = "admin@example.com"
$ADMIN_PASSWORD = "password123"
$DEMO_EMAIL = "admin@demo-tpe.fr"
$DEMO_PASSWORD = "demo123"

try {
    # Étape 1: Se connecter avec l'admin existant
    Write-Host "🔐 Connexion avec l'admin existant..." -ForegroundColor Yellow
    
    $loginBody = @{
        email = $ADMIN_EMAIL
        password = $ADMIN_PASSWORD
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "$API_BASE_URL/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
    
    if ($loginResponse.StatusCode -eq 200) {
        $loginData = $loginResponse.Content | ConvertFrom-Json
        $token = $loginData.data.token
        Write-Host "✅ Connexion admin réussie" -ForegroundColor Green
        
        # Étape 2: Créer l'utilisateur demo directement dans la base de données
        Write-Host "👤 Création de l'utilisateur demo..." -ForegroundColor Yellow
        
        # Utiliser l'endpoint de debug pour corriger les mots de passe
        $debugResponse = Invoke-WebRequest -Uri "$API_BASE_URL/debug/fix-passwords" -Method POST -ContentType "application/json" -UseBasicParsing
        
        if ($debugResponse.StatusCode -eq 200) {
            Write-Host "✅ Utilisateur demo créé/mis à jour avec succès" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Endpoint debug non disponible, création manuelle..." -ForegroundColor Yellow
        }
        
        # Étape 3: Tester la connexion avec le compte demo
        Write-Host "🔍 Test de connexion avec le compte demo..." -ForegroundColor Yellow
        
        $demoLoginBody = @{
            email = $DEMO_EMAIL
            password = $DEMO_PASSWORD
        } | ConvertTo-Json
        
        $demoLoginResponse = Invoke-WebRequest -Uri "$API_BASE_URL/auth/login" -Method POST -ContentType "application/json" -Body $demoLoginBody -UseBasicParsing
        
        if ($demoLoginResponse.StatusCode -eq 200) {
            $demoData = $demoLoginResponse.Content | ConvertFrom-Json
            Write-Host "✅ Connexion demo réussie!" -ForegroundColor Green
            Write-Host "   Email: $($demoData.data.user.email)" -ForegroundColor White
            Write-Host "   Rôle: $($demoData.data.user.role)" -ForegroundColor White
        } else {
            Write-Host "❌ Échec de la connexion demo" -ForegroundColor Red
            Write-Host "   Status: $($demoLoginResponse.StatusCode)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Échec de la connexion admin" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 PROCESSUS TERMINÉ" -ForegroundColor Green
Write-Host "Identifiants disponibles:" -ForegroundColor Cyan
Write-Host "   1. admin@example.com / password123" -ForegroundColor White
Write-Host "   2. admin@demo-tpe.fr / demo123" -ForegroundColor White
