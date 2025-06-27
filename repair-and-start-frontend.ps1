Write-Host "🔧 Reparation et Demarrage du Frontend Existant" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

$frontendDir = "frontend-nextjs-production"

# Etape 1: Verification de l'environnement
Write-Host "`n📋 Etape 1: Verification de l'environnement" -ForegroundColor Yellow

if (-not (Test-Path $frontendDir)) {
    Write-Host "❌ Repertoire $frontendDir non trouve!" -ForegroundColor Red
    exit 1
}

Set-Location $frontendDir

# Verification Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js non accessible" -ForegroundColor Red
    exit 1
}

# Etape 2: Verification des fichiers essentiels
Write-Host "`n📁 Etape 2: Verification des fichiers essentiels" -ForegroundColor Yellow

$essentialFiles = @("package.json", "next.config.mjs", "tsconfig.json")
foreach ($file in $essentialFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file manquant" -ForegroundColor Red
    }
}

# Etape 3: Verification des dependances
Write-Host "`n📦 Etape 3: Verification des dependances" -ForegroundColor Yellow

if (Test-Path "node_modules") {
    Write-Host "✅ node_modules existe" -ForegroundColor Green
    
    # Verifier Next.js specifiquement
    if (Test-Path "node_modules/next") {
        Write-Host "✅ Next.js installe" -ForegroundColor Green
    } else {
        Write-Host "❌ Next.js manquant dans node_modules" -ForegroundColor Red
        Write-Host "🔄 Reinstallation des dependances..." -ForegroundColor Yellow
        npm install --force
    }
} else {
    Write-Host "❌ node_modules manquant" -ForegroundColor Red
    Write-Host "🔄 Installation des dependances..." -ForegroundColor Yellow
    npm install
}

# Etape 4: Nettoyage des fichiers temporaires
Write-Host "`n🧹 Etape 4: Nettoyage" -ForegroundColor Yellow

$filesToClean = @(".next", "tsconfig.tsbuildinfo", ".next/cache")
foreach ($file in $filesToClean) {
    if (Test-Path $file) {
        Remove-Item -Recurse -Force $file -ErrorAction SilentlyContinue
        Write-Host "✅ $file supprime" -ForegroundColor Green
    }
}

# Etape 5: Verification du backend
Write-Host "`n🔗 Etape 5: Verification du backend" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Backend non accessible" -ForegroundColor Yellow
    Write-Host "   Assurez-vous que le backend est demarre: node production-backend.js" -ForegroundColor Cyan
}

# Etape 6: Verification du port 3003
Write-Host "`n🌐 Etape 6: Verification du port 3003" -ForegroundColor Yellow

$portCheck = netstat -ano | Select-String ":3003"
if ($portCheck) {
    Write-Host "⚠️ Port 3003 occupe, liberation..." -ForegroundColor Yellow
    $pid = ($portCheck -split '\s+')[-1]
    taskkill /PID $pid /F 2>$null
    Start-Sleep -Seconds 2
    Write-Host "✅ Port 3003 libere" -ForegroundColor Green
} else {
    Write-Host "✅ Port 3003 disponible" -ForegroundColor Green
}

# Etape 7: Demarrage avec methodes alternatives
Write-Host "`n🚀 Etape 7: Demarrage de Next.js" -ForegroundColor Yellow

Write-Host "Methode 1: npm run dev" -ForegroundColor Cyan
$process1 = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow -RedirectStandardOutput "npm-output.log" -RedirectStandardError "npm-error.log"

# Attendre 10 secondes
Start-Sleep -Seconds 10

# Verifier si le processus fonctionne
if ($process1 -and -not $process1.HasExited) {
    Write-Host "✅ Processus npm demarre (PID: $($process1.Id))" -ForegroundColor Green
    
    # Tester la connectivite
    $attempts = 0
    $maxAttempts = 10
    do {
        Start-Sleep -Seconds 3
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3003" -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Host "🎉 Next.js operationnel sur http://localhost:3003" -ForegroundColor Green
                Write-Host "✅ Frontend demarre avec succes!" -ForegroundColor Green
                
                # Ouvrir dans le navigateur
                Start-Process "http://localhost:3003"
                
                Write-Host "`n📊 Informations:" -ForegroundColor Cyan
                Write-Host "  PID: $($process1.Id)" -ForegroundColor White
                Write-Host "  URL: http://localhost:3003" -ForegroundColor White
                Write-Host "  Logs: npm-output.log, npm-error.log" -ForegroundColor White
                
                exit 0
            }
        } catch {
            Write-Host "Tentative $attempts/$maxAttempts..." -ForegroundColor Gray
        }
    } while ($attempts -lt $maxAttempts)
    
    Write-Host "⚠️ Next.js demarre mais ne repond pas encore" -ForegroundColor Yellow
    Write-Host "Verifiez les logs: npm-output.log et npm-error.log" -ForegroundColor Cyan
} else {
    Write-Host "❌ Echec du demarrage avec npm" -ForegroundColor Red
    
    # Methode alternative
    Write-Host "`nMethode 2: Demarrage direct" -ForegroundColor Cyan
    try {
        & "node_modules\.bin\next.cmd" dev -p 3003
    } catch {
        Write-Host "❌ Echec du demarrage direct" -ForegroundColor Red
        Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Set-Location ..
