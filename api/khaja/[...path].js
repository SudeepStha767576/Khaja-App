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

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,If-Match,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const token = await getToken()

    // Build path from route param
    const { path } = req.query
    const pathStr = Array.isArray(path) ? path.join('/') : (path ?? '')

    // Preserve raw query string from req.url so OData $-prefixed params
    // ($filter, $top, $select) are NOT percent-encoded — BC won't recognise %24filter
    const rawUrl = req.url ?? ''
    const qIndex = rawUrl.indexOf('?')
    const qs = qIndex >= 0 ? rawUrl.slice(qIndex) : ''

    const fullUrl = `${BC_BASE}/${pathStr}${qs}`

    const isBinary = (req.headers['content-type'] ?? '').startsWith('image/')

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': isBinary ? req.headers['content-type'] : 'application/json',
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    }
    if (req.headers['if-match']) headers['If-Match'] = req.headers['if-match']

    const hasBody = ['POST', 'PATCH', 'PUT'].includes(req.method)
    let bodyData = undefined
    if (hasBody) {
      if (isBinary) {
        bodyData = await new Promise((resolve, reject) => {
          const chunks = []
          req.on('data', c => chunks.push(c))
          req.on('end', () => resolve(Buffer.concat(chunks)))
          req.on('error', reject)
        })
      } else {
        bodyData = JSON.stringify(req.body)
      }
    }

    const upstream = await fetch(fullUrl, { method: req.method, headers, body: bodyData })

    res.status(upstream.status)
    const etag = upstream.headers.get('etag')
    if (etag) res.setHeader('ETag', etag)

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

export const config = {
  api: {
    bodyParser: { sizeLimit: '20mb' },
  },
}
