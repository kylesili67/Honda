import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  BOOKING_STATUS_OPTIONS,
  INQUIRY_STATUS_OPTIONS,
  REGISTRATION_STEPS,
  TEST_RIDE_STATUS_OPTIONS,
  TRADE_IN_STATUS_OPTIONS,
  canWriteAdminModule,
} from '../../lib/constants';
import { downloadCSV } from '../../lib/csv';
import { formatDateKarachi, formatDateTimeKarachi, formatPKR } from '../../lib/format';
import {
  getBookingById,
  listAllBookingsAdmin,
  updateBookingAdmin,
  updateRegistrationProgress,
} from '../../services/bookings';
import { listAllInquiriesAdmin, updateInquiryAdmin } from '../../services/inquiries';
import { listAllTestRidesAdmin, updateTestRideStatus } from '../../services/testRides';
import { listAllTradeInsAdmin, updateTradeInAdmin } from '../../services/tradeIns';
import type {
  BookingStatus,
  InquiryStatus,
  RegistrationStep,
  TestRideStatus,
  TradeInStatus,
} from '../../types/database';
import { Button, Card, Input, Select, StatusChip, Stepper, Textarea } from '../../components/ui/Primitives';

export function AdminBookingsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: bookings = [] } = useQuery({ queryKey: ['admin-bookings'], queryFn: listAllBookingsAdmin });

  const filtered = bookings.filter((b) => statusFilter === 'all' || b.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Bike Bookings</h1>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
            <option value="all">All Statuses</option>
            {BOOKING_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCSV(
                'bookings.csv',
                filtered.map((b) => ({
                  booking_number: b.booking_number,
                  customer_name: b.customer_name,
                  customer_phone: b.customer_phone,
                  model: b.variant?.model?.name,
                  variant: b.variant?.name,
                  token_amount: b.token_amount,
                  status: b.status,
                  created_at: b.created_at,
                }))
              )
            }
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Number</th>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Bike &amp; Color</th>
              <th className="p-3.5">Token</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Date</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-[#F5F5F6]/50">
                <td className="p-3.5 font-mono-tabular font-semibold">{b.booking_number}</td>
                <td className="p-3.5">
                  <p className="font-medium">{b.customer_name}</p>
                  <p className="text-xs text-[#6B7078]">{b.customer_phone}</p>
                </td>
                <td className="p-3.5">
                  {b.variant?.model?.name} ({b.color?.name})
                </td>
                <td className="p-3.5 tabular-nums font-medium">{formatPKR(b.token_amount)}</td>
                <td className="p-3.5"><StatusChip status={b.status} /></td>
                <td className="p-3.5 text-xs text-[#6B7078] tabular-nums">{formatDateKarachi(b.created_at)}</td>
                <td className="p-3.5 text-right">
                  <Link to={`/admin/bookings/${b.id}`} className="text-xs font-semibold text-[#D71920] hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminBookingDetailPage() {
  const { id = '' } = useParams();
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'bookings');

  const { data: booking, refetch } = useQuery({
    queryKey: ['admin-booking', id],
    queryFn: () => getBookingById(id),
    enabled: Boolean(id),
  });

  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [internalNotes, setInternalNotes] = useState('');
  const [regStep, setRegStep] = useState<RegistrationStep>('booked');
  const [regNote, setRegNote] = useState('');

  if (!booking) return <p className="text-sm text-[#6B7078]">Loading booking...</p>;

  const effectiveStatus = status || booking.status;

  const handleSaveBooking = async () => {
    if (!user) return;
    await updateBookingAdmin(
      booking.id,
      { status: effectiveStatus as BookingStatus, internal_notes: internalNotes || booking.internal_notes },
      user.id
    );
    toast({ title: 'Booking updated', variant: 'success' });
    void refetch();
  };

  const handleAdvanceReg = async () => {
    if (!user) return;
    await updateRegistrationProgress(booking.id, regStep, regNote || 'Updated by showroom staff', user.id);
    toast({ title: 'Registration step updated', variant: 'success' });
    setRegNote('');
    void refetch();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono-tabular text-xs text-[#6B7078]">{booking.booking_number}</p>
          <h1 className="font-display text-3xl font-bold text-[#111214]">{booking.customer_name}</h1>
        </div>
        <StatusChip status={booking.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#111214]">Booking Controls</h2>
          <Select
            label="Booking Status"
            disabled={!canWrite}
            value={effectiveStatus}
            onChange={(e) => setStatus(e.target.value as BookingStatus)}
          >
            {BOOKING_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <Textarea
            label="Internal Staff Notes"
            disabled={!canWrite}
            defaultValue={booking.internal_notes || ''}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
          />
          {canWrite && (
            <Button onClick={() => void handleSaveBooking()}>Save Booking Update</Button>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#111214]">Registration Progress</h2>
          <Stepper
            steps={REGISTRATION_STEPS.map((s) => {
              const entry = booking.registration_progress?.step_history?.find((h) => h.step === s.key);
              return {
                key: s.key,
                label: s.label,
                description: entry?.note || s.description,
                timestamp: entry ? formatDateTimeKarachi(entry.at) : undefined,
              };
            })}
            currentKey={booking.registration_progress?.current_step || 'booked'}
          />
          {canWrite && (
            <div className="pt-4 border-t border-[#E3E4E7] space-y-3">
              <Select
                label="Set Registration Step"
                value={regStep}
                onChange={(e) => setRegStep(e.target.value as RegistrationStep)}
              >
                {REGISTRATION_STEPS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </Select>
              <Input
                label="Step Note"
                placeholder="e.g. Excise challan paid"
                value={regNote}
                onChange={(e) => setRegNote(e.target.value)}
              />
              <Button variant="secondary" onClick={() => void handleAdvanceReg()}>
                Update Registration Step
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function AdminInquiriesPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'inquiries');
  const { data: inquiries = [], refetch } = useQuery({
    queryKey: ['admin-inquiries'],
    queryFn: listAllInquiriesAdmin,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Sales Inquiries</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadCSV('inquiries.csv', inquiries as unknown as Array<Record<string, unknown>>)}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Lead</th>
              <th className="p-3.5">Bike / Source</th>
              <th className="p-3.5">Message</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {inquiries.map((inq) => (
              <tr key={inq.id}>
                <td className="p-3.5">
                  <p className="font-semibold">{inq.name}</p>
                  <p className="text-xs text-[#6B7078]">{inq.phone}</p>
                </td>
                <td className="p-3.5 text-xs">
                  <p>{inq.model?.name || 'General'}</p>
                  <p className="text-[#6B7078]">{inq.source}</p>
                </td>
                <td className="p-3.5 max-w-sm text-[#26282C]">{inq.message}</td>
                <td className="p-3.5">
                  <select
                    disabled={!canWrite}
                    value={inq.status}
                    onChange={async (e) => {
                      await updateInquiryAdmin(inq.id, { status: e.target.value as InquiryStatus });
                      toast({ title: 'Inquiry status updated', variant: 'success' });
                      void refetch();
                    }}
                    className="h-9 rounded border border-[#E3E4E7] px-2 text-xs"
                  >
                    {INQUIRY_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminTestRidesPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'test_rides');
  const { data: rides = [], refetch } = useQuery({
    queryKey: ['admin-test-rides'],
    queryFn: listAllTestRidesAdmin,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Test Rides</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadCSV('test-rides.csv', rides as unknown as Array<Record<string, unknown>>)}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Ref</th>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Model &amp; Branch</th>
              <th className="p-3.5">Date &amp; Slot</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {rides.map((tr) => (
              <tr key={tr.id}>
                <td className="p-3.5 font-mono-tabular font-semibold">{tr.test_ride_number}</td>
                <td className="p-3.5">
                  <p className="font-medium">{tr.customer_name}</p>
                  <p className="text-xs text-[#6B7078]">{tr.customer_phone}</p>
                </td>
                <td className="p-3.5">
                  <p>{tr.model?.name}</p>
                  <p className="text-xs text-[#6B7078]">{tr.branch?.city}</p>
                </td>
                <td className="p-3.5 text-xs tabular-nums">
                  {formatDateKarachi(tr.ride_date)} · {tr.slot?.start_time}
                </td>
                <td className="p-3.5">
                  <select
                    disabled={!canWrite}
                    value={tr.status}
                    onChange={async (e) => {
                      await updateTestRideStatus(tr.id, { status: e.target.value as TestRideStatus });
                      toast({ title: 'Test ride updated', variant: 'success' });
                      void refetch();
                    }}
                    className="h-9 rounded border border-[#E3E4E7] px-2 text-xs"
                  >
                    {TEST_RIDE_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminTradeInsPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'trade_ins');
  const { data: items = [], refetch } = useQuery({
    queryKey: ['admin-trade-ins'],
    queryFn: listAllTradeInsAdmin,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Trade-In Requests</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadCSV('trade-ins.csv', items as unknown as Array<Record<string, unknown>>)}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Owner</th>
              <th className="p-3.5">Current Bike</th>
              <th className="p-3.5">Expected</th>
              <th className="p-3.5">Valuation (PKR)</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {items.map((t) => (
              <tr key={t.id}>
                <td className="p-3.5">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-[#6B7078]">{t.phone}</p>
                </td>
                <td className="p-3.5">
                  {t.year} {t.current_make} {t.current_model} ({t.mileage_km.toLocaleString()} km)
                </td>
                <td className="p-3.5 tabular-nums">{formatPKR(t.expected_price)}</td>
                <td className="p-3.5">
                  <input
                    type="number"
                    disabled={!canWrite}
                    defaultValue={t.valuation_amount ?? ''}
                    placeholder="Set PKR"
                    onBlur={async (e) => {
                      if (!e.target.value) return;
                      await updateTradeInAdmin(t.id, {
                        valuation_amount: Number(e.target.value),
                        status: 'valued',
                      });
                      toast({ title: 'Valuation saved', variant: 'success' });
                      void refetch();
                    }}
                    className="w-28 h-9 rounded border border-[#E3E4E7] px-2 text-xs tabular-nums"
                  />
                </td>
                <td className="p-3.5">
                  <select
                    disabled={!canWrite}
                    value={t.status}
                    onChange={async (e) => {
                      await updateTradeInAdmin(t.id, { status: e.target.value as TradeInStatus });
                      toast({ title: 'Status updated', variant: 'success' });
                      void refetch();
                    }}
                    className="h-9 rounded border border-[#E3E4E7] px-2 text-xs"
                  >
                    {TRADE_IN_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
