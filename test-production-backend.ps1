# Script PowerShell pour tester le backend de production
Write-Host "🧪 Test du backend de production..." -ForegroundColor Blue

# 1. Démarrer le backend de production
Write-Host "`n1. Démarrage du backend de production..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "node" -ArgumentList "production-backend.js" -PassThru -WindowStyle Hidden

# Attendre que le serveur soit prêt
Write-Host "⏳ Attente du démarrage du serveur..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# 2. Tester la route health
Write-Host "`n2. Test de la route health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Health check OK: $($healthResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "⚠️ Arrêt du test" -ForegroundColor Yellow
    if (-not $backendProcess.HasExited) {
        $backendProcess.Kill()
    }
    exit 1
}

# 3. Login pour obtenir un token
Write-Host "`n3. Login pour obtenir un token..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@demo-tpe.fr"
        password = "demo123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 5
    
    if ($loginResponse.success) {
        $token = $loginResponse.token
        Write-Host "✅ Login réussi, token obtenu" -ForegroundColor Green
    } else {
        Write-Host "❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
        throw "Login failed"
    }
} catch {
    Write-Host "❌ Login error: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $backendProcess.HasExited) {
        $backendProcess.Kill()
    }
    exit 1
}

# 4. Lister les factures
Write-Host "`n4. Liste des factures..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $invoicesResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/invoices" -Method GET -Headers $headers -TimeoutSec 5
    
    if ($invoicesResponse.success) {
        $invoices = $invoicesResponse.data
        Write-Host "✅ $($invoices.Count) factures trouvées" -ForegroundColor Green
        
        if ($invoices.Count -gt 0) {
            $firstInvoice = $invoices[0]
            Write-Host "📄 Test avec facture ID: $($firstInvoice.id)" -ForegroundColor Cyan
            
            # 5. Test PUT - Mise à jour de la facture
            Write-Host "`n5. Test PUT - Mise à jour facture..." -ForegroundColor Yellow
            try {
                $updateBody = @{
                    notes = "Facture mise à jour via test PowerShell le $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                } | ConvertTo-Json
                
                $updateResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/invoices/$($firstInvoice.id)" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $headers -TimeoutSec 5
                
                if ($updateResponse.success) {
                    Write-Host "✅ PUT /api/v1/invoices/:id - SUCCESS!" -ForegroundColor Green
                    Write-Host "📝 Message: $($updateResponse.message)" -ForegroundColor Green
                    Write-Host "🎉 La route PUT fonctionne correctement!" -ForegroundColor Green
                } else {
                    Write-Host "❌ PUT failed: $($updateResponse.message)" -ForegroundColor Red
                }
            } catch {
                Write-Host "❌ PUT error: $($_.Exception.Message)" -ForegroundColor Red
            }
            
        } else {
            Write-Host "⚠️ Aucune facture disponible pour le test" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Liste factures failed: $($invoicesResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Liste factures error: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Nettoyage
Write-Host "`n6. Nettoyage..." -ForegroundColor Yellow
if (-not $backendProcess.HasExited) {
    $backendProcess.Kill()
    Write-Host "✅ Backend arrêté" -ForegroundColor Green
}

Write-Host "`n🎉 Tests terminés!" -ForegroundColor Blue
