import bcClient from './bcClient'
import type { KhajaLine, LineStatusFilter, ODataResponse } from '../types/khaja'

// Fields needed for list views — excludes heavy base64 blobs (screenshotBase64)
const LIST_SELECT = '$select=id,documentNo,lineNo,userCode,userName,userEmail,description,amount,paymentStatus,paidDateTime,paymentNote,screenshotAttached,rejectionReason,acceptedDateTime,rejectedDateTime,paymentByQrBase64,paymentByName,headerDescription'

// 30-second in-memory cache for getLinesByDocument results
const lineDocCache = new Map<string, { data: KhajaLine[]; ts: number }>()
const LINE_CACHE_TTL = 30_000

function getCached(key: string): KhajaLine[] | null {
  const entry = lineDocCache.get(key)
  if (entry && Date.now() - entry.ts < LINE_CACHE_TTL) return entry.data
  lineDocCache.delete(key)
  return null
}
function setCached(key: string, data: KhajaLine[]) {
  lineDocCache.set(key, { data, ts: Date.now() })
}
export function invalidateLineCache(documentNo?: string) {
  if (documentNo) lineDocCache.delete(documentNo)
  else lineDocCache.clear()
}

export async function getLinesByEmail(email: string, statusFilter: LineStatusFilter = 'Active'): Promise<KhajaLine[]> {
  const encodedEmail = encodeURIComponent(email)
  let filter = `userEmail eq '${encodedEmail}'`
  if (statusFilter === 'Active') {
    filter += ` and paymentStatus ne 'Paid'`
  } else if (statusFilter !== 'All') {
    filter += ` and paymentStatus eq '${statusFilter}'`
  }
  const res = await bcClient.get<ODataResponse<KhajaLine>>(`/khajaLines?${LIST_SELECT}&$filter=${filter}`)
  return res.data.value
}

export async function getAllLines(statusFilter: LineStatusFilter = 'All'): Promise<KhajaLine[]> {
  const filterPart = statusFilter === 'Active'
    ? `&$filter=paymentStatus ne 'Paid'`
    : statusFilter !== 'All'
      ? `&$filter=paymentStatus eq '${statusFilter}'`
      : ''
  const res = await bcClient.get<ODataResponse<KhajaLine>>(`/khajaLines?${LIST_SELECT}${filterPart}`)
  return res.data.value
}

export async function getLinesByDocument(documentNo: string, statusFilter: LineStatusFilter = 'All'): Promise<KhajaLine[]> {
  const cacheKey = `${documentNo}:${statusFilter}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  let filter = `documentNo eq '${documentNo}'`
  if (statusFilter !== 'All') filter += ` and paymentStatus eq '${statusFilter}'`
  const res = await bcClient.get<ODataResponse<KhajaLine>>(`/khajaLines?${LIST_SELECT}&$filter=${filter}`)
  setCached(cacheKey, res.data.value)
  return res.data.value
}

export async function getLine(id: string): Promise<{ line: KhajaLine; etag: string }> {
  // Full fetch for detail view — includes screenshotBase64
  const res = await bcClient.get<KhajaLine>(`/khajaLines(${id})`)
  return { line: res.data, etag: '*' }
}

export async function createLine(data: Partial<KhajaLine>): Promise<KhajaLine> {
  const res = await bcClient.post<KhajaLine>('/khajaLines', data)
  invalidateLineCache(data.documentNo)
  return res.data
}

export async function markLineAsPaid(id: string, paymentNote: string, etag: string): Promise<KhajaLine> {
  const res = await bcClient.patch<KhajaLine>(
    `/khajaLines(${id})`,
    { paymentStatus: 'Paid', paymentNote },
    { headers: { 'If-Match': etag } }
  )
  return res.data
}

export async function acceptLine(id: string): Promise<KhajaLine> {
  const res = await bcClient.patch<KhajaLine>(
    `/khajaLines(${id})`,
    { paymentStatus: 'Accepted' },
    { headers: { 'If-Match': '*' } }
  )
  return res.data
}

export async function rejectLine(id: string, reason: string): Promise<KhajaLine> {
  const res = await bcClient.patch<KhajaLine>(
    `/khajaLines(${id})`,
    { paymentStatus: 'Rejected', rejectionReason: reason },
    { headers: { 'If-Match': '*' } }
  )
  return res.data
}

export async function resetLine(id: string, newAmount?: number): Promise<KhajaLine> {
  const body: Record<string, unknown> = { paymentStatus: 'Unpaid' }
  if (newAmount !== undefined) body.amount = newAmount
  const res = await bcClient.patch<KhajaLine>(
    `/khajaLines(${id})`,
    body,
    { headers: { 'If-Match': '*' } }
  )
  return res.data
}

export async function markAsPaid(id: string, paymentNote: string, etag: string, screenshotBase64?: string): Promise<KhajaLine> {
  const body: Record<string, unknown> = { paymentStatus: 'Paid', paymentNote }
  if (screenshotBase64) body.screenshotBase64 = screenshotBase64
  const res = await bcClient.patch<KhajaLine>(
    `/khajaLines(${id})`,
    body,
    { headers: { 'If-Match': etag } }
  )
  return res.data
}

export async function uploadScreenshotBinary(id: string, blob: Blob, etag: string): Promise<void> {
  await bcClient.patch(
    `/khajaLines(${id})/screenshot`,
    blob,
    { headers: { 'If-Match': etag, 'Content-Type': blob.type || 'image/jpeg' } }
  )
}

export async function markPaidWithScreenshot(
  id: string,
  paymentNote: string,
  _screenshotBase64: string,
  etag: string
): Promise<KhajaLine> {
  return markAsPaid(id, paymentNote, etag)
}

export async function deleteLine(id: string, etag: string): Promise<void> {
  await bcClient.delete(`/khajaLines(${id})`, { headers: { 'If-Match': etag } })
}
