# Script de reinitialisation de la base de donnees avec donnees algeriennes
param(
    [switch]$Force,
    [switch]$SkipConfirmation,
    [switch]$Help
)

if ($Help) {
    Write-Host ""
    Write-Host "SCRIPT DE REINITIALISATION DE LA BASE DE DONNEES ALGERIENNE" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "UTILISATION:"
    Write-Host "   .\reset-db-simple.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "OPTIONS:"
    Write-Host "   -Force              Accepter automatiquement tous les changements"
    Write-Host "   -SkipConfirmation   Ignorer la demande de confirmation"
    Write-Host "   -Help               Afficher cette aide"
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "REINITIALISATION DE LA BASE DE DONNEES AVEC DONNEES ALGERIENNES" -ForegroundColor Magenta
Write-Host "================================================================" -ForegroundColor Magenta
Write-Host ""

# Verification de confirmation
if (-not $SkipConfirmation) {
    Write-Host "Cette operation va:" -ForegroundColor Yellow
    Write-Host "   • Supprimer TOUTES les donnees existantes de la base de donnees"
    Write-Host "   • Reinitialiser le schema de la base de donnees"
    Write-Host "   • Generer de nouvelles donnees de test algeriennes"
    Write-Host ""
    
    $confirmation = Read-Host "Etes-vous sur de vouloir continuer? (oui/non)"
    if ($confirmation -ne "oui" -and $confirmation -ne "o" -and $confirmation -ne "y" -and $confirmation -ne "yes") {
        Write-Host "Operation annulee par l'utilisateur." -ForegroundColor Blue
        exit 0
    }
}

Write-Host ""
Write-Host "Demarrage de la reinitialisation..." -ForegroundColor Cyan

# Verifier que nous sommes dans le bon repertoire
if (-not (Test-Path "packages/database")) {
    Write-Host "ERREUR: Le repertoire packages/database n'existe pas." -ForegroundColor Red
    Write-Host "Assurez-vous d'executer ce script depuis la racine du projet." -ForegroundColor Blue
    exit 1
}

# Aller dans le repertoire de la base de donnees
Set-Location "packages/database"

try {
    # Etape 1: Generer le client Prisma
    Write-Host "Generation du client Prisma..." -ForegroundColor Cyan
    npm run db:generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR: Erreur lors de la generation du client Prisma" -ForegroundColor Red
        exit 1
    }
    Write-Host "Client Prisma genere avec succes" -ForegroundColor Green

    # Etape 2: Synchroniser le schema avec la base de donnees
    Write-Host "Synchronisation du schema avec la base de donnees..." -ForegroundColor Cyan
    if ($Force) {
        # Mode force: accepter automatiquement tous les changements
        echo "y" | npm run db:push
    } else {
        npm run db:push
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR: Erreur lors de la synchronisation du schema" -ForegroundColor Red
        exit 1
    }
    Write-Host "Schema synchronise avec succes" -ForegroundColor Green

    # Etape 3: Executer le seeding avec les donnees algeriennes
    Write-Host "Insertion des donnees algeriennes..." -ForegroundColor Cyan
    npm run db:seed
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR: Erreur lors du seeding" -ForegroundColor Red
        exit 1
    }
    Write-Host "Donnees algeriennes inserees avec succes" -ForegroundColor Green

    # Affichage du resume
    Write-Host ""
    Write-Host "REINITIALISATION TERMINEE AVEC SUCCES!" -ForegroundColor Green
    Write-Host "=======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Donnees creees:" -ForegroundColor Blue
    Write-Host "   • 1 entreprise algerienne (SARL TechnoCommerce Algerie)"
    Write-Host "   • 3 utilisateurs avec noms algeriens"
    Write-Host "   • 5 categories de produits"
    Write-Host "   • 10 produits avec prix en DZD"
    Write-Host "   • 3 fournisseurs algeriens"
    Write-Host "   • 6 clients (entreprises et particuliers algeriens)"
    Write-Host "   • Commandes, factures et interactions de demonstration"
    Write-Host ""
    Write-Host "Comptes de test:" -ForegroundColor Blue
    Write-Host "   • Admin: admin@technocommerce.dz / demo123"
    Write-Host "   • Manager: manager@technocommerce.dz / demo123"
    Write-Host "   • Employe: employee@technocommerce.dz / demo123"
    Write-Host ""
    Write-Host "Caracteristiques des donnees:" -ForegroundColor Blue
    Write-Host "   Prix en Dinar Algerien (DZD)"
    Write-Host "   Villes algeriennes (Alger, Oran, Setif, Constantine, Tizi Ouzou)"
    Write-Host "   Numeros de telephone algeriens (+213)"
    Write-Host "   Identifiants d'entreprises algeriens"
    Write-Host "   Fuseau horaire: Africa/Algiers"
    Write-Host ""

} catch {
    Write-Host "ERREUR: Une erreur inattendue s'est produite" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Retourner au repertoire original
    Set-Location "../.."
}
