import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { REGISTRATION_STEPS } from '../../lib/constants';
import { formatDateTimeKarachi, formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import {
  getBookingByNumber,
  listMyBookings,
  requestBookingCancel,
} from '../../services/bookings';
import {
  Button,
  Card,
  EmptyState,
  Modal,
  Skeleton,
  StatusChip,
  Stepper,
} from '../../components/ui/Primitives';
import { Logo } from '../../components/brand/Logo';

export function AccountBookingsPage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  usePageMeta({ title: `My Bookings | ${settings.brand_name}` });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings', user?.id],
    queryFn: () => listMyBookings(user!.id),
    enabled: Boolean(user),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">My Bike Bookings</h1>
        <Link to="/bikes">
          <Button size="sm">Book Another Bike</Button>
        </Link>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title="No motorcycle bookings yet"
          description="Reserve a bike with a token to track confirmation and registration progress."
          actionLabel="Browse Motorcycles"
          actionTo="/bikes"
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <Card key={b.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Link
                    to={`/account/bookings/${b.booking_number}`}
                    className="font-mono-tabular text-sm font-bold text-[#111214] hover:text-[#D71920]"
                  >
                    {b.booking_number}
                  </Link>
                  <StatusChip status={b.status} />
                </div>
                <p className="mt-1 text-sm font-semibold text-[#111214]">
                  {b.variant?.model?.name || 'Motorcycle'} — {b.variant?.name} ({b.color?.name})
                </p>
                <p className="text-xs text-[#6B7078] mt-0.5 tabular-nums">
                  {b.branch?.name} · Token {formatPKR(b.token_amount)} · {formatDateTimeKarachi(b.created_at)}
                </p>
              </div>
              <Link to={`/account/bookings/${b.booking_number}`}>
                <Button size="sm" variant="outline">
                  View &amp; Track
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccountBookingDetailPage() {
  const { bookingNumber = '' } = useParams();
  const { settings } = useSettings();
  const { toast } = useToast();

  usePageMeta({ title: `Booking ${bookingNumber} | ${settings.brand_name}` });

  const { data: booking, isLoading, refetch } = useQuery({
    queryKey: ['booking-detail', bookingNumber],
    queryFn: () => getBookingByNumber(bookingNumber),
    enabled: Boolean(bookingNumber),
  });

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (isLoading) return <Skeleton className="h-80 w-full" />;

  if (!booking) {
    return (
      <EmptyState
        title="Booking not found"
        description="Unable to locate this booking number."
        actionLabel="My Bookings"
        actionTo="/account/bookings"
      />
    );
  }

  const canCancel = ['pending', 'confirmed'].includes(booking.status);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await requestBookingCancel(booking.id);
      toast({ title: 'Booking cancelled', variant: 'success' });
      setCancelModalOpen(false);
      void refetch();
    } catch (err) {
      toast({
        title: 'Cancel failed',
        description: err instanceof Error ? err.message : 'Unable to cancel',
        variant: 'error',
      });
    } finally {
      setCancelling(false);
    }
  };

  const progress = booking.registration_progress;
  const stepperItems = REGISTRATION_STEPS.map((s) => {
    const entry = progress?.step_history?.find((h) => h.step === s.key);
    return {
      key: s.key,
      label: s.label,
      description: entry?.note || s.description,
      timestamp: entry ? formatDateTimeKarachi(entry.at) : undefined,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E3E4E7] bg-white px-5 py-4">
        <Logo variant="mono-dark" height={30} to={null} />
        <div className="text-right text-xs text-[#6B7078]">
          <p className="font-semibold uppercase tracking-wider text-[#111214]">Token Booking Receipt</p>
          <p className="tabular-nums">{settings.legal_business_name} · {settings.contact_phone}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono-tabular text-xs text-[#6B7078]">{booking.booking_number}</p>
          <h1 className="font-display text-3xl font-bold text-[#111214]">
            {booking.variant?.model?.name || 'Motorcycle Booking'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={booking.status} />
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Receipt
          </Button>
          {canCancel && (
            <Button size="sm" variant="destructive" onClick={() => setCancelModalOpen(true)}>
              Cancel Booking
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5 p-6 space-y-3">
          <h2 className="text-base font-semibold text-[#111214]">Booking Details</h2>
          <dl className="space-y-2 text-sm tabular-nums">
            <div className="flex justify-between">
              <dt className="text-[#6B7078]">Variant</dt>
              <dd className="font-medium">{booking.variant?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6B7078]">Color</dt>
              <dd className="font-medium">{booking.color?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6B7078]">Branch</dt>
              <dd className="font-medium text-right">{booking.branch?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6B7078]">Token Amount</dt>
              <dd className="font-bold text-[#D71920]">{formatPKR(booking.token_amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6B7078]">Payment Method</dt>
              <dd className="uppercase text-xs font-semibold">{booking.payment_method.replace('_', ' ')}</dd>
            </div>
            {booking.hold_expires_at && (
              <div className="flex justify-between">
                <dt className="text-[#6B7078]">Hold Valid Until</dt>
                <dd>{formatDateTimeKarachi(booking.hold_expires_at)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="lg:col-span-7 p-6">
          <h2 className="text-base font-semibold text-[#111214] mb-4">
            Registration &amp; Delivery Tracker
          </h2>
          <Stepper
            steps={stepperItems}
            currentKey={progress?.current_step || 'booked'}
          />
        </Card>
      </div>

      <Modal
        open={cancelModalOpen}
        onClose={() => {
          if (!cancelling) setCancelModalOpen(false);
        }}
        title="Cancel Bike Booking"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#26282C]">
            Are you sure you want to cancel booking{' '}
            <strong className="font-mono-tabular">{booking.booking_number}</strong> for{' '}
            <strong>{booking.variant?.model?.name || 'this motorcycle'}</strong>?
          </p>
          <p className="text-xs text-[#6B7078]">
            Any verified token refund is processed by the showroom team according to cancellation policy.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cancelling}
              onClick={() => setCancelModalOpen(false)}
            >
              Keep Booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              loading={cancelling}
              onClick={() => void handleCancel()}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
