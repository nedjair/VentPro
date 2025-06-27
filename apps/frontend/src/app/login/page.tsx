import { Metadata } from 'next'
import { LoginPage } from '@/components/pages/login'

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connexion à l\'application de gestion commerciale',
}

export default function Login() {
  return <LoginPage />
}
