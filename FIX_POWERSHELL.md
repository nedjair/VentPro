# 🔧 Correction des Problèmes PowerShell

## 🚨 Problème Identifié

Le script PowerShell original `start-app.ps1` contient des erreurs de syntaxe et d'encodage qui empêchent son exécution correcte.

## ❌ Erreurs Observées

1. **Fonctions non reconnues** : `Test-Prerequisites`, `Test-Ports`, etc.
2. **Problèmes d'encodage** : Caractères spéciaux mal interprétés
3. **Syntaxe PowerShell** : Erreurs dans la définition des fonctions
4. **Gestion des chaînes** : Problèmes avec les caractères Unicode

## ✅ Solutions Implémentées

### 1. Script Basique Fonctionnel
**Fichier** : `start-basic.ps1`
- Syntaxe PowerShell simplifiée
- Pas de caractères spéciaux
- Gestion d'erreurs robuste
- Fonctions intégrées PowerShell uniquement

### 2. Corrections Appliquées

#### Avant (Problématique)
```powershell
function Test-Prerequisites {
    # Fonction non reconnue
}

Log-Info "🚀 Démarrage..."  # Caractères Unicode problématiques
```

#### Après (Fonctionnel)
```powershell
# Pas de fonctions personnalisées complexes
Write-Host "Demarrage..." -ForegroundColor Green  # Caractères ASCII
```

### 3. Gestion des Erreurs
```powershell
# Vérification robuste
$dockerCheck = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCheck) {
    Write-Host "ERREUR: Docker non trouve" -ForegroundColor Red
    exit 1
}
```

## 🛠️ Scripts Corrigés Disponibles

### Scripts Fonctionnels
1. **`start-basic.ps1`** - Démarrage simplifié et robuste
2. **`stop-basic.ps1`** - Arrêt propre des services
3. **Scripts Bash** - Alternative pour WSL/Linux

### Utilisation Recommandée
```powershell
# Option 1 : Exécution directe
.\start-basic.ps1

# Option 2 : Bypass de la politique d'exécution
powershell -ExecutionPolicy Bypass -File start-basic.ps1

# Option 3 : Modification de la politique
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\start-basic.ps1
```

## 🔍 Diagnostic des Problèmes

### Test de l'Environnement PowerShell
```powershell
# Vérifier la version PowerShell
$PSVersionTable.PSVersion

# Vérifier la politique d'exécution
Get-ExecutionPolicy

# Tester les commandes de base
Get-Command docker
Get-Command node
Get-Command pnpm
```

### Vérification des Prérequis
```powershell
# Test Docker
try {
    docker --version
    Write-Host "Docker OK" -ForegroundColor Green
} catch {
    Write-Host "Docker KO" -ForegroundColor Red
}

# Test Node.js
try {
    node --version
    Write-Host "Node.js OK" -ForegroundColor Green
} catch {
    Write-Host "Node.js KO" -ForegroundColor Red
}
```

## 🎯 Recommandations

### Pour les Utilisateurs Windows
1. **Utiliser `start-basic.ps1`** au lieu de `start-app.ps1`
2. **Exécuter en tant qu'administrateur** si possible
3. **Vérifier Docker Desktop** avant le démarrage
4. **Utiliser Windows Terminal** pour une meilleure expérience

### Pour les Développeurs
1. **Éviter les caractères Unicode** dans les scripts PowerShell
2. **Utiliser des fonctions PowerShell natives** uniquement
3. **Tester sur différentes versions** de PowerShell
4. **Fournir des alternatives** (Bash, batch)

## 📋 Checklist de Démarrage

### Avant d'exécuter le script
- [ ] Docker Desktop démarré et fonctionnel
- [ ] PowerShell ouvert en tant qu'administrateur
- [ ] Politique d'exécution configurée
- [ ] Prérequis installés (Node.js, pnpm)

### Pendant l'exécution
- [ ] Surveiller les messages d'erreur
- [ ] Vérifier que Docker Compose démarre
- [ ] Attendre que les services soient prêts
- [ ] Tester l'accès aux URLs

### Après le démarrage
- [ ] Vérifier http://localhost:3000
- [ ] Tester la connexion avec les comptes
- [ ] Consulter les logs si problème
- [ ] Utiliser `stop-basic.ps1` pour arrêter

## 🔄 Alternatives de Démarrage

### Si PowerShell pose problème
```bash
# Option 1 : WSL (Windows Subsystem for Linux)
wsl
./quick-start.sh

# Option 2 : Git Bash
./quick-start.sh

# Option 3 : Démarrage manuel
docker-compose up -d
# Puis démarrer manuellement backend et frontend
```

### Démarrage Manuel Complet
```cmd
REM 1. Docker
docker-compose up -d

REM 2. Backend (nouveau terminal)
cd apps\backend
pnpm dev

REM 3. Frontend (nouveau terminal)
cd apps\frontend
pnpm dev
```

## 📞 Support Technique

### En cas de problème persistant
1. **Utiliser `start-basic.ps1`** au lieu de `start-app.ps1`
2. **Consulter `DEMARRAGE_WINDOWS.md`** pour le guide complet
3. **Utiliser les scripts Bash** si WSL est disponible
4. **Démarrage manuel** en dernier recours

### Informations à fournir pour le support
```powershell
# Version PowerShell
$PSVersionTable

# Version Windows
Get-ComputerInfo | Select-Object WindowsProductName

# Versions des outils
docker --version
node --version
pnpm --version

# Politique d'exécution
Get-ExecutionPolicy -List
```

---

**✅ Le problème PowerShell est maintenant résolu !**

Utilisez `.\start-basic.ps1` pour démarrer l'application sans problème.
