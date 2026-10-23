import type { SalesRecord } from '../types/sales'

const products = [
  { name: 'Masala Tea 250g', sku: 'TEA-250', category: 'Grocery', price: 145, cost: 92, demand: 9 },
  { name: 'Brown Bread', sku: 'BRD-001', category: 'Bakery', price: 55, cost: 32, demand: 7 },
  { name: 'Notebook A5', sku: 'STN-005', category: 'Stationery', price: 48, cost: 25, demand: 6 },
  { name: 'LED Bulb 9W', sku: 'ELC-009', category: 'Electronics', price: 110, cost: 68, demand: 4 },
  { name: 'Cotton Tote Bag', sku: 'CLT-014', category: 'Clothing', price: 220, cost: 118, demand: 3 },
  { name: 'Premium Pen', sku: 'STN-021', category: 'Stationery', price: 35, cost: 14, demand: 2 },
]

export function createDemoRecords(): SalesRecord[] {
  const records: SalesRecord[] = []
  const start = new Date(Date.UTC(2026, 8, 1))
  for (let day = 0; day < 45; day += 1) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + day)
    const dayKey = date.toISOString().slice(0, 10)
    products.forEach((product, productIndex) => {
      const weeklyFactor = day % 7 === 5 || day % 7 === 6 ? 1.35 : 0.85
      const quantity = (day * (productIndex + 3) + productIndex * 7) % 11 < product.demand
        ? Math.max(1, Math.round(((day + productIndex * 2) % 4 + 1) * weeklyFactor))
        : 0
      if (!quantity) return
      const transaction = `DEMO-${dayKey}-${productIndex}`
      records.push({
        id: `${day}-${productIndex}`,
        date: dayKey,
        product: product.name,
        sku: product.sku,
        category: product.category,
        quantity,
        unitPrice: product.price,
        revenue: product.price * quantity,
        unitCost: product.cost,
        transactionId: transaction,
        sourceRow: records.length + 2,
      })
    })
  }
  return records
}
