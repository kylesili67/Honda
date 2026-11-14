import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { usePageMeta } from '../../lib/seo';
import { listBikes } from '../../services/bikes';
import { uploadFileToBucket } from '../../services/storage';
import { createTradeInRequest } from '../../services/tradeIns';
import { Breadcrumb, Button, Card, FileUploader, Input, Select } from '../../components/ui/Primitives';
import { TurnstileWidget, isTurnstileConfigured } from '../../components/ui/TurnstileWidget';

const schema = z.object({
  name: z.string().min(2, 'Full name required'),
  phone: z.string().min(10, 'Phone number required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  current_make: z.string().min(2, 'Current bike make required'),
  current_model: z.string().min(1, 'Current bike model required'),
  year: z.number({ message: 'Valid year required' }).min(1985).max(2027),
  mileage_km: z.number({ message: 'Valid mileage required' }).min(0),
  condition: z.string().min(2),
  registration_city: z.string().min(2, 'Registration city required'),
  expected_price: z.number({ message: 'Enter expected valuation in PKR' }).min(1000, 'Enter expected valuation in PKR'),
  interested_model_id: z.string().optional(),
  hp_field: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;

export function TradeInPage() {
  const { settings } = useSettings();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  usePageMeta({
    title: `Old Bike Trade-In Valuation | ${settings.brand_name}`,
    description: 'Submit your current motorcycle details and up to 5 photos for a showroom trade-in valuation.',
  });

  const { data: bikes = [] } = useQuery({ queryKey: ['bikes-published'], queryFn: () => listBikes() });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const guestFolderRef = useRef(`guest/${crypto.randomUUID()}`);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile?.full_name || '',
      phone: profile?.phone || '',
      email: profile?.email || user?.email || '',
      current_make: '',
      current_model: '',
      year: 2022,
      mileage_km: 15000,
      condition: 'Good — well maintained',
      registration_city: 'Islamabad',
      expected_price: 120000,
      interested_model_id: bikes[0]?.id || '',
      hp_field: '',
    },
  });

  useEffect(() => {
    reset(
      {
        name: profile?.full_name || '',
        phone: profile?.phone || '',
        email: profile?.email || user?.email || '',
        current_make: '',
        current_model: '',
        year: 2022,
        mileage_km: 15000,
        condition: 'Good — well maintained',
        registration_city: 'Islamabad',
        expected_price: 120000,
        interested_model_id: bikes[0]?.id || '',
        hp_field: '',
      },
      { keepDirtyValues: true }
    );
  }, [profile?.full_name, profile?.phone, profile?.email, user?.email, bikes, reset]);

  const handlePhotos = async (files: File[]) => {
    const remaining = Math.max(0, 5 - photos.length);
    if (remaining === 0) return;
    setUploading(true);
    try {
      const folder = user?.id || guestFolderRef.current;
      const uploaded: string[] = [];
      for (const file of files.slice(0, remaining)) {
        const res = await uploadFileToBucket('trade-in-photos', folder, file);
        uploaded.push(res.path);
      }
      setPhotos((prev) => [...prev, ...uploaded]);
      toast({ title: `${uploaded.length} photo(s) uploaded`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Photo upload failed',
        description: err instanceof Error ? err.message : 'Check file size/type',
        variant: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (isTurnstileConfigured && !captchaToken) {
      toast({ title: 'Please complete the security check below', variant: 'error' });
      return;
    }
    try {
      await createTradeInRequest({
        user_id: user?.id ?? null,
        name: values.name,
        phone: values.phone,
        email: values.email || null,
        current_make: values.current_make,
        current_model: values.current_model,
        year: values.year,
        mileage_km: values.mileage_km,
        condition: values.condition,
        registration_city: values.registration_city,
        expected_price: values.expected_price,
        photo_paths: photos,
        interested_model_id: values.interested_model_id || null,
      });
      setDone(true);
      toast({ title: 'Trade-in request submitted', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Please check your fields',
        variant: 'error',
      });
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#1E8E4E]" />
          <h1 className="mt-4 font-display text-3xl font-bold text-[#111214]">
            Trade-In Request Submitted
          </h1>
          <p className="mt-2 text-sm text-[#6B7078]">
            Our showroom appraiser will review your motorcycle details and respond with an estimated trade-in value.
          </p>
          <Link to="/bikes" className="mt-6 inline-block">
            <Button>Browse New Motorcycles</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Trade-In' }]} />
      <h1 className="mt-4 font-display text-4xl font-bold text-[#111214]">Old Bike Trade-In</h1>
      <p className="mt-1 text-sm text-[#6B7078]">
        Exchange your existing motorcycle toward a new showroom model.
      </p>

      <Card className="mt-8 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <input type="text" tabIndex={-1} autoComplete="off" className="hidden" {...register('hp_field')} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Current Make" placeholder="e.g. Honda" {...register('current_make')} error={errors.current_make?.message} />
            <Input label="Current Model" placeholder="e.g. CD 70" {...register('current_model')} error={errors.current_model?.message} />
            <Input label="Model Year" type="number" {...register('year', { valueAsNumber: true })} error={errors.year?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Mileage (km)" type="number" {...register('mileage_km', { valueAsNumber: true })} error={errors.mileage_km?.message} />
            <Input label="Registration City" {...register('registration_city')} error={errors.registration_city?.message} />
            <Input label="Expected Value (PKR)" type="number" {...register('expected_price', { valueAsNumber: true })} error={errors.expected_price?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Overall Condition" {...register('condition')}>
              <option value="Excellent — like new">Excellent — like new</option>
              <option value="Good — well maintained">Good — well maintained</option>
              <option value="Fair — minor wear">Fair — minor wear</option>
              <option value="Needs mechanical work">Needs mechanical work</option>
            </Select>
            <Select label="Interested New Model" {...register('interested_model_id')}>
              <option value="">Undecided</option>
              {bikes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>

          <FileUploader
            label={`Bike Photos (${photos.length}/5 uploaded)`}
            multiple
            maxFiles={5 - photos.length}
            uploading={uploading}
            onFilesSelected={handlePhotos}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E3E4E7]">
            <Input label="Your Name" {...register('name')} error={errors.name?.message} />
            <Input label="Phone Number" {...register('phone')} error={errors.phone?.message} />
            <Input label="Email (Optional)" type="email" {...register('email')} error={errors.email?.message} />
          </div>

          <TurnstileWidget onToken={setCaptchaToken} />

          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Submit for Valuation
          </Button>
        </form>
      </Card>
    </div>
  );
}
