#!/bin/bash
# Script de réinitialisation de la base de données avec données algériennes
# Auteur: Système de Gestion Commerciale
# Date: 2024

set -e

# Variables
FORCE=false
SKIP_CONFIRMATION=false

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Fonctions d'affichage
print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Fonction d'aide
show_help() {
    echo ""
    echo -e "${CYAN}SCRIPT DE RÉINITIALISATION DE LA BASE DE DONNÉES ALGÉRIENNE${NC}"
    echo -e "${CYAN}==========================================================${NC}"
    echo ""
    echo "UTILISATION:"
    echo "   ./reset-database-algeria.sh [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "   --force              Accepter automatiquement tous les changements"
    echo "   --skip-confirmation  Ignorer la demande de confirmation"
    echo "   --help               Afficher cette aide"
    echo ""
    echo "EXEMPLES:"
    echo "   ./reset-database-algeria.sh"
    echo "   ./reset-database-algeria.sh --force"
    echo "   ./reset-database-algeria.sh --skip-confirmation"
    echo "   ./reset-database-algeria.sh --force --skip-confirmation"
    echo ""
}

# Traitement des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --skip-confirmation)
            SKIP_CONFIRMATION=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

# Fonction principale
reset_database_algeria() {
    echo ""
    echo -e "${MAGENTA}🇩🇿 RÉINITIALISATION DE LA BASE DE DONNÉES AVEC DONNÉES ALGÉRIENNES${NC}"
    echo -e "${MAGENTA}=================================================================${NC}"
    echo ""

    # Vérification de confirmation
    if [ "$SKIP_CONFIRMATION" = false ]; then
        print_warning "Cette opération va:"
        echo "   • Supprimer TOUTES les données existantes de la base de données"
        echo "   • Réinitialiser le schéma de la base de données"
        echo "   • Générer de nouvelles données de test algériennes"
        echo ""
        
        read -p "Êtes-vous sûr de vouloir continuer? (oui/non): " confirmation
        if [[ ! "$confirmation" =~ ^(oui|o|y|yes)$ ]]; then
            print_info "Opération annulée par l'utilisateur."
            return 0
        fi
    fi

    echo ""
    print_step "Démarrage de la réinitialisation..."

    # Vérifier que nous sommes dans le bon répertoire
    if [ ! -d "packages/database" ]; then
        print_error "Le répertoire packages/database n'existe pas."
        print_info "Assurez-vous d'exécuter ce script depuis la racine du projet."
        return 1
    fi

    # Aller dans le répertoire de la base de données
    cd packages/database

    # Étape 1: Générer le client Prisma
    print_step "Génération du client Prisma..."
    if ! npm run db:generate; then
        print_error "Erreur lors de la génération du client Prisma"
        return 1
    fi
    print_success "Client Prisma généré"

    # Étape 2: Synchroniser le schéma avec la base de données
    print_step "Synchronisation du schéma avec la base de données..."
    if [ "$FORCE" = true ]; then
        # Mode force: accepter automatiquement tous les changements
        echo "y" | npm run db:push
    else
        npm run db:push
    fi
    
    if [ $? -ne 0 ]; then
        print_error "Erreur lors de la synchronisation du schéma"
        return 1
    fi
    print_success "Schéma synchronisé"

    # Étape 3: Exécuter le seeding avec les données algériennes
    print_step "Insertion des données algériennes..."
    if ! npm run db:seed; then
        print_error "Erreur lors du seeding"
        return 1
    fi
    print_success "Données algériennes insérées"

    # Retourner au répertoire original
    cd ../..

    # Affichage du résumé
    echo ""
    echo -e "${GREEN}🎉 RÉINITIALISATION TERMINÉE AVEC SUCCÈS!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    print_info "Données créées:"
    echo "   • 1 entreprise algérienne (SARL TechnoCommerce Algérie)"
    echo "   • 3 utilisateurs avec noms algériens"
    echo "   • 5 catégories de produits"
    echo "   • 10 produits avec prix en DZD"
    echo "   • 3 fournisseurs algériens"
    echo "   • 6 clients (entreprises et particuliers algériens)"
    echo "   • Commandes, factures et interactions de démonstration"
    echo ""
    print_info "Comptes de test:"
    echo "   • Admin: admin@technocommerce.dz / demo123"
    echo "   • Manager: manager@technocommerce.dz / demo123"
    echo "   • Employé: employee@technocommerce.dz / demo123"
    echo ""
    print_info "Caractéristiques des données:"
    echo "   💰 Prix en Dinar Algérien (DZD)"
    echo "   📍 Villes algériennes (Alger, Oran, Sétif, Constantine, Tizi Ouzou)"
    echo "   📞 Numéros de téléphone algériens (+213)"
    echo "   🏢 Identifiants d'entreprises algériens"
    echo "   🌍 Fuseau horaire: Africa/Algiers"
    echo ""
}

# Exécution de la fonction principale
reset_database_algeria
