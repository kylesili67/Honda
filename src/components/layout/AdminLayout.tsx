import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bike,
  Boxes,
  Calendar,
  CreditCard,
  FileText,
  HelpCircle,
  Image,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  ShoppingBag,
  Tag,
  Ticket,
  Truck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { canAccessAdminModule, ROLE_LABELS, type AdminModuleKey } from '../../lib/constants';
import { Logo } from '../brand/Logo';

interface AdminNavGroup {
  group: string;
  items: Array<{ to: string; label: string; module: AdminModuleKey; icon: React.ComponentType<{ className?: string }>; end?: boolean }>;
}

const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    group: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', module: 'dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    group: 'Catalog',
    items: [
      { to: '/admin/bikes', label: 'Bikes', module: 'bikes', icon: Bike },
      { to: '/admin/stock', label: 'Bike Stock', module: 'stock', icon: Boxes },
      { to: '/admin/accessories', label: 'Accessories', module: 'accessories', icon: ShoppingBag },
    ],
  },
  {
    group: 'Sales & Orders',
    items: [
      { to: '/admin/bookings', label: 'Bookings', module: 'bookings', icon: Bike },
      { to: '/admin/inquiries', label: 'Inquiries', module: 'inquiries', icon: MessageSquare },
      { to: '/admin/test-rides', label: 'Test Rides', module: 'test_rides', icon: Calendar },
      { to: '/admin/trade-ins', label: 'Trade-Ins', module: 'trade_ins', icon: RefreshCw },
      { to: '/admin/orders', label: 'Orders', module: 'orders', icon: Package },
      { to: '/admin/returns', label: 'Returns', module: 'returns', icon: RotateCcw },
      { to: '/admin/payments', label: 'Payments', module: 'payments', icon: CreditCard },
    ],
  },
  {
    group: 'Service',
    items: [{ to: '/admin/service-appointments', label: 'Service Bays', module: 'service', icon: Wrench }],
  },
  {
    group: 'Customers',
    items: [{ to: '/admin/customers', label: 'Customers', module: 'customers', icon: Users }],
  },
  {
    group: 'Content',
    items: [
      { to: '/admin/banners', label: 'Banners', module: 'content', icon: Image },
      { to: '/admin/offers', label: 'Offers', module: 'content', icon: Tag },
      { to: '/admin/news', label: 'News & Updates', module: 'content', icon: FileText },
      { to: '/admin/faqs', label: 'FAQs', module: 'content', icon: HelpCircle },
      { to: '/admin/pages', label: 'Static Pages', module: 'content', icon: FileText },
      { to: '/admin/branches', label: 'Branches', module: 'content', icon: MapPin },
      { to: '/admin/coupons', label: 'Coupons', module: 'content', icon: Ticket },
      { to: '/admin/delivery-zones', label: 'Delivery Zones', module: 'content', icon: Truck },
    ],
  },
  {
    group: 'Insights',
    items: [
      { to: '/admin/reports', label: 'Reports', module: 'reports', icon: BarChart3 },
      { to: '/admin/audit-log', label: 'Audit Log', module: 'audit_log', icon: Shield },
    ],
  },
  {
    group: 'System',
    items: [
      { to: '/admin/settings', label: 'Settings', module: 'settings', icon: Settings },
      { to: '/admin/staff', label: 'Staff & Roles', module: 'staff', icon: Users },
    ],
  },
];

export function AdminLayout() {
  const { settings } = useSettings();
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleGroups = ADMIN_NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => canAccessAdminModule(roles, i.module)),
  })).filter((g) => g.items.length > 0);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const SidebarContent = (
    <div className="flex h-full flex-col bg-[#26282C] text-white">
      <div className="flex h-16 items-center justify-between gap-2 px-5 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Logo variant="mono-light" height={28} to="/admin" showSubtitle={false} />
          <span className="rounded border border-white/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
            Admin
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden rounded p-1 text-white/70 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#D71920] text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'Staff'}</p>
        <p className="text-[11px] text-white/60 truncate">
          {roles.map((r) => ROLE_LABELS[r]).join(', ')}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Link to="/" className="text-xs text-white/70 hover:text-white">
            View Storefront
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1 text-xs text-white/80 hover:text-white cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F6] text-[#111214] lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="hidden lg:block sticky top-0 h-screen">{SidebarContent}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full">{SidebarContent}</div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#E3E4E7] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden rounded-lg border border-[#E3E4E7] p-2 text-[#111214]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-[#6B7078]">Showroom Operations Console</span>
          </div>
          <Link to="/" className="text-xs font-medium text-[#111214] hover:text-[#D71920]">
            Public Site
          </Link>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
