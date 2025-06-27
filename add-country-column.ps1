Write-Host "🔧 AJOUT DE LA COLONNE COUNTRY À LA TABLE COMPANIES" -ForegroundColor Yellow
Write-Host ""

# Configuration de la base de données
$env:PGPASSWORD = "gestion_password_secure_2024"
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "gestion_commerciale"
$dbUser = "gestion_user"

try {
    Write-Host "📡 Connexion à PostgreSQL..." -ForegroundColor Cyan
    
    # Vérifier si la colonne existe déjà
    $checkQuery = @"
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name = 'country';
"@
    
    $result = psql -h $dbHost -p $dbPort -d $dbName -U $dbUser -t -c $checkQuery 2>$null
    
    if ($result -and $result.Trim() -eq "country") {
        Write-Host "✅ La colonne 'country' existe déjà dans la table 'companies'" -ForegroundColor Green
    } else {
        Write-Host "🔄 Ajout de la colonne 'country'..." -ForegroundColor Cyan
        
        # Ajouter la colonne country
        $addColumnQuery = @"
ALTER TABLE companies 
ADD COLUMN country VARCHAR(255) NOT NULL DEFAULT 'France';
"@
        
        psql -h $dbHost -p $dbPort -d $dbName -U $dbUser -c $addColumnQuery
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Colonne 'country' ajoutée avec succès !" -ForegroundColor Green
        } else {
            throw "Erreur lors de l'ajout de la colonne"
        }
    }
    
    # Vérifier le résultat
    Write-Host ""
    Write-Host "🔍 Vérification de la structure de la table..." -ForegroundColor Cyan
    $verifyQuery = @"
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN ('name', 'city', 'country')
ORDER BY column_name;
"@
    
    psql -h $dbHost -p $dbPort -d $dbName -U $dbUser -c $verifyQuery
    
    Write-Host ""
    Write-Host "✅ OPÉRATION TERMINÉE AVEC SUCCÈS !" -ForegroundColor Green
    Write-Host "🚀 Vous pouvez maintenant redémarrer le serveur backend." -ForegroundColor Yellow
    
} catch {
    Write-Host ""
    Write-Host "❌ ERREUR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Vérifiez que :" -ForegroundColor Yellow
    Write-Host "   - PostgreSQL est démarré" -ForegroundColor White
    Write-Host "   - psql est installé et dans le PATH" -ForegroundColor White
    Write-Host "   - La base de données 'gestion_commerciale' existe" -ForegroundColor White
    Write-Host "   - L'utilisateur 'gestion_user' a les permissions nécessaires" -ForegroundColor White
} finally {
    # Nettoyer la variable d'environnement
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
