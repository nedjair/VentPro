#!/bin/bash

# Script de configuration automatique pour l'application de gestion commerciale TPE
# Ce script configure l'environnement de développement complet

set -e  # Arrêter le script en cas d'erreur

echo "🚀 Configuration de l'application de gestion commerciale TPE"
echo "============================================================"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérification des prérequis
check_prerequisites() {
    print_status "Vérification des prérequis..."
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js n'est pas installé. Veuillez installer Node.js 20 LTS ou supérieur."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_error "Node.js version 20 ou supérieure requise. Version actuelle: $(node -v)"
        exit 1
    fi
    
    # Vérifier pnpm
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm n'est pas installé. Installation en cours..."
        npm install -g pnpm@latest
    fi
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé. Veuillez installer Docker."
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose n'est pas installé. Veuillez installer Docker Compose."
        exit 1
    fi
    
    print_success "Tous les prérequis sont satisfaits"
}

# Configuration des variables d'environnement
setup_environment() {
    print_status "Configuration des variables d'environnement..."
    
    # Copier les fichiers d'exemple s'ils n'existent pas
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Fichier .env créé à partir de .env.example"
    fi
    
    if [ ! -f apps/backend/.env ]; then
        cp apps/backend/.env.example apps/backend/.env
        print_success "Fichier .env backend créé"
    fi
    
    if [ ! -f apps/frontend/.env.local ]; then
        cp apps/frontend/.env.local.example apps/frontend/.env.local
        print_success "Fichier .env.local frontend créé"
    fi
    
    print_warning "Pensez à modifier les mots de passe et secrets dans les fichiers .env pour la production!"
}

# Installation des dépendances
install_dependencies() {
    print_status "Installation des dépendances..."
    
    # Installer les dépendances avec pnpm
    pnpm install
    
    print_success "Dépendances installées avec succès"
}

# Configuration de Docker
setup_docker() {
    print_status "Configuration de l'infrastructure Docker..."
    
    # Créer les dossiers nécessaires
    mkdir -p docker/postgres/data
    mkdir -p docker/redis/data
    mkdir -p uploads
    
    # Arrêter les services existants s'ils tournent
    docker-compose down 2>/dev/null || true
    
    # Démarrer les services
    print_status "Démarrage des services Docker (PostgreSQL, Redis, PgBouncer)..."
    docker-compose up -d
    
    # Attendre que PostgreSQL soit prêt
    print_status "Attente de la disponibilité de PostgreSQL..."
    for i in {1..30}; do
        if docker-compose exec -T postgres pg_isready -U gestion_user -d gestion_commerciale &>/dev/null; then
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    
    # Vérifier que Redis est prêt
    print_status "Vérification de Redis..."
    for i in {1..15}; do
        if docker-compose exec -T redis redis-cli -a redis_password_secure_2024 ping &>/dev/null; then
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    
    print_success "Services Docker démarrés avec succès"
}

# Configuration de la base de données
setup_database() {
    print_status "Configuration de la base de données..."
    
    # Générer le client Prisma
    print_status "Génération du client Prisma..."
    pnpm db:generate
    
    # Appliquer le schéma à la base de données
    print_status "Application du schéma de base de données..."
    pnpm db:push
    
    # Insérer les données de test
    print_status "Insertion des données de test..."
    pnpm db:seed
    
    print_success "Base de données configurée avec succès"
}

# Vérification de l'installation
verify_installation() {
    print_status "Vérification de l'installation..."
    
    # Vérifier que les services Docker sont en cours d'exécution
    if ! docker-compose ps | grep -q "Up"; then
        print_error "Certains services Docker ne sont pas en cours d'exécution"
        return 1
    fi
    
    # Vérifier la connectivité à PostgreSQL
    if ! docker-compose exec -T postgres pg_isready -U gestion_user -d gestion_commerciale &>/dev/null; then
        print_error "Impossible de se connecter à PostgreSQL"
        return 1
    fi
    
    # Vérifier la connectivité à Redis
    if ! docker-compose exec -T redis redis-cli -a redis_password_secure_2024 ping &>/dev/null; then
        print_error "Impossible de se connecter à Redis"
        return 1
    fi
    
    print_success "Installation vérifiée avec succès"
}

# Affichage des informations finales
show_final_info() {
    echo ""
    echo "🎉 Configuration terminée avec succès!"
    echo "======================================"
    echo ""
    echo "📋 Informations importantes:"
    echo "  • Base de données: PostgreSQL 16 (port 5432)"
    echo "  • Connection pooling: PgBouncer (port 6432)"
    echo "  • Cache: Redis 7 (port 6379)"
    echo "  • Interface DB: Adminer (http://localhost:8080)"
    echo "  • Interface Redis: Redis Commander (http://localhost:8081)"
    echo ""
    echo "🔐 Comptes de test créés:"
    echo "  • Admin: admin@demo-tpe.fr / demo123"
    echo "  • Manager: manager@demo-tpe.fr / demo123"
    echo "  • Employé: employee@demo-tpe.fr / demo123"
    echo ""
    echo "🚀 Pour démarrer l'application:"
    echo "  pnpm dev"
    echo ""
    echo "📚 URLs importantes:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • Backend API: http://localhost:3001"
    echo "  • Documentation API: http://localhost:3001/docs"
    echo "  • Health check: http://localhost:3001/health"
    echo ""
    echo "📖 Consultez le README.md pour plus d'informations"
}

# Fonction principale
main() {
    check_prerequisites
    setup_environment
    install_dependencies
    setup_docker
    setup_database
    verify_installation
    show_final_info
}

# Gestion des erreurs
trap 'print_error "Une erreur est survenue. Vérifiez les logs ci-dessus."; exit 1' ERR

# Exécution du script principal
main "$@"
