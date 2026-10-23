import type { InventoryProduct } from '../context/InventoryContext'
import type { SalesRecord } from '../types/sales'
import { categorySummaries, productSummaries } from './analytics'

export type BusinessInsight = {
  title: string
  explanation: string
  metric: string
  action: string
  limitation: string
}

export function buildBusinessInsights(
  records: SalesRecord[],
  inventory: InventoryProduct[],
  periodLabel: string,
): BusinessInsight[] {
  if (!records.length) return []
  const insights: BusinessInsight[] = []
  const products = productSummaries(records)
  const categories = categorySummaries(records)
  const bestSeller = products[0]
  if (bestSeller) {
    insights.push({
      title: `${bestSeller.product} recorded the most units`,
      explanation: `${bestSeller.product} had the highest recorded unit sales in ${periodLabel}.`,
      metric: `${bestSeller.quantity} units`,
      action: 'Review current stock and keep its recent sales level in mind when planning replenishment.',
      limitation: 'Unit sales alone do not establish profitability or future demand.',
    })
  }
  const leadingCategory = categories[0]
  if (leadingCategory && leadingCategory.share >= 50) {
    insights.push({
      title: `${leadingCategory.name} represents a large revenue share`,
      explanation: `This category made up at least half of recorded revenue in ${periodLabel}.`,
      metric: `${leadingCategory.share.toFixed(1)}% of revenue`,
      action: 'Review category concentration when planning assortment and promotions.',
      limitation: 'Revenue share describes sales mix; it does not indicate profit or causation.',
    })
  }
  const costRows = records.filter((record) => record.unitCost !== undefined).length
  if (costRows !== records.length) {
    insights.push({
      title: 'Cost coverage is incomplete',
      explanation: 'Gross profit is unavailable because not every sales line has recorded unit cost.',
      metric: `${costRows} of ${records.length} lines include unit cost`,
      action: 'Add reliable unit cost data to future imports before using profit comparisons.',
      limitation: 'Missing costs are not estimated.',
    })
  }
  const salesByProduct = new Map(products.map((product) => [product.product, product.quantity]))
  for (const product of inventory.filter((item) => item.stock <= item.minimumStock).slice(0, 3)) {
    const units = salesByProduct.get(product.name)
    insights.push({
      title: product.stock === 0 ? `${product.name} is out of stock` : `${product.name} is at or below its stock threshold`,
      explanation: `${product.name} currently has ${product.stock} units against a minimum threshold of ${product.minimumStock}.`,
      metric: `${product.stock} in stock · ${units === undefined ? 'no matching sales line' : `${units} units sold`}`,
      action: 'Review the stock record and decide whether a replenishment is appropriate.',
      limitation: units === undefined ? `No matching sales line was found in ${periodLabel}.` : 'A short sales period may not represent typical demand.',
    })
  }
  return insights
}
