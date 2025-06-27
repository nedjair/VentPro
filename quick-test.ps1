# Test rapide
$baseUrl = "http://127.0.0.1:3001"

Write-Host "🧪 Test rapide de l'API..." -ForegroundColor Green

# Health check
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Health OK: $($response.message)" -ForegroundColor Green
    
    # Login
    $loginData = '{"email":"admin@test.com","password":"password123"}'
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $loginData -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ Login OK: $($loginResponse.data.user.firstName)" -ForegroundColor Green
    
    Write-Host "🎉 API fonctionne!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}