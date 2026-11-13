import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { validateCoupon } from '../../services/orders';
import { Breadcrumb, Button, Card, EmptyState, Input, SafeImage } from '../../components/ui/Primitives';

export function CartPage() {
  const { settings } = useSettings();
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  usePageMeta({
    title: `Shopping Cart | ${settings.brand_name}`,
    description: 'Review your helmets, riding gear, and parts before checkout.',
  });

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState('');

  const handleApplyCoupon = async () => {
    try {
      const cp = await validateCoupon(couponCode, subtotal);
      const disc =
        cp.discount_type === 'percent'
          ? Math.round((subtotal * cp.discount_value) / 100)
          : cp.discount_value;
      setCouponDiscount(Math.min(subtotal, disc));
      setAppliedCode(cp.code);
      toast({ title: `Coupon ${cp.code} applied`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Coupon invalid',
        description: err instanceof Error ? err.message : 'Unable to apply coupon',
        variant: 'error',
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1140px] px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
      <h1 className="mt-4 font-display text-4xl font-bold text-[#111214]">Your Cart</h1>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Your accessory cart is empty"
            description="Browse helmets, riding gear, and spare parts in our store."
            actionLabel="Shop Accessories"
            actionTo="/accessories"
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => (
              <Card key={item.variantId} className="p-4 flex items-center gap-4">
                <SafeImage
                  src={item.imageUrl}
                  alt={item.name}
                  aspectClass="aspect-square"
                  className="h-20 w-20 rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/accessories/${item.accessorySlug}`}
                    className="text-sm font-semibold text-[#111214] hover:text-[#D71920] line-clamp-1"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-[#6B7078] mt-0.5">
                    {item.variantLabel} · SKU {item.sku}
                  </p>
                  <p className="text-sm font-semibold text-[#111214] mt-1 tabular-nums">
                    {formatPKR(item.unitPrice)}
                  </p>
                </div>

                <div className="flex items-center rounded-lg border border-[#E3E4E7]">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="h-9 w-8 text-sm font-semibold hover:bg-[#F5F5F6] cursor-pointer"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-xs font-semibold tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="h-9 w-8 text-sm font-semibold hover:bg-[#F5F5F6] cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  aria-label="Remove item"
                  className="p-2 text-[#6B7078] hover:text-[#C0262D] cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            ))}
          </div>

          <aside className="lg:col-span-4">
            <Card className="p-6 space-y-4">
              <h2 className="text-base font-semibold text-[#111214]">Order Summary</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="Coupon (try GEAR10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <Button variant="outline" onClick={() => void handleApplyCoupon()}>
                  Apply
                </Button>
              </div>
              <dl className="space-y-2 text-sm border-t border-[#E3E4E7] pt-4 tabular-nums">
                <div className="flex justify-between">
                  <dt className="text-[#6B7078]">Subtotal</dt>
                  <dd className="font-medium">{formatPKR(subtotal)}</dd>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-[#1E8E4E]">
                    <dt>Discount ({appliedCode})</dt>
                    <dd>−{formatPKR(couponDiscount)}</dd>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[#E3E4E7] font-bold text-base">
                  <dt>Estimated Total</dt>
                  <dd>{formatPKR(Math.max(0, subtotal - couponDiscount))}</dd>
                </div>
              </dl>
              <Button
                size="lg"
                className="w-full"
                onClick={() =>
                  navigate(`/checkout${appliedCode ? `?coupon=${encodeURIComponent(appliedCode)}` : ''}`)
                }
              >
                Proceed to Checkout
              </Button>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
