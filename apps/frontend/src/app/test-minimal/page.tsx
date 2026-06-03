'use client'

export default function TestMinimalPage() {
  
  // JavaScript synchrone qui devrait s'exécuter côté client
  if (typeof window !== 'undefined') {
    
    // Test avec setTimeout
    setTimeout(() => {
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Minimal</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <p>Ce composant teste JavaScript sans hooks React.</p>
          
          <button
            onClick={() => {
              alert('Clic fonctionne !')
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Tester Clic
          </button>
          
          <div className="text-sm text-gray-600">
            <p>Vérifiez la console pour les logs JavaScript.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
