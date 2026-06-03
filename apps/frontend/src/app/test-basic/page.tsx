'use client'

export default function TestBasicPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test JavaScript Basique</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <p>Ce composant teste si JavaScript fonctionne avec du code inline.</p>
          
          <button
            onClick={() => {
              alert('JavaScript inline fonctionne !')
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Tester JavaScript Inline
          </button>
          
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.testBasicLoaded = true;
              `
            }}
          />
          
          <div className="text-sm text-gray-600">
            <p>Si vous pouvez cliquer sur le bouton et voir une alerte, JavaScript fonctionne.</p>
            <p>Vérifiez aussi la console du navigateur pour les logs.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
