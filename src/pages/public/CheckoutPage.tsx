import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { trackEvent } from '../../lib/analytics';
import { formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { listCustomerAddresses } from '../../services/admin';
import { listBranches } from '../../services/content';
import { createOrder, listDeliveryZones, validateCoupon } from '../../services/orders';
import { initiateGatewayPayment } from '../../services/payments';
import { uploadFileToBucket } from '../../services/storage';
import type { Coupon, PaymentMethod } from '../../types/database';
import {
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  FileUploader,
  Input,
  Select,
  Textarea,
} from '../../components/ui/Primitives';
import { TurnstileWidget, isTurnstileConfigured } from '../../components/ui/TurnstileWidget';

const schema = z
  .object({
    fulfillment: z.enum(['delivery', 'pickup']),
    pickup_branch_id: z.string().optional(),
    shipping_name: z.string().min(2, 'Recipient name required'),
    shipping_phone: z.string().min(10, 'Phone number required'),
    shipping_city: z.string().optional(),
    shipping_address: z.string().optional(),
    delivery_zone_id: z.string().optional(),
    payment_method: z.enum(['cod', 'bank_transfer', 'jazzcash', 'easypaisa']),
    notes: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.fulfillment === 'delivery') {
      if (!val.shipping_city || val.shipping_city.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shipping_city'],
          message: 'City is required for delivery',
        });
      }
      if (!val.shipping_address || val.shipping_address.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shipping_address'],
          message: 'Street address is required for delivery',
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

export function CheckoutPage() {
  const { settings } = useSettings();
  const { user, profile, signIn, signUp, refreshProfile } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  usePageMeta({
    title: `Store Checkout | ${settings.brand_name}`,
    description: 'Complete your accessory store order with courier delivery or showroom pickup.',
  });

  const { data: zones = [] } = useQuery({ queryKey: ['delivery-zones'], queryFn: listDeliveryZones });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => listBranches() });
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['customer-addresses', user?.id],
    queryFn: () => listCustomerAddresses(user!.id),
    enabled: Boolean(user?.id),
  });
  const defaultAddress = savedAddresses.find((a) => a.is_default) ?? savedAddresses[0];

  const [couponCode, setCouponCode] = useState(params.get('coupon') || '');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Inline auth for guests
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fulfillment: 'delivery',
      pickup_branch_id: branches[0]?.id || '',
      shipping_name: defaultAddress?.full_name || profile?.full_name || '',
      shipping_phone: defaultAddress?.phone || profile?.phone || '',
      shipping_city: defaultAddress?.city || 'Islamabad',
      shipping_address: defaultAddress?.address_line || '',
      delivery_zone_id: zones[0]?.id || '',
      payment_method: 'cod',
      notes: '',
    },
  });

  useEffect(() => {
    reset(
      {
        fulfillment: 'delivery',
        pickup_branch_id: branches[0]?.id || '',
        shipping_name: defaultAddress?.full_name || profile?.full_name || '',
        shipping_phone: defaultAddress?.phone || profile?.phone || '',
        shipping_city: defaultAddress?.city || 'Islamabad',
        shipping_address: defaultAddress?.address_line || '',
        delivery_zone_id: zones[0]?.id || '',
        payment_method: 'cod',
        notes: '',
      },
      { keepDirtyValues: true }
    );
  }, [
    branches,
    zones,
    defaultAddress,
    profile?.full_name,
    profile?.phone,
    reset,
  ]);

  const couponAutoTriedRef = useRef(false);
  useEffect(() => {
    const urlCoupon = params.get('coupon')?.trim();
    if (!urlCoupon || couponAutoTriedRef.current || appliedCoupon || subtotal <= 0) return;
    couponAutoTriedRef.current = true;
    void validateCoupon(urlCoupon, subtotal)
      .then((cp) => {
        setAppliedCoupon(cp);
        toast({ title: `Coupon ${cp.code} applied`, variant: 'success' });
      })
      .catch(() => {
        // Leave couponCode in the input so user can edit or inspect error manually
      });
  }, [params, appliedCoupon, subtotal, toast]);

  const fulfillment = watch('fulfillment');
  const zoneId = watch('delivery_zone_id');
  const paymentMethod = watch('payment_method');

  const selectedZone = zones.find((z) => z.id === zoneId) ?? zones[0];
  const deliveryCharge = useMemo(() => {
    if (fulfillment === 'pickup' || !selectedZone) return 0;
    if (selectedZone.free_above && subtotal >= selectedZone.free_above) return 0;
    return selectedZone.charge;
  }, [fulfillment, selectedZone, subtotal]);

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const raw =
      appliedCoupon.discount_type === 'percent'
        ? Math.round((subtotal * appliedCoupon.discount_value) / 100)
        : appliedCoupon.discount_value;
    return Math.min(subtotal, raw);
  }, [appliedCoupon, subtotal]);

  const maxRedeemablePoints = profile?.loyalty_balance ?? 0;
  const loyaltyDiscount = pointsToUse * settings.loyalty_point_value_pkr;
  const total = Math.max(0, subtotal + deliveryCharge - couponDiscount - loyaltyDiscount);
  const codAllowed = total <= settings.cod_max_amount;

  const handleCoupon = async () => {
    try {
      const cp = await validateCoupon(couponCode, subtotal);
      setAppliedCoupon(cp);
      toast({ title: `Coupon ${cp.code} applied`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Invalid coupon',
        description: err instanceof Error ? err.message : 'Check coupon code',
        variant: 'error',
      });
    }
  };

  const handleProof = async (files: File[]) => {
    if (!user || files.length === 0) return;
    setUploading(true);
    try {
      const res = await uploadFileToBucket('payment-proofs', user.id, files[0]);
      setProofPath(res.path);
      toast({ title: 'Payment proof attached', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Invalid file',
        variant: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAwaitingEmailConfirm(false);
    try {
      if (authMode === 'login') {
        await signIn(authEmail, authPassword);
        toast({ title: 'Signed in', variant: 'success' });
      } else {
        const res = await signUp({
          email: authEmail,
          password: authPassword,
          fullName: authName,
          phone: authPhone,
        });
        if (res.needsEmailConfirmation) {
          setAwaitingEmailConfirm(true);
          toast({
            title: 'Confirm your email',
            description: 'Check your email to confirm your account before completing checkout.',
            variant: 'info',
          });
        } else {
          toast({ title: 'Signed in', variant: 'success' });
        }
      }
    } catch (err) {
      toast({
        title: 'Auth failed',
        description: err instanceof Error ? err.message : 'Try again',
        variant: 'error',
      });
    } finally {
      setAuthBusy(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({ title: 'Please sign in to place order', variant: 'error' });
      return;
    }
    if (isTurnstileConfigured && !captchaToken) {
      toast({ title: 'Please complete the security check below', variant: 'error' });
      return;
    }
    if (values.payment_method === 'cod' && !codAllowed) {
      toast({
        title: 'COD limit exceeded',
        description: `COD is available up to ${formatPKR(settings.cod_max_amount)}.`,
        variant: 'error',
      });
      return;
    }
    if (values.payment_method === 'bank_transfer' && !proofPath) {
      toast({ title: 'Upload bank transfer proof first', variant: 'error' });
      return;
    }

    try {
      if (values.payment_method === 'jazzcash' || values.payment_method === 'easypaisa') {
        const gw = await initiateGatewayPayment(values.payment_method, {
          payableType: 'order',
          payableId: `ord-${Date.now()}`,
          amount: total,
          referenceNumber: `OD-${Date.now()}`,
        });
        if (!gw.redirectUrl && !gw.formAction) {
          toast({
            title: 'Online payment unavailable',
            description:
              gw.message || 'Online payment is not available yet, please use bank transfer or COD.',
            variant: 'error',
          });
          return;
        }
      }

      const order = await createOrder({
        user_id: user.id,
        customer_email: user.email,
        items: items.map((i) => ({
          variant_id: i.variantId,
          name_snapshot: `${i.name} (${i.variantLabel})`,
          sku_snapshot: i.sku,
          unit_price: i.unitPrice,
          quantity: i.quantity,
        })),
        fulfillment: values.fulfillment,
        pickup_branch_id: values.fulfillment === 'pickup' ? values.pickup_branch_id : null,
        shipping_name: values.shipping_name,
        shipping_phone: values.shipping_phone,
        shipping_address: values.fulfillment === 'delivery' ? values.shipping_address : null,
        shipping_city: values.fulfillment === 'delivery' ? values.shipping_city : null,
        delivery_zone_id: values.fulfillment === 'delivery' ? values.delivery_zone_id : null,
        delivery_charge: deliveryCharge,
        coupon_id: appliedCoupon?.id ?? null,
        discount_amount: couponDiscount,
        loyalty_points_used: pointsToUse,
        loyalty_discount: loyaltyDiscount,
        payment_method: values.payment_method as PaymentMethod,
        proof_path: proofPath,
        notes: values.notes || null,
      });

      clearCart();
      await refreshProfile();
      trackEvent('purchase', { order_number: order.order_number, total: order.total });
      navigate(`/order-confirmation/${order.order_number}`);
    } catch (err) {
      toast({
        title: 'Checkout failed',
        description: err instanceof Error ? err.message : 'Unable to place order',
        variant: 'error',
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 py-12">
        <EmptyState
          title="Your cart is empty"
          description="Add helmets, riding gear, or spare parts before checking out."
          actionLabel="Shop Accessories"
          actionTo="/accessories"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1140px] px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />
      <h1 className="mt-4 font-display text-4xl font-bold text-[#111214]">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {!user && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[#111214]">
                  {authMode === 'login' ? 'Sign in to checkout' : 'Create account to checkout'}
                </h2>
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-xs font-semibold text-[#D71920] hover:underline cursor-pointer"
                >
                  {authMode === 'login' ? 'New customer? Sign up' : 'Already registered? Login'}
                </button>
              </div>
              <form onSubmit={handleInlineAuth} className="space-y-3">
                {authMode === 'signup' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label="Full Name" required value={authName} onChange={(e) => setAuthName(e.target.value)} />
                    <Input label="Phone" required value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Email" type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
                  <Input label="Password" type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
                </div>
                <Button type="submit" loading={authBusy}>
                  {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                </Button>
                {awaitingEmailConfirm && (
                  <p className="rounded-lg border border-[#B7791F]/30 bg-[#FFF8EB] p-3 text-xs text-[#26282C]">
                    Account created! Please check your email and confirm your account, then sign in above to place your order.
                  </p>
                )}
              </form>
            </Card>
          )}

          <Card className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <p className="text-sm font-medium text-[#111214] mb-2">Fulfillment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 rounded-lg border border-[#E3E4E7] p-3 text-sm cursor-pointer">
                    <input type="radio" value="delivery" {...register('fulfillment')} className="accent-[#D71920]" />
                    <span>Courier Delivery</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-[#E3E4E7] p-3 text-sm cursor-pointer">
                    <input type="radio" value="pickup" {...register('fulfillment')} className="accent-[#D71920]" />
                    <span>Showroom Pickup (Free)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Recipient Name" {...register('shipping_name')} error={errors.shipping_name?.message} />
                <Input label="Phone Number" {...register('shipping_phone')} error={errors.shipping_phone?.message} />
              </div>

              {fulfillment === 'delivery' ? (
                <>
                  {savedAddresses.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[#6B7078] mb-1.5">Saved Addresses</p>
                      <div className="flex flex-wrap gap-2">
                        {savedAddresses.map((addr) => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => {
                              setValue('shipping_name', addr.full_name, { shouldDirty: true, shouldValidate: true });
                              setValue('shipping_phone', addr.phone, { shouldDirty: true, shouldValidate: true });
                              setValue('shipping_city', addr.city, { shouldDirty: true, shouldValidate: true });
                              setValue('shipping_address', addr.address_line, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                            className="rounded-lg border border-[#E3E4E7] bg-[#F5F5F6] px-3 py-1.5 text-xs font-medium text-[#111214] hover:border-[#D71920] cursor-pointer"
                          >
                            {addr.label} · {addr.city}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select label="Delivery Zone" {...register('delivery_zone_id')}>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} ({formatPKR(z.charge)})
                        </option>
                      ))}
                    </Select>
                    <Input label="City" {...register('shipping_city')} error={errors.shipping_city?.message} />
                  </div>
                  <Textarea
                    label="Street Address"
                    rows={2}
                    {...register('shipping_address')}
                    error={errors.shipping_address?.message}
                  />
                </>
              ) : (
                <Select label="Pickup Showroom Branch" {...register('pickup_branch_id')}>
                  {branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name}
                    </option>
                  ))}
                </Select>
              )}

              <div>
                <p className="text-sm font-medium text-[#111214] mb-2">Payment Method</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-center justify-between rounded-lg border border-[#E3E4E7] p-3 text-sm cursor-pointer ${
                      !codAllowed ? 'opacity-50' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input type="radio" value="cod" disabled={!codAllowed} {...register('payment_method')} className="accent-[#D71920]" />
                      Cash on Delivery (COD)
                    </span>
                    <span className="text-xs text-[#6B7078]">Max {formatPKR(settings.cod_max_amount)}</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-[#E3E4E7] p-3 text-sm cursor-pointer">
                    <input type="radio" value="bank_transfer" {...register('payment_method')} className="accent-[#D71920]" />
                    Bank Transfer
                  </label>

                  {settings.payment_jazzcash_enabled && (
                    <label className="flex items-center gap-2 rounded-lg border border-[#E3E4E7] p-3 text-sm cursor-pointer">
                      <input type="radio" value="jazzcash" {...register('payment_method')} className="accent-[#D71920]" />
                      JazzCash
                    </label>
                  )}

                  {settings.payment_easypaisa_enabled && (
                    <label className="flex items-center gap-2 rounded-lg border border-[#E3E4E7] p-3 text-sm cursor-pointer">
                      <input type="radio" value="easypaisa" {...register('payment_method')} className="accent-[#D71920]" />
                      Easypaisa
                    </label>
                  )}
                </div>
              </div>

              {paymentMethod === 'bank_transfer' && (
                <div className="rounded-xl border border-[#E3E4E7] bg-[#F5F5F6] p-4 space-y-3">
                  <p className="text-xs text-[#26282C]">
                    Transfer <strong>{formatPKR(total)}</strong> to {settings.bank_details.bank_name} ({settings.bank_details.account_number}) and upload your receipt.
                  </p>
                  {user && (
                    <FileUploader
                      label="Upload Transfer Receipt"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      maxFiles={1}
                      uploading={uploading}
                      onFilesSelected={handleProof}
                    />
                  )}
                  {proofPath && <p className="text-xs font-medium text-[#1E8E4E]">Attached: {proofPath}</p>}
                </div>
              )}

              <Textarea label="Order Notes (Optional)" rows={2} {...register('notes')} />

              <TurnstileWidget onToken={setCaptchaToken} />

              <Button type="submit" size="lg" className="w-full" loading={isSubmitting} disabled={!user}>
                Place Order ({formatPKR(total)})
              </Button>
            </form>
          </Card>
        </div>

        <aside className="lg:col-span-5">
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#111214]">Order Summary</h2>
            <ul className="divide-y divide-[#E3E4E7] text-sm">
              {items.map((item) => (
                <li key={item.variantId} className="py-2.5 flex justify-between gap-3">
                  <span className="text-[#26282C]">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatPKR(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={() => void handleCoupon()}>
                Apply
              </Button>
            </div>

            {maxRedeemablePoints > 0 && (
              <div className="pt-2">
                <label className="block text-xs font-medium text-[#111214] mb-1">
                  Redeem Loyalty Points (Available: {maxRedeemablePoints} pts = {formatPKR(maxRedeemablePoints * settings.loyalty_point_value_pkr)})
                </label>
                <Input
                  type="number"
                  min={0}
                  max={maxRedeemablePoints}
                  value={pointsToUse}
                  onChange={(e) =>
                    setPointsToUse(
                      Math.min(maxRedeemablePoints, Math.max(0, Number(e.target.value) || 0))
                    )
                  }
                />
              </div>
            )}

            <dl className="space-y-2 text-sm border-t border-[#E3E4E7] pt-4 tabular-nums">
              <div className="flex justify-between">
                <dt className="text-[#6B7078]">Subtotal</dt>
                <dd>{formatPKR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B7078]">Delivery</dt>
                <dd>{deliveryCharge === 0 ? 'Free' : formatPKR(deliveryCharge)}</dd>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-[#1E8E4E]">
                  <dt>Coupon ({appliedCoupon?.code})</dt>
                  <dd>−{formatPKR(couponDiscount)}</dd>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-[#1E8E4E]">
                  <dt>Loyalty Points</dt>
                  <dd>−{formatPKR(loyaltyDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#E3E4E7] text-base font-bold">
                <dt>Total</dt>
                <dd>{formatPKR(total)}</dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
