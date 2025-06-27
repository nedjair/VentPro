#!/bin/bash

# =============================================================================
# ⚡ Démarrage Rapide - Gestion Commerciale TPE
# =============================================================================
# Script de démarrage simplifié qui fonctionne même avec des dépendances 
# partiellement installées
# =============================================================================

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo "⚡ Démarrage Rapide - Gestion Commerciale TPE"
echo "=========================================="
echo

# Vérifier les prérequis essentiels
log_info "Vérification des prérequis..."

if ! command -v docker &> /dev/null; then
    log_error "Docker requis. Installez Docker Desktop."
    exit 1
fi

if ! command -v node &> /dev/null; then
    log_error "Node.js requis. Installez Node.js 20+."
    exit 1
fi

log_success "Prérequis OK"

# Créer les répertoires nécessaires
mkdir -p logs

# Démarrer Docker Compose
log_info "Démarrage des services Docker..."
docker-compose down >/dev/null 2>&1 || true
docker-compose up -d

if [ $? -eq 0 ]; then
    log_success "Services Docker démarrés"
else
    log_error "Échec du démarrage Docker"
    exit 1
fi

# Attendre PostgreSQL
log_info "Attente de PostgreSQL..."
sleep 10

# Essayer d'installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    log_info "Installation des dépendances..."
    if command -v pnpm &> /dev/null; then
        pnpm install --no-frozen-lockfile || log_warning "Installation pnpm partielle"
    else
        npm install || log_warning "Installation npm partielle"
    fi
fi

# Configuration de la base de données
log_info "Configuration de la base de données..."
if command -v pnpm &> /dev/null; then
    pnpm --filter @gestion/database db:generate 2>/dev/null || log_warning "Génération Prisma échouée"
    pnpm --filter @gestion/database db:push 2>/dev/null || log_warning "Push DB échoué"
    pnpm --filter @gestion/database db:seed 2>/dev/null || log_warning "Seed DB échoué"
else
    cd packages/database
    npx prisma generate 2>/dev/null || log_warning "Génération Prisma échouée"
    npx prisma db push 2>/dev/null || log_warning "Push DB échoué"
    npx tsx seed.ts 2>/dev/null || log_warning "Seed DB échoué"
    cd ../..
fi

# Démarrer le backend
log_info "Démarrage du backend..."
cd apps/backend
if [ -f "package.json" ]; then
    if command -v pnpm &> /dev/null; then
        pnpm dev > ../../logs/backend.log 2>&1 &
    else
        npm run dev > ../../logs/backend.log 2>&1 &
    fi
    BACKEND_PID=$!
    echo $BACKEND_PID > ../../.backend.pid
    log_success "Backend démarré (PID: $BACKEND_PID)"
else
    log_error "Backend non trouvé"
    cd ../..
    exit 1
fi
cd ../..

# Attendre que le backend soit prêt
log_info "Attente du backend..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health >/dev/null 2>&1; then
        log_success "Backend prêt !"
        break
    fi
    sleep 2
done

# Démarrer le frontend
log_info "Démarrage du frontend..."
cd apps/frontend
if [ -f "package.json" ]; then
    if command -v pnpm &> /dev/null; then
        pnpm dev > ../../logs/frontend.log 2>&1 &
    else
        npm run dev > ../../logs/frontend.log 2>&1 &
    fi
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../../.frontend.pid
    log_success "Frontend démarré (PID: $FRONTEND_PID)"
else
    log_error "Frontend non trouvé"
    cd ../..
    exit 1
fi
cd ../..

# Attendre que le frontend soit prêt
log_info "Attente du frontend..."
for i in {1..30}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        log_success "Frontend prêt !"
        break
    fi
    sleep 2
done

# Afficher les informations
echo
log_success "🎉 Application démarrée !"
echo
echo "📱 Accès rapide :"
echo "  🌐 Application : http://localhost:3000"
echo "  🔧 API        : http://localhost:3001"
echo "  📚 Docs       : http://localhost:3001/docs"
echo "  🗄️  Database   : http://localhost:8080"
echo
echo "🔐 Comptes de test :"
echo "  Admin   : admin@demo-tpe.fr / demo123"
echo "  Manager : manager@demo-tpe.fr / demo123"
echo "  Employé : employee@demo-tpe.fr / demo123"
echo
echo "📝 Logs :"
echo "  tail -f logs/backend.log"
echo "  tail -f logs/frontend.log"
echo
echo "🛑 Arrêt : ./stop-app.sh ou Ctrl+C"
echo

# Fonction de nettoyage
cleanup() {
    echo
    log_info "Arrêt de l'application..."
    
    # Arrêter les processus
    if [ -f ".backend.pid" ]; then
        kill $(cat .backend.pid) 2>/dev/null || true
        rm -f .backend.pid
    fi
    
    if [ -f ".frontend.pid" ]; then
        kill $(cat .frontend.pid) 2>/dev/null || true
        rm -f .frontend.pid
    fi
    
    # Arrêter Docker
    docker-compose down >/dev/null 2>&1 || true
    
    log_success "Application arrêtée"
    exit 0
}

# Capturer Ctrl+C
trap cleanup INT

# Attendre
echo "Appuyez sur Ctrl+C pour arrêter..."
while true; do
    sleep 1
done
