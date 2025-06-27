# 🇩🇿 Application Démarrée avec Données Algériennes

## ✅ État Actuel

L'application de **Gestion Commerciale** est maintenant **opérationnelle** avec les données algériennes !

### 🌐 URLs d'Accès

| Service | URL | État |
|---------|-----|------|
| **Frontend (Interface utilisateur)** | http://localhost:3000 | ✅ **ACTIF** |
| **Backend (API)** | http://localhost:3001 | ✅ **ACTIF** |
| **Documentation API** | http://localhost:3001/docs | ✅ **ACTIF** |
| **Health Check** | http://localhost:3001/health | ✅ **ACTIF** |
| **Base de données (Adminer)** | http://localhost:8080 | ✅ **ACTIF** |
| **Cache Redis** | http://localhost:8081 | ✅ **ACTIF** |

### 🔐 Comptes de Test Algériens

Tous les comptes utilisent le mot de passe : **demo123**

| Rôle | Email | Nom | Accès |
|------|-------|-----|-------|
| **👑 Administrateur** | admin@technocommerce.dz | Ahmed Benali | Accès complet |
| **👨‍💼 Manager** | manager@technocommerce.dz | Fatima Khelifi | Gestion commerciale |
| **👨‍💻 Employé** | employee@technocommerce.dz | Youcef Boumediene | Consultation/Saisie |

### 🏢 Entreprise Configurée

- **Nom** : SARL TechnoCommerce Algérie
- **Adresse** : 15 Boulevard Mohamed V, Hydra, Alger (16035)
- **Téléphone** : +213 21 69 12 34
- **Email** : contact@technocommerce.dz
- **Devise** : **DZD** (Dinar Algérien)
- **TVA** : 19% (taux algérien)
- **Fuseau horaire** : Africa/Algiers

## 📊 Données Disponibles

### 👥 Clients (6)
#### Entreprises (3)
1. **SARL Batiment Plus** (Alger) - Construction et BTP
2. **EURL Médical Center** (Sétif) - Clinique privée  
3. **SPA Hôtel El Djazair** (Oran) - Hôtellerie 4 étoiles

#### Particuliers (3)
1. **Amina Benaissa** (Alger) - Cliente particulière
2. **Mohamed Khelifi** (Constantine) - Professionnel libéral
3. **Fatima Zohra Meziane** (Tizi Ouzou) - Enseignante

### 🏭 Fournisseurs (3)
1. **EURL Condor Electronics** (Bordj Bou Arreridj) - Fabricant d'électronique
2. **SARL Iris Mobilier** (Sétif) - Spécialiste du mobilier
3. **EURL TechImport Oran** (Oran) - Importateur d'équipements

### 📦 Produits (10) - Prix en DZD
| Produit | Prix (DZD) | Catégorie | Stock |
|---------|------------|-----------|-------|
| Tablette Condor TGW-712 | 25,000 | Électronique | 20 |
| Smartphone Condor Griffe T9 | 45,000 | Électronique | 15 |
| Réfrigérateur Condor 350L | 85,000 | Électroménager | 8 |
| Climatiseur Split 12000 BTU | 75,000 | Électroménager | 12 |
| Bureau Direction Iris | 120,000 | Mobilier | 5 |
| Chaise de Bureau Ergonomique | 35,000 | Mobilier | 25 |
| Costume Homme Classique | 18,000 | Textile | 30 |
| Installation Climatisation | 8,000 | Services | - |
| Maintenance Informatique | 3,500/h | Services | - |

### 📋 Données Commerciales
- **2 Commandes/Devis** avec articles détaillés
- **2 Factures** (1 payée : 53,550 DZD, 1 en attente : 13,685 DZD)
- **3 Interactions clients** (appels, emails, rendez-vous)
- **Mouvements de stock** pour tous les produits physiques

## 🚀 Comment Utiliser l'Application

### 1. Connexion
1. Ouvrir http://localhost:3000 dans votre navigateur
2. Utiliser un des comptes algériens (ex: admin@technocommerce.dz / demo123)
3. Accéder au tableau de bord

### 2. Fonctionnalités Disponibles
- **📊 Tableau de bord** : Vue d'ensemble des activités
- **👥 Gestion des clients** : Entreprises et particuliers algériens
- **📦 Gestion des produits** : Catalogue avec prix en DZD
- **🏭 Gestion des fournisseurs** : Partenaires algériens
- **📋 Commandes et devis** : Gestion commerciale
- **🧾 Facturation** : Factures en DZD avec TVA algérienne
- **📈 Rapports** : Analyses et statistiques

### 3. Test des Fonctionnalités
- Créer une nouvelle commande pour un client algérien
- Ajouter des produits avec prix en DZD
- Générer une facture avec TVA à 19%
- Consulter les rapports de ventes

## 🛠️ Gestion de l'Application

### Arrêter l'Application
```powershell
# Arrêter tous les processus Node.js
Get-Process -Name node | Stop-Process -Force

# Arrêter les services Docker (optionnel)
docker-compose down
```

### Redémarrer l'Application
```powershell
# Utiliser le script de démarrage
.\start-app-algeria.ps1 -Quick

# Ou manuellement
cd apps/backend && pnpm run dev
cd apps/frontend && pnpm run dev
```

### Réinitialiser les Données
```powershell
# Réinitialiser avec les données algériennes
.\reset-db-simple.ps1 -SkipConfirmation
```

### Consulter les Logs
```powershell
# Logs du backend
Get-Content logs/backend.log -Wait

# Logs du frontend  
Get-Content logs/frontend.log -Wait
```

## 🌍 Spécificités Algériennes

### 📍 Géographie
- **Wilayas représentées** : Alger, Oran, Sétif, Constantine, Tizi Ouzou, Bordj Bou Arreridj
- **Codes postaux** : Codes postaux algériens réels
- **Adresses** : Boulevards, cités, zones typiquement algériennes

### 📞 Télécommunications
- **Format téléphone** : +213 XX XX XX XX
- **Préfixes mobiles** : 555, 661, 772 (opérateurs algériens)

### 💰 Aspects Financiers
- **Devise** : DZD (Dinar Algérien)
- **TVA** : 19% (taux algérien)
- **Prix** : Adaptés au marché algérien (25,000 à 120,000 DZD)

### 🏢 Identifiants d'Entreprise
- **Format SIRET** : Adapté au système algérien
- **Numéros TVA** : Format DZ + numéro d'identification

## 📝 Notes Importantes

1. **Données de Test** : Toutes les données sont fictives et destinées aux tests
2. **Persistance** : Les données sont stockées en base PostgreSQL
3. **Sécurité** : Mots de passe hashés avec bcrypt
4. **CORS** : Configuré pour frontend (port 3000) et backend (port 3001)
5. **Authentification** : JWT avec tokens d'accès et de rafraîchissement

## 🎯 Prochaines Étapes Suggérées

1. **Tester toutes les fonctionnalités** avec les données algériennes
2. **Personnaliser l'interface** si nécessaire (logos, couleurs)
3. **Ajouter plus de données** selon les besoins spécifiques
4. **Configurer la production** avec HTTPS et domaine
5. **Mettre en place la sauvegarde** automatique

---

**🎉 L'application est maintenant prête à être utilisée avec un contexte commercial algérien authentique !**

**🌐 Accès direct : http://localhost:3000**
**🔐 Connexion : admin@technocommerce.dz / demo123**
