# Script PowerShell pour démarrer les serveurs
Write-Host "🚀 Démarrage des serveurs..." -ForegroundColor Green

# Démarrer le backend
Write-Host "📡 Démarrage du backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Administrateur\Desktop\commercial-management-app\apps\backend'; npm run dev"

# Attendre un peu
Start-Sleep -Seconds 3

# Démarrer le frontend
Write-Host "🌐 Démarrage du frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Administrateur\Desktop\commercial-management-app\apps\frontend'; npm run dev"

Write-Host "✅ Serveurs en cours de démarrage..." -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
