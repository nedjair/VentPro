# Correction du lien PDF (colonne Actions) - Factures

## Symptôme

Sur la page Factures, le clic sur **PDF** dans la colonne Actions pouvait afficher:

- `Le fichier généré est vide`

## Cause racine

Le flux de téléchargement de PDF unitaire combinait deux fragilités:

- **Frontend**: un blob de taille `0` était considéré comme erreur terminale sans tentative de récupération.
- **Backend**: l’endpoint PDF unitaire passait par écriture temporaire sur disque avant envoi, ce qui augmentait les risques (chemin/fichier temporaire/IO).

## Correctifs appliqués

### Frontend

- Validation stricte de l’identifiant facture avant appel.
- Téléchargement PDF avec:
  - en-tête `Accept: application/pdf`
  - contrôle d’erreur backend enrichi (message API)
  - **retry automatique** avec query anti-cache si la première réponse est vide
  - message utilisateur clair si le PDF reste vide après retry
- Suppression des en-têtes non indispensables (`Pragma`, `Cache-Control`) sur l’appel PDF unitaire pour éviter les échecs CORS/preflight pouvant provoquer `Failed to fetch`
- Message de fallback utilisateur:
  - réessayer
  - ouvrir la facture via **Voir** si le PDF n’est pas chargeable immédiatement
  - message explicite réseau/CORS lorsque le navigateur retourne `Failed to fetch`

### Backend

- Endpoint `GET /api/v1/invoices/:id/pdf` renforcé:
  - validation de `id`
  - génération PDF **en mémoire** (buffer) au lieu d’un fichier temporaire
  - vérification `buffer.length > 0`
  - `Content-Length` explicite
  - nom de fichier assaini pour éviter des caractères invalides
  - logs d’erreur détaillés (message + stack + invoiceId)
- Génération PDF facture renforcée pour les caractères spéciaux:
  - normalisation des chaînes en NFC
  - réparation automatique des chaînes mojibake fréquentes (`Ã`, `Â`) quand une variante UTF-8 correcte est détectée
  - sélection de police Unicode avec fallback robuste (chemins configurables via `PDF_FONT_REGULAR_PATH` / `PDF_FONT_BOLD_PATH`, fallback OS et fallback final Helvetica)

## Résultat attendu

- Le lien **PDF** de la colonne Actions déclenche un téléchargement fiable.
- Les erreurs sont explicites côté UI et côté logs.
- Le comportement est stable en développement et production.
- Le rendu des caractères spéciaux (accents FR, caractères EN, caractères ES, symboles monétaires) reste lisible.

## Compatibilité navigateurs

Le flux s’appuie sur des APIs standards (`fetch`, `Blob`, `URL.createObjectURL`, attribut `download`) compatibles navigateurs modernes:

- Chrome
- Firefox
- Edge
- Safari

Les tests automatisés exécutés dans cet environnement valident la logique de téléchargement et de fallback côté application.  
La validation finale multi-navigateurs natifs doit être réalisée via QA manuelle sur les navigateurs cibles de déploiement.

## Vérifications réalisées

- Tests unitaires/service export: retry sur PDF vide + propagation des messages backend.
- Test backend d’encodage PDF: génération d’une facture multi-langue (français, anglais, espagnol) avec caractères latins étendus et symbole monétaire.
- Tests d’intégration page Factures:
  - action **Voir** fonctionnelle
  - action **PDF** fonctionnelle
  - affichage d’erreur clair si PDF vide
