#!/bin/bash

# =============================================================================
# SCRIPT DE DÉMARRAGE UNIFIÉ - GESTION COMMERCIALE TPE
# Version: 2.0 - Analytics Phase 5
# Architecture: Backend production-backend.js + Frontend Next.js
# Ports: Backend 3001, Frontend 3003
# =============================================================================

set -e

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3003
BACKEND_FILE="production-backend.js"
FRONTEND_DIR="frontend-nextjs-production"
MAX_WAIT_ATTEMPTS=15
WAIT_INTERVAL=2

# Options
SKIP_DOCKER=false
VERBOSE=false
DEV_MODE=false

# Traitement des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --dev)
            DEV_MODE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --skip-docker    Skip Docker services startup"
            echo "  --verbose        Enable verbose output"
            echo "  --dev           Enable development mode"
            echo "  -h, --help      Show this help message"
            exit 0
            ;;
        *)
            echo "Option inconnue: $1"
            exit 1
            ;;
    esac
done

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Fonctions d'affichage
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
print_loading() { echo -e "${YELLOW}⏳ $1${NC}"; }
print_step() { echo -e "${MAGENTA}🔄 $1${NC}"; }

# Fonction de vérification de port
check_port() {
    local port=$1
    if command -v nc >/dev/null 2>&1; then
        nc -z localhost $port >/dev/null 2>&1
    elif command -v telnet >/dev/null 2>&1; then
        timeout 1 telnet localhost $port >/dev/null 2>&1
    else
        # Fallback avec /dev/tcp
        timeout 1 bash -c "echo >/dev/tcp/localhost/$port" >/dev/null 2>&1
    fi
}

# Fonction de nettoyage des processus
cleanup_processes() {
    print_loading "Nettoyage des processus Node.js existants..."
    pkill -f "node.*production-backend" >/dev/null 2>&1 || true
    pkill -f "node.*next" >/dev/null 2>&1 || true
    sleep 2
    print_success "Processus Node.js arrêtés"
}

# En-tête
clear
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              GESTION COMMERCIALE TPE - DÉMARRAGE UNIFIÉ          ║${NC}"
echo -e "${CYAN}║                     Analytics Phase 5 - v2.0                    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
print_info "Backend: $BACKEND_FILE (Port $BACKEND_PORT)"
print_info "Frontend: $FRONTEND_DIR (Port $FRONTEND_PORT)"
echo ""

# Étape 1: Vérification des prérequis
echo -e "${YELLOW}═══ ÉTAPE 1: VÉRIFICATION DES PRÉREQUIS ═══${NC}"
echo ""

# Vérifier Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_success "Node.js: $NODE_VERSION"
else
    print_error "Node.js non installé ou non accessible"
    echo -e "${GRAY}Installez Node.js 20+ depuis: https://nodejs.org/${NC}"
    exit 1
fi

# Vérifier yarn
if command -v yarn >/dev/null 2>&1; then
    YARN_VERSION=$(yarn --version)
    print_success "Yarn: v$YARN_VERSION"
else
    print_warning "Yarn non installé - Installation..."
    if command -v npm >/dev/null 2>&1; then
        npm install -g yarn
        print_success "Yarn installé avec succès"
    else
        print_error "npm non disponible pour installer yarn"
        exit 1
    fi
fi

# Vérifier Docker (si pas skippé)
if [ "$SKIP_DOCKER" = false ]; then
    if command -v docker >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker: $DOCKER_VERSION"
        
        # Vérifier si Docker est en cours d'exécution
        if ! docker ps >/dev/null 2>&1; then
            print_error "Docker n'est pas en cours d'exécution"
            echo -e "${GRAY}Démarrez Docker et réessayez${NC}"
            exit 1
        fi
    else
        print_error "Docker non installé ou non accessible"
        echo -e "${GRAY}Installez Docker depuis: https://www.docker.com/get-started${NC}"
        exit 1
    fi
fi

# Vérifier les fichiers requis
if [ ! -f "$BACKEND_FILE" ]; then
    print_error "Fichier backend '$BACKEND_FILE' non trouvé"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "Dossier frontend '$FRONTEND_DIR' non trouvé"
    exit 1
fi

print_success "Tous les prérequis sont satisfaits"
echo ""

# Étape 2: Nettoyage et préparation
echo -e "${YELLOW}═══ ÉTAPE 2: NETTOYAGE ET PRÉPARATION ═══${NC}"
echo ""

cleanup_processes

# Créer le dossier logs
if [ ! -d "logs" ]; then
    mkdir -p logs
    print_success "Dossier logs créé"
fi

# Étape 3: Infrastructure Docker
if [ "$SKIP_DOCKER" = false ]; then
    echo -e "${YELLOW}═══ ÉTAPE 3: INFRASTRUCTURE DOCKER ═══${NC}"
    echo ""
    
    print_loading "Vérification des services Docker..."
    
    # Vérifier si les services sont déjà en cours
    if docker-compose ps --services --filter "status=running" 2>/dev/null | grep -q "postgres\|redis"; then
        print_success "Services Docker déjà actifs"
    else
        print_loading "Démarrage des services Docker..."
        docker-compose up -d
        
        if [ $? -eq 0 ]; then
            print_success "Services Docker démarrés"
            print_loading "Attente de l'initialisation (15s)..."
            sleep 15
        else
            print_error "Échec du démarrage des services Docker"
            exit 1
        fi
    fi
    
    # Vérifier la santé des services
    print_loading "Vérification de la santé des services..."
    sleep 5
    if docker-compose ps --filter "health=healthy" --format "table {{.Service}}" 2>/dev/null | grep -q "postgres\|redis"; then
        print_success "Services Docker en bonne santé"
    else
        print_warning "Attente de la stabilisation des services..."
        sleep 10
    fi
fi

echo ""

# Étape 4: Démarrage du Backend
echo -e "${YELLOW}═══ ÉTAPE 4: DÉMARRAGE DU BACKEND ═══${NC}"
echo ""

BACKEND_RUNNING=false

# Vérifier si le backend est déjà actif
if check_port $BACKEND_PORT; then
    if curl -s "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
        print_success "Backend déjà actif et opérationnel"
        BACKEND_RUNNING=true
    else
        print_warning "Port $BACKEND_PORT occupé par un autre service"
        print_loading "Arrêt du service existant..."
        
        # Trouver et arrêter le processus utilisant le port
        PID=$(lsof -ti:$BACKEND_PORT 2>/dev/null || true)
        if [ -n "$PID" ]; then
            kill -TERM $PID 2>/dev/null || true
            sleep 2
        fi
    fi
fi

if [ "$BACKEND_RUNNING" = false ]; then
    print_loading "Démarrage du backend de production..."
    
    # Démarrer le backend en arrière-plan
    nohup node $BACKEND_FILE > logs/backend.log 2> logs/backend-error.log &
    BACKEND_PID=$!
    
    if [ -n "$BACKEND_PID" ]; then
        print_success "Backend démarré: PID $BACKEND_PID"
        echo $BACKEND_PID > .backend.pid
        
        # Attendre que le backend soit prêt
        print_loading "Attente de l'initialisation du backend..."
        attempt=0
        
        while [ $attempt -lt $MAX_WAIT_ATTEMPTS ] && [ "$BACKEND_RUNNING" = false ]; do
            sleep $WAIT_INTERVAL
            if curl -s "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
                BACKEND_RUNNING=true
                print_success "Backend opérationnel"
            else
                attempt=$((attempt + 1))
                if [ "$VERBOSE" = true ]; then
                    echo -e "${GRAY}   Tentative $attempt/$MAX_WAIT_ATTEMPTS...${NC}"
                fi
            fi
        done
        
        if [ "$BACKEND_RUNNING" = false ]; then
            print_error "Échec de l'initialisation du backend"
            echo -e "${GRAY}Vérifiez les logs: tail -f logs/backend-error.log${NC}"
            exit 1
        fi
    else
        print_error "Échec du démarrage du backend"
        exit 1
    fi
fi

echo ""

# Étape 5: Test des endpoints Backend
echo -e "${YELLOW}═══ ÉTAPE 5: VALIDATION DU BACKEND ═══${NC}"
echo ""

if [ "$BACKEND_RUNNING" = true ]; then
    # Test d'authentification
    print_loading "Test d'authentification..."
    
    AUTH_RESPONSE=$(curl -s -X POST "http://localhost:$BACKEND_PORT/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@demo-tpe.fr","password":"demo123"}' 2>/dev/null || echo "")
    
    if echo "$AUTH_RESPONSE" | grep -q '"success":true'; then
        print_success "Authentification réussie"
        
        # Extraire le token
        TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$TOKEN" ]; then
            # Test des endpoints Analytics Phase 5
            print_loading "Test des endpoints Analytics..."
            
            # Test KPI Metrics
            if curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:$BACKEND_PORT/analytics/kpi" >/dev/null 2>&1; then
                print_success "KPI Metrics: Opérationnel"
            else
                print_warning "KPI Metrics: Échec"
            fi
            
            # Test Sales Analytics
            if curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:$BACKEND_PORT/analytics/sales" >/dev/null 2>&1; then
                print_success "Sales Analytics: Opérationnel"
            else
                print_warning "Sales Analytics: Échec"
            fi
            
            # Test Dashboard Stats
            if curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:$BACKEND_PORT/dashboard/stats" >/dev/null 2>&1; then
                print_success "Dashboard Stats: Opérationnel"
            else
                print_warning "Dashboard Stats: Échec"
            fi
        fi
    else
        print_warning "Échec de l'authentification"
    fi
fi

# Étape 6: Préparation du Frontend
echo -e "${YELLOW}═══ ÉTAPE 6: PRÉPARATION DU FRONTEND ═══${NC}"
echo ""

cd $FRONTEND_DIR

# Vérifier les dépendances
if [ -d "node_modules" ]; then
    print_success "Dépendances déjà installées"
else
    print_loading "Installation des dépendances..."
    yarn install --silent

    if [ $? -eq 0 ]; then
        print_success "Dépendances installées avec succès"
    else
        print_error "Échec de l'installation des dépendances"
        cd ..
        exit 1
    fi
fi

# Vérifier Recharts (Analytics Phase 5)
if [ -d "node_modules/recharts" ]; then
    print_success "Recharts (graphiques Analytics): Installé"
else
    print_loading "Installation de Recharts..."
    yarn add recharts
    if [ $? -eq 0 ]; then
        print_success "Recharts installé"
    else
        print_warning "Échec installation Recharts"
    fi
fi

# Vérifier la configuration
if [ -f ".env.local" ]; then
    if grep -q "NEXT_PUBLIC_API_BASE_URL=http://localhost:$BACKEND_PORT" .env.local; then
        print_success "Configuration API: Correcte"
    else
        print_loading "Mise à jour de la configuration API..."
        echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:$BACKEND_PORT" > .env.local
        print_success "Configuration API mise à jour"
    fi
else
    print_loading "Création de la configuration..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_BASE_URL=http://localhost:$BACKEND_PORT
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT
NODE_ENV=development
EOF
    print_success "Configuration créée"
fi

cd ..
echo ""

# Étape 7: Informations finales
echo -e "${YELLOW}═══ ÉTAPE 7: INFORMATIONS D'ACCÈS ═══${NC}"
echo ""

echo -e "${GREEN}🎉 APPLICATION PRÊTE À DÉMARRER!${NC}"
echo ""

echo -e "${MAGENTA}📊 FONCTIONNALITÉS ANALYTICS PHASE 5:${NC}"
echo -e "${WHITE}   • KPI Temps Réel (CA, marge, conversion)${NC}"
echo -e "${WHITE}   • Analytics de Ventes (évolution, top clients)${NC}"
echo -e "${WHITE}   • Performance Produits (top ventes, catégories)${NC}"
echo -e "${WHITE}   • Segmentation Clients (VIP/Premium/Standard)${NC}"
echo -e "${WHITE}   • Graphiques Interactifs (Recharts)${NC}"
echo -e "${WHITE}   • Tableaux de Bord Personnalisables${NC}"
echo ""

echo -e "${CYAN}🌐 URLS D'ACCÈS:${NC}"
echo -e "${WHITE}   Frontend: http://localhost:$FRONTEND_PORT${NC}"
echo -e "${MAGENTA}   Analytics: http://localhost:$FRONTEND_PORT/analytics${NC}"
echo -e "${WHITE}   Backend API: http://localhost:$BACKEND_PORT${NC}"
echo -e "${WHITE}   Health Check: http://localhost:$BACKEND_PORT/health${NC}"
echo -e "${WHITE}   Métriques: http://localhost:$BACKEND_PORT/metrics${NC}"
echo ""

if [ "$SKIP_DOCKER" = false ]; then
    echo -e "${CYAN}🗄️  SERVICES DOCKER:${NC}"
    echo -e "${WHITE}   PostgreSQL: http://localhost:8080 (Adminer)${NC}"
    echo -e "${WHITE}   Redis: http://localhost:8081 (Redis Commander)${NC}"
    echo ""
fi

echo -e "${CYAN}🔑 IDENTIFIANTS DE TEST:${NC}"
echo -e "${WHITE}   Email: admin@demo-tpe.fr${NC}"
echo -e "${WHITE}   Mot de passe: demo123${NC}"
echo ""

echo -e "${CYAN}📱 NAVIGATION DISPONIBLE:${NC}"
echo -e "${GRAY}   Dashboard → Vue d'ensemble générale${NC}"
echo -e "${MAGENTA}   Analytics → KPI et graphiques temps réel${NC}"
echo -e "${GRAY}   Clients → Gestion et segmentation${NC}"
echo -e "${GRAY}   Produits → Catalogue et performance${NC}"
echo -e "${GRAY}   Commandes → Devis et commandes${NC}"
echo -e "${GRAY}   Factures → Facturation et paiements${NC}"
echo ""

# Étape 8: Démarrage du Frontend
echo -e "${YELLOW}═══ ÉTAPE 8: DÉMARRAGE DU FRONTEND ═══${NC}"
echo ""

print_loading "Démarrage de Next.js avec Analytics Phase 5..."
echo ""
echo -e "${YELLOW}⚡ Appuyez sur Ctrl+C pour arrêter l'application${NC}"
echo -e "${CYAN}🌐 Une fois démarré, ouvrez: http://localhost:$FRONTEND_PORT${NC}"
echo ""

# Démarrer le frontend
cd $FRONTEND_DIR
if [ "$DEV_MODE" = true ]; then
    yarn dev
else
    yarn dev
fi

# Nettoyage à la sortie
cd ..
echo ""
echo -e "${YELLOW}🛑 APPLICATION ARRÊTÉE${NC}"
echo -e "${WHITE}Pour redémarrer:${NC}"
echo -e "${CYAN}   ./start-app-unified.sh${NC}"
echo ""

echo -e "${WHITE}Pour arrêter complètement:${NC}"
echo -e "${CYAN}   ./stop-app-unified.sh${NC}"

echo ""
