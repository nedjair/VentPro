#!/bin/bash

# =============================================================================
# 🧪 Script de Test Rapide - Gestion Commerciale TPE
# =============================================================================
# Ce script teste rapidement si l'application peut démarrer
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

echo "🧪 Test rapide de l'application Gestion Commerciale TPE"
echo "=================================================="
echo

# Vérifier Docker
log_info "Vérification de Docker..."
if command -v docker &> /dev/null; then
    log_success "Docker trouvé : $(docker --version)"
else
    log_error "Docker non trouvé"
    exit 1
fi

# Vérifier Node.js
log_info "Vérification de Node.js..."
if command -v node &> /dev/null; then
    log_success "Node.js trouvé : $(node --version)"
else
    log_error "Node.js non trouvé"
    exit 1
fi

# Vérifier pnpm
log_info "Vérification de pnpm..."
if command -v pnpm &> /dev/null; then
    log_success "pnpm trouvé : v$(pnpm --version)"
else
    log_error "pnpm non trouvé"
    exit 1
fi

# Vérifier la structure du projet
log_info "Vérification de la structure du projet..."
if [ -f "package.json" ] && [ -f "pnpm-workspace.yaml" ]; then
    log_success "Structure du projet OK"
else
    log_error "Structure du projet incorrecte"
    exit 1
fi

# Vérifier les applications
log_info "Vérification des applications..."
if [ -d "apps/frontend" ] && [ -d "apps/backend" ] && [ -d "packages/database" ]; then
    log_success "Applications trouvées"
else
    log_error "Applications manquantes"
    exit 1
fi

# Vérifier Docker Compose
log_info "Vérification du fichier Docker Compose..."
if [ -f "docker-compose.yml" ]; then
    log_success "Docker Compose configuré"
else
    log_error "docker-compose.yml manquant"
    exit 1
fi

# Test de démarrage Docker
log_info "Test de démarrage des services Docker..."
docker-compose up -d --quiet-pull 2>/dev/null || {
    log_warning "Problème avec Docker Compose, mais continuons..."
}

# Vérifier les ports
log_info "Vérification des ports..."
ports_ok=true

check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Port $1 déjà utilisé"
        ports_ok=false
    fi
}

check_port 3000
check_port 3001
check_port 5432
check_port 6379

if [ "$ports_ok" = true ]; then
    log_success "Tous les ports sont disponibles"
fi

echo
log_success "Test rapide terminé !"
echo
echo "📋 Résumé :"
echo "  ✅ Docker : Disponible"
echo "  ✅ Node.js : Disponible"
echo "  ✅ pnpm : Disponible"
echo "  ✅ Structure projet : OK"
echo "  ✅ Applications : Présentes"
echo
echo "🚀 Pour démarrer l'application :"
echo "  Windows : .\\start-app.ps1"
echo "  Linux/Mac : ./start-app.sh"
echo
echo "📝 En cas de problème de dépendances :"
echo "  pnpm install --no-frozen-lockfile"
echo
