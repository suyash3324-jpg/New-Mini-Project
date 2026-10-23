import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Menu,
  PackageSearch,
  Settings,
  ShoppingBag,
  X,
  Sun,
  Moon,
  Monitor,
  Upload,
  Trash2,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAnalysis } from '../context/AnalysisContext'

const navigation = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Import data', to: '/import', icon: Upload },
  { label: 'Products', to: '/products', icon: PackageSearch },
  { label: 'Inventory', to: '/inventory', icon: Boxes },
  { label: 'Sales', to: '/sales', icon: ShoppingBag },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
]

const pageTitles: Record<string, string> = {
  '/': 'Overview',
  '/import': 'Import data',
  '/products': 'Product analytics',
  '/inventory': 'Inventory',
  '/sales': 'Sales records',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'ShopInsight'
  const { preference, setPreference } = useTheme()
  const { source, clear, period } = useAnalysis()
  const periodLabels: Record<string, string> = {
    all: 'All time', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days',
    month: 'This month', previous: 'Previous month', custom: 'Custom range',
  }

  return (
    <div className="app-shell">
      {mobileNavOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside className={`sidebar${mobileNavOpen ? ' sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <BarChart3 size={20} strokeWidth={2.5} />
          </div>
          <span className="brand-name">shop<span>insight</span></span>
          <button
            className="icon-button sidebar-close"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">S</div>
          <div className="workspace-copy">
            <strong>ShopInsight</strong>
            <span>Temporary analysis</span>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
              onClick={() => setMobileNavOpen(false)}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
            onClick={() => setMobileNavOpen(false)}
          >
            <Settings size={18} strokeWidth={1.9} />
            <span>Settings</span>
          </NavLink>
          <div className="sidebar-footer">
            <div className="footer-avatar">S</div>
            <div className="footer-copy">
              <strong>Guest session</strong>
              <span>No account required</span>
            </div>
            <span className="local-indicator" title="Data remains in this local app">
              <span />
              Local
            </span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-toggle"
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumbs">
              <span>Workspace</span>
              <span className="breadcrumb-divider">/</span>
              <strong>{title}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            {source !== 'empty' && (
              <span className={`source-pill source-${source}`}>{source === 'demo' ? 'Demo data' : 'Current analysis'}</span>
            )}
            <span className="period-pill">
              <span className="period-dot" />
              {periodLabels[period]}
            </span>
            <span className="topbar-divider" />
            <label className="theme-control" title="Choose color theme">
              <span className="visually-hidden">Color theme</span>
              <span className="theme-control-icon">{preference === 'dark' ? <Moon size={14} /> : preference === 'system' ? <Monitor size={14} /> : <Sun size={14} />}</span>
              <select aria-label="Color theme" value={preference} onChange={(event) => setPreference(event.target.value as 'light' | 'dark' | 'system')}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            {source !== 'empty' && (
              <button className="clear-analysis-button" onClick={() => { if (window.confirm('Clear the current analysis? This cannot be undone.')) clear() }} aria-label="Clear current analysis">
                <Trash2 size={15} /><span>Clear</span>
              </button>
            )}
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
