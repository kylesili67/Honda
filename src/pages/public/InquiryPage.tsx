import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { trackEvent } from '../../lib/analytics';
import { usePageMeta } from '../../lib/seo';
import { listBikes } from '../../services/bikes';
import { createInquiry } from '../../services/inquiries';
import { Breadcrumb, Button, Card, Input, Select, Textarea } from '../../components/ui/Primitives';
import { TurnstileWidget, isTurnstileConfigured } from '../../components/ui/TurnstileWidget';

const schema = z.object({
  model_id: z.string().optional(),
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Phone number is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  preferred_contact_time: z.string().optional(),
  message: z.string().min(5, 'Please write your question or inquiry'),
  hp_field: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;

export function InquiryPage() {
  const { settings } = useSettings();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const bikeSlug = params.get('bike');

  usePageMeta({
    title: `Sales Inquiry | ${settings.brand_name}`,
    description: 'Ask our showroom sales team about pricing, availability, colors, or installment options.',
  });

  const { data: bikes = [] } = useQuery({ queryKey: ['bikes-published'], queryFn: () => listBikes() });
  const preselectedId = bikes.find((b) => b.slug === bikeSlug)?.id || '';
  const [done, setDone] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      model_id: preselectedId,
      name: profile?.full_name || '',
      phone: profile?.phone || '',
      email: profile?.email || user?.email || '',
      preferred_contact_time: 'Morning (10 AM – 1 PM)',
      message: '',
      hp_field: '',
    },
  });

  useEffect(() => {
    reset(
      {
        model_id: preselectedId,
        name: profile?.full_name || '',
        phone: profile?.phone || '',
        email: profile?.email || user?.email || '',
        preferred_contact_time: 'Morning (10 AM – 1 PM)',
        message: '',
        hp_field: '',
      },
      { keepDirtyValues: true }
    );
  }, [preselectedId, profile?.full_name, profile?.phone, profile?.email, user?.email, reset]);

  const onSubmit = async (values: FormValues) => {
    if (isTurnstileConfigured && !captchaToken) {
      toast({ title: 'Please complete the security check below', variant: 'error' });
      return;
    }
    const lastSubmit = Number(sessionStorage.getItem('last_inquiry_ts') || '0');
    if (Date.now() - lastSubmit < 15_000) {
      toast({ title: 'Please wait a moment before sending another inquiry', variant: 'error' });
      return;
    }

    try {
      await createInquiry({
        user_id: user?.id ?? null,
        model_id: values.model_id || null,
        name: values.name,
        phone: values.phone,
        email: values.email || null,
        preferred_contact_time: values.preferred_contact_time || null,
        message: values.message,
        source: bikeSlug ? 'bike_detail' : 'inquiry_page',
      });
      sessionStorage.setItem('last_inquiry_ts', String(Date.now()));
      trackEvent('inquiry_submit', { model_id: values.model_id || null });
      setDone(true);
      toast({ title: 'Inquiry sent', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Failed to submit inquiry',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      });
    }
  };

  if (done) {
    const whatsappUrl = `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`;
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#1E8E4E]" />
          <h1 className="mt-4 font-display text-3xl font-bold text-[#111214]">Inquiry Received</h1>
          <p className="mt-2 text-sm text-[#6B7078]">
            A showroom specialist will contact you during your preferred time window.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                <MessageCircle className="h-4 w-4" />
                Chat on WhatsApp Now
              </Button>
            </a>
            <Link to="/bikes">
              <Button variant="outline">Browse Motorcycles</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Sales Inquiry' }]} />
      <h1 className="mt-4 font-display text-4xl font-bold text-[#111214]">Submit an Inquiry</h1>
      <p className="mt-1 text-sm text-[#6B7078]">
        Request current branch availability, color options, or corporate fleet pricing.
      </p>

      <Card className="mt-8 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="text" tabIndex={-1} autoComplete="off" className="hidden" {...register('hp_field')} />

          <Select label="Motorcycle (Optional)" {...register('model_id')}>
            <option value="">General Showroom Inquiry</option>
            {bikes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" {...register('name')} error={errors.name?.message} />
            <Input label="Phone Number" {...register('phone')} error={errors.phone?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email (Optional)" type="email" {...register('email')} error={errors.email?.message} />
            <Select label="Preferred Contact Time" {...register('preferred_contact_time')}>
              <option value="Morning (10 AM – 1 PM)">Morning (10 AM – 1 PM)</option>
              <option value="Afternoon (2 PM – 5 PM)">Afternoon (2 PM – 5 PM)</option>
              <option value="Evening (5 PM – 7:30 PM)">Evening (5 PM – 7:30 PM)</option>
            </Select>
          </div>

          <Textarea label="Your Message" rows={4} {...register('message')} error={errors.message?.message} />

          <TurnstileWidget onToken={setCaptchaToken} />

          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Send Inquiry
          </Button>
        </form>
      </Card>
    </div>
  );
}
