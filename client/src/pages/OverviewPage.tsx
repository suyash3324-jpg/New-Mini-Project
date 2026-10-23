import { useMemo, useState } from 'react'
import { ArrowUpRight, BarChart3, Boxes, CircleDollarSign, FileSpreadsheet, Package, Sparkles, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAnalysis, loadDemoData } from '../context/AnalysisContext'
import { categorySummaries, filterByPeriod, formatCurrency, productSummaries, salesTrend, summarize, weekdaySummaries, type Period, type TrendGranularity } from '../utils/analytics'
import ChartPanel from '../components/ChartPanel'
import { CategoryChart, RevenueTrendChart, TopProductsChart, WeekdayChart } from '../components/SalesCharts'
import { buildBusinessInsights } from '../utils/insights'
import { useInventory } from '../context/InventoryContext'

const periods: { value: Period; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'month', label: 'This month' },
  { value: 'previous', label: 'Previous month' },
  { value: 'custom', label: 'Custom range' },
]

export default function OverviewPage() {
  const [granularity, setGranularity] = useState<TrendGranularity>('daily')
  const [topMetric, setTopMetric] = useState<'quantity' | 'revenue'>('quantity')
  const { products: inventory } = useInventory()
  const {
    records, source, period, setPeriod, replaceRecords,
    selectedProduct, setSelectedProduct, selectedCategory, setSelectedCategory,
    customStart, customEnd, setCustomStart, setCustomEnd,
  } = useAnalysis()
  const filtered = useMemo(() => filterByPeriod(records, period, new Date(), customStart, customEnd)
    .filter((record) => (!selectedProduct || record.product === selectedProduct) &&
      (!selectedCategory || (record.category || 'Uncategorized') === selectedCategory)),
  [records, period, customStart, customEnd, selectedProduct, selectedCategory])
  const kpis = useMemo(() => summarize(filtered), [filtered])
  const products = useMemo(() => productSummaries(filtered), [filtered])
  const categories = useMemo(() => categorySummaries(filtered), [filtered])
  const trend = useMemo(() => salesTrend(filtered, granularity), [filtered, granularity])
  const weekdayData = useMemo(() => weekdaySummaries(filtered), [filtered])
  const insights = useMemo(() => buildBusinessInsights(filtered, inventory, periods.find((item) => item.value === period)?.label ?? 'the selected period'), [filtered, inventory, period])
  const hasData = records.length > 0

  return (
    <div className="overview-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> BUSINESS OVERVIEW</div>
          <h1>Your business, <span>at a glance.</span></h1>
          <p className="page-intro">
            {hasData ? `Insights from ${filtered.length.toLocaleString()} records in your ${source === 'demo' ? 'demo dataset' : 'current analysis'}.` : 'A clearer picture of your sales starts with your business data.'}
          </p>
        </div>
        <div className="filter-controls">
          <label className="period-select">
            <span>Period</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
              {periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          {period === 'custom' && <div className="custom-dates">
            <label>From <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label>
            <label>To <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label>
          </div>}
          {records.length > 0 && <label className="filter-select"><span>Product</span>
            <select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}>
              <option value="">All products</option>
              {[...new Set(records.map((record) => record.product))].sort().map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>}
          {records.length > 0 && <label className="filter-select"><span>Category</span>
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              <option value="">All categories</option>
              {[...new Set(records.map((record) => record.category || 'Uncategorized'))].sort().map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>}
        </div>
      </div>

      {!hasData && (
        <section className="setup-banner" aria-label="Get started">
          <div className="setup-icon"><Sparkles size={19} /></div>
          <div className="setup-copy">
            <strong>Your workspace is ready for its first dataset</strong>
            <span>Import a sales file or open sample data to explore the dashboard.</span>
          </div>
          <div className="setup-actions">
            <Link className="primary-button" to="/import"><FileSpreadsheet size={15} /> Import sales</Link>
            <button className="secondary-button" onClick={() => replaceRecords(loadDemoData(), 'demo')}>Open demo</button>
          </div>
        </section>
      )}
      {source === 'demo' && <div className="demo-notice"><Sparkles size={14} /> Demo dataset · Sample records only. Your real data is not mixed in.</div>}

      <section className="kpi-grid" aria-label="Business metrics">
        <MetricCard label="Total revenue" value={hasData ? formatCurrency(kpis.revenue) : '—'} note={hasData ? `${filtered.length} sales lines` : 'Available after importing sales'} icon={<CircleDollarSign size={17} />} />
        <MetricCard label="Units sold" value={hasData ? kpis.units.toLocaleString() : '—'} note={hasData ? 'Across filtered sales lines' : 'No sales records yet'} icon={<TrendingUp size={17} />} />
        <MetricCard label="Gross profit" value={kpis.profit === undefined ? '—' : formatCurrency(kpis.profit)} note={kpis.profit === undefined ? 'Requires complete unit cost data' : `${kpis.margin?.toFixed(1)}% gross margin`} icon={<BarChart3 size={17} />} />
        <MetricCard label="Products sold" value={hasData ? kpis.productCount.toLocaleString() : '—'} note={hasData ? 'Distinct products in this period' : 'No product data yet'} icon={<Package size={17} />} />
      </section>

      {hasData && (
        <div className="support-kpis">
          <span><strong>{kpis.transactionCount === undefined ? 'Not available' : kpis.transactionCount.toLocaleString()}</strong> transactions {kpis.transactionCount === undefined && <em>Requires transaction IDs on all rows</em>}</span>
          <span><strong>{kpis.averageOrderValue === undefined ? 'Not available' : formatCurrency(kpis.averageOrderValue)}</strong> average order value {kpis.averageOrderValue === undefined && <em>Requires transaction IDs on all rows</em>}</span>
        </div>
      )}

      <div className="dashboard-grid">
        <ChartPanel title="Sales trend" description={`${granularity[0].toUpperCase()}${granularity.slice(1)} revenue in the selected period`} className="trend-panel"
          extra={<select className="chart-granularity" aria-label="Sales trend grouping" value={granularity} onChange={(event) => setGranularity(event.target.value as TrendGranularity)}>
            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
          </select>}>
          <RevenueTrendChart data={trend} />
        </ChartPanel>
        <ChartPanel title="Top products" description={`Ranked by ${topMetric === 'quantity' ? 'units sold' : 'revenue'}`} className="products-panel"
          extra={<select className="chart-granularity" aria-label="Top products metric" value={topMetric} onChange={(event) => setTopMetric(event.target.value as 'quantity' | 'revenue')}>
            <option value="quantity">Units</option><option value="revenue">Revenue</option>
          </select>}>
          <TopProductsChart products={products} metric={topMetric} />
        </ChartPanel>
      </div>

      <div className="lower-grid analytics-lower-grid">
        <ChartPanel title="Category sales" description="Share of revenue by category">
          <CategoryChart data={categories} />
        </ChartPanel>
        <ChartPanel title="Sales by weekday" description="Recorded revenue by day of week">
          <WeekdayChart data={weekdayData} />
        </ChartPanel>
        <section className="panel insight-panel">
          <div className="panel-header">
            <div><h2>Product highlights</h2><p>Based on recorded sales only</p></div>
            <Link className="text-link" to="/products">All products <ArrowUpRight size={14} /></Link>
          </div>
          {products.length ? (
            <div className="highlight-list">
              {products.slice(0, 4).map((product, index) => (
                <div className="highlight-row" key={product.product}>
                  <span className="highlight-rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className="highlight-name">{product.product}<small>{product.category} · {product.quantity} units</small></span>
                  <strong>{formatCurrency(product.revenue)}</strong>
                </div>
              ))}
            </div>
          ) : <div className="insight-empty"><Boxes size={16} /> No product records match the selected period.</div>}
        </section>
      </div>
      <section className="panel recommendations-panel">
        <div className="panel-header"><div><h2>Data-backed recommendations</h2><p>Observations from this period, not predictions</p></div><span className="beta-pill"><Sparkles size={12} /> RULES</span></div>
        {insights.length ? <div className="recommendation-list">{insights.map((insight) => (
          <article className="recommendation-item" key={insight.title}>
            <div className="recommendation-main"><strong>{insight.title}</strong><span>{insight.explanation}</span></div>
            <div className="recommendation-evidence"><b>{insight.metric}</b><span>{insight.action}</span><small>Note: {insight.limitation}</small></div>
          </article>
        ))}</div> : <div className="insight-empty"><span className="insight-bulb"><Sparkles size={16} /></span><span>Import or select data to generate recommendations supported by actual sales and inventory records.</span></div>}
      </section>
      {hasData && (
        <div className="dataset-footer">
          <span>{source === 'demo' ? 'DEMO DATASET' : 'BROWSER SESSION'}</span>
          <span>Sales data is held in memory and may be cleared when this tab reloads or closes.</span>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return (
    <article className="metric-card">
      <div className="metric-topline"><span className="metric-label">{label}</span><span className="metric-mark">{icon}</span></div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-note">{note}</span>
    </article>
  )
}
