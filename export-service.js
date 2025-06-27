/**
 * Service d'export PDF/Excel pour Gestion Commerciale TPE
 * Génération de documents professionnels avec templates algériens
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class ExportService {
  constructor() {
    this.companyInfo = {
      name: 'Votre Entreprise SARL',
      address: '123 Rue Didouche Mourad, Alger 16000',
      phone: '+213 21 XX XX XX',
      email: 'contact@votre-entreprise.dz',
      website: 'www.votre-entreprise.dz',
      nif: '000000000000000',
      nis: '000000000000000',
      rc: '00/00-0000000',
      logo: null // Chemin vers le logo
    };
  }

  /**
   * Génère un PDF de facture avec template algérien
   */
  async generateInvoicePDF(invoice, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // En-tête avec logo et informations entreprise
        this.addCompanyHeader(doc);
        
        // Informations facture
        this.addInvoiceHeader(doc, invoice);
        
        // Informations client
        this.addClientInfo(doc, invoice.client);
        
        // Tableau des articles
        this.addInvoiceItems(doc, invoice.items);
        
        // Totaux
        this.addInvoiceTotals(doc, invoice);
        
        // Pied de page
        this.addInvoiceFooter(doc);

        doc.end();
        
        stream.on('finish', () => {
          console.log('✅ PDF de facture généré:', outputPath);
          resolve(outputPath);
        });
        
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Ajoute l'en-tête de l'entreprise
   */
  addCompanyHeader(doc) {
    // Logo (si disponible)
    if (this.companyInfo.logo && fs.existsSync(this.companyInfo.logo)) {
      doc.image(this.companyInfo.logo, 50, 50, { width: 100 });
    }

    // Informations entreprise
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(this.companyInfo.name, 200, 50);
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(this.companyInfo.address, 200, 75)
       .text(`Tél: ${this.companyInfo.phone}`, 200, 90)
       .text(`Email: ${this.companyInfo.email}`, 200, 105)
       .text(`Site: ${this.companyInfo.website}`, 200, 120);

    // Numéros d'identification algériens
    doc.text(`NIF: ${this.companyInfo.nif}`, 400, 75)
       .text(`NIS: ${this.companyInfo.nis}`, 400, 90)
       .text(`RC: ${this.companyInfo.rc}`, 400, 105);

    // Ligne de séparation
    doc.moveTo(50, 150)
       .lineTo(550, 150)
       .stroke();
  }

  /**
   * Ajoute les informations de la facture
   */
  addInvoiceHeader(doc, invoice) {
    const yPos = 170;
    
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text(this.getInvoiceTypeLabel(invoice.type), 50, yPos);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Numéro: ${invoice.number}`, 400, yPos)
       .text(`Date: ${this.formatDate(invoice.invoiceDate)}`, 400, yPos + 20)
       .text(`Échéance: ${this.formatDate(invoice.dueDate)}`, 400, yPos + 40);

    if (invoice.orderNumber) {
      doc.text(`Commande: ${invoice.orderNumber}`, 400, yPos + 60);
    }
  }

  /**
   * Ajoute les informations du client
   */
  addClientInfo(doc, client) {
    const yPos = 250;
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('FACTURÉ À:', 50, yPos);

    doc.fontSize(10)
       .font('Helvetica');

    if (client.type === 'COMPANY') {
      doc.text(client.companyName, 50, yPos + 20)
         .text(`${client.firstName} ${client.lastName}`, 50, yPos + 35);
    } else {
      doc.text(`${client.firstName} ${client.lastName}`, 50, yPos + 20);
    }

    doc.text(client.address || '', 50, yPos + 50)
       .text(`${client.postalCode || ''} ${client.city || ''}`, 50, yPos + 65)
       .text(`Tél: ${client.phone || 'Non renseigné'}`, 50, yPos + 80)
       .text(`Email: ${client.email}`, 50, yPos + 95);
  }

  /**
   * Ajoute le tableau des articles
   */
  addInvoiceItems(doc, items) {
    const tableTop = 380;
    const itemHeight = 20;
    
    // En-têtes du tableau
    doc.fontSize(10)
       .font('Helvetica-Bold');
    
    doc.text('Désignation', 50, tableTop)
       .text('Qté', 300, tableTop)
       .text('Prix Unit. (DA)', 350, tableTop)
       .text('TVA', 450, tableTop)
       .text('Total (DA)', 500, tableTop);

    // Ligne sous les en-têtes
    doc.moveTo(50, tableTop + 15)
       .lineTo(550, tableTop + 15)
       .stroke();

    // Articles
    doc.font('Helvetica');
    let yPosition = tableTop + 25;

    items.forEach((item, index) => {
      const total = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      
      doc.text(item.product?.name || `Produit ${item.productId}`, 50, yPosition)
         .text(item.quantity.toString(), 300, yPosition)
         .text(this.formatCurrency(item.unitPrice), 350, yPosition)
         .text(`${item.vatRate}%`, 450, yPosition)
         .text(this.formatCurrency(total), 500, yPosition);

      yPosition += itemHeight;

      // Nouvelle page si nécessaire
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
    });

    return yPosition;
  }

  /**
   * Ajoute les totaux de la facture
   */
  addInvoiceTotals(doc, invoice) {
    const yPos = 600;
    
    // Cadre pour les totaux
    doc.rect(350, yPos - 10, 200, 100)
       .stroke();

    doc.fontSize(10)
       .font('Helvetica');

    doc.text('Sous-total HT:', 360, yPos)
       .text(this.formatCurrency(invoice.subtotal), 480, yPos);

    doc.text('TVA (19%):', 360, yPos + 20)
       .text(this.formatCurrency(invoice.vatAmount), 480, yPos + 20);

    if (invoice.discount > 0) {
      doc.text('Remise:', 360, yPos + 40)
         .text(`-${this.formatCurrency(invoice.discount)}`, 480, yPos + 40);
    }

    // Total TTC en gras
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('TOTAL TTC:', 360, yPos + 60)
       .text(this.formatCurrency(invoice.total), 480, yPos + 60);
  }

  /**
   * Ajoute le pied de page
   */
  addInvoiceFooter(doc) {
    const yPos = 720;
    
    doc.fontSize(8)
       .font('Helvetica')
       .text('Conditions de paiement: 30 jours net', 50, yPos)
       .text('TVA non applicable, art. 293 B du CGI', 50, yPos + 15)
       .text('En cas de retard de paiement, indemnité forfaitaire de 40€ + intérêts de retard', 50, yPos + 30);
  }

  /**
   * Génère un fichier Excel pour une liste de données
   */
  async generateExcelReport(data, type, outputPath) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(this.getSheetName(type));

      // Configuration du style
      this.setupExcelStyles(worksheet);

      // En-tête de l'entreprise
      this.addExcelCompanyHeader(worksheet);

      // Données selon le type
      switch (type) {
        case 'clients':
          this.addClientsToExcel(worksheet, data);
          break;
        case 'products':
          this.addProductsToExcel(worksheet, data);
          break;
        case 'orders':
          this.addOrdersToExcel(worksheet, data);
          break;
        case 'invoices':
          this.addInvoicesToExcel(worksheet, data);
          break;
        default:
          throw new Error(`Type de rapport non supporté: ${type}`);
      }

      await workbook.xlsx.writeFile(outputPath);
      console.log('✅ Fichier Excel généré:', outputPath);
      return outputPath;
    } catch (error) {
      console.error('❌ Erreur génération Excel:', error);
      throw error;
    }
  }

  /**
   * Configure les styles Excel
   */
  setupExcelStyles(worksheet) {
    // Style pour les en-têtes
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(1).alignment = { horizontal: 'center' };

    // Largeurs des colonnes (sera fait après l'ajout des données)
  }

  /**
   * Ajoute l'en-tête de l'entreprise dans Excel
   */
  addExcelCompanyHeader(worksheet) {
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = this.companyInfo.name;
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = `${this.companyInfo.address} - ${this.companyInfo.phone}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Ligne vide
    worksheet.addRow([]);
  }

  /**
   * Ajoute les clients au fichier Excel
   */
  addClientsToExcel(worksheet, clients) {
    // En-têtes
    const headers = ['Nom/Raison sociale', 'Email', 'Téléphone', 'Ville', 'Type', 'Date création'];
    worksheet.addRow(headers);

    // Style des en-têtes
    const headerRow = worksheet.lastRow;
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Données
    clients.forEach(client => {
      worksheet.addRow([
        client.type === 'COMPANY' ? (client.companyName || client.company_name) : `${client.firstName || client.first_name} ${client.lastName || client.last_name}`,
        client.email,
        client.phone || '',
        client.city || '',
        client.type === 'COMPANY' ? 'Entreprise' : 'Particulier',
        this.formatDate(client.createdAt || client.created_at)
      ]);
    });

    // Ajuster les largeurs des colonnes
    worksheet.columns = [
      { width: 25 }, // Nom/Raison sociale
      { width: 25 }, // Email
      { width: 15 }, // Téléphone
      { width: 15 }, // Ville
      { width: 12 }, // Type
      { width: 15 }  // Date création
    ];
  }

  /**
   * Ajoute les produits au fichier Excel
   */
  addProductsToExcel(worksheet, products) {
    // En-têtes
    const headers = ['Nom', 'Référence', 'Catégorie', 'Prix (DZD)', 'Stock', 'Prix d\'achat (DZD)', 'Description'];
    worksheet.addRow(headers);

    // Style des en-têtes
    const headerRow = worksheet.lastRow;
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Données
    products.forEach(product => {
      worksheet.addRow([
        product.name,
        product.reference || '',
        product.category || '',
        this.formatCurrency(product.price),
        product.track_stock ? `${product.stock || 0} ${product.unit || ''}` : 'Non suivi',
        product.cost_price ? this.formatCurrency(product.cost_price) : '',
        product.description || ''
      ]);
    });
  }

  /**
   * Ajoute les commandes au fichier Excel
   */
  addOrdersToExcel(worksheet, orders) {
    // En-têtes
    const headers = ['Numéro', 'Type', 'Client', 'Date', 'Statut', 'Total (DZD)'];
    worksheet.addRow(headers);

    // Style des en-têtes
    const headerRow = worksheet.lastRow;
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Données
    orders.forEach(order => {
      worksheet.addRow([
        order.number,
        order.type === 'QUOTE' ? 'Devis' : 'Commande',
        order.client_name || 'Client inconnu',
        this.formatDate(order.order_date),
        this.getOrderStatusLabel(order.status),
        this.formatCurrency(order.total)
      ]);
    });
  }

  /**
   * Ajoute les factures au fichier Excel
   */
  addInvoicesToExcel(worksheet, invoices) {
    // En-têtes
    const headers = ['Numéro', 'Type', 'Client', 'Date', 'Échéance', 'Statut', 'Total (DA)'];
    worksheet.addRow(headers);

    // Style des en-têtes
    const headerRow = worksheet.lastRow;
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Données
    invoices.forEach(invoice => {
      worksheet.addRow([
        invoice.number,
        this.getInvoiceTypeLabel(invoice.type),
        invoice.client_name || 'Client inconnu',
        this.formatDate(invoice.invoice_date),
        this.formatDate(invoice.due_date),
        this.getInvoiceStatusLabel(invoice.status),
        this.formatCurrency(invoice.total)
      ]);
    });
  }

  /**
   * Obtient le libellé du statut de commande
   */
  getOrderStatusLabel(status) {
    const labels = {
      'DRAFT': 'Brouillon',
      'SENT': 'Envoyée',
      'ACCEPTED': 'Acceptée',
      'REJECTED': 'Refusée',
      'CANCELLED': 'Annulée'
    };
    return labels[status] || status;
  }

  /**
   * Obtient le libellé du statut de facture
   */
  getInvoiceStatusLabel(status) {
    const labels = {
      'DRAFT': 'Brouillon',
      'SENT': 'Envoyée',
      'PAID': 'Payée',
      'PARTIAL': 'Partiellement payée',
      'OVERDUE': 'En retard',
      'CANCELLED': 'Annulée'
    };
    return labels[status] || status;
  }

  /**
   * Utilitaires de formatage
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('fr-DZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' DA';
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  getInvoiceTypeLabel(type) {
    const labels = {
      'INVOICE': 'FACTURE',
      'CREDIT_NOTE': 'AVOIR',
      'PROFORMA': 'FACTURE PROFORMA'
    };
    return labels[type] || 'DOCUMENT';
  }

  getSheetName(type) {
    const names = {
      'clients': 'Liste des Clients',
      'products': 'Liste des Produits',
      'orders': 'Liste des Commandes',
      'invoices': 'Liste des Factures'
    };
    return names[type] || 'Données';
  }
}

module.exports = ExportService;
