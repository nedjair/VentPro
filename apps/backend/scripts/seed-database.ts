#!/usr/bin/env tsx

import 'dotenv/config'
import { PrismaClient } from '@gestion/database'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const TVA_RATE = 19
const CURRENCY = 'DA'
const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_PASSWORD = 'admin123'
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run') || !args.has('--confirm-reset')

type Line = { product: string; quantity: number; unitPrice: number; discount?: number; vatRate?: number }
const round2 = (value: number) => Number(value.toFixed(2))
const daysAgo = (days: number) => { const date = new Date(); date.setDate(date.getDate() - days); return date }
const daysFromNow = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return date }
const totalFromLines = (lines: Line[]) => {
  const subtotal = round2(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (1 - Number(line.discount || 0) / 100), 0))
  const tvaAmount = round2(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (1 - Number(line.discount || 0) / 100) * (Number(line.vatRate || TVA_RATE) / 100), 0))
  return { subtotal, tvaAmount, total: round2(subtotal + tvaAmount) }
}
function assertDevelopmentTarget() {
  // Ce seed est strictement réservé à la base locale de développement.
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL manquante : impossible de valider la cible du seed')
  const parsed = new URL(url)
  const safeHosts = new Set(['localhost', '127.0.0.1', 'postgres', 'ventespro-postgres'])
  const databaseName = parsed.pathname.replace(/^\//, '')
  if (process.env.NODE_ENV === 'production') throw new Error('Seed destructif bloqué : NODE_ENV=production')
  if (!safeHosts.has(parsed.hostname)) throw new Error(`Seed destructif bloqué : hôte non autorisé (${parsed.hostname})`)
  if (!['gestion_commerciale_tpe', 'gestion_commerciale_tpe_test'].includes(databaseName)) throw new Error(`Seed destructif bloqué : base non prévue (${databaseName})`)
}
async function readCurrentCounts() {
  const [users, clients, suppliers, products, stocks, quotes, orders, invoices, payments, purchases, deliveries, accountingEntries, kpis] = await Promise.all([
    prisma.user.count(), prisma.client.count(), prisma.supplier.count(), prisma.product.count(), prisma.stock.count(), prisma.quote.count(), prisma.order.count(), prisma.invoice.count(), prisma.payment.count(), prisma.purchase.count(), prisma.delivery.count(), prisma.accountingEntry.count(), prisma.kpiTargetSettings.count(),
  ])
  return { users, clients, suppliers, products, stocks, quotes, orders, invoices, payments, purchases, deliveries, accountingEntries, kpis }
}
async function resetDatabase(tx: any) {
  // On supprime d'abord les dépendances, puis les entités racines.
  await tx.payment.deleteMany(); await tx.accountingEntry.deleteMany(); await tx.deliveryItem.deleteMany(); await tx.delivery.deleteMany(); await tx.invoice.deleteMany(); await tx.orderItem.deleteMany(); await tx.order.deleteMany(); await tx.quoteItem.deleteMany(); await tx.quote.deleteMany(); await tx.purchaseItem.deleteMany(); await tx.purchase.deleteMany(); await tx.stock.deleteMany(); await tx.product.deleteMany(); await tx.client.deleteMany(); await tx.supplier.deleteMany(); await tx.kpiTargetSettings.deleteMany(); await tx.user.deleteMany()
}
async function seedDataset(tx: any) {
  const hashedAdminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)
  const hashedDefaultPassword = await bcrypt.hash('DzDev123!', 10)
  // L'administrateur demandé par l'utilisateur est figé ici pour les tests applicatifs.
  const userSeeds = [
    { key: 'admin', email: ADMIN_EMAIL, fullName: 'Administrateur Démonstration', role: 'admin', password: hashedAdminPassword, createdAt: daysAgo(160) },
    { key: 'direction', email: 'direction@atlasdistribution.dz', fullName: 'Karim Benaïssa', role: 'manager', password: hashedDefaultPassword, createdAt: daysAgo(150) },
    { key: 'sales', email: 'commercial@atlasdistribution.dz', fullName: 'Nadia Meziane', role: 'manager', password: hashedDefaultPassword, createdAt: daysAgo(140) },
    { key: 'billing', email: 'facturation@atlasdistribution.dz', fullName: 'Sabrina Rahal', role: 'employee', password: hashedDefaultPassword, createdAt: daysAgo(130) },
    { key: 'purchases', email: 'achats@atlasdistribution.dz', fullName: 'Walid Bouzid', role: 'employee', password: hashedDefaultPassword, createdAt: daysAgo(120) },
    { key: 'stock', email: 'stock@atlasdistribution.dz', fullName: 'Lyes Chikhi', role: 'employee', password: hashedDefaultPassword, createdAt: daysAgo(115) },
  ]
  const clientSeeds = [
    { key: 'elAmel', userKey: 'sales', data: { name: 'SARL El Amel Bâtiment', email: 'contact@elamel-batiment.dz', phone: '+213 21 54 12 80', address: '12 rue Didouche Mourad, Alger' } },
    { key: 'ibnSina', userKey: 'sales', data: { name: 'Pharmacie Ibn Sina', email: 'gestion@pharmacieibnsina.dz', phone: '+213 41 39 22 15', address: '18 boulevard Emir Abdelkader, Oran' } },
    { key: 'numidia', userKey: 'sales', data: { name: 'EURL Numidia Services', email: 'achats@numidia-services.dz', phone: '+213 31 92 40 10', address: '7 rue Larbi Ben M\'hidi, Constantine' } },
    { key: 'tiziPrint', userKey: 'sales', data: { name: 'Atelier Tizi Print', email: 'atelier@tiziprint.dz', phone: '+213 26 11 08 34', address: 'Cité Nouvelle Ville, Tizi Ouzou' } },
    { key: 'cosmosMarket', userKey: 'sales', data: { name: 'Cosmos Market', email: 'achats@cosmosmarket.dz', phone: '+213 23 60 70 18', address: 'Rue de la République, Blida' } },
    { key: 'djurdjuraHotel', userKey: 'sales', data: { name: 'Hôtel Djurdjura', email: 'finance@hoteldjurdjura.dz', phone: '+213 26 19 44 22', address: 'Boulevard Krim Belkacem, Tizi Ouzou' } },
    { key: 'medinaOptic', userKey: 'sales', data: { name: 'Optique El Medina', email: 'commande@optiqueelmedina.dz', phone: '+213 38 87 65 11', address: 'Rue Emir Abdelkader, Béjaïa' } },
    { key: 'saharaEnergy', userKey: 'sales', data: { name: 'Sahara Energy Services', email: 'procurement@sahara-energy.dz', phone: '+213 29 76 50 40', address: 'Zone industrielle Sidi Khouiled, Ouargla' } },
    { key: 'annabaMed', userKey: 'sales', data: { name: 'Clinique Annaba Médicale', email: 'achat@annabamed.dz', phone: '+213 38 44 10 90', address: 'Cours de la Révolution, Annaba' } },
    { key: 'setifAuto', userKey: 'sales', data: { name: 'Sétif Auto Pièces', email: 'vente@setifautopieces.dz', phone: '+213 36 55 11 77', address: 'Zone d\'activité El Eulma, Sétif' } },
  ]
  const supplierSeeds = [
    { key: 'techDistribution', userKey: 'purchases', data: { name: 'SPA Tech Distribution Algérie', email: 'sales@techdistribution.dz', phone: '+213 21 66 44 12', address: 'Zone industrielle Oued Smar, Alger' } },
    { key: 'bureauPlus', userKey: 'purchases', data: { name: 'SARL Bureau Plus Algérie', email: 'contact@bureauplus.dz', phone: '+213 21 83 77 40', address: '25 route de Blida, Birkhadem' } },
    { key: 'electroSud', userKey: 'purchases', data: { name: 'EURL Electro Sud', email: 'commande@electrosud.dz', phone: '+213 29 70 18 55', address: 'Zone d\'activité Hassi Ameur, Ouargla' } },
    { key: 'microSystems', userKey: 'purchases', data: { name: 'Micro Systems Algérie', email: 'supply@microsystems.dz', phone: '+213 31 91 14 22', address: 'Parc d\'activité Palma, Constantine' } },
    { key: 'digitalOffice', userKey: 'purchases', data: { name: 'Digital Office Pro', email: 'commande@digitaloffice.dz', phone: '+213 21 92 65 33', address: 'Hai El Badr, Bab Ezzouar, Alger' } },
    { key: 'saharaRetail', userKey: 'purchases', data: { name: 'Sahara Retail Equipment', email: 'sales@sahararetail.dz', phone: '+213 37 74 29 18', address: 'Route de Batna, Biskra' } },
  ]
  const productSeeds = [
    { key: 'router', name: 'Routeur Wi‑Fi TP-Link Archer C6', sku: 'NET-ARCHER-C6', barcode: '6131600001001', price: 9500, description: 'Routeur double bande pour agences, pharmacies et petits bureaux.' },
    { key: 'switch', name: 'Switch TP-Link 8 ports Gigabit', sku: 'NET-SW-8P', barcode: '6131600001002', price: 6200, description: 'Switch 8 ports pour réseaux internes d\'entreprises.' },
    { key: 'ups', name: 'Onduleur APC Easy UPS 650VA', sku: 'ELEC-UPS-650', barcode: '6131600001003', price: 21500, description: 'Onduleur pour caisses, postes administratifs et équipements réseau.' },
    { key: 'paper', name: 'Ramette papier A4 Navigator 80g', sku: 'BUREAU-A4-80G', barcode: '6131600001004', price: 780, description: 'Consommable bureautique grand volume pour TPE et PME.' },
    { key: 'toner', name: 'Toner HP 106A noir', sku: 'PRINT-HP-106A', barcode: '6131600001005', price: 6500, description: 'Toner laser standard pour imprimantes bureautiques.' },
    { key: 'printer', name: 'Imprimante multifonction HP 137fnw', sku: 'PRINT-HP-137FNW', barcode: '6131600001006', price: 36500, description: 'Imprimante réseau pour cabinets, cliniques et services administratifs.' },
    { key: 'scanner', name: 'Scanner Brother ADS-1200', sku: 'SCAN-BRO-1200', barcode: '6131600001007', price: 48000, description: 'Scanner compact pour numérisation de dossiers et factures.' },
    { key: 'laptop', name: 'PC Portable Lenovo V15 i5', sku: 'IT-LEN-V15', barcode: '6131600001008', price: 112000, description: 'Ordinateur portable pour direction, achats et forces de vente.' },
    { key: 'desktop', name: 'PC Bureau Dell OptiPlex', sku: 'IT-DELL-OPT', barcode: '6131600001009', price: 98000, description: 'Unité centrale bureautique pour comptabilité et accueil.' },
    { key: 'barcodeScanner', name: 'Lecteur code-barres Honeywell 2D', sku: 'POS-HON-2D', barcode: '6131600001010', price: 18500, description: 'Lecteur code-barres pour points de vente et gestion de stock.' },
    { key: 'cashDrawer', name: 'Tiroir-caisse métallique 41 cm', sku: 'POS-DRAW-41', barcode: '6131600001011', price: 12500, description: 'Tiroir-caisse robuste pour commerces et pharmacies.' },
    { key: 'labelPrinter', name: 'Imprimante étiquettes Zebra ZD220', sku: 'POS-ZEB-ZD220', barcode: '6131600001012', price: 22800, description: 'Imprimante d\'étiquettes pour stock, codes internes et rayons.' },
    { key: 'cctvKit', name: 'Kit vidéosurveillance Dahua 4 caméras', sku: 'SEC-DAH-4C', barcode: '6131600001013', price: 44500, description: 'Kit de sécurité pour commerce de proximité et entrepôt léger.' },
    { key: 'posTerminal', name: 'Terminal point de vente Android 15"', sku: 'POS-AND-15', barcode: '6131600001014', price: 69000, description: 'Terminal de caisse tactile pour commerce de détail.' },
    { key: 'networkCabinet', name: 'Baie réseau murale 9U', sku: 'NET-CAB-9U', barcode: '6131600001015', price: 29500, description: 'Baie murale pour ranger switch, routeur et brassage réseau.' },
  ]
  const users: Record<string, any> = {}
  for (const seed of userSeeds) users[seed.key] = await tx.user.create({ data: { email: seed.email, password: seed.password, fullName: seed.fullName, role: seed.role, isActive: true, createdAt: seed.createdAt } })
  const clients: Record<string, any> = {}
  for (const seed of clientSeeds) clients[seed.key] = await tx.client.create({ data: { ...seed.data, userId: users.admin.id, createdAt: daysAgo(100) } })
  const suppliers: Record<string, any> = {}
  for (const seed of supplierSeeds) suppliers[seed.key] = await tx.supplier.create({ data: { ...seed.data, userId: users.admin.id, createdAt: daysAgo(110) } })
  const products: Record<string, any> = {}
  for (const seed of productSeeds) products[seed.key] = await tx.product.create({ data: { name: seed.name, description: `${seed.description} Prix public HT en ${CURRENCY}. TVA standard ${TVA_RATE}%.`, price: seed.price, sku: seed.sku, barcode: seed.barcode, tvaRate: TVA_RATE, userId: users.admin.id, createdAt: daysAgo(95) } })

  const purchaseSeeds = [
    { purchaseNumber: 'ACH-2026-0001', supplier: 'techDistribution', createdAt: daysAgo(80), items: [{ product: 'router', quantity: 24, unitPrice: 6800 }, { product: 'switch', quantity: 20, unitPrice: 4400 }, { product: 'networkCabinet', quantity: 5, unitPrice: 21000 }] },
    { purchaseNumber: 'ACH-2026-0002', supplier: 'bureauPlus', createdAt: daysAgo(68), items: [{ product: 'paper', quantity: 260, unitPrice: 540 }, { product: 'toner', quantity: 90, unitPrice: 5100 }, { product: 'labelPrinter', quantity: 10, unitPrice: 16500 }] },
    { purchaseNumber: 'ACH-2026-0003', supplier: 'electroSud', createdAt: daysAgo(55), items: [{ product: 'ups', quantity: 12, unitPrice: 15800 }, { product: 'cctvKit', quantity: 8, unitPrice: 31800 }] },
    { purchaseNumber: 'ACH-2026-0004', supplier: 'microSystems', createdAt: daysAgo(42), items: [{ product: 'printer', quantity: 24, unitPrice: 29500 }, { product: 'scanner', quantity: 6, unitPrice: 37200 }, { product: 'barcodeScanner', quantity: 14, unitPrice: 12300 }] },
    { purchaseNumber: 'ACH-2026-0005', supplier: 'digitalOffice', createdAt: daysAgo(30), items: [{ product: 'laptop', quantity: 8, unitPrice: 84000 }, { product: 'desktop', quantity: 10, unitPrice: 73000 }, { product: 'cashDrawer', quantity: 12, unitPrice: 8700 }] },
    { purchaseNumber: 'ACH-2026-0006', supplier: 'saharaRetail', createdAt: daysAgo(18), items: [{ product: 'posTerminal', quantity: 10, unitPrice: 51500 }] },
  ]
  // Les achats constituent la source d'entrée du stock disponible.
  const purchaseQtyByProduct: Record<string, number> = {}
  for (const purchase of purchaseSeeds) {
    const totals = totalFromLines(purchase.items)
    await tx.purchase.create({ data: { purchaseNumber: purchase.purchaseNumber, status: 'received', total: totals.total, userId: users.admin.id, supplierId: suppliers[purchase.supplier].id, createdAt: purchase.createdAt, items: { create: purchase.items.map((item) => { purchaseQtyByProduct[item.product] = (purchaseQtyByProduct[item.product] || 0) + item.quantity; return { quantity: item.quantity, unitPrice: item.unitPrice, total: round2(item.quantity * item.unitPrice), productId: products[item.product].id, createdAt: purchase.createdAt } }) } } })
  }

  const quoteSeeds = [
    { key: 'quoteTizi', quoteNumber: 'DEV-2026-0001', status: 'draft', client: 'tiziPrint', createdAt: daysAgo(20), validUntil: daysFromNow(10), notes: `Devis bureautique exprimé en ${CURRENCY}.`, items: [{ product: 'router', quantity: 2, unitPrice: 9500 }, { product: 'switch', quantity: 1, unitPrice: 6200 }] },
    { key: 'quoteNumidia', quoteNumber: 'DEV-2026-0002', status: 'accepted', client: 'numidia', createdAt: daysAgo(18), validUntil: daysFromNow(8), notes: 'Devis accepté pour fourniture consommables et étiquetage.', items: [{ product: 'paper', quantity: 60, unitPrice: 780 }, { product: 'toner', quantity: 6, unitPrice: 6500 }, { product: 'labelPrinter', quantity: 1, unitPrice: 22800 }] },
    { key: 'quoteSahara', quoteNumber: 'DEV-2026-0003', status: 'accepted', client: 'saharaEnergy', createdAt: daysAgo(16), validUntil: daysFromNow(9), notes: 'Devis accepté pour infrastructure réseau de base.', items: [{ product: 'networkCabinet', quantity: 1, unitPrice: 29500 }, { product: 'switch', quantity: 2, unitPrice: 6200 }, { product: 'router', quantity: 1, unitPrice: 9500 }] },
    { key: 'quoteAnnaba', quoteNumber: 'DEV-2026-0004', status: 'sent', client: 'annabaMed', createdAt: daysAgo(14), validUntil: daysFromNow(12), notes: 'Devis envoyé pour poste d\'accueil et numérisation.', items: [{ product: 'printer', quantity: 1, unitPrice: 36500 }, { product: 'scanner', quantity: 1, unitPrice: 48000 }, { product: 'barcodeScanner', quantity: 2, unitPrice: 18500 }] },
    { key: 'quoteCosmos', quoteNumber: 'DEV-2026-0005', status: 'accepted', client: 'cosmosMarket', createdAt: daysAgo(12), validUntil: daysFromNow(7), notes: 'Devis accepté pour équipement de caisse.', items: [{ product: 'posTerminal', quantity: 1, unitPrice: 69000 }, { product: 'cashDrawer', quantity: 2, unitPrice: 12500 }, { product: 'barcodeScanner', quantity: 2, unitPrice: 18500 }] },
  ]
  const quotes: Record<string, any> = {}
  for (const quote of quoteSeeds) {
    const totals = totalFromLines(quote.items)
    quotes[quote.key] = await tx.quote.create({ data: { quoteNumber: quote.quoteNumber, status: quote.status, total: totals.total, totalHT: totals.subtotal, totalTTC: totals.total, tvaAmount: totals.tvaAmount, validUntil: quote.validUntil, notes: `${quote.notes} TVA ${TVA_RATE}% incluse dans le calcul TTC.`, userId: users.admin.id, clientId: clients[quote.client].id, createdAt: quote.createdAt, items: { create: quote.items.map((item) => ({ quantity: item.quantity, price: item.unitPrice, discount: 0, productId: products[item.product].id, createdAt: quote.createdAt })) } } })
  }

  const orderSeeds = [
    { key: 'orderElAmel', orderNumber: 'CMD-2026-0001', status: 'confirmed', client: 'elAmel', createdAt: daysAgo(22), deliveryDate: daysAgo(18), notes: `Commande livrée et facturée en ${CURRENCY}.`, items: [{ product: 'printer', quantity: 2, unitPrice: 36500 }, { product: 'toner', quantity: 8, unitPrice: 6500 }, { product: 'paper', quantity: 30, unitPrice: 780 }] },
    { key: 'orderIbnSina', orderNumber: 'CMD-2026-0002', status: 'pending', client: 'ibnSina', createdAt: daysAgo(14), deliveryDate: daysFromNow(2), notes: 'Commande en attente de règlement avant expédition.', items: [{ product: 'router', quantity: 2, unitPrice: 9500 }, { product: 'switch', quantity: 1, unitPrice: 6200 }, { product: 'ups', quantity: 1, unitPrice: 21500 }] },
    { key: 'orderNumidia', orderNumber: 'CMD-2026-0003', status: 'confirmed', client: 'numidia', quoteKey: 'quoteNumidia', createdAt: daysAgo(12), deliveryDate: daysAgo(10), notes: 'Commande issue d\'un devis accepté, livrée au service achats.', items: [{ product: 'paper', quantity: 60, unitPrice: 780 }, { product: 'toner', quantity: 6, unitPrice: 6500 }, { product: 'labelPrinter', quantity: 1, unitPrice: 22800 }] },
    { key: 'orderCosmos', orderNumber: 'CMD-2026-0004', status: 'confirmed', client: 'cosmosMarket', quoteKey: 'quoteCosmos', createdAt: daysAgo(9), deliveryDate: daysAgo(6), notes: 'Commande caisse et code-barres soldée après installation.', items: [{ product: 'posTerminal', quantity: 1, unitPrice: 69000 }, { product: 'cashDrawer', quantity: 2, unitPrice: 12500 }, { product: 'barcodeScanner', quantity: 2, unitPrice: 18500 }] },
    { key: 'orderAnnaba', orderNumber: 'CMD-2026-0005', status: 'pending', client: 'annabaMed', createdAt: daysAgo(7), deliveryDate: daysFromNow(4), notes: 'Commande à programmer après validation budgétaire.', items: [{ product: 'laptop', quantity: 2, unitPrice: 112000 }, { product: 'printer', quantity: 1, unitPrice: 36500 }, { product: 'cctvKit', quantity: 1, unitPrice: 44500 }] },
    { key: 'orderSahara', orderNumber: 'CMD-2026-0006', status: 'confirmed', client: 'saharaEnergy', quoteKey: 'quoteSahara', createdAt: daysAgo(5), deliveryDate: daysFromNow(5), notes: 'Commande réseau planifiée sur site de Ouargla.', items: [{ product: 'networkCabinet', quantity: 1, unitPrice: 29500 }, { product: 'switch', quantity: 2, unitPrice: 6200 }, { product: 'router', quantity: 1, unitPrice: 9500 }] },
  ]
  const orders: Record<string, any> = {}
  for (const order of orderSeeds) {
    if (order.quoteKey && quoteSeeds.find((quote) => quote.key === order.quoteKey)?.status !== 'accepted') {
      throw new Error(`Une commande ne peut référencer qu'un devis accepté : ${order.orderNumber}`)
    }
    const totals = totalFromLines(order.items)
    orders[order.key] = await tx.order.create({ data: { orderNumber: order.orderNumber, status: order.status, total: totals.total, totalHT: totals.subtotal, totalTTC: totals.total, tvaAmount: totals.tvaAmount, deliveryDate: order.deliveryDate, notes: `${order.notes} TVA ${TVA_RATE}% appliquée.`, userId: users.admin.id, clientId: clients[order.client].id, quoteId: order.quoteKey ? quotes[order.quoteKey].id : undefined, createdAt: order.createdAt, items: { create: order.items.map((item) => ({ quantity: item.quantity, price: item.unitPrice, productId: products[item.product].id, createdAt: order.createdAt })) } }, include: { items: true } })
  }

  const deliverySeeds = [
    { deliveryNumber: 'LIV-2026-0001', status: 'delivered', orderKey: 'orderElAmel', createdAt: daysAgo(18), deliveryDate: daysAgo(18), trackingNumber: 'BL-ALGER-0001', notes: 'Livraison complète sur Alger centre.' },
    { deliveryNumber: 'LIV-2026-0002', status: 'delivered', orderKey: 'orderNumidia', createdAt: daysAgo(10), deliveryDate: daysAgo(10), trackingNumber: 'BL-CONSTANTINE-0002', notes: 'Livraison réceptionnée par le service achats.' },
    { deliveryNumber: 'LIV-2026-0003', status: 'delivered', orderKey: 'orderCosmos', createdAt: daysAgo(6), deliveryDate: daysAgo(6), trackingNumber: 'BL-BLIDA-0003', notes: 'Installation et livraison validées en point de vente.' },
  ]
  // Les quantités livrées aux clients sont retranchées du stock théorique.
  const deliveredQtyByProduct: Record<string, number> = {}
  for (const delivery of deliverySeeds) {
    const order = orders[delivery.orderKey]
    await tx.delivery.create({ data: { deliveryNumber: delivery.deliveryNumber, status: delivery.status, deliveryDate: delivery.deliveryDate, trackingNumber: delivery.trackingNumber, notes: delivery.notes, orderId: order.id, createdAt: delivery.createdAt, items: { create: order.items.map((item: any) => { const productKey = Object.keys(products).find((key) => products[key].id === item.productId) || ''; deliveredQtyByProduct[productKey] = (deliveredQtyByProduct[productKey] || 0) + item.quantity; return { quantity: item.quantity, productId: item.productId, createdAt: delivery.createdAt } }) } } })
  }
  for (const product of productSeeds) {
    const quantity = (purchaseQtyByProduct[product.key] || 0) - (deliveredQtyByProduct[product.key] || 0)
    if (quantity < 0) throw new Error(`Stock négatif détecté pour ${product.key}`)
    await tx.stock.create({ data: { quantity, userId: users.admin.id, productId: products[product.key].id, createdAt: daysAgo(1) } })
  }

  const invoiceSeeds = [
    { key: 'invoiceElAmel', invoiceNumber: 'FAC-202603-0001', status: 'paid', orderKey: 'orderElAmel', client: 'elAmel', createdAt: daysAgo(21), dueDate: daysAgo(8), paidDate: daysAgo(7), notes: `Facture réglée par virement en ${CURRENCY}.` },
    { key: 'invoiceIbnSina', invoiceNumber: 'FAC-202603-0002', status: 'overdue', orderKey: 'orderIbnSina', client: 'ibnSina', createdAt: daysAgo(13), dueDate: daysAgo(1), notes: 'Facture échue, relance client nécessaire.' },
    { key: 'invoiceNumidia', invoiceNumber: 'FAC-202603-0003', status: 'partial', orderKey: 'orderNumidia', client: 'numidia', createdAt: daysAgo(11), dueDate: daysFromNow(5), notes: `Facture partiellement réglée en ${CURRENCY}.` },
    { key: 'invoiceCosmos', invoiceNumber: 'FAC-202603-0004', status: 'paid', orderKey: 'orderCosmos', client: 'cosmosMarket', createdAt: daysAgo(8), dueDate: daysAgo(2), paidDate: daysAgo(1), notes: 'Facture soldée après installation du point de vente.' },
    { key: 'invoiceAnnaba', invoiceNumber: 'FAC-202603-0005', status: 'issued', orderKey: 'orderAnnaba', client: 'annabaMed', createdAt: daysAgo(6), dueDate: daysFromNow(10), notes: 'Facture émise, livraison à planifier après accord final.' },
    { key: 'invoiceSahara', invoiceNumber: 'FAC-202603-0006', status: 'partial', orderKey: 'orderSahara', client: 'saharaEnergy', createdAt: daysAgo(4), dueDate: daysFromNow(12), notes: 'Facture avec acompte avant intervention sur site.' },
  ]
  const invoices: Record<string, any> = {}
  for (const invoice of invoiceSeeds) {
    const order = orders[invoice.orderKey]
    invoices[invoice.key] = await tx.invoice.create({ data: { invoiceNumber: invoice.invoiceNumber, status: invoice.status, total: order.total, totalHT: order.totalHT, totalTTC: order.totalTTC, tvaAmount: order.tvaAmount, dueDate: invoice.dueDate, paidDate: invoice.paidDate, notes: `${invoice.notes} TVA ${TVA_RATE}% appliquée.`, userId: users.admin.id, clientId: clients[invoice.client].id, orderId: order.id, createdAt: invoice.createdAt } })
  }

  const paymentSeeds = [
    { paymentNumber: 'PAY-2026-0001', invoiceKey: 'invoiceElAmel', amount: invoices.invoiceElAmel.total, paymentMethod: 'TRANSFER', paymentDate: daysAgo(7), reference: 'VIR-BEA-240301', notes: `Règlement intégral en ${CURRENCY}.` },
    { paymentNumber: 'PAY-2026-0002', invoiceKey: 'invoiceNumidia', amount: 50000, paymentMethod: 'CASH', paymentDate: daysAgo(3), reference: 'CAISSE-0012', notes: `Acompte partiel en ${CURRENCY}.` },
    { paymentNumber: 'PAY-2026-0003', invoiceKey: 'invoiceCosmos', amount: 50000, paymentMethod: 'TRANSFER', paymentDate: daysAgo(2), reference: 'VIR-BDL-0008', notes: 'Premier règlement du point de vente.' },
    { paymentNumber: 'PAY-2026-0004', invoiceKey: 'invoiceCosmos', amount: round2(invoices.invoiceCosmos.total - 50000), paymentMethod: 'CARD', paymentDate: daysAgo(1), reference: 'TPE-COSMOS-441', notes: 'Solde final réglé par carte.' },
    { paymentNumber: 'PAY-2026-0005', invoiceKey: 'invoiceSahara', amount: 40000, paymentMethod: 'CHECK', paymentDate: daysAgo(1), reference: 'CHQ-BNA-0091', notes: `Acompte chantier en ${CURRENCY}.` },
  ]
  // Vérifications métier : pas de surpaiement, et cohérence entre statut de facture et règlements.
  const paymentTotalsByInvoice = paymentSeeds.reduce<Record<string, number>>((acc, payment) => {
    acc[payment.invoiceKey] = round2((acc[payment.invoiceKey] || 0) + payment.amount)
    return acc
  }, {})
  for (const invoice of invoiceSeeds) {
    const totalPaid = paymentTotalsByInvoice[invoice.key] || 0
    const invoiceTotal = Number(invoices[invoice.key].total)
    if (totalPaid > invoiceTotal) throw new Error(`Surpaiement détecté pour ${invoice.invoiceNumber}`)
    if (invoice.status === 'paid' && round2(totalPaid) !== round2(invoiceTotal)) throw new Error(`Facture payée incohérente : ${invoice.invoiceNumber}`)
    if (invoice.status === 'partial' && !(totalPaid > 0 && totalPaid < invoiceTotal)) throw new Error(`Facture partielle incohérente : ${invoice.invoiceNumber}`)
    if ((invoice.status === 'issued' || invoice.status === 'overdue') && totalPaid !== 0) throw new Error(`Facture sans paiement attendue mais créditée : ${invoice.invoiceNumber}`)
  }
  await tx.payment.createMany({ data: paymentSeeds.map((payment) => ({ paymentNumber: payment.paymentNumber, amount: payment.amount, paymentMethod: payment.paymentMethod, paymentDate: payment.paymentDate, reference: payment.reference, notes: payment.notes, invoiceId: invoices[payment.invoiceKey].id, userId: users.admin.id, createdAt: payment.paymentDate })) })

  let entrySequence = 1
  const accountingEntries: any[] = []
  const pushEntry = (description: string, debitAmount: number | null, creditAmount: number | null, accountCode: string, entryDate: Date, invoiceId: string) => accountingEntries.push({ entryNumber: `ECR-2026-${String(entrySequence++).padStart(4, '0')}`, description: `${description} (${CURRENCY})`, debitAmount, creditAmount, accountCode, entryDate, invoiceId, userId: users.admin.id, createdAt: entryDate })
  for (const invoice of Object.values(invoices)) { pushEntry(`Créance client ${invoice.invoiceNumber}`, invoice.total, null, '411000', invoice.createdAt, invoice.id); pushEntry(`Vente HT ${invoice.invoiceNumber}`, null, invoice.totalHT, '707000', invoice.createdAt, invoice.id); pushEntry(`TVA collectée ${invoice.invoiceNumber}`, null, invoice.tvaAmount, '445700', invoice.createdAt, invoice.id) }
  for (const payment of paymentSeeds) { const invoice = invoices[payment.invoiceKey]; const accountCode = payment.paymentMethod === 'CASH' ? '530000' : payment.paymentMethod === 'CARD' ? '511200' : payment.paymentMethod === 'CHECK' ? '511500' : '512000'; pushEntry(`Encaissement ${invoice.invoiceNumber}`, payment.amount, null, accountCode, payment.paymentDate, invoice.id); pushEntry(`Extourne client ${invoice.invoiceNumber}`, null, payment.amount, '411000', payment.paymentDate, invoice.id) }
  await tx.accountingEntry.createMany({ data: accountingEntries })
  await tx.kpiTargetSettings.create({ data: { scopeId: users.admin.id, revenueTarget: 1800000, ordersTarget: 30, clientsTarget: 60, conversionRateTarget: 38 } })
  return { adminEmail: ADMIN_EMAIL, adminPassword: ADMIN_PASSWORD, expectedCounts: { users: userSeeds.length, clients: clientSeeds.length, suppliers: supplierSeeds.length, products: productSeeds.length, stocks: productSeeds.length, quotes: quoteSeeds.length, orders: orderSeeds.length, invoices: invoiceSeeds.length, payments: paymentSeeds.length, purchases: purchaseSeeds.length, deliveries: deliverySeeds.length, accountingEntries: accountingEntries.length, kpis: 1 } }
}

async function main() {
  assertDevelopmentTarget()
  const currentCounts = await readCurrentCounts()
  console.log('🌱 Seed de développement Algérie / schéma Prisma actif')
  console.log(`💱 Devise: ${CURRENCY} | TVA standard: ${TVA_RATE}%`)
  console.log('📊 Données actuelles:', currentCounts)
  if (dryRun) {
    console.log('🛑 Dry-run uniquement : aucune donnée n’a été supprimée.')
    console.log('📦 Jeu de données prévu: { users: 6, clients: 10, suppliers: 6, products: 15, stocks: 15, purchases: 6, quotes: 5, orders: 6, invoices: 6, payments: 5, deliveries: 3, accountingEntries: 28, kpis: 1 }')
    console.log('👉 Pour exécuter le reset + seed en dev : pnpm --filter @gestion/backend db:seed:dev')
    return
  }
  const result = await prisma.$transaction(async (tx) => { await resetDatabase(tx); return seedDataset(tx) }, { timeout: 180000 })
  const finalCounts = await readCurrentCounts()
  console.log('✅ Reset + seed terminés avec succès')
  console.log('📦 Données finales:', finalCounts)
  console.log('🎯 Données attendues:', result.expectedCounts)
  console.log(`🔐 Compte principal conservé: ${result.adminEmail} / ${result.adminPassword}`)
}

main().catch((error) => {
  console.error('❌ Erreur seed développement:', error)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})

