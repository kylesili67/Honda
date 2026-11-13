import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { formatDateKarachi, formatDateTimeKarachi, formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { listBikes } from '../../services/bikes';
import { listMyInquiries } from '../../services/inquiries';
import { listMyLoyaltyLedger } from '../../services/loyalty';
import { listMyServiceAppointments, listMyServiceHistory } from '../../services/service';
import { listMyTestRides } from '../../services/testRides';
import {
  deleteSavedComparison,
  listMyWishlist,
  listSavedComparisons,
  toggleWishlistItem,
} from '../../services/wishlist';
import { Button, Card, EmptyState, Skeleton, StatusChip } from '../../components/ui/Primitives';

export function AccountInquiriesPage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  usePageMeta({ title: `My Inquiries | ${settings.brand_name}` });

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ['my-inquiries', user?.id],
    queryFn: () => listMyInquiries(user!.id),
    enabled: Boolean(user),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">My Inquiries</h1>
        <Link to="/inquiry">
          <Button size="sm">New Inquiry</Button>
        </Link>
      </div>
      {inquiries.length === 0 ? (
        <EmptyState
          title="No inquiries submitted"
          description="Questions submitted to our showroom sales desk appear here."
          actionLabel="Ask a Question"
          actionTo="/inquiry"
        />
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <Card key={inq.id} className="p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#111214]">
                  {inq.model?.name || 'General Showroom Inquiry'}
                </p>
                <StatusChip status={inq.status} />
              </div>
              <p className="text-sm text-[#26282C]">{inq.message}</p>
              <p className="text-xs text-[#6B7078]">{formatDateTimeKarachi(inq.created_at)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccountTestRidesPage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  usePageMeta({ title: `My Test Rides | ${settings.brand_name}` });

  const { data: rides = [], isLoading } = useQuery({
    queryKey: ['my-test-rides', user?.id],
    queryFn: () => listMyTestRides(user!.id),
    enabled: Boolean(user),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">My Test Rides</h1>
        <Link to="/test-ride">
          <Button size="sm">Schedule Test Ride</Button>
        </Link>
      </div>
      {rides.length === 0 ? (
        <EmptyState
          title="No test rides scheduled"
          description="Book a showroom slot to ride any available model."
          actionLabel="Book Test Ride"
          actionTo="/test-ride"
        />
      ) : (
        <div className="space-y-3">
          {rides.map((tr) => (
            <Card key={tr.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-xs font-bold">{tr.test_ride_number}</span>
                  <StatusChip status={tr.status} />
                </div>
                <p className="mt-1 text-sm font-semibold text-[#111214]">{tr.model?.name}</p>
                <p className="text-xs text-[#6B7078]">
                  {tr.branch?.name} · {formatDateKarachi(tr.ride_date)}{' '}
                  {tr.slot ? `(${tr.slot.start_time} – ${tr.slot.end_time})` : ''}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccountServicePage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  usePageMeta({ title: `Service & History | ${settings.brand_name}` });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['my-services', user?.id],
    queryFn: () => listMyServiceAppointments(user!.id),
    enabled: Boolean(user),
  });
  const { data: history = [] } = useQuery({
    queryKey: ['my-service-history', user?.id],
    queryFn: () => listMyServiceHistory(user!.id),
    enabled: Boolean(user),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Service Appointments</h1>
        <Link to="/service-booking">
          <Button size="sm">Book Service</Button>
        </Link>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          title="No upcoming service appointments"
          description="Schedule periodic maintenance or free checkups online."
          actionLabel="Book Workshop Slot"
          actionTo="/service-booking"
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((sv) => (
            <Card key={sv.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-xs font-bold">{sv.service_number}</span>
                  <StatusChip status={sv.status} />
                </div>
                <p className="mt-1 text-sm font-semibold">
                  {sv.model_name} · Reg: {sv.registration_number}
                </p>
                <p className="text-xs text-[#6B7078]">
                  {sv.branch?.name} · {formatDateKarachi(sv.service_date)}{' '}
                  {sv.slot ? `(${sv.slot.start_time})` : ''}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="font-display text-2xl font-bold text-[#111214] mb-4">
          Verified Service History
        </h2>
        {history.length === 0 ? (
          <Card className="p-6 text-sm text-[#6B7078]">
            Completed workshop service records logged by technicians will appear here.
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Bike / Reg</th>
                  <th className="p-3.5">Odometer</th>
                  <th className="p-3.5">Work Done</th>
                  <th className="p-3.5 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E4E7]">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="p-3.5 tabular-nums whitespace-nowrap">{formatDateKarachi(h.service_date)}</td>
                    <td className="p-3.5 font-medium">
                      {h.model_name} ({h.registration_number})
                    </td>
                    <td className="p-3.5 tabular-nums">{h.odometer_km.toLocaleString()} km</td>
                    <td className="p-3.5 text-[#26282C]">
                      <p>{h.work_done}</p>
                      {h.parts_used && <p className="text-xs text-[#6B7078]">Parts: {h.parts_used}</p>}
                    </td>
                    <td className="p-3.5 text-right font-semibold tabular-nums">{formatPKR(h.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

export function AccountWishlistPage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  usePageMeta({ title: `My Wishlist | ${settings.brand_name}` });

  const { data: wishlist = [], isLoading, refetch } = useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: () => listMyWishlist(user!.id),
    enabled: Boolean(user),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Saved Wishlist</h1>
      {wishlist.length === 0 ? (
        <EmptyState
          title="Your wishlist is empty"
          description="Save motorcycles from the catalog to compare or book later."
          actionLabel="Browse Bikes"
          actionTo="/bikes"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wishlist.map((w) => (
            <Card key={w.id} className="p-5 flex items-center justify-between gap-4">
              <div>
                <Link
                  to={w.model ? `/bikes/${w.model.slug}` : `/accessories/${w.accessory?.slug}`}
                  className="text-base font-semibold text-[#111214] hover:text-[#D71920]"
                >
                  {w.model?.name || w.accessory?.name}
                </Link>
                <p className="text-xs text-[#6B7078] mt-1">
                  Saved {formatDateKarachi(w.created_at)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await toggleWishlistItem(user!.id, {
                    model_id: w.model_id ?? undefined,
                    accessory_id: w.accessory_id ?? undefined,
                  });
                  toast({ title: 'Removed from wishlist' });
                  void refetch();
                }}
              >
                Remove
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccountComparisonsPage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  usePageMeta({ title: `Saved Comparisons | ${settings.brand_name}` });

  const { data: saved = [], refetch } = useQuery({
    queryKey: ['saved-comparisons', user?.id],
    queryFn: () => listSavedComparisons(user!.id),
    enabled: Boolean(user),
  });
  const { data: bikes = [] } = useQuery({ queryKey: ['bikes-published'], queryFn: () => listBikes() });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Saved Comparisons</h1>
        <Link to="/compare">
          <Button size="sm">Open Compare Tool</Button>
        </Link>
      </div>
      {saved.length === 0 ? (
        <EmptyState
          title="No saved comparisons"
          description="Compare 2–3 bikes side-by-side and save them for later."
          actionLabel="Compare Bikes"
          actionTo="/compare"
        />
      ) : (
        <div className="space-y-3">
          {saved.map((c) => {
            const names = c.model_ids
              .map((id) => bikes.find((b) => b.id === id)?.name)
              .filter(Boolean);
            return (
              <Card key={c.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#111214]">{c.name}</p>
                  <p className="text-xs text-[#6B7078] mt-0.5">{names.join(' vs ')}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await deleteSavedComparison(c.id);
                    toast({ title: 'Comparison deleted' });
                    void refetch();
                  }}
                >
                  Delete
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AccountLoyaltyPage() {
  const { settings } = useSettings();
  const { user, profile } = useAuth();
  usePageMeta({ title: `Loyalty Points | ${settings.brand_name}` });

  const { data: ledger = [] } = useQuery({
    queryKey: ['loyalty-ledger', user?.id],
    queryFn: () => listMyLoyaltyLedger(user!.id),
    enabled: Boolean(user),
  });

  const balance = profile?.loyalty_balance ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Loyalty Points</h1>

      <Card className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[#6B7078] uppercase tracking-wider">Available Balance</p>
          <p className="font-display text-4xl font-bold text-[#1E8E4E] tabular-nums">
            {balance} pts
          </p>
          <p className="text-xs text-[#6B7078] mt-1 tabular-nums">
            Redeemable value: {formatPKR(balance * settings.loyalty_point_value_pkr)} on store orders
          </p>
        </div>
        <Link to="/accessories">
          <Button>Redeem in Store</Button>
        </Link>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Date</th>
              <th className="p-3.5">Reason</th>
              <th className="p-3.5">Note</th>
              <th className="p-3.5 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {ledger.map((entry) => (
              <tr key={entry.id}>
                <td className="p-3.5 tabular-nums whitespace-nowrap">
                  {formatDateTimeKarachi(entry.created_at)}
                </td>
                <td className="p-3.5 capitalize">{entry.reason.replace('_', ' ')}</td>
                <td className="p-3.5 text-[#6B7078]">{entry.note || '—'}</td>
                <td
                  className={`p-3.5 text-right font-semibold tabular-nums ${
                    entry.points >= 0 ? 'text-[#1E8E4E]' : 'text-[#C0262D]'
                  }`}
                >
                  {entry.points >= 0 ? `+${entry.points}` : entry.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
