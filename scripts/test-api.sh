#!/bin/bash

# Script de test des APIs - Gestion Commerciale TPE
# Ce script teste toutes les APIs implémentées dans la Phase 2

set -e

# Configuration
API_BASE_URL="http://localhost:3001/api/v1"
ACCESS_TOKEN=""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
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

# Fonction pour faire une requête HTTP
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4

    if [ -n "$ACCESS_TOKEN" ]; then
        headers="$headers -H \"Authorization: Bearer $ACCESS_TOKEN\""
    fi

    if [ -n "$data" ]; then
        eval curl -s -X "$method" "$API_BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            -d "'$data'"
    else
        eval curl -s -X "$method" "$API_BASE_URL$endpoint" \
            $headers
    fi
}

# Test de connexion et récupération du token
test_authentication() {
    print_status "Test d'authentification..."

    local response=$(make_request "POST" "/auth/login" '{
        "email": "admin@demo-tpe.fr",
        "password": "demo123"
    }')

    if echo "$response" | grep -q '"success":true'; then
        ACCESS_TOKEN=$(echo "$response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        print_success "Authentification réussie"
        return 0
    else
        print_error "Échec de l'authentification"
        echo "$response"
        return 1
    fi
}

# Test du profil utilisateur
test_user_profile() {
    print_status "Test du profil utilisateur..."

    local response=$(make_request "GET" "/auth/me")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Récupération du profil réussie"
        return 0
    else
        print_error "Échec de la récupération du profil"
        echo "$response"
        return 1
    fi
}

# Test des statistiques du dashboard
test_dashboard_stats() {
    print_status "Test des statistiques du dashboard..."

    local response=$(make_request "GET" "/dashboard/stats")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Récupération des statistiques réussie"
        return 0
    else
        print_error "Échec de la récupération des statistiques"
        echo "$response"
        return 1
    fi
}

# Test des activités récentes
test_dashboard_activity() {
    print_status "Test des activités récentes..."

    local response=$(make_request "GET" "/dashboard/activity?limit=5")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Récupération des activités réussie"
        return 0
    else
        print_error "Échec de la récupération des activités"
        echo "$response"
        return 1
    fi
}

# Test des alertes
test_dashboard_alerts() {
    print_status "Test des alertes..."

    local response=$(make_request "GET" "/dashboard/alerts")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Récupération des alertes réussie"
        return 0
    else
        print_error "Échec de la récupération des alertes"
        echo "$response"
        return 1
    fi
}

# Test de la liste des clients
test_clients_list() {
    print_status "Test de la liste des clients..."

    local response=$(make_request "GET" "/clients?page=1&limit=10")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Récupération de la liste des clients réussie"
        return 0
    else
        print_error "Échec de la récupération de la liste des clients"
        echo "$response"
        return 1
    fi
}

# Test de création d'un client
test_client_creation() {
    print_status "Test de création d'un client..."

    local response=$(make_request "POST" "/clients" '{
        "type": "INDIVIDUAL",
        "firstName": "Test",
        "lastName": "User",
        "email": "test.user@example.com",
        "phone": "01 23 45 67 89",
        "city": "Paris",
        "country": "France"
    }')

    if echo "$response" | grep -q '"success":true'; then
        print_success "Création du client réussie"
        # Extraire l'ID du client créé pour les tests suivants
        CLIENT_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        return 0
    else
        print_error "Échec de la création du client"
        echo "$response"
        return 1
    fi
}

# Test de la liste des produits
test_products_list() {
    print_status "Test de la liste des produits..."

    local response=$(make_request "GET" "/products?page=1&limit=10")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Récupération de la liste des produits réussie"
        return 0
    else
        print_error "Échec de la récupération de la liste des produits"
        echo "$response"
        return 1
    fi
}

# Test de création d'un produit
test_product_creation() {
    print_status "Test de création d'un produit..."

    local response=$(make_request "POST" "/products" '{
        "name": "Produit Test",
        "description": "Description du produit test",
        "sku": "TEST-001",
        "price": 99.99,
        "cost": 50.00,
        "stockQuantity": 10,
        "minStock": 5,
        "isActive": true,
        "isService": false,
        "unit": "pièce"
    }')

    if echo "$response" | grep -q '"success":true'; then
        print_success "Création du produit réussie"
        # Extraire l'ID du produit créé pour les tests suivants
        PRODUCT_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        return 0
    else
        print_error "Échec de la création du produit"
        echo "$response"
        return 1
    fi
}

# Test de la liste des catégories
test_categories_list() {
    print_status "Test de la liste des catégories..."

    local response=$(make_request "GET" "/categories")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Récupération de la liste des catégories réussie"
        return 0
    else
        print_error "Échec de la récupération de la liste des catégories"
        echo "$response"
        return 1
    fi
}

# Test de création d'une catégorie
test_category_creation() {
    print_status "Test de création d'une catégorie..."

    local response=$(make_request "POST" "/categories" '{
        "name": "Catégorie Test",
        "description": "Description de la catégorie test"
    }')

    if echo "$response" | grep -q '"success":true'; then
        print_success "Création de la catégorie réussie"
        return 0
    else
        print_error "Échec de la création de la catégorie"
        echo "$response"
        return 1
    fi
}

# Test des statistiques de stock
test_stock_stats() {
    print_status "Test des statistiques de stock..."

    local response=$(make_request "GET" "/stock/stats")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Récupération des statistiques de stock réussie"
        return 0
    else
        print_error "Échec de la récupération des statistiques de stock"
        echo "$response"
        return 1
    fi
}

# Test des alertes de stock
test_stock_alerts() {
    print_status "Test des alertes de stock..."

    local response=$(make_request "GET" "/stock/alerts")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Récupération des alertes de stock réussie"
        return 0
    else
        print_error "Échec de la récupération des alertes de stock"
        echo "$response"
        return 1
    fi
}

# Test du health check
test_health_check() {
    print_status "Test du health check..."

    local response=$(curl -s http://localhost:3001/health)

    if echo "$response" | grep -q '"status":"ok"'; then
        print_success "Health check réussi"
        return 0
    else
        print_error "Échec du health check"
        echo "$response"
        return 1
    fi
}

# Fonction principale
main() {
    echo "🧪 Tests des APIs - Gestion Commerciale TPE"
    echo "=========================================="
    echo ""

    # Vérifier que le serveur est démarré
    print_status "Vérification que le serveur est démarré..."
    if ! curl -s http://localhost:3001/health > /dev/null; then
        print_error "Le serveur n'est pas accessible sur http://localhost:3001"
        print_warning "Assurez-vous que le serveur est démarré avec 'pnpm dev'"
        exit 1
    fi

    local failed_tests=0
    local total_tests=0

    # Exécuter tous les tests
    tests=(
        "test_health_check"
        "test_authentication"
        "test_user_profile"
        "test_dashboard_stats"
        "test_dashboard_activity"
        "test_dashboard_alerts"
        "test_clients_list"
        "test_client_creation"
        "test_products_list"
        "test_product_creation"
        "test_categories_list"
        "test_category_creation"
        "test_stock_stats"
        "test_stock_alerts"
    )

    for test in "${tests[@]}"; do
        total_tests=$((total_tests + 1))
        if ! $test; then
            failed_tests=$((failed_tests + 1))
        fi
        echo ""
    done

    # Résumé des tests
    echo "=========================================="
    echo "📊 Résumé des tests:"
    echo "  • Total: $total_tests"
    echo "  • Réussis: $((total_tests - failed_tests))"
    echo "  • Échoués: $failed_tests"

    if [ $failed_tests -eq 0 ]; then
        print_success "Tous les tests sont passés avec succès ! 🎉"
        exit 0
    else
        print_error "$failed_tests test(s) ont échoué"
        exit 1
    fi
}

# Exécution du script principal
main "$@"
