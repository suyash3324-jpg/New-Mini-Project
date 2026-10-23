import { describe, expect, it } from 'vitest'
import { createSampleTemplate, MAX_FILE_BYTES, parseSpreadsheet, suggestColumnMapping, validateAndMapRows } from './spreadsheet'

describe('spreadsheet mapping and validation', () => {
  it('suggests common alternative headers', () => {
    expect(suggestColumnMapping(['Sale Date', 'Item', 'Qty', 'Selling Price', 'Cost Price', 'Invoice Number'])).toMatchObject({
      date: 'Sale Date',
      product: 'Item',
      quantity: 'Qty',
      unitPrice: 'Selling Price',
      unitCost: 'Cost Price',
      transactionId: 'Invoice Number',
    })
  })

  it('uses provided revenue as truth and reports material price discrepancies', () => {
    const result = validateAndMapRows(
      ['Date', 'Product', 'Quantity', 'Selling Price', 'Revenue'],
      [['2026-10-01', 'Tea', 2, 10, 25]],
      { date: 'Date', product: 'Product', quantity: 'Quantity', unitPrice: 'Selling Price', revenue: 'Revenue' },
    )
    expect(result.records[0].revenue).toBe(25)
    expect(result.revenueWarnings).toEqual([{ row: 2, provided: 25, calculated: 20 }])
  })

  it('calculates revenue from price, quantity, and discount when total is absent', () => {
    const result = validateAndMapRows(
      ['Date', 'Product', 'Quantity', 'Price', 'Discount'],
      [['01/10/2026', 'Tea', 2, 10, 3]],
      { date: 'Date', product: 'Product', quantity: 'Quantity', unitPrice: 'Price', discount: 'Discount' },
    )
    expect(result.records[0]).toMatchObject({ date: '2026-10-01', revenue: 17, quantity: 2 })
  })

  it('marks invalid rows and duplicate transaction lines without importing them', () => {
    const result = validateAndMapRows(
      ['Date', 'Invoice Number', 'Product', 'Qty', 'Amount'],
      [
        ['2026-10-01', 'A-1', 'Tea', 2, 20],
        ['2026-10-01', 'A-1', 'Tea', 2, 20],
        ['bad-date', 'A-2', 'Bread', -1, -4],
      ],
      { date: 'Date', transactionId: 'Invoice Number', product: 'Product', quantity: 'Qty', revenue: 'Amount' },
    )
    expect(result.records).toHaveLength(1)
    expect(result.duplicateRows).toEqual([{ row: 3, duplicateOf: 2 }])
    expect(result.duplicateRecords).toHaveLength(1)
    expect(result.invalidRows[0].row).toBe(4)
    expect(result.invalidRows[0].reasons).toContain('Quantity must be greater than zero')
  })

  it('requires date, product, quantity, and revenue or unit price', () => {
    expect(() => validateAndMapRows(['Product'], [['Tea']], { product: 'Product' })).toThrow('Map the required columns')
  })

  it('parses CSV headers and rows in the browser without a server', async () => {
    const file = new File(['Date,Product,Qty,Price\n2026-10-01,Tea,2,10'], 'sales.csv', { type: 'text/csv' })
    const parsed = await parseSpreadsheet(file)
    expect(parsed.headers).toEqual(['Date', 'Product', 'Qty', 'Price'])
    const result = validateAndMapRows(parsed.headers, parsed.rows, {
      date: 'Date', product: 'Product', quantity: 'Qty', unitPrice: 'Price',
    }, parsed.rowNumbers)
    expect(result.records[0]).toMatchObject({ date: '2026-10-01', product: 'Tea', quantity: 2, revenue: 20, sourceRow: 2 })
  })

  it('rejects unsupported file extensions before parsing', async () => {
    const file = new File(['nope'], 'sales.txt')
    await expect(parseSpreadsheet(file)).rejects.toThrow('Choose an .xlsx, .xls, or .csv file.')
  })

  it('rejects worksheets whose first row looks like sales data rather than headers', async () => {
    const file = new File(['2026-10-01,Tea,2,10\n2026-10-02,Bread,1,5'], 'no-headers.csv')
    await expect(parseSpreadsheet(file)).rejects.toThrow('first row appears to contain sales data')
  })

  it('does not deduplicate identical rows when no transaction identifier exists', () => {
    const result = validateAndMapRows(
      ['Date', 'Product', 'Qty', 'Revenue'],
      [['2026-10-01', 'Tea', 2, 20], ['2026-10-01', 'Tea', 2, 20]],
      { date: 'Date', product: 'Product', quantity: 'Qty', revenue: 'Revenue' },
    )
    expect(result.records).toHaveLength(2)
    expect(result.duplicateRows).toHaveLength(0)
  })

  it('limits uploaded file size and produces a valid sample workbook', async () => {
    const oversized = new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'large.csv')
    await expect(parseSpreadsheet(oversized)).rejects.toThrow('10 MB or smaller')
    const templateFile = new File([createSampleTemplate()], 'template.xlsx')
    const parsed = await parseSpreadsheet(templateFile)
    expect(parsed.headers).toContain('Transaction ID')
    expect(parsed.rows).toHaveLength(3)
  })
})
