import 'dotenv/config'
import express from 'express'

const { CLIENT_ID, CLIENT_SECRET, TENANT_ID, BC_ENVIRONMENT = 'sandbox' } = process.env

if (!CLIENT_ID || !CLIENT_SECRET || !TENANT_ID) {
  console.error('Missing required env vars. Copy server/.env.example to server/.env and fill in values.')
  process.exit(1)
}

const BC_BASE = `https://api.businesscentral.dynamics.com/v2.0/${TENANT_ID}/${BC_ENVIRONMENT}/api/qnipay/khaja/v1.0`
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`

let cachedToken = null
let tokenExpiry = 0

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60_000) return cachedToken

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://api.businesscentral.dynamics.com/.default',
  })

  const res = await fetch(TOKEN_URL, { method: 'POST', body })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token request failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + data.expires_in * 1000
  console.log('BC token refreshed, expires in', data.expires_in, 's')
  return cachedToken
}

const app = express()
app.set('etag', false) // Prevent Express from overwriting BC's ETag with its own

// Raw binary body parser for media uploads (screenshot, QR code)
app.use('/api/khaja', (req, res, next) => {
  const ct = req.headers['content-type'] ?? ''
  if (ct.startsWith('image/') || ct === 'application/octet-stream') {
    let chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => { req.rawBody = Buffer.concat(chunks); next() })
  } else {
    next()
  }
})

app.use(express.json({ limit: '20mb' }))

app.all('/api/khaja/:path(*)', async (req, res) => {
  try {
    const token = await getToken()

    const qIndex = req.originalUrl.indexOf('?')
    const qs = qIndex >= 0 ? req.originalUrl.slice(qIndex) : ''
    const url = `${BC_BASE}/${req.params.path}${qs}`

    const isBinary = req.rawBody != null
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': isBinary ? (req.headers['content-type'] || 'application/octet-stream') : 'application/json',
      'Accept': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    }
    if (req.headers['if-match']) headers['If-Match'] = req.headers['if-match']

    const hasBody = ['POST', 'PATCH', 'PUT'].includes(req.method)
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: hasBody ? (isBinary ? req.rawBody : JSON.stringify(req.body)) : undefined,
    })

    res.status(upstream.status)
    const etag = upstream.headers.get('etag')
    if (etag) res.setHeader('ETag', etag)

    const text = await upstream.text()
    if (upstream.status === 204 || !text) return res.end()

    // Use res.send() with explicit Content-Type — avoids Express re-parsing and
    // overwriting BC's ETag header with its own hash
    const ct = upstream.headers.get('content-type') ?? 'application/json'
    res.setHeader('Content-Type', ct)
    res.send(text)
  } catch (err) {
    console.error('Proxy error:', err.message)
    res.status(502).json({ error: err.message })
  }
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`BC proxy listening on http://localhost:${PORT}`))
