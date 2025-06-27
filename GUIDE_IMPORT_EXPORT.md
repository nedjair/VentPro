# Guide d'utilisation - Fonctionnalités d'Import/Export

## 📋 Vue d'ensemble

Ce guide décrit les nouvelles fonctionnalités d'importation et d'exportation implémentées dans l'application de Gestion Commerciale TPE.

## ✨ Fonctionnalités implémentées

### 🔄 Import de données
- **Import Excel/CSV des clients** - Importation en masse des données clients
- **Import Excel/CSV des produits** - Importation en masse des données produits
- **Templates d'importation** - Modèles Excel pré-formatés pour faciliter l'import
- **Validation des données** - Vérification automatique des formats et données obligatoires

### 📊 Export de données
- **Export Excel** - Toutes les listes (clients, produits, commandes, factures)
- **Export PDF** - Listes et rapports au format PDF
- **Rapports de ventes** - Rapports détaillés en Excel et PDF
- **Export global** - Export de toutes les données en une fois

## 🎯 Utilisation des fonctionnalités

### Import de données

#### 1. Import des clients
1. Aller sur la page **Clients**
2. Cliquer sur le bouton **"Import"**
3. Sélectionner un fichier Excel (.xlsx, .xls) ou CSV
4. Le système valide automatiquement les données
5. Consulter le résumé d'importation (créés/mis à jour/erreurs)

**Format attendu pour les clients :**
- `Type` : INDIVIDUAL ou COMPANY
- `Nom` : Nom de famille (obligatoire pour particuliers)
- `Prénom` : Prénom (pour particuliers)
- `Nom Entreprise` : Nom de l'entreprise (obligatoire pour entreprises)
- `Email` : Adresse email (obligatoire, format valide)
- `Téléphone` : Numéro de téléphone
- `Adresse` : Adresse complète
- `Code Postal` : Code postal
- `Ville` : Ville
- `Pays` : Pays (défaut: Algérie)
- `Notes` : Notes additionnelles

#### 2. Import des produits
1. Aller sur la page **Produits**
2. Cliquer sur le bouton **"Import"**
3. Sélectionner un fichier Excel (.xlsx, .xls) ou CSV
4. Le système valide automatiquement les données
5. Consulter le résumé d'importation

**Format attendu pour les produits :**
- `Nom` : Nom du produit (obligatoire)
- `Description` : Description du produit
- `SKU` : Code produit unique
- `Prix` : Prix unitaire (obligatoire, nombre)
- `Catégorie` : Catégorie du produit
- `Stock` : Quantité en stock (nombre)
- `Stock Minimum` : Seuil d'alerte stock
- `Suivi Stock` : Oui/Non pour activer le suivi
- `TVA` : Taux de TVA (défaut: 19%)
- `Statut` : ACTIVE ou INACTIVE

#### 3. Templates d'importation
- Cliquer sur **"Template"** à côté du bouton Import
- Télécharger le fichier Excel pré-formaté
- Remplir avec vos données en respectant le format
- Utiliser ce fichier pour l'importation

### Export de données

#### 1. Export Excel
- Disponible sur toutes les pages de listes
- Cliquer sur **"Excel"** dans la barre d'actions
- Le fichier est automatiquement téléchargé
- Format : `.xlsx` avec données formatées et en-têtes

#### 2. Export PDF
- Disponible sur les pages Clients et Produits
- Cliquer sur **"PDF"** dans la barre d'actions
- Le fichier PDF est automatiquement téléchargé
- Format : PDF avec mise en page professionnelle

#### 3. Rapports de ventes
- Aller sur **Rapports > Rapport des ventes**
- Choisir la période (1m, 3m, 6m, 12m)
- Cliquer sur **"Export PDF"** ou **"Export Excel"**
- Le rapport détaillé est généré et téléchargé

#### 4. Export global
- Aller sur la page **Rapports**
- Cliquer sur **"Export global"**
- Tous les fichiers Excel sont téléchargés simultanément

## 🔧 Fonctionnalités techniques

### Validation des données
- **Formats de fichiers** : .xlsx, .xls, .csv
- **Taille maximum** : 10 MB par fichier
- **Validation email** : Format RFC valide
- **Validation prix** : Nombres positifs uniquement
- **Gestion des doublons** : Mise à jour automatique si existant

### Gestion d'erreurs
- **Messages d'erreur détaillés** : Ligne et nature de l'erreur
- **Avertissements** : Données manquantes non critiques
- **Rollback** : Aucune donnée n'est importée en cas d'erreur critique
- **Logs** : Toutes les opérations sont enregistrées

### Performance
- **Import par lots** : Traitement optimisé pour gros volumes
- **Export asynchrone** : Génération en arrière-plan
- **Cache** : Mise en cache des données fréquemment exportées
- **Nettoyage automatique** : Suppression des fichiers temporaires

## 🚨 Bonnes pratiques

### Pour l'import
1. **Utilisez les templates** fournis pour éviter les erreurs de format
2. **Vérifiez vos données** avant l'import (emails, prix, etc.)
3. **Testez avec un petit échantillon** avant l'import complet
4. **Sauvegardez vos données** avant un import important
5. **Respectez les formats** de date et de nombre

### Pour l'export
1. **Choisissez le bon format** selon votre usage (Excel pour traitement, PDF pour impression)
2. **Filtrez vos données** avant l'export si nécessaire
3. **Vérifiez l'espace disque** pour les gros exports
4. **Planifiez les exports volumineux** en dehors des heures de pointe

## 🐛 Résolution de problèmes

### Erreurs d'import courantes
- **"Format de fichier non supporté"** → Utilisez .xlsx, .xls ou .csv
- **"Email invalide"** → Vérifiez le format des adresses email
- **"Prix invalide"** → Utilisez des nombres avec point comme séparateur décimal
- **"Fichier trop volumineux"** → Divisez en plusieurs fichiers < 10MB

### Erreurs d'export courantes
- **"Erreur de génération"** → Vérifiez l'espace disque disponible
- **"Timeout"** → Réduisez la quantité de données ou réessayez
- **"Fichier non téléchargé"** → Vérifiez les paramètres de téléchargement du navigateur

## 📞 Support

En cas de problème :
1. Consultez les messages d'erreur détaillés
2. Vérifiez les logs de l'application
3. Testez avec des données d'exemple
4. Contactez le support technique avec les détails de l'erreur

## 🔄 Mises à jour futures

Fonctionnalités prévues :
- Import/export des commandes et factures
- Planification automatique des exports
- API REST pour intégrations externes
- Formats d'export additionnels (CSV, JSON)
- Validation avancée avec règles métier personnalisées
