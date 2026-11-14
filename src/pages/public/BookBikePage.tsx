import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { getBikeBySlug, getTotalAvailableBikeStock } from '../../services/bikes';
import { createBooking } from '../../services/bookings';
import { listBranches } from '../../services/content';
import { initiateGatewayPayment } from '../../services/payments';
import { uploadFileToBucket } from '../../services/storage';
import type { Booking, BookingPaymentMethod } from '../../types/database';
import {
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  FileUploader,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '../../components/ui/Primitives';
import { TurnstileWidget, isTurnstileConfigured } from '../../components/ui/TurnstileWidget';

const schema = z.object({
  variant_id: z.string().min(1, 'Select a variant'),
  color_id: z.string().min(1, 'Select a color'),
  branch_id: z.string().min(1, 'Select a showroom branch'),
  customer_name: z.string().min(2, 'Full name is required'),
  customer_phone: z.string().min(10, 'Valid phone number is required'),
  customer_email: z.string().email('Valid email is required'),
  payment_method: z.enum(['bank_transfer', 'jazzcash', 'easypaisa']),
  notes: z.string().optional(),
  accept_terms: z.literal(true, {
    message: 'Please accept the booking & refund policy',
  }),
  hp_field: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;

export function BookBikePage() {
  const { bikeSlug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();
  const { user, profile, signIn, signUp } = useAuth();
  const { toast } = useToast();

  usePageMeta({
    title: `Book Motorcycle Token | ${settings.brand_name}`,
    description: 'Reserve your motorcycle with a booking token and complete paperwork at the showroom.',
  });

  const { data: bike, isLoading } = useQuery({
    queryKey: ['bike-detail', bikeSlug],
    queryFn: () => getBikeBySlug(bikeSlug),
    enabled: Boolean(bikeSlug),
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => listBranches() });

  const [proofPath, setProofPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Inline quick auth state when guest reaches booking
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const defaultVariant = searchParams.get('variant') || bike?.variants?.[0]?.id || '';
  const defaultColor = searchParams.get('color') || bike?.colors?.[0]?.id || '';
  const defaultBranch = branches[0]?.id || '';

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      variant_id: defaultVariant,
      color_id: defaultColor,
      branch_id: defaultBranch,
      customer_name: profile?.full_name || '',
      customer_phone: profile?.phone || '',
      customer_email: profile?.email || user?.email || '',
      payment_method: 'bank_transfer',
      notes: '',
      accept_terms: true,
      hp_field: '',
    },
  });

  useEffect(() => {
    reset(
      {
        variant_id: defaultVariant,
        color_id: defaultColor,
        branch_id: defaultBranch,
        customer_name: profile?.full_name || '',
        customer_phone: profile?.phone || '',
        customer_email: profile?.email || user?.email || '',
        payment_method: 'bank_transfer',
        notes: '',
        accept_terms: true,
        hp_field: '',
      },
      { keepDirtyValues: true }
    );
  }, [
    defaultVariant,
    defaultColor,
    defaultBranch,
    profile?.full_name,
    profile?.phone,
    profile?.email,
    user?.email,
    reset,
  ]);

  const selectedVariantId = watch('variant_id');
  const selectedColorId = watch('color_id');
  const selectedBranchId = watch('branch_id');
  const paymentMethod = watch('payment_method');

  const selectedVariant = bike?.variants?.find((v) => v.id === selectedVariantId);
  const comboStock = bike
    ? getTotalAvailableBikeStock(bike, selectedVariantId, selectedColorId, selectedBranchId)
    : 0;

  const handleProofUpload = async (files: File[]) => {
    if (!user || files.length === 0) return;
    setUploading(true);
    try {
      const res = await uploadFileToBucket('payment-proofs', user.id, files[0]);
      setProofPath(res.path);
      toast({ title: 'Payment proof uploaded', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Please try again',
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
        toast({ title: 'Signed in', description: 'Continue with your booking below.', variant: 'success' });
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
            description: 'Check your email to confirm your account before completing booking.',
            variant: 'info',
          });
        } else {
          toast({ title: 'Signed in', description: 'Continue with your booking below.', variant: 'success' });
        }
      }
    } catch (err) {
      toast({
        title: 'Authentication error',
        description: err instanceof Error ? err.message : 'Unable to sign in',
        variant: 'error',
      });
    } finally {
      setAuthBusy(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({ title: 'Please sign in first', variant: 'error' });
      return;
    }
    if (isTurnstileConfigured && !captchaToken) {
      toast({ title: 'Please complete the security check below', variant: 'error' });
      return;
    }
    if (values.payment_method === 'bank_transfer' && !proofPath) {
      toast({
        title: 'Upload transfer receipt',
        description: 'Please upload proof of your token bank transfer.',
        variant: 'error',
      });
      return;
    }

    try {
      let gatewayRef: string | null = null;
      if (values.payment_method === 'jazzcash' || values.payment_method === 'easypaisa') {
        const gw = await initiateGatewayPayment(values.payment_method, {
          payableType: 'booking',
          payableId: values.variant_id,
          amount: settings.booking_token_amount,
          referenceNumber: `BK-${Date.now()}`,
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
        gatewayRef = gw.reference ?? null;
      }

      const created = await createBooking({
        user_id: user.id,
        variant_id: values.variant_id,
        color_id: values.color_id,
        branch_id: values.branch_id,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email,
        payment_method: values.payment_method as BookingPaymentMethod,
        notes: values.notes,
        proof_path: proofPath,
        gateway_reference: gatewayRef,
      });

      setConfirmedBooking(created);
      toast({
        title: 'Booking submitted',
        description: `Booking #${created.booking_number} created.`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Booking failed',
        description: err instanceof Error ? err.message : 'Unable to submit booking',
        variant: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 py-10">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!bike) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 py-12">
        <EmptyState
          title="Motorcycle not found"
          description="Select a bike from the catalog to start a token booking."
          actionLabel="Browse Bikes"
          actionTo="/bikes"
        />
      </div>
    );
  }

  if (confirmedBooking) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#1E8E4E]" />
          <h1 className="mt-4 font-display text-3xl font-bold text-[#111214]">
            Booking Token Submitted
          </h1>
          <p className="mt-2 text-sm text-[#6B7078]">
            Reference Number:{' '}
            <span className="font-mono-tabular font-semibold text-[#111214]">
              {confirmedBooking.booking_number}
            </span>
          </p>
          <p className="mt-3 text-sm text-[#26282C]">
            Our accounts team will verify your token payment ({formatPKR(confirmedBooking.token_amount)}) and confirm your unit hold at the showroom.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to={`/account/bookings/${confirmedBooking.booking_number}`}>
              <Button>Track Booking Progress</Button>
            </Link>
            <Link to="/bikes">
              <Button variant="outline">Back to Showroom</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1140px] px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: bike.name, to: `/bikes/${bike.slug}` },
          { label: 'Token Booking' },
        ]}
      />

      <h1 className="mt-4 font-display text-4xl font-bold text-[#111214]">
        Book {bike.name}
      </h1>
      <p className="mt-1 text-sm text-[#6B7078]">
        Reserve your unit with a token payment; remaining balance and registration are completed in person at the showroom.
      </p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {!user && (
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-[#111214]">
                    {authMode === 'login' ? 'Sign in to reserve your bike' : 'Create a customer account'}
                  </h2>
                  <p className="text-xs text-[#6B7078]">
                    Required so you can track payment verification and registration status.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-xs font-semibold text-[#D71920] hover:underline cursor-pointer"
                >
                  {authMode === 'login' ? 'New customer? Sign up' : 'Have an account? Login'}
                </button>
              </div>
              <form onSubmit={handleInlineAuth} className="space-y-3">
                {authMode === 'signup' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Full Name"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                    <Input
                      label="Phone Number"
                      required
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                  <Input
                    label="Password"
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" loading={authBusy}>
                  {authMode === 'login' ? 'Sign In & Continue' : 'Create Account & Continue'}
                </Button>
                {awaitingEmailConfirm && (
                  <p className="rounded-lg border border-[#B7791F]/30 bg-[#FFF8EB] p-3 text-xs text-[#26282C]">
                    Account created! Please open the verification link sent to your inbox, then sign in above to submit your booking.
                  </p>
                )}
              </form>
            </Card>
          )}

          <Card className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <input type="text" tabIndex={-1} autoComplete="off" className="hidden" {...register('hp_field')} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Variant" {...register('variant_id')} error={errors.variant_id?.message}>
                  {(bike.variants ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({formatPKR(v.ex_showroom_price)})
                    </option>
                  ))}
                </Select>
                <Select label="Color" {...register('color_id')} error={errors.color_id?.message}>
                  {(bike.colors ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <Select label="Showroom Branch" {...register('branch_id')} error={errors.branch_id?.message}>
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>
                    {br.name}
                  </option>
                ))}
              </Select>

              <p className={`text-xs font-medium ${comboStock > 0 ? 'text-[#1E8E4E]' : 'text-[#B7791F]'}`}>
                {comboStock > 0
                  ? `${comboStock} unit(s) currently available at selected branch.`
                  : 'Selected combo is low/out of stock at this branch; staff will confirm allocation timeline.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Customer Name" {...register('customer_name')} error={errors.customer_name?.message} />
                <Input label="Phone Number" placeholder="+92 300 ..." {...register('customer_phone')} error={errors.customer_phone?.message} />
              </div>

              <Input label="Email Address" type="email" {...register('customer_email')} error={errors.customer_email?.message} />

              <div>
                <p className="text-sm font-medium text-[#111214] mb-2">Token Payment Method</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 rounded-lg border border-[#E3E4E7] p-3 text-sm cursor-pointer">
                    <input type="radio" value="bank_transfer" {...register('payment_method')} className="accent-[#D71920]" />
                    <span>Bank Transfer</span>
                  </label>
                  {settings.payment_jazzcash_enabled && (
                    <label className="flex items-center gap-2 rounded-lg border border-[#E3E4E7] p-3 text-sm cursor-pointer">
                      <input type="radio" value="jazzcash" {...register('payment_method')} className="accent-[#D71920]" />
                      <span>JazzCash</span>
                    </label>
                  )}
                  {settings.payment_easypaisa_enabled && (
                    <label className="flex items-center gap-2 rounded-lg border border-[#E3E4E7] p-3 text-sm cursor-pointer">
                      <input type="radio" value="easypaisa" {...register('payment_method')} className="accent-[#D71920]" />
                      <span>Easypaisa</span>
                    </label>
                  )}
                </div>
              </div>

              {paymentMethod === 'bank_transfer' && (
                <div className="rounded-xl border border-[#E3E4E7] bg-[#F5F5F6] p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-[#111214]">Bank Account Details</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#26282C]">
                    <div><span className="text-[#6B7078]">Bank:</span> {settings.bank_details.bank_name}</div>
                    <div><span className="text-[#6B7078]">Title:</span> {settings.bank_details.account_title}</div>
                    <div><span className="text-[#6B7078]">Account:</span> {settings.bank_details.account_number}</div>
                    <div><span className="text-[#6B7078]">IBAN:</span> {settings.bank_details.iban}</div>
                  </dl>
                  {user && (
                    <FileUploader
                      label="Upload Payment Proof (JPG, PNG, WebP, or PDF)"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      maxFiles={1}
                      uploading={uploading}
                      onFilesSelected={handleProofUpload}
                    />
                  )}
                  {proofPath && (
                    <p className="text-xs font-medium text-[#1E8E4E]">
                      Receipt attached: {proofPath}
                    </p>
                  )}
                </div>
              )}

              <Textarea label="Delivery / Handover Notes (Optional)" rows={2} {...register('notes')} />

              <label className="flex items-start gap-2.5 text-xs text-[#26282C] cursor-pointer">
                <input type="checkbox" {...register('accept_terms')} className="mt-0.5 h-4 w-4 accent-[#D71920]" />
                <span>
                  I agree to the showroom booking terms. {settings.token_refund_policy_text}
                </span>
              </label>
              {errors.accept_terms && (
                <p className="text-xs text-[#C0262D]">{errors.accept_terms.message}</p>
              )}

              <TurnstileWidget onToken={setCaptchaToken} />

              <Button type="submit" size="lg" className="w-full" loading={isSubmitting} disabled={!user}>
                Submit Booking Token ({formatPKR(settings.booking_token_amount)})
              </Button>
            </form>
          </Card>
        </div>

        <aside className="lg:col-span-5">
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#111214]">Booking Summary</h2>
            <dl className="space-y-2.5 text-sm border-t border-[#E3E4E7] pt-4 tabular-nums">
              <div className="flex justify-between">
                <dt className="text-[#6B7078]">Model</dt>
                <dd className="font-semibold">{bike.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B7078]">Variant</dt>
                <dd className="font-medium">{selectedVariant?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B7078]">Ex-Showroom Price</dt>
                <dd className="font-medium">{formatPKR(selectedVariant?.ex_showroom_price ?? 0)}</dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E3E4E7]">
                <dt className="font-semibold text-[#111214]">Payable Online Now (Token)</dt>
                <dd className="font-bold text-[#D71920]">{formatPKR(settings.booking_token_amount)}</dd>
              </div>
              <div className="flex justify-between text-xs text-[#6B7078]">
                <dt>Balance at Showroom</dt>
                <dd>
                  {formatPKR(Math.max(0, (selectedVariant?.ex_showroom_price ?? 0) - settings.booking_token_amount))}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-[#6B7078] pt-3 border-t border-[#E3E4E7]">
              Hold duration: {settings.booking_hold_days} days after payment verification.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
