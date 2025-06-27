-- Script de validation des données algériennes
-- Vérification complète du workflow métier

\echo '=== VALIDATION DES DONNÉES ALGÉRIENNES ==='
\echo ''

-- 1. Résumé général
\echo '1. RÉSUMÉ GÉNÉRAL:'
SELECT 
  'Clients' as type, COUNT(*) as total,
  COUNT(CASE WHEN type = 'COMPANY' THEN 1 END) as companies,
  COUNT(CASE WHEN type = 'INDIVIDUAL' THEN 1 END) as individuals
FROM clients
UNION ALL
SELECT 
  'Produits', COUNT(*), 
  COUNT(CASE WHEN is_active = true THEN 1 END),
  COUNT(CASE WHEN is_active = false THEN 1 END)
FROM products
UNION ALL
SELECT 
  'Commandes', COUNT(*),
  COUNT(CASE WHEN type = 'QUOTE' THEN 1 END),
  COUNT(CASE WHEN type = 'ORDER' THEN 1 END)
FROM orders
UNION ALL
SELECT 
  'Factures', COUNT(*),
  COUNT(CASE WHEN status = 'PAID' THEN 1 END),
  COUNT(CASE WHEN status IN ('SENT', 'OVERDUE') THEN 1 END)
FROM invoices;

\echo ''
\echo '2. CLIENTS ALGÉRIENS:'
SELECT 
  id, type, 
  CASE 
    WHEN type = 'COMPANY' THEN company_name 
    ELSE CONCAT(first_name, ' ', last_name) 
  END as name,
  city, phone
FROM clients 
ORDER BY type, id;

\echo ''
\echo '3. PRODUITS AVEC PRIX DZD:'
SELECT 
  id, name, category, price || ' DZD' as price_dzd, stock, unit
FROM products 
ORDER BY category, price DESC;

\echo ''
\echo '4. WORKFLOW COMMANDES (Devis → Commandes):'
SELECT 
  number, type, status, 
  ROUND(total, 2) || ' DZD' as total_dzd,
  order_date::date as date
FROM orders 
ORDER BY order_date;

\echo ''
\echo '5. WORKFLOW FACTURES:'
SELECT 
  number, status, 
  ROUND(total, 2) || ' DZD' as total_dzd,
  ROUND(paid_amount, 2) || ' DZD' as paid_dzd,
  payment_method,
  invoice_date::date as date
FROM invoices 
ORDER BY invoice_date;

\echo ''
\echo '6. CALCULS TVA (19% Algérienne):'
SELECT 
  'Commandes' as type,
  COUNT(*) as count,
  ROUND(SUM(subtotal), 2) || ' DZD' as subtotal,
  ROUND(SUM(vat_amount), 2) || ' DZD' as tva_19,
  ROUND(SUM(total), 2) || ' DZD' as total_ttc
FROM orders
WHERE subtotal > 0
UNION ALL
SELECT 
  'Factures',
  COUNT(*),
  ROUND(SUM(subtotal), 2) || ' DZD',
  ROUND(SUM(vat_amount), 2) || ' DZD',
  ROUND(SUM(total), 2) || ' DZD'
FROM invoices
WHERE subtotal > 0;

\echo ''
\echo '7. CHIFFRE D''AFFAIRES ALGÉRIEN:'
SELECT 
  status,
  COUNT(*) as nb_factures,
  ROUND(SUM(total), 2) || ' DZD' as montant
FROM invoices 
GROUP BY status
ORDER BY 
  CASE status 
    WHEN 'PAID' THEN 1 
    WHEN 'SENT' THEN 2 
    WHEN 'OVERDUE' THEN 3 
    ELSE 4 
  END;

\echo ''
\echo '8. TOP VILLES ALGÉRIENNES:'
SELECT 
  city,
  COUNT(*) as nb_clients,
  STRING_AGG(
    CASE 
      WHEN type = 'COMPANY' THEN company_name 
      ELSE first_name 
    END, ', '
  ) as clients
FROM clients 
WHERE city IS NOT NULL
GROUP BY city
ORDER BY nb_clients DESC;

\echo ''
\echo '9. TOP CATÉGORIES PRODUITS:'
SELECT 
  category,
  COUNT(*) as nb_produits,
  ROUND(AVG(price), 2) || ' DZD' as prix_moyen,
  ROUND(MIN(price), 2) || ' DZD' as prix_min,
  ROUND(MAX(price), 2) || ' DZD' as prix_max
FROM products 
WHERE category IS NOT NULL
GROUP BY category
ORDER BY nb_produits DESC;

\echo ''
\echo '10. VALIDATION WORKFLOW MÉTIER:'
-- Vérifier que les devis acceptés ont des commandes correspondantes
SELECT 
  'Devis acceptés avec commandes' as validation,
  COUNT(*) as count
FROM orders o1
WHERE o1.type = 'QUOTE' 
  AND o1.status = 'ACCEPTED'
  AND EXISTS (
    SELECT 1 FROM orders o2 
    WHERE o2.type = 'ORDER' 
      AND o2.client_id = o1.client_id
  )
UNION ALL
-- Vérifier que les commandes ont des factures correspondantes
SELECT 
  'Commandes avec factures',
  COUNT(*)
FROM orders o
WHERE o.type = 'ORDER'
  AND EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.order_id = o.id
  )
UNION ALL
-- Vérifier la cohérence des montants payés
SELECT 
  'Factures payées cohérentes',
  COUNT(*)
FROM invoices 
WHERE status = 'PAID' 
  AND paid_amount = total;

\echo ''
\echo '=== VALIDATION TERMINÉE ==='
