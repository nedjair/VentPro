-- Script SQL dynamique pour insérer les commandes et factures algériennes
-- Utilise les IDs réels des clients et produits

-- Supprimer les données existantes
DELETE FROM invoice_items;
DELETE FROM order_items;
DELETE FROM invoices;
DELETE FROM orders;

-- Insérer des devis et commandes en utilisant les IDs réels
-- Récupérer les IDs des clients par email pour garantir la cohérence

-- Devis SONATRACH (premier client COMPANY)
INSERT INTO orders (number, type, status, client_id, order_date, valid_until, delivery_date, notes, internal_notes)
SELECT 'DEV-2024-001', 'QUOTE', 'DRAFT', c.id, '2024-11-15 09:00:00', '2024-12-15 23:59:59', NULL, 
       'Devis équipement électronique SONATRACH', 'Client stratégique - priorité haute'
FROM clients c WHERE c.email = 'contact@sonatrach.dz' LIMIT 1;

-- Devis CEVITAL
INSERT INTO orders (number, type, status, client_id, order_date, valid_until, delivery_date, notes, internal_notes)
SELECT 'DEV-2024-002', 'QUOTE', 'DRAFT', c.id, '2024-11-16 14:30:00', '2024-12-16 23:59:59', NULL, 
       'Devis produits alimentaires CEVITAL', 'Négociation en cours sur les volumes'
FROM clients c WHERE c.email = 'info@cevital.dz' LIMIT 1;

-- Devis CONDOR (envoyé)
INSERT INTO orders (number, type, status, client_id, order_date, valid_until, delivery_date, notes, internal_notes)
SELECT 'DEV-2024-003', 'QUOTE', 'SENT', c.id, '2024-11-18 10:15:00', '2024-12-18 23:59:59', NULL, 
       'Devis électronique CONDOR', 'Devis envoyé par email'
FROM clients c WHERE c.email = 'commercial@condor.dz' LIMIT 1;

-- Devis Ahmed Benali (envoyé)
INSERT INTO orders (number, type, status, client_id, order_date, valid_until, delivery_date, notes, internal_notes)
SELECT 'DEV-2024-004', 'QUOTE', 'SENT', c.id, '2024-11-20 16:45:00', '2024-12-20 23:59:59', NULL, 
       'Devis textile Ahmed Benali', 'Client particulier - livraison Alger'
FROM clients c WHERE c.email = 'ahmed.benali@gmail.com' LIMIT 1;

-- Devis SAIDAL (accepté)
INSERT INTO orders (number, type, status, client_id, order_date, valid_until, delivery_date, notes, internal_notes)
SELECT 'DEV-2024-005', 'QUOTE', 'ACCEPTED', c.id, '2024-11-10 11:20:00', '2024-12-10 23:59:59', '2024-12-05 00:00:00', 
       'Devis pharmaceutique SAIDAL', 'Devis accepté - transformation en commande'
FROM clients c WHERE c.email = 'contact@saidal.dz' LIMIT 1;

-- Devis Fatima Bouzid (accepté)
INSERT INTO orders (number, type, status, client_id, order_date, valid_until, delivery_date, notes, internal_notes)
SELECT 'DEV-2024-006', 'QUOTE', 'ACCEPTED', c.id, '2024-11-12 13:10:00', '2024-12-12 23:59:59', '2024-12-08 00:00:00', 
       'Devis alimentaire Fatima Bouzid', 'Commande confirmée par téléphone'
FROM clients c WHERE c.email = 'fatima.bouzid@hotmail.com' LIMIT 1;

-- Commandes issues des devis acceptés
INSERT INTO orders (number, type, status, client_id, order_date, valid_until, delivery_date, notes, internal_notes)
SELECT 'CMD-2024-001', 'ORDER', 'ACCEPTED', c.id, '2024-11-25 09:30:00', NULL, '2024-12-10 00:00:00', 
       'Commande matériel médical SAIDAL', 'Livraison urgente - hôpital'
FROM clients c WHERE c.email = 'contact@saidal.dz' LIMIT 1;

INSERT INTO orders (number, type, status, client_id, order_date, valid_until, delivery_date, notes, internal_notes)
SELECT 'CMD-2024-002', 'ORDER', 'ACCEPTED', c.id, '2024-11-26 15:20:00', NULL, '2024-12-12 00:00:00', 
       'Commande produits bio Fatima', 'Paiement à la livraison'
FROM clients c WHERE c.email = 'fatima.bouzid@hotmail.com' LIMIT 1;

INSERT INTO orders (number, type, status, client_id, order_date, valid_until, delivery_date, notes, internal_notes)
SELECT 'CMD-2024-003', 'ORDER', 'ACCEPTED', c.id, '2024-11-28 08:45:00', NULL, '2024-12-15 00:00:00', 
       'Commande électroménager ENIEM', 'Installation incluse'
FROM clients c WHERE c.email = 'info@eniem.dz' LIMIT 1;

INSERT INTO orders (number, type, status, client_id, order_date, valid_until, delivery_date, notes, internal_notes)
SELECT 'CMD-2024-004', 'ORDER', 'ACCEPTED', c.id, '2024-11-30 12:00:00', NULL, '2024-12-20 00:00:00', 
       'Commande artisanat Karim Meziane', 'Client VIP - remise accordée'
FROM clients c WHERE c.email = 'karim.meziane@gmail.com' LIMIT 1;

-- Insérer les articles de commandes avec les IDs réels des produits
-- Articles pour DEV-2024-001 (SONATRACH - Électronique)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 2, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-001' AND p.reference = 'TV-LED-55-001';

INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 5, p.price, 19, 5
FROM orders o, products p 
WHERE o.number = 'DEV-2024-001' AND p.reference = 'PHONE-AND-001';

-- Articles pour DEV-2024-002 (CEVITAL - Alimentaire)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 50, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-002' AND p.reference = 'HUILE-OL-1L';

INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 100, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-002' AND p.reference = 'COUSCOUS-1K';

INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 20, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-002' AND p.reference = 'DATTES-DN-500';

-- Articles pour DEV-2024-003 (CONDOR - Électronique)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 1, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-003' AND p.reference = 'TV-LED-55-001';

INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 1, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-003' AND p.reference = 'LAPTOP-HP-001';

-- Articles pour DEV-2024-004 (Ahmed Benali - Textile)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 3, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-004' AND p.reference = 'DJEL-H-001';

INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 1, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-004' AND p.reference = 'HAIK-F-001';

-- Articles pour DEV-2024-005 (SAIDAL - Accepté)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 2, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-005' AND p.reference = 'FRIGO-350-001';

INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 1, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-005' AND p.reference = 'CLIM-12K-001';

-- Articles pour DEV-2024-006 (Fatima - Accepté)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 10, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-006' AND p.reference = 'HUILE-OL-1L';

INSERT INTO order_items (order_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT o.id, p.id, 2, p.price, 19, 0
FROM orders o, products p 
WHERE o.number = 'DEV-2024-006' AND p.reference = 'MIEL-NAT-500';

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
-- Factures payées (PAID) - issues des commandes
INSERT INTO invoices (number, type, status, client_id, order_id, invoice_date, due_date, paid_date, notes, payment_method)
SELECT 'FACT-2024-001', 'INVOICE', 'PAID', c.id, o.id, '2024-11-26 10:00:00', '2024-12-26 23:59:59', '2024-12-01 14:30:00',
       'Facture SAIDAL - Matériel médical', 'BANK_TRANSFER'
FROM clients c, orders o
WHERE c.email = 'contact@saidal.dz' AND o.number = 'CMD-2024-001' LIMIT 1;

INSERT INTO invoices (number, type, status, client_id, order_id, invoice_date, due_date, paid_date, notes, payment_method)
SELECT 'FACT-2024-002', 'INVOICE', 'PAID', c.id, o.id, '2024-11-27 11:15:00', '2024-12-27 23:59:59', '2024-12-02 16:45:00',
       'Facture Fatima - Produits bio', 'CASH'
FROM clients c, orders o
WHERE c.email = 'fatima.bouzid@hotmail.com' AND o.number = 'CMD-2024-002' LIMIT 1;

INSERT INTO invoices (number, type, status, client_id, order_id, invoice_date, due_date, paid_date, notes, payment_method)
SELECT 'FACT-2024-003', 'INVOICE', 'PAID', c.id, o.id, '2024-11-29 09:30:00', '2024-12-29 23:59:59', '2024-12-05 10:20:00',
       'Facture ENIEM - Électroménager', 'CHECK'
FROM clients c, orders o
WHERE c.email = 'info@eniem.dz' AND o.number = 'CMD-2024-003' LIMIT 1;

-- Factures envoyées (SENT) - en attente de paiement
INSERT INTO invoices (number, type, status, client_id, order_id, invoice_date, due_date, paid_date, notes, payment_method)
SELECT 'FACT-2024-004', 'INVOICE', 'SENT', c.id, o.id, '2024-12-01 14:00:00', '2024-12-31 23:59:59', NULL,
       'Facture Karim - Artisanat VIP', 'BANK_TRANSFER'
FROM clients c, orders o
WHERE c.email = 'karim.meziane@gmail.com' AND o.number = 'CMD-2024-004' LIMIT 1;

INSERT INTO invoices (number, type, status, client_id, invoice_date, due_date, paid_date, notes, payment_method)
SELECT 'FACT-2024-005', 'INVOICE', 'SENT', c.id, '2024-12-02 15:30:00', '2025-01-02 23:59:59', NULL,
       'Facture SONATRACH - Services', 'BANK_TRANSFER'
FROM clients c WHERE c.email = 'contact@sonatrach.dz' LIMIT 1;

-- Factures en retard (OVERDUE)
INSERT INTO invoices (number, type, status, client_id, invoice_date, due_date, paid_date, notes, payment_method)
SELECT 'FACT-2024-006', 'INVOICE', 'OVERDUE', c.id, '2024-10-15 12:00:00', '2024-11-15 23:59:59', NULL,
       'Facture CONDOR - En retard', 'CHECK'
FROM clients c WHERE c.email = 'commercial@condor.dz' LIMIT 1;

-- Insérer les articles de factures avec les IDs réels
-- Articles pour FACT-2024-001 (SAIDAL - Payée) - copie des articles de CMD-2024-001
INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT i.id, oi.product_id, oi.quantity, oi.unit_price, oi.vat_rate, oi.discount
FROM invoices i, orders o, order_items oi
WHERE i.number = 'FACT-2024-001' AND o.number = 'CMD-2024-001' AND oi.order_id = o.id;

-- Articles pour FACT-2024-002 (Fatima - Payée) - copie des articles de CMD-2024-002
INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT i.id, oi.product_id, oi.quantity, oi.unit_price, oi.vat_rate, oi.discount
FROM invoices i, orders o, order_items oi
WHERE i.number = 'FACT-2024-002' AND o.number = 'CMD-2024-002' AND oi.order_id = o.id;

-- Articles pour FACT-2024-003 (ENIEM - Payée) - copie des articles de CMD-2024-003
INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT i.id, oi.product_id, oi.quantity, oi.unit_price, oi.vat_rate, oi.discount
FROM invoices i, orders o, order_items oi
WHERE i.number = 'FACT-2024-003' AND o.number = 'CMD-2024-003' AND oi.order_id = o.id;

-- Articles pour FACT-2024-004 (Karim - Envoyée) - copie des articles de CMD-2024-004
INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT i.id, oi.product_id, oi.quantity, oi.unit_price, oi.vat_rate, oi.discount
FROM invoices i, orders o, order_items oi
WHERE i.number = 'FACT-2024-004' AND o.number = 'CMD-2024-004' AND oi.order_id = o.id;

-- Articles pour FACT-2024-005 (SONATRACH - Envoyée) - articles spécifiques
INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT i.id, p.id, 1, p.price, 19, 0
FROM invoices i, products p
WHERE i.number = 'FACT-2024-005' AND p.reference = 'TV-LED-55-001';

INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT i.id, p.id, 2, p.price, 19, 5
FROM invoices i, products p
WHERE i.number = 'FACT-2024-005' AND p.reference = 'PHONE-AND-001';

-- Articles pour FACT-2024-006 (CONDOR - En retard) - articles spécifiques
INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT i.id, p.id, 2, p.price, 19, 0
FROM invoices i, products p
WHERE i.number = 'FACT-2024-006' AND p.reference = 'DJEL-H-001';

INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, vat_rate, discount)
SELECT i.id, p.id, 1, p.price, 19, 0
FROM invoices i, products p
WHERE i.number = 'FACT-2024-006' AND p.reference = 'HAIK-F-001';

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
