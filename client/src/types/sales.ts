export type SalesRecord = {
  id: string
  date: string
  product: string
  sku?: string
  category?: string
  quantity: number
  unitPrice?: number
  revenue: number
  unitCost?: number
  discount?: number
  transactionId?: string
  sourceRow: number
}

export type ColumnField =
  | 'date'
  | 'transactionId'
  | 'product'
  | 'sku'
  | 'category'
  | 'quantity'
  | 'unitPrice'
  | 'unitCost'
  | 'revenue'
  | 'discount'

export type ColumnMapping = Partial<Record<ColumnField, string>>

export type ParseResult = {
  headers: string[]
  rows: unknown[][]
  rowNumbers: number[]
  sheetNames: string[]
  selectedSheet: string
  preview: unknown[][]
}

export type ImportResult = {
  records: SalesRecord[]
  duplicateRecords: SalesRecord[]
  invalidRows: { row: number; reasons: string[] }[]
  duplicateRows: { row: number; duplicateOf: number }[]
  revenueWarnings: { row: number; provided: number; calculated: number }[]
}
