# 🇩🇿 Guide de Seeding des Données Algériennes

## 📋 Vue d'ensemble

Ce guide explique comment peupler la base de données PostgreSQL de l'application de gestion commerciale avec **50+ enregistrements de données algériennes authentiques**.

## 🎯 Objectifs du Seeding

- ✅ **50+ enregistrements** de données de test
- 🇩🇿 **Données algériennes authentiques** (villes, téléphones, entreprises)
- 💰 **Format de devise DA** (Dinar Algérien)
- 🏢 **Données réalistes** pour le marché algérien
- 🔗 **Relations complètes** entre toutes les entités

## 📊 Répartition des Données

| Type | Quantité | Description |
|------|----------|-------------|
| **Entreprise** | 1 | Entreprise principale algérienne |
| **Utilisateurs** | 5 | Admin + Managers + Employés |
| **Catégories** | 11 | Catégories de produits algériens |
| **Fournisseurs** | 8 | Fournisseurs algériens |
| **Produits** | 20 | Produits typiques du marché algérien |
| **Clients** | 15 | Particuliers et entreprises algériens |
| **Stocks** | 20 | Stocks liés aux produits |
| **Mouvements** | 15 | Mouvements de stock |
| **TOTAL** | **95+** | Enregistrements |

## 🚀 Méthodes d'Exécution

### Méthode 1 : Script Automatique (Recommandé)

```bash
# Exécution complète automatique
setup-database-algerian.bat
```

### Méthode 2 : Correction + Seeding

Si vous avez des problèmes de schéma Prisma :

```bash
# 1. Corriger le schéma Prisma
fix-prisma-schema.bat

# 2. Puis exécuter le seeding
setup-database-algerian.bat
```

### Méthode 3 : Étapes Manuelles

```bash
# 1. Démarrer PostgreSQL
docker-compose -f docker-compose.prod.yml --env-file .env up -d postgres

# 2. Synchroniser le schéma
cd packages/database
npx prisma db push --force-reset

# 3. Générer le client Prisma
npx prisma generate

# 4. Exécuter le seeding
npm run db:seed-algerian

# 5. Retourner au répertoire racine
cd ../..
```

### Méthode 4 : PowerShell (Alternative)

```powershell
# Avec confirmation
powershell -ExecutionPolicy Bypass -File seed-algerian-database.ps1

# Sans confirmation (force)
powershell -ExecutionPolicy Bypass -File seed-algerian-database.ps1 -Force
```

## 🔍 Vérification des Données

Après le seeding, vérifiez que les données ont été créées :

```bash
# Test complet des données algériennes
node test-algerian-data.js

# Test de connectivité général
node test-database-status.js
```

## 🔐 Informations de Connexion

Après le seeding, vous pouvez vous connecter avec :

- **Email** : `admin@gestion-dz.com`
- **Mot de passe** : `admin123`
- **URL** : `http://localhost:3000`

## 📦 Données Créées

### 🏢 Entreprise Principale
- **Nom** : Gestion Commerciale Algérie SARL
- **Pays** : Algérie
- **Devise** : DA (Dinar Algérien)
- **Fuseau horaire** : Africa/Algiers

### 👥 Utilisateurs
- 1 Administrateur
- 2 Managers
- 2 Employés
- Tous avec des noms algériens authentiques

### 🏭 Fournisseurs Algériens
- Sonatrach Distribution
- Naftal Services
- Cevital Agro
- Condor Electronics
- Et 4 autres fournisseurs

### 📦 Produits Algériens
- Couscous Ferrero, Huile Elio
- Thé Palais des Thés, Café Malongo
- Lait Soummam, Yaourt Danone
- Smartphone Condor, Tablette ENIE
- Et 12 autres produits

### 🌍 Villes Algériennes
- Alger, Oran, Constantine
- Annaba, Blida, Batna
- Sétif, Tlemcen, Béjaïa
- Et 11 autres villes

## 🛠️ Résolution des Problèmes

### Problème : Tables manquantes
```bash
fix-prisma-schema.bat
```

### Problème : PostgreSQL non démarré
```bash
docker-compose -f docker-compose.prod.yml --env-file .env up -d postgres
```

### Problème : Client Prisma non généré
```bash
cd packages/database
npx prisma generate
cd ../..
```

### Problème : Données non créées
```bash
# Vérifier les logs d'erreur
cd packages/database
npm run db:seed-algerian
```

## 📋 Prérequis

- ✅ **Docker** installé et démarré
- ✅ **Node.js** (v18+) et npm
- ✅ **PostgreSQL** en cours d'exécution
- ✅ **Variables d'environnement** configurées (.env)

## 🎯 Résultats Attendus

Après un seeding réussi :

- ✅ **95+ enregistrements** dans la base de données
- ✅ **Dashboard** avec des données réelles
- ✅ **Listes déroulantes** peuplées
- ✅ **Statistiques** affichées correctement
- ✅ **Authentification** fonctionnelle
- ✅ **Données algériennes** authentiques

## 🔄 Réexécution

Pour réexécuter le seeding (supprime les données existantes) :

```bash
setup-database-algerian.bat
```

Le script supprime automatiquement les anciennes données avant de créer les nouvelles.

## 📞 Support

En cas de problème :

1. Vérifiez que PostgreSQL est démarré
2. Vérifiez les variables d'environnement (.env)
3. Exécutez `fix-prisma-schema.bat` si problème de schéma
4. Consultez les logs d'erreur dans le terminal

---

**🇩🇿 Bon usage de votre application de gestion commerciale algérienne !**
