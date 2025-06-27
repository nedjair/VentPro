import { Prisma, Company, Client, Product, Invoice, Order, Supplier, ClientType } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

/**
 * Construit le nom complet d'un client en fonction de son type.
 * @param client - L'objet client.
 * @returns Le nom complet du client.
 */
const getClientFullName = (client: Client): string => {
  if (client.type === ClientType.INDIVIDUAL) {
    return `${client.firstName || ''} ${client.lastName || ''}`.trim();
  }
  return client.companyName || '';
};

export class ExportService {

  // =================================================================
  // EXCEL EXPORT
  // =================================================================

  /**
   * Génère un buffer Excel pour une liste de clients.
   * @param clients - La liste des clients à exporter.
   * @returns Un Buffer contenant le fichier Excel.
   */
  public static async generateClientsExcel(clients: Client[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestion Commerciale TPE';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Clients');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Nom Complet', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Téléphone', key: 'phone', width: 20 },
      { header: 'Adresse', key: 'address', width: 40 },
      { header: 'Ville', key: 'city', width: 20 },
      { header: 'Code Postal', key: 'postalCode', width: 15 },
      { header: 'Pays', key: 'country', width: 20 },
    ];

    // Style de l'en-tête
    worksheet.getRow(1).font = { bold: true };

    clients.forEach(client => {
      worksheet.addRow({
        ...client,
        name: getClientFullName(client),
      });
    });

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  /**
   * Génère un buffer Excel pour une liste de produits.
   * @param products - La liste des produits à exporter.
   * @returns Un Buffer contenant le fichier Excel.
   */
  public static async generateProductsExcel(products: Product[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestion Commerciale TPE';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Produits');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Nom', key: 'name', width: 40 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Prix', key: 'price', width: 15, style: { numFmt: '#,##0.00 DZD' } },
      { header: 'Stock', key: 'stockQuantity', width: 20 },
      { header: 'Unité', key: 'unit', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };

    products.forEach(product => {
      worksheet.addRow({
        ...product,
        price: product.price.toNumber(), // Convertir Decimal en nombre
      });
    });

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  /**
   * Génère un buffer Excel pour une liste de fournisseurs.
   * @param suppliers - La liste des fournisseurs à exporter.
   * @returns Un Buffer contenant le fichier Excel.
   */
  public static async generateSuppliersExcel(suppliers: Supplier[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestion Commerciale TPE';
    
    const worksheet = workbook.addWorksheet('Fournisseurs');
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Nom', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Téléphone', key: 'phone', width: 20 },
      { header: 'Ville', key: 'city', width: 20 },
      { header: 'Pays', key: 'country', width: 20 },
    ];
    worksheet.getRow(1).font = { bold: true };
    suppliers.forEach(s => worksheet.addRow(s));

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  /**
   * Génère un buffer Excel pour une liste de commandes.
   * @param orders - La liste des commandes à exporter.
   * @returns Un Buffer contenant le fichier Excel.
   */
  public static async generateOrdersExcel(orders: (Order & { client: { companyName?: string, firstName?: string, lastName?: string }, createdBy: { firstName: string, lastName: string }})[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Commandes');

    worksheet.columns = [
      { header: 'Numéro', key: 'number', width: 20 },
      { header: 'Client', key: 'clientName', width: 30 },
      { header: 'Date', key: 'orderDate', width: 15 },
      { header: 'Total HT', key: 'subtotal', width: 15, style: { numFmt: '#,##0.00' } },
      { header: 'Total TTC', key: 'total', width: 15, style: { numFmt: '#,##0.00' } },
      { header: 'Statut', key: 'status', width: 20 },
      { header: 'Créé par', key: 'createdByName', width: 25 },
    ];
    worksheet.getRow(1).font = { bold: true };

    orders.forEach(order => {
      worksheet.addRow({
        number: order.number,
        clientName: order.client.companyName || `${order.client.firstName} ${order.client.lastName}`,
        orderDate: order.orderDate,
        subtotal: order.subtotal,
        total: order.total,
        status: order.status,
        createdByName: `${order.createdBy.firstName} ${order.createdBy.lastName}`
      });
    });

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  /**
   * Génère un buffer Excel pour une liste de factures.
   * @param invoices - La liste des factures à exporter.
   * @returns Un Buffer contenant le fichier Excel.
   */
  public static async generateInvoicesExcel(invoices: (Invoice & { client: { name: string }})[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Factures');

    worksheet.columns = [
      { header: 'Numéro', key: 'number', width: 20 },
      { header: 'Client', key: 'clientName', width: 30 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Date d\'échéance', key: 'dueDate', width: 15 },
      { header: 'Total TTC', key: 'total', width: 15, style: { numFmt: '#,##0.00' } },
      { header: 'Statut', key: 'status', width: 20 },
    ];
    worksheet.getRow(1).font = { bold: true };

    invoices.forEach(invoice => {
      worksheet.addRow({
        number: invoice.number,
        clientName: invoice.client.name,
        date: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        total: invoice.total,
        status: invoice.status
      });
    });

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  // ... Autres méthodes d'exportation Excel pour les produits, commandes, etc. à ajouter ici
  
  // =================================================================
  // PDF EXPORT
  // =================================================================
  
  /**
   * Génère un buffer PDF pour une liste de clients.
   * @param clients - La liste des clients à exporter.
   * @param company - Les informations de l'entreprise pour le branding.
   * @returns Un Buffer contenant le fichier PDF.
   */
  public static async generateClientsPdf(clients: Client[], company: Company): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: any[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // En-tête du document
      doc
        .fontSize(20)
        .text(`Liste des Clients - ${company.name}`, { align: 'center' });
      doc.moveDown();

      // Table des clients
      const tableTop = doc.y;
      const itemX = 50;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Nom', itemX, tableTop);
      doc.text('Email', itemX + 150, tableTop);
      doc.text('Téléphone', itemX + 300, tableTop);
      doc.text('Ville', itemX + 400, tableTop);
      doc.font('Helvetica');
      
      let y = tableTop + 20;
      clients.forEach(client => {
        doc.text(getClientFullName(client), itemX, y);
        doc.text(client.email || '', itemX + 150, y);
        doc.text(client.phone || '', itemX + 300, y);
        doc.text(client.city || '', itemX + 400, y);
        y += 20;
        if (y > 750) { // Nouvelle page
          doc.addPage();
          y = 50;
        }
      });
      
      doc.end();
    });
  }

  /**
   * Génère un buffer PDF pour une liste de produits.
   * @param products - La liste des produits à exporter.
   * @param company - Les informations de l'entreprise pour le branding.
   * @returns Un Buffer contenant le fichier PDF.
   */
  public static async generateProductsPdf(products: Product[], company: Company): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: any[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.fontSize(20).text(`Liste des Produits - ${company.name}`, { align: 'center' });
      doc.moveDown();

      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Nom du Produit', 50, tableTop);
      doc.text('SKU', 250, tableTop);
      doc.text('Prix (DZD)', 350, tableTop, { width: 100, align: 'right' });
      doc.text('Stock', 450, tableTop, { width: 50, align: 'right' });
      doc.font('Helvetica');
      
      let y = tableTop + 20;
      products.forEach(product => {
        doc.text(product.name, 50, y);
        doc.text(product.sku || '', 250, y);
        doc.text(product.price.toFixed(2), 350, y, { width: 100, align: 'right' });
        doc.text(product.stockQuantity.toString(), 450, y, { width: 50, align: 'right' });
        y += 20;
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
      });
      
      doc.end();
    });
  }

  /**
   * Génère un buffer PDF pour une liste de fournisseurs.
   * @param suppliers - La liste des fournisseurs à exporter.
   * @param company - Les informations de l'entreprise pour le branding.
   * @returns Un Buffer contenant le fichier PDF.
   */
  public static async generateSuppliersPdf(suppliers: Supplier[], company: Company): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: any[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text(`Liste des Fournisseurs - ${company.name}`, { align: 'center' });
      doc.moveDown();

      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Nom', 50, tableTop);
      doc.text('Email', 200, tableTop);
      doc.text('Téléphone', 350, tableTop);
      doc.text('Ville', 450, tableTop);
      doc.font('Helvetica');

      let y = tableTop + 20;
      suppliers.forEach(s => {
        doc.text(s.name, 50, y);
        doc.text(s.email || '', 200, y);
        doc.text(s.phone || '', 350, y);
        doc.text(s.city || '', 450, y);
        y += 20;
        if (y > 750) { doc.addPage(); y = 50; }
      });
      
      doc.end();
    });
  }

  /**
   * Génère un buffer PDF pour une liste de commandes.
   * @param orders - La liste des commandes à exporter.
   * @param company - Les informations de l'entreprise.
   * @returns Un Buffer contenant le fichier PDF.
   */
  public static async generateOrdersPdf(orders: (Order & { client: { companyName?: string, firstName?: string, lastName?: string }})[], company: Company): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: any[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text(`Liste des Commandes - ${company.name}`, { align: 'center' });
      doc.moveDown();

      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Numéro', 50, tableTop);
      doc.text('Client', 150, tableTop);
      doc.text('Date', 280, tableTop);
      doc.text('Total TTC', 380, tableTop, { align: 'right' });
      doc.text('Statut', 480, tableTop);
      doc.font('Helvetica');

      let y = tableTop + 20;
      orders.forEach(order => {
        const clientName = order.client.companyName || `${order.client.firstName} ${order.client.lastName}`;
        doc.text(order.number, 50, y);
        doc.text(clientName, 150, y, { width: 120, ellipsis: true });
        doc.text(new Date(order.orderDate).toLocaleDateString('fr-FR'), 280, y);
        doc.text(order.total.toFixed(2), 380, y, { align: 'right' });
        doc.text(order.status, 480, y);
        y += 20;
        if (y > 750) { doc.addPage(); y = 50; }
      });
      
      doc.end();
    });
  }

  /**
   * Génère un buffer PDF pour une liste de factures.
   * @param invoices - La liste des factures à exporter.
   * @param company - Les informations de l'entreprise.
   * @returns Un Buffer contenant le fichier PDF.
   */
  public static async generateInvoicesPdf(invoices: (Invoice & { client: { name: string }})[], company: Company): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: any[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text(`Liste des Factures - ${company.name}`, { align: 'center' });
      doc.moveDown();

      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Numéro', 50, tableTop);
      doc.text('Client', 150, tableTop);
      doc.text('Date', 280, tableTop);
      doc.text('Date d\'échéance', 380, tableTop);
      doc.text('Total TTC', 480, tableTop, { align: 'right' });
      doc.font('Helvetica');

      let y = tableTop + 20;
      invoices.forEach(invoice => {
        const clientName = invoice.client.name;
        doc.text(invoice.number, 50, y);
        doc.text(clientName, 150, y, { width: 120, ellipsis: true });
        doc.text(new Date(invoice.invoiceDate).toLocaleDateString('fr-FR'), 280, y);
        doc.text(new Date(invoice.dueDate).toLocaleDateString('fr-FR'), 380, y);
        doc.text(invoice.total.toFixed(2), 480, y, { align: 'right' });
        y += 20;
        if (y > 750) { doc.addPage(); y = 50; }
      });
      
      doc.end();
    });
  }
} 