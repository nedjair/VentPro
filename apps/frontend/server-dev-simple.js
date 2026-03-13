const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3005

// Créer l'application Next.js avec configuration minimale
const app = next({ 
  dev, 
  hostname, 
  port,
  conf: {
    // Configuration ultra-simple pour éviter les erreurs de chunks
    reactStrictMode: false,
    poweredByHeader: false,
    swcMinify: false,
    
    // Pas de configuration webpack complexe
    webpack: (config, { dev, isServer }) => {
      if (dev && !isServer) {
        // Configuration minimale pour éviter les erreurs de chunks
        config.cache = false
        config.optimization = {
          ...config.optimization,
          splitChunks: false, // Désactiver complètement le splitting
        }
      }
      return config
    },
    
    // Images non optimisées
    images: {
      unoptimized: true,
    },
  }
})

const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
  .once('error', (err) => {
    console.error(err)
    process.exit(1)
  })
  .listen(port, () => {
    console.log(`🚀 Serveur Next.js démarré sur http://${hostname}:${port}`)
    console.log('📦 Configuration ultra-simple pour éviter les erreurs de chunks')
  })
})
