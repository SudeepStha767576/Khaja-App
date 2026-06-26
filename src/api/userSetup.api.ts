import bcClient from './bcClient'
import type { KhajaUserSetup, ODataResponse } from '../types/khaja'

const SESSION_KEY_PREFIX = 'khaja_user_'

export async function getUsers(activeOnly = true): Promise<KhajaUserSetup[]> {
  const filter = activeOnly ? '?$filter=active eq true' : ''
  const res = await bcClient.get<ODataResponse<KhajaUserSetup>>(`/khajaUserSetups${filter}`)
  return res.data.value
}

export async function getUserByEmail(email: string): Promise<KhajaUserSetup | undefined> {
  const lower = email.toLowerCase()
  const cacheKey = SESSION_KEY_PREFIX + lower

  // Try sessionStorage cache first — avoids downloading all users on every app load
  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) return JSON.parse(cached) as KhajaUserSetup
  } catch { /* sessionStorage unavailable */ }

  // Fetch all active users and match client-side (BC OData string filter is case-sensitive)
  const res = await bcClient.get<ODataResponse<KhajaUserSetup>>('/khajaUserSetups?$filter=active eq true')
  const user = res.data.value.find(u => u.email.toLowerCase() === lower)

  // Cache for the session
  if (user) {
    try { sessionStorage.setItem(cacheKey, JSON.stringify(user)) } catch { /* ignore */ }
  }
  return user
}

export function clearUserCache(email?: string) {
  if (email) {
    try { sessionStorage.removeItem(SESSION_KEY_PREFIX + email.toLowerCase()) } catch { /* ignore */ }
  } else {
    try {
      Object.keys(sessionStorage)
        .filter(k => k.startsWith(SESSION_KEY_PREFIX))
        .forEach(k => sessionStorage.removeItem(k))
    } catch { /* ignore */ }
  }
}

export async function createUser(data: Partial<KhajaUserSetup>): Promise<KhajaUserSetup> {
  const res = await bcClient.post<KhajaUserSetup>('/khajaUserSetups', data)
  return res.data
}

export async function updateUser(id: string, data: Partial<KhajaUserSetup>, etag: string): Promise<KhajaUserSetup> {
  const res = await bcClient.patch<KhajaUserSetup>(`/khajaUserSetups(${id})`, data, {
    headers: { 'If-Match': etag },
  })
  return res.data
}

export async function uploadQRCode(id: string, qrCodeBase64: string, etag: string): Promise<KhajaUserSetup> {
  const res = await bcClient.patch<KhajaUserSetup>(
    `/khajaUserSetups(${id})`,
    { qrCodeBase64 },
    { headers: { 'If-Match': etag } }
  )
  return res.data
}
