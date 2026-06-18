import bcClient from './bcClient'
import type { KhajaLine, LineStatusFilter, ODataResponse } from '../types/khaja'

export async function getLinesByEmail(email: string, statusFilter: LineStatusFilter = 'Active'): Promise<KhajaLine[]> {
  const encodedEmail = encodeURIComponent(email)
  let filter = `userEmail eq '${encodedEmail}'`
  if (statusFilter === 'Active') {
    // Active = everything not yet fully paid (Unpaid + Accepted + Rejected)
    filter += ` and paymentStatus ne 'Paid'`
  } else if (statusFilter !== 'All') {
    filter += ` and paymentStatus eq '${statusFilter}'`
  }
  const res = await bcClient.get<ODataResponse<KhajaLine>>(`/khajaLines?$filter=${filter}`)
  return res.data.value
}

export async function getAllLines(statusFilter: LineStatusFilter = 'All'): Promise<KhajaLine[]> {
  // Active = all non-paid lines (Unpaid + Accepted + Rejected)
  const filter = statusFilter === 'Active'
    ? `?$filter=paymentStatus ne 'Paid'`
    : statusFilter !== 'All'
      ? `?$filter=paymentStatus eq '${statusFilter}'`
      : ''
  const res = await bcClient.get<ODataResponse<KhajaLine>>(`/khajaLines${filter}`)
  return res.data.value
}

export async function getLinesByDocument(documentNo: string, statusFilter: LineStatusFilter = 'All'): Promise<KhajaLine[]> {
  let filter = `documentNo eq '${documentNo}'`
  if (statusFilter !== 'All') filter += ` and paymentStatus eq '${statusFilter}'`
  const res = await bcClient.get<ODataResponse<KhajaLine>>(`/khajaLines?$filter=${filter}`)
  return res.data.value
}

export async function getLine(id: string): Promise<{ line: KhajaLine; etag: string }> {
  const res = await bcClient.get<KhajaLine>(`/khajaLines(${id})`)
  return { line: res.data, etag: '*' }
}

export async function createLine(data: Partial<KhajaLine>): Promise<KhajaLine> {
  const res = await bcClient.post<KhajaLine>('/khajaLines', data)
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

export async function attachScreenshot(id: string, screenshotBase64: string, etag: string): Promise<KhajaLine> {
  const res = await bcClient.patch<KhajaLine>(
    `/khajaLines(${id})`,
    { screenshotBase64 },
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

// Step 1: mark as paid with note
export async function markAsPaid(id: string, paymentNote: string, etag: string): Promise<KhajaLine> {
  const res = await bcClient.patch<KhajaLine>(
    `/khajaLines(${id})`,
    { paymentStatus: 'Paid', paymentNote },
    { headers: { 'If-Match': etag } }
  )
  return res.data
}

// Step 2: upload screenshot binary to the OData media endpoint
export async function uploadScreenshotBinary(id: string, blob: Blob, etag: string): Promise<void> {
  await bcClient.patch(
    `/khajaLines(${id})/screenshot`,
    blob,
    {
      headers: {
        'If-Match': etag,
        'Content-Type': blob.type || 'image/jpeg',
      },
    }
  )
}

// Legacy combined helper kept for API compatibility
export async function markPaidWithScreenshot(
  id: string,
  paymentNote: string,
  screenshotBase64: string,
  etag: string
): Promise<KhajaLine> {
  return markAsPaid(id, paymentNote, etag)
}

export async function deleteLine(id: string, etag: string): Promise<void> {
  await bcClient.delete(`/khajaLines(${id})`, { headers: { 'If-Match': etag } })
}
