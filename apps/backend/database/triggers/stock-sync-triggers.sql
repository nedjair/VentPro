-- =====================================================
-- TRIGGERS POSTGRESQL POUR SYNCHRONISATION AUTOMATIQUE
-- Tables: products ↔ stocks
-- =====================================================

-- Fonction pour synchroniser products → stocks
CREATE OR REPLACE FUNCTION sync_product_to_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Ne traiter que les produits physiques (non-services)
    IF NEW."isService" = true THEN
        RETURN NEW;
    END IF;

    -- Cas 1: Nouveau produit créé
    IF TG_OP = 'INSERT' THEN
        -- Créer l'enregistrement stock correspondant
        INSERT INTO stocks (
            "productId",
            "companyId", 
            "quantiteActuelle",
            "quantiteMinimale",
            "quantiteMaximale",
            "dateLastUpdate",
            "createdAt",
            "updatedAt"
        ) VALUES (
            NEW.id,
            NEW."companyId",
            COALESCE(NEW."stockQuantity", 0),
            COALESCE(NEW."minStock", 0),
            NEW."maxStock",
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT ("productId") DO UPDATE SET
            "quantiteActuelle" = COALESCE(NEW."stockQuantity", 0),
            "quantiteMinimale" = COALESCE(NEW."minStock", 0),
            "quantiteMaximale" = NEW."maxStock",
            "dateLastUpdate" = NOW(),
            "updatedAt" = NOW();
            
        RETURN NEW;
    END IF;

    -- Cas 2: Produit mis à jour
    IF TG_OP = 'UPDATE' THEN
        -- Vérifier si les données de stock ont changé
        IF (OLD."stockQuantity" IS DISTINCT FROM NEW."stockQuantity" OR
            OLD."minStock" IS DISTINCT FROM NEW."minStock" OR
            OLD."maxStock" IS DISTINCT FROM NEW."maxStock") THEN
            
            -- Mettre à jour l'enregistrement stock correspondant
            UPDATE stocks SET
                "quantiteActuelle" = COALESCE(NEW."stockQuantity", 0),
                "quantiteMinimale" = COALESCE(NEW."minStock", 0),
                "quantiteMaximale" = NEW."maxStock",
                "dateLastUpdate" = NOW(),
                "updatedAt" = NOW()
            WHERE "productId" = NEW.id;
            
            -- Si aucun enregistrement stock n'existe, le créer
            IF NOT FOUND THEN
                INSERT INTO stocks (
                    "productId",
                    "companyId",
                    "quantiteActuelle",
                    "quantiteMinimale", 
                    "quantiteMaximale",
                    "dateLastUpdate",
                    "createdAt",
                    "updatedAt"
                ) VALUES (
                    NEW.id,
                    NEW."companyId",
                    COALESCE(NEW."stockQuantity", 0),
                    COALESCE(NEW."minStock", 0),
                    NEW."maxStock",
                    NOW(),
                    NOW(),
                    NOW()
                );
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser stocks → products
CREATE OR REPLACE FUNCTION sync_stock_to_product()
RETURNS TRIGGER AS $$
DECLARE
    product_record RECORD;
BEGIN
    -- Récupérer les informations du produit
    SELECT * INTO product_record 
    FROM products 
    WHERE id = COALESCE(NEW."productId", OLD."productId");
    
    -- Vérifier que le produit existe et n'est pas un service
    IF product_record IS NULL OR product_record."isService" = true THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Cas 1: Nouveau stock créé
    IF TG_OP = 'INSERT' THEN
        UPDATE products SET
            "stockQuantity" = COALESCE(NEW."quantiteActuelle", 0),
            "minStock" = COALESCE(NEW."quantiteMinimale", 0),
            "maxStock" = NEW."quantiteMaximale",
            "updatedAt" = NOW()
        WHERE id = NEW."productId";
        
        RETURN NEW;
    END IF;

    -- Cas 2: Stock mis à jour
    IF TG_OP = 'UPDATE' THEN
        -- Vérifier si les données ont changé
        IF (OLD."quantiteActuelle" IS DISTINCT FROM NEW."quantiteActuelle" OR
            OLD."quantiteMinimale" IS DISTINCT FROM NEW."quantiteMinimale" OR
            OLD."quantiteMaximale" IS DISTINCT FROM NEW."quantiteMaximale") THEN
            
            UPDATE products SET
                "stockQuantity" = COALESCE(NEW."quantiteActuelle", 0),
                "minStock" = COALESCE(NEW."quantiteMinimale", 0),
                "maxStock" = NEW."quantiteMaximale",
                "updatedAt" = NOW()
            WHERE id = NEW."productId";
        END IF;
        
        RETURN NEW;
    END IF;

    -- Cas 3: Stock supprimé
    IF TG_OP = 'DELETE' THEN
        -- Remettre les valeurs par défaut dans le produit
        UPDATE products SET
            "stockQuantity" = 0,
            "minStock" = 0,
            "maxStock" = NULL,
            "updatedAt" = NOW()
        WHERE id = OLD."productId";
        
        RETURN OLD;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour logger les synchronisations (optionnel)
CREATE OR REPLACE FUNCTION log_stock_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Insérer un log de synchronisation (table optionnelle)
    -- INSERT INTO stock_sync_logs (...)
    -- Pour l'instant, on utilise juste RAISE NOTICE pour le debug
    
    IF TG_OP = 'INSERT' THEN
        RAISE NOTICE 'Stock sync: % % for product %', TG_TABLE_NAME, TG_OP, NEW."productId";
    ELSIF TG_OP = 'UPDATE' THEN
        RAISE NOTICE 'Stock sync: % % for product %', TG_TABLE_NAME, TG_OP, NEW."productId";
    ELSIF TG_OP = 'DELETE' THEN
        RAISE NOTICE 'Stock sync: % % for product %', TG_TABLE_NAME, TG_OP, OLD."productId";
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CRÉATION DES TRIGGERS
-- =====================================================

-- Supprimer les triggers existants s'ils existent
DROP TRIGGER IF EXISTS trigger_sync_product_to_stock ON products;
DROP TRIGGER IF EXISTS trigger_sync_stock_to_product ON stocks;
DROP TRIGGER IF EXISTS trigger_log_product_sync ON products;
DROP TRIGGER IF EXISTS trigger_log_stock_sync ON stocks;

-- Trigger pour synchroniser products → stocks
CREATE TRIGGER trigger_sync_product_to_stock
    AFTER INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_to_stock();

-- Trigger pour synchroniser stocks → products  
CREATE TRIGGER trigger_sync_stock_to_product
    AFTER INSERT OR UPDATE OR DELETE ON stocks
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_to_product();

-- Triggers de logging (optionnels, pour debug)
CREATE TRIGGER trigger_log_product_sync
    AFTER INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION log_stock_sync();

CREATE TRIGGER trigger_log_stock_sync
    AFTER INSERT OR UPDATE OR DELETE ON stocks
    FOR EACH ROW
    EXECUTE FUNCTION log_stock_sync();

-- =====================================================
-- VÉRIFICATION ET TESTS
-- =====================================================

-- Fonction pour tester les triggers
CREATE OR REPLACE FUNCTION test_stock_sync_triggers()
RETURNS TEXT AS $$
DECLARE
    test_company_id TEXT;
    test_product_id TEXT;
    test_stock_id TEXT;
    result TEXT := '';
BEGIN
    -- Créer une entreprise de test
    INSERT INTO companies (id, name, email, phone, address, "createdAt", "updatedAt")
    VALUES ('test-company-sync', 'Test Sync Company', 'test@sync.com', '+213123456789', 'Test Address', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    test_company_id := 'test-company-sync';
    
    -- Test 1: Créer un produit et vérifier que le stock est créé automatiquement
    INSERT INTO products (id, name, price, "stockQuantity", "minStock", "maxStock", "companyId", "createdAt", "updatedAt")
    VALUES ('test-product-sync', 'Test Product Sync', 100.00, 50, 10, 100, test_company_id, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        "stockQuantity" = 50,
        "minStock" = 10,
        "maxStock" = 100,
        "updatedAt" = NOW();
    
    test_product_id := 'test-product-sync';
    
    -- Vérifier que le stock a été créé
    SELECT id INTO test_stock_id FROM stocks WHERE "productId" = test_product_id;
    
    IF test_stock_id IS NOT NULL THEN
        result := result || 'Test 1 PASSED: Stock créé automatiquement. ';
    ELSE
        result := result || 'Test 1 FAILED: Stock non créé. ';
    END IF;
    
    -- Test 2: Modifier le produit et vérifier la synchronisation
    UPDATE products SET "stockQuantity" = 75, "minStock" = 15 WHERE id = test_product_id;
    
    -- Vérifier la synchronisation
    IF EXISTS (SELECT 1 FROM stocks WHERE "productId" = test_product_id AND "quantiteActuelle" = 75 AND "quantiteMinimale" = 15) THEN
        result := result || 'Test 2 PASSED: Synchronisation product→stock. ';
    ELSE
        result := result || 'Test 2 FAILED: Synchronisation product→stock échouée. ';
    END IF;
    
    -- Test 3: Modifier le stock et vérifier la synchronisation inverse
    UPDATE stocks SET "quantiteActuelle" = 25, "quantiteMinimale" = 5 WHERE "productId" = test_product_id;
    
    -- Vérifier la synchronisation inverse
    IF EXISTS (SELECT 1 FROM products WHERE id = test_product_id AND "stockQuantity" = 25 AND "minStock" = 5) THEN
        result := result || 'Test 3 PASSED: Synchronisation stock→product. ';
    ELSE
        result := result || 'Test 3 FAILED: Synchronisation stock→product échouée. ';
    END IF;
    
    -- Nettoyage
    DELETE FROM stocks WHERE "productId" = test_product_id;
    DELETE FROM products WHERE id = test_product_id;
    DELETE FROM companies WHERE id = test_company_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Commande pour exécuter les tests
-- SELECT test_stock_sync_triggers();

-- =====================================================
-- COMMANDES D'ADMINISTRATION
-- =====================================================

-- Désactiver temporairement les triggers
-- ALTER TABLE products DISABLE TRIGGER trigger_sync_product_to_stock;
-- ALTER TABLE stocks DISABLE TRIGGER trigger_sync_stock_to_product;

-- Réactiver les triggers
-- ALTER TABLE products ENABLE TRIGGER trigger_sync_product_to_stock;
-- ALTER TABLE stocks ENABLE TRIGGER trigger_sync_stock_to_product;

-- Supprimer complètement les triggers
-- DROP TRIGGER IF EXISTS trigger_sync_product_to_stock ON products;
-- DROP TRIGGER IF EXISTS trigger_sync_stock_to_product ON stocks;
-- DROP FUNCTION IF EXISTS sync_product_to_stock();
-- DROP FUNCTION IF EXISTS sync_stock_to_product();

COMMENT ON FUNCTION sync_product_to_stock() IS 'Synchronise automatiquement les données de products vers stocks';
COMMENT ON FUNCTION sync_stock_to_product() IS 'Synchronise automatiquement les données de stocks vers products';
COMMENT ON FUNCTION test_stock_sync_triggers() IS 'Teste le bon fonctionnement des triggers de synchronisation';
