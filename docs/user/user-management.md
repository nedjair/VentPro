# Guide Utilisateur - Gestion des Utilisateurs

## Vue d'ensemble

Le module de gestion des utilisateurs vous permet de créer, modifier, et gérer tous les utilisateurs de votre entreprise. Les fonctionnalités disponibles dépendent de votre rôle dans l'organisation.

## Accès au module

Pour accéder à la gestion des utilisateurs :
1. Connectez-vous à l'application
2. Cliquez sur "Gestion des Utilisateurs" dans le menu principal
3. La page affiche la liste de tous les utilisateurs (selon vos permissions)

## Rôles et Permissions

### Administrateur (ADMIN)
- Accès complet à toutes les fonctionnalités
- Peut créer, modifier et supprimer tous les utilisateurs
- Peut changer les rôles des utilisateurs
- Peut voir les statistiques globales

### Manager (MANAGER)
- Peut gérer les employés de son entreprise
- Peut créer et modifier des comptes employés
- Peut activer/désactiver des comptes employés
- Ne peut pas créer d'autres administrateurs ou managers

### Employé (EMPLOYEE)
- Peut uniquement consulter et modifier ses propres informations
- Peut changer son mot de passe
- Accès en lecture seule aux autres fonctionnalités

## Interface Utilisateur

### Tableau de bord

Le tableau de bord affiche :
- **Statistiques** : Nombre total d'utilisateurs, répartition par rôle
- **Indicateurs visuels** : Compteurs colorés pour un aperçu rapide
- **Barre de recherche** : Recherche par nom, prénom ou email
- **Filtres** : Filtrage par rôle et statut

### Liste des utilisateurs

La liste affiche pour chaque utilisateur :
- **Photo de profil** : Initiales du nom et prénom
- **Informations personnelles** : Nom, prénom, email
- **Rôle** : Badge coloré indiquant le rôle
- **Statut** : Actif (vert) ou Inactif (rouge)
- **Entreprise** : Nom de l'entreprise
- **Dates** : Date de création et dernière connexion
- **Actions** : Boutons pour modifier, changer le mot de passe, activer/désactiver, supprimer

## Fonctionnalités

### 1. Créer un utilisateur

**Qui peut le faire :** Administrateurs et Managers

**Étapes :**
1. Cliquez sur le bouton "Nouvel Utilisateur"
2. Remplissez le formulaire :
   - **Prénom** : 2-50 caractères
   - **Nom** : 2-50 caractères
   - **Email** : Adresse email valide et unique
   - **Mot de passe** : Minimum 8 caractères avec majuscule, minuscule et chiffre
   - **Confirmer le mot de passe** : Doit correspondre au mot de passe
   - **Rôle** : Sélectionnez le rôle approprié
3. Cliquez sur "Créer"

**Validation :**
- Tous les champs sont obligatoires
- L'email doit être unique dans le système
- Le mot de passe doit respecter les critères de sécurité

### 2. Modifier un utilisateur

**Qui peut le faire :** Administrateurs, Managers (pour leurs employés), utilisateur lui-même

**Étapes :**
1. Cliquez sur l'icône "Modifier" (crayon) dans la ligne de l'utilisateur
2. Modifiez les informations dans le formulaire
3. Cliquez sur "Enregistrer"

**Limitations :**
- Les employés ne peuvent modifier que leurs informations personnelles
- Les managers ne peuvent pas modifier les rôles des autres managers ou administrateurs

### 3. Changer un mot de passe

**Qui peut le faire :** Administrateurs (pour tous), utilisateur lui-même

**Étapes :**
1. Cliquez sur l'icône "Clé" dans la ligne de l'utilisateur
2. Remplissez le formulaire :
   - **Mot de passe actuel** : Requis si vous changez votre propre mot de passe
   - **Nouveau mot de passe** : Respecter les critères de sécurité
   - **Confirmer le nouveau mot de passe** : Doit correspondre
3. Cliquez sur "Changer le mot de passe"

### 4. Activer/Désactiver un utilisateur

**Qui peut le faire :** Administrateurs et Managers

**Étapes :**
1. Cliquez sur l'icône de basculement dans la ligne de l'utilisateur
2. Confirmez l'action dans la boîte de dialogue

**Effet :**
- **Désactivation** : L'utilisateur ne peut plus se connecter
- **Activation** : L'utilisateur peut à nouveau se connecter

### 5. Supprimer un utilisateur

**Qui peut le faire :** Administrateurs uniquement

**Étapes :**
1. Cliquez sur l'icône "Corbeille" dans la ligne de l'utilisateur
2. Tapez "SUPPRIMER" dans le champ de confirmation
3. Cliquez sur "Supprimer définitivement"

**⚠️ Attention :** Cette action est irréversible et supprime définitivement toutes les données de l'utilisateur.

## Recherche et Filtres

### Barre de recherche
- Recherche en temps réel dans les noms, prénoms et emails
- Insensible à la casse
- Résultats mis à jour automatiquement

### Filtres disponibles
- **Rôle** : Administrateur, Manager, Employé
- **Statut** : Actif, Inactif
- **Entreprise** : Filtrer par entreprise (pour les administrateurs)

### Pagination
- Navigation par pages avec boutons Précédent/Suivant
- Affichage du nombre total d'utilisateurs
- Sélection du nombre d'éléments par page

## Notifications

Le système affiche des notifications pour :
- ✅ **Succès** : Création, modification, suppression réussie
- ❌ **Erreurs** : Problèmes de validation, erreurs serveur
- ⚠️ **Avertissements** : Actions nécessitant une confirmation

## Bonnes Pratiques

### Sécurité des mots de passe
- Utilisez des mots de passe forts (8+ caractères)
- Incluez majuscules, minuscules, chiffres et caractères spéciaux
- Changez régulièrement les mots de passe
- Ne partagez jamais vos identifiants

### Gestion des rôles
- Accordez le minimum de privilèges nécessaires
- Révisez régulièrement les permissions des utilisateurs
- Désactivez immédiatement les comptes des employés qui quittent l'entreprise

### Maintenance
- Supprimez les comptes inutilisés
- Vérifiez régulièrement les dernières connexions
- Maintenez les informations de contact à jour

## Dépannage

### Problèmes courants

**"Email déjà utilisé"**
- Vérifiez qu'aucun autre utilisateur n'utilise cet email
- Contactez l'administrateur si nécessaire

**"Mot de passe trop faible"**
- Assurez-vous que le mot de passe contient au moins 8 caractères
- Incluez au moins une majuscule, une minuscule et un chiffre

**"Accès refusé"**
- Vérifiez que vous avez les permissions nécessaires
- Contactez votre administrateur si vous pensez qu'il y a une erreur

**Problèmes de connexion**
- Vérifiez que votre compte est actif
- Assurez-vous d'utiliser le bon email et mot de passe
- Contactez l'administrateur si le problème persiste

## Support

Pour obtenir de l'aide :
1. Consultez cette documentation
2. Contactez votre administrateur système
3. Ouvrez un ticket de support si disponible

---

*Cette documentation est mise à jour régulièrement. Dernière mise à jour : Janvier 2024*
