import { jsPDF } from 'jspdf'
import type { SalesRecord } from '../types/sales'
import type { InventoryProduct } from '../context/InventoryContext'
import type { ProductSummary } from './analytics'
import { formatCurrency, salesTrend, summarize } from './analytics'
import { createSampleTemplate } from './spreadsheet'

function csvValue(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportSalesCsv(records: SalesRecord[]) {
  const rows = [
    ['Date', 'Transaction ID', 'Product', 'SKU', 'Category', 'Quantity', 'Unit selling price', 'Unit cost', 'Discount', 'Revenue'],
    ...records.map((record) => [
      record.date, record.transactionId, record.product, record.sku, record.category,
      record.quantity, record.unitPrice, record.unitCost, record.discount, record.revenue,
    ]),
  ]
  downloadBlob(new Blob(['\uFEFF', rows.map((row) => row.map(csvValue).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'shopinsight-sales.csv')
}

export function exportProductsCsv(products: ProductSummary[]) {
  const rows = [
    ['Product', 'SKU', 'Category', 'Units sold', 'Revenue', 'Recorded cost', 'Gross profit', 'Average selling price', 'Sales share', 'Demand'],
    ...products.map((product) => [
      product.product, product.sku, product.category, product.quantity, product.revenue,
      product.cost, product.profit, product.avgPrice, `${product.share}%`, product.demand,
    ]),
  ]
  downloadBlob(new Blob(['\uFEFF', rows.map((row) => row.map(csvValue).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'shopinsight-products.csv')
}

export function exportTemplate() {
  downloadBlob(createSampleTemplate(), 'shopinsight-sales-template.xlsx')
}

export function exportInventoryCsv(products: InventoryProduct[]) {
  const rows = [
    ['Product', 'SKU', 'Category', 'Selling price', 'Cost price', 'Current stock', 'Minimum stock threshold'],
    ...products.map((product) => [
      product.name, product.sku, product.category, product.sellingPrice,
      product.costPrice, product.stock, product.minimumStock,
    ]),
  ]
  downloadBlob(new Blob(['\uFEFF', rows.map((row) => row.map(csvValue).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'shopinsight-inventory.csv')
}

export function exportPdfReport(records: SalesRecord[], periodLabel: string, businessName = 'My business') {
  if (!records.length) throw new Error('Import sales data or open the demo dataset before generating a report.')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 44
  const pageWidth = pdf.internal.pageSize.getWidth()
  const stats = summarize(records)
  const trend = salesTrend(records)
  const products = new Map<string, { quantity: number; revenue: number }>()
  const categories = new Map<string, number>()
  for (const record of records) {
    const product = products.get(record.product) ?? { quantity: 0, revenue: 0 }
    product.quantity += record.quantity
    product.revenue += record.revenue
    products.set(record.product, product)
    const category = record.category || 'Uncategorized'
    categories.set(category, (categories.get(category) ?? 0) + record.revenue)
  }
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text('ShopInsight business report', margin, 54)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`${businessName}  ·  Generated ${new Date().toLocaleDateString()}  ·  Period: ${periodLabel}`, margin, 74)
  pdf.setDrawColor(220, 225, 235)
  pdf.line(margin, 88, pageWidth - margin, 88)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('Business summary', margin, 112)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  const summaryLines = [
    `Total revenue: ${formatCurrency(stats.revenue)}     Units sold: ${stats.units.toLocaleString()}`,
    `Products: ${stats.productCount}     Transactions: ${stats.transactionCount?.toLocaleString() ?? 'Not available'}`,
    `Recorded cost: ${stats.cost === undefined ? 'Not available' : formatCurrency(stats.cost)}`,
    `Estimated gross profit: ${stats.profit === undefined ? 'Not available (cost data incomplete)' : formatCurrency(stats.profit)}`,
  ]
  summaryLines.forEach((line, index) => pdf.text(line, margin, 132 + index * 17))

  const chartTop = 218
  const chartHeight = 96
  const chartWidth = pageWidth - margin * 2
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('Sales trend', margin, chartTop)
  pdf.setDrawColor(231, 234, 242)
  for (let line = 0; line < 3; line += 1) {
    const y = chartTop + 19 + line * (chartHeight / 2)
    pdf.line(margin, y, margin + chartWidth, y)
  }
  const maximum = Math.max(...trend.map((point) => point.revenue), 1)
  if (trend.length > 1) {
    pdf.setDrawColor(82, 113, 224)
    pdf.setLineWidth(2)
    trend.forEach((point, index) => {
      if (index === trend.length - 1) return
      const x1 = margin + (index / (trend.length - 1)) * chartWidth
      const x2 = margin + ((index + 1) / (trend.length - 1)) * chartWidth
      const y1 = chartTop + 19 + chartHeight - (point.revenue / maximum) * chartHeight
      const y2 = chartTop + 19 + chartHeight - (trend[index + 1].revenue / maximum) * chartHeight
      pdf.line(x1, y1, x2, y2)
    })
  }
  pdf.setLineWidth(1)
  let cursorY = chartTop + chartHeight + 44
  pdf.setFont('helvetica', 'bold')
  pdf.text('Top products by units sold', margin, cursorY)
  cursorY += 18
  pdf.setFont('helvetica', 'normal')
  const topProducts = [...products.entries()].sort((a, b) => b[1].quantity - a[1].quantity).slice(0, 6)
  for (const [name, value] of topProducts) {
    pdf.text(name.slice(0, 42), margin, cursorY)
    pdf.text(`${value.quantity} units  ·  ${formatCurrency(value.revenue)}`, pageWidth - margin, cursorY, { align: 'right' })
    cursorY += 15
  }
  cursorY += 11
  pdf.setFont('helvetica', 'bold')
  pdf.text('Lowest-demand recorded products', margin, cursorY)
  cursorY += 17
  pdf.setFont('helvetica', 'normal')
  for (const [name, value] of [...products.entries()].sort((a, b) => a[1].quantity - b[1].quantity).slice(0, 3)) {
    pdf.text(name.slice(0, 42), margin, cursorY)
    pdf.text(`${value.quantity} units`, pageWidth - margin, cursorY, { align: 'right' })
    cursorY += 15
  }
  cursorY += 12
  pdf.setFont('helvetica', 'bold')
  pdf.text('Category revenue', margin, cursorY)
  cursorY += 17
  pdf.setFont('helvetica', 'normal')
  const topCategories = [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  for (const [name, revenue] of topCategories) {
    pdf.text(name.slice(0, 42), margin, cursorY)
    pdf.text(formatCurrency(revenue), pageWidth - margin, cursorY, { align: 'right' })
    cursorY += 15
  }
  cursorY += 10
  pdf.setFont('helvetica', 'bold')
  pdf.text('Data-supported highlights', margin, cursorY)
  cursorY += 15
  pdf.setFont('helvetica', 'normal')
  const leader = [...products.entries()].sort((a, b) => b[1].revenue - a[1].revenue)[0]
  const leadingCategory = topCategories[0]
  if (leader) pdf.text(`Top revenue product: ${leader[0]} (${formatCurrency(leader[1].revenue)}).`, margin, cursorY)
  if (leadingCategory) pdf.text(`Largest category: ${leadingCategory[0]} (${formatCurrency(leadingCategory[1])}).`, margin, cursorY + 14)
  pdf.setFontSize(8)
  pdf.setTextColor(120)
  pdf.text('Report calculations use only the selected client-side dataset. Cost and profit are shown only when recorded costs are complete.', margin, pdf.internal.pageSize.getHeight() - 30)
  downloadBlob(pdf.output('blob'), 'shopinsight-business-report.pdf')
}
