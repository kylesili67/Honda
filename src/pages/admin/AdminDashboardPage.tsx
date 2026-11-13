import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { formatDateTimeKarachi, formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { listAccessories } from '../../services/accessories';
import { getTotalAvailableBikeStock, listBikes } from '../../services/bikes';
import { listAllBookingsAdmin } from '../../services/bookings';
import { listAllInquiriesAdmin } from '../../services/inquiries';
import { listAllOrdersAdmin } from '../../services/orders';
import { listPaymentsAdmin } from '../../services/payments';
import { listAllServiceAppointmentsAdmin } from '../../services/service';
import { listAllTestRidesAdmin } from '../../services/testRides';
import { Card, StatusChip } from '../../components/ui/Primitives';

export function AdminDashboardPage() {
  const { settings } = useSettings();
  usePageMeta({ title: `Admin Dashboard | ${settings.brand_name}` });

  const { data: bookings = [] } = useQuery({ queryKey: ['admin-bookings'], queryFn: listAllBookingsAdmin });
  const { data: inquiries = [] } = useQuery({ queryKey: ['admin-inquiries'], queryFn: listAllInquiriesAdmin });
  const { data: testRides = [] } = useQuery({ queryKey: ['admin-test-rides'], queryFn: listAllTestRidesAdmin });
  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: listAllOrdersAdmin });
  const { data: payments = [] } = useQuery({ queryKey: ['admin-payments'], queryFn: listPaymentsAdmin });
  const { data: services = [] } = useQuery({ queryKey: ['admin-services'], queryFn: listAllServiceAppointmentsAdmin });
  const { data: bikes = [] } = useQuery({
    queryKey: ['admin-bikes'],
    queryFn: () => listBikes({ includeDrafts: true }),
  });
  const { data: accessories = [] } = useQuery({
    queryKey: ['admin-accessories'],
    queryFn: () => listAccessories({ includeDrafts: true }),
  });

  const paidRevenue = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
  const openInquiries = inquiries.filter((i) => ['new', 'contacted'].includes(i.status)).length;
  const pendingService = services.filter((s) => ['requested', 'confirmed'].includes(s.status)).length;

  const lowStockBikes = bikes.filter((b) => getTotalAvailableBikeStock(b) <= 3);
  const lowStockAccessories = accessories.flatMap((a) =>
    (a.variants ?? [])
      .filter((v) => v.stock_quantity <= 5)
      .map((v) => ({ name: `${a.name} (${v.size || v.sku})`, qty: v.stock_quantity }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#111214]">Dashboard Overview</h1>
        <p className="text-sm text-[#6B7078]">
          Live showroom pipeline across bike bookings, leads, store orders, and service bays.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs text-[#6B7078]">Total Bookings</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{bookings.length}</p>
          <p className="mt-1 text-xs text-[#B7791F] tabular-nums">{pendingBookings} pending verification</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[#6B7078]">Inquiries &amp; Test Rides</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {inquiries.length + testRides.length}
          </p>
          <p className="mt-1 text-xs text-[#6B7078] tabular-nums">{openInquiries} active inquiries</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[#6B7078]">Store Orders</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{orders.length}</p>
          <p className="mt-1 text-xs text-[#6B7078] tabular-nums">{pendingService} pending service slots</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[#6B7078]">Verified Collections</p>
          <p className="mt-1 font-display text-3xl font-bold text-[#1E8E4E] tabular-nums">
            {formatPKR(paidRevenue)}
          </p>
          <p className="mt-1 text-xs text-[#6B7078]">Tokens + Store payments</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#111214]">Recent Bike Bookings</h2>
            <Link to="/admin/bookings" className="text-xs font-semibold text-[#D71920] inline-flex items-center gap-1">
              Manage all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E3E4E7] text-left text-xs text-[#6B7078]">
                <tr>
                  <th className="py-2 pr-3">Number</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Model</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E4E7]">
                {bookings.slice(0, 5).map((b) => (
                  <tr key={b.id} className="hover:bg-[#F5F5F6]/60">
                    <td className="py-2.5 pr-3 font-mono-tabular font-semibold">
                      <Link to={`/admin/bookings/${b.id}`} className="hover:text-[#D71920]">
                        {b.booking_number}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3">{b.customer_name}</td>
                    <td className="py-2.5 pr-3 text-[#6B7078]">{b.variant?.model?.name}</td>
                    <td className="py-2.5 pr-3"><StatusChip status={b.status} /></td>
                    <td className="py-2.5 text-right text-xs text-[#6B7078] tabular-nums">
                      {formatDateTimeKarachi(b.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#B7791F]" />
            <h2 className="text-base font-semibold text-[#111214]">Low Stock Alerts</h2>
          </div>

          <div className="space-y-2 text-sm">
            {lowStockBikes.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-[#E3E4E7]">
                <Link to="/admin/stock" className="font-medium hover:text-[#D71920]">
                  {b.name}
                </Link>
                <span className="text-xs font-semibold text-[#C0262D] tabular-nums">
                  {getTotalAvailableBikeStock(b)} unit(s) left
                </span>
              </div>
            ))}
            {lowStockAccessories.map((a) => (
              <div key={a.name} className="flex items-center justify-between py-2 border-b border-[#E3E4E7]">
                <Link to="/admin/accessories" className="text-[#26282C] hover:text-[#D71920]">
                  {a.name}
                </Link>
                <span className="text-xs font-semibold text-[#B7791F] tabular-nums">
                  {a.qty} left
                </span>
              </div>
            ))}
            {lowStockBikes.length === 0 && lowStockAccessories.length === 0 && (
              <p className="text-sm text-[#6B7078]">All catalog stock levels are healthy.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
