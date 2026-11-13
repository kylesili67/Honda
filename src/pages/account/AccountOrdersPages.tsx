import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { formatDateTimeKarachi, formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { createReturnRequest, getOrderByNumber, listMyOrders } from '../../services/orders';
import {
  Button,
  Card,
  EmptyState,
  Modal,
  Select,
  Skeleton,
  StatusChip,
  Textarea,
} from '../../components/ui/Primitives';
import { Logo } from '../../components/brand/Logo';

export function AccountOrdersPage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  usePageMeta({ title: `My Orders | ${settings.brand_name}` });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: () => listMyOrders(user!.id),
    enabled: Boolean(user),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">My Store Orders</h1>
        <Link to="/accessories">
          <Button size="sm">Shop Gear</Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No store orders yet"
          description="Helmets, riding gear, and genuine parts orders appear here."
          actionLabel="Shop Accessories"
          actionTo="/accessories"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Link
                    to={`/account/orders/${order.order_number}`}
                    className="font-mono-tabular text-sm font-bold text-[#111214] hover:text-[#D71920]"
                  >
                    {order.order_number}
                  </Link>
                  <StatusChip status={order.status} />
                  <StatusChip status={order.payment_status} />
                </div>
                <p className="mt-1 text-sm font-semibold tabular-nums">{formatPKR(order.total)}</p>
                <p className="text-xs text-[#6B7078] mt-0.5">
                  {order.fulfillment === 'pickup' ? 'Showroom Pickup' : 'Courier Delivery'} ·{' '}
                  {formatDateTimeKarachi(order.created_at)}
                </p>
              </div>
              <Link to={`/account/orders/${order.order_number}`}>
                <Button size="sm" variant="outline">
                  View Details
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccountOrderDetailPage() {
  const { orderNumber = '' } = useParams();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  usePageMeta({ title: `Order ${orderNumber} | ${settings.brand_name}` });

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-number', orderNumber],
    queryFn: () => getOrderByNumber(orderNumber),
    enabled: Boolean(orderNumber),
  });

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return');
  const [reason, setReason] = useState('Wrong size / fit');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        description="Unable to load this order."
        actionLabel="My Orders"
        actionTo="/account/orders"
      />
    );
  }

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const created = await createReturnRequest({
        order_id: order.id,
        user_id: user.id,
        type: returnType,
        reason,
        details,
        item_ids: (order.items ?? []).map((i) => i.id),
        photo_paths: [],
      });
      toast({
        title: `Return ${created.return_number} submitted`,
        description: 'Our team will review eligibility within 1–2 working days.',
        variant: 'success',
      });
      setReturnOpen(false);
    } catch (err) {
      toast({
        title: 'Return request failed',
        description: err instanceof Error ? err.message : 'Unable to submit request',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E3E4E7] bg-white px-5 py-4">
        <Logo variant="mono-dark" height={30} to={null} />
        <div className="text-right text-xs text-[#6B7078]">
          <p className="font-semibold uppercase tracking-wider text-[#111214]">Showroom Store Invoice</p>
          <p className="tabular-nums">{settings.legal_business_name} · {settings.contact_phone}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono-tabular text-xs text-[#6B7078]">{order.order_number}</p>
          <h1 className="font-display text-3xl font-bold text-[#111214]">Order Details</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={order.status} />
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Invoice
          </Button>
          {order.status === 'delivered' && (
            <Button size="sm" variant="secondary" onClick={() => setReturnOpen(true)}>
              <RotateCcw className="h-4 w-4" />
              Request Return / Exchange
            </Button>
          )}
        </div>
      </div>

      {order.tracking_number && (
        <Card className="p-4 flex items-center justify-between text-sm">
          <span className="text-[#6B7078]">
            Courier: <strong className="text-[#111214]">{order.courier_name || 'Courier'}</strong>
          </span>
          <span className="font-mono-tabular font-semibold">Tracking: {order.tracking_number}</span>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-base font-semibold text-[#111214] mb-3">Items</h2>
        <ul className="divide-y divide-[#E3E4E7] text-sm">
          {(order.items ?? []).map((item) => (
            <li key={item.id} className="py-3 flex justify-between">
              <span>
                {item.name_snapshot} × {item.quantity}
              </span>
              <span className="font-semibold tabular-nums">{formatPKR(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 pt-4 border-t border-[#E3E4E7] space-y-1.5 text-sm tabular-nums">
          <div className="flex justify-between text-[#6B7078]">
            <dt>Subtotal</dt>
            <dd>{formatPKR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-[#6B7078]">
            <dt>Delivery</dt>
            <dd>{formatPKR(order.delivery_charge)}</dd>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-[#1E8E4E]">
              <dt>Discount</dt>
              <dd>−{formatPKR(order.discount_amount)}</dd>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-[#E3E4E7]">
            <dt>Total</dt>
            <dd>{formatPKR(order.total)}</dd>
          </div>
        </dl>
      </Card>

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Request Return or Exchange">
        <form onSubmit={handleReturnSubmit} className="space-y-4">
          <Select
            label="Request Type"
            value={returnType}
            onChange={(e) => setReturnType(e.target.value as 'return' | 'exchange')}
          >
            <option value="return">Return for Refund</option>
            <option value="exchange">Exchange Size / Item</option>
          </Select>
          <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="Wrong size / fit">Wrong size / fit</option>
            <option value="Defective or damaged item">Defective or damaged item</option>
            <option value="Incorrect item received">Incorrect item received</option>
            <option value="Other">Other</option>
          </Select>
          <Textarea
            label="Details"
            rows={3}
            required
            placeholder="Describe item condition and preferred exchange size if applicable..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <p className="text-xs text-[#6B7078]">
            Return window: {settings.return_window_days} days from delivery for unused items.
          </p>
          <Button type="submit" className="w-full" loading={submitting}>
            Submit Return Request
          </Button>
        </form>
      </Modal>
    </div>
  );
}
