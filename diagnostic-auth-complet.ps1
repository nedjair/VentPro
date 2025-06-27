#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC COMPLET AUTHENTIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Vérifier les services
Write-Host "`n1. VERIFICATION DES SERVICES" -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Yellow

# Backend
try {
    $backendHealth = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend (3001): ACTIF" -ForegroundColor Green
    Write-Host "   Status: $($backendHealth.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend (3001): INACTIF" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Gray
}

# Frontend
try {
    $frontendHealth = Invoke-WebRequest -Uri "http://localhost:3003" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Frontend (3003): ACTIF" -ForegroundColor Green
    Write-Host "   Status: $($frontendHealth.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Frontend (3003): INACTIF" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Gray
}

# 2. Test authentification API directe
Write-Host "`n2. TEST AUTHENTIFICATION API DIRECTE" -ForegroundColor Yellow
Write-Host "-------------------------------------" -ForegroundColor Yellow

$credentials = @{
    email = "admin@demo-tpe.fr"
    password = "demo123"
} | ConvertTo-Json

try {
    $authResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $credentials -UseBasicParsing
    $authData = $authResponse.Content | ConvertFrom-Json
    
    if ($authData.success) {
        Write-Host "✅ Authentification API: SUCCÈS" -ForegroundColor Green
        Write-Host "   Email: $($authData.data.user.email)" -ForegroundColor Gray
        Write-Host "   Rôle: $($authData.data.user.role)" -ForegroundColor Gray
        Write-Host "   Token: $($authData.data.token.Substring(0, 20))..." -ForegroundColor Gray
        
        # Stocker le token pour les tests suivants
        $global:authToken = $authData.data.token
    } else {
        Write-Host "❌ Authentification API: ÉCHEC" -ForegroundColor Red
        Write-Host "   Message: $($authData.message)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Authentification API: ERREUR" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Gray
}

# 3. Test vérification token
Write-Host "`n3. TEST VERIFICATION TOKEN" -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Yellow

if ($global:authToken) {
    try {
        $headers = @{
            "Authorization" = "Bearer $global:authToken"
            "Content-Type" = "application/json"
        }
        
        $verifyResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/verify" -Method GET -Headers $headers -UseBasicParsing
        $verifyData = $verifyResponse.Content | ConvertFrom-Json
        
        if ($verifyData.success) {
            Write-Host "✅ Vérification token: SUCCÈS" -ForegroundColor Green
            Write-Host "   Email: $($verifyData.data.email)" -ForegroundColor Gray
            Write-Host "   Rôle: $($verifyData.data.role)" -ForegroundColor Gray
        } else {
            Write-Host "❌ Vérification token: ÉCHEC" -ForegroundColor Red
            Write-Host "   Message: $($verifyData.message)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Vérification token: ERREUR" -ForegroundColor Red
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Pas de token disponible pour le test" -ForegroundColor Yellow
}

# 4. Test accès dashboard avec token
Write-Host "`n4. TEST ACCES DASHBOARD AVEC TOKEN" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

if ($global:authToken) {
    try {
        $headers = @{
            "Authorization" = "Bearer $global:authToken"
            "Content-Type" = "application/json"
        }
        
        $dashboardResponse = Invoke-WebRequest -Uri "http://localhost:3001/dashboard/stats" -Method GET -Headers $headers -UseBasicParsing
        $dashboardData = $dashboardResponse.Content | ConvertFrom-Json
        
        if ($dashboardData.success) {
            Write-Host "✅ Accès dashboard: SUCCÈS" -ForegroundColor Green
            Write-Host "   Données reçues: $($dashboardData.data.GetType().Name)" -ForegroundColor Gray
        } else {
            Write-Host "❌ Accès dashboard: ÉCHEC" -ForegroundColor Red
            Write-Host "   Message: $($dashboardData.message)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Accès dashboard: ERREUR" -ForegroundColor Red
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Pas de token disponible pour le test" -ForegroundColor Yellow
}

# 5. Test frontend avec simulation de cookies
Write-Host "`n5. TEST FRONTEND AVEC SIMULATION" -ForegroundColor Yellow
Write-Host "---------------------------------" -ForegroundColor Yellow

if ($global:authToken) {
    try {
        # Simuler une requête avec cookie
        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $cookie = New-Object System.Net.Cookie("auth-token", $global:authToken, "/", "localhost")
        $session.Cookies.Add($cookie)
        
        $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3003/" -WebSession $session -UseBasicParsing
        
        if ($frontendResponse.StatusCode -eq 200) {
            Write-Host "✅ Accès frontend avec cookie: SUCCÈS" -ForegroundColor Green
            Write-Host "   Status: $($frontendResponse.StatusCode)" -ForegroundColor Gray
            
            # Vérifier si on est redirigé vers login
            if ($frontendResponse.Content -match "Connexion à votre compte") {
                Write-Host "⚠️  Frontend redirige vers login malgré le cookie" -ForegroundColor Yellow
            } else {
                Write-Host "✅ Frontend affiche le contenu authentifié" -ForegroundColor Green
            }
        } else {
            Write-Host "❌ Accès frontend: ÉCHEC" -ForegroundColor Red
            Write-Host "   Status: $($frontendResponse.StatusCode)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Test frontend: ERREUR" -ForegroundColor Red
        Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Pas de token disponible pour le test" -ForegroundColor Yellow
}

# 6. Vérifier les processus Node.js
Write-Host "`n6. VERIFICATION PROCESSUS NODE.JS" -ForegroundColor Yellow
Write-Host "----------------------------------" -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Processus Node.js actifs:" -ForegroundColor Gray
    foreach ($process in $nodeProcesses) {
        try {
            $connections = Get-NetTCPConnection -OwningProcess $process.Id -ErrorAction SilentlyContinue
            $ports = $connections | Where-Object { $_.LocalPort -in @(3001, 3003) } | Select-Object LocalPort
            if ($ports) {
                Write-Host "  PID $($process.Id): Ports $($ports.LocalPort -join ', ')" -ForegroundColor Gray
            }
        } catch {
            # Ignorer les erreurs de connexion
        }
    }
} else {
    Write-Host "❌ Aucun processus Node.js trouvé" -ForegroundColor Red
}

# 7. Recommandations
Write-Host "`n7. RECOMMANDATIONS" -ForegroundColor Yellow
Write-Host "------------------" -ForegroundColor Yellow

Write-Host "Basé sur les tests ci-dessus:" -ForegroundColor Gray
Write-Host "1. Si l'authentification API fonctionne mais pas le frontend:" -ForegroundColor Gray
Write-Host "   → Problème dans le middleware Next.js ou la gestion des cookies" -ForegroundColor Gray
Write-Host "2. Si la vérification token échoue:" -ForegroundColor Gray
Write-Host "   → Problème dans l'endpoint /auth/verify" -ForegroundColor Gray
Write-Host "3. Si le dashboard n'est pas accessible:" -ForegroundColor Gray
Write-Host "   → Problème dans l'authentification des routes protégées" -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC TERMINÉ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
