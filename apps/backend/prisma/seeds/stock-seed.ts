import { PrismaClient } from '../generated/client'

const prisma = new PrismaClient()

// Données de test algériennes pour les stocks
const algerianStockData = [
  // Produits alimentaires
  {
    productName: 'Couscous Ferrero 1kg',
    sku: 'COUSCOUS-1KG',
    quantiteActuelle: 45,
    quantiteMinimale: 10,
    quantiteMaximale: 100,
    unit: 'kg'
  },
  {
    productName: 'Huile Elio 1L',
    sku: 'HUILE-ELIO-1L',
    quantiteActuelle: 8, // Stock faible
    quantiteMinimale: 15,
    quantiteMaximale: 80,
    unit: 'L'
  },
  {
    productName: 'Thé Vert Palais des Thés 200g',
    sku: 'THE-VERT-200G',
    quantiteActuelle: 0, // Rupture de stock
    quantiteMinimale: 5,
    quantiteMaximale: 50,
    unit: 'paquet'
  },
  {
    productName: 'Semoule Fine Beblé 1kg',
    sku: 'SEMOULE-1KG',
    quantiteActuelle: 25,
    quantiteMinimale: 8,
    quantiteMaximale: 60,
    unit: 'kg'
  },
  {
    productName: 'Harissa Traditionnelle 200g',
    sku: 'HARISSA-200G',
    quantiteActuelle: 3, // Stock faible
    quantiteMinimale: 10,
    quantiteMaximale: 40,
    unit: 'pot'
  },

  // Produits d\'hygiène et cosmétiques
  {
    productName: 'Savon Doux Alger 100g',
    sku: 'SAVON-ALGER-100G',
    quantiteActuelle: 120,
    quantiteMinimale: 20,
    quantiteMaximale: 200,
    unit: 'pièce'
  },
  {
    productName: 'Shampoing Elvive 400ml',
    sku: 'SHAMPOING-400ML',
    quantiteActuelle: 15,
    quantiteMinimale: 12,
    quantiteMaximale: 60,
    unit: 'flacon'
  },
  {
    productName: 'Dentifrice Signal 75ml',
    sku: 'DENTIFRICE-75ML',
    quantiteActuelle: 0, // Rupture de stock
    quantiteMinimale: 8,
    quantiteMaximale: 50,
    unit: 'tube'
  },

  // Produits ménagers
  {
    productName: 'Lessive Ariel 3kg',
    sku: 'LESSIVE-ARIEL-3KG',
    quantiteActuelle: 18,
    quantiteMinimale: 15,
    quantiteMaximale: 80,
    unit: 'kg'
  },
  {
    productName: 'Liquide Vaisselle Fairy 500ml',
    sku: 'LIQUIDE-VAISSELLE-500ML',
    quantiteActuelle: 6, // Stock faible
    quantiteMinimale: 12,
    quantiteMaximale: 60,
    unit: 'flacon'
  },

  // Produits électroniques
  {
    productName: 'Chargeur USB-C Universel',
    sku: 'CHARGEUR-USBC',
    quantiteActuelle: 35,
    quantiteMinimale: 10,
    quantiteMaximale: 100,
    unit: 'pièce'
  },
  {
    productName: 'Écouteurs Bluetooth Samsung',
    sku: 'ECOUTEURS-BT-SAMSUNG',
    quantiteActuelle: 2, // Stock faible
    quantiteMinimale: 5,
    quantiteMaximale: 30,
    unit: 'paire'
  },

  // Produits de bureau
  {
    productName: 'Cahier 200 pages A4',
    sku: 'CAHIER-A4-200P',
    quantiteActuelle: 85,
    quantiteMinimale: 20,
    quantiteMaximale: 150,
    unit: 'pièce'
  },
  {
    productName: 'Stylo Bic Cristal Bleu',
    sku: 'STYLO-BIC-BLEU',
    quantiteActuelle: 0, // Rupture de stock
    quantiteMinimale: 25,
    quantiteMaximale: 200,
    unit: 'pièce'
  },
  {
    productName: 'Ramette Papier A4 500 feuilles',
    sku: 'PAPIER-A4-500F',
    quantiteActuelle: 12,
    quantiteMinimale: 8,
    quantiteMaximale: 50,
    unit: 'ramette'
  }
]

export async function seedStockData() {
  console.log('🌱 Début du seed des données de stock algériennes...')

  try {
    // Récupérer la première entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      console.error('❌ Aucune entreprise trouvée. Veuillez d\'abord créer une entreprise.')
      return
    }

    console.log(`📊 Création des stocks pour l'entreprise: ${company.name}`)

    let createdCount = 0
    let skippedCount = 0

    for (const stockData of algerianStockData) {
      try {
        // Chercher le produit par nom ou SKU
        const product = await prisma.product.findFirst({
          where: {
            OR: [
              { name: stockData.productName },
              { sku: stockData.sku }
            ],
            companyId: company.id
          }
        })

        if (!product) {
          console.log(`⚠️  Produit non trouvé: ${stockData.productName} - création ignorée`)
          skippedCount++
          continue
        }

        // Vérifier si un stock existe déjà pour ce produit
        const existingStock = await prisma.stock.findUnique({
          where: { productId: product.id }
        })

        if (existingStock) {
          console.log(`⚠️  Stock déjà existant pour: ${stockData.productName}`)
          skippedCount++
          continue
        }

        // Créer le stock
        const stock = await prisma.stock.create({
          data: {
            productId: product.id,
            companyId: company.id,
            quantiteActuelle: stockData.quantiteActuelle,
            quantiteMinimale: stockData.quantiteMinimale,
            quantiteMaximale: stockData.quantiteMaximale,
            dateLastUpdate: new Date()
          }
        })

        // Créer un mouvement de stock initial si la quantité > 0
        if (stockData.quantiteActuelle > 0) {
          await prisma.stockMovement.create({
            data: {
              type: 'IN',
              quantity: stockData.quantiteActuelle,
              reference: 'STOCK_INITIAL',
              comment: `Stock initial - Données de test algériennes`,
              productId: product.id
            }
          })
        }

        console.log(`✅ Stock créé pour: ${stockData.productName} (${stockData.quantiteActuelle} ${stockData.unit})`)
        createdCount++

      } catch (error) {
        console.error(`❌ Erreur lors de la création du stock pour ${stockData.productName}:`, error)
        skippedCount++
      }
    }

    console.log(`\n📈 Résumé du seed des stocks:`)
    console.log(`   ✅ Stocks créés: ${createdCount}`)
    console.log(`   ⚠️  Stocks ignorés: ${skippedCount}`)
    console.log(`   📊 Total traité: ${algerianStockData.length}`)

    // Afficher un résumé des alertes
    const alertsCount = await prisma.stock.count({
      where: {
        companyId: company.id,
        OR: [
          { quantiteActuelle: 0 }, // Rupture
          { quantiteActuelle: { lte: prisma.stock.fields.quantiteMinimale } } // Stock faible
        ]
      }
    })

    console.log(`\n🚨 Alertes de stock créées: ${alertsCount}`)
    console.log('🌱 Seed des données de stock terminé avec succès!')

  } catch (error) {
    console.error('❌ Erreur lors du seed des stocks:', error)
    throw error
  }
}

// Exécuter le seed si ce fichier est appelé directement
if (require.main === module) {
  seedStockData()
    .catch((error) => {
      console.error('❌ Erreur fatale lors du seed:', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
