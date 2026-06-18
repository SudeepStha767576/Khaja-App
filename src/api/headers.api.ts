import bcClient from './bcClient'
import type { KhajaHeader, ODataResponse } from '../types/khaja'

export async function getHeaders(statusFilter?: string): Promise<KhajaHeader[]> {
  const filter = statusFilter ? `?$filter=status eq '${statusFilter}'` : ''
  const res = await bcClient.get<ODataResponse<KhajaHeader>>(`/khajaHeaders${filter}`)
  return res.data.value
}

export async function getHeader(id: string): Promise<KhajaHeader> {
  const res = await bcClient.get<KhajaHeader>(`/khajaHeaders(${id})`)
  return res.data
}

export async function createHeader(data: Partial<KhajaHeader>): Promise<KhajaHeader> {
  const res = await bcClient.post<KhajaHeader>('/khajaHeaders', data)
  return res.data
}

// Returns headers where I am the payer OR I created the document.
// Uses the custom "Created By User Code" field (not BC's built-in createdBy which stores
// the Entra service app identity). Two parallel calls — BC OData doesn't support OR on different fields.
export async function getMyHeaders(userCode: string, _unused?: string): Promise<KhajaHeader[]> {
  const [byPayer, byCreator] = await Promise.all([
    bcClient.get<ODataResponse<KhajaHeader>>(
      `/khajaHeaders?$filter=paymentBy eq '${encodeURIComponent(userCode)}'`
    ),
    bcClient.get<ODataResponse<KhajaHeader>>(
      `/khajaHeaders?$filter=createdByUserCode eq '${encodeURIComponent(userCode)}'`
    ),
  ])
  const seen = new Set<string>()
  return [...byPayer.data.value, ...byCreator.data.value].filter(h => {
    if (seen.has(h.no)) return false
    seen.add(h.no)
    return true
  })
}

export async function getHeaderByNo(no: string): Promise<KhajaHeader | undefined> {
  const res = await bcClient.get<ODataResponse<KhajaHeader>>(
    `/khajaHeaders?$filter=no eq '${encodeURIComponent(no)}'`
  )
  return res.data.value[0]
}

export async function releaseHeader(id: string): Promise<KhajaHeader> {
  const res = await bcClient.patch<KhajaHeader>(
    `/khajaHeaders(${id})`,
    { status: 'Released' },
    { headers: { 'If-Match': '*' } }
  )
  return res.data
}

export async function updateHeader(id: string, data: Partial<KhajaHeader>, etag: string): Promise<KhajaHeader> {
  const res = await bcClient.patch<KhajaHeader>(`/khajaHeaders(${id})`, data, {
    headers: { 'If-Match': etag },
  })
  return res.data
}
