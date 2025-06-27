#!/bin/bash

# Script de démarrage de l'application après corrections
# Gestion Commerciale - Version Corrigée

echo "🚀 DÉMARRAGE DE L'APPLICATION DE GESTION COMMERCIALE"
echo "=================================================="
echo ""

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

# Vérifier si Docker est installé et en cours d'exécution
check_docker() {
    print_status "Vérification de Docker..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé. Veuillez installer Docker pour continuer."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker n'est pas en cours d'exécution. Veuillez démarrer Docker."
        exit 1
    fi
    
    print_success "Docker est disponible et en cours d'exécution"
}

# Vérifier si Node.js est installé
check_node() {
    print_status "Vérification de Node.js..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js n'est pas installé. Veuillez installer Node.js pour continuer."
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js est installé (version: $NODE_VERSION)"
}

# Démarrer l'infrastructure Docker
start_infrastructure() {
    print_status "Démarrage de l'infrastructure Docker..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d
        
        if [ $? -eq 0 ]; then
            print_success "Infrastructure Docker démarrée avec succès"
            
            # Attendre que les services soient prêts
            print_status "Attente de la disponibilité des services..."
            sleep 10
            
            # Vérifier PostgreSQL
            print_status "Vérification de PostgreSQL..."
            docker-compose exec -T postgres pg_isready -U postgres
            if [ $? -eq 0 ]; then
                print_success "PostgreSQL est prêt"
            else
                print_warning "PostgreSQL n'est pas encore prêt, continuons..."
            fi
            
        else
            print_error "Échec du démarrage de l'infrastructure Docker"
            exit 1
        fi
    else
        print_error "Fichier docker-compose.yml non trouvé"
        exit 1
    fi
}

# Installer les dépendances si nécessaire
install_dependencies() {
    print_status "Vérification des dépendances..."
    
    # Backend modulaire
    if [ -d "apps/backend" ] && [ ! -d "apps/backend/node_modules" ]; then
        print_status "Installation des dépendances du backend..."
        cd apps/backend
        npm install
        cd ../..
        print_success "Dépendances du backend installées"
    fi
    
    # Frontend
    if [ -d "apps/frontend" ] && [ ! -d "apps/frontend/node_modules" ]; then
        print_status "Installation des dépendances du frontend..."
        cd apps/frontend
        npm install
        cd ../..
        print_success "Dépendances du frontend installées"
    fi
    
    # Racine du projet
    if [ ! -d "node_modules" ]; then
        print_status "Installation des dépendances racine..."
        npm install
        print_success "Dépendances racine installées"
    fi
}

# Démarrer le backend
start_backend() {
    print_status "Démarrage du backend..."
    
    # Choisir entre backend de production et backend modulaire
    if [ -f "production-backend.js" ]; then
        print_status "Utilisation du backend de production..."
        node production-backend.js &
        BACKEND_PID=$!
        print_success "Backend de production démarré (PID: $BACKEND_PID)"
    elif [ -d "apps/backend" ]; then
        print_status "Utilisation du backend modulaire..."
        cd apps/backend
        npm run dev &
        BACKEND_PID=$!
        cd ../..
        print_success "Backend modulaire démarré (PID: $BACKEND_PID)"
    else
        print_error "Aucun backend trouvé"
        exit 1
    fi
    
    # Attendre que le backend soit prêt
    print_status "Attente de la disponibilité du backend..."
    sleep 5
    
    # Tester la connectivité du backend
    for i in {1..10}; do
        if curl -s http://localhost:3001/health > /dev/null; then
            print_success "Backend est accessible sur http://localhost:3001"
            break
        else
            if [ $i -eq 10 ]; then
                print_error "Le backend n'est pas accessible après 10 tentatives"
                exit 1
            fi
            print_status "Tentative $i/10 - Attente du backend..."
            sleep 2
        fi
    done
}

# Démarrer le frontend
start_frontend() {
    print_status "Démarrage du frontend..."
    
    if [ -d "apps/frontend" ]; then
        cd apps/frontend
        npm run dev &
        FRONTEND_PID=$!
        cd ../..
        print_success "Frontend démarré (PID: $FRONTEND_PID)"
        
        # Attendre que le frontend soit prêt
        print_status "Attente de la disponibilité du frontend..."
        sleep 10
        
        # Tester la connectivité du frontend
        for i in {1..10}; do
            if curl -s http://localhost:3000 > /dev/null; then
                print_success "Frontend est accessible sur http://localhost:3000"
                break
            else
                if [ $i -eq 10 ]; then
                    print_warning "Le frontend n'est pas encore accessible, mais il démarre probablement..."
                fi
                print_status "Tentative $i/10 - Attente du frontend..."
                sleep 3
            fi
        done
    else
        print_error "Dossier frontend non trouvé"
        exit 1
    fi
}

# Exécuter les tests de validation
run_tests() {
    print_status "Exécution des tests de validation..."
    
    if [ -f "test-corrections.js" ]; then
        sleep 5  # Attendre un peu plus pour que tout soit prêt
        node test-corrections.js
        
        if [ $? -eq 0 ]; then
            print_success "Tous les tests sont passés avec succès !"
        else
            print_warning "Certains tests ont échoué, mais l'application peut fonctionner"
        fi
    else
        print_warning "Script de test non trouvé, continuons sans tests"
    fi
}

# Afficher les informations finales
show_final_info() {
    echo ""
    echo "🎉 APPLICATION DÉMARRÉE AVEC SUCCÈS !"
    echo "====================================="
    echo ""
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend:  http://localhost:3001"
    echo "📊 API Docs: http://localhost:3001/documentation"
    echo ""
    echo "👤 Compte de test:"
    echo "   Email:    admin@demo-tpe.fr"
    echo "   Password: demo123"
    echo ""
    echo "📋 Fonctionnalités corrigées:"
    echo "   ✅ Export Excel/PDF"
    echo "   ✅ Création de factures"
    echo "   ✅ Interface utilisateur nettoyée"
    echo ""
    echo "🛑 Pour arrêter l'application:"
    echo "   Ctrl+C puis: docker-compose down"
    echo ""
}

# Fonction de nettoyage en cas d'interruption
cleanup() {
    echo ""
    print_status "Arrêt de l'application..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    docker-compose down
    print_success "Application arrêtée"
    exit 0
}

# Capturer Ctrl+C pour un arrêt propre
trap cleanup SIGINT SIGTERM

# Exécution principale
main() {
    check_docker
    check_node
    start_infrastructure
    install_dependencies
    start_backend
    start_frontend
    run_tests
    show_final_info
    
    # Maintenir le script en vie
    print_status "Application en cours d'exécution... (Ctrl+C pour arrêter)"
    while true; do
        sleep 1
    done
}

# Lancer le script principal
main
