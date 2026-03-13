import { ImportService } from '../services/import.service'
import ExcelJS from 'exceljs';
import { prisma, ClientType, Company } from '@gestion/database';
import { z } from 'zod';
import { ClientService, CreateClientData } from './client.service';
import { logger } from '../utils/logger';

// Schéma de validation pour une ligne du fichier d'import
const clientImportRowSchema = z.object({
  type: z.nativeEnum(ClientType),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email('Format email invalide').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
}).refine(data => {
    if (data.type === 'INDIVIDUAL') return !!data.firstName && !!data.lastName;
    if (data.type === 'COMPANY') return !!data.companyName;
    return false;
}, { message: "Le nom/prénom ou le nom de l'entreprise est requis selon le type." });

export class ImportService {
  /**
   * Importe des clients depuis un buffer de fichier Excel.
   */
  public static async importClientsFromExcel(fileBuffer: Buffer, companyId: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error("Le fichier Excel est vide ou corrompu.");
    }

    const successfulImports: CreateClientData[] = [];
    const errors: { row: number, message: string, data: any }[] = [];
    const headerRow = worksheet.getRow(1).values as string[];

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const rowData: any = {};
      
      (row.values as string[]).forEach((value, index) => {
          if(headerRow[index]) {
            rowData[headerRow[index]] = value;
          }
      });

      try {
        const validatedData = clientImportRowSchema.parse(rowData);

        // Vérifier l'unicité de l'email
        if (validatedData.email) {
          const existing = await prisma.client.findFirst({ where: { email: validatedData.email, companyId } });
          if (existing) {
            throw new Error(`Un client avec l'email '${validatedData.email}' existe déjà.`);
          }
        }
        
        successfulImports.push(validatedData as CreateClientData);

      } catch (error: any) {
        const message = error instanceof z.ZodError 
          ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          : error.message;
        errors.push({ row: i, message, data: rowData });
      }
    }

    // Insérer les clients validés en base de données
    if (successfulImports.length > 0) {
      await prisma.client.createMany({
        data: successfulImports.map(client => ({ ...client, companyId })),
        skipDuplicates: true, // Au cas où, même si on a vérifié
      });
    }

    return {
      success: errors.length === 0,
      totalRows: worksheet.rowCount - 1,
      successfulCount: successfulImports.length,
      errorCount: errors.length,
      errors,
    };
  }

  /**
   * Génère un template Excel pour l'importation selon le type
   */
  public async generateImportTemplate(type: string): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestion Commerciale TPE';
    workbook.created = new Date();

    switch (type) {
      case 'clients':
        return this.generateClientsTemplate(workbook);
      case 'products':
        return this.generateProductsTemplate(workbook);
      case 'suppliers':
        return this.generateSuppliersTemplate(workbook);
      case 'orders':
        return this.generateOrdersTemplate(workbook);
      case 'invoices':
        return this.generateInvoicesTemplate(workbook);
      default:
        throw new Error(`Type de template non supporté: ${type}`);
    }
  }

  /**
   * Génère le template Excel pour l'importation des clients
   */
  private generateClientsTemplate(workbook: ExcelJS.Workbook): ExcelJS.Workbook {
    const worksheet = workbook.addWorksheet('Clients');

    // Définir les colonnes
    worksheet.columns = [
      { header: 'Type*', key: 'type', width: 15 },
      { header: 'Prénom', key: 'firstName', width: 20 },
      { header: 'Nom', key: 'lastName', width: 20 },
      { header: 'Nom Entreprise', key: 'companyName', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Téléphone', key: 'phone', width: 20 },
      { header: 'Mobile', key: 'mobile', width: 20 },
      { header: 'Adresse', key: 'address', width: 40 },
      { header: 'Code Postal', key: 'postalCode', width: 15 },
      { header: 'Ville', key: 'city', width: 20 },
      { header: 'Pays', key: 'country', width: 20 },
      { header: 'Site Web', key: 'website', width: 30 },
      { header: 'Fax', key: 'fax', width: 20 },
      { header: 'SIRET', key: 'siret', width: 20 },
      { header: 'N° TVA', key: 'vatNumber', width: 20 },
      { header: 'Délai Paiement', key: 'paymentTerms', width: 15 },
      { header: 'Remise (%)', key: 'discount', width: 15 },
      { header: 'Limite Crédit', key: 'creditLimit', width: 15 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];

    // Styliser l'en-tête
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Ajouter des exemples de données
    worksheet.addRow({
      type: 'INDIVIDUAL',
      firstName: 'Ahmed',
      lastName: 'Benali',
      companyName: '',
      email: 'ahmed.benali@email.com',
      phone: '021123456',
      mobile: '0661234567',
      address: '123 Rue Didouche Mourad',
      postalCode: '16000',
      city: 'Alger',
      country: 'Algérie',
      website: '',
      fax: '',
      siret: '',
      vatNumber: '',
      paymentTerms: 30,
      discount: 0,
      creditLimit: 5000,
      notes: 'Client particulier'
    });

    worksheet.addRow({
      type: 'COMPANY',
      firstName: '',
      lastName: '',
      companyName: 'SARL TechnoAlger',
      email: 'contact@technoalger.dz',
      phone: '021456789',
      mobile: '0771234567',
      address: '456 Boulevard Krim Belkacem',
      postalCode: '16200',
      city: 'Alger',
      country: 'Algérie',
      website: 'www.technoalger.dz',
      fax: '021456790',
      siret: '12345678901234',
      vatNumber: 'DZ123456789',
      paymentTerms: 45,
      discount: 5,
      creditLimit: 50000,
      notes: 'Client entreprise - Secteur IT'
    });

    // Ajouter une feuille d'instructions
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.addRow(['INSTRUCTIONS POUR L\'IMPORTATION DES CLIENTS']);
    instructionsSheet.addRow(['']);
    instructionsSheet.addRow(['1. Remplissez les données dans la feuille "Clients"']);
    instructionsSheet.addRow(['2. Les champs marqués d\'un * sont obligatoires']);
    instructionsSheet.addRow(['3. Type: INDIVIDUAL ou COMPANY']);
    instructionsSheet.addRow(['4. Pour INDIVIDUAL: Prénom et Nom requis']);
    instructionsSheet.addRow(['5. Pour COMPANY: Nom Entreprise requis']);
    instructionsSheet.addRow(['6. Email doit être unique']);
    instructionsSheet.addRow(['7. Délai Paiement en jours (défaut: 30)']);
    instructionsSheet.addRow(['8. Remise en pourcentage (0-100)']);
    instructionsSheet.addRow(['9. Limite Crédit en DZD']);
    instructionsSheet.addRow(['']);
    instructionsSheet.addRow(['EXEMPLES DE DONNÉES VALIDES:']);
    instructionsSheet.addRow(['- Voir les exemples dans la feuille "Clients"']);

    // Styliser les instructions
    instructionsSheet.getRow(1).font = { bold: true, size: 14 };
    instructionsSheet.getColumn(1).width = 60;

    return workbook;
  }

  /**
   * Génère le template Excel pour l'importation des produits
   */
  private generateProductsTemplate(workbook: ExcelJS.Workbook): ExcelJS.Workbook {
    const worksheet = workbook.addWorksheet('Produits');

    worksheet.columns = [
      { header: 'Nom*', key: 'name', width: 30 },
      { header: 'SKU*', key: 'sku', width: 20 },
      { header: 'Prix*', key: 'price', width: 15 },
      { header: 'Stock', key: 'stockQuantity', width: 15 },
      { header: 'Unité', key: 'unit', width: 15 },
      { header: 'Catégorie', key: 'category', width: 20 },
      { header: 'TVA (%)', key: 'vatRate', width: 10 },
      { header: 'Statut', key: 'status', width: 15 }
    ];

    // Styliser l'en-tête
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };

    // Exemples
    worksheet.addRow({
      name: 'Ordinateur Portable',
      sku: 'LAPTOP001',
      price: 89999,
      stockQuantity: 25,
      unit: 'pièce',
      category: 'Informatique',
      vatRate: 19,
      status: 'ACTIVE'
    });

    return workbook;
  }

  /**
   * Templates pour les autres types (implémentation basique)
   */
  private generateSuppliersTemplate(workbook: ExcelJS.Workbook): ExcelJS.Workbook {
    const worksheet = workbook.addWorksheet('Fournisseurs');
    worksheet.columns = [
      { header: 'Nom*', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Téléphone', key: 'phone', width: 20 },
      { header: 'Ville', key: 'city', width: 20 }
    ];
    return workbook;
  }

  private generateOrdersTemplate(workbook: ExcelJS.Workbook): ExcelJS.Workbook {
    const worksheet = workbook.addWorksheet('Commandes');
    worksheet.columns = [
      { header: 'Client ID*', key: 'clientId', width: 30 },
      { header: 'Date*', key: 'date', width: 15 },
      { header: 'Statut', key: 'status', width: 15 }
    ];
    return workbook;
  }

  private generateInvoicesTemplate(workbook: ExcelJS.Workbook): ExcelJS.Workbook {
    const worksheet = workbook.addWorksheet('Factures');
    worksheet.columns = [
      { header: 'Numéro*', key: 'number', width: 20 },
      { header: 'Client ID*', key: 'clientId', width: 30 },
      { header: 'Date*', key: 'date', width: 15 }
    ];
    return workbook;
  }
}