/**
 * Module d'export PDF/Excel pour le frontend
 * Gestion des téléchargements et exports côté client
 */

import { api } from './api';

// Configuration de l'API backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

/**
 * Extrait le nom de fichier à partir de l'en-tête Content-Disposition
 * @param contentDisposition En-tête Content-Disposition
 * @param defaultFilename Nom de fichier par défaut si aucun n'est trouvé
 * @returns Nom de fichier extrait ou valeur par défaut
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

export class ExportService {
  /**
   * Télécharge un blob en tant que fichier
   */
  private static downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
  /**
   * Télécharge le PDF d'une facture
   */
  static async downloadInvoicePDF(invoiceId: string): Promise<void> {
    try {
      console.log(`📄 Téléchargement PDF facture ${invoiceId}...`);
      
      // S'assurer que l'utilisateur est authentifié
      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/invoices/${invoiceId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // Récupérer le nom du fichier depuis les en-têtes
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, `facture_${invoiceId}.pdf`);

      // Télécharger le fichier
      const blob = await response.blob();
      this.downloadBlob(blob, filename);
      
      console.log('✅ PDF téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement PDF:', error);
      throw error;
    }
  }

  /**
   * Télécharge l'export Excel des clients
   */
  static async downloadClientsExcel(params?: Record<string, any>): Promise<void> {
    try {
      console.log('📊 Téléchargement Excel clients...', { params });
      
      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = new URLSearchParams({ format: 'xlsx', ...params }).toString();

      const response = await fetch(`${API_BASE_URL}/api/v1/clients/export?${query}`, {
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
      
      console.log('✅ Excel clients téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement Excel clients:', error);
      throw error;
    }
  }

  /**
   * Télécharge l'export Excel des produits
   */
  static async downloadProductsExcel(params?: Record<string, any>): Promise<void> {
    try {
      console.log('📊 Téléchargement Excel produits...');
      
      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = new URLSearchParams({ format: 'xlsx', ...params }).toString();
      const response = await fetch(`${API_BASE_URL}/api/v1/products/export?${query}`, {
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
      
      console.log('✅ Excel produits téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement Excel produits:', error);
      throw error;
    }
  }

  /**
   * Télécharge l'export Excel des commandes
   */
  static async downloadOrdersExcel(params?: Record<string, any>): Promise<void> {
    try {
      console.log('📊 Téléchargement Excel commandes...');
      
      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = new URLSearchParams({ format: 'xlsx', ...params }).toString();
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/export?${query}`, {
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
      
      console.log('✅ Excel commandes téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement Excel commandes:', error);
      throw error;
    }
  }

  /**
   * Télécharge l'export Excel des factures
   */
  static async downloadInvoicesExcel(params?: Record<string, any>): Promise<void> {
    try {
      console.log('📊 Téléchargement Excel factures...');

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = new URLSearchParams({ format: 'xlsx', ...params }).toString();
      const response = await fetch(`${API_BASE_URL}/api/v1/invoices/export?${query}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, 'factures.xlsx');

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log('✅ Excel factures téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement Excel factures:', error);
      throw error;
    }
  }

  /**
   * Télécharge l'export PDF des clients
   */
  static async downloadClientsPDF(params?: Record<string, any>): Promise<void> {
    try {
      console.log('📄 Téléchargement PDF clients...', { params });

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = new URLSearchParams({ format: 'pdf', ...params }).toString();
      const response = await fetch(`${API_BASE_URL}/api/v1/clients/export?${query}`, {
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

      console.log('✅ PDF clients téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement PDF clients:', error);
      throw error;
    }
  }

  /**
   * Télécharge l'export PDF des produits
   */
  static async downloadProductsPDF(params?: Record<string, any>): Promise<void> {
    try {
      console.log('📄 Téléchargement PDF produits...');

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = new URLSearchParams({ format: 'pdf', ...params }).toString();
      const response = await fetch(`${API_BASE_URL}/api/v1/products/export?${query}`, {
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

      console.log('✅ PDF produits téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement PDF produits:', error);
      throw error;
    }
  }

  /**
   * Télécharge l'export Excel des fournisseurs
   */
  static async downloadSuppliersExcel(params?: Record<string, any>): Promise<void> {
    try {
      console.log('📊 Téléchargement Excel fournisseurs...');

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = new URLSearchParams({ format: 'xlsx', ...params }).toString();
      const response = await fetch(`${API_BASE_URL}/api/v1/suppliers/export?${query}`, {
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

      console.log('✅ Excel fournisseurs téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement Excel fournisseurs:', error);
      throw error;
    }
  }

  /**
   * Télécharge l'export PDF des fournisseurs
   */
  static async downloadSuppliersPDF(params?: Record<string, any>): Promise<void> {
    try {
      console.log('📄 Téléchargement PDF fournisseurs...');

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = new URLSearchParams({ format: 'pdf', ...params }).toString();
      const response = await fetch(`${API_BASE_URL}/api/v1/suppliers/export?${query}`, {
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

      console.log('✅ PDF fournisseurs téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement PDF fournisseurs:', error);
      throw error;
    }
  }

  /**
   * Télécharge le template d'importation
   */
  static async downloadImportTemplate(type: 'clients' | 'products' | 'suppliers'): Promise<void> {
    try {
      console.log(`📋 Téléchargement template ${type}...`);

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/${type}/import/template`, {
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

      console.log(`✅ Template ${type} téléchargé avec succès`);
    } catch (error) {
      console.error(`❌ Erreur téléchargement template ${type}:`, error);
      throw error;
    }
  }

  /**
   * Télécharge l'export PDF des commandes
   */
  static async downloadOrdersPDF(params?: Record<string, any>): Promise<void> {
    try {
      console.log('📄 Téléchargement PDF commandes...');

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const query = new URLSearchParams({ format: 'pdf', ...params }).toString();
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/export?${query}`, {
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

      console.log('✅ PDF commandes téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement PDF commandes:', error);
      throw error;
    }
  }

  /**
   * Télécharge l'export PDF des factures
   */
  static async downloadInvoicesPDF(): Promise<void> {
    try {
      console.log('📄 Téléchargement PDF factures...');

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/invoices/export/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilenameFromContentDisposition(contentDisposition, 'factures.pdf');

      const blob = await response.blob();
      this.downloadBlob(blob, filename);

      console.log('✅ PDF factures téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement PDF factures:', error);
      throw error;
    }
  }

  /**
   * Télécharge le rapport de ventes PDF
   */
  static async downloadSalesReportPDF(period: string): Promise<void> {
    try {
      console.log(`📄 Téléchargement rapport ventes PDF (${period})...`);

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/reports/sales/pdf?period=${period}`, {
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

      console.log('✅ Rapport ventes PDF téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement rapport ventes PDF:', error);
      throw error;
    }
  }

  /**
   * Télécharge le rapport de ventes Excel
   */
  static async downloadSalesReportExcel(period: string): Promise<void> {
    try {
      console.log(`📊 Téléchargement rapport ventes Excel (${period})...`);

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/reports/sales/excel?period=${period}`, {
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

      console.log('✅ Rapport ventes Excel téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement rapport ventes Excel:', error);
      throw error;
    }
  }

  /**
   * Valide un fichier d'import
   */
  static validateImportFile(file: File): { isValid: boolean; message?: string } {
    // Vérifier l'extension du fichier
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        message: 'Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv'
      };
    }

    // Vérifier la taille du fichier (max 10MB)
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
      console.log('📥 Import clients depuis Excel...');

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/v1/clients/import/excel`, {
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
      console.log('✅ Import clients terminé avec succès');

      return {
        success: result.success,
        message: result.message,
        count: result.data?.imported
      };
    } catch (error) {
      console.error('❌ Erreur import clients:', error);
      throw error;
    }
  }

  /**
   * Importe les produits depuis un fichier Excel
   */
  static async importProductsFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log('📥 Import produits depuis Excel...');

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/v1/products/import/excel`, {
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
      console.log('✅ Import produits terminé avec succès');

      return {
        success: result.success,
        message: result.message,
        count: result.data?.imported
      };
    } catch (error) {
      console.error('❌ Erreur import produits:', error);
      throw error;
    }
  }

  /**
   * Importe les fournisseurs depuis un fichier Excel
   */
  static async importSuppliersFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log('📥 Import fournisseurs depuis Excel...');

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/v1/suppliers/import/excel`, {
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
      console.log('✅ Import fournisseurs terminé avec succès');

      return {
        success: result.success,
        message: result.message,
        count: result.data?.imported
      };
    } catch (error) {
      console.error('❌ Erreur import fournisseurs:', error);
      throw error;
    }
  }

  /**
   * Importe les commandes depuis un fichier Excel
   */
  static async importOrdersFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log('📥 Import commandes depuis Excel...');

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/v1/orders/import/excel`, {
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
      console.log('✅ Import commandes terminé avec succès');

      return {
        success: result.success,
        message: result.message,
        count: result.data?.imported
      };
    } catch (error) {
      console.error('❌ Erreur import commandes:', error);
      throw error;
    }
  }

  /**
   * Importe les factures depuis un fichier Excel
   */
  static async importInvoicesFromExcel(file: File): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log('📥 Import factures depuis Excel...');

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/v1/invoices/import/excel`, {
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
      console.log('✅ Import factures terminé avec succès');

      return {
        success: result.success,
        message: result.message,
        count: result.data?.imported
      };
    } catch (error) {
      console.error('❌ Erreur import factures:', error);
      throw error;
    }
  }

  /**
   * Télécharge un template d'export Excel générique
   */
  static async downloadTemplateExcel(type: string): Promise<void> {
    try {
      console.log(`📋 Téléchargement template Excel ${type}...`);

      const authToken = api.getAuthToken();
      if (!authToken) {
        throw new Error('Authentification requise');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/${type}/export/template`, {
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

      console.log(`✅ Template Excel ${type} téléchargé avec succès`);
    } catch (error) {
      console.error(`❌ Erreur téléchargement template Excel ${type}:`, error);
      throw error;
    }
  }

  /**
   * Génère un rapport personnalisé (fonctionnalité future)
   */
  static async generateCustomReport(config: {
    type: 'sales' | 'clients' | 'products' | 'invoices';
    dateFrom?: string;
    dateTo?: string;
    format: 'pdf' | 'excel';
    filters?: Record<string, any>;
  }): Promise<void> {
    try {
      console.log('📊 Génération rapport personnalisé...', config);

      // TODO: Implémenter la génération de rapports personnalisés
      // Cette fonctionnalité sera ajoutée dans une future version

      throw new Error('Fonctionnalité en cours de développement');
    } catch (error) {
      console.error('❌ Erreur génération rapport personnalisé:', error);
      throw error;
    }
  }

  /**
   * Vérifie si les exports sont disponibles (connexion backend)
   */
  static async checkExportAvailability(): Promise<boolean> {
    try {
      const authToken = api.getAuthToken();
      if (!authToken) {
        return false;
      }

      // Test simple avec un endpoint de santé
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Exports non disponibles:', error);
      return false;
    }
  }
}

export default ExportService;

