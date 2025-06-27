# Script de migration vers Docker (version simplifiée)
Write-Host "🚀 Migration vers Docker - Gestion Commerciale" -ForegroundColor Green
Write-Host "=" * 50

$ErrorActionPreference = "Stop"
$ProjectRoot = "d:/Gestion Commerciale"

try {
    Set-Location $ProjectRoot

    # 1. Créer la structure apps/
    Write-Host "📁 Création de la structure..." -ForegroundColor Yellow
    
    $dirs = @(
        "apps/frontend/src",
        "apps/backend/src"
    )
    
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
            Write-Host "  ✅ Créé: $dir" -ForegroundColor Green
        }
    }

    # 2. Migration du Frontend
    Write-Host "🌐 Migration du Frontend..." -ForegroundColor Yellow
    
    if (Test-Path "frontend-nextjs-production") {
        # Copier le code source
        if (Test-Path "frontend-nextjs-production/src") {
            Copy-Item -Path "frontend-nextjs-production/src" -Destination "apps/frontend/" -Recurse -Force
            Write-Host "  ✅ Code source copié" -ForegroundColor Green
        }
        
        # Copier les fichiers de config
        $files = @("package.json", "next.config.mjs", "tailwind.config.ts", "tsconfig.json")
        foreach ($file in $files) {
            if (Test-Path "frontend-nextjs-production/$file") {
                Copy-Item -Path "frontend-nextjs-production/$file" -Destination "apps/frontend/" -Force
                Write-Host "  ✅ Copié: $file" -ForegroundColor Green
            }
        }
        
        # Adapter le package.json
        if (Test-Path "apps/frontend/package.json") {
            $pkg = Get-Content "apps/frontend/package.json" -Raw | ConvertFrom-Json
            $pkg.name = "@gestion/frontend"
            $pkg.scripts.dev = "next dev -p 3000"
            $pkg.scripts.start = "next start -p 3000"
            $pkg | ConvertTo-Json -Depth 10 | Set-Content "apps/frontend/package.json"
            Write-Host "  ✅ package.json adapté" -ForegroundColor Green
        }
    }

    # 3. Créer le backend de base
    Write-Host "⚙️ Création du Backend..." -ForegroundColor Yellow
    
    # Créer le package.json du backend
    $backendPkg = @{
        name = "@gestion/backend"
        version = "1.0.0"
        private = $true
        main = "dist/index.js"
        scripts = @{
            dev = "tsx watch src/index.ts"
            build = "tsc"
            start = "node dist/index.js"
        }
        dependencies = @{
            fastify = "^4.28.1"
            "@fastify/cors" = "^9.0.1"
        }
        devDependencies = @{
            "@types/node" = "^20.14.0"
            typescript = "^5.4.5"
            tsx = "^4.15.0"
        }
    }
    
    $backendPkg | ConvertTo-Json -Depth 10 | Set-Content "apps/backend/package.json"
    Write-Host "  ✅ package.json backend créé" -ForegroundColor Green

    # 4. Créer tsconfig.json
    $tsConfig = @{
        compilerOptions = @{
            target = "ES2022"
            module = "ESNext"
            moduleResolution = "node"
            esModuleInterop = $true
            strict = $true
            skipLibCheck = $true
            outDir = "./dist"
            rootDir = "./src"
        }
        include = @("src/**/*")
        exclude = @("node_modules", "dist")
    }
    
    $tsConfig | ConvertTo-Json -Depth 10 | Set-Content "apps/backend/tsconfig.json"
    Write-Host "  ✅ tsconfig.json créé" -ForegroundColor Green

    # 5. Créer un index.ts simple
    $indexContent = "console.log('Backend started on port 3001');"
    Set-Content -Path "apps/backend/src/index.ts" -Value $indexContent
    Write-Host "  ✅ index.ts créé" -ForegroundColor Green

    # 6. Workspace pnpm
    Write-Host "📦 Configuration workspace..." -ForegroundColor Yellow
    
    $workspaceContent = "packages:`n  - 'packages/*'`n  - 'apps/*'"
    Set-Content -Path "pnpm-workspace.yaml" -Value $workspaceContent
    Write-Host "  ✅ pnpm-workspace.yaml créé" -ForegroundColor Green

    # 7. Mise à jour .env.production
    Write-Host "🔧 Mise à jour .env.production..." -ForegroundColor Yellow
    
    if (Test-Path ".env.production") {
        $envContent = Get-Content ".env.production"
        $envContent = $envContent -replace "FRONTEND_URL=.*", "FRONTEND_URL=http://localhost:3000"
        $envContent = $envContent -replace "CORS_ORIGIN=.*", "CORS_ORIGIN=http://localhost:3000"
        Set-Content -Path ".env.production" -Value $envContent
        Write-Host "  ✅ .env.production mis à jour" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "🎉 MIGRATION TERMINÉE!" -ForegroundColor Green
    Write-Host "=" * 25
    Write-Host ""
    Write-Host "📋 Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "  1. pnpm install" -ForegroundColor White
    Write-Host "  2. .\scripts\start-production.ps1 -Build -Detached" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 URLs après démarrage:" -ForegroundColor Cyan
    Write-Host "  • Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "  • Backend:  http://localhost:3001" -ForegroundColor White

} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location $ProjectRoot
}