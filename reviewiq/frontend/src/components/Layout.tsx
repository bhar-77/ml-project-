import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertOctagon,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Cpu,
  GitCompare,
  Home,
  LayoutDashboard,
  Menu,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/analyze', label: 'Live Analyzer', icon: Sparkles },
  { to: '/upload', label: 'Dataset Upload', icon: UploadCloud },
  { to: '/analytics', label: 'Sentiment Analytics', icon: BarChart3 },
  { to: '/complaints', label: 'Complaint Intelligence', icon: AlertOctagon },
  { to: '/products', label: 'Product Comparison', icon: GitCompare },
  { to: '/model', label: 'Model Performance', icon: Cpu },
];

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const { data: health } = useApi(() => api.getHealth(), [location.pathname]);

  const currentNav = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
  const pageTitle = currentNav?.label ?? 'ReviewIQ';

  return (
    <div className="flex min-h-screen bg-[#040712] text-slate-100">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 80 : 264 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.08] bg-[#060B18]/90 backdrop-blur-2xl lg:flex"
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-4">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-glow">
              <Activity className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-base font-bold tracking-tight text-white">ReviewIQ</p>
                <p className="truncate text-[10px] font-medium uppercase tracking-widest text-blue-400/80">
                  ML Insight Engine
                </p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-1.5 text-slate-400 transition hover:border-blue-400/30 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'border border-blue-500/30 bg-gradient-to-r from-blue-600/25 via-indigo-600/15 to-violet-600/10 text-white shadow-[0_0_24px_-8px_rgba(59,130,246,0.55)]'
                    : 'border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Home link & Model status */}
        <div className="border-t border-white/[0.06] p-3">
          {!collapsed && health && (
            <div className="mb-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    health.model_loaded ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-rose-500'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-200">
                  {health.model_loaded ? 'Model Active' : 'Model Offline'}
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] text-slate-400">
                {health.model_loaded ? health.model_name : 'Artifact missing'}
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">
                {health.total_reviews.toLocaleString()} reviews in SQLite
              </p>
            </div>
          )}
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
          >
            <Home className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Back to Landing</span>}
          </Link>
        </div>
      </motion.aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.1] bg-[#070C1D] p-4 lg:hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-base font-bold text-white">ReviewIQ</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-4 flex-1 space-y-1.5">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                        isActive
                          ? 'border border-blue-500/30 bg-blue-600/20 text-white'
                          : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-xs font-medium text-slate-300"
              >
                <Home className="h-4 w-4" />
                Landing Page
              </Link>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#040712]/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 text-slate-300 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {health && (
              <div
                className={`hidden items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium sm:inline-flex ${
                  health.model_loaded
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/35 bg-rose-500/15 text-rose-300'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    health.model_loaded ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <span>
                  {health.model_loaded ? health.model_name : 'Model Artifact Missing'}
                </span>
              </div>
            )}
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-glow transition hover:brightness-110"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Analyze Review</span>
              <span className="sm:hidden">Analyze</span>
            </Link>
          </div>
        </header>

        {/* Page Content with animated transitions */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

