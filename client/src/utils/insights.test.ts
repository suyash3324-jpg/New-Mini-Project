import { describe, expect, it } from 'vitest'
import type { InventoryProduct } from '../context/InventoryContext'
import type { SalesRecord } from '../types/sales'
import { buildBusinessInsights } from './insights'

const sales: SalesRecord[] = [
  { id: '1', date: '2026-10-01', product: 'Tea', category: 'Grocery', quantity: 4, revenue: 40, unitCost: undefined, sourceRow: 2 },
  { id: '2', date: '2026-10-02', product: 'Tea', category: 'Grocery', quantity: 3, revenue: 30, unitCost: undefined, sourceRow: 3 },
]

const inventory: InventoryProduct[] = [{
  id: 'tea',
  name: 'Tea',
  sku: 'TEA',
  category: 'Grocery',
  sellingPrice: 10,
  stock: 2,
  minimumStock: 5,
}]

describe('rules-based business insights', () => {
  it('supports each recommendation with a real metric and limitation', () => {
    const insights = buildBusinessInsights(sales, inventory, 'Last 7 days')
    expect(insights.map((insight) => insight.title)).toContain('Tea is at or below its stock threshold')
    expect(insights.find((insight) => insight.title === 'Tea recorded the most units')?.metric).toBe('7 units')
    expect(insights.some((insight) => insight.limitation.includes('Missing costs are not estimated.'))).toBe(true)
    expect(insights.every((insight) => insight.explanation && insight.action && insight.limitation)).toBe(true)
  })

  it('does not invent insights for an empty dataset', () => {
    expect(buildBusinessInsights([], inventory, 'All time')).toEqual([])
  })
})
