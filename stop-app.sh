#!/bin/bash

# =============================================================================
# 🛑 Script d'Arrêt - Gestion Commerciale TPE
# =============================================================================
# Ce script arrête proprement tous les services de l'application
# =============================================================================

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Fonction pour arrêter un processus par PID
stop_process() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Arrêt de $service_name (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 2
            
            # Forcer l'arrêt si nécessaire
            if kill -0 "$pid" 2>/dev/null; then
                log_warning "Arrêt forcé de $service_name..."
                kill -9 "$pid" 2>/dev/null || true
            fi
            
            log_success "$service_name arrêté"
        else
            log_warning "$service_name n'était pas en cours d'exécution"
        fi
        rm -f "$pid_file"
    else
        log_info "Aucun fichier PID trouvé pour $service_name"
    fi
}

# Fonction principale
main() {
    echo "🛑 Arrêt de l'application Gestion Commerciale TPE"
    echo "=============================================="
    echo
    
    # Arrêter le frontend
    stop_process ".frontend.pid" "Frontend Next.js"
    
    # Arrêter le backend
    stop_process ".backend.pid" "Backend Fastify"
    
    # Arrêter les services Docker
    log_info "Arrêt des services Docker..."
    docker-compose down >/dev/null 2>&1 || true
    log_success "Services Docker arrêtés"
    
    # Nettoyer les fichiers temporaires
    rm -f .frontend.pid .backend.pid
    
    echo
    log_success "Application arrêtée avec succès !"
    echo
}

# Exécution du script principal
main "$@"
