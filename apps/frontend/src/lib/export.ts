/**
 * Module d'export PDF/Excel pour le frontend
 * Gestion des tÃ©lÃ©chargements et exports cÃ´tÃ© client
 */

import { api } from './api';
import { buildApiUrl } from './api-config';

/**
 * Extrait le nom de fichier Ã  partir de l'en-tÃªte Content-Disposition
 * @param contentDisposition En-tÃªte Content-Disposition
 * @param defaultFilename Nom de fichier par dÃ©faut si aucun n'est trouvÃ©
 * @returns Nom de fichier extrait ou valeur par dÃ©faut
 */
function extractFilenameFromContentDisposition(contentDisposition: string | null, defaultFilename: string): string {
  if (!contentDisposition) {
    return defaultFilename;
  }
  
  const filenameMatch = contentDisposition.match(/filename="(.+)"/);
  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1];
  }
  
  return defaultFilename;
}

/**
 * Construit une query string d'export sans propager les valeurs indÃ©finies.
 *
 * Pourquoi : `URLSearchParams({ foo: undefined })` sÃ©rialise `foo=undefined`,
 * ce qui casse les routes d'export validÃ©es par schÃ©ma (ex. fournisseurs).
 * Les boolÃ©ens `false` restent valides et doivent donc Ãªtre conservÃ©s.
 */
function buildExportQuery(params?: Record<string, any>, format?: 'xlsx' | 'pdf'): string {
  const query = new URLSearchParams();

  if (format) {
    query.set('format', format);
  }

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return;
      }

      query.set(key, value.join(','));
      return;
    }

    query.set(key, String(value));
  });

  return query.toString();
}

function getExportAuthToken(): string | null {
  const memoryToken = api.getAuthToken();
  if (memoryToken) {
    return memoryToken;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedTokens = window.localStorage.getItem('auth-tokens');
    if (!storedTokens) {
      return null;
    }

    const tokens = JSON.parse(storedTokens);
    const accessToken = tokens?.accessToken;

    if (typeof accessToken === 'string' && accessToken.length > 0) {
      api.setAuthToken(accessToken);
      return accessToken;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du token d\'export:', error);
  }

  return null;
}

async function readExportErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.clone().json();
    if (payload?.message) {
      return String(payload.message);
    }
    if (payload?.error) {
      return String(payload.error);
    }
  } catch {
  }

  try {
    const text = await response.text();
    if (text?.trim()) {
      return text.slice(0, 300);
    }
  } catch {
  }

  return `Erreur HTTP: ${response.status}`;
}
export class ExportService {
  /**
   * TÃ©lÃ©charge un blob en tant que fichier
   */
  private static downloadBlob(blob: Blob, filename: string): void {
    try {
      console.log(`ðŸ’¾ TÃ©lÃ©chargement du fichier: ${filename} (${blob.size} bytes)`);

      // VÃ©rifier que le blob n'est pas vide
      if (blob.size === 0) {
        throw new Error('Le fichier gÃ©nÃ©rÃ© est vide');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';

      document.body.appendChild(a);
      a.click();

      // Nettoyer aprÃ¨s un dÃ©lai pour s'assurer que le tÃ©lÃ©chargement a commencÃ©
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      console.log(`âœ… TÃ©lÃ©chargement initiÃ©: ${filename}`);
    } catch (error) {
      console.error('âŒ Erreur lors du tÃ©lÃ©chargement:', error);
      throw error;
    }
  }
  /**
   * TÃ©lÃ©charge le PDF d'une facture
   */
  static async downloadInvoicePDF(invoiceId: string): Promise<void> {
    try {
      const normalizedInvoiceId = String(invoiceId || '').trim();
      if (!normalizedInvoiceId) {
        throw new Error('Identifiant de facture invalide');
      }

      console.log(`ðŸ“„ TÃ©lÃ©chargement PDF facture ${invoiceId}...`);
      
      // S'assurer que l'utilisateur est authentifiÃ©
      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const baseUrl = buildApiUrl(`/api/v1/invoices/${encodeURIComponent(normalizedInvoiceId)}/pdf`);
      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/pdf',
        },
      };

      const response = await fetch(baseUrl, fetchOptions);

      if (!response.ok) {
        const backendMessage = await readExportErrorMessage(response);
        throw new Error(`Export PDF facture Ã©chouÃ© (${response.status}) : ${backendMessage}`);
      }

      // RÃ©cupÃ©rer le nom du fichier depuis les en-tÃªtes
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, `facture_${normalizedInvoiceId}.pdf`);

      // TÃ©lÃ©charger le fichier
      let blob = await response.blob();
      if (blob.size === 0) {
        const retryResponse = await fetch(`${baseUrl}?_=${Date.now()}`, fetchOptions);
        if (!retryResponse.ok) {
          const backendMessage = await readExportErrorMessage(retryResponse);
          throw new Error(`Export PDF facture Ã©chouÃ© (${retryResponse.status}) : ${backendMessage}`);
        }
        blob = await retryResponse.blob();
      }

      if (blob.size === 0) {
        throw new Error('Le PDF retournÃ© est vide. Veuillez rÃ©essayer ou ouvrir la facture depuis "Voir".');
      }

      this.downloadBlob(blob, filename);
      
      console.log('âœ… PDF tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
        const networkError = new Error('Impossible de joindre le service PDF. Vérifiez la connexion réseau ou la configuration CORS.');
        console.error('❌ Erreur téléchargement PDF:', { invoiceId, error: networkError });
        throw networkError;
      }
      console.error('âŒ Erreur tÃ©lÃ©chargement PDF:', { invoiceId, error });
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge l'export Excel des clients
   */
  static async downloadClientsExcel(params?: Record<string, any>): Promise<void> {
    try {
      console.log('ðŸ“Š TÃ©lÃ©chargement Excel clients...', { params });
      
      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = buildExportQuery(params, 'xlsx');

      const response = await fetch(buildApiUrl(`/api/v1/clients/export?${query}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, 'clients.xlsx');

      const blob = await response.blob();
      this.downloadBlob(blob, filename);
      
      console.log('âœ… Excel clients tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement Excel clients:', error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge l'export Excel des produits
   */
  static async downloadProductsExcel(params?: Record<string, any>): Promise<void> {
    try {
      console.log('ðŸ“Š TÃ©lÃ©chargement Excel produits...');
      
      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = buildExportQuery(params, 'xlsx');
      const response = await fetch(buildApiUrl(`/api/v1/products/export?${query}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, 'produits.xlsx');

      const blob = await response.blob();
      this.downloadBlob(blob, filename);
      
      console.log('âœ… Excel produits tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement Excel produits:', error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge le PDF d'une commande.
   */
  static async downloadOrderPDF(orderId: string): Promise<void> {
    try {
      console.log(`ðŸ“„ TÃ©lÃ©chargement PDF commande ${orderId}...`);

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(buildApiUrl(`/api/v1/orders/${orderId}/pdf`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(
        contentDisposition,
        `commande-${orderId}.pdf`
      );

      const blob = await response.blob();
      ExportService.downloadBlob(blob, filename);
    } catch (error) {
      console.error(`âŒ Erreur tÃ©lÃ©chargement PDF commande ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge l'export Excel des commandes
   */
  static async downloadOrdersExcel(params?: Record<string, any>): Promise<void> {
    try {
      console.log('ðŸ“Š TÃ©lÃ©chargement Excel commandes...');
      
      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = buildExportQuery(params);
      const url = query
        ? buildApiUrl(`/api/v1/orders/export/excel?${query}`)
        : buildApiUrl('/api/v1/orders/export/excel');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, 'commandes.xlsx');

      const blob = await response.blob();
      this.downloadBlob(blob, filename);
      
      console.log('âœ… Excel commandes tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement Excel commandes:', error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge l'export Excel des factures
   */
  static async downloadInvoicesExcel(params?: Record<string, any>): Promise<void> {
    try {
      console.log('ðŸ“Š TÃ©lÃ©chargement Excel factures...', { params });

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = buildExportQuery(params, 'xlsx');
      const url = buildApiUrl(`/api/v1/invoices/export?${query}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const backendMessage = await readExportErrorMessage(response);
        throw new Error(`Export Excel factures Ã©chouÃ© (${response.status}) : ${backendMessage}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, 'factures.xlsx');

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log('âœ… Excel factures tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement Excel factures:', {
        error,
        params,
      });
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge l'export PDF des clients
   */
  static async downloadClientsPDF(params?: Record<string, any>): Promise<void> {
    try {
      console.log('ðŸ“„ TÃ©lÃ©chargement PDF clients...', { params });

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = buildExportQuery(params, 'pdf');
      const response = await fetch(buildApiUrl(`/api/v1/clients/export?${query}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, 'clients.pdf');

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log('âœ… PDF clients tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement PDF clients:', error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge l'export PDF des produits
   */
  static async downloadProductsPDF(params?: Record<string, any>): Promise<void> {
    try {
      console.log('ðŸ“„ TÃ©lÃ©chargement PDF produits...');

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = buildExportQuery(params, 'pdf');
      const response = await fetch(buildApiUrl(`/api/v1/products/export?${query}`), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, 'produits.pdf');

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log('âœ… PDF produits tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement PDF produits:', error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge l'export Excel des fournisseurs
   */
  static async downloadSuppliersExcel(params?: Record<string, any>): Promise<void> {
    try {
      console.log('ðŸ“Š TÃ©lÃ©chargement Excel fournisseurs...');

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = buildExportQuery(params, 'xlsx');
      const response = await fetch(buildApiUrl(`/api/v1/suppliers/export?${query}`), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(
        contentDisposition,
        'fournisseurs.xlsx'
      );

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log('âœ… Excel fournisseurs tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement Excel fournisseurs:', error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge l'export PDF des fournisseurs
   */
  static async downloadSuppliersPDF(params?: Record<string, any>): Promise<void> {
    try {
      console.log('ðŸ“„ TÃ©lÃ©chargement PDF fournisseurs...');

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = buildExportQuery(params, 'pdf');
      const response = await fetch(buildApiUrl(`/api/v1/suppliers/export?${query}`), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(
        contentDisposition,
        'fournisseurs.pdf'
      );

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log('âœ… PDF fournisseurs tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement PDF fournisseurs:', error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge le template d'importation
   */
  static async downloadImportTemplate(type: 'clients' | 'products' | 'suppliers'): Promise<void> {
    try {
      console.log(`ðŸ“‹ TÃ©lÃ©chargement template ${type}...`);

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(buildApiUrl(`/api/v1/${type}/import/template`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, `template_${type}.xlsx`);

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log(`âœ… Template ${type} tÃ©lÃ©chargÃ© avec succÃ¨s`);
    } catch (error) {
      console.error(`âŒ Erreur tÃ©lÃ©chargement template ${type}:`, error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge l'export PDF des commandes
   */
  static async downloadOrdersPDF(params?: Record<string, any>): Promise<void> {
    try {
      console.log('ðŸ“„ TÃ©lÃ©chargement PDF commandes...');

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = buildExportQuery(params);
      const url = query
        ? buildApiUrl(`/api/v1/orders/export/pdf?${query}`)
        : buildApiUrl('/api/v1/orders/export/pdf');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(
        contentDisposition,
        'commandes.pdf'
      );

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log('âœ… PDF commandes tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement PDF commandes:', error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge l'export PDF des factures
   */
  static async downloadInvoicesPDF(params?: Record<string, any>): Promise<void> {
    try {
      console.log('ðŸ“„ TÃ©lÃ©chargement PDF factures...', { params });

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = buildExportQuery(params, 'pdf');
      const url = buildApiUrl(`/api/v1/invoices/export?${query}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const backendMessage = await readExportErrorMessage(response);
        throw new Error(`Export PDF factures Ã©chouÃ© (${response.status}) : ${backendMessage}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, 'factures.pdf');

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log('âœ… PDF factures tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement PDF factures:', {
        error,
        params,
      });
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge le rapport de ventes PDF
   */
  static async downloadSalesReportPDF(period: string): Promise<void> {
    try {
      console.log(`ðŸ“„ TÃ©lÃ©chargement rapport ventes PDF (${period})...`);

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(buildApiUrl(`/api/v1/reports/sales/pdf?period=${period}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, `rapport_ventes_${period}.pdf`);

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log('âœ… Rapport ventes PDF tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement rapport ventes PDF:', error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge le rapport de ventes Excel
   */
  static async downloadSalesReportExcel(period: string): Promise<void> {
    try {
      console.log(`ðŸ“Š TÃ©lÃ©chargement rapport ventes Excel (${period})...`);

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(buildApiUrl(`/api/v1/reports/sales/excel?period=${period}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, `rapport_ventes_${period}.xlsx`);

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log('âœ… Rapport ventes Excel tÃ©lÃ©chargÃ© avec succÃ¨s');
    } catch (error) {
      console.error('âŒ Erreur tÃ©lÃ©chargement rapport ventes Excel:', error);
      throw error;
    }
  }

  /**
   * Valide un fichier d'import
   */
  static validateImportFile(file: File): { isValid: boolean; message?: string } {
    // VÃ©rifier l'extension du fichier
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        message: 'Format de fichier non supportÃ©. Utilisez .xlsx, .xls ou .csv'
      };
    }

    // VÃ©rifier la taille du fichier (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        message: 'Le fichier est trop volumineux. Taille maximum: 10MB'
      };
    }

    return { isValid: true };
  }

  /**
   * Importe les clients depuis un fichier Excel
   */
  static async importClientsFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log('ðŸ“¥ Import clients depuis Excel...');

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(buildApiUrl('/api/v1/clients/import/excel'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('âœ… Import clients terminÃ© avec succÃ¨s');

      return {
        success: result.success,
        message: result.message,
        count: result.data?.imported
      };
    } catch (error) {
      console.error('âŒ Erreur import clients:', error);
      throw error;
    }
  }

  /**
   * Importe les produits depuis un fichier Excel
   */
  static async importProductsFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log('ðŸ“¥ Import produits depuis Excel...');

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(buildApiUrl('/api/v1/products/import/excel'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('âœ… Import produits terminÃ© avec succÃ¨s');

      return {
        success: result.success,
        message: result.message,
        count: result.data?.imported
      };
    } catch (error) {
      console.error('âŒ Erreur import produits:', error);
      throw error;
    }
  }

  /**
   * Importe les fournisseurs depuis un fichier Excel
   */
  static async importSuppliersFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log('ðŸ“¥ Import fournisseurs depuis Excel...');

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(buildApiUrl('/api/v1/suppliers/import/excel'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('âœ… Import fournisseurs terminÃ© avec succÃ¨s');

      return {
        success: result.success,
        message: result.message,
        count: result.data?.imported
      };
    } catch (error) {
      console.error('âŒ Erreur import fournisseurs:', error);
      throw error;
    }
  }

  /**
   * Importe les commandes depuis un fichier Excel
   */
  static async importOrdersFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log('ðŸ“¥ Import commandes depuis Excel...');

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(buildApiUrl('/api/v1/orders/import/excel'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('âœ… Import commandes terminÃ© avec succÃ¨s');

      return {
        success: result.success,
        message: result.message,
        count: result.data?.imported
      };
    } catch (error) {
      console.error('âŒ Erreur import commandes:', error);
      throw error;
    }
  }

  /**
   * Importe les factures depuis un fichier Excel
   */
  static async importInvoicesFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log('ðŸ“¥ Import factures depuis Excel...');

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(buildApiUrl('/api/v1/invoices/import/excel'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('âœ… Import factures terminÃ© avec succÃ¨s');

      return {
        success: result.success,
        message: result.message,
        count: result.data?.imported
      };
    } catch (error) {
      console.error('âŒ Erreur import factures:', error);
      throw error;
    }
  }

  /**
   * TÃ©lÃ©charge un template d'export Excel gÃ©nÃ©rique
   */
  static async downloadTemplateExcel(type: string): Promise<void> {
    try {
      console.log(`ðŸ“‹ TÃ©lÃ©chargement template Excel ${type}...`);

      const authToken = getExportAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(buildApiUrl(`/api/v1/${type}/export/template`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, `template_${type}.xlsx`);

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log(`âœ… Template Excel ${type} tÃ©lÃ©chargÃ© avec succÃ¨s`);
    } catch (error) {
      console.error(`âŒ Erreur tÃ©lÃ©chargement template Excel ${type}:`, error);
      throw error;
    }
  }

  /**
   * GÃ©nÃ¨re un rapport personnalisÃ© (fonctionnalitÃ© future)
   */
  static async generateCustomReport(config: {
    type: 'sales' | 'clients' | 'products' | 'invoices';
    dateFrom?: string;
    dateTo?: string;
    format: 'pdf' | 'excel';
    filters?: Record<string, any>;
  }): Promise<void> {
    try {
      console.log('ðŸ“Š GÃ©nÃ©ration rapport personnalisÃ©...', config);

      // TODO: ImplÃ©menter la gÃ©nÃ©ration de rapports personnalisÃ©s
      // Cette fonctionnalitÃ© sera ajoutÃ©e dans une future version

      throw new Error('FonctionnalitÃ© en cours de dÃ©veloppement');
    } catch (error) {
      console.error('âŒ Erreur gÃ©nÃ©ration rapport personnalisÃ©:', error);
      throw error;
    }
  }

  /**
   * VÃ©rifie si les exports sont disponibles (connexion backend)
   */
  static async checkExportAvailability(): Promise<boolean> {
    try {
      const authToken = getExportAuthToken();
      if (!authToken) {
        return false;
      }

      // Test simple avec un endpoint de santÃ©
      const response = await fetch(buildApiUrl('/health'), {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      console.error('âŒ Exports non disponibles:', error);
      return false;
    }
  }
}

export default ExportService;



