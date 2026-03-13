import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Analytics - Gestion Commerciale',
  description: 'Tableaux de bord et analyses avancées pour votre activité commerciale',
}

export default function Analytics() {
  // Conserver l'URL historique tout en centralisant le pilotage sur /dashboard.
  redirect('/dashboard')
}
