'use client'

import { useState, useRef } from 'react'
import { Button } from './button'
import { Download, Upload, FileText, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { ExportService } from '@/lib/export'

interface ImportExportButtonsProps {
  type: 'clients' | 'products' | 'suppliers' | 'orders' | 'invoices'
  filters?: Record<string, any>
  onImportSuccess?: (result: any) => void
  onImportError?: (error: string) => void
  onExportError?: (error: string) => void
  showPdfExport?: boolean
  showImport?: boolean
  className?: string
}

export function ImportExportButtons({
  type,
  filters,
  onImportSuccess,
  onImportError,
  onExportError,
  showPdfExport = false,
  showImport = true,
  className = ''
}: ImportExportButtonsProps) {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Valider le fichier
    const validation = ExportService.validateImportFile(file)
    if (!validation.isValid) {
      onImportError?.(validation.message || 'Fichier invalide')
      return
    }

    setImporting(true)
    try {
      let result
      switch (type) {
        case 'clients':
          result = await ExportService.importClientsFromExcel(file)
          break
        case 'products':
          result = await ExportService.importProductsFromExcel(file)
          break
        case 'suppliers':
          result = await ExportService.importSuppliersFromExcel(file)
          break
        default:
          throw new Error(`Import non supporté pour le type: ${type}`)
      }

      if (result.success) {
        onImportSuccess?.(result)
      } else {
        onImportError?.(result.message || 'Erreur lors de l\'importation')
      }
    } catch (error) {
      console.error('Erreur import:', error)
      onImportError?.(error instanceof Error ? error.message : 'Erreur lors de l\'importation')
    } finally {
      setImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      switch (type) {
        case 'clients':
          await ExportService.downloadClientsExcel(filters)
          break
        case 'products':
          await ExportService.downloadProductsExcel(filters)
          break
        case 'orders':
          await ExportService.downloadOrdersExcel(filters)
          break
        case 'invoices':
          await ExportService.downloadInvoicesExcel(filters)
          break
        case 'suppliers':
          await ExportService.downloadSuppliersExcel(filters)
          break
        default:
          throw new Error(`Export non supporté pour le type: ${type}`)
      }
    } catch (error) {
      console.error('Erreur export Excel:', error)
      onExportError?.(error instanceof Error ? error.message : 'Erreur lors de l\'export Excel')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      switch (type) {
        case 'clients':
          await ExportService.downloadClientsPDF(filters)
          break
        case 'products':
          await ExportService.downloadProductsPDF(filters)
          break
        case 'suppliers':
          await ExportService.downloadSuppliersPDF(filters)
          break
        case 'orders':
          await ExportService.downloadOrdersPDF(filters)
          break
        case 'invoices':
          await ExportService.downloadInvoicesPDF(filters)
          break
        default:
          throw new Error(`Export PDF non supporté pour le type: ${type}`)
      }
    } catch (error) {
      console.error('Erreur export PDF:', error)
      onExportError?.(error instanceof Error ? error.message : 'Erreur lors de l\'export PDF')
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await ExportService.downloadImportTemplate(type as 'clients' | 'products' | 'suppliers' | 'orders' | 'invoices')
    } catch (error) {
      console.error('Erreur téléchargement template:', error)
      onImportError?.(error instanceof Error ? error.message : 'Erreur lors du téléchargement du template')
    }
  }

  return (
    <div className={`flex space-x-2 ${className}`}>
      {/* Bouton d'importation */}
      {showImport && (type === 'clients' || type === 'products' || type === 'suppliers' || type === 'orders' || type === 'invoices') && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            disabled={importing}
            title="Importer depuis Excel/CSV"
          >
            {importing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {importing ? 'Import...' : 'Import'}
          </Button>
          
          {/* Bouton template */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadTemplate}
            title="Télécharger le template d'importation"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Template
          </Button>
        </>
      )}

      {/* Bouton export Excel */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        disabled={exporting}
        title="Exporter vers Excel"
      >
        {exporting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {exporting ? 'Export...' : 'Excel'}
      </Button>

      {/* Bouton export PDF */}
      {showPdfExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={exporting}
          title="Exporter vers PDF"
        >
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </Button>
      )}
    </div>
  )
}

// Composant pour afficher les messages d'import/export
interface ImportExportMessageProps {
  type: 'success' | 'error' | 'info'
  message: string
  onClose: () => void
}

export function ImportExportMessage({ type, message, onClose }: ImportExportMessageProps) {
  const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 
                  type === 'error' ? 'bg-red-50 border-red-200' : 
                  'bg-blue-50 border-blue-200'
  
  const textColor = type === 'success' ? 'text-green-800' : 
                    type === 'error' ? 'text-red-800' : 
                    'text-blue-800'

  const iconColor = type === 'success' ? 'text-green-400' : 
                    type === 'error' ? 'text-red-400' : 
                    'text-blue-400'

  return (
    <div className={`border rounded-lg p-4 ${bgColor}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {type === 'error' ? (
            <AlertCircle className={`h-5 w-5 ${iconColor}`} />
          ) : (
            <FileSpreadsheet className={`h-5 w-5 ${iconColor}`} />
          )}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${textColor}`}>
            {message}
          </p>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={onClose}
            className={`inline-flex rounded-md p-1.5 ${textColor} hover:bg-opacity-20 hover:bg-current focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-current`}
          >
            <span className="sr-only">Fermer</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
