-- Script SQL pour créer des données de test
-- Résout le problème d'affichage "Aucune donnée trouvée"

-- 1. Créer une entreprise de test
INSERT INTO companies (id, name, siret, address, "postalCode", city, country, phone, email, currency, timezone, "createdAt", "updatedAt")
VALUES (
  'cm4xk1234567890abcdef',
  'Entreprise Test Algérienne SARL',
  '12345678901234',
  '123 Rue de la Liberté',
  '16000',
  'Alger',
  'Algérie',
  '+213 21 123 456',
  'contact@entreprise-test.dz',
  'DA',
  'Africa/Algiers',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Créer un utilisateur de test
INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "companyId", "createdAt", "updatedAt")
VALUES (
  'cm4xk1234567890user01',
  'admin@test.dz',
  '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQ', -- password: admin123
  'Ahmed',
  'Benali',
  'ADMIN',
  true,
  'cm4xk1234567890abcdef',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 3. Créer des catégories de produits
INSERT INTO categories (id, name, description, "companyId", "createdAt", "updatedAt")
VALUES 
  ('cm4xk1234567890cat001', 'Produits Alimentaires', 'Couscous, huile, épices', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890cat002', 'Hygiène et Beauté', 'Savons, shampoings, cosmétiques', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890cat003', 'Boissons', 'Thé, café, jus', 'cm4xk1234567890abcdef', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Créer des produits de test (algériens)
INSERT INTO products (id, name, description, sku, price, cost, "vatRate", "stockQuantity", "minStock", "maxStock", "isActive", "isService", unit, "categoryId", "companyId", "createdAt", "updatedAt")
VALUES 
  ('cm4xk1234567890prod01', 'Couscous Ferrero 1kg', 'Couscous grain moyen de qualité supérieure', 'COUSCOUS-001', 350.00, 280.00, 19.00, 45, 10, 100, true, false, 'paquet', 'cm4xk1234567890cat001', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890prod02', 'Huile Elio 1L', 'Huile de table raffinée', 'HUILE-001', 280.00, 220.00, 19.00, 8, 15, 50, true, false, 'bouteille', 'cm4xk1234567890cat001', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890prod03', 'Harissa Traditionnelle 200g', 'Harissa artisanale piquante', 'HARISSA-001', 180.00, 140.00, 19.00, 3, 10, 30, true, false, 'pot', 'cm4xk1234567890cat001', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890prod04', 'Thé Vert Palais des Thés', 'Thé vert de qualité premium', 'THE-001', 450.00, 350.00, 19.00, 0, 5, 25, true, false, 'boîte', 'cm4xk1234567890cat003', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890prod05', 'Savon Doux Alger 100g', 'Savon traditionnel à l\'huile d\'olive', 'SAVON-001', 120.00, 80.00, 19.00, 120, 20, 200, true, false, 'pièce', 'cm4xk1234567890cat002', 'cm4xk1234567890abcdef', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Créer des stocks correspondants
INSERT INTO stocks (id, "quantiteActuelle", "quantiteMinimale", "quantiteMaximale", "dateLastUpdate", "productId", "companyId", "createdAt", "updatedAt")
VALUES 
  ('cm4xk1234567890stk001', 45, 10, 100, NOW(), 'cm4xk1234567890prod01', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890stk002', 8, 15, 50, NOW(), 'cm4xk1234567890prod02', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890stk003', 3, 10, 30, NOW(), 'cm4xk1234567890prod03', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890stk004', 0, 5, 25, NOW(), 'cm4xk1234567890prod04', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890stk005', 120, 20, 200, NOW(), 'cm4xk1234567890prod05', 'cm4xk1234567890abcdef', NOW(), NOW())
ON CONFLICT ("productId") DO NOTHING;

-- 6. Créer des mouvements de stock
INSERT INTO stock_movements (id, type, quantity, "unitCost", reference, comment, "productId", "createdAt")
VALUES 
  ('cm4xk1234567890mov001', 'IN', 50, 280.00, 'INIT-001', 'Stock initial - Couscous Ferrero', 'cm4xk1234567890prod01', NOW()),
  ('cm4xk1234567890mov002', 'OUT', 5, 280.00, 'VENTE-001', 'Vente client - Couscous', 'cm4xk1234567890prod01', NOW()),
  ('cm4xk1234567890mov003', 'IN', 20, 220.00, 'INIT-002', 'Stock initial - Huile Elio', 'cm4xk1234567890prod02', NOW()),
  ('cm4xk1234567890mov004', 'OUT', 12, 220.00, 'VENTE-002', 'Vente client - Huile', 'cm4xk1234567890prod02', NOW()),
  ('cm4xk1234567890mov005', 'IN', 150, 80.00, 'INIT-005', 'Stock initial - Savon Alger', 'cm4xk1234567890prod05', NOW()),
  ('cm4xk1234567890mov006', 'OUT', 30, 80.00, 'VENTE-003', 'Vente en gros - Savons', 'cm4xk1234567890prod05', NOW())
ON CONFLICT (id) DO NOTHING;

-- 7. Créer des clients de test (algériens)
INSERT INTO clients (id, type, "firstName", "lastName", "companyName", email, phone, mobile, address, "postalCode", city, country, "siret", "vatNumber", "paymentTerms", discount, "creditLimit", "isActive", notes, tags, "companyId", "createdAt", "updatedAt")
VALUES 
  ('cm4xk1234567890cli001', 'INDIVIDUAL', 'Fatima', 'Benaissa', NULL, 'fatima.benaissa@email.dz', '+213 21 456 789', '+213 555 123 456', '45 Rue Didouche Mourad', '16000', 'Alger', 'Algérie', NULL, NULL, 30, 0.00, 5000.00, true, 'Cliente fidèle depuis 2020', '["fidèle", "alger"]', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890cli002', 'COMPANY', NULL, NULL, 'Épicerie Moderne SARL', 'contact@epicerie-moderne.dz', '+213 21 789 123', '+213 666 789 123', '78 Boulevard Amirouche', '16001', 'Alger', 'Algérie', '98765432109876', 'DZ98765432109', 15, 5.00, 15000.00, true, 'Grossiste alimentaire', '["grossiste", "alimentaire"]', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890cli003', 'INDIVIDUAL', 'Omar', 'Khelifi', NULL, 'omar.khelifi@email.dz', '+213 31 234 567', '+213 777 234 567', '12 Rue de la Paix', '31000', 'Oran', 'Algérie', NULL, NULL, 30, 2.50, 3000.00, true, 'Client d\'Oran', '["oran", "particulier"]', 'cm4xk1234567890abcdef', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 8. Créer des fournisseurs de test
INSERT INTO suppliers (id, type, name, "contactName", email, phone, mobile, website, address, "postalCode", city, country, siret, "vatNumber", "paymentTerms", discount, currency, rating, "isActive", "isPreferred", notes, tags, "companyId", "createdAt", "updatedAt")
VALUES 
  ('cm4xk1234567890sup001', 'COMPANY', 'Ferrero Algérie', 'Karim Benali', 'contact@ferrero.dz', '+213 21 345 678', '+213 555 345 678', 'www.ferrero.dz', '25 Zone Industrielle Rouiba', '16012', 'Alger', 'Algérie', '11223344556677', 'DZ11223344556', 30, 3.00, 'DA', 5, true, true, 'Fournisseur principal de couscous', '["couscous", "alimentaire", "principal"]', 'cm4xk1234567890abcdef', NOW(), NOW()),
  ('cm4xk1234567890sup002', 'COMPANY', 'Elio Huiles', 'Amina Cherif', 'commercial@elio.dz', '+213 21 567 890', '+213 666 567 890', 'www.elio.dz', '15 Route Nationale', '16020', 'Alger', 'Algérie', '22334455667788', 'DZ22334455667', 45, 2.50, 'DA', 4, true, false, 'Fournisseur d\'huiles alimentaires', '["huile", "alimentaire"]', 'cm4xk1234567890abcdef', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Afficher un résumé des données créées
SELECT 'Données de test créées avec succès!' as message;
SELECT 
  (SELECT COUNT(*) FROM companies) as companies,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM categories) as categories,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM stocks) as stocks,
  (SELECT COUNT(*) FROM stock_movements) as movements,
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM suppliers) as suppliers;
