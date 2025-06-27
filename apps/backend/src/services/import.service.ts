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
} 