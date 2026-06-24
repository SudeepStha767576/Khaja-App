export interface KhajaHeader {
  id: string
  no: string
  date: string
  description: string
  paymentBy: string
  paymentByName: string
  status: 'Open' | 'Released' | 'Closed'
  totalAmount: number
  releasedDate?: string
  releasedBy?: string
  createdBy?: string
  createdDateTime?: string
  createdByUserCode?: string
}

export interface KhajaLine {
  id: string
  documentNo: string
  lineNo: number
  userCode: string
  userName: string
  userEmail: string
  description: string
  amount: number
  paymentStatus: 'Unpaid' | 'Accepted' | 'Rejected' | 'Paid'
  paidDateTime?: string
  paymentNote?: string
  screenshotAttached: boolean
  screenshotBase64?: string
  paymentByQrBase64?: string
  paymentByName?: string
  headerDescription?: string
  rejectionReason?: string
  acceptedDateTime?: string
  rejectedDateTime?: string
}

export interface KhajaUserSetup {
  id: string
  code: string
  name: string
  email: string
  active: boolean
  qrCodeBase64?: string
}

export type LineStatusFilter = 'Unpaid' | 'Accepted' | 'Rejected' | 'Paid' | 'All' | 'Active'

export interface ODataResponse<T> {
  value: T[]
  '@odata.count'?: number
  '@odata.nextLink'?: string
}
