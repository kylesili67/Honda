import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Printer } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { formatDateTimeKarachi, formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { getOrderByNumber } from '../../services/orders';
import { Button, Card, EmptyState, Skeleton, StatusChip } from '../../components/ui/Primitives';
import { Logo } from '../../components/brand/Logo';

export function OrderConfirmationPage() {
  const { orderNumber = '' } = useParams();
  const { settings } = useSettings();

  usePageMeta({
    title: `Order ${orderNumber} | ${settings.brand_name}`,
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-number', orderNumber],
    queryFn: () => getOrderByNumber(orderNumber),
    enabled: Boolean(orderNumber),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          title="Order not found"
          description="We could not locate that order reference."
          actionLabel="View My Orders"
          actionTo="/account/orders"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <Card className="p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E4E7] pb-4">
          <Logo variant="mono-dark" height={30} to={null} />
          <div className="text-right text-xs text-[#6B7078]">
            <p className="font-semibold text-[#111214]">{settings.legal_business_name}</p>
            <p className="tabular-nums">{settings.contact_phone} · {settings.contact_email}</p>
          </div>
        </div>

        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#1E8E4E]" />
          <h1 className="mt-3 font-display text-3xl font-bold text-[#111214]">
            Order Confirmed
          </h1>
          <p className="mt-1 text-sm text-[#6B7078]">
            Order{' '}
            <span className="font-mono-tabular font-semibold text-[#111214]">
              {order.order_number}
            </span>{' '}
            · {formatDateTimeKarachi(order.created_at)}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <StatusChip status={order.status} />
            <StatusChip status={order.payment_status} />
          </div>
        </div>

        <div className="border-t border-[#E3E4E7] pt-4">
          <h2 className="text-sm font-semibold text-[#111214] mb-3">Items Ordered</h2>
          <ul className="divide-y divide-[#E3E4E7] text-sm">
            {(order.items ?? []).map((item) => (
              <li key={item.id} className="py-2 flex justify-between">
                <span>
                  {item.name_snapshot} × {item.quantity}
                </span>
                <span className="font-medium tabular-nums">{formatPKR(item.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-[#E3E4E7] flex justify-between font-bold text-base tabular-nums">
            <span>Total</span>
            <span>{formatPKR(order.total)}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
          <div className="flex gap-2">
            <Link to={`/account/orders/${order.order_number}`}>
              <Button>Track Order</Button>
            </Link>
            <Link to="/accessories">
              <Button variant="secondary">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
