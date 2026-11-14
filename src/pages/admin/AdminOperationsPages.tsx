import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  RETURN_STATUS_OPTIONS,
  SERVICE_STATUS_OPTIONS,
  canWriteAdminModule,
} from '../../lib/constants';
import { downloadCSV } from '../../lib/csv';
import { formatDateKarachi, formatDateTimeKarachi, formatPKR, todayKarachiISO } from '../../lib/format';
import { listCustomersAdmin, updateCustomerNotesAdmin } from '../../services/admin';
import { adjustLoyaltyPointsAdmin } from '../../services/loyalty';
import {
  getOrderById,
  listAllOrdersAdmin,
  listAllReturnsAdmin,
  updateOrderAdmin,
  updateReturnAdmin,
} from '../../services/orders';
import {
  listPaymentsAdmin,
  listRefundsAdmin,
  recordRefundAdmin,
  verifyPaymentAdmin,
} from '../../services/payments';
import {
  addServiceHistoryEntry,
  listAllServiceAppointmentsAdmin,
  updateServiceAppointmentAdmin,
} from '../../services/service';
import { createSignedStorageUrl } from '../../services/storage';
import type {
  OrderStatus,
  PaymentStatus,
  ReturnStatus,
  ServiceAppointmentStatus,
} from '../../types/database';
import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  StatusChip,
  Textarea,
} from '../../components/ui/Primitives';

export function AdminOrdersPage() {
  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: listAllOrdersAdmin });
  const [statusFilter, setStatusFilter] = useState('all');
  const filtered = orders.filter((o) => statusFilter === 'all' || o.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Store Orders</h1>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
            <option value="all">All Statuses</option>
            {ORDER_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadCSV('orders.csv', filtered as unknown as Array<Record<string, unknown>>)}
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
              <th className="p-3.5">Order #</th>
              <th className="p-3.5">Recipient</th>
              <th className="p-3.5">Fulfillment</th>
              <th className="p-3.5">Total</th>
              <th className="p-3.5">Order Status</th>
              <th className="p-3.5">Payment</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-[#F5F5F6]/50">
                <td className="p-3.5 font-mono-tabular font-semibold">{o.order_number}</td>
                <td className="p-3.5">
                  <p className="font-medium">{o.shipping_name}</p>
                  <p className="text-xs text-[#6B7078]">{o.shipping_city || 'Showroom'}</p>
                </td>
                <td className="p-3.5 capitalize">{o.fulfillment}</td>
                <td className="p-3.5 tabular-nums font-semibold">{formatPKR(o.total)}</td>
                <td className="p-3.5"><StatusChip status={o.status} /></td>
                <td className="p-3.5"><StatusChip status={o.payment_status} /></td>
                <td className="p-3.5 text-right">
                  <Link to={`/admin/orders/${o.id}`} className="text-xs font-semibold text-[#D71920] hover:underline">
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

export function AdminOrderDetailPage() {
  const { id = '' } = useParams();
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'orders');

  const { data: order, refetch } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => getOrderById(id),
    enabled: Boolean(id),
  });

  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!order) return;
    setStatus(order.status);
    setCourier(order.courier_name || '');
    setTracking(order.tracking_number || '');
  }, [order?.id, order?.status, order?.courier_name, order?.tracking_number]);

  if (!order) return <p className="text-sm text-[#6B7078]">Loading order...</p>;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateOrderAdmin(
        order.id,
        {
          status: (status || order.status) as OrderStatus,
          courier_name: courier.trim() || null,
          tracking_number: tracking.trim() || null,
        },
        user.id
      );
      toast({ title: 'Order updated', variant: 'success' });
      void refetch();
    } catch (err) {
      toast({
        title: 'Failed to update order',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono-tabular text-xs text-[#6B7078]">{order.order_number}</p>
          <h1 className="font-display text-3xl font-bold text-[#111214]">{order.shipping_name}</h1>
        </div>
        <StatusChip status={order.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#111214]">Fulfillment &amp; Courier</h2>
          <Select
            label="Order Status"
            disabled={!canWrite}
            value={status || order.status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
          >
            {ORDER_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Input
            label="Courier Name"
            disabled={!canWrite}
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder="e.g. TCS Express / Leopards"
          />
          <Input
            label="Tracking Number"
            disabled={!canWrite}
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />
          {canWrite && (
            <Button loading={saving} onClick={() => void handleSave()}>
              Save Order Changes
            </Button>
          )}
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-base font-semibold text-[#111214]">Order Items</h2>
          <ul className="divide-y divide-[#E3E4E7] text-sm">
            {(order.items ?? []).map((i) => (
              <li key={i.id} className="py-2 flex justify-between">
                <span>{i.name_snapshot} × {i.quantity}</span>
                <span className="tabular-nums font-medium">{formatPKR(i.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="pt-3 border-t border-[#E3E4E7] flex justify-between font-bold tabular-nums">
            <span>Total</span>
            <span>{formatPKR(order.total)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function AdminPaymentsPage() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'payments');

  const { data: payments = [], refetch } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: listPaymentsAdmin,
  });
  const { data: refunds = [], refetch: refetchRefunds } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: listRefundsAdmin,
  });

  const [refundTargetId, setRefundTargetId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [refundRef, setRefundRef] = useState('');
  const [refundBusy, setRefundBusy] = useState(false);
  const [proofPreview, setProofPreview] = useState<{ url: string; path: string; isPdf: boolean } | null>(null);
  const [loadingProofId, setLoadingProofId] = useState<string | null>(null);

  const handleOpenProof = async (paymentId: string, proofPath: string) => {
    setLoadingProofId(paymentId);
    try {
      const url = await createSignedStorageUrl('payment-proofs', proofPath, 300);
      const isPdf = proofPath.toLowerCase().endsWith('.pdf');
      setProofPreview({ url, path: proofPath, isPdf });
    } catch (err) {
      toast({
        title: 'Unable to open proof',
        description: err instanceof Error ? err.message : 'Could not load signed URL',
        variant: 'error',
      });
    } finally {
      setLoadingProofId(null);
    }
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !refundTargetId) return;
    setRefundBusy(true);
    try {
      await recordRefundAdmin({
        payment_id: refundTargetId,
        amount: refundAmount,
        reason: refundReason,
        processed_by: user.id,
        reference: refundRef.trim() || null,
      });
      toast({ title: 'Refund recorded', variant: 'success' });
      setRefundTargetId(null);
      setRefundReason('');
      setRefundRef('');
      void refetch();
      void refetchRefunds();
    } catch (err) {
      toast({
        title: 'Failed to record refund',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      });
    } finally {
      setRefundBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Payments &amp; Refunds</h1>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Type</th>
              <th className="p-3.5">Method</th>
              <th className="p-3.5">Amount</th>
              <th className="p-3.5">Proof / Ref</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="p-3.5 capitalize font-medium">{p.payable_type}</td>
                <td className="p-3.5 uppercase text-xs font-semibold">{p.method.replace('_', ' ')}</td>
                <td className="p-3.5 tabular-nums font-semibold">{formatPKR(p.amount)}</td>
                <td className="p-3.5 text-xs text-[#6B7078]">
                  {p.proof_path ? (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={loadingProofId === p.id}
                      onClick={() => void handleOpenProof(p.id, p.proof_path!)}
                    >
                      View Proof
                    </Button>
                  ) : (
                    p.gateway_reference || '—'
                  )}
                </td>
                <td className="p-3.5">
                  <select
                    disabled={!canWrite}
                    value={p.status}
                    onChange={async (e) => {
                      if (!user) return;
                      try {
                        await verifyPaymentAdmin(p.id, e.target.value as PaymentStatus, user.id);
                        toast({ title: 'Payment status updated', variant: 'success' });
                        void refetch();
                      } catch (err) {
                        toast({
                          title: 'Failed to update payment status',
                          description: err instanceof Error ? err.message : 'Please try again',
                          variant: 'error',
                        });
                      }
                    }}
                    className="h-9 rounded border border-[#E3E4E7] px-2 text-xs"
                  >
                    {PAYMENT_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3.5 text-right">
                  {canWrite && p.status === 'paid' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRefundTargetId(p.id);
                        setRefundAmount(p.amount);
                      }}
                    >
                      Record Refund
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {refunds.length > 0 && (
        <Card className="p-5 space-y-3">
          <h2 className="text-base font-semibold text-[#111214]">Processed Refunds</h2>
          <ul className="divide-y divide-[#E3E4E7] text-sm">
            {refunds.map((r) => (
              <li key={r.id} className="py-2 flex justify-between">
                <span>
                  {formatPKR(r.amount)} — {r.reason} {r.reference ? `(${r.reference})` : ''}
                </span>
                <span className="text-xs text-[#6B7078] tabular-nums">
                  {formatDateTimeKarachi(r.processed_at)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={Boolean(refundTargetId)} onClose={() => setRefundTargetId(null)} title="Record Refund">
        <form onSubmit={handleRefund} className="space-y-4">
          <Input
            label="Refund Amount (PKR)"
            type="number"
            required
            value={refundAmount}
            onChange={(e) => setRefundAmount(Number(e.target.value))}
          />
          <Input
            label="Bank / Transaction Reference"
            value={refundRef}
            onChange={(e) => setRefundRef(e.target.value)}
          />
          <Textarea
            label="Reason"
            required
            rows={2}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
          <Button type="submit" loading={refundBusy} className="w-full">Confirm Refund</Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(proofPreview)}
        onClose={() => setProofPreview(null)}
        title="Payment Proof"
      >
        {proofPreview && (
          <div className="space-y-3">
            <p className="text-xs font-mono-tabular text-[#6B7078] break-all">{proofPreview.path}</p>
            {proofPreview.isPdf ? (
              <a
                href={proofPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-semibold text-[#D71920] underline"
              >
                Open PDF Receipt in New Tab
              </a>
            ) : (
              <img
                src={proofPreview.url}
                alt="Uploaded payment proof"
                className="w-full max-h-[65vh] object-contain rounded-lg border border-[#E3E4E7]"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AdminReturnsPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'returns');
  const { data: returns = [], refetch } = useQuery({
    queryKey: ['admin-returns'],
    queryFn: listAllReturnsAdmin,
  });

  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[] | null>(null);
  const [loadingPhotosId, setLoadingPhotosId] = useState<string | null>(null);

  const handleViewPhotos = async (returnId: string, paths: string[]) => {
    setLoadingPhotosId(returnId);
    try {
      const urls = await Promise.all(
        paths.map((p) => createSignedStorageUrl('payment-proofs', p, 300))
      );
      setPhotoPreviewUrls(urls);
    } catch (err) {
      toast({
        title: 'Unable to load return photos',
        description: err instanceof Error ? err.message : 'Could not fetch signed URLs',
        variant: 'error',
      });
    } finally {
      setLoadingPhotosId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Returns &amp; Exchanges</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Return #</th>
              <th className="p-3.5">Order</th>
              <th className="p-3.5">Type &amp; Reason</th>
              <th className="p-3.5">Photos</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {returns.map((r) => (
              <tr key={r.id}>
                <td className="p-3.5 font-mono-tabular font-semibold">{r.return_number}</td>
                <td className="p-3.5 font-mono-tabular">{r.order?.order_number || r.order_id}</td>
                <td className="p-3.5">
                  <p className="capitalize font-medium">{r.type}: {r.reason}</p>
                  <p className="text-xs text-[#6B7078]">{r.details}</p>
                </td>
                <td className="p-3.5">
                  {(r.photo_paths ?? []).length > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={loadingPhotosId === r.id}
                      onClick={() => void handleViewPhotos(r.id, r.photo_paths)}
                    >
                      Photos ({r.photo_paths.length})
                    </Button>
                  ) : (
                    <span className="text-xs text-[#6B7078]">—</span>
                  )}
                </td>
                <td className="p-3.5">
                  <select
                    disabled={!canWrite}
                    value={r.status}
                    onChange={async (e) => {
                      try {
                        await updateReturnAdmin(r.id, { status: e.target.value as ReturnStatus });
                        toast({ title: 'Return status updated', variant: 'success' });
                        void refetch();
                      } catch (err) {
                        toast({
                          title: 'Failed to update return status',
                          description: err instanceof Error ? err.message : 'Please try again',
                          variant: 'error',
                        });
                      }
                    }}
                    className="h-9 rounded border border-[#E3E4E7] px-2 text-xs"
                  >
                    {RETURN_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        open={Boolean(photoPreviewUrls)}
        onClose={() => setPhotoPreviewUrls(null)}
        title="Return Request Photos"
      >
        {photoPreviewUrls && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
            {photoPreviewUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Return evidence ${idx + 1}`}
                className="w-full h-48 object-cover rounded-lg border border-[#E3E4E7]"
              />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AdminServicePage() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'service');
  const { data: appointments = [], refetch } = useQuery({
    queryKey: ['admin-services'],
    queryFn: listAllServiceAppointmentsAdmin,
  });

  const [historyAppt, setHistoryAppt] = useState<(typeof appointments)[number] | null>(null);
  const [odometer, setOdometer] = useState(1000);
  const [workDone, setWorkDone] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [cost, setCost] = useState(0);
  const [loggingHistory, setLoggingHistory] = useState(false);

  const handleLogHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyAppt || !user) return;
    setLoggingHistory(true);
    try {
      await addServiceHistoryEntry({
        user_id: historyAppt.user_id,
        appointment_id: historyAppt.id,
        registration_number: historyAppt.registration_number,
        model_name: historyAppt.model_name,
        service_date: todayKarachiISO(),
        odometer_km: odometer,
        work_done: workDone,
        parts_used: partsUsed || null,
        cost,
        created_by: user.id,
      });
      await updateServiceAppointmentAdmin(historyAppt.id, { status: 'completed' });
      toast({ title: 'Service history logged & appointment completed', variant: 'success' });
      setHistoryAppt(null);
      setWorkDone('');
      setPartsUsed('');
      void refetch();
    } catch (err) {
      toast({
        title: 'Failed to log service history',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      });
    } finally {
      setLoggingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Service Appointments</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadCSV('service-appointments.csv', appointments as unknown as Array<Record<string, unknown>>)}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Service #</th>
              <th className="p-3.5">Bike &amp; Reg</th>
              <th className="p-3.5">Date &amp; Slot</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">History</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {appointments.map((sv) => (
              <tr key={sv.id}>
                <td className="p-3.5 font-mono-tabular font-semibold">{sv.service_number}</td>
                <td className="p-3.5">
                  <p className="font-medium">{sv.model_name} ({sv.registration_number})</p>
                  <p className="text-xs text-[#6B7078] capitalize">{sv.service_type.replace('_', ' ')}</p>
                </td>
                <td className="p-3.5 text-xs tabular-nums">
                  {formatDateKarachi(sv.service_date)} · {sv.slot?.start_time}
                </td>
                <td className="p-3.5">
                  <select
                    disabled={!canWrite}
                    value={sv.status}
                    onChange={async (e) => {
                      try {
                        await updateServiceAppointmentAdmin(sv.id, {
                          status: e.target.value as ServiceAppointmentStatus,
                        });
                        toast({ title: 'Service status updated', variant: 'success' });
                        void refetch();
                      } catch (err) {
                        toast({
                          title: 'Failed to update service status',
                          description: err instanceof Error ? err.message : 'Please try again',
                          variant: 'error',
                        });
                      }
                    }}
                    className="h-9 rounded border border-[#E3E4E7] px-2 text-xs"
                  >
                    {SERVICE_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3.5 text-right">
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={() => setHistoryAppt(sv)}>
                      Log Service Record
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={Boolean(historyAppt)} onClose={() => setHistoryAppt(null)} title="Add Workshop Service History">
        <form onSubmit={handleLogHistory} className="space-y-4">
          <Input label="Odometer (km)" type="number" required value={odometer} onChange={(e) => setOdometer(Number(e.target.value))} />
          <Textarea label="Work Done" required rows={3} value={workDone} onChange={(e) => setWorkDone(e.target.value)} />
          <Input label="Parts Used" value={partsUsed} onChange={(e) => setPartsUsed(e.target.value)} />
          <Input label="Total Cost (PKR)" type="number" required value={cost} onChange={(e) => setCost(Number(e.target.value))} />
          <Button type="submit" loading={loggingHistory} className="w-full">Save Record &amp; Complete</Button>
        </form>
      </Modal>
    </div>
  );
}

export function AdminCustomersPage() {
  const { data: customers = [] } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: listCustomersAdmin,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Customers</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Phone</th>
              <th className="p-3.5">Loyalty Points</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {customers
              .filter((c) => c.roles.includes('customer'))
              .map((c) => (
                <tr key={c.id}>
                  <td className="p-3.5">
                    <p className="font-semibold">{c.full_name}</p>
                    <p className="text-xs text-[#6B7078]">{c.email}</p>
                  </td>
                  <td className="p-3.5 tabular-nums">{c.phone}</td>
                  <td className="p-3.5 tabular-nums font-semibold text-[#1E8E4E]">{c.loyalty_balance}</td>
                  <td className="p-3.5 text-right">
                    <Link to={`/admin/customers/${c.id}`} className="text-xs font-semibold text-[#D71920] hover:underline">
                      View / Adjust
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

export function AdminCustomerDetailPage() {
  const { id = '' } = useParams();
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'customers');

  const { data: customers = [], refetch } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: listCustomersAdmin,
  });
  const customer = customers.find((c) => c.id === id);

  const [notes, setNotes] = useState('');
  const [pointsDelta, setPointsDelta] = useState(50);
  const [pointsNote, setPointsNote] = useState('Showroom goodwill adjustment');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingPoints, setSavingPoints] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setNotes(customer.notes || '');
  }, [customer?.id, customer?.notes]);

  if (!customer) return <p className="text-sm text-[#6B7078]">Customer not found.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#111214]">{customer.full_name}</h1>
        <p className="text-sm text-[#6B7078]">{customer.email} · {customer.phone}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#111214]">Staff Notes</h2>
          <Textarea
            rows={3}
            disabled={!canWrite}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {canWrite && (
            <Button
              size="sm"
              loading={savingNotes}
              onClick={async () => {
                setSavingNotes(true);
                try {
                  await updateCustomerNotesAdmin(customer.id, notes);
                  toast({ title: 'Customer notes saved', variant: 'success' });
                  void refetch();
                } catch (err) {
                  toast({
                    title: 'Failed to save notes',
                    description: err instanceof Error ? err.message : 'Please try again',
                    variant: 'error',
                  });
                } finally {
                  setSavingNotes(false);
                }
              }}
            >
              Save Notes
            </Button>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#111214]">
            Loyalty Adjustment (Current: {customer.loyalty_balance} pts)
          </h2>
          <Input
            label="Points (+ / −)"
            type="number"
            disabled={!canWrite}
            value={pointsDelta}
            onChange={(e) => setPointsDelta(Number(e.target.value))}
          />
          <Input
            label="Audit Reason"
            disabled={!canWrite}
            value={pointsNote}
            onChange={(e) => setPointsNote(e.target.value)}
          />
          {canWrite && (
            <Button
              size="sm"
              variant="secondary"
              loading={savingPoints}
              onClick={async () => {
                if (!user) return;
                setSavingPoints(true);
                try {
                  await adjustLoyaltyPointsAdmin({
                    user_id: customer.id,
                    points: pointsDelta,
                    reason: 'admin_adjust',
                    note: pointsNote,
                    actor_id: user.id,
                  });
                  toast({ title: 'Loyalty points adjusted & audited', variant: 'success' });
                  void refetch();
                } catch (err) {
                  toast({
                    title: 'Failed to adjust loyalty points',
                    description: err instanceof Error ? err.message : 'Please try again',
                    variant: 'error',
                  });
                } finally {
                  setSavingPoints(false);
                }
              }}
            >
              Apply Points Adjustment
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
