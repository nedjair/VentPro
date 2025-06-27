Write-Host "🚀 Demarrage Docker Production" -ForegroundColor Green

try {
    # Arreter les anciens conteneurs
    Write-Host "🛑 Arret des anciens conteneurs..."
    docker-compose -f docker-compose.prod.yml down 2>$null
    
    # Construire et demarrer
    Write-Host "🐳 Build et demarrage des conteneurs..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Conteneurs demarres avec succes!" -ForegroundColor Green
        
        Write-Host "⏳ Attente du demarrage (30s)..."
        Start-Sleep -Seconds 30
        
        Write-Host ""
        Write-Host "🌐 URLs disponibles:" -ForegroundColor Cyan
        Write-Host "  * Frontend: http://localhost:3000" -ForegroundColor White
        Write-Host "  * Backend:  http://localhost:3001" -ForegroundColor White
        Write-Host ""
        Write-Host "📋 Commandes utiles:" -ForegroundColor Cyan
        Write-Host "  * Logs: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor White
        Write-Host "  * Arreter: docker-compose -f docker-compose.prod.yml down" -ForegroundColor White
        Write-Host "  * Etat: docker-compose -f docker-compose.prod.yml ps" -ForegroundColor White
        
    } else {
        Write-Host "❌ Erreur lors du demarrage" -ForegroundColor Red
        Write-Host "Consultez les logs: docker-compose -f docker-compose.prod.yml logs"
    }
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}