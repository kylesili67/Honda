import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Award,
  Bike,
  Calendar,
  GitCompareArrows,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  User,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

const ACCOUNT_LINKS = [
  { to: '/account', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/account/bookings', label: 'My Bookings', icon: Bike },
  { to: '/account/orders', label: 'My Orders', icon: Package },
  { to: '/account/test-rides', label: 'Test Rides', icon: Calendar },
  { to: '/account/service', label: 'Service & History', icon: Wrench },
  { to: '/account/inquiries', label: 'My Inquiries', icon: MessageSquare },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account/comparisons', label: 'Saved Comparisons', icon: GitCompareArrows },
  { to: '/account/loyalty', label: 'Loyalty Points', icon: Award },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/profile', label: 'Profile', icon: User },
];

export function AccountLayout() {
  const { settings } = useSettings();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F6] text-[#111214]">
      <header className="border-b border-[#E3E4E7] bg-white">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-8 px-4 sm:px-6">
          <Link to="/" className="font-display text-2xl font-bold text-[#111214] whitespace-nowrap">
            {settings.brand_name}
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/bikes" className="text-[#6B7078] hover:text-[#111214] whitespace-nowrap">
              Browse Bikes
            </Link>
            <Link to="/accessories" className="text-[#6B7078] hover:text-[#111214] whitespace-nowrap">
              Accessories
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C0262D] hover:underline cursor-pointer whitespace-nowrap"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <aside className="space-y-4">
          <div className="rounded-xl border border-[#E3E4E7] bg-white p-4">
            <p className="text-sm font-semibold text-[#111214] truncate">
              {profile?.full_name || 'Customer Account'}
            </p>
            <p className="text-xs text-[#6B7078] truncate mt-0.5">{profile?.email}</p>
            <p className="mt-2 text-xs font-medium text-[#1E8E4E] tabular-nums">
              {profile?.loyalty_balance ?? 0} Loyalty Points
            </p>
          </div>

          <nav aria-label="Account navigation" className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {ACCOUNT_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                      isActive
                        ? 'bg-[#111214] text-white'
                        : 'text-[#26282C] hover:bg-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
