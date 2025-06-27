# 🎯 Démonstration des fonctionnalités Import/Export

## 🚀 Démarrage rapide

### 1. Démarrer l'application
```bash
# Backend
cd apps/backend
npm run dev

# Frontend
cd apps/frontend
npm run dev
```

### 2. Accéder à l'application
- Frontend : http://localhost:3000
- Backend API : http://localhost:3001

## 📋 Démonstration étape par étape

### 🔄 Import de clients

#### Étape 1 : Télécharger le template
1. Aller sur **Clients** dans le menu
2. Cliquer sur **"Template"** dans la barre d'actions
3. Un fichier `template_clients.xlsx` est téléchargé

#### Étape 2 : Remplir le template
Ouvrir le fichier Excel et remplir avec des données d'exemple :

| Type | Nom | Prénom | Nom Entreprise | Email | Téléphone | Ville |
|------|-----|--------|----------------|-------|-----------|-------|
| INDIVIDUAL | Dupont | Jean | | jean.dupont@email.com | 0123456789 | Paris |
| COMPANY | | | Tech Solutions SARL | contact@techsolutions.com | 0987654321 | Lyon |
| INDIVIDUAL | Martin | Sophie | | sophie.martin@email.com | 0555666777 | Marseille |

#### Étape 3 : Importer les données
1. Cliquer sur **"Import"** dans la barre d'actions
2. Sélectionner le fichier Excel rempli
3. Attendre la validation automatique
4. Consulter le message de succès avec le résumé

**Résultat attendu :**
```
✅ Import réussi: 3 clients importés, 0 mis à jour
```

### 🔄 Import de produits

#### Étape 1 : Télécharger le template
1. Aller sur **Produits** dans le menu
2. Cliquer sur **"Template"** dans la barre d'actions
3. Un fichier `template_produits.xlsx` est téléchargé

#### Étape 2 : Remplir le template
| Nom | SKU | Prix | Stock | Catégorie | TVA | Statut |
|-----|-----|------|-------|-----------|-----|--------|
| Ordinateur Portable | LAPTOP001 | 899.99 | 25 | Informatique | 19 | ACTIVE |
| Souris Sans Fil | MOUSE001 | 29.99 | 100 | Accessoires | 19 | ACTIVE |
| Clavier Mécanique | KEYB001 | 79.99 | 50 | Accessoires | 19 | ACTIVE |

#### Étape 3 : Importer les données
1. Cliquer sur **"Import"** sur la page Produits
2. Sélectionner le fichier Excel rempli
3. Consulter le résumé d'importation

### 📊 Export Excel

#### Export des clients
1. Aller sur **Clients**
2. Cliquer sur **"Excel"** dans la barre d'actions
3. Le fichier `clients_[timestamp].xlsx` est téléchargé
4. Ouvrir le fichier pour voir les données formatées

#### Export des produits
1. Aller sur **Produits**
2. Cliquer sur **"Excel"** dans la barre d'actions
3. Le fichier `produits_[timestamp].xlsx` est téléchargé

### 📄 Export PDF

#### Export PDF des clients
1. Aller sur **Clients**
2. Cliquer sur **"PDF"** dans la barre d'actions
3. Le fichier `clients_[timestamp].pdf` est téléchargé
4. Ouvrir le PDF pour voir la mise en page professionnelle

#### Export PDF des produits
1. Aller sur **Produits**
2. Cliquer sur **"PDF"** dans la barre d'actions
3. Le fichier `produits_[timestamp].pdf` est téléchargé

### 📈 Rapports de ventes

#### Rapport PDF
1. Aller sur **Rapports > Rapport des ventes**
2. Sélectionner une période (ex: 12m)
3. Cliquer sur **"Export PDF"**
4. Le rapport PDF détaillé est généré et téléchargé

#### Rapport Excel
1. Sur la même page, cliquer sur **"Export Excel"**
2. Un fichier Excel multi-feuilles est généré :
   - Feuille "Résumé" : Métriques principales
   - Feuille "Commandes" : Détail des commandes
   - Feuille "Factures" : Détail des factures

### 🌐 Export global

#### Export de toutes les données
1. Aller sur **Rapports**
2. Cliquer sur **"Export global"** dans la barre d'actions
3. Tous les fichiers Excel sont téléchargés simultanément :
   - `clients_[timestamp].xlsx`
   - `produits_[timestamp].xlsx`
   - `commandes_[timestamp].xlsx`
   - `factures_[timestamp].xlsx`

## 🧪 Test des validations

### Test d'erreurs d'import

#### Créer un fichier avec des erreurs
Créer un fichier Excel avec des données invalides :

| Type | Nom | Email | Prix |
|------|-----|-------|------|
| INDIVIDUAL | Dupont | email-invalide | |
| COMPANY | | | prix-invalide |

#### Résultat attendu
```
❌ Erreurs de validation détectées:
- Ligne 2: Format d'email invalide: email-invalide
- Ligne 3: Nom d'entreprise obligatoire pour les entreprises
```

### Test de fichier trop volumineux
1. Créer un fichier > 10MB
2. Essayer de l'importer
3. Message d'erreur : "Le fichier est trop volumineux. Taille maximum: 10MB"

### Test de format non supporté
1. Essayer d'importer un fichier .txt ou .doc
2. Message d'erreur : "Format de fichier non supporté. Utilisez Excel (.xlsx, .xls) ou CSV (.csv)"

## 🎨 Interface utilisateur

### Boutons d'import/export
- **Design cohérent** sur toutes les pages
- **Icônes intuitives** (Upload, Download, FileText)
- **États de chargement** avec spinners animés
- **Messages de feedback** clairs et informatifs

### Messages d'état
- **Succès** : Fond vert avec icône de validation
- **Erreur** : Fond rouge avec icône d'alerte
- **Info** : Fond bleu avec icône d'information
- **Bouton de fermeture** pour masquer les messages

## 🔧 Dépannage

### Problèmes courants

#### Import ne fonctionne pas
1. Vérifier que le backend est démarré
2. Vérifier la console du navigateur pour les erreurs
3. Vérifier que le fichier respecte le format attendu

#### Export ne se télécharge pas
1. Vérifier les paramètres de téléchargement du navigateur
2. Vérifier l'espace disque disponible
3. Essayer avec un navigateur différent

#### Erreur "Authentification requise"
1. Se reconnecter à l'application
2. Vérifier que le token JWT n'a pas expiré

## 📱 Compatibilité

### Navigateurs supportés
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Formats de fichiers
- ✅ Excel (.xlsx, .xls)
- ✅ CSV (.csv)
- ✅ PDF (export uniquement)

### Tailles de fichiers
- **Import** : Maximum 10MB
- **Export** : Pas de limite (généré côté serveur)

## 🎯 Cas d'usage réels

### Migration de données
1. Exporter les données depuis l'ancien système
2. Adapter le format au template fourni
3. Importer en plusieurs fois si nécessaire
4. Vérifier les données importées

### Sauvegarde régulière
1. Utiliser l'export global mensuel
2. Stocker les fichiers dans un lieu sûr
3. Tester la restauration périodiquement

### Rapports pour la direction
1. Générer le rapport de ventes trimestriel
2. Exporter en PDF pour présentation
3. Exporter en Excel pour analyse détaillée

### Partage avec comptable
1. Exporter les factures du mois
2. Envoyer le fichier Excel au comptable
3. Utiliser les filtres avant export si nécessaire

## 🚀 Prochaines démonstrations

### Fonctionnalités avancées (à venir)
- Import/export des commandes
- Planification automatique des exports
- API REST pour intégrations
- Formats d'export personnalisés

### Intégrations possibles
- Synchronisation avec logiciels comptables
- Import depuis plateformes e-commerce
- Export vers outils de marketing
- Connexion avec systèmes ERP

---

**🎉 Félicitations ! Vous maîtrisez maintenant toutes les fonctionnalités d'import/export de l'application.**
