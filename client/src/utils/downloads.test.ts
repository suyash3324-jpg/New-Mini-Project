// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SalesRecord } from '../types/sales'
import { exportPdfReport, exportSalesCsv } from './downloads'

const sales: SalesRecord[] = [
  {
    id: '1',
    date: '2026-10-01',
    product: 'Tea, "premium"',
    category: 'Grocery',
    quantity: 2,
    unitPrice: 10,
    unitCost: 4,
    revenue: 20,
    transactionId: 'INV-1',
    sourceRow: 2,
  },
]

function mockDownloads() {
  const createObjectURL = vi.fn((blob: Blob) => {
    void blob
    return 'blob:shopinsight-test'
  })
  const revokeObjectURL = vi.fn()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  const createElement = vi.spyOn(document, 'createElement')
  return { createObjectURL, revokeObjectURL, click, createElement }
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('browser report downloads', () => {
  it('generates a quoted UTF-8 CSV with a downloadable filename', async () => {
    const { createObjectURL, click, createElement } = mockDownloads()
    exportSalesCsv(sales)
    const anchor = createElement.mock.results.map((result) => result.value).find((element) => element instanceof HTMLAnchorElement) as HTMLAnchorElement
    expect(anchor.download).toBe('shopinsight-sales.csv')
    expect(click).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0]
    const content = await readBlob(blob)
    expect(content).toContain('"Tea, ""premium"""')
    expect(content).toContain('"INV-1"')
  })

  it('builds a downloadable PDF business report from actual sales', async () => {
    const { createObjectURL, click, createElement } = mockDownloads()
    expect(() => exportPdfReport(sales, 'All available data')).not.toThrow()
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    const anchor = createElement.mock.results.map((result) => result.value).find((element) => element instanceof HTMLAnchorElement) as HTMLAnchorElement
    expect(anchor.download).toBe('shopinsight-business-report.pdf')
    expect(await readBlob(createObjectURL.mock.calls[0][0])).toContain('%PDF-')
  })
})
