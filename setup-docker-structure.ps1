Write-Host "Migration vers Docker" -ForegroundColor Green

try {
    # Creer la structure
    New-Item -Path "apps/frontend/src" -ItemType Directory -Force
    New-Item -Path "apps/backend/src" -ItemType Directory -Force
    
    Write-Host "Structure creee" -ForegroundColor Green
    
    # Copier le frontend si existe
    if (Test-Path "frontend-nextjs-production/src") {
        Copy-Item -Path "frontend-nextjs-production/src" -Destination "apps/frontend/" -Recurse -Force
        Write-Host "Frontend copie" -ForegroundColor Green
    }
    
    # Copier les fichiers de config
    if (Test-Path "frontend-nextjs-production/package.json") {
        Copy-Item -Path "frontend-nextjs-production/package.json" -Destination "apps/frontend/"
        Write-Host "package.json copie" -ForegroundColor Green
    }
    
    # Creer workspace
    "packages:`n  - 'packages/*'`n  - 'apps/*'" | Set-Content "pnpm-workspace.yaml"
    Write-Host "Workspace cree" -ForegroundColor Green
    
    Write-Host "Migration terminee!" -ForegroundColor Green
    Write-Host "Prochaine etape: pnpm install" -ForegroundColor Cyan
    
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}