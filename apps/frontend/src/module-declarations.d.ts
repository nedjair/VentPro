// Déclarations de modules pour les composants React

declare module '@/components/layout/main-layout' {
  import { ReactNode } from 'react';
  
  export interface MainLayoutProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
  }
  
  export function MainLayout(props: MainLayoutProps): JSX.Element;
}

declare module '@/components/ui/button' {
  import { ButtonHTMLAttributes, ForwardRefExoticComponent, RefAttributes } from 'react';
  
  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'ghost' | 'outline' | 'link' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    fullWidth?: boolean;
  }
  
  export const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;
}

declare module '@/components/auth/protected-route' {
  import { ReactNode } from 'react';
  
  export interface ProtectedRouteProps {
    children: ReactNode;
    requiredRoles?: string[];
  }
  
  export function ProtectedRoute(props: ProtectedRouteProps): JSX.Element;
}

declare module '@/components/ui/import-export-buttons' {
  export interface ImportExportButtonsProps {
    type: 'clients' | 'products' | 'suppliers' | 'orders' | 'invoices';
    filters?: Record<string, any>;
    onImportSuccess?: (result: { success: boolean; message: string; count?: number }) => void;
    onImportError?: (message: string) => void;
    onExportError?: (message: string) => void;
    showPdfExport?: boolean;
    showImport?: boolean;
    className?: string;
  }
  
  export function ImportExportButtons(props: ImportExportButtonsProps): JSX.Element;
  export function ImportExportMessage(props: { message: string; type: 'success' | 'error' | 'info'; onClose?: () => void }): JSX.Element;
}
