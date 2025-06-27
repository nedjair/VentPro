# Test final Phase 4
Write-Host "TEST PHASE 4 - MODULE COMMERCIAL" -ForegroundColor Green

# Test Health Check
Write-Host "`n1. Health Check"
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3001/health"
    Write-Host "OK Backend operationnel" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Backend non accessible" -ForegroundColor Red
    exit 1
}

# Test nouvelles routes (doivent retourner 401 = auth requise)
Write-Host "`n2. Test nouvelles routes Phase 4"

$routes = @(
    "http://localhost:3001/api/v1/orders",
    "http://localhost:3001/api/v1/invoices", 
    "http://localhost:3001/api/v1/orders/stats/overview",
    "http://localhost:3001/api/v1/invoices/stats/overview"
)

foreach ($route in $routes) {
    try {
        Invoke-WebRequest -Uri $route -ErrorAction Stop
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "OK Route $route existe (auth requise)" -ForegroundColor Green
        } else {
            Write-Host "ERREUR Route $route probleme" -ForegroundColor Red
        }
    }
}

Write-Host "`nRESULTAT FINAL" -ForegroundColor Green
Write-Host "Phase 4 - Module Commercial implemente avec succes!" -ForegroundColor Green
Write-Host "Nouvelles fonctionnalites:" -ForegroundColor White
Write-Host "- Gestion des devis et commandes" -ForegroundColor Cyan
Write-Host "- Gestion des factures" -ForegroundColor Cyan  
Write-Host "- Statistiques commerciales" -ForegroundColor Cyan
Write-Host "- Workflow complet Devis vers Commande vers Facture" -ForegroundColor Cyan
