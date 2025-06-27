# Script de reinitialisation de la base de donnees avec donnees algeriennes
# Auteur: Systeme de Gestion Commerciale
# Date: 2024

param(
    [switch]$Force,
    [switch]$SkipConfirmation,
    [switch]$Help
)

# Couleurs pour l'affichage
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

# Fonction principale
function Reset-DatabaseAlgeria {
    Write-Host ""
    Write-Host "🇩🇿 RÉINITIALISATION DE LA BASE DE DONNÉES AVEC DONNÉES ALGÉRIENNES" -ForegroundColor Magenta
    Write-Host "=================================================================" -ForegroundColor Magenta
    Write-Host ""

    # Vérification de confirmation
    if (-not $SkipConfirmation) {
        Write-Warning "Cette opération va:"
        Write-Host "   • Supprimer TOUTES les données existantes de la base de données"
        Write-Host "   • Réinitialiser le schéma de la base de données"
        Write-Host "   • Générer de nouvelles données de test algériennes"
        Write-Host ""
        
        $confirmation = Read-Host "Êtes-vous sûr de vouloir continuer? (oui/non)"
        if ($confirmation -ne "oui" -and $confirmation -ne "o" -and $confirmation -ne "y" -and $confirmation -ne "yes") {
            Write-Info "Opération annulée par l'utilisateur."
            return
        }
    }

    Write-Host ""
    Write-Step "Démarrage de la réinitialisation..."

    # Vérifier que nous sommes dans le bon répertoire
    if (-not (Test-Path "packages/database")) {
        Write-Error "Le répertoire packages/database n'existe pas."
        Write-Info "Assurez-vous d'exécuter ce script depuis la racine du projet."
        return
    }

    # Aller dans le répertoire de la base de données
    Push-Location "packages/database"

    try {
        # Étape 1: Générer le client Prisma
        Write-Step "Génération du client Prisma..."
        $result = npm run db:generate 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Erreur lors de la génération du client Prisma"
            Write-Host $result
            return
        }
        Write-Success "Client Prisma généré"

        # Étape 2: Synchroniser le schéma avec la base de données
        Write-Step "Synchronisation du schéma avec la base de données..."
        if ($Force) {
            # Mode force: accepter automatiquement tous les changements
            $result = echo "y" | npm run db:push 2>&1
        } else {
            $result = npm run db:push 2>&1
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Erreur lors de la synchronisation du schéma"
            Write-Host $result
            return
        }
        Write-Success "Schéma synchronisé"

        # Étape 3: Exécuter le seeding avec les données algériennes
        Write-Step "Insertion des données algériennes..."
        $result = npm run db:seed 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Erreur lors du seeding"
            Write-Host $result
            return
        }
        Write-Success "Données algériennes insérées"

        # Affichage du résumé
        Write-Host ""
        Write-Host "🎉 RÉINITIALISATION TERMINÉE AVEC SUCCÈS!" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host ""
        Write-Info "Données créées:"
        Write-Host "   • 1 entreprise algérienne (SARL TechnoCommerce Algérie)"
        Write-Host "   • 3 utilisateurs avec noms algériens"
        Write-Host "   • 5 catégories de produits"
        Write-Host "   • 10 produits avec prix en DZD"
        Write-Host "   • 3 fournisseurs algériens"
        Write-Host "   • 6 clients (entreprises et particuliers algériens)"
        Write-Host "   • Commandes, factures et interactions de démonstration"
        Write-Host ""
        Write-Info "Comptes de test:"
        Write-Host "   • Admin: admin@technocommerce.dz / demo123"
        Write-Host "   • Manager: manager@technocommerce.dz / demo123"
        Write-Host "   • Employé: employee@technocommerce.dz / demo123"
        Write-Host ""
        Write-Info "Caractéristiques des données:"
        Write-Host "   💰 Prix en Dinar Algérien (DZD)"
        Write-Host "   📍 Villes algériennes (Alger, Oran, Sétif, Constantine, Tizi Ouzou)"
        Write-Host "   📞 Numéros de téléphone algériens (+213)"
        Write-Host "   🏢 Identifiants d'entreprises algériens"
        Write-Host "   🌍 Fuseau horaire: Africa/Algiers"
        Write-Host ""

    } catch {
        Write-Error "Une erreur inattendue s'est produite: $($_.Exception.Message)"
    } finally {
        # Retourner au répertoire original
        Pop-Location
    }
}

# Affichage de l'aide
function Show-Help {
    Write-Host ""
    Write-Host "SCRIPT DE RÉINITIALISATION DE LA BASE DE DONNÉES ALGÉRIENNE" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "UTILISATION:"
    Write-Host "   .\reset-database-algeria.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "OPTIONS:"
    Write-Host "   -Force              Accepter automatiquement tous les changements"
    Write-Host "   -SkipConfirmation   Ignorer la demande de confirmation"
    Write-Host "   -Help               Afficher cette aide"
    Write-Host ""
    Write-Host "EXEMPLES:"
    Write-Host "   .\reset-database-algeria.ps1"
    Write-Host "   .\reset-database-algeria.ps1 -Force"
    Write-Host "   .\reset-database-algeria.ps1 -SkipConfirmation"
    Write-Host "   .\reset-database-algeria.ps1 -Force -SkipConfirmation"
    Write-Host ""
}

# Point d'entree principal
if ($Help) {
    Show-Help
} else {
    Reset-DatabaseAlgeria
}
