// Script E2E ciblé pour valider le flux réel produit après migration.
// Il crée une catégorie et un produit de test via l'API, relit les données,
// met à jour le produit, puis vérifie réellement l'affichage frontend via Puppeteer.

import puppeteer from 'puppeteer'

const baseUrl = process.env.E2E_BACKEND_URL || 'http://localhost:3001'
const frontendUrl = process.env.E2E_FRONTEND_URL || 'http://localhost:3000'
const email = process.env.E2E_EMAIL || 'admin@example.com'
const password = process.env.E2E_PASSWORD || 'admin123'
const suffix = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Réponse JSON invalide sur ${path}: ${text.slice(0, 200)}`)
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} sur ${path}: ${data?.message || text}`)
  }

  return data
}

async function requestPage(url, token) {
  const response = await fetch(url, {
    headers: { Cookie: `auth-token=${token}` },
    redirect: 'manual',
  })

  return { status: response.status, location: response.headers.get('location') }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function primeBrowserSession(page, frontendOrigin, token, user) {
  await page.evaluateOnNewDocument(
    ({ injectedToken, injectedUser }) => {
      // Prépare l'authentification côté navigateur avant l'exécution des scripts React.
      localStorage.setItem(
        'auth-tokens',
        JSON.stringify({ accessToken: injectedToken, refreshToken: '', expiresIn: 86400 })
      )
      localStorage.setItem('auth-user', JSON.stringify(injectedUser))
      document.cookie = `auth-token=${encodeURIComponent(injectedToken)}; path=/`
    },
    { injectedToken: token, injectedUser: user }
  )

  await page.goto(frontendOrigin, { waitUntil: 'domcontentloaded', timeout: 60000 })
}

async function verifyFrontendDom({ frontendOrigin, productId, token, user, expected }) {
  const browser = await puppeteer.launch({ headless: true })

  try {
    const detailPage = await browser.newPage()
    await primeBrowserSession(detailPage, frontendOrigin, token, user)
    await detailPage.goto(`${frontendOrigin}/products/${productId}`, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    })

    await detailPage.waitForFunction(
      ({ name, categoryName, stockQuantity, minStock, maxStock }) => {
        const text = document.body?.innerText || ''
        return [name, categoryName, String(stockQuantity), String(minStock), String(maxStock)].every((value) => text.includes(value))
      },
      { timeout: 60000 },
      {
        name: expected.name,
        categoryName: expected.categoryName,
        stockQuantity: expected.stockQuantity,
        minStock: expected.minStock,
        maxStock: expected.maxStock,
      }
    )

    const detailSnapshot = await detailPage.evaluate(() => ({
      title: document.title,
      text: document.body?.innerText || '',
    }))

    assert(detailSnapshot.text.includes(expected.name), 'Le nom du produit n\'apparaît pas sur la page détail')
    assert(detailSnapshot.text.includes(expected.categoryName), 'La catégorie n\'apparaît pas sur la page détail')

    const editPage = await browser.newPage()
    await primeBrowserSession(editPage, frontendOrigin, token, user)
    await editPage.goto(`${frontendOrigin}/products/${productId}/edit`, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    })

    await editPage.waitForSelector('#name', { timeout: 60000 })
    await editPage.waitForFunction(
      ({ name, sku, barcode, description, categoryId, price, costPrice, stock, minStock, maxStock }) => {
        const valueOf = (selector) => document.querySelector(selector)?.value ?? ''
        return valueOf('#name') === name
          && valueOf('#sku') === sku
          && valueOf('#barcode') === barcode
          && valueOf('#description') === description
          && valueOf('#categoryId') === categoryId
          && valueOf('#price') === String(price)
          && valueOf('#costPrice') === String(costPrice)
          && valueOf('#stock') === String(stock)
          && valueOf('#minStock') === String(minStock)
          && valueOf('#maxStock') === String(maxStock)
      },
      { timeout: 60000 },
      {
        name: expected.name,
        sku: expected.sku,
        barcode: expected.barcode,
        description: expected.description,
        categoryId: expected.categoryId,
        price: expected.price,
        costPrice: expected.costPrice,
        stock: expected.stockQuantity,
        minStock: expected.minStock,
        maxStock: expected.maxStock,
      }
    )

    const editSnapshot = await editPage.evaluate(() => ({
      name: document.querySelector('#name')?.value ?? '',
      sku: document.querySelector('#sku')?.value ?? '',
      barcode: document.querySelector('#barcode')?.value ?? '',
      description: document.querySelector('#description')?.value ?? '',
      categoryId: document.querySelector('#categoryId')?.value ?? '',
      price: document.querySelector('#price')?.value ?? '',
      costPrice: document.querySelector('#costPrice')?.value ?? '',
      stock: document.querySelector('#stock')?.value ?? '',
      minStock: document.querySelector('#minStock')?.value ?? '',
      maxStock: document.querySelector('#maxStock')?.value ?? '',
    }))

    return {
      detailPage: {
        title: detailSnapshot.title,
        containsCategory: detailSnapshot.text.includes(expected.categoryName),
      },
      editPage: editSnapshot,
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  const login = await requestJson('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const token = login?.data?.tokens?.accessToken
  const user = login?.data?.user
  if (!token) throw new Error('Token JWT non obtenu')
  if (!user) throw new Error('Utilisateur connecté introuvable')

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  console.log(`LOGIN_OK:${login.data.user.email}`)

  const category = await requestJson('/api/v1/categories', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `E2E Catégorie Produit ${suffix}`,
      description: 'Catégorie créée automatiquement pour vérifier la persistance produit.',
    }),
  })

  const categoryId = category?.data?.id
  if (!categoryId) throw new Error('Catégorie de test non créée')
  console.log(`CATEGORY_OK:${categoryId}:${category.data.name}`)

  const created = await requestJson('/api/v1/products', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `Produit E2E ${suffix}`,
      sku: `E2E-${suffix}`,
      barcode: `357${suffix}`,
      description: 'Produit de validation automatique après migration.',
      price: 12500,
      cost: 8300,
      stockQuantity: 14,
      minStock: 3,
      maxStock: 28,
      categoryId,
      vatRate: 19,
    }),
  })

  const productId = created?.data?.id
  if (!productId) throw new Error('Produit de test non créé')
  console.log(`PRODUCT_CREATE_OK:${productId}`)

  const readCreated = await requestJson(`/api/v1/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } })
  console.log(`PRODUCT_READ_CREATE:${JSON.stringify({
    category: readCreated.data.category?.name,
    costPrice: readCreated.data.costPrice,
    minStock: readCreated.data.minStock,
    maxStock: readCreated.data.maxStock,
    stock: readCreated.data.stock,
  })}`)

  const stockCreated = await requestJson(`/api/v1/stock/unified/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } })
  assert(
    stockCreated.data?.category?.name === category.data.name,
    'La catégorie est absente du stock unifié après création'
  )
  console.log(`STOCK_READ_CREATE:${JSON.stringify(stockCreated.data)}`)

  await requestJson(`/api/v1/products/${productId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      price: 13900,
      cost: 9100,
      stockQuantity: 17,
      minStock: 5,
      maxStock: 35,
      categoryId,
      description: 'Produit de validation automatique mis à jour.',
    }),
  })
  console.log(`PRODUCT_UPDATE_OK:${productId}`)

  const readUpdated = await requestJson(`/api/v1/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } })
  console.log(`PRODUCT_READ_UPDATE:${JSON.stringify({
    category: readUpdated.data.category?.name,
    costPrice: readUpdated.data.costPrice,
    minStock: readUpdated.data.minStock,
    maxStock: readUpdated.data.maxStock,
    stock: readUpdated.data.stock,
    price: readUpdated.data.price,
  })}`)

  const stockUpdated = await requestJson(`/api/v1/stock/unified/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } })
  assert(
    stockUpdated.data?.category?.name === category.data.name,
    'La catégorie est absente du stock unifié après mise à jour'
  )
  console.log(`STOCK_READ_UPDATE:${JSON.stringify(stockUpdated.data)}`)

  const productPage = await requestPage(`${frontendUrl}/products/${productId}`, token)
  const editPage = await requestPage(`${frontendUrl}/products/${productId}/edit`, token)
  console.log(`FRONTEND_PAGES:${JSON.stringify({ productPage, editPage })}`)

  const frontendDom = await verifyFrontendDom({
    frontendOrigin: frontendUrl,
    productId,
    token,
    user,
    expected: {
      name: readUpdated.data.name,
      sku: readUpdated.data.sku,
      barcode: readUpdated.data.barcode,
      description: readUpdated.data.description,
      categoryId,
      categoryName: readUpdated.data.category?.name || category.data.name,
      price: readUpdated.data.price,
      costPrice: readUpdated.data.costPrice,
      stockQuantity: stockUpdated.data.stockQuantity,
      minStock: stockUpdated.data.minStock,
      maxStock: stockUpdated.data.maxStock,
    },
  })
  console.log(`FRONTEND_DOM:${JSON.stringify(frontendDom)}`)

  console.log('EXIT:0')
}

main().catch((error) => {
  console.error(`ERROR:${error.message}`)
  console.log('EXIT:1')
  process.exit(1)
})

