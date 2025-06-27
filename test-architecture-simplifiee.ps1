# =============================================================================
# TEST DE L'ARCHITECTURE SIMPLIFIÉE - GESTION COMMERCIALE TPE
# Validation après nettoyage des frontends redondants
# =============================================================================

Write-Host "TEST DE L'ARCHITECTURE SIMPLIFIEE" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Validation post-nettoyage des frontends" -ForegroundColor Gray
Write-Host ""

$results = @()
$issues = @()

# =============================================================================
# 1. VÉRIFICATION DE LA STRUCTURE
# =============================================================================
Write-Host "1. VERIFICATION DE LA STRUCTURE" -ForegroundColor Yellow

# Vérifier que le frontend principal existe
if (Test-Path "frontend-nextjs-production") {
    Write-Host "OK Frontend principal: PRESENT" -ForegroundColor Green
    Write-Host "   Dossier: frontend-nextjs-production/" -ForegroundColor Gray
    $results += "OK Frontend principal: PRESENT"
} else {
    Write-Host "ERREUR Frontend principal: MANQUANT" -ForegroundColor Red
    $issues += "Frontend principal manquant"
}

# Vérifier que le backend existe
if (Test-Path "production-backend.js") {
    Write-Host "OK Backend principal: PRESENT" -ForegroundColor Green
    Write-Host "   Fichier: production-backend.js" -ForegroundColor Gray
    $results += "OK Backend principal: PRESENT"
} else {
    Write-Host "ERREUR Backend principal: MANQUANT" -ForegroundColor Red
    $issues += "Backend principal manquant"
}

# Vérifier que les frontends redondants ont été supprimés
$frontendsRedondants = @(
    "frontend-express-production",
    "frontend-production", 
    "apps/frontend",
    "frontend-nextjs-minimal"
)

foreach ($frontend in $frontendsRedondants) {
    if (Test-Path $frontend) {
        Write-Host "ATTENTION Frontend redondant: ENCORE PRESENT" -ForegroundColor Yellow
        Write-Host "   Dossier: $frontend" -ForegroundColor Gray
        $issues += "Frontend redondant présent: $frontend"
    } else {
        Write-Host "OK Frontend redondant: SUPPRIME" -ForegroundColor Green
        Write-Host "   Dossier: $frontend" -ForegroundColor Gray
        $results += "OK Frontend supprimé: $frontend"
    }
}

# =============================================================================
# 2. VÉRIFICATION DES SCRIPTS
# =============================================================================
Write-Host "`n2. VERIFICATION DES SCRIPTS" -ForegroundColor Yellow

# Scripts essentiels qui doivent être présents
$scriptsEssentiels = @(
    "start-frontend-nextjs.ps1",
    "start-production-backend.ps1",
    "test-frontend-backend-connexion.ps1",
    "verification-finale-complete.ps1"
)

foreach ($script in $scriptsEssentiels) {
    if (Test-Path $script) {
        Write-Host "OK Script essentiel: PRESENT" -ForegroundColor Green
        Write-Host "   Script: $script" -ForegroundColor Gray
        $results += "OK Script présent: $script"
    } else {
        Write-Host "ERREUR Script essentiel: MANQUANT" -ForegroundColor Red
        Write-Host "   Script: $script" -ForegroundColor Gray
        $issues += "Script manquant: $script"
    }
}

# Scripts redondants qui doivent être supprimés
$scriptsRedondants = @(
    "start-frontend-production.ps1",
    "start-frontend-simple.ps1",
    "start-production-express.ps1",
    "test-frontend-express.ps1"
)

foreach ($script in $scriptsRedondants) {
    if (Test-Path $script) {
        Write-Host "ATTENTION Script redondant: ENCORE PRESENT" -ForegroundColor Yellow
        Write-Host "   Script: $script" -ForegroundColor Gray
        $issues += "Script redondant présent: $script"
    } else {
        Write-Host "OK Script redondant: SUPPRIME" -ForegroundColor Green
        Write-Host "   Script: $script" -ForegroundColor Gray
        $results += "OK Script supprimé: $script"
    }
}

# =============================================================================
# 3. VÉRIFICATION DE LA CONFIGURATION FRONTEND
# =============================================================================
Write-Host "`n3. VERIFICATION DE LA CONFIGURATION FRONTEND" -ForegroundColor Yellow

if (Test-Path "frontend-nextjs-production/package.json") {
    try {
        $packageJson = Get-Content "frontend-nextjs-production/package.json" | ConvertFrom-Json
        
        # Vérifier le port configuré
        if ($packageJson.scripts.dev -match "3003") {
            Write-Host "OK Port frontend: CORRECT (3003)" -ForegroundColor Green
            $results += "OK Port frontend: 3003"
        } else {
            Write-Host "ATTENTION Port frontend: A VERIFIER" -ForegroundColor Yellow
            $issues += "Port frontend à vérifier"
        }
        
        # Vérifier Next.js
        if ($packageJson.dependencies.next) {
            Write-Host "OK Framework: Next.js $($packageJson.dependencies.next)" -ForegroundColor Green
            $results += "OK Framework: Next.js"
        }
        
    } catch {
        Write-Host "ERREUR Configuration frontend: ILLISIBLE" -ForegroundColor Red
        $issues += "Configuration frontend illisible"
    }
} else {
    Write-Host "ERREUR Configuration frontend: MANQUANTE" -ForegroundColor Red
    $issues += "Configuration frontend manquante"
}

# =============================================================================
# 4. VÉRIFICATION DE LA DOCUMENTATION
# =============================================================================
Write-Host "`n4. VERIFICATION DE LA DOCUMENTATION" -ForegroundColor Yellow

# Vérifier que la documentation principale existe
$docsEssentiels = @(
    "README.md",
    "GUIDE-CONNEXION-FRONTEND-BACKEND.md",
    "README-BACKEND-PRODUCTION.md"
)

foreach ($doc in $docsEssentiels) {
    if (Test-Path $doc) {
        Write-Host "OK Documentation: PRESENTE" -ForegroundColor Green
        Write-Host "   Fichier: $doc" -ForegroundColor Gray
        $results += "OK Documentation: $doc"
    } else {
        Write-Host "ERREUR Documentation: MANQUANTE" -ForegroundColor Red
        Write-Host "   Fichier: $doc" -ForegroundColor Gray
        $issues += "Documentation manquante: $doc"
    }
}

# Vérifier le rapport de nettoyage
if (Test-Path "NETTOYAGE_FRONTENDS_RAPPORT.md") {
    Write-Host "OK Rapport de nettoyage: PRESENT" -ForegroundColor Green
    $results += "OK Rapport de nettoyage: PRESENT"
} else {
    Write-Host "ATTENTION Rapport de nettoyage: MANQUANT" -ForegroundColor Yellow
}

# =============================================================================
# 5. RÉSUMÉ DES TESTS
# =============================================================================
Write-Host "`n5. RESUME DES TESTS" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

Write-Host "`nELEMENTS VALIDES:" -ForegroundColor Green
foreach ($result in $results) {
    Write-Host "  ✓ $result" -ForegroundColor Green
}

if ($issues.Count -gt 0) {
    Write-Host "`nPROBLEMES DETECTES:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  ✗ $issue" -ForegroundColor Red
    }
} else {
    Write-Host "`nAUCUN PROBLEME DETECTE" -ForegroundColor Green
}

# =============================================================================
# 6. CONCLUSION
# =============================================================================
Write-Host "`n6. CONCLUSION" -ForegroundColor Cyan
Write-Host "=============" -ForegroundColor Cyan

if ($issues.Count -eq 0) {
    Write-Host "ARCHITECTURE SIMPLIFIEE: VALIDEE !" -ForegroundColor Green
    Write-Host ""
    Write-Host "L'architecture a été simplifiée avec succès :" -ForegroundColor Green
    Write-Host "  ✓ Frontend Next.js Production conservé (port 3003)" -ForegroundColor Green
    Write-Host "  ✓ Backend Fastify Production conservé (port 3001)" -ForegroundColor Green
    Write-Host "  ✓ Frontends redondants supprimés" -ForegroundColor Green
    Write-Host "  ✓ Scripts nettoyés" -ForegroundColor Green
    Write-Host "  ✓ Documentation mise à jour" -ForegroundColor Green
    Write-Host ""
    Write-Host "COMMANDES DE DEMARRAGE :" -ForegroundColor Cyan
    Write-Host "  1. docker-compose up -d" -ForegroundColor White
    Write-Host "  2. .\start-production-backend.ps1" -ForegroundColor White
    Write-Host "  3. .\start-frontend-nextjs.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "ACCES : http://localhost:3003" -ForegroundColor Cyan
    Write-Host "IDENTIFIANTS : admin@demo-tpe.fr / demo123" -ForegroundColor Cyan
    
} else {
    Write-Host "ARCHITECTURE SIMPLIFIEE: PROBLEMES DETECTES" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Nombre de problèmes: $($issues.Count)" -ForegroundColor Yellow
    Write-Host "Action requise: Corriger les problèmes listés ci-dessus" -ForegroundColor Yellow
}

Write-Host "`nTEST DE L'ARCHITECTURE TERMINE" -ForegroundColor Green
