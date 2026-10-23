import * as XLSX from 'xlsx'
import { z } from 'zod'
import type { ColumnField, ColumnMapping, ImportResult, ParseResult, SalesRecord } from '../types/sales'

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_RECORDS = 20_000

export const salesRecordSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  product: z.string().min(1),
  sku: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().finite().positive(),
  unitPrice: z.number().finite().nonnegative().optional(),
  revenue: z.number().finite().nonnegative(),
  unitCost: z.number().finite().nonnegative().optional(),
  discount: z.number().finite().nonnegative().optional(),
  transactionId: z.string().optional(),
  sourceRow: z.number().int().positive(),
})

const aliases: Record<ColumnField, string[]> = {
  date: ['date', 'sale date', 'order date', 'transaction date', 'created at'],
  transactionId: ['transaction id', 'transactionid', 'invoice number', 'invoice no', 'order id', 'receipt number'],
  product: ['product', 'product name', 'item', 'item name', 'name'],
  sku: ['sku', 'product id', 'item id', 'code'],
  category: ['category', 'product category', 'type'],
  quantity: ['quantity', 'qty', 'units sold', 'units', 'amount sold'],
  unitPrice: ['unit price', 'selling price', 'price', 'sale price'],
  unitCost: ['unit cost', 'cost price', 'purchase price', 'cost'],
  revenue: ['total sales', 'revenue', 'amount', 'total revenue', 'sales'],
  discount: ['discount amount', 'discount', 'discount value'],
}

export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((header) => normalizeHeader(header))
  const mapping: ColumnMapping = {}
  for (const [field, candidates] of Object.entries(aliases) as [ColumnField, string[]][]) {
    const index = normalized.findIndex((header) =>
      candidates.some((candidate) => header === normalizeHeader(candidate)),
    )
    if (index !== -1) mapping[field] = headers[index]
  }
  return mapping
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

export async function parseSpreadsheet(file: File, sheetName?: string): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
    throw new Error('Choose an .xlsx, .xls, or .csv file.')
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('Files must be 10 MB or smaller.')
  if (file.size === 0) throw new Error('The selected file is empty.')

  let workbook: XLSX.WorkBook
  try {
    const buffer = await file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array', bookVBA: false, sheetRows: MAX_RECORDS + 2 })
  } catch {
    throw new Error('This file could not be read. Check that it is a valid spreadsheet and try again.')
  }
  if (!workbook.SheetNames.length) throw new Error('No worksheets were found in this file.')

  const selectedSheet = sheetName && workbook.SheetNames.includes(sheetName)
    ? sheetName
    : workbook.SheetNames[0]
  const worksheet = workbook.Sheets[selectedSheet]
  if (!worksheet || !worksheet['!ref']) throw new Error('The selected worksheet is empty.')
  const range = XLSX.utils.decode_range(worksheet['!ref'])
  if (range.e.c - range.s.c + 1 > 200) throw new Error('Worksheets are limited to 200 columns.')
  if (range.e.r - range.s.r + 1 > MAX_RECORDS + 1) {
    throw new Error(`This worksheet contains more than ${MAX_RECORDS.toLocaleString()} data rows. Split it into smaller files.`)
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  })
  if (matrix.length < 2) throw new Error('The worksheet needs a header row and at least one data row.')
  const headers = matrix[0].map((cell) => String(cell ?? '').trim())
  if (headers.some((header) => !header)) throw new Error('Every column in the header row must have a name.')
  if (headers.some((header) => parseDate(header) !== undefined) && headers.some((header) => parseNumber(header) !== undefined)) {
    throw new Error('The first row appears to contain sales data, not column headers. Add a header row and try again.')
  }
  if (new Set(headers.map(normalizeHeader)).size !== headers.length) {
    throw new Error('Column headers must be unique.')
  }
  if (matrix.length - 1 > MAX_RECORDS) {
    throw new Error(`This file contains more than ${MAX_RECORDS.toLocaleString()} rows. Split it into smaller files.`)
  }
  const nonEmptyRows = matrix.slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row.some((cell) => cell !== null && cell !== undefined && cell !== ''))
  return {
    headers,
    rows: nonEmptyRows.map(({ row }) => row),
    rowNumbers: nonEmptyRows.map(({ rowNumber }) => rowNumber),
    sheetNames: workbook.SheetNames,
    selectedSheet,
    preview: matrix.slice(0, 11),
  }
}

function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  const cleaned = String(value).trim().replace(/[₹$€£,\s]/g, '')
  if (!cleaned) return undefined
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }
  if (typeof value === 'number' && value > 0) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }
  const text = String(value ?? '').trim()
  if (!text) return undefined
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(text)
  if (iso) {
    const date = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])))
    if (date.getUTCFullYear() === Number(iso[1]) && date.getUTCMonth() === Number(iso[2]) - 1 && date.getUTCDate() === Number(iso[3])) {
      return date.toISOString().slice(0, 10)
    }
  }
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text)
  if (dmy) {
    const date = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])))
    if (date.getUTCFullYear() === Number(dmy[3]) && date.getUTCMonth() === Number(dmy[2]) - 1 && date.getUTCDate() === Number(dmy[1])) {
      return date.toISOString().slice(0, 10)
    }
  }
  const parsed = new Date(text)
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString().slice(0, 10)
}

export function validateAndMapRows(
  headers: string[],
  rows: unknown[][],
  mapping: ColumnMapping,
  rowNumbers?: number[],
): ImportResult {
  const missing: string[] = (['date', 'product', 'quantity'] as const).filter((field) => !mapping[field])
  if (!mapping.revenue && !(mapping.quantity && mapping.unitPrice)) missing.push('revenue or selling price')
  if (missing.length) {
    throw new Error(`Map the required columns before continuing: ${missing.join(', ')}.`)
  }
  const columnIndexes = Object.fromEntries(
    Object.entries(mapping).map(([field, header]) => [field, headers.indexOf(header!)]),
  ) as Partial<Record<ColumnField, number>>
  const read = (row: unknown[], field: ColumnField): unknown =>
    columnIndexes[field] === undefined ? undefined : row[columnIndexes[field]!]

  const records: SalesRecord[] = []
  const duplicateRecords: SalesRecord[] = []
  const invalidRows: ImportResult['invalidRows'] = []
  const duplicateRows: ImportResult['duplicateRows'] = []
  const revenueWarnings: ImportResult['revenueWarnings'] = []
  const signatures = new Map<string, number>()

  rows.forEach((row, index) => {
    const rowNumber = rowNumbers?.[index] ?? index + 2
    const reasons: string[] = []
    const date = parseDate(read(row, 'date'))
    const product = String(read(row, 'product') ?? '').trim()
    const quantity = parseNumber(read(row, 'quantity'))
    const unitPrice = parseNumber(read(row, 'unitPrice'))
    const unitCost = parseNumber(read(row, 'unitCost'))
    const discount = parseNumber(read(row, 'discount'))
    const providedRevenue = parseNumber(read(row, 'revenue'))

    if (!date) reasons.push('Missing or invalid date')
    if (!product) reasons.push('Missing product name')
    if (quantity === undefined) reasons.push('Missing or invalid quantity')
    else if (quantity <= 0) reasons.push('Quantity must be greater than zero')
    if (mapping.revenue && providedRevenue === undefined) reasons.push('Missing or invalid revenue')
    if (mapping.unitPrice && unitPrice === undefined) reasons.push('Missing or invalid unit price')
    if (unitPrice !== undefined && unitPrice < 0) reasons.push('Unit price cannot be negative')
    if (unitCost !== undefined && unitCost < 0) reasons.push('Unit cost cannot be negative')
    if (discount !== undefined && discount < 0) reasons.push('Discount cannot be negative')
    if (providedRevenue !== undefined && providedRevenue < 0) reasons.push('Revenue cannot be negative')
    if (unitPrice !== undefined && quantity !== undefined && discount !== undefined && discount > quantity * unitPrice) {
      reasons.push('Discount cannot exceed the calculated sale amount')
    }

    if (reasons.length) {
      invalidRows.push({ row: rowNumber, reasons })
      return
    }

    const safeQuantity = quantity!
    const calculatedRevenue = safeQuantity * (unitPrice ?? 0) - (discount ?? 0)
    const revenue = providedRevenue ?? Math.max(0, calculatedRevenue)
    if (providedRevenue !== undefined && unitPrice !== undefined) {
      const expected = safeQuantity * unitPrice - (discount ?? 0)
      if (Math.abs(providedRevenue - expected) > Math.max(1, Math.abs(expected) * 0.01)) {
        revenueWarnings.push({ row: rowNumber, provided: providedRevenue, calculated: expected })
      }
    }

    const transactionId = String(read(row, 'transactionId') ?? '').trim() || undefined
    const sku = String(read(row, 'sku') ?? '').trim() || undefined
    const candidate = {
      id: `${rowNumber}-${records.length}`,
      date: date!,
      product,
      sku,
      category: String(read(row, 'category') ?? '').trim() || undefined,
      quantity: safeQuantity,
      unitPrice,
      revenue: roundMoney(revenue),
      unitCost,
      discount,
      transactionId,
      sourceRow: rowNumber,
    }
    const validation = salesRecordSchema.safeParse(candidate)
    if (!validation.success) {
      invalidRows.push({ row: rowNumber, reasons: validation.error.issues.map((issue) => issue.message) })
      return
    }
    if (transactionId) {
      const signature = `${transactionId.toLowerCase()}|${(sku ?? product).toLowerCase()}|${date}|${safeQuantity}|${revenue.toFixed(2)}`
      const existingRow = signatures.get(signature)
      if (existingRow !== undefined) {
        duplicateRows.push({ row: rowNumber, duplicateOf: existingRow })
        duplicateRecords.push(validation.data)
        return
      }
      signatures.set(signature, rowNumber)
    }
    records.push(validation.data)
  })

  return { records, duplicateRecords, invalidRows, duplicateRows, revenueWarnings }
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function createSampleTemplate(): Blob {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Date', 'Transaction ID', 'Product Name', 'SKU', 'Category', 'Quantity', 'Selling Price', 'Cost Price', 'Discount Amount'],
    ['2026-10-01', 'INV-1001', 'Masala Tea 250g', 'TEA-250', 'Grocery', 2, 145, 92, 0],
    ['2026-10-01', 'INV-1001', 'Brown Bread', 'BRD-001', 'Bakery', 1, 55, 32, 5],
    ['2026-10-02', 'INV-1002', 'Notebook A5', 'STN-005', 'Stationery', 3, 48, 25, 0],
  ])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales')
  return new Blob([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
