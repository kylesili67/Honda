import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { trackEvent } from '../../lib/analytics';
import { todayKarachiISO } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { listBikes } from '../../services/bikes';
import { listBranches } from '../../services/content';
import { checkSlotAvailability, createTestRide } from '../../services/testRides';
import type { TestRide } from '../../types/database';
import { Breadcrumb, Button, Card, Input, Select } from '../../components/ui/Primitives';

const schema = z.object({
  model_id: z.string().min(1, 'Select a motorcycle'),
  branch_id: z.string().min(1, 'Select a branch'),
  ride_date: z.string().min(1, 'Select a date'),
  slot_id: z.string().min(1, 'Select an available time slot'),
  customer_name: z.string().min(2, 'Full name is required'),
  customer_phone: z.string().min(10, 'Phone number is required'),
  customer_email: z.string().email('Valid email is required'),
  hp_field: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;

export function TestRidePage() {
  const { settings } = useSettings();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const bikeSlugParam = params.get('bike');

  usePageMeta({
    title: `Book a Test Ride | ${settings.brand_name}`,
    description: 'Schedule a showroom test ride slot at your preferred branch.',
  });

  const { data: bikes = [] } = useQuery({ queryKey: ['bikes-published'], queryFn: () => listBikes() });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => listBranches() });

  const initialBikeId =
    bikes.find((b) => b.slug === bikeSlugParam)?.id || bikes[0]?.id || '';

  const [submitted, setSubmitted] = useState<TestRide | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      model_id: initialBikeId,
      branch_id: branches[0]?.id || '',
      ride_date: todayKarachiISO(),
      slot_id: '',
      customer_name: profile?.full_name || '',
      customer_phone: profile?.phone || '',
      customer_email: profile?.email || user?.email || '',
      hp_field: '',
    },
  });

  const branchId = watch('branch_id');
  const rideDate = watch('ride_date');
  const selectedSlotId = watch('slot_id');

  const { data: slots = [] } = useQuery({
    queryKey: ['slots', 'test_ride', branchId, rideDate],
    queryFn: () => checkSlotAvailability(branchId, 'test_ride', rideDate),
    enabled: Boolean(branchId && rideDate),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await createTestRide({
        user_id: user?.id ?? null,
        model_id: values.model_id,
        branch_id: values.branch_id,
        ride_date: values.ride_date,
        slot_id: values.slot_id,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email,
      });
      trackEvent('test_ride_submit', { model_id: values.model_id });
      setSubmitted(res);
      toast({ title: 'Test ride requested', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not schedule test ride',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      });
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#1E8E4E]" />
          <h1 className="mt-4 font-display text-3xl font-bold text-[#111214]">
            Test Ride Requested
          </h1>
          <p className="mt-2 text-sm text-[#6B7078]">
            Reference:{' '}
            <span className="font-mono-tabular font-semibold text-[#111214]">
              {submitted.test_ride_number}
            </span>
          </p>
          <p className="mt-3 text-sm text-[#26282C]">
            Please bring a valid motorcycle driving license to the showroom 10 minutes before your slot.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to={user ? '/account/test-rides' : '/bikes'}>
              <Button>{user ? 'View My Test Rides' : 'Back to Motorcycles'}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Book Test Ride' }]} />
      <h1 className="mt-4 font-display text-4xl font-bold text-[#111214]">Schedule a Test Ride</h1>
      <p className="mt-1 text-sm text-[#6B7078]">
        Pick a model, showroom branch, and live available time slot.
      </p>

      <Card className="mt-8 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <input type="text" tabIndex={-1} autoComplete="off" className="hidden" {...register('hp_field')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Motorcycle Model" {...register('model_id')} error={errors.model_id?.message}>
              {bikes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.engine_cc} cc)
                </option>
              ))}
            </Select>
            <Select label="Showroom Branch" {...register('branch_id')} error={errors.branch_id?.message}>
              {branches.map((br) => (
                <option key={br.id} value={br.id}>
                  {br.name}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Preferred Date"
            type="date"
            min={todayKarachiISO()}
            {...register('ride_date')}
            error={errors.ride_date?.message}
          />

          <div>
            <label className="block text-sm font-medium text-[#111214] mb-2">
              Available Time Slots
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {slots.map((slot) => {
                const full = slot.remaining <= 0;
                const active = selectedSlotId === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={full}
                    onClick={() => setValue('slot_id', slot.id, { shouldValidate: true })}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      active
                        ? 'border-[#D71920] bg-[#D71920]/5 font-semibold text-[#111214]'
                        : 'border-[#E3E4E7] bg-white hover:bg-[#F5F5F6]'
                    }`}
                  >
                    <p className="tabular-nums">
                      {slot.start_time} – {slot.end_time}
                    </p>
                    <p className="text-xs text-[#6B7078] tabular-nums">
                      {full ? 'Fully booked' : `${slot.remaining} slot(s) left`}
                    </p>
                  </button>
                );
              })}
            </div>
            {errors.slot_id && <p className="mt-1 text-xs text-[#C0262D]">{errors.slot_id.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Your Name" {...register('customer_name')} error={errors.customer_name?.message} />
            <Input label="Phone Number" {...register('customer_phone')} error={errors.customer_phone?.message} />
          </div>
          <Input label="Email Address" type="email" {...register('customer_email')} error={errors.customer_email?.message} />

          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Request Test Ride
          </Button>
        </form>
      </Card>
    </div>
  );
}
