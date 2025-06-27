#!/usr/bin/env ts-node

/**
 * Script de test pour valider le module de gestion de stock
 * 
 * Ce script teste :
 * - La création de stocks
 * - La récupération de stocks avec filtres
 * - Les ajustements de stock
 * - Les alertes de stock
 * - La programmation défensive
 */

import { StockService } from '../src/services/stock.service'
import { prisma } from '@gestion/database'

interface TestResult {
  test: string
  success: boolean
  message: string
  data?: any
}

class StockModuleTester {
  private results: TestResult[] = []
  private companyId: string = ''
  private testProductId: string = ''

  async runAllTests(): Promise<void> {
    console.log('🧪 Démarrage des tests du module de stock...')
    console.log('=' .repeat(60))

    try {
      await this.setupTestData()
      await this.testCreateStock()
      await this.testGetStocks()
      await this.testGetStockById()
      await this.testUpdateStock()
      await this.testStockAlerts()
      await this.testDefensiveProgramming()
      await this.testStockFilters()
      
      this.displayResults()
    } catch (error) {
      console.error('💥 Erreur lors des tests:', error)
    } finally {
      await this.cleanup()
    }
  }

  private async setupTestData(): Promise<void> {
    console.log('📋 Configuration des données de test...')
    
    // Récupérer la première entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée pour les tests')
    }
    this.companyId = company.id

    // Créer un produit de test
    const testProduct = await prisma.product.create({
      data: {
        name: 'Produit Test Stock',
        sku: 'TEST-STOCK-001',
        price: 1500,
        cost: 1000,
        unit: 'pièce',
        companyId: this.companyId,
      }
    })
    this.testProductId = testProduct.id

    console.log(`✅ Données de test configurées (Entreprise: ${company.name})`)
  }

  private async testCreateStock(): Promise<void> {
    try {
      const stockData = {
        productId: this.testProductId,
        quantiteActuelle: 50,
        quantiteMinimale: 10,
        quantiteMaximale: 100,
      }

      const stock = await StockService.createStock(stockData, this.companyId)

      this.results.push({
        test: 'Création de stock',
        success: true,
        message: `Stock créé avec succès (ID: ${stock.id})`,
        data: { stockId: stock.id, quantite: stock.quantiteActuelle }
      })
    } catch (error: any) {
      this.results.push({
        test: 'Création de stock',
        success: false,
        message: `Erreur: ${error.message}`
      })
    }
  }

  private async testGetStocks(): Promise<void> {
    try {
      const result = await StockService.getStocks(this.companyId, {}, { page: 1, limit: 10 })

      const success = Array.isArray(result.data) && result.pagination.total >= 0

      this.results.push({
        test: 'Récupération des stocks',
        success,
        message: success 
          ? `${result.data.length} stock(s) récupéré(s), total: ${result.pagination.total}`
          : 'Erreur dans la structure des données retournées',
        data: { count: result.data.length, total: result.pagination.total }
      })
    } catch (error: any) {
      this.results.push({
        test: 'Récupération des stocks',
        success: false,
        message: `Erreur: ${error.message}`
      })
    }
  }

  private async testGetStockById(): Promise<void> {
    try {
      // Récupérer le premier stock
      const stocks = await StockService.getStocks(this.companyId, {}, { page: 1, limit: 1 })
      
      if (stocks.data.length === 0) {
        this.results.push({
          test: 'Récupération stock par ID',
          success: false,
          message: 'Aucun stock disponible pour le test'
        })
        return
      }

      const stockId = stocks.data[0].id
      const stock = await StockService.getStockById(stockId, this.companyId)

      this.results.push({
        test: 'Récupération stock par ID',
        success: stock !== null,
        message: stock 
          ? `Stock récupéré avec succès (${stock.product?.name})`
          : 'Stock non trouvé',
        data: stock ? { id: stock.id, productName: stock.product?.name } : null
      })
    } catch (error: any) {
      this.results.push({
        test: 'Récupération stock par ID',
        success: false,
        message: `Erreur: ${error.message}`
      })
    }
  }

  private async testUpdateStock(): Promise<void> {
    try {
      // Récupérer le premier stock
      const stocks = await StockService.getStocks(this.companyId, {}, { page: 1, limit: 1 })
      
      if (stocks.data.length === 0) {
        this.results.push({
          test: 'Mise à jour de stock',
          success: false,
          message: 'Aucun stock disponible pour le test'
        })
        return
      }

      const stockId = stocks.data[0].id
      const originalQuantity = stocks.data[0].quantiteActuelle
      const newQuantity = originalQuantity + 10

      const updatedStock = await StockService.updateStock(stockId, {
        quantiteActuelle: newQuantity
      }, this.companyId)

      this.results.push({
        test: 'Mise à jour de stock',
        success: updatedStock.quantiteActuelle === newQuantity,
        message: `Quantité mise à jour: ${originalQuantity} → ${updatedStock.quantiteActuelle}`,
        data: { before: originalQuantity, after: updatedStock.quantiteActuelle }
      })
    } catch (error: any) {
      this.results.push({
        test: 'Mise à jour de stock',
        success: false,
        message: `Erreur: ${error.message}`
      })
    }
  }

  private async testStockAlerts(): Promise<void> {
    try {
      const alerts = await StockService.getStockAlerts(this.companyId)

      const success = alerts && 
        Array.isArray(alerts.lowStock) && 
        Array.isArray(alerts.outOfStock) &&
        typeof alerts.totalAlerts === 'number'

      this.results.push({
        test: 'Alertes de stock',
        success,
        message: success 
          ? `Alertes récupérées: ${alerts.totalAlerts} total (${alerts.lowStock.length} stock faible, ${alerts.outOfStock.length} rupture)`
          : 'Structure des alertes incorrecte',
        data: success ? {
          total: alerts.totalAlerts,
          lowStock: alerts.lowStock.length,
          outOfStock: alerts.outOfStock.length
        } : null
      })
    } catch (error: any) {
      this.results.push({
        test: 'Alertes de stock',
        success: false,
        message: `Erreur: ${error.message}`
      })
    }
  }

  private async testDefensiveProgramming(): Promise<void> {
    try {
      // Test avec des données nulles/undefined
      const result1 = await StockService.getStocks(this.companyId, {}, { page: 1, limit: 10 })
      const isArray1 = Array.isArray(result1.data)

      // Test avec des filtres vides
      const result2 = await StockService.getStocks(this.companyId, {
        search: '',
        lowStock: false,
        outOfStock: false
      }, { page: 1, limit: 10 })
      const isArray2 = Array.isArray(result2.data)

      this.results.push({
        test: 'Programmation défensive',
        success: isArray1 && isArray2,
        message: isArray1 && isArray2 
          ? 'Tous les arrays sont correctement initialisés'
          : 'Problème avec l\'initialisation des arrays',
        data: { test1: isArray1, test2: isArray2 }
      })
    } catch (error: any) {
      this.results.push({
        test: 'Programmation défensive',
        success: false,
        message: `Erreur: ${error.message}`
      })
    }
  }

  private async testStockFilters(): Promise<void> {
    try {
      // Test filtre recherche
      const searchResult = await StockService.getStocks(this.companyId, {
        search: 'Test'
      }, { page: 1, limit: 10 })

      // Test filtre rupture de stock
      const outOfStockResult = await StockService.getStocks(this.companyId, {
        outOfStock: true
      }, { page: 1, limit: 10 })

      const success = Array.isArray(searchResult.data) && Array.isArray(outOfStockResult.data)

      this.results.push({
        test: 'Filtres de stock',
        success,
        message: success 
          ? `Filtres fonctionnels: recherche (${searchResult.data.length}), rupture (${outOfStockResult.data.length})`
          : 'Problème avec les filtres',
        data: {
          searchCount: searchResult.data.length,
          outOfStockCount: outOfStockResult.data.length
        }
      })
    } catch (error: any) {
      this.results.push({
        test: 'Filtres de stock',
        success: false,
        message: `Erreur: ${error.message}`
      })
    }
  }

  private displayResults(): void {
    console.log('\n📊 Résultats des tests:')
    console.log('=' .repeat(60))

    const successCount = this.results.filter(r => r.success).length
    const totalCount = this.results.length

    this.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌'
      console.log(`${icon} ${index + 1}. ${result.test}`)
      console.log(`   ${result.message}`)
      if (result.data) {
        console.log(`   Données: ${JSON.stringify(result.data)}`)
      }
      console.log('')
    })

    console.log('=' .repeat(60))
    console.log(`📈 Résumé: ${successCount}/${totalCount} tests réussis (${Math.round(successCount/totalCount*100)}%)`)
    
    if (successCount === totalCount) {
      console.log('🎉 Tous les tests sont passés avec succès!')
    } else {
      console.log('⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.')
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // Supprimer les données de test
      if (this.testProductId) {
        await prisma.stock.deleteMany({
          where: { productId: this.testProductId }
        })
        await prisma.product.delete({
          where: { id: this.testProductId }
        })
      }
      console.log('🧹 Nettoyage des données de test terminé')
    } catch (error) {
      console.error('⚠️  Erreur lors du nettoyage:', error)
    }
  }
}

// Exécuter les tests
async function main() {
  const tester = new StockModuleTester()
  await tester.runAllTests()
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('💥 Erreur fatale lors des tests:', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
