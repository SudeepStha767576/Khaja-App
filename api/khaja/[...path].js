// Vercel serverless proxy for BC API
const BC_BASE = `https://api.businesscentral.dynamics.com/v2.0/${process.env.TENANT_ID}/${process.env.BC_ENVIRONMENT ?? 'OA'}/api/qnipay/khaja/v1.0`
const TOKEN_URL = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`

let cachedToken = null
let tokenExpiry = 0

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60_000) return cachedToken
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    scope: 'https://api.businesscentral.dynamics.com/.default',
  })
  const res = await fetch(TOKEN_URL, { method: 'POST', body })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Token failed ${res.status}: ${t}`)
  }
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + data.expires_in * 1000
  return cachedToken
}

// Read raw body as Buffer — works for both JSON and binary
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(typeof c === 'string' ? Buffer.from(c) : c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,If-Match,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const token = await getToken()

    // Derive path and query string from req.url
    const rawUrl = req.url ?? ''
    const stripped = rawUrl.replace(/^\/api\/khaja\/?/, '')
    const qIndex = stripped.indexOf('?')
    const pathStr = qIndex >= 0 ? stripped.slice(0, qIndex) : stripped
    const qs      = qIndex >= 0 ? stripped.slice(qIndex) : ''
    const fullUrl = `${BC_BASE}/${pathStr}${qs}`

    console.log('[BC Proxy]', req.method, fullUrl)

    const contentType = req.headers['content-type'] ?? ''
    const isBinary = contentType.startsWith('image/') || contentType === 'application/octet-stream'

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': isBinary ? contentType : 'application/json',
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    }
    if (req.headers['if-match']) headers['If-Match'] = req.headers['if-match']

    let bodyData = undefined
    const hasBody = ['POST', 'PATCH', 'PUT'].includes(req.method)
    if (hasBody) {
      // Read raw body — bodyParser is disabled so we always get the raw stream
      const rawBuffer = await readRawBody(req)
      bodyData = rawBuffer.length > 0 ? rawBuffer : undefined
    }

    const upstream = await fetch(fullUrl, { method: req.method, headers, body: bodyData })

    res.status(upstream.status)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Pragma', 'no-cache')

    const text = await upstream.text()
    if (upstream.status === 204 || !text) return res.end()

    const ct = upstream.headers.get('content-type') ?? 'application/json'
    res.setHeader('Content-Type', ct)
    res.send(text)
  } catch (err) {
    console.error('[BC Proxy Error]', err.message)
    res.status(502).json({ error: err.message })
  }
}

// IMPORTANT: disable bodyParser so we can read raw binary body for image uploads
export const config = {
  api: {
    bodyParser: false,
  },
}
