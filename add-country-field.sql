-- Migration pour ajouter le champ country à la table companies
-- Exécuter cette requête SQL directement dans PostgreSQL

-- Vérifier si la colonne existe déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'country'
    ) THEN
        -- Ajouter la colonne country avec une valeur par défaut
        ALTER TABLE companies 
        ADD COLUMN country VARCHAR(255) NOT NULL DEFAULT 'France';
        
        RAISE NOTICE 'Colonne country ajoutée à la table companies';
    ELSE
        RAISE NOTICE 'La colonne country existe déjà dans la table companies';
    END IF;
END $$;
