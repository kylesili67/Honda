import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { todayKarachiISO } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { listBikes } from '../../services/bikes';
import { listBranches } from '../../services/content';
import { createServiceAppointment } from '../../services/service';
import { checkSlotAvailability } from '../../services/testRides';
import type { ServiceAppointment, ServiceType } from '../../types/database';
import { Breadcrumb, Button, Card, Input, Select, Textarea } from '../../components/ui/Primitives';

const schema = z.object({
  branch_id: z.string().min(1, 'Select branch'),
  service_date: z.string().min(1, 'Select date'),
  slot_id: z.string().min(1, 'Select a workshop time slot'),
  model_name: z.string().min(2, 'Enter your bike model'),
  registration_number: z.string().min(3, 'Registration number is required'),
  service_type: z.enum(['free_service', 'regular_service', 'repair', 'warranty_claim', 'other']),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ServiceBookingPage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();

  usePageMeta({
    title: `Book Workshop Service | ${settings.brand_name}`,
    description: 'Schedule motorcycle maintenance, oil change, free service checkup, or warranty repair.',
  });

  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => listBranches() });
  const { data: bikes = [] } = useQuery({ queryKey: ['bikes-published'], queryFn: () => listBikes() });
  const [booked, setBooked] = useState<ServiceAppointment | null>(null);

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
      branch_id: branches[0]?.id || '',
      service_date: todayKarachiISO(),
      slot_id: '',
      model_name: bikes[0]?.name || 'City Commuter 70',
      registration_number: '',
      service_type: 'regular_service',
      description: '',
    },
  });

  useEffect(() => {
    reset(
      {
        branch_id: branches[0]?.id || '',
        service_date: todayKarachiISO(),
        slot_id: '',
        model_name: bikes[0]?.name || 'City Commuter 70',
        registration_number: '',
        service_type: 'regular_service',
        description: '',
      },
      { keepDirtyValues: true }
    );
  }, [branches, bikes, reset]);

  const branchId = watch('branch_id');
  const serviceDate = watch('service_date');
  const selectedSlotId = watch('slot_id');

  const { data: slots = [] } = useQuery({
    queryKey: ['slots', 'service', branchId, serviceDate],
    queryFn: () => checkSlotAvailability(branchId, 'service', serviceDate),
    enabled: Boolean(branchId && serviceDate),
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({ title: 'Please sign in to book service', variant: 'error' });
      return;
    }
    try {
      const res = await createServiceAppointment({
        user_id: user.id,
        branch_id: values.branch_id,
        slot_id: values.slot_id,
        service_date: values.service_date,
        model_name: values.model_name,
        registration_number: values.registration_number,
        service_type: values.service_type as ServiceType,
        description: values.description || null,
      });
      setBooked(res);
      toast({ title: 'Service appointment booked', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Booking failed',
        description: err instanceof Error ? err.message : 'Unable to book slot',
        variant: 'error',
      });
    }
  };

  if (booked) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#1E8E4E]" />
          <h1 className="mt-4 font-display text-3xl font-bold text-[#111214]">
            Service Slot Requested
          </h1>
          <p className="mt-2 text-sm text-[#6B7078]">
            Service Number:{' '}
            <span className="font-mono-tabular font-semibold text-[#111214]">
              {booked.service_number}
            </span>
          </p>
          <p className="mt-3 text-sm text-[#26282C]">
            Registration: {booked.registration_number} · {booked.model_name}
          </p>
          <div className="mt-6">
            <Link to="/account/service">
              <Button>View My Service History</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Book Service' }]} />
      <h1 className="mt-4 font-display text-4xl font-bold text-[#111214]">
        Book Workshop Service
      </h1>
      <p className="mt-1 text-sm text-[#6B7078]">
        Reserve a dedicated service bay and keep a digital maintenance log.
      </p>

      {!user ? (
        <Card className="mt-8 p-8 text-center space-y-4">
          <h2 className="text-lg font-semibold text-[#111214]">Customer Login Required</h2>
          <p className="text-sm text-[#6B7078]">
            Sign in so your service appointment and technician history link directly to your account.
          </p>
          <Link to="/login?redirect=/service-booking" className="inline-block">
            <Button>Sign In to Book Service</Button>
          </Link>
        </Card>
      ) : (
        <Card className="mt-8 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Workshop Branch" {...register('branch_id')} error={errors.branch_id?.message}>
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>
                    {br.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Service Date"
                type="date"
                min={todayKarachiISO()}
                {...register('service_date')}
                error={errors.service_date?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111214] mb-2">
                Available Service Bay Slots
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
                      onClick={() => setValue('slot_id', slot.id, { shouldDirty: true, shouldValidate: true })}
                      className={`rounded-lg border px-3 py-2.5 text-left text-sm cursor-pointer disabled:opacity-45 ${
                        active
                          ? 'border-[#D71920] bg-[#D71920]/5 font-semibold text-[#111214]'
                          : 'border-[#E3E4E7] bg-white hover:bg-[#F5F5F6]'
                      }`}
                    >
                      <p className="tabular-nums">
                        {slot.start_time} – {slot.end_time}
                      </p>
                      <p className="text-xs text-[#6B7078] tabular-nums">
                        {full ? 'Fully booked' : `${slot.remaining} bay(s) left`}
                      </p>
                    </button>
                  );
                })}
              </div>
              {errors.slot_id && <p className="mt-1 text-xs text-[#C0262D]">{errors.slot_id.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Motorcycle Model" {...register('model_name')} error={errors.model_name?.message} />
              <Input
                label="Registration Number"
                placeholder="e.g. RIH-4812"
                {...register('registration_number')}
                error={errors.registration_number?.message}
              />
              <Select label="Service Type" {...register('service_type')}>
                <option value="free_service">Free Scheduled Checkup</option>
                <option value="regular_service">Regular Maintenance / Oil</option>
                <option value="repair">Mechanical Repair</option>
                <option value="warranty_claim">Warranty Claim</option>
                <option value="other">Other</option>
              </Select>
            </div>

            <Textarea
              label="Notes / Symptoms (Optional)"
              rows={3}
              placeholder="e.g. Brake adjustment, 5,000 km tune-up..."
              {...register('description')}
            />

            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Confirm Service Appointment
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
