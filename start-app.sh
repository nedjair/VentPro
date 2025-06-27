#!/bin/bash

# =============================================================================
# 🚀 Script de Démarrage Automatisé - Gestion Commerciale TPE
# =============================================================================
# Ce script démarre automatiquement tous les services nécessaires :
# - Docker Compose (PostgreSQL, Redis, Adminer, Redis Commander)
# - Backend Fastify (API)
# - Frontend Next.js (Interface utilisateur)
#
# Prérequis :
# - Docker et Docker Compose installés
# - Node.js 20+ installé
# - pnpm 8+ installé
# =============================================================================

set -e  # Arrêter le script en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# Fonction pour vérifier si un port est utilisé
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port utilisé
    else
        return 1  # Port libre
    fi
}

# Fonction pour attendre qu'un service soit prêt
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    log_step "Attente du démarrage de $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            log_success "$service_name est prêt !"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "$service_name n'a pas démarré dans les temps"
    return 1
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
    log_step "Vérification des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé. Veuillez l'installer : https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé. Veuillez l'installer."
        exit 1
    fi
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js n'est pas installé. Veuillez installer Node.js 20+ : https://nodejs.org/"
        exit 1
    fi
    
    # Vérifier la version de Node.js
    node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 20 ]; then
        log_error "Node.js version 20+ requis. Version actuelle : $(node -v)"
        exit 1
    fi
    
    # Vérifier pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm n'est pas installé. Installation : npm install -g pnpm"
        exit 1
    fi
    
    log_success "Tous les prérequis sont satisfaits"
}

# Fonction pour vérifier les ports
check_ports() {
    log_step "Vérification des ports..."

    local ports_in_use=()

    # Ports à vérifier - Stratégie de ports dédiés
    local required_ports=(3001 3002 3003 3004 3005 5432 6379 8080 8081)
    local port_names=("Backend" "Express.js Prod" "Next.js Tests" "Tests isolés" "Développement" "PostgreSQL" "Redis" "Adminer" "Redis Commander")
    
    for i in "${!required_ports[@]}"; do
        local port=${required_ports[$i]}
        local name=${port_names[$i]}
        
        if check_port $port; then
            ports_in_use+=("$port ($name)")
        fi
    done
    
    if [ ${#ports_in_use[@]} -gt 0 ]; then
        log_warning "Ports déjà utilisés :"
        for port in "${ports_in_use[@]}"; do
            echo "  - $port"
        done
        
        read -p "Voulez-vous continuer ? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Arrêt du script"
            exit 0
        fi
    else
        log_success "Tous les ports sont disponibles"
    fi
}

# Fonction pour installer les dépendances
install_dependencies() {
    log_step "Installation des dépendances..."
    
    if [ ! -f "pnpm-lock.yaml" ]; then
        log_info "Première installation des dépendances..."
        pnpm install
    else
        log_info "Mise à jour des dépendances..."
        pnpm install --frozen-lockfile
    fi
    
    log_success "Dépendances installées"
}

# Fonction pour démarrer Docker Compose
start_docker_services() {
    log_step "Démarrage des services Docker..."
    
    # Arrêter les services existants
    docker-compose down >/dev/null 2>&1 || true
    
    # Démarrer les services
    docker-compose up -d
    
    # Attendre que PostgreSQL soit prêt
    log_step "Attente de PostgreSQL..."
    sleep 10
    
    # Vérifier que les services Docker sont en cours d'exécution
    if docker-compose ps | grep -q "Up"; then
        log_success "Services Docker démarrés"
    else
        log_error "Échec du démarrage des services Docker"
        exit 1
    fi
}

# Fonction pour configurer la base de données
setup_database() {
    log_step "Configuration de la base de données..."
    
    # Générer le client Prisma
    pnpm --filter @gestion/database db:generate
    
    # Pousser le schéma vers la base de données
    pnpm --filter @gestion/database db:push
    
    # Exécuter les seeds
    pnpm --filter @gestion/database db:seed
    
    log_success "Base de données configurée"
}

# Fonction pour démarrer le backend
start_backend() {
    log_step "Démarrage du backend..."
    
    # Démarrer le backend en arrière-plan
    cd apps/backend
    pnpm dev > ../../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ../..
    
    # Sauvegarder le PID
    echo $BACKEND_PID > .backend.pid
    
    # Attendre que le backend soit prêt
    wait_for_service "http://localhost:3001/health" "Backend API"
}

# Fonction pour démarrer le frontend
start_frontend() {
    log_step "Démarrage du frontend..."
    
    # Démarrer le frontend en arrière-plan
    cd apps/frontend
    pnpm dev > ../../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ../..
    
    # Sauvegarder le PID
    echo $FRONTEND_PID > .frontend.pid
    
    # Attendre que le frontend soit prêt
    wait_for_service "http://localhost:3000" "Frontend Next.js"
}

# Fonction pour afficher les informations de connexion
show_connection_info() {
    echo
    echo "🎉 Application démarrée avec succès !"
    echo
    echo "📱 URLs d'accès :"
    echo "  🌐 Application Frontend : http://localhost:3000"
    echo "  🔧 API Backend         : http://localhost:3001"
    echo "  📚 Documentation API   : http://localhost:3001/docs"
    echo "  🗄️  Base de données     : http://localhost:8080 (Adminer)"
    echo "  🔴 Cache Redis         : http://localhost:8081 (Redis Commander)"
    echo
    echo "🔐 Comptes de test :"
    echo "  👑 Admin    : admin@demo-tpe.fr / demo123"
    echo "  👨‍💼 Manager  : manager@demo-tpe.fr / demo123"
    echo "  👨‍💻 Employé : employee@demo-tpe.fr / demo123"
    echo
    echo "📊 Modules disponibles :"
    echo "  ✅ Authentification et gestion des rôles"
    echo "  ✅ Dashboard avec statistiques temps réel"
    echo "  ✅ Gestion des clients (CRUD complet)"
    echo "  ✅ Catalogue des produits et services"
    echo "  ✅ Gestion du stock et mouvements"
    echo
    echo "📝 Logs :"
    echo "  Backend  : tail -f logs/backend.log"
    echo "  Frontend : tail -f logs/frontend.log"
    echo "  Docker   : docker-compose logs -f"
    echo
    echo "🛑 Pour arrêter l'application : ./stop-app.sh"
    echo
}

# Fonction pour créer le répertoire des logs
create_logs_directory() {
    mkdir -p logs
}

# Fonction principale
main() {
    echo "🚀 Démarrage de l'application Gestion Commerciale TPE"
    echo "=================================================="
    echo
    
    # Vérifications préliminaires
    check_prerequisites
    check_ports
    
    # Création du répertoire des logs
    create_logs_directory
    
    # Installation des dépendances
    install_dependencies
    
    # Démarrage des services
    start_docker_services
    setup_database
    start_backend
    start_frontend
    
    # Affichage des informations
    show_connection_info
    
    # Attendre l'arrêt manuel
    echo "Appuyez sur Ctrl+C pour arrêter l'application..."
    trap 'echo; log_info "Arrêt de l'\''application..."; ./stop-app.sh; exit 0' INT
    
    # Boucle infinie pour maintenir le script actif
    while true; do
        sleep 1
    done
}

# Exécution du script principal
main "$@"
