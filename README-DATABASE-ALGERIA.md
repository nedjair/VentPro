# 🇩🇿 Base de Données avec Données Algériennes

Ce document explique comment réinitialiser et peupler la base de données PostgreSQL avec des données de test spécifiques au contexte commercial algérien.

## 📋 Vue d'ensemble

La base de données a été configurée pour contenir des données réalistes adaptées au marché algérien, incluant :

- **Entreprises algériennes** avec adresses locales et identifiants conformes
- **Utilisateurs** avec noms algériens typiques
- **Produits** avec prix en Dinar Algérien (DZD)
- **Clients** (entreprises et particuliers) dans différentes wilayas
- **Fournisseurs** algériens représentatifs du marché local
- **Données commerciales** (commandes, factures, interactions)

## 🚀 Réinitialisation Rapide

### Windows (PowerShell)
```powershell
.\reset-database-algeria.ps1
```

### Linux/macOS (Bash)
```bash
./reset-database-algeria.sh
```

### Options disponibles
- `--force` / `-Force` : Accepter automatiquement tous les changements
- `--skip-confirmation` / `-SkipConfirmation` : Ignorer la demande de confirmation

## 📊 Données Générées

### 🏢 Entreprise Principale
- **Nom** : SARL TechnoCommerce Algérie
- **Adresse** : 15 Boulevard Mohamed V, Hydra, Alger
- **Téléphone** : +213 21 69 12 34
- **Email** : contact@technocommerce.dz
- **Devise** : DZD (Dinar Algérien)
- **Fuseau horaire** : Africa/Algiers

### 👥 Utilisateurs de Test
| Rôle | Nom | Email | Mot de passe |
|------|-----|-------|--------------|
| Admin | Ahmed Benali | admin@technocommerce.dz | demo123 |
| Manager | Fatima Khelifi | manager@technocommerce.dz | demo123 |
| Employé | Youcef Boumediene | employee@technocommerce.dz | demo123 |

### 📂 Catégories de Produits
1. **Électronique et Informatique** - Ordinateurs, téléphones, équipements électroniques
2. **Électroménager** - Appareils électroménagers pour la maison
3. **Mobilier et Décoration** - Meubles, décoration et aménagement
4. **Services** - Services techniques et prestations
5. **Textile et Habillement** - Vêtements, tissus et accessoires

### 🏭 Fournisseurs Algériens
1. **EURL Condor Electronics** (Bordj Bou Arreridj) - Fabricant d'électronique
2. **SARL Iris Mobilier** (Sétif) - Spécialiste du mobilier
3. **EURL TechImport Oran** (Oran) - Importateur d'équipements électroniques

### 📦 Produits (Exemples)
- **Tablette Condor TGW-712** - 25,000 DZD
- **Smartphone Condor Griffe T9** - 45,000 DZD
- **Réfrigérateur Condor 350L** - 85,000 DZD
- **Climatiseur Split 12000 BTU** - 75,000 DZD
- **Bureau Direction Iris** - 120,000 DZD
- **Chaise de Bureau Ergonomique** - 35,000 DZD
- **Costume Homme Classique** - 18,000 DZD
- **Services** (Installation, Maintenance)

### 👥 Clients
#### Entreprises
1. **SARL Batiment Plus** (Alger) - Construction et BTP
2. **EURL Médical Center** (Sétif) - Clinique privée
3. **SPA Hôtel El Djazair** (Oran) - Hôtellerie

#### Particuliers
1. **Amina Benaissa** (Alger) - Cliente particulière
2. **Mohamed Khelifi** (Constantine) - Professionnel libéral
3. **Fatima Zohra Meziane** (Tizi Ouzou) - Enseignante

## 🛠️ Processus Manuel

Si vous préférez exécuter les étapes manuellement :

### 1. Génération du Client Prisma
```bash
cd packages/database
npm run db:generate
```

### 2. Synchronisation du Schéma
```bash
npm run db:push
```

### 3. Insertion des Données
```bash
npm run db:seed
```

## 📍 Caractéristiques Locales

### 🌍 Géographie
- **Villes représentées** : Alger, Oran, Sétif, Constantine, Tizi Ouzou, Bordj Bou Arreridj
- **Codes postaux** : Codes postaux algériens réels
- **Adresses** : Adresses typiques algériennes

### 📞 Télécommunications
- **Format téléphone** : +213 XX XX XX XX
- **Préfixes mobiles** : 555, 661, 772 (opérateurs algériens)

### 💰 Monnaie et Prix
- **Devise** : DZD (Dinar Algérien)
- **TVA** : 19% (taux algérien)
- **Prix réalistes** : Adaptés au marché algérien

### 🏢 Identifiants d'Entreprise
- **Format SIRET** : Adapté au système algérien
- **Numéros TVA** : Format DZ + numéro d'identification

## 🔧 Maintenance

### Vérification de l'État de la Base
```bash
cd packages/database
npx prisma studio
```

### Sauvegarde des Données
```bash
pg_dump -h localhost -U gestion_user -d gestion_commerciale > backup_algeria.sql
```

### Restauration depuis une Sauvegarde
```bash
psql -h localhost -U gestion_user -d gestion_commerciale < backup_algeria.sql
```

## 📝 Notes Importantes

1. **Données de Test** : Toutes les données sont fictives et destinées uniquement aux tests
2. **Mots de Passe** : Tous les comptes utilisent le mot de passe `demo123`
3. **Réinitialisation** : L'opération supprime TOUTES les données existantes
4. **Sauvegarde** : Pensez à sauvegarder vos données importantes avant la réinitialisation

## 🆘 Dépannage

### Erreur de Connexion à la Base
Vérifiez que PostgreSQL est démarré et accessible :
```bash
docker ps | grep postgres
```

### Erreur de Génération Prisma
Supprimez le cache et régénérez :
```bash
rm -rf node_modules/.prisma
npm run db:generate
```

### Problème de Permissions
Vérifiez les variables d'environnement dans `.env` :
```
DATABASE_URL="postgresql://gestion_user:password@localhost:5432/gestion_commerciale"
```

## 📞 Support

Pour toute question ou problème, consultez la documentation du projet ou contactez l'équipe de développement.
