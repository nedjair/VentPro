'use client'

import { useEffect, useState } from 'react'

export default function TestHydrationPage() {
  const [mounted, setMounted] = useState(false)
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
  }, [counter])

  const handleClick = () => {
    setCounter(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test d'Hydratation</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <div>
            <strong>État du composant :</strong>
            <ul className="mt-2 space-y-1">
              <li>Monté côté client : {mounted ? '✅ Oui' : '❌ Non'}</li>
              <li>Compteur : {counter}</li>
              <li>Timestamp : {new Date().toISOString()}</li>
            </ul>
          </div>
          
          <button
            onClick={handleClick}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Incrémenter le compteur
          </button>
          
          <div className="text-sm text-gray-600">
            <p>Ce composant teste si les useEffect se déclenchent correctement.</p>
            <p>Vérifiez la console du navigateur et les logs du serveur.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
