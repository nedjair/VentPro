# Script de reinitialisation de la base de donnees avec donnees algeriennes
param(
    [switch]$Force,
    [switch]$SkipConfirmation,
    [switch]$Help
)

function Write-Step {
    param([string]$Message)
    Write-Host "🔄 $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Show-Help {
    Write-Host ""
    Write-Host "SCRIPT DE REINITIALISATION DE LA BASE DE DONNEES ALGERIENNE" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "UTILISATION:"
    Write-Host "   .\reset-db-algeria.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "OPTIONS:"
    Write-Host "   -Force              Accepter automatiquement tous les changements"
    Write-Host "   -SkipConfirmation   Ignorer la demande de confirmation"
    Write-Host "   -Help               Afficher cette aide"
    Write-Host ""
    Write-Host "EXEMPLES:"
    Write-Host "   .\reset-db-algeria.ps1"
    Write-Host "   .\reset-db-algeria.ps1 -Force"
    Write-Host "   .\reset-db-algeria.ps1 -SkipConfirmation"
    Write-Host ""
}

function Reset-DatabaseAlgeria {
    Write-Host ""
    Write-Host "🇩🇿 REINITIALISATION DE LA BASE DE DONNEES AVEC DONNEES ALGERIENNES" -ForegroundColor Magenta
    Write-Host "=================================================================" -ForegroundColor Magenta
    Write-Host ""

    # Verification de confirmation
    if (-not $SkipConfirmation) {
        Write-Warning "Cette operation va:"
        Write-Host "   • Supprimer TOUTES les donnees existantes de la base de donnees"
        Write-Host "   • Reinitialiser le schema de la base de donnees"
        Write-Host "   • Generer de nouvelles donnees de test algeriennes"
        Write-Host ""
        
        $confirmation = Read-Host "Etes-vous sur de vouloir continuer? (oui/non)"
        if ($confirmation -ne "oui" -and $confirmation -ne "o" -and $confirmation -ne "y" -and $confirmation -ne "yes") {
            Write-Info "Operation annulee par l'utilisateur."
            return
        }
    }

    Write-Host ""
    Write-Step "Demarrage de la reinitialisation..."

    # Verifier que nous sommes dans le bon repertoire
    if (-not (Test-Path "packages/database")) {
        Write-Error "Le repertoire packages/database n'existe pas."
        Write-Info "Assurez-vous d'executer ce script depuis la racine du projet."
        return
    }

    # Aller dans le repertoire de la base de donnees
    Push-Location "packages/database"

    try {
        # Etape 1: Generer le client Prisma
        Write-Step "Generation du client Prisma..."
        $result = npm run db:generate 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Erreur lors de la generation du client Prisma"
            Write-Host $result
            return
        }
        Write-Success "Client Prisma genere"

        # Etape 2: Synchroniser le schema avec la base de donnees
        Write-Step "Synchronisation du schema avec la base de donnees..."
        if ($Force) {
            # Mode force: accepter automatiquement tous les changements
            $result = echo "y" | npm run db:push 2>&1
        } else {
            $result = npm run db:push 2>&1
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Erreur lors de la synchronisation du schema"
            Write-Host $result
            return
        }
        Write-Success "Schema synchronise"

        # Etape 3: Executer le seeding avec les donnees algeriennes
        Write-Step "Insertion des donnees algeriennes..."
        $result = npm run db:seed 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Erreur lors du seeding"
            Write-Host $result
            return
        }
        Write-Success "Donnees algeriennes inserees"

        # Affichage du resume
        Write-Host ""
        Write-Host "🎉 REINITIALISATION TERMINEE AVEC SUCCES!" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host ""
        Write-Info "Donnees creees:"
        Write-Host "   • 1 entreprise algerienne (SARL TechnoCommerce Algerie)"
        Write-Host "   • 3 utilisateurs avec noms algeriens"
        Write-Host "   • 5 categories de produits"
        Write-Host "   • 10 produits avec prix en DZD"
        Write-Host "   • 3 fournisseurs algeriens"
        Write-Host "   • 6 clients (entreprises et particuliers algeriens)"
        Write-Host "   • Commandes, factures et interactions de demonstration"
        Write-Host ""
        Write-Info "Comptes de test:"
        Write-Host "   • Admin: admin@technocommerce.dz / demo123"
        Write-Host "   • Manager: manager@technocommerce.dz / demo123"
        Write-Host "   • Employe: employee@technocommerce.dz / demo123"
        Write-Host ""
        Write-Info "Caracteristiques des donnees:"
        Write-Host "   💰 Prix en Dinar Algerien (DZD)"
        Write-Host "   📍 Villes algeriennes (Alger, Oran, Setif, Constantine, Tizi Ouzou)"
        Write-Host "   📞 Numeros de telephone algeriens (+213)"
        Write-Host "   🏢 Identifiants d'entreprises algeriens"
        Write-Host "   🌍 Fuseau horaire: Africa/Algiers"
        Write-Host ""

    } catch {
        Write-Error "Une erreur inattendue s'est produite: $($_.Exception.Message)"
    } finally {
        # Retourner au repertoire original
        Pop-Location
    }
}

# Point d'entree principal
if ($Help) {
    Show-Help
} else {
    Reset-DatabaseAlgeria
}
