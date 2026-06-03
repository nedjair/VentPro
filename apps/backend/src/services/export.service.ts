import { Company, Client, Product, Invoice, Order, Supplier } from '@gestion/database';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fetch from 'node-fetch';
import { prisma } from '../lib/prisma';

type ExportLineItem = {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
};

const toNumericValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as { toNumber: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDisplayDate = (value: unknown): string => {
  if (!value) {
    return 'N/A';
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('fr-FR');
};

const toDisplayText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

/**
 * Construit le nom complet d'un client en fonction de son type.
 * @param client - L'objet client.
 * @returns Le nom complet du client.
 */
const getClientFullName = (client: Client): string => {
  if (client.type === 'INDIVIDUAL') {
    return `${client.firstName || ''} ${client.lastName || ''}`.trim();
  }
  return client.companyName || '';
};

const getInvoiceClientName = (client: any): string => {
  if (!client) {
    return 'Client inconnu';
  }

  const companyName = String(client.companyName || '').trim();
  if (companyName) {
    return companyName;
  }

  const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
  if (fullName) {
    return fullName;
  }

  const legacyName = String(client.name || '').trim();
  if (legacyName) {
    return legacyName;
  }

  return 'Client inconnu';
};

const scoreBrokenEncoding = (value: string): number => {
  const mojibake = (value.match(/Ã|Â|�/g) || []).length;
  const controlChars = (value.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) || []).length;
  return mojibake * 3 + controlChars * 2;
};

const sanitizePdfText = (value: unknown): string => {
  const raw = value === null || value === undefined ? '' : String(value);
  const normalized = raw.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const repaired = Buffer.from(normalized, 'latin1').toString('utf8');
  return scoreBrokenEncoding(repaired) < scoreBrokenEncoding(normalized) ? repaired : normalized;
};

type PdfFontSelection = {
  regular: string;
  bold: string;
};

const cachedPdfFontSelection: { value?: PdfFontSelection } = {};

const resolvePdfFontSelection = (): PdfFontSelection => {
  if (cachedPdfFontSelection.value) {
    return cachedPdfFontSelection.value;
  }

  const regularCandidates = [
    process.env.PDF_FONT_REGULAR_PATH,
    path.join(process.cwd(), 'assets', 'fonts', 'NotoSans-Regular.ttf'),
    path.join(process.cwd(), 'apps', 'backend', 'assets', 'fonts', 'NotoSans-Regular.ttf'),
    path.join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'noto-sans-v27-latin-regular.ttf'),
    path.join(process.cwd(), '..', 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'noto-sans-v27-latin-regular.ttf'),
    'C:\\Windows\\Fonts\\arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ].filter(Boolean) as string[];

  const boldCandidates = [
    process.env.PDF_FONT_BOLD_PATH,
    path.join(process.cwd(), 'assets', 'fonts', 'NotoSans-Bold.ttf'),
    path.join(process.cwd(), 'apps', 'backend', 'assets', 'fonts', 'NotoSans-Bold.ttf'),
    'C:\\Windows\\Fonts\\arialbd.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  ].filter(Boolean) as string[];

  const regularPath = regularCandidates.find((candidate) => existsSync(candidate));
  const boldPath = boldCandidates.find((candidate) => existsSync(candidate));

  cachedPdfFontSelection.value = {
    regular: regularPath || 'Helvetica',
    bold: boldPath || regularPath || 'Helvetica-Bold',
  };

  return cachedPdfFontSelection.value;
};

const createPdfFontHelpers = (doc: PDFKit.PDFDocument) => {
  const selection = resolvePdfFontSelection();
  const regularAlias = selection.regular === 'Helvetica' ? 'Helvetica' : 'app-regular';
  const boldAlias = selection.bold === 'Helvetica-Bold' ? 'Helvetica-Bold' : 'app-bold';

  if (regularAlias === 'app-regular') {
    doc.registerFont(regularAlias, selection.regular);
  }
  if (boldAlias === 'app-bold') {
    doc.registerFont(boldAlias, selection.bold);
  }

  return {
    regular: () => doc.font(regularAlias),
    bold: () => doc.font(boldAlias),
  };
};

const MM_TO_PT = 2.834645669291339;
const A4_MARGIN_MM = 15;
const A4_MARGIN_PT = A4_MARGIN_MM * MM_TO_PT;

type CompanyInvoiceSettingsRow = {
  scope_id: string;
  company_name: string | null;
  address: string | null;
  city: string | null;
  wilaya: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  nif: string | null;
  rc: string | null;
  ai: string | null;
  logo_url: string | null;
  logo_base64: string | null;
  accent_color: string | null;
  vat_exempt: boolean | null;
  payment_terms: string | null;
  legal_notes: string | null;
};

type InvoiceCompanyProfile = {
  companyName: string;
  address: string;
  city: string;
  wilaya: string;
  postalCode: string;
  country: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  nif: string;
  rc: string;
  ai: string;
  logoUrl: string;
  logoBase64: string;
  accentColor: string;
  vatExempt: boolean;
  paymentTerms: string;
  legalNotes: string;
};

const normalizeText = (value: unknown): string => sanitizePdfText(value).trim();

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) {
      return normalized;
    }
  }
  return '';
};

const formatDateFr = (value: unknown): string => {
  if (!value) {
    return '-';
  }
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return normalizeText(value) || '-';
  }
  return new Intl.DateTimeFormat('fr-FR').format(date);
};

const formatDateCompact = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}${m}${d}`;
};

const formatAmountDa = (value: unknown): string => {
  const amount = toNumericValue(value);
  const formatted = new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} DA`;
};

const ensureHexColor = (value: unknown, fallback = '#2563EB'): string => {
  const raw = normalizeText(value);
  if (!raw) {
    return fallback;
  }
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : fallback;
};

const mapInvoiceStatusToFrench = (status: unknown): string => {
  const code = normalizeText(status).toUpperCase();
  if (code === 'DRAFT') return 'BROUILLON';
  if (code === 'SENT' || code === 'ISSUED') return 'ENVOYÉE';
  if (code === 'PAID') return 'PAYÉE';
  if (code === 'CANCELLED') return 'ANNULÉE';
  if (code === 'PARTIAL' || code === 'PARTIALLY_PAID') return 'ENVOYÉE';
  if (code === 'OVERDUE') return 'ENVOYÉE';
  return code || 'BROUILLON';
};

const sanitizeFileToken = (value: unknown): string => {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .trim() || 'INCONNU';
};

const toFrenchIntegerWords = (value: number): string => {
  const units = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
  if (value < 17) return units[value];
  if (value < 20) return `dix-${units[value - 10]}`;
  if (value < 70) {
    const ten = Math.floor(value / 10);
    const unit = value % 10;
    if (unit === 0) return tens[ten];
    if (unit === 1) return `${tens[ten]} et un`;
    return `${tens[ten]}-${units[unit]}`;
  }
  if (value < 80) {
    if (value === 71) return 'soixante et onze';
    return `soixante-${toFrenchIntegerWords(value - 60)}`;
  }
  if (value < 100) {
    if (value === 80) return 'quatre-vingts';
    return `quatre-vingt-${toFrenchIntegerWords(value - 80)}`;
  }
  if (value < 200) {
    const rest = value - 100;
    return rest === 0 ? 'cent' : `cent ${toFrenchIntegerWords(rest)}`;
  }
  if (value < 1000) {
    const hundred = Math.floor(value / 100);
    const rest = value % 100;
    const hundredWord = hundred > 1 ? `${units[hundred]} cent` : 'cent';
    if (rest === 0) {
      return hundred > 1 ? `${hundredWord}s` : hundredWord;
    }
    return `${hundredWord} ${toFrenchIntegerWords(rest)}`;
  }
  if (value < 1_000_000) {
    const thousand = Math.floor(value / 1000);
    const rest = value % 1000;
    const thousandWord = thousand === 1 ? 'mille' : `${toFrenchIntegerWords(thousand)} mille`;
    return rest === 0 ? thousandWord : `${thousandWord} ${toFrenchIntegerWords(rest)}`;
  }
  if (value < 1_000_000_000) {
    const million = Math.floor(value / 1_000_000);
    const rest = value % 1_000_000;
    const millionWord = million === 1 ? 'un million' : `${toFrenchIntegerWords(million)} millions`;
    return rest === 0 ? millionWord : `${millionWord} ${toFrenchIntegerWords(rest)}`;
  }
  const billion = Math.floor(value / 1_000_000_000);
  const rest = value % 1_000_000_000;
  const billionWord = billion === 1 ? 'un milliard' : `${toFrenchIntegerWords(billion)} milliards`;
  return rest === 0 ? billionWord : `${billionWord} ${toFrenchIntegerWords(rest)}`;
};

const amountToFrenchWords = (value: unknown): string => {
  const amount = Math.max(0, toNumericValue(value));
  const dinars = Math.floor(amount);
  const cents = Math.round((amount - dinars) * 100);
  const dinarsWords = `${toFrenchIntegerWords(dinars)} ${dinars > 1 ? 'dinars algériens' : 'dinar algérien'}`;
  if (cents <= 0) {
    return `${dinarsWords} et zéro centime`;
  }
  const centsWords = `${toFrenchIntegerWords(cents)} ${cents > 1 ? 'centimes' : 'centime'}`;
  return `${dinarsWords} et ${centsWords}`;
};

const parseBase64ImageToBuffer = (value: string): Buffer | null => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  const payload = normalized.includes(',') ? normalized.split(',').pop() || '' : normalized;
  try {
    const buffer = Buffer.from(payload, 'base64');
    if (!buffer.length) {
      return null;
    }
    const asText = buffer.toString('utf8', 0, 200).toLowerCase();
    if (asText.includes('<svg')) {
      return null;
    }
    return buffer;
  } catch {
    return null;
  }
};

const fetchImageBufferFromUrl = async (url: string): Promise<Buffer | null> => {
  const normalized = normalizeText(url);
  if (!normalized || !/^https?:\/\//i.test(normalized)) {
    return null;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(normalized, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length) {
      return null;
    }
    const asText = buffer.toString('utf8', 0, 200).toLowerCase();
    if (asText.includes('<svg')) {
      return null;
    }
    return buffer;
  } catch {
    return null;
  }
};

export class ExportService {
  private static companySettingsTableReady = false;

  private static async ensureCompanySettingsTable(): Promise<void> {
    if (this.companySettingsTableReady) {
      return;
    }
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS company_settings (
        scope_id TEXT PRIMARY KEY,
        company_name TEXT,
        address TEXT,
        city TEXT,
        wilaya TEXT,
        postal_code TEXT,
        country TEXT,
        phone TEXT,
        fax TEXT,
        email TEXT,
        website TEXT,
        nif TEXT,
        rc TEXT,
        ai TEXT,
        logo_url TEXT,
        logo_base64 TEXT,
        accent_color TEXT,
        vat_exempt BOOLEAN DEFAULT FALSE,
        payment_terms TEXT,
        legal_notes TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    this.companySettingsTableReady = true;
  }

  public static async getCompanyInvoiceProfile(scopeId?: string, requestUser?: any): Promise<InvoiceCompanyProfile> {
    const normalizedScope = normalizeText(scopeId);
    let row: CompanyInvoiceSettingsRow | null = null;
    if (normalizedScope) {
      try {
        await this.ensureCompanySettingsTable();
        const rows = await prisma.$queryRawUnsafe<CompanyInvoiceSettingsRow[]>(
          `SELECT scope_id, company_name, address, city, wilaya, postal_code, country, phone, fax, email, website, nif, rc, ai, logo_url, logo_base64, accent_color, vat_exempt, payment_terms, legal_notes FROM company_settings WHERE scope_id = $1 LIMIT 1`,
          normalizedScope
        );
        row = rows?.[0] || null;
      } catch {
        row = null;
      }
    }

    return {
      companyName: pickString(row?.company_name, requestUser?.companyName, requestUser?.fullName, 'Société'),
      address: pickString(row?.address, requestUser?.address),
      city: pickString(row?.city, requestUser?.city),
      wilaya: pickString(row?.wilaya),
      postalCode: pickString(row?.postal_code, requestUser?.postalCode),
      country: pickString(row?.country, 'Algérie'),
      phone: pickString(row?.phone, requestUser?.phone),
      fax: pickString(row?.fax),
      email: pickString(row?.email, requestUser?.email),
      website: pickString(row?.website),
      nif: pickString(row?.nif),
      rc: pickString(row?.rc),
      ai: pickString(row?.ai),
      logoUrl: pickString(row?.logo_url),
      logoBase64: pickString(row?.logo_base64),
      accentColor: ensureHexColor(row?.accent_color, '#2563EB'),
      vatExempt: Boolean(row?.vat_exempt),
      paymentTerms: pickString(row?.payment_terms),
      legalNotes: pickString(row?.legal_notes),
    };
  }

  private static async writeBufferToFile(buffer: Buffer, outputPath: string): Promise<void> {
    await fs.writeFile(outputPath, buffer);
  }

  private static async generateGenericExcelBuffer(rows: Record<string, unknown>[], sheetName: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestion Commerciale TPE';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName || 'Export');
    const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));

    worksheet.columns = keys.map((key) => ({
      header: key,
      key,
      width: Math.max(18, key.length + 4),
    }));

    worksheet.getRow(1).font = { bold: true };
    rows.forEach((row) => {
      const normalized = Object.fromEntries(
        Object.entries(row || {}).map(([key, value]) => [key, typeof value === 'object' ? toDisplayText(value) : value])
      );
      worksheet.addRow(normalized);
    });

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  private static async generateGenericPdfBuffer(rows: Record<string, unknown>[], title: string): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();

      rows.forEach((row, index) => {
        doc.font('Helvetica-Bold').fontSize(12).text(`Ligne ${index + 1}`);
        doc.font('Helvetica').fontSize(10);

        Object.entries(row || {}).forEach(([key, value]) => {
          doc.text(`${key}: ${toDisplayText(value)}`);
        });

        doc.moveDown(0.75);

        if (doc.y > 720 && index < rows.length - 1) {
          doc.addPage();
        }
      });

      doc.end();
    });
  }

  private static async generateBusinessDocumentPdfBuffer(options: {
     title: string;
     reference: string;
     status?: string;
     clientName?: string;
     clientAddress?: string;
     clientPhone?: string;
     issueDate?: unknown;
     dueDate?: unknown;
     notes?: string;
     total?: unknown;
     subtotal?: unknown;
     taxAmount?: unknown;
     items?: ExportLineItem[];
   }): Promise<Buffer> {
     return new Promise((resolve, reject) => {
       let timeoutId: NodeJS.Timeout | undefined;
       let settled = false;

       const cleanup = () => {
         if (timeoutId) {
           clearTimeout(timeoutId);
           timeoutId = undefined;
         }
         settled = true;
       };

       const resolveOnce = (value: Buffer) => {
         if (!settled) {
           cleanup();
           resolve(value);
         }
       };

       const rejectOnce = (error: Error) => {
         if (!settled) {
           cleanup();
           reject(error);
         }
       };

       timeoutId = setTimeout(() => {
         rejectOnce(new Error('PDF generation timed out'));
       }, 30000);

       try {
         const doc = new PDFDocument({ margin: A4_MARGIN_PT, size: 'A4', bufferPages: true });
         const buffers: Buffer[] = [];

         doc.on('data', (chunk) => buffers.push(Buffer.from(chunk)));
         doc.on('end', () => {
           if (buffers.length === 0 || Buffer.concat(buffers).length === 0) {
             rejectOnce(new Error('PDF buffer is empty - generation may have failed silently'));
           } else {
             resolveOnce(Buffer.concat(buffers));
           }
         });
         doc.on('error', (err) => rejectOnce(err));

          const font = createPdfFontHelpers(doc);
          const pageWidth = doc.page.width;
          const pageHeight = doc.page.height;
          const contentLeft = doc.page.margins.left;
          const contentRight = pageWidth - doc.page.margins.right;
          const contentWidth = contentRight - contentLeft;
          const contentTop = doc.page.margins.top;
          const contentBottom = pageHeight - doc.page.margins.bottom - 50;

         // === Header ===
         const leftX = contentLeft;
         const rightX = contentLeft + contentWidth * 0.55;
         const y = contentTop;
         const leftWidth = contentWidth * 0.52;

         font.bold().fontSize(20).fillColor('#111827').text(sanitizePdfText(options.title).toUpperCase(), rightX, y + 6, { width: contentRight - rightX, align: 'right' });
         font.regular().fontSize(10).fillColor('#111827');
         let infoY = y + 38;
         const metaLines = [
           `Référence : ${sanitizePdfText(options.reference)}`,
           `Date : ${sanitizePdfText(toDisplayDate(options.issueDate))}`,
           `Statut : ${sanitizePdfText(options.status || 'N/A')}`,
         ];
         if (options.dueDate) {
           metaLines.push(`Échéance : ${sanitizePdfText(toDisplayDate(options.dueDate))}`);
         }
         for (const line of metaLines) {
           doc.text(line, rightX, infoY, { width: contentRight - rightX, align: 'right', lineGap: 4 });
           infoY = doc.y + 4;
         }

         // Company info (left)
         font.bold().fontSize(14).fillColor('#111827').text('VentesPro', leftX, y + 4, { width: leftWidth, lineGap: 4 });
         let companyY = doc.y + 4;
         const companyLines = [
           'Société de gestion commerciale',
           'Alger, Algérie',
           'Email: contact@ventespro.com',
         ];
         font.regular().fontSize(10).fillColor('#374151');
         for (const line of companyLines) {
           doc.text(line, leftX, companyY, { width: leftWidth, lineGap: 3 });
           companyY = doc.y + 3;
         }

           const separatorY = Math.max(companyY, infoY) + 12;
           doc.moveTo(contentLeft, separatorY).lineTo(contentRight, separatorY).strokeColor('#D1D5DB').stroke();
           doc.y = separatorY + 16;

         // === Client block ===
         const colGap = 16;
         const colWidth = (contentWidth - colGap) / 2;
           const blockY = doc.y;
           const blockHeight = 80;
           doc.rect(contentLeft, blockY, colWidth, blockHeight).strokeColor('#D1D5DB').stroke();
           doc.rect(contentLeft, blockY, colWidth, 18).fill('#F3F4F6');
         font.bold().fontSize(10).fillColor('#111827').text('Client', contentLeft + 6, blockY + 3, { width: colWidth - 12 });

         font.regular().fontSize(9).fillColor('#111827');
         const clientLines = [
           options.clientName || '-',
           options.clientAddress || '-',
           options.clientPhone ? `Tél: ${options.clientPhone}` : '',
         ].filter(Boolean);
         let clientY = blockY + 24;
         for (const line of clientLines) {
           doc.text(line, contentLeft + 6, clientY, { width: colWidth - 12, lineGap: 3 });
           clientY = doc.y + 3;
         }
         doc.y = blockY + blockHeight + 18;

         // === Items table ===
         font.bold().fontSize(11).fillColor('#111827').text('Lignes', contentLeft, doc.y);
         doc.y += 18;

         const columns = [
           { label: 'N°', width: 26, align: 'center' as const },
           { label: 'Désignation', width: 200, align: 'left' as const },
           { label: 'Quantité', width: 60, align: 'right' as const },
           { label: 'P.U. HT', width: 90, align: 'right' as const },
           { label: 'Total HT', width: 90, align: 'right' as const },
         ];
         const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);
         const rowHeight = 22;

            const drawTableHeader = (y: number) => {
              doc.rect(contentLeft, y, tableWidth, 22).fill('#2563EB');
              let x = contentLeft;
              font.bold().fontSize(9).fillColor('#FFFFFF');
              for (const column of columns) {
                doc.text(column.label, x + 3, y + 6, { width: column.width - 6, align: column.align });
                x += column.width;
              }
              font.regular().fontSize(9).fillColor('#111827');
            };

         const tableYStart = doc.y;
         drawTableHeader(tableYStart);
         let tableY = tableYStart + 22;
         font.regular().fontSize(9).fillColor('#111827');
         (options.items || []).forEach((item, index) => {
           if (tableY + rowHeight > contentBottom) {
             doc.addPage();
             tableY = contentTop;
             drawTableHeader(tableY);
             tableY += 22;
           }
              if (index % 2 === 1) {
                const savedY2 = doc.y;
                doc.save();
                doc.rect(contentLeft, tableY, tableWidth, rowHeight).fill('#F9FAFB');
                doc.restore();
                doc.fillColor('#111827');
                doc.y = savedY2;
              }
           let x = contentLeft;
           const values = [
             String(index + 1),
             sanitizePdfText(item.description),
             sanitizePdfText(String(item.quantity ?? '-')),
             `${toNumericValue(item.unitPrice).toFixed(2)}`,
             `${toNumericValue(item.total).toFixed(2)}`,
           ];
           for (let i = 0; i < columns.length; i += 1) {
             doc.text(values[i], x + 4, tableY + 7, { width: columns[i].width - 8, align: columns[i].align, ellipsis: true });
             x += columns[i].width;
           }
           tableY += rowHeight;
         });
         doc.y = tableY + 8;

         // === Totals ===
         const subtotal = toNumericValue(options.subtotal);
         const vat = toNumericValue(options.taxAmount);
         const total = toNumericValue(options.total) || (subtotal + vat);
         const blockWidth = 260;
         const tx = contentRight - blockWidth;
         const ensureSpace = (h: number) => {
           if (doc.y + h > contentBottom) {
             doc.addPage();
             doc.y = contentTop;
           }
         };
         ensureSpace(110);
         let tY = doc.y;
         const rows = [
           { label: 'Sous-total HT', value: `${subtotal.toFixed(2)} DZD` },
           { label: 'TVA', value: `${vat.toFixed(2)} DZD` },
           { label: 'Total TTC', value: `${total.toFixed(2)} DZD`, strong: true },
         ];
          for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];
            if (row.strong) {
              doc.moveTo(tx, tY - 2).lineTo(contentRight, tY - 2).strokeColor('#9CA3AF').stroke();
            }
           const labelFont = row.strong ? font.bold() : font.regular();
           labelFont.fontSize(row.strong ? 11 : 10).fillColor('#111827').text(`${row.label} :`, tx, tY, { width: 150, lineGap: 2 });
           const valueFont = row.strong ? font.bold() : font.regular();
           valueFont.fontSize(row.strong ? 11 : 10).fillColor(row.strong ? '#2563EB' : '#111827').text(row.value, tx + 150, tY, { width: blockWidth - 150, align: 'right', lineGap: 2 });
           tY += row.strong ? 22 : 18;
         }
         doc.y = tY + 8;

         // === Notes ===
         if (options.notes) {
           ensureSpace(60);
           font.bold().fontSize(11).fillColor('#111827').text('Notes', contentLeft, doc.y);
           doc.y += 18;
           font.regular().fontSize(10).fillColor('#111827').text(sanitizePdfText(options.notes), contentLeft, doc.y, { width: contentWidth, lineGap: 4 });
           doc.y = doc.y + 8;
         }

         // === Footer on all pages ===
         const range = doc.bufferedPageRange();
         for (let i = 0; i < range.count; i += 1) {
           doc.switchToPage(i);
            const footerY = pageHeight - doc.page.margins.bottom - 28;
            doc.moveTo(contentLeft, footerY).lineTo(contentRight, footerY).strokeColor('#D1D5DB').stroke();
           font.regular().fontSize(8).fillColor('#374151').text(
             'VentesPro | Société de gestion commerciale | Alger, Algérie',
             contentLeft,
             footerY + 4,
             { width: contentWidth }
           );
           font.regular().fontSize(8).fillColor('#374151').text(
             `Page ${i + 1} / ${range.count}`,
             contentLeft + contentWidth * 0.78,
             footerY + 14,
             { width: contentWidth * 0.22, align: 'right' }
           );
         }

         doc.end();
       } catch (error) {
         rejectOnce(error instanceof Error ? error : new Error(String(error)));
       }
     });
   }

  // =================================================================
  // EXCEL EXPORT
  // =================================================================

  /**
   * GÃ©nÃ¨re un buffer Excel pour une liste de clients.
   * @param clients - La liste des clients Ã  exporter.
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
      { header: 'TÃ©lÃ©phone', key: 'phone', width: 20 },
      { header: 'Adresse', key: 'address', width: 40 },
      { header: 'Ville', key: 'city', width: 20 },
      { header: 'Code Postal', key: 'postalCode', width: 15 },
      { header: 'Pays', key: 'country', width: 20 },
    ];

    // Style de l'en-tÃªte
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
   * GÃ©nÃ¨re un buffer Excel pour une liste de produits.
   * @param products - La liste des produits Ã  exporter.
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
      { header: 'UnitÃ©', key: 'unit', width: 15 },
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
   * GÃ©nÃ¨re un buffer Excel pour une liste de fournisseurs.
   * @param suppliers - La liste des fournisseurs Ã  exporter.
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
      { header: 'TÃ©lÃ©phone', key: 'phone', width: 20 },
      { header: 'Ville', key: 'city', width: 20 },
      { header: 'Pays', key: 'country', width: 20 },
    ];
    worksheet.getRow(1).font = { bold: true };
    suppliers.forEach(s => worksheet.addRow(s));

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  /**
   * GÃ©nÃ¨re un buffer Excel pour une liste de commandes.
   * @param orders - La liste des commandes Ã  exporter.
   * @returns Un Buffer contenant le fichier Excel.
   */
  public static async generateOrdersExcel(orders: (Order & { client: { companyName?: string, firstName?: string, lastName?: string }, createdBy: { firstName: string, lastName: string }})[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Commandes');

    worksheet.columns = [
      { header: 'NumÃ©ro', key: 'number', width: 20 },
      { header: 'Client', key: 'clientName', width: 30 },
      { header: 'Date', key: 'orderDate', width: 15 },
      { header: 'Total HT', key: 'subtotal', width: 15, style: { numFmt: '#,##0.00' } },
      { header: 'Total TTC', key: 'total', width: 15, style: { numFmt: '#,##0.00' } },
      { header: 'Statut', key: 'status', width: 20 },
      { header: 'CrÃ©Ã© par', key: 'createdByName', width: 25 },
    ];
    worksheet.getRow(1).font = { bold: true };

    orders.forEach(order => {
      worksheet.addRow({
        number: order.number,
        clientName: order.client?.companyName || `${order.client?.firstName || ''} ${order.client?.lastName || ''}`.trim(),
        orderDate: order.orderDate,
        subtotal: order.subtotal,
        total: order.total,
        status: order.status,
        createdByName: order.createdBy ? `${order.createdBy.firstName || ''} ${order.createdBy.lastName || ''}`.trim() : 'N/A'
      });
    });

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  /**
   * GÃ©nÃ¨re un buffer Excel pour une liste de factures.
   * @param invoices - La liste des factures Ã  exporter.
   * @returns Un Buffer contenant le fichier Excel.
   */
  public static async generateInvoicesExcel(invoices: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Factures');

    worksheet.columns = [
      { header: 'NumÃ©ro', key: 'number', width: 20 },
      { header: 'Client', key: 'clientName', width: 30 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Date d\'Ã©chÃ©ance', key: 'dueDate', width: 15 },
      { header: 'Total TTC', key: 'total', width: 15, style: { numFmt: '#,##0.00' } },
      { header: 'Statut', key: 'status', width: 20 },
    ];
    worksheet.getRow(1).font = { bold: true };

    invoices.forEach(invoice => {
      worksheet.addRow({
        number: invoice.number,
        clientName: getInvoiceClientName(invoice.client),
        date: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        total: invoice.total,
        status: invoice.status
      });
    });

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  // ... Autres mÃ©thodes d'exportation Excel pour les produits, commandes, etc. Ã  ajouter ici
  
  // =================================================================
  // PDF EXPORT
  // =================================================================
  
  /**
   * GÃ©nÃ¨re un buffer PDF pour une liste de clients.
   * @param clients - La liste des clients Ã  exporter.
   * @param company - Les informations de l'entreprise pour le branding.
   * @returns Un Buffer contenant le fichier PDF.
   */
  public static async generateClientsPdf(clients: Client[], company: Pick<Company, 'name'>): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const buffers: any[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      const columns = [
        { label: 'Client', x: 40, width: 250 },
        { label: 'Type', x: 300, width: 90 },
        { label: 'Contact', x: 400, width: 110 },
        { label: 'Ville', x: 520, width: 110 },
        { label: 'CrÃ©Ã© le', x: 640, width: 80 },
      ];
      const rowHeight = 34;
      const bottomLimit = doc.page.height - doc.page.margins.bottom - rowHeight;

      const truncateText = (value: string, maxLength: number): string => {
        if (value.length <= maxLength) {
          return value;
        }

        return `${value.slice(0, Math.max(0, maxLength - 1))}â€¦`;
      };

      const drawDocumentHeader = () => {
        doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor('#111827')
          .text(`Liste des Clients - ${company.name}`, { align: 'center' });

        doc
          .moveDown(0.4)
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#6B7280')
          .text(`GÃ©nÃ©rÃ© le ${toDisplayDate(new Date())}`, { align: 'right' });

        doc.moveDown(0.75);
      };

      const drawTableHeader = (y: number) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#111827');

        columns.forEach((column) => {
          doc.text(column.label, column.x, y, { width: column.width });
        });

        doc
          .moveTo(40, y + 16)
          .lineTo(doc.page.width - 40, y + 16)
          .strokeColor('#D1D5DB')
          .stroke();
      };

      drawDocumentHeader();

      let y = doc.y;
      drawTableHeader(y);
      y += 24;

      if (clients.length === 0) {
        doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor('#374151')
          .text('Aucun client Ã  exporter pour les filtres sÃ©lectionnÃ©s.', 40, y + 8);
        doc.end();
        return;
      }

      clients.forEach((client, index) => {
        if (y > bottomLimit) {
          doc.addPage();
          drawDocumentHeader();
          y = doc.y;
          drawTableHeader(y);
          y += 24;
        }

        if (index % 2 === 0) {
          doc
            .rect(40, y - 4, doc.page.width - 80, rowHeight)
            .fill('#F9FAFB');
        }

        const clientName = truncateText(getClientFullName(client) || 'Client sans nom', 42);
        const clientEmail = truncateText(client.email || 'Email non renseignÃ©', 44);
        const clientType = client.type === 'COMPANY' ? 'Entreprise' : 'Particulier';

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827');
        doc.text(clientName, columns[0].x, y, { width: columns[0].width });
        doc.font('Helvetica').fontSize(8).fillColor('#6B7280');
        doc.text(clientEmail, columns[0].x, y + 12, { width: columns[0].width });

        doc.font('Helvetica').fontSize(9).fillColor('#111827');
        doc.text(clientType, columns[1].x, y + 6, { width: columns[1].width });
        doc.text(truncateText(client.phone || '-', 20), columns[2].x, y + 6, { width: columns[2].width });
        doc.text(truncateText(client.city || '-', 20), columns[3].x, y + 6, { width: columns[3].width });
        doc.text(toDisplayDate(client.createdAt), columns[4].x, y + 6, { width: columns[4].width });

        y += rowHeight;
      });
      
      doc.end();
    });
  }

  /**
   * GÃ©nÃ¨re un buffer PDF pour une liste de produits.
   * @param products - La liste des produits Ã  exporter.
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
   * GÃ©nÃ¨re un buffer PDF pour une liste de fournisseurs.
   * @param suppliers - La liste des fournisseurs Ã  exporter.
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
      doc.text('TÃ©lÃ©phone', 350, tableTop);
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
   * GÃ©nÃ¨re un buffer PDF pour une liste de commandes.
   * @param orders - La liste des commandes Ã  exporter.
   * @param company - Les informations de l'entreprise.
   * @returns Un Buffer contenant le fichier PDF.
   */
  public static async generateOrdersPdf(
    orders: (Order & { client?: { companyName?: string; firstName?: string; lastName?: string } })[],
    company: Company
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(Buffer.from(chunk)));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        doc.fontSize(20).text(`Liste des Commandes - ${company.name || 'Gestion Commerciale'}`, { align: 'center' });
        doc.moveDown();

        const tableTop = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Numero', 50, tableTop);
        doc.text('Client', 150, tableTop);
        doc.text('Date', 280, tableTop);
        doc.text('Total TTC', 380, tableTop, { align: 'right' });
        doc.text('Statut', 480, tableTop);
        doc.font('Helvetica');

        let y = tableTop + 20;

        if (!orders || orders.length === 0) {
          doc.text('Aucune commande a exporter.', 50, y);
          doc.end();
          return;
        }

        orders.forEach((order) => {
          const clientName =
            order.client?.companyName ||
            `${order.client?.firstName || ''} ${order.client?.lastName || ''}`.trim() ||
            'Client non renseigne';

          doc.text(String(order.number || 'N/A'), 50, y);
          doc.text(clientName, 150, y, { width: 120, ellipsis: true });
          doc.text(toDisplayDate(order.orderDate), 280, y);
          doc.text(toNumericValue(order.total).toFixed(2), 380, y, { width: 70, align: 'right' });
          doc.text(String(order.status || 'N/A'), 480, y);

          y += 20;
          if (y > 750) {
            doc.addPage();
            y = 50;
          }
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * GÃ©nÃ¨re un buffer PDF pour une liste de factures.
   * @param invoices - La liste des factures Ã  exporter.
   * @param company - Les informations de l'entreprise.
   * @returns Un Buffer contenant le fichier PDF.
   */
  public static async generateInvoicesPdf(invoices: any[], company: Pick<Company, 'name'>): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: any[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text(`Liste des Factures - ${company.name}`, { align: 'center' });
      doc.moveDown();

      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('NumÃ©ro', 50, tableTop);
      doc.text('Client', 150, tableTop);
      doc.text('Date', 280, tableTop);
      doc.text('Date d\'Ã©chÃ©ance', 380, tableTop);
      doc.text('Total TTC', 480, tableTop, { align: 'right' });
      doc.font('Helvetica');

      let y = tableTop + 20;
      invoices.forEach(invoice => {
        const clientName = getInvoiceClientName(invoice.client);
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

  /**
   * MÃ©thode de compatibilitÃ© pour les anciennes routes d'export Excel gÃ©nÃ©rique.
   */
  public async generateExcelReport(data: Record<string, unknown>[], sheetName: string, outputPath: string): Promise<void> {
    const buffer = await ExportService.generateGenericExcelBuffer(data, sheetName || 'Export');
    await ExportService.writeBufferToFile(buffer, outputPath);
  }

  /**
   * MÃ©thode de compatibilitÃ© pour les anciennes routes d'export PDF gÃ©nÃ©rique.
   */
  public async generatePDFReport(data: Record<string, unknown>[], title: string, outputPath: string): Promise<void> {
    const buffer = await ExportService.generateGenericPdfBuffer(data, title || 'Export');
    await ExportService.writeBufferToFile(buffer, outputPath);
  }

  public static async generateInvoicePdfBuffer(invoice: any, context?: { ownerScopeId?: string; requestUser?: any }): Promise<Buffer> {
    const company = await ExportService.getCompanyInvoiceProfile(context?.ownerScopeId, context?.requestUser);
    const logoBufferFromBase64 = parseBase64ImageToBuffer(company.logoBase64);
    const logoBuffer = logoBufferFromBase64 || await fetchImageBufferFromUrl(company.logoUrl);
    const accentColor = ensureHexColor(company.accentColor, '#2563EB');
    const subtotal = toNumericValue(invoice.subtotal);
    const globalDiscount = toNumericValue(invoice.discount);
    const taxableBase = Math.max(0, subtotal - globalDiscount);
    const vatAmount = toNumericValue(invoice.vatAmount);
    const stampDuty = toNumericValue(invoice.stampDuty || invoice.droitTimbre);
    const total = toNumericValue(invoice.total) || Math.max(0, taxableBase + vatAmount + stampDuty);
    const lineItems = (invoice.items || []).map((item: any, index: number) => {
      const quantity = toNumericValue(item.quantity);
      const unitPrice = toNumericValue(item.unitPrice);
      const lineDiscount = toNumericValue(item.discount);
      const unit = pickString(item.unit, item.product?.unit, 'U');
      const computed = quantity * unitPrice * (1 - Math.max(0, lineDiscount) / 100);
      const totalHt = toNumericValue(item.total || computed);
      return {
        index: index + 1,
        description: pickString(item.product?.name, item.description, 'Article'),
        quantity,
        unit,
        unitPrice,
        discount: lineDiscount,
        totalHt,
        vatRate: toNumericValue(item.vatRate),
      };
    });
    const uniqueVatRates = Array.from(new Set(lineItems.map((item: any) => item.vatRate).filter((rate: number) => rate > 0)));
    const vatRateLabel = uniqueVatRates.length === 1 ? `${uniqueVatRates[0].toFixed(2).replace('.', ',')}%` : 'multi-taux';
    const clientName = pickString(invoice.client?.companyName, `${invoice.client?.firstName || ''} ${invoice.client?.lastName || ''}`, invoice.client?.name, 'Client');
    const clientAddress = pickString(invoice.client?.address, [invoice.client?.postalCode, invoice.client?.city, invoice.client?.country].filter(Boolean).join(' ').trim());
    const invoiceDate = invoice.invoiceDate || invoice.createdAt;
    const dueDate = invoice.dueDate;
    const isVatExempt = company.vatExempt || vatAmount <= 0 || uniqueVatRates.length === 0;
    const paymentMethod = pickString(invoice.paymentMethod, company.paymentTerms);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;
      let settled = false;

      const cleanup = () => {
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = undefined; }
        settled = true;
      };
      const resolveOnce = (value: Buffer) => { if (!settled) { cleanup(); resolve(value); } };
      const rejectOnce = (error: Error) => { if (!settled) { cleanup(); reject(error); } };

      timeoutId = setTimeout(() => rejectOnce(new Error('Invoice PDF generation timed out')), 30000);

      try {
        const doc = new PDFDocument({ margin: A4_MARGIN_PT, size: 'A4', bufferPages: true });
        const chunks: Buffer[] = [];
        const font = createPdfFontHelpers(doc);
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentLeft = doc.page.margins.left;
        const contentRight = pageWidth - doc.page.margins.right;
        const contentWidth = contentRight - contentLeft;
        const contentTop = doc.page.margins.top;
        const contentBottom = pageHeight - doc.page.margins.bottom - 50;

        doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        doc.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (buf.length === 0) {
            rejectOnce(new Error('Invoice PDF buffer is empty'));
          } else {
            resolveOnce(buf);
          }
        });
        doc.on('error', (err) => rejectOnce(err));

        const drawHeader = () => {
          const leftX = contentLeft;
          const rightX = contentLeft + contentWidth * 0.58;
          const y = contentTop;

          if (logoBuffer) {
            try {
              doc.image(logoBuffer, leftX, y, { fit: [150, 80], align: 'left', valign: 'top' });
            } catch {
              doc.rect(leftX, y, 150, 80).strokeColor('#D1D5DB').stroke();
              font.regular().fontSize(10).fillColor('#9CA3AF').text('[Logo]', leftX + 8, y + 32, { width: 134, align: 'center' });
            }
          } else {
            doc.rect(leftX, y, 150, 80).strokeColor('#D1D5DB').stroke();
            font.regular().fontSize(10).fillColor('#9CA3AF').text('[Logo]', leftX + 8, y + 32, { width: 134, align: 'center' });
          }

          let leftInfoY = y + 88;
          const leftWidth = contentWidth * 0.54;
          font.bold().fontSize(12).fillColor('#111827').text(company.companyName || 'Société', leftX, leftInfoY, { width: leftWidth, lineGap: 4 });
          leftInfoY = doc.y + 6;
          const addressParts = [company.address, [company.city, company.wilaya, company.postalCode].filter(Boolean).join(' ').trim(), company.country].filter(Boolean);
          font.regular().fontSize(10).fillColor('#374151').text(addressParts.join(', ') || '-', leftX, leftInfoY, { width: leftWidth, lineGap: 4 });
          leftInfoY = doc.y + 6;
          const contacts = [company.phone ? `Tél: ${company.phone}` : '', company.fax ? `Fax: ${company.fax}` : '', company.email ? `Email: ${company.email}` : ''].filter(Boolean).join(' | ');
          font.regular().fontSize(10).fillColor('#374151').text(contacts || '-', leftX, leftInfoY, { width: leftWidth, lineGap: 4 });
          leftInfoY = doc.y + 6;
          if (company.website) {
            font.regular().fontSize(10).fillColor('#374151').text(company.website, leftX, leftInfoY, { width: leftWidth, lineGap: 4 });
            leftInfoY = doc.y;
          }

          font.bold().fontSize(24).fillColor('#111827').text('FACTURE', rightX, y + 4, { width: contentRight - rightX, align: 'right' });
          font.regular().fontSize(10).fillColor('#111827');
          doc.text(`Numéro: ${pickString(invoice.number, invoice.invoiceNumber, 'N/A')}`, rightX, y + 46, { width: contentRight - rightX, align: 'right', lineGap: 4 });
          doc.text(`Date d'émission: ${formatDateFr(invoiceDate)}`, rightX, y + 66, { width: contentRight - rightX, align: 'right', lineGap: 4 });
          doc.text(`Date d'échéance: ${formatDateFr(dueDate)}`, rightX, y + 86, { width: contentRight - rightX, align: 'right', lineGap: 4 });
          doc.text(`Statut: ${mapInvoiceStatusToFrench(invoice.status)}`, rightX, y + 106, { width: contentRight - rightX, align: 'right' });

          const separatorY = Math.max(leftInfoY, y + 126) + 14;
          doc.moveTo(contentLeft, separatorY).lineTo(contentRight, separatorY).strokeColor('#D1D5DB').stroke();
          doc.y = separatorY + 16;
        };

      const drawPartyBlocks = () => {
        const colGap = 16;
        const colWidth = (contentWidth - colGap) / 2;
        const boxY = doc.y;
        const titleHeight = 18;
        const lineHeight = 18;

        const sellerAddressParts = [
          company.address,
          [company.city, company.wilaya, company.postalCode].filter(Boolean).join(' ').trim(),
          company.country,
        ].filter(Boolean);
        const sellerLines: string[] = [
          company.companyName || '-',
          `NIF: ${company.nif || 'NON RENSEIGNÉ'}`,
          `RC: ${company.rc || 'NON RENSEIGNÉ'}`,
          `AI: ${company.ai || 'NON RENSEIGNÉ'}`,
          sellerAddressParts.join(', ') || '-',
          company.phone ? `Tél: ${company.phone}` : 'Tél: -',
        ];
        const clientLines: string[] = [
          clientName,
          `NIF: ${pickString(invoice.client?.nif, '-')}`,
          `RC: ${pickString(invoice.client?.rc, '-')}`,
          clientAddress || '-',
          invoice.client?.phone ? `Tél: ${invoice.client.phone}` : 'Tél: -',
        ];

        font.regular().fontSize(9);
        const measureHeight = (lines: string[]): number => {
          let h = 0;
          for (const line of lines) {
            const lh = doc.heightOfString(line, { width: colWidth - 12, lineGap: 2 });
            h += lh + 4;
          }
          return h;
        };
        const sellerContentHeight = measureHeight(sellerLines);
        const clientContentHeight = measureHeight(clientLines);
        const contentHeight = Math.max(sellerContentHeight, clientContentHeight);
        const boxHeight = titleHeight + 12 + contentHeight + 6;

        doc.rect(contentLeft, boxY, colWidth, boxHeight).strokeColor('#D1D5DB').stroke();
        doc.rect(contentLeft + colWidth + colGap, boxY, colWidth, boxHeight).strokeColor('#D1D5DB').stroke();
        doc.rect(contentLeft, boxY, colWidth, titleHeight).fill('#F3F4F6');
        doc.rect(contentLeft + colWidth + colGap, boxY, colWidth, titleHeight).fill('#F3F4F6');

        font.bold().fontSize(10).fillColor('#111827').text('Émetteur / Vendeur', contentLeft + 6, boxY + 3, { width: colWidth - 12 });
        font.bold().fontSize(10).fillColor('#111827').text('Facturé à / Client', contentLeft + colWidth + colGap + 6, boxY + 3, { width: colWidth - 12 });

        font.regular().fontSize(9).fillColor('#111827');
        let sellerY = boxY + titleHeight + 6;
        for (const line of sellerLines) {
          const lh = doc.heightOfString(line, { width: colWidth - 12, lineGap: 2 });
          doc.text(line, contentLeft + 6, sellerY, { width: colWidth - 12, lineGap: 2 });
          sellerY += lh + 4;
        }
        let clientY = boxY + titleHeight + 6;
        for (const line of clientLines) {
          const lh = doc.heightOfString(line, { width: colWidth - 12, lineGap: 2 });
          doc.text(line, contentLeft + colWidth + colGap + 6, clientY, { width: colWidth - 12, lineGap: 2 });
          clientY += lh + 4;
        }
        doc.y = boxY + boxHeight + 16;
      };

      const columns = [
        { label: 'N°', width: 24, align: 'center' as const },
        { label: 'Désignation', width: 146, align: 'left' as const },
        { label: 'Quantité', width: 56, align: 'right' as const },
        { label: 'Unité', width: 46, align: 'center' as const },
        { label: 'Prix Unitaire HT', width: 78, align: 'right' as const },
        { label: 'Remise (%)', width: 58, align: 'right' as const },
        { label: 'Total HT', width: 78, align: 'right' as const },
      ];
      const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

      const drawTableHeader = (y: number) => {
        doc.rect(contentLeft, y, tableWidth, 20).fill(accentColor);
        let x = contentLeft;
        font.bold().fontSize(9).fillColor('#FFFFFF');
        for (const column of columns) {
          doc.text(column.label, x + 3, y + 6, { width: column.width - 6, align: column.align });
          x += column.width;
        }
      };

      const drawInvoiceRows = () => {
        let y = doc.y;
        drawTableHeader(y);
        y += 20;
        const rowHeight = 20;

        lineItems.forEach((line: any, index: number) => {
          if (y + rowHeight > contentBottom) {
            doc.addPage();
            y = contentTop;
            drawTableHeader(y);
            y += 20;
          }
          if (index % 2 === 1) {
            doc.rect(contentLeft, y, tableWidth, rowHeight).fill('#F9FAFB');
          }
          let x = contentLeft;
          const values = [
            String(line.index),
            line.description,
            line.quantity.toFixed(2).replace('.', ','),
            line.unit,
            formatAmountDa(line.unitPrice),
            line.discount.toFixed(2).replace('.', ','),
            formatAmountDa(line.totalHt),
          ];
          font.regular().fontSize(9).fillColor('#111827');
          values.forEach((value, columnIndex) => {
            doc.text(value, x + 3, y + 6, {
              width: columns[columnIndex].width - 6,
              align: columns[columnIndex].align,
              ellipsis: true,
            });
            x += columns[columnIndex].width;
          });
          y += rowHeight;
        });
        doc.y = y + 10;
      };

      const ensureSpace = (height: number) => {
        if (doc.y + height > contentBottom) {
          doc.addPage();
          doc.y = contentTop;
        }
      };

      const drawTotals = () => {
        ensureSpace(150);
        const blockWidth = 260;
        const x = contentRight - blockWidth;
        let y = doc.y;
        const rows: Array<{ label: string; value: string; strong?: boolean }> = [
          { label: 'Sous-total HT', value: formatAmountDa(subtotal) },
          ...(globalDiscount > 0 ? [{ label: 'Remise globale', value: `- ${formatAmountDa(globalDiscount)}` }] : []),
          { label: 'Base imposable HT', value: formatAmountDa(taxableBase) },
          { label: `TVA (${vatRateLabel})`, value: formatAmountDa(vatAmount) },
          ...(stampDuty > 0 ? [{ label: 'Droit de timbre', value: formatAmountDa(stampDuty) }] : []),
          { label: 'TOTAL TTC', value: formatAmountDa(total), strong: true },
        ];

        rows.forEach((row, index) => {
          if (row.strong) {
            doc.moveTo(x, y - 2).lineTo(contentRight, y - 2).strokeColor('#9CA3AF').stroke();
          }
          const labelFont = row.strong ? font.bold() : font.regular();
          labelFont.fontSize(row.strong ? 11 : 10).fillColor('#111827').text(`${row.label} :`, x, y, { width: 150, lineGap: 2 });
          const valueFont = row.strong ? font.bold() : font.regular();
          valueFont.fontSize(row.strong ? 11 : 10).fillColor(row.strong ? accentColor : '#111827').text(row.value, x + 150, y, {
            width: blockWidth - 150,
            align: 'right',
            lineGap: 2,
          });
          y += index === rows.length - 2 ? 24 : 18;
        });
        doc.y = y + 6;
        font.bold().fontSize(10).fillColor('#111827').text('Montant en lettres', x, doc.y, { width: blockWidth });
        font.regular().fontSize(9).fillColor('#374151').text(amountToFrenchWords(total), x, doc.y + 16, {
          width: blockWidth,
          lineGap: 2,
        });
        doc.y += 50;
      };

      const drawConditions = () => {
        ensureSpace(110);
        font.bold().fontSize(11).fillColor('#111827').text('Conditions et notes', contentLeft, doc.y);
        doc.y += 20;
        const lines = [
          `Conditions de paiement: ${paymentMethod || '-'}`,
          `Délai de paiement: ${dueDate ? `au plus tard le ${formatDateFr(dueDate)}` : '-'}`,
          `Notes / mentions légales: ${pickString(invoice.notes, company.legalNotes, '-')}`,
          ...(isVatExempt ? ['Non assujetti à la TVA'] : []),
        ];
        font.regular().fontSize(10).fillColor('#111827');
        lines.forEach((line) => {
          doc.text(line, contentLeft, doc.y, { width: contentWidth, lineGap: 2 });
          doc.y += 18;
        });
      };

      const drawFooterOnAllPages = () => {
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i += 1) {
          doc.switchToPage(i);
          const footerY = pageHeight - doc.page.margins.bottom - 28;
          doc.moveTo(contentLeft, footerY).lineTo(contentRight, footerY).strokeColor('#D1D5DB').stroke();
          font.regular().fontSize(8).fillColor('#374151').text(
            `${company.companyName || '-'} | NIF: ${company.nif || 'NON RENSEIGNÉ'} | RC: ${company.rc || 'NON RENSEIGNÉ'} | AI: ${company.ai || 'NON RENSEIGNÉ'}`,
            contentLeft,
            footerY + 4,
            { width: contentWidth }
          );
          font.regular().fontSize(8).fillColor('#374151').text(
            `${[company.address, company.city, company.wilaya, company.postalCode].filter(Boolean).join(', ') || '-'} | ${company.phone || '-'} | ${company.email || '-'}`,
            contentLeft,
            footerY + 14,
            { width: contentWidth * 0.76 }
          );
          font.regular().fontSize(8).fillColor('#374151').text(
            `Page ${i + 1} / ${range.count}`,
            contentLeft + contentWidth * 0.78,
            footerY + 14,
            { width: contentWidth * 0.22, align: 'right' }
          );
        }
      };

      drawHeader();
      drawPartyBlocks();
      drawInvoiceRows();
      drawTotals();
      drawConditions();
      drawFooterOnAllPages();
      doc.end();
      } catch (error) {
        rejectOnce(error instanceof Error ? error : new Error(String(error)));
      }
    });

    if (!buffer || buffer.length === 0) {
      throw new Error('Le PDF généré est vide');
    }
    return buffer;
  }

  public static buildInvoicePdfFilename(invoice: any): string {
    const invoiceNumber = pickString(invoice?.number, invoice?.invoiceNumber, 'N-A');
    const clientName = pickString(invoice?.client?.companyName, `${invoice?.client?.firstName || ''} ${invoice?.client?.lastName || ''}`, invoice?.client?.name, 'Client');
    const dateToken = formatDateCompact(invoice?.invoiceDate || invoice?.createdAt || new Date());
    return `FACTURE_${sanitizeFileToken(invoiceNumber)}_${sanitizeFileToken(clientName)}_${dateToken}.pdf`;
  }

  /**
   * GÃ©nÃ¨re un PDF dÃ©taillÃ© pour une facture et l'Ã©crit sur disque.
   */
  public async generateInvoicePDF(invoice: any, outputPath: string): Promise<void> {
    const buffer = await ExportService.generateInvoicePdfBuffer(invoice);
    await ExportService.writeBufferToFile(buffer, outputPath);
  }

  /**
   * GÃ©nÃ¨re un PDF dÃ©taillÃ© pour un devis et l'Ã©crit sur disque.
   */
  public async generateQuotePDF(quote: any, outputPath: string): Promise<void> {
    const buffer = await ExportService.generateBusinessDocumentPdfBuffer({
      title: 'Devis',
      reference: quote.number,
      status: quote.status,
      clientName: quote.client?.companyName || `${quote.client?.firstName || ''} ${quote.client?.lastName || ''}`.trim() || 'Client',
      clientAddress: quote.client?.address || '',
      clientPhone: quote.client?.phone || '',
      issueDate: quote.quoteDate || quote.createdAt,
      dueDate: quote.validUntil,
      notes: quote.notes,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount ?? quote.vatAmount,
      total: quote.total,
      items: (quote.items || []).map((item: any) => ({
        description: item.product?.name || 'Article',
        quantity: toNumericValue(item.quantity),
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    });

    await ExportService.writeBufferToFile(buffer, outputPath);
  }

  /**
   * GÃ©nÃ¨re un PDF dÃ©taillÃ© pour une commande et l'Ã©crit sur disque.
   */
  public async generateOrderPDF(order: any, outputPath: string): Promise<void> {
    const buffer = await ExportService.generateBusinessDocumentPdfBuffer({
      title: 'Commande',
      reference: order.number,
      status: order.status,
      clientName: order.client?.companyName || `${order.client?.firstName || ''} ${order.client?.lastName || ''}`.trim(),
      issueDate: order.orderDate || order.createdAt,
      dueDate: order.deliveryDate || order.validUntil,
      notes: order.notes,
      subtotal: order.subtotal,
      taxAmount: order.vatAmount,
      total: order.total,
      items: (order.items || []).map((item: any) => ({
        description: item.product?.name || 'Article',
        quantity: toNumericValue(item.quantity),
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    });

    await ExportService.writeBufferToFile(buffer, outputPath);
  }

  /**
   * GÃ©nÃ¨re un rapport des ventes au format PDF et l'Ã©crit sur disque.
   */
  public async generateSalesReportPDF(report: any, outputPath: string): Promise<void> {
    const buffer = await new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text('Rapport des ventes', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11).font('Helvetica').text(`PÃ©riode : ${report.period}`);
      doc.text(`Du ${toDisplayDate(report.startDate)} au ${toDisplayDate(report.endDate)}`);
      doc.moveDown();
      doc.font('Helvetica-Bold').text('SynthÃ¨se');
      doc.font('Helvetica');
      doc.text(`Commandes : ${toNumericValue(report.totalOrders)}`);
      doc.text(`Factures : ${toNumericValue(report.totalInvoices)}`);
      doc.text(`Chiffre d'affaires : ${toNumericValue(report.totalRevenue).toFixed(2)} DZD`);
      doc.text(`Clients actifs : ${toNumericValue(report.totalClients)}`);
      doc.text(`Produits suivis : ${toNumericValue(report.totalProducts)}`);
      doc.end();
    });

    await ExportService.writeBufferToFile(buffer, outputPath);
  }

  /**
   * GÃ©nÃ¨re un rapport des ventes au format Excel et l'Ã©crit sur disque.
   */
  public async generateSalesReportExcel(report: any, outputPath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestion Commerciale TPE';
    workbook.created = new Date();

    const summary = workbook.addWorksheet('SynthÃ¨se');
    summary.columns = [
      { header: 'Indicateur', key: 'label', width: 28 },
      { header: 'Valeur', key: 'value', width: 22 },
    ];
    summary.getRow(1).font = { bold: true };
    summary.addRows([
      { label: 'PÃ©riode', value: report.period },
      { label: 'Date de dÃ©but', value: toDisplayDate(report.startDate) },
      { label: 'Date de fin', value: toDisplayDate(report.endDate) },
      { label: 'Nombre de commandes', value: toNumericValue(report.totalOrders) },
      { label: 'Nombre de factures', value: toNumericValue(report.totalInvoices) },
      { label: 'Chiffre d\'affaires', value: toNumericValue(report.totalRevenue) },
      { label: 'Clients actifs', value: toNumericValue(report.totalClients) },
      { label: 'Produits suivis', value: toNumericValue(report.totalProducts) },
    ]);

    const ordersSheet = workbook.addWorksheet('Commandes');
    ordersSheet.columns = [
      { header: 'NumÃ©ro', key: 'number', width: 22 },
      { header: 'Date', key: 'orderDate', width: 16 },
      { header: 'Client', key: 'clientName', width: 30 },
      { header: 'Statut', key: 'status', width: 18 },
      { header: 'Total', key: 'total', width: 16 },
    ];
    ordersSheet.getRow(1).font = { bold: true };
    (report.orders || []).forEach((order: any) => {
      ordersSheet.addRow({
        number: order.number,
        orderDate: toDisplayDate(order.orderDate || order.createdAt),
        clientName: order.client?.companyName || `${order.client?.firstName || ''} ${order.client?.lastName || ''}`.trim(),
        status: order.status,
        total: toNumericValue(order.total),
      });
    });

    const invoicesSheet = workbook.addWorksheet('Factures');
    invoicesSheet.columns = [
      { header: 'NumÃ©ro', key: 'number', width: 22 },
      { header: 'Date', key: 'invoiceDate', width: 16 },
      { header: 'Client', key: 'clientName', width: 30 },
      { header: 'Statut', key: 'status', width: 18 },
      { header: 'Total', key: 'total', width: 16 },
    ];
    invoicesSheet.getRow(1).font = { bold: true };
    (report.invoices || []).forEach((invoice: any) => {
      invoicesSheet.addRow({
        number: invoice.number,
        invoiceDate: toDisplayDate(invoice.invoiceDate || invoice.createdAt),
        clientName: invoice.client?.companyName || invoice.client?.name || `${invoice.client?.firstName || ''} ${invoice.client?.lastName || ''}`.trim(),
        status: invoice.status,
        total: toNumericValue(invoice.total),
      });
    });

await ExportService.writeBufferToFile((await workbook.xlsx.writeBuffer()) as Buffer, outputPath);
   }

  public static async generateOrderPdfBuffer(order: any): Promise<Buffer> {
    return ExportService.generateBusinessDocumentPdfBuffer({
      title: 'Commande',
      reference: order.number,
      status: order.status,
      clientName: order.client?.companyName || `${order.client?.firstName || ''} ${order.client?.lastName || ''}`.trim() || 'Client',
      clientAddress: order.client?.address || '',
      clientPhone: order.client?.phone || '',
      issueDate: order.orderDate || order.createdAt,
      dueDate: order.deliveryDate || order.validUntil,
      notes: order.notes,
      subtotal: order.subtotal,
      taxAmount: order.vatAmount,
      total: order.total,
      items: (order.items || []).map((item: any) => ({
        description: item.product?.name || 'Article',
        quantity: toNumericValue(item.quantity),
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    });
  }

  public static async generateQuotePdfBuffer(quote: any): Promise<Buffer> {
    return ExportService.generateBusinessDocumentPdfBuffer({
      title: 'Devis',
      reference: quote.number,
      status: quote.status,
      clientName: quote.client?.companyName || `${quote.client?.firstName || ''} ${quote.client?.lastName || ''}`.trim() || 'Client',
      clientAddress: quote.client?.address || '',
      clientPhone: quote.client?.phone || '',
      issueDate: quote.quoteDate || quote.createdAt,
      dueDate: quote.validUntil,
      notes: quote.notes,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount ?? quote.vatAmount,
      total: quote.total,
      items: (quote.items || []).map((item: any) => ({
        description: item.product?.name || 'Article',
        quantity: toNumericValue(item.quantity),
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    });
  }
}
