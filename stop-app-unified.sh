#!/bin/bash

# =============================================================================
# SCRIPT D'ARRÊT UNIFIÉ - GESTION COMMERCIALE TPE
# Version: 2.0 - Analytics Phase 5
# Arrêt propre de tous les services
# =============================================================================

set -e

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3003
BACKEND_PID_FILE=".backend.pid"

# Options
KEEP_DOCKER=false
FORCE=false
VERBOSE=false

# Traitement des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --keep-docker)
            KEEP_DOCKER=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --keep-docker    Keep Docker services running"
            echo "  --force          Force stop all processes"
            echo "  --verbose        Enable verbose output"
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

# Fonction pour arrêter un processus par port
stop_process_by_port() {
    local port=$1
    local service_name=$2
    
    if check_port $port; then
        print_loading "Arrêt du service $service_name (port $port)..."
        
        # Trouver le processus utilisant le port
        if command -v lsof >/dev/null 2>&1; then
            PID=$(lsof -ti:$port 2>/dev/null || true)
        elif command -v ss >/dev/null 2>&1; then
            PID=$(ss -tulpn | grep ":$port " | grep -o 'pid=[0-9]*' | cut -d'=' -f2 | head -1)
        else
            PID=""
        fi
        
        if [ -n "$PID" ]; then
            if [ "$VERBOSE" = true ]; then
                PROCESS_NAME=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
                echo -e "${GRAY}   Processus trouvé: $PROCESS_NAME (PID: $PID)${NC}"
            fi
            
            if [ "$FORCE" = true ]; then
                kill -9 $PID 2>/dev/null || true
            else
                kill -TERM $PID 2>/dev/null || true
                sleep 3
                if kill -0 $PID 2>/dev/null; then
                    kill -9 $PID 2>/dev/null || true
                fi
            fi
            
            print_success "$service_name arrêté"
            return 0
        else
            print_warning "Impossible de trouver le processus pour $service_name"
        fi
    else
        print_info "$service_name n'était pas en cours d'exécution"
        return 0
    fi
    
    return 1
}

# En-tête
clear
echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║              GESTION COMMERCIALE TPE - ARRÊT UNIFIÉ              ║${NC}"
echo -e "${RED}║                     Analytics Phase 5 - v2.0                    ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$FORCE" = true ]; then
    print_warning "Mode FORCE activé - Arrêt immédiat"
else
    print_info "Arrêt propre des services..."
fi

echo ""

# Étape 1: Arrêt du Frontend
echo -e "${YELLOW}═══ ÉTAPE 1: ARRÊT DU FRONTEND ═══${NC}"
echo ""

stop_process_by_port $FRONTEND_PORT "Frontend Next.js"

# Arrêter tous les processus Next.js
print_loading "Arrêt des processus Next.js..."
if [ "$FORCE" = true ]; then
    pkill -9 -f "node.*next" >/dev/null 2>&1 || true
    pkill -9 -f "next.*dev" >/dev/null 2>&1 || true
else
    pkill -TERM -f "node.*next" >/dev/null 2>&1 || true
    pkill -TERM -f "next.*dev" >/dev/null 2>&1 || true
    sleep 3
    pkill -9 -f "node.*next" >/dev/null 2>&1 || true
    pkill -9 -f "next.*dev" >/dev/null 2>&1 || true
fi

NEXT_PROCESSES=$(pgrep -f "next" 2>/dev/null || true)
if [ -z "$NEXT_PROCESSES" ]; then
    print_success "Processus Next.js arrêtés"
else
    print_warning "Certains processus Next.js sont encore actifs"
    if [ "$VERBOSE" = true ]; then
        echo -e "${GRAY}   PIDs restants: $NEXT_PROCESSES${NC}"
    fi
fi

echo ""

# Étape 2: Arrêt du Backend
echo -e "${YELLOW}═══ ÉTAPE 2: ARRÊT DU BACKEND ═══${NC}"
echo ""

# Arrêter le backend via le fichier PID
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat $BACKEND_PID_FILE 2>/dev/null || true)
    if [ -n "$BACKEND_PID" ]; then
        print_loading "Arrêt du backend via PID: $BACKEND_PID"
        if kill -0 $BACKEND_PID 2>/dev/null; then
            if [ "$FORCE" = true ]; then
                kill -9 $BACKEND_PID 2>/dev/null || true
            else
                kill -TERM $BACKEND_PID 2>/dev/null || true
                sleep 3
                if kill -0 $BACKEND_PID 2>/dev/null; then
                    kill -9 $BACKEND_PID 2>/dev/null || true
                fi
            fi
            print_success "Backend arrêté (PID: $BACKEND_PID)"
        else
            print_warning "Processus backend non trouvé (PID: $BACKEND_PID)"
        fi
    fi
    rm -f $BACKEND_PID_FILE
fi

# Arrêter le backend par port
stop_process_by_port $BACKEND_PORT "Backend API"

# Arrêter tous les processus backend restants
print_loading "Arrêt des processus backend restants..."
if [ "$FORCE" = true ]; then
    pkill -9 -f "production-backend" >/dev/null 2>&1 || true
    pkill -9 -f "node.*backend" >/dev/null 2>&1 || true
else
    pkill -TERM -f "production-backend" >/dev/null 2>&1 || true
    pkill -TERM -f "node.*backend" >/dev/null 2>&1 || true
    sleep 3
    pkill -9 -f "production-backend" >/dev/null 2>&1 || true
    pkill -9 -f "node.*backend" >/dev/null 2>&1 || true
fi

BACKEND_PROCESSES=$(pgrep -f "production-backend\|backend" 2>/dev/null || true)
if [ -z "$BACKEND_PROCESSES" ]; then
    print_success "Processus backend arrêtés"
else
    print_warning "Certains processus backend sont encore actifs"
    if [ "$VERBOSE" = true ]; then
        echo -e "${GRAY}   PIDs restants: $BACKEND_PROCESSES${NC}"
    fi
fi

echo ""

# Étape 3: Nettoyage des processus Node.js
echo -e "${YELLOW}═══ ÉTAPE 3: NETTOYAGE GÉNÉRAL ═══${NC}"
echo ""

if [ "$FORCE" = true ]; then
    print_loading "Arrêt forcé de tous les processus Node.js..."
    pkill -9 -f "node" >/dev/null 2>&1 || true
    print_success "Tous les processus Node.js arrêtés"
else
    REMAINING_NODE_PROCESSES=$(pgrep -f "node" 2>/dev/null || true)
    if [ -n "$REMAINING_NODE_PROCESSES" ]; then
        print_warning "Processus Node.js restants détectés"
        if [ "$VERBOSE" = true ]; then
            echo -e "${GRAY}   PIDs: $REMAINING_NODE_PROCESSES${NC}"
            ps -p $REMAINING_NODE_PROCESSES -o pid,comm,args 2>/dev/null || true
        fi
        echo -e "${GRAY}Utilisez --force pour arrêter tous les processus Node.js${NC}"
    else
        print_success "Aucun processus Node.js restant"
    fi
fi

# Nettoyage des fichiers temporaires
print_loading "Nettoyage des fichiers temporaires..."
TEMP_FILES=(".backend.pid" ".frontend.pid")
for file in "${TEMP_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        if [ "$VERBOSE" = true ]; then
            echo -e "${GRAY}   Supprimé: $file${NC}"
        fi
    fi
done
print_success "Fichiers temporaires nettoyés"

echo ""

# Étape 4: Arrêt des services Docker (optionnel)
if [ "$KEEP_DOCKER" = false ]; then
    echo -e "${YELLOW}═══ ÉTAPE 4: ARRÊT DES SERVICES DOCKER ═══${NC}"
    echo ""
    
    print_loading "Arrêt des services Docker..."
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose down
        if [ $? -eq 0 ]; then
            print_success "Services Docker arrêtés"
        else
            print_warning "Erreur lors de l'arrêt des services Docker"
        fi
    else
        print_warning "docker-compose non disponible"
    fi
else
    echo -e "${YELLOW}═══ SERVICES DOCKER CONSERVÉS ═══${NC}"
    echo ""
    print_info "Services Docker conservés (option --keep-docker)"
    echo -e "${GRAY}Pour arrêter Docker manuellement: docker-compose down${NC}"
fi

echo ""

# Étape 5: Vérification finale
echo -e "${YELLOW}═══ ÉTAPE 5: VÉRIFICATION FINALE ═══${NC}"
echo ""

FRONTEND_STILL_RUNNING=false
BACKEND_STILL_RUNNING=false

if check_port $FRONTEND_PORT; then
    FRONTEND_STILL_RUNNING=true
fi

if check_port $BACKEND_PORT; then
    BACKEND_STILL_RUNNING=true
fi

if [ "$FRONTEND_STILL_RUNNING" = false ] && [ "$BACKEND_STILL_RUNNING" = false ]; then
    print_success "Tous les services ont été arrêtés avec succès"
else
    if [ "$FRONTEND_STILL_RUNNING" = true ]; then
        print_warning "Frontend encore actif sur le port $FRONTEND_PORT"
    fi
    if [ "$BACKEND_STILL_RUNNING" = true ]; then
        print_warning "Backend encore actif sur le port $BACKEND_PORT"
    fi
    echo -e "${GRAY}Utilisez --force pour un arrêt forcé${NC}"
fi

echo ""

# Résumé final
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                        ARRÊT TERMINÉ                             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}📊 RÉSUMÉ:${NC}"
if [ "$FRONTEND_STILL_RUNNING" = false ]; then
    echo -e "${GREEN}   Frontend (port $FRONTEND_PORT): ARRÊTÉ${NC}"
else
    echo -e "${RED}   Frontend (port $FRONTEND_PORT): ENCORE ACTIF${NC}"
fi

if [ "$BACKEND_STILL_RUNNING" = false ]; then
    echo -e "${GREEN}   Backend (port $BACKEND_PORT): ARRÊTÉ${NC}"
else
    echo -e "${RED}   Backend (port $BACKEND_PORT): ENCORE ACTIF${NC}"
fi

if [ "$KEEP_DOCKER" = false ]; then
    echo -e "${GREEN}   Services Docker: ARRÊTÉS${NC}"
else
    echo -e "${YELLOW}   Services Docker: CONSERVÉS${NC}"
fi
echo ""

echo -e "${CYAN}🔄 POUR REDÉMARRER:${NC}"
echo -e "${WHITE}   ./start-app-unified.sh${NC}"
echo ""

echo -e "${CYAN}🛠️  OPTIONS D'ARRÊT:${NC}"
echo -e "${GRAY}   --force          : Arrêt forcé de tous les processus${NC}"
echo -e "${GRAY}   --keep-docker    : Conserver les services Docker${NC}"
echo -e "${GRAY}   --verbose        : Affichage détaillé${NC}"
echo ""
