// Vercel serverless function — replaces the Express proxy for production
// Reads credentials from Vercel environment variables
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
  if (!res.ok) throw new Error(`Token failed: ${res.status}`)
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + data.expires_in * 1000
  return cachedToken
}

export default async function handler(req, res) {
  try {
    const token = await getToken()
    const { path } = req.query
    const pathStr = Array.isArray(path) ? path.join('/') : path ?? ''
    const url = new URL(`${BC_BASE}/${pathStr}`)
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    const fullUrl = `${url.toString()}${qs}`

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
    let body = undefined
    if (hasBody) {
      if (isBinary) {
        // Collect raw binary chunks
        body = await new Promise((resolve, reject) => {
          const chunks = []
          req.on('data', c => chunks.push(c))
          req.on('end', () => resolve(Buffer.concat(chunks)))
          req.on('error', reject)
        })
      } else {
        body = JSON.stringify(req.body)
      }
    }

    const upstream = await fetch(fullUrl, { method: req.method, headers, body })

    res.status(upstream.status)
    const etag = upstream.headers.get('etag')
    if (etag) res.setHeader('ETag', etag)
    res.setHeader('Access-Control-Allow-Origin', '*')

    const text = await upstream.text()
    if (upstream.status === 204 || !text) return res.end()
    const ct = upstream.headers.get('content-type') ?? ''
    res.setHeader('Content-Type', ct || 'application/json')
    res.send(text)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }
