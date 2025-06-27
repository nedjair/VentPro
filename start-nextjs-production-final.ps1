Write-Host "Demarrage Next.js Production - Port 3003" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Aller dans le repertoire frontend
if (-not (Test-Path "frontend-nextjs-production")) {
    Write-Host "Repertoire frontend-nextjs-production non trouve!" -ForegroundColor Red
    exit 1
}

Set-Location "frontend-nextjs-production"

# Verifier Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js non trouve!" -ForegroundColor Red
    exit 1
}

# Verifier package.json
if (-not (Test-Path "package.json")) {
    Write-Host "package.json non trouve!" -ForegroundColor Red
    exit 1
}

# Verifier node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dependances..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Echec de l'installation" -ForegroundColor Red
        exit 1
    }
}

# Nettoyer le cache
Write-Host "Nettoyage du cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}
if (Test-Path "tsconfig.tsbuildinfo") {
    Remove-Item -Force "tsconfig.tsbuildinfo" -ErrorAction SilentlyContinue
}

# Verifier le backend
Write-Host "Verification du backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "Backend accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "Backend non accessible!" -ForegroundColor Red
    Write-Host "Demarrez d'abord: node production-backend.js" -ForegroundColor Yellow
}

# Verifier si le port 3003 est libre
$portCheck = netstat -ano | Select-String ":3003"
if ($portCheck) {
    Write-Host "Port 3003 occupe, arret du processus..." -ForegroundColor Yellow
    $pid = ($portCheck -split '\s+')[-1]
    taskkill /PID $pid /F
    Start-Sleep -Seconds 2
}

# Demarrer Next.js
Write-Host "Demarrage de Next.js..." -ForegroundColor Green
Write-Host "URL: http://localhost:3003" -ForegroundColor Cyan
Write-Host "Appuyez sur Ctrl+C pour arreter" -ForegroundColor Yellow

# Essayer differentes methodes de demarrage
Write-Host "Tentative 1: npm run dev" -ForegroundColor Cyan
try {
    npm run dev
} catch {
    Write-Host "Echec npm run dev, tentative 2..." -ForegroundColor Yellow
    
    Write-Host "Tentative 2: npx next dev -p 3003" -ForegroundColor Cyan
    try {
        npx next dev -p 3003
    } catch {
        Write-Host "Echec npx, tentative 3..." -ForegroundColor Yellow
        
        Write-Host "Tentative 3: node_modules\.bin\next dev -p 3003" -ForegroundColor Cyan
        try {
            & "node_modules\.bin\next.cmd" dev -p 3003
        } catch {
            Write-Host "Toutes les tentatives ont echoue" -ForegroundColor Red
            Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
            
            # Diagnostic
            Write-Host "`nDiagnostic:" -ForegroundColor Yellow
            Write-Host "- Verification de Next.js..." -ForegroundColor Gray
            if (Test-Path "node_modules\next") {
                Write-Host "  Next.js installe" -ForegroundColor Green
            } else {
                Write-Host "  Next.js manquant" -ForegroundColor Red
            }
            
            Write-Host "- Verification du binaire Next.js..." -ForegroundColor Gray
            if (Test-Path "node_modules\.bin\next.cmd") {
                Write-Host "  Binaire Next.js trouve" -ForegroundColor Green
            } else {
                Write-Host "  Binaire Next.js manquant" -ForegroundColor Red
            }
            
            Write-Host "`nSolutions possibles:" -ForegroundColor Yellow
            Write-Host "1. Reinstaller les dependances: npm install --force" -ForegroundColor Cyan
            Write-Host "2. Verifier la version de Node.js" -ForegroundColor Cyan
            Write-Host "3. Nettoyer le cache npm: npm cache clean --force" -ForegroundColor Cyan
        }
    }
}
