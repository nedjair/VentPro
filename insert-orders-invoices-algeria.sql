-- Script SQL pour insérer les commandes et factures algériennes
-- Respecte le workflow métier : Devis → Commande → Facture

-- Créer les tables manquantes si nécessaire
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  number VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('QUOTE', 'ORDER')),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  delivery_date TIMESTAMP,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 19,
  discount DECIMAL(5,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  number VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'INVOICE' CHECK (type IN ('INVOICE', 'CREDIT_NOTE', 'PROFORMA')),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED')),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  order_id INTEGER REFERENCES orders(id),
  invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  paid_date TIMESTAMP,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  payment_method VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 19,
  discount DECIMAL(5,2) DEFAULT 0
);

-- Supprimer les données existantes
DELETE FROM invoice_items;
DELETE FROM order_items;
DELETE FROM invoices;
DELETE FROM orders;

-- Insérer des devis (QUOTE) avec workflow algérien
INSERT INTO orders (number, type, status, client_id, order_date, valid_until, delivery_date, notes, internal_notes) VALUES
-- Devis en cours (DRAFT)
('DEV-2024-001', 'QUOTE', 'DRAFT', 1, '2024-11-15 09:00:00', '2024-12-15 23:59:59', NULL, 'Devis équipement électronique SONATRACH', 'Client stratégique - priorité haute'),
('DEV-2024-002', 'QUOTE', 'DRAFT', 2, '2024-11-16 14:30:00', '2024-12-16 23:59:59', NULL, 'Devis produits alimentaires CEVITAL', 'Négociation en cours sur les volumes'),

-- Devis envoyés (SENT)
('DEV-2024-003', 'QUOTE', 'SENT', 3, '2024-11-18 10:15:00', '2024-12-18 23:59:59', NULL, 'Devis électronique CONDOR', 'Devis envoyé par email'),
('DEV-2024-004', 'QUOTE', 'SENT', 7, '2024-11-20 16:45:00', '2024-12-20 23:59:59', NULL, 'Devis textile Ahmed Benali', 'Client particulier - livraison Alger'),

-- Devis acceptés (ACCEPTED) - deviennent des commandes
('DEV-2024-005', 'QUOTE', 'ACCEPTED', 4, '2024-11-10 11:20:00', '2024-12-10 23:59:59', '2024-12-05 00:00:00', 'Devis pharmaceutique SAIDAL', 'Devis accepté - transformation en commande'),
('DEV-2024-006', 'QUOTE', 'ACCEPTED', 8, '2024-11-12 13:10:00', '2024-12-12 23:59:59', '2024-12-08 00:00:00', 'Devis alimentaire Fatima Bouzid', 'Commande confirmée par téléphone'),

-- Commandes (ORDER) issues des devis acceptés
('CMD-2024-001', 'ORDER', 'ACCEPTED', 4, '2024-11-25 09:30:00', NULL, '2024-12-10 00:00:00', 'Commande matériel médical SAIDAL', 'Livraison urgente - hôpital'),
('CMD-2024-002', 'ORDER', 'ACCEPTED', 8, '2024-11-26 15:20:00', NULL, '2024-12-12 00:00:00', 'Commande produits bio Fatima', 'Paiement à la livraison'),
('CMD-2024-003', 'ORDER', 'ACCEPTED', 5, '2024-11-28 08:45:00', NULL, '2024-12-15 00:00:00', 'Commande électroménager ENIEM', 'Installation incluse'),
('CMD-2024-004', 'ORDER', 'ACCEPTED', 11, '2024-11-30 12:00:00', NULL, '2024-12-20 00:00:00', 'Commande artisanat Karim Meziane', 'Client VIP - remise accordée');

-- Insérer les articles de commandes avec TVA algérienne (19%)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount) VALUES
-- Articles pour DEV-2024-001 (SONATRACH - Électronique)
(1, 1, 2, 89000.00, 19, 0),    -- 2x Téléviseur LED 55"
(1, 4, 5, 45000.00, 19, 5),    -- 5x Smartphone avec 5% remise

-- Articles pour DEV-2024-002 (CEVITAL - Alimentaire)
(2, 9, 50, 850.00, 19, 0),     -- 50x Huile d'olive 1L
(2, 10, 100, 320.00, 19, 0),   -- 100x Couscous 1kg
(2, 11, 20, 1200.00, 19, 0),   -- 20x Dattes Deglet Nour

-- Articles pour DEV-2024-003 (CONDOR - Électronique)
(3, 1, 1, 89000.00, 19, 0),    -- 1x Téléviseur LED 55"
(3, 5, 1, 135000.00, 19, 0),   -- 1x Ordinateur portable

-- Articles pour DEV-2024-004 (Ahmed Benali - Textile)
(4, 6, 3, 8500.00, 19, 0),     -- 3x Djellaba homme
(4, 7, 1, 12000.00, 19, 0),    -- 1x Haïk femme

-- Articles pour DEV-2024-005 (SAIDAL - Accepté)
(5, 2, 2, 125000.00, 19, 0),   -- 2x Réfrigérateur 350L
(5, 3, 1, 75000.00, 19, 0),    -- 1x Climatiseur

-- Articles pour DEV-2024-006 (Fatima - Accepté)
(6, 9, 10, 850.00, 19, 0),     -- 10x Huile d'olive
(6, 12, 2, 2500.00, 19, 0),    -- 2x Miel naturel

-- Articles pour CMD-2024-001 (SAIDAL - Commande)
(7, 2, 2, 125000.00, 19, 0),   -- 2x Réfrigérateur 350L
(7, 3, 1, 75000.00, 19, 0),    -- 1x Climatiseur

-- Articles pour CMD-2024-002 (Fatima - Commande)
(8, 9, 10, 850.00, 19, 0),     -- 10x Huile d'olive
(8, 12, 2, 2500.00, 19, 0),    -- 2x Miel naturel

-- Articles pour CMD-2024-003 (ENIEM - Commande)
(9, 2, 1, 125000.00, 19, 0),   -- 1x Réfrigérateur
(9, 3, 2, 75000.00, 19, 0),    -- 2x Climatiseur

-- Articles pour CMD-2024-004 (Karim - Commande VIP)
(10, 13, 1, 45000.00, 19, 10), -- 1x Tapis berbère avec 10% remise VIP
(10, 14, 3, 3500.00, 19, 0);   -- 3x Poterie kabyle

-- Calculer et mettre à jour les totaux des commandes
UPDATE orders SET 
  subtotal = subquery.subtotal,
  vat_amount = subquery.vat_amount,
  total = subquery.total
FROM (
  SELECT 
    oi.order_id,
    SUM(oi.quantity * oi.unit_price * (1 - oi.discount / 100)) as subtotal,
    SUM(oi.quantity * oi.unit_price * (1 - oi.discount / 100) * oi.vat_rate / 100) as vat_amount,
    SUM(oi.quantity * oi.unit_price * (1 - oi.discount / 100) * (1 + oi.vat_rate / 100)) as total
  FROM order_items oi
  GROUP BY oi.order_id
) as subquery
WHERE orders.id = subquery.order_id;

-- Insérer les factures algériennes avec workflow métier
INSERT INTO invoices (number, type, status, client_id, order_id, invoice_date, due_date, paid_date, notes, payment_method) VALUES
-- Factures payées (PAID) - issues des commandes
('FACT-2024-001', 'INVOICE', 'PAID', 4, 7, '2024-11-26 10:00:00', '2024-12-26 23:59:59', '2024-12-01 14:30:00', 'Facture SAIDAL - Matériel médical', 'BANK_TRANSFER'),
('FACT-2024-002', 'INVOICE', 'PAID', 8, 8, '2024-11-27 11:15:00', '2024-12-27 23:59:59', '2024-12-02 16:45:00', 'Facture Fatima - Produits bio', 'CASH'),
('FACT-2024-003', 'INVOICE', 'PAID', 5, 9, '2024-11-29 09:30:00', '2024-12-29 23:59:59', '2024-12-05 10:20:00', 'Facture ENIEM - Électroménager', 'CHECK'),

-- Factures envoyées (SENT) - en attente de paiement
('FACT-2024-004', 'INVOICE', 'SENT', 11, 10, '2024-12-01 14:00:00', '2024-12-31 23:59:59', NULL, 'Facture Karim - Artisanat VIP', 'BANK_TRANSFER'),
('FACT-2024-005', 'INVOICE', 'SENT', 1, NULL, '2024-12-02 15:30:00', '2025-01-02 23:59:59', NULL, 'Facture SONATRACH - Services', 'BANK_TRANSFER'),

-- Factures en retard (OVERDUE)
('FACT-2024-006', 'INVOICE', 'OVERDUE', 3, NULL, '2024-10-15 12:00:00', '2024-11-15 23:59:59', NULL, 'Facture CONDOR - En retard', 'CHECK');

-- Insérer les articles de factures
INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, vat_rate, discount) VALUES
-- Articles pour FACT-2024-001 (SAIDAL - Payée)
(1, 2, 2, 125000.00, 19, 0),   -- 2x Réfrigérateur 350L
(1, 3, 1, 75000.00, 19, 0),    -- 1x Climatiseur

-- Articles pour FACT-2024-002 (Fatima - Payée)
(2, 9, 10, 850.00, 19, 0),     -- 10x Huile d'olive
(2, 12, 2, 2500.00, 19, 0),    -- 2x Miel naturel

-- Articles pour FACT-2024-003 (ENIEM - Payée)
(3, 2, 1, 125000.00, 19, 0),   -- 1x Réfrigérateur
(3, 3, 2, 75000.00, 19, 0),    -- 2x Climatiseur

-- Articles pour FACT-2024-004 (Karim - Envoyée)
(4, 13, 1, 45000.00, 19, 10),  -- 1x Tapis berbère avec remise VIP
(4, 14, 3, 3500.00, 19, 0),    -- 3x Poterie kabyle

-- Articles pour FACT-2024-005 (SONATRACH - Envoyée)
(5, 1, 1, 89000.00, 19, 0),    -- 1x Téléviseur LED
(5, 4, 2, 45000.00, 19, 5),    -- 2x Smartphone avec remise

-- Articles pour FACT-2024-006 (CONDOR - En retard)
(6, 6, 2, 8500.00, 19, 0),     -- 2x Djellaba
(6, 7, 1, 12000.00, 19, 0);    -- 1x Haïk

-- Calculer et mettre à jour les totaux des factures
UPDATE invoices SET
  subtotal = subquery.subtotal,
  vat_amount = subquery.vat_amount,
  total = subquery.total,
  paid_amount = CASE
    WHEN invoices.status = 'PAID' THEN subquery.total
    ELSE 0
  END
FROM (
  SELECT
    ii.invoice_id,
    SUM(ii.quantity * ii.unit_price * (1 - ii.discount / 100)) as subtotal,
    SUM(ii.quantity * ii.unit_price * (1 - ii.discount / 100) * ii.vat_rate / 100) as vat_amount,
    SUM(ii.quantity * ii.unit_price * (1 - ii.discount / 100) * (1 + ii.vat_rate / 100)) as total
  FROM invoice_items ii
  GROUP BY ii.invoice_id
) as subquery
WHERE invoices.id = subquery.invoice_id;

-- Afficher les résultats finaux
SELECT 'Commandes insérées:' as info, COUNT(*) as count FROM orders
UNION ALL
SELECT 'Articles de commandes:' as info, COUNT(*) as count FROM order_items
UNION ALL
SELECT 'Factures insérées:' as info, COUNT(*) as count FROM invoices
UNION ALL
SELECT 'Articles de factures:' as info, COUNT(*) as count FROM invoice_items;
