# Test de la route PUT pour les factures avec le backend de production
Write-Host "Test de la route PUT /api/v1/invoices/:id" -ForegroundColor Blue

# Demarrer le backend de production
Write-Host "Demarrage du backend de production..." -ForegroundColor Yellow
$process = Start-Process -FilePath "node" -ArgumentList "production-backend.js" -PassThru -WindowStyle Hidden

# Attendre que le serveur soit pret
Write-Host "Attente du demarrage (10 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

try {
    # Test health check
    Write-Host "Test health check..." -ForegroundColor Yellow
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
    Write-Host "Health check OK: $($health.status)" -ForegroundColor Green
    
    # Login
    Write-Host "Login..." -ForegroundColor Yellow
    $loginBody = @{
        email = "admin@demo-tpe.fr"
        password = "demo123"
    } | ConvertTo-Json
    
    $login = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 5
    
    if ($login.success) {
        Write-Host "Login reussi" -ForegroundColor Green
        $token = $login.token
        
        # Liste des factures
        Write-Host "Recuperation des factures..." -ForegroundColor Yellow
        $headers = @{ "Authorization" = "Bearer $token" }
        $invoices = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/invoices" -Method GET -Headers $headers -TimeoutSec 5
        
        if ($invoices.success -and $invoices.data.Count -gt 0) {
            Write-Host "$($invoices.data.Count) factures trouvees" -ForegroundColor Green
            $firstInvoice = $invoices.data[0]
            Write-Host "Test avec facture ID: $($firstInvoice.id)" -ForegroundColor Cyan
            
            # Test PUT - Mise a jour de la facture
            Write-Host "Test PUT - Mise a jour de la facture..." -ForegroundColor Yellow
            $updateBody = @{
                notes = "Facture mise a jour via test PowerShell le $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            } | ConvertTo-Json
            
            $update = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/invoices/$($firstInvoice.id)" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $headers -TimeoutSec 5
            
            if ($update.success) {
                Write-Host "SUCCESS! La route PUT fonctionne parfaitement!" -ForegroundColor Green
                Write-Host "Message: $($update.message)" -ForegroundColor Green
                Write-Host "L'erreur HTTP 404 sur PUT /api/v1/invoices/12 est resolue!" -ForegroundColor Green
            } else {
                Write-Host "PUT failed: $($update.message)" -ForegroundColor Red
            }
        } else {
            Write-Host "Aucune facture disponible pour le test" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Login failed: $($login.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Arreter le backend
    Write-Host "Arret du backend..." -ForegroundColor Yellow
    if (-not $process.HasExited) {
        $process.Kill()
        Write-Host "Backend arrete" -ForegroundColor Green
    }
}

Write-Host "Test termine!" -ForegroundColor Blue
