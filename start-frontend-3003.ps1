Write-Host "Demarrage Frontend Next.js - Port 3003" -ForegroundColor Green

# Verifier le port 3003
$portCheck = netstat -ano | Select-String ":3003"
if ($portCheck) {
    Write-Host "Port 3003 occupe, arret du processus..." -ForegroundColor Yellow
    $pid = ($portCheck -split '\s+')[-1]
    taskkill /PID $pid /F
    Start-Sleep -Seconds 2
}

# Verifier le backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "Backend non accessible!" -ForegroundColor Red
    Write-Host "Demarrez d'abord: node production-backend.js" -ForegroundColor Yellow
}

# Aller dans le repertoire frontend
Set-Location "frontend-nextjs-production"

# Nettoyer le cache
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}

# Demarrer Next.js
Write-Host "Demarrage de Next.js sur le port 3003..." -ForegroundColor Yellow
Write-Host "URL: http://localhost:3003" -ForegroundColor Cyan

npx next dev -p 3003
