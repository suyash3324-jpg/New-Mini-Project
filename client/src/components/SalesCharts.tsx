import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProductSummary, SalesPoint } from '../utils/analytics'
import { formatCurrency } from '../utils/analytics'

const palette = ['#5473e7', '#8b72df', '#45a98b', '#efa25f', '#de7187', '#54a6be', '#a2b65d', '#d27bb6']

export function RevenueTrendChart({ data }: { data: SalesPoint[] }) {
  const costAvailable = data.length > 0 && data.every((point) => point.cost !== undefined)
  return (
    <div className="chart-canvas">
      {data.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(date: string) => date.slice(5)} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(value: number) => formatCurrency(value, 'INR').replace('₹', '₹')} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} width={62} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value), 'INR')} labelFormatter={(label) => `Date: ${label}`} />
            <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-muted)' }} />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#5473e7" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            {costAvailable && <Line type="monotone" dataKey="cost" name="Recorded cost" stroke="#e59c58" strokeWidth={2} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      ) : <EmptyChart message="No sales records match this period." />}
    </div>
  )
}

export function TopProductsChart({ products, metric = 'quantity' }: { products: ProductSummary[]; metric?: 'quantity' | 'revenue' }) {
  const data = [...products].sort((a, b) => b[metric] - a[metric]).slice(0, 7).reverse()
  return (
    <div className="chart-canvas">
      {data.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 5 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="product" width={112} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => metric === 'revenue' ? formatCurrency(Number(value)) : `${value} units`} />
            <Bar dataKey={metric} name={metric === 'quantity' ? 'Units sold' : 'Revenue'} fill="#627ce6" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyChart message="Product rankings appear after importing sales." />}
    </div>
  )
}

export function LowDemandChart({ products }: { products: ProductSummary[] }) {
  const data = [...products].sort((a, b) => a.quantity - b.quantity).slice(0, 7).reverse()
  return (
    <div className="chart-canvas">
      {data.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 5 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="product" width={112} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${value} units`} />
            <Bar dataKey="quantity" name="Units sold" fill="#d49a57" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyChart message="No product data is available for this period." />}
    </div>
  )
}

export function CategoryChart({ data }: { data: { name: string; revenue: number; share: number }[] }) {
  return (
    <div className="chart-canvas">
      {data.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="revenue" nameKey="name" innerRadius="48%" outerRadius="76%" paddingAngle={3} stroke="var(--surface)" strokeWidth={2}>
              {data.map((item, index) => <Cell key={item.name} fill={palette[index % palette.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value, _name, item) => [`${formatCurrency(Number(value))} (${item.payload.share}%)`, item.payload.name]} />
            <Legend wrapperStyle={{ fontSize: 9, color: 'var(--text-muted)' }} />
          </PieChart>
        </ResponsiveContainer>
      ) : <EmptyChart message="Category distribution appears after importing sales." />}
    </div>
  )
}

export function WeekdayChart({ data }: { data: { day: string; revenue: number }[] }) {
  const hasSales = data.some((point) => point.revenue > 0)
  return (
    <div className="chart-canvas">
      {hasSales ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 6, left: 5, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} width={38} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} />
            <Bar dataKey="revenue" name="Revenue" fill="#8b72df" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyChart message="No weekday comparison is available." />}
    </div>
  )
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 11,
}

function EmptyChart({ message }: { message: string }) {
  return <div className="chart-empty-message">{message}</div>
}
