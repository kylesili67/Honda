import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { usePageMeta } from '../../lib/seo';
import { EmiCalculatorWidget } from '../../components/bikes/EmiCalculatorWidget';
import { Breadcrumb } from '../../components/ui/Primitives';

export function EmiCalculatorPage() {
  const { settings } = useSettings();
  const [params] = useSearchParams();
  const variantId = params.get('variant') || undefined;

  usePageMeta({
    title: `EMI Installment Calculator | ${settings.brand_name}`,
    description: 'Estimate your monthly motorcycle installment in PKR by selecting model variant, down payment, and tenure plan.',
  });

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'EMI Calculator' }]} />
      <div className="mt-4 mb-8">
        <h1 className="font-display text-4xl font-bold text-[#111214]">
          Motorcycle EMI Calculator
        </h1>
        <p className="mt-1 text-sm text-[#6B7078]">
          Estimate monthly installments in PKR based on showroom price, down payment, and tenure.
        </p>
      </div>
      <EmiCalculatorWidget initialVariantId={variantId} />
    </div>
  );
}
