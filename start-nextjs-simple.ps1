Write-Host "Demarrage Next.js - Port 3003" -ForegroundColor Green

Set-Location "frontend-nextjs-production"

Write-Host "Nettoyage..." -ForegroundColor Yellow
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }

Write-Host "Demarrage..." -ForegroundColor Yellow
& "node_modules\.bin\next.cmd" dev -p 3003
