# 🔄 Guide de Synchronisation de la Base de Données - Module Stock

## 🎯 Objectif
Synchroniser la base de données PostgreSQL avec le nouveau modèle Stock pour que le module fonctionne correctement.

## ⚡ Solution Rapide (Recommandée)

### Étape 1: Aller dans le dossier database
```bash
cd "d:\Gestion Commerciale\packages\database"
```

### Étape 2: Exécuter le script de synchronisation
```bash
# Double-cliquer sur le fichier ou exécuter:
sync-stock.bat
```

### Étape 3: Tester le schéma
```bash
node test-stock-schema.js
```

### Étape 4: Redémarrer le serveur backend
```bash
cd "d:\Gestion Commerciale\apps\backend"
npm run dev
```

## 🔧 Solution Manuelle (Si le script ne fonctionne pas)

### 1. Générer le client Prisma
```bash
cd "d:\Gestion Commerciale\packages\database"
npx prisma generate
```

### 2. Créer et appliquer la migration
```bash
npx prisma migrate dev --name add_stock_model_complete
```

### 3. Vérifier le statut
```bash
npx prisma migrate status
```

## ✅ Vérifications

### Test 1: Schéma de base
```bash
cd "d:\Gestion Commerciale\packages\database"
node test-stock-schema.js
```

**Résultat attendu:**
```
✅ Table stocks accessible - 0 enregistrements
✅ Table stock_movements accessible - 0 enregistrements
✅ Relation Product -> Stock fonctionne
✅ Types StockMovementType disponibles
```

### Test 2: API Backend
```bash
cd "d:\Gestion Commerciale\apps\backend"
node check-stock-table.js
```

**Résultat attendu:**
```
✅ Table stocks existe et accessible
📊 Nombre de stocks: 0
📋 Aucun stock trouvé (table vide)
```

### Test 3: Frontend
1. Ouvrir http://localhost:3000/test-stock
2. Cliquer sur "Tester API (sans auth)"
3. Résultat attendu: "✅ API accessible (authentification requise - normal)"

## 🚨 Résolution des Problèmes

### Problème: "Table 'stocks' doesn't exist"
**Solution:**
```bash
cd "d:\Gestion Commerciale\packages\database"
npx prisma migrate deploy
npx prisma generate
```

### Problème: "Type 'Stock' is not defined"
**Solution:**
```bash
# Redémarrer le serveur backend après la migration
cd "d:\Gestion Commerciale\apps\backend"
# Ctrl+C pour arrêter
npm run dev
```

### Problème: Migration bloquée
**Solution:**
```bash
cd "d:\Gestion Commerciale\packages\database"
npx prisma migrate reset --force
npx prisma migrate dev
```

### Problème: Client Prisma obsolète
**Solution:**
```bash
cd "d:\Gestion Commerciale\packages\database"
npx prisma generate --force
```

## 📋 Checklist de Validation

Avant de tester le module Stock, vérifiez que:

- [ ] ✅ Script `sync-stock.bat` exécuté sans erreur
- [ ] ✅ Test `test-stock-schema.js` passe tous les tests
- [ ] ✅ Serveur backend redémarré
- [ ] ✅ Page `/test-stock` accessible
- [ ] ✅ API répond correctement (même avec auth requise)
- [ ] ✅ Page `/stocks` se charge sans erreur
- [ ] ✅ Aucune erreur dans la console du navigateur

## 🎉 Résultat Final

Une fois la synchronisation terminée:

1. **Backend**: Types Stock et StockMovement disponibles
2. **Base de données**: Tables `stocks` et `stock_movements` créées
3. **Relations**: Product ↔ Stock ↔ Company fonctionnelles
4. **Frontend**: Pages de stock accessibles
5. **API**: Endpoints `/api/v1/stock/*` opérationnels

## 📞 Support

Si vous rencontrez des problèmes:

1. **Vérifiez** que PostgreSQL fonctionne
2. **Consultez** les logs du serveur backend
3. **Testez** la connexion DB avec `test-stock-schema.js`
4. **Redémarrez** tous les serveurs
5. **Vérifiez** les variables d'environnement DATABASE_URL

---

**La synchronisation est essentielle pour que le module Stock fonctionne ! 🚀**
