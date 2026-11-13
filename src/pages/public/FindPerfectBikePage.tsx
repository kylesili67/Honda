import { Link } from 'react-router-dom';
import { BikeFinderWizard } from '../../components/bikes/BikeFinderWizard';
import { Breadcrumb, Button, Card } from '../../components/ui/Primitives';
import { useSettings } from '../../context/SettingsContext';
import { usePageMeta } from '../../lib/seo';

export function FindPerfectBikePage() {
  const { settings } = useSettings();

  usePageMeta({
    title: `Find Your Perfect Bike | ${settings.brand_name}`,
    description: 'Answer 4 quick questions on budget, riding style, and engine size to discover your ideal motorcycle.',
  });

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Find Your Perfect Bike' }]} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-[#111214]">Find Your Perfect Bike</h1>
          <p className="mt-1 text-sm text-[#6B7078]">
            Answer four quick questions to match your daily ride and budget with our showroom lineup.
          </p>
        </div>
        <Link to="/bikes">
          <Button variant="outline" size="sm">
            Browse Full Catalog
          </Button>
        </Link>
      </div>

      <Card className="p-6 sm:p-8">
        <BikeFinderWizard />
      </Card>
    </div>
  );
}
