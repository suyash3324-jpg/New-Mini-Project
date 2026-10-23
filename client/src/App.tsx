import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'

const OverviewPage = lazy(() => import('./pages/OverviewPage'))
const SectionPage = lazy(() => import('./pages/SectionPage'))
const ImportPage = lazy(() => import('./pages/ImportPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))
const SalesPage = lazy(() => import('./pages/SalesPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

export default function App() {
  return (
    <Suspense fallback={<div className="route-loading" role="status">Loading ShopInsight…</div>}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<SectionPage section="Page not found" />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
