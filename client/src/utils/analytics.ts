import type { SalesRecord } from '../types/sales'
import { roundMoney } from './spreadsheet'

export type Period = 'all' | '7d' | '30d' | '90d' | 'month' | 'previous' | 'custom'
export type SalesPoint = { date: string; revenue: number; cost?: number; units: number }
export type ProductSummary = {
  product: string
  sku?: string
  category: string
  quantity: number
  revenue: number
  cost?: number
  profit?: number
  avgPrice: number
  share: number
  demand: 'High demand' | 'Moderate demand' | 'Low demand' | 'No recorded sales'
}

export function filterByPeriod(records: SalesRecord[], period: Period, now = new Date(), customStart = '', customEnd = ''): SalesRecord[] {
  if (period === 'all') return records
  if (period === 'custom') {
    return records.filter((record) =>
      (!customStart || record.date >= customStart) &&
      (!customEnd || record.date <= customEnd),
    )
  }
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  let start: Date
  let end: Date
  if (period === 'month') {
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1))
  } else if (period === 'previous') {
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
    end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
  } else {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    start = new Date(today)
    start.setUTCDate(today.getUTCDate() - (days - 1))
    end = new Date(today)
    end.setUTCDate(today.getUTCDate() + 1)
  }

  const startKey = start.toISOString().slice(0, 10)
  const endKey = end.toISOString().slice(0, 10)
  return records.filter((record) => record.date >= startKey && record.date < endKey)
}

export function filterAnalysisRecords(
  records: SalesRecord[],
  period: Period,
  product = '',
  category = '',
  customStart = '',
  customEnd = '',
): SalesRecord[] {
  return filterByPeriod(records, period, new Date(), customStart, customEnd).filter((record) =>
    (!product || record.product === product) &&
    (!category || (record.category || 'Uncategorized') === category),
  )
}

export function summarize(records: SalesRecord[]) {
  const revenue = roundMoney(records.reduce((sum, record) => sum + record.revenue, 0))
  const units = records.reduce((sum, record) => sum + record.quantity, 0)
  const costAvailable = records.length > 0 && records.every((record) => record.unitCost !== undefined)
  const cost = costAvailable
    ? roundMoney(records.reduce((sum, record) => sum + record.unitCost! * record.quantity, 0))
    : undefined
  const profit = cost === undefined ? undefined : roundMoney(revenue - cost)
  const transactionIds = new Set(records.flatMap((record) => record.transactionId ? [record.transactionId] : []))
  const transactionCount = records.length > 0 && records.every((record) => record.transactionId)
    ? transactionIds.size
    : undefined
  return {
    revenue,
    units,
    productCount: new Set(records.map((record) => record.product)).size,
    transactionCount,
    averageOrderValue: transactionCount ? roundMoney(revenue / transactionCount) : undefined,
    cost,
    profit,
    margin: profit !== undefined && revenue > 0 ? roundMoney((profit / revenue) * 100) : undefined,
  }
}

export type TrendGranularity = 'daily' | 'weekly' | 'monthly'

export function salesTrend(records: SalesRecord[], granularity: TrendGranularity = 'daily'): SalesPoint[] {
  const days = new Map<string, SalesPoint & { completeCost: boolean }>()
  for (const record of records) {
    const bucket = trendBucket(record.date, granularity)
    const item = days.get(bucket) ?? { date: bucket, revenue: 0, units: 0, cost: 0, completeCost: true }
    item.revenue = roundMoney(item.revenue + record.revenue)
    item.units += record.quantity
    if (record.unitCost === undefined) item.completeCost = false
    else item.cost = roundMoney(item.cost! + record.unitCost * record.quantity)
    days.set(bucket, item)
  }

  function trendBucket(dateKey: string, granularity: TrendGranularity): string {
    if (granularity === 'daily') return dateKey
    const date = new Date(`${dateKey}T00:00:00Z`)
    if (granularity === 'monthly') return `${dateKey.slice(0, 7)}-01`
    const day = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() - day + 1)
    return date.toISOString().slice(0, 10)
  }
  return [...days.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map(({ completeCost, ...point }) => completeCost ? point : { ...point, cost: undefined })
}

export function productSummaries(records: SalesRecord[]): ProductSummary[] {
  const grouped = new Map<string, { sku?: string; category: string; quantity: number; revenue: number; cost: number; completeCost: boolean }>()
  for (const record of records) {
    const item = grouped.get(record.product) ?? {
      sku: record.sku,
      category: record.category || 'Uncategorized',
      quantity: 0,
      revenue: 0,
      cost: 0,
      completeCost: true,
    }
    item.quantity += record.quantity
    item.revenue += record.revenue
    if (record.unitCost === undefined) item.completeCost = false
    else item.cost += record.unitCost * record.quantity
    grouped.set(record.product, item)
  }
  const totalRevenue = records.reduce((sum, record) => sum + record.revenue, 0)
  const quantities = [...grouped.values()].map((item) => item.quantity)
  const high = quantities.length ? Math.max(...quantities) : 0
  const moderateBoundary = high * 0.5
  return [...grouped.entries()].map(([product, item]) => {
    const profit = item.completeCost ? roundMoney(item.revenue - item.cost) : undefined
    const demand: ProductSummary['demand'] = item.quantity === high && high > 0
      ? 'High demand'
      : item.quantity >= moderateBoundary
        ? 'Moderate demand'
        : 'Low demand'
    return {
      product,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      revenue: roundMoney(item.revenue),
      cost: item.completeCost ? roundMoney(item.cost) : undefined,
      profit,
      avgPrice: item.quantity ? roundMoney(item.revenue / item.quantity) : 0,
      share: totalRevenue ? roundMoney((item.revenue / totalRevenue) * 100) : 0,
      demand,
    }
  }).sort((left, right) => right.quantity - left.quantity)
}

export function categorySummaries(records: SalesRecord[]) {
  const categories = new Map<string, number>()
  for (const record of records) {
    const name = record.category || 'Uncategorized'
    categories.set(name, (categories.get(name) ?? 0) + record.revenue)
  }

  const total = [...categories.values()].reduce((sum, value) => sum + value, 0)
  return [...categories.entries()]
    .map(([name, revenue]) => ({ name, revenue: roundMoney(revenue), share: total ? roundMoney(revenue / total * 100) : 0 }))
    .sort((a, b) => b.revenue - a.revenue)
}

export function weekdaySummaries(records: SalesRecord[]) {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days = labels.map((day) => ({ day, revenue: 0, units: 0 }))
  for (const record of records) {
    const dayIndex = new Date(`${record.date}T00:00:00Z`).getUTCDay()
    days[dayIndex].revenue = roundMoney(days[dayIndex].revenue + record.revenue)
    days[dayIndex].units += record.quantity
  }
  return days
}

export function formatCurrency(value: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
}
