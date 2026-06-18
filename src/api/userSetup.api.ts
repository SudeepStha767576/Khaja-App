import bcClient from './bcClient'
import type { KhajaUserSetup, ODataResponse } from '../types/khaja'

export async function getUsers(activeOnly = true): Promise<KhajaUserSetup[]> {
  const filter = activeOnly ? '?$filter=active eq true' : ''
  const res = await bcClient.get<ODataResponse<KhajaUserSetup>>(`/khajaUserSetups${filter}`)
  return res.data.value
}

export async function getUserByEmail(email: string): Promise<KhajaUserSetup | undefined> {
  // Fetch all active users and match locally — BC OData string filter is case-sensitive
  const res = await bcClient.get<ODataResponse<KhajaUserSetup>>('/khajaUserSetups?$filter=active eq true')
  const lower = email.toLowerCase()
  return res.data.value.find((u) => u.email.toLowerCase() === lower)
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
