import { describe, expect, it } from 'vitest'
import type { SalesRecord } from '../types/sales'
import { categorySummaries, filterAnalysisRecords, filterByPeriod, productSummaries, salesTrend, summarize, weekdaySummaries } from './analytics'

const records: SalesRecord[] = [
  { id: '1', date: '2026-10-16', product: 'Tea', category: 'Grocery', quantity: 2, unitPrice: 10, unitCost: 4, revenue: 20, transactionId: 'A', sourceRow: 2 },
  { id: '2', date: '2026-10-16', product: 'Bread', category: 'Bakery', quantity: 1, unitPrice: 5, unitCost: 2, revenue: 5, transactionId: 'A', sourceRow: 3 },
  { id: '3', date: '2026-10-10', product: 'Tea', category: 'Grocery', quantity: 1, unitPrice: 10, unitCost: 4, revenue: 10, transactionId: 'B', sourceRow: 4 },
]

describe('sales analytics', () => {
  it('calculates revenue, units, profit, margin, and order value only when supported', () => {
    expect(summarize(records)).toMatchObject({
      revenue: 35,
      units: 4,
      productCount: 2,
      transactionCount: 2,
      averageOrderValue: 17.5,
      cost: 14,
      profit: 21,
      margin: 60,
    })
    expect(summarize([]).profit).toBeUndefined()
    expect(summarize([]).margin).toBeUndefined()
  })

  it('does not fabricate cost metrics when any sales line lacks cost', () => {
    const partial = summarize([{ ...records[0], unitCost: undefined }])
    expect(partial.cost).toBeUndefined()
    expect(partial.profit).toBeUndefined()
    expect(partial.margin).toBeUndefined()
  })

  it('requires transaction identifiers on all rows before counting orders', () => {
    expect(summarize([{ ...records[0], transactionId: undefined }]).transactionCount).toBeUndefined()
  })

  it('filters inclusive trailing periods against UTC calendar dates', () => {
    expect(filterByPeriod(records, '7d', new Date('2026-10-17T12:00:00Z')).map((record) => record.id)).toEqual(['1', '2'])
  })

  it('aggregates weekly and monthly trends on calendar boundaries', () => {
    expect(salesTrend(records, 'weekly').map((point) => point.date)).toEqual(['2026-10-05', '2026-10-12'])
    expect(salesTrend(records, 'monthly')).toHaveLength(1)
  })

  it('applies custom dates plus product and category filters consistently', () => {
    expect(filterAnalysisRecords(records, 'custom', 'Tea', 'Grocery', '2026-10-10', '2026-10-16').map((record) => record.id)).toEqual(['1', '3'])
    expect(filterByPeriod(records, 'custom', new Date(), '2026-10-11', '2026-10-16').map((record) => record.id)).toEqual(['1', '2'])
  })

  it('aggregates daily revenue and suppresses incomplete cost series', () => {
    const trend = salesTrend([...records, { ...records[0], id: '4', date: '2026-10-16', unitCost: undefined }])
    expect(trend).toHaveLength(2)
    expect(trend[1].revenue).toBe(45)
    expect(trend[1].cost).toBeUndefined()
  })

  it('ranks products and explains the relative demand grouping', () => {
    const products = productSummaries(records)
    expect(products[0].product).toBe('Tea')
    expect(products[0].demand).toBe('High demand')
    expect(products[1].demand).toBe('Low demand')
    expect(categorySummaries(records)[0]).toMatchObject({ name: 'Grocery', revenue: 30, share: 85.71 })
  })

  it('keeps empty analyses empty without divide-by-zero output', () => {
    expect(summarize([])).toMatchObject({ revenue: 0, units: 0, productCount: 0 })
    expect(productSummaries([])).toEqual([])
    expect(categorySummaries([])).toEqual([])
    expect(salesTrend([])).toEqual([])
  })

  it('groups sales by calendar weekday', () => {
    const weekdays = weekdaySummaries(records)
    expect(weekdays.find((item) => item.day === 'Fri')).toMatchObject({ revenue: 25, units: 3 })
    expect(weekdays.find((item) => item.day === 'Sat')).toMatchObject({ revenue: 10, units: 1 })
  })
})
