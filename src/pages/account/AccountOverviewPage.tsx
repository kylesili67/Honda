import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { formatDateKarachi, formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { listMyBookings } from '../../services/bookings';
import { listMyOrders } from '../../services/orders';
import { listMyServiceAppointments } from '../../services/service';
import { listMyTestRides } from '../../services/testRides';
import { Card, StatusChip } from '../../components/ui/Primitives';

export function AccountOverviewPage() {
  const { settings } = useSettings();
  const { user, profile } = useAuth();

  usePageMeta({ title: `My Account | ${settings.brand_name}` });

  const { data: bookings = [] } = useQuery({
    queryKey: ['my-bookings', user?.id],
    queryFn: () => listMyBookings(user!.id),
    enabled: Boolean(user),
  });
  const { data: orders = [] } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: () => listMyOrders(user!.id),
    enabled: Boolean(user),
  });
  const { data: testRides = [] } = useQuery({
    queryKey: ['my-test-rides', user?.id],
    queryFn: () => listMyTestRides(user!.id),
    enabled: Boolean(user),
  });
  const { data: services = [] } = useQuery({
    queryKey: ['my-services', user?.id],
    queryFn: () => listMyServiceAppointments(user!.id),
    enabled: Boolean(user),
  });

  const latestBooking = bookings[0];
  const latestOrder = orders[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#111214]">
          Welcome, {profile?.full_name || 'Rider'}
        </h1>
        <p className="text-sm text-[#6B7078]">
          Track your motorcycle bookings, store orders, service history, and loyalty balance.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-[#6B7078]">Bike Bookings</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{bookings.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#6B7078]">Store Orders</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{orders.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#6B7078]">Test Rides / Service</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">
            {testRides.length + services.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#6B7078]">Loyalty Points</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#1E8E4E] tabular-nums">
            {profile?.loyalty_balance ?? 0}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#111214]">Latest Bike Booking</h2>
            <Link to="/account/bookings" className="text-xs font-semibold text-[#D71920] hover:underline">
              View all
            </Link>
          </div>
          {latestBooking ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <Link
                  to={`/account/bookings/${latestBooking.booking_number}`}
                  className="font-mono-tabular font-semibold hover:text-[#D71920]"
                >
                  {latestBooking.booking_number}
                </Link>
                <StatusChip status={latestBooking.status} />
              </div>
              <p className="text-[#26282C]">
                {latestBooking.variant?.model?.name} — {latestBooking.variant?.name}
              </p>
              <p className="text-xs text-[#6B7078]">
                Token: {formatPKR(latestBooking.token_amount)} · {formatDateKarachi(latestBooking.created_at)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#6B7078]">No bike bookings yet.</p>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#111214]">Latest Store Order</h2>
            <Link to="/account/orders" className="text-xs font-semibold text-[#D71920] hover:underline">
              View all
            </Link>
          </div>
          {latestOrder ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <Link
                  to={`/account/orders/${latestOrder.order_number}`}
                  className="font-mono-tabular font-semibold hover:text-[#D71920]"
                >
                  {latestOrder.order_number}
                </Link>
                <StatusChip status={latestOrder.status} />
              </div>
              <p className="text-[#26282C] tabular-nums">{formatPKR(latestOrder.total)}</p>
              <p className="text-xs text-[#6B7078]">{formatDateKarachi(latestOrder.created_at)}</p>
            </div>
          ) : (
            <p className="text-sm text-[#6B7078]">No store orders yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
