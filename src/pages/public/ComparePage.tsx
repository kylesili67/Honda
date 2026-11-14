import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Plus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { listBikes } from '../../services/bikes';
import { saveComparison } from '../../services/wishlist';
import {
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  Select,
} from '../../components/ui/Primitives';
import { BikeAngleImage } from '../../components/bikes/BikeAngleImage';

export function ComparePage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const { compareIds, toggleCompare, clearCompare } = useCart();
  const { toast } = useToast();

  usePageMeta({
    title: `Compare Motorcycles | ${settings.brand_name}`,
    description: 'Compare up to 3 motorcycle models side-by-side on price, engine displacement, mileage, brakes, and weight.',
  });

  const { data: bikes = [] } = useQuery({ queryKey: ['bikes-published'], queryFn: () => listBikes() });
  const [highlightDiffs, setHighlightDiffs] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedBikes = bikes.filter((b) => compareIds.includes(b.id));
  const availableToAdd = bikes.filter((b) => !compareIds.includes(b.id));

  const handleSaveComparison = async () => {
    if (!user) {
      toast({ title: 'Log in required', description: 'Sign in to save this comparison to your account.' });
      return;
    }
    if (selectedBikes.length < 2) return;
    setSaving(true);
    try {
      await saveComparison(
        user.id,
        selectedBikes.map((b) => b.name).join(' vs '),
        selectedBikes.map((b) => b.id)
      );
      toast({ title: 'Comparison saved to your account', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unable to save comparison',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const specRows: Array<{ label: string; getValue: (b: (typeof bikes)[number]) => string }> = [
    {
      label: 'Starting Price',
      getValue: (b) => {
        const prices = (b.variants ?? []).map((v) => v.ex_showroom_price);
        return prices.length > 0 ? formatPKR(Math.min(...prices)) : '—';
      },
    },
    { label: 'Category', getValue: (b) => b.category?.name ?? '—' },
    { label: 'Displacement', getValue: (b) => `${b.engine_cc} cc` },
    { label: 'Max Power', getValue: (b) => b.variants?.[0]?.max_power ?? '—' },
    { label: 'Max Torque', getValue: (b) => b.variants?.[0]?.max_torque ?? '—' },
    {
      label: 'Mileage (Est.)',
      getValue: (b) => (b.variants?.[0]?.mileage_kmpl ? `${b.variants[0].mileage_kmpl} km/l` : '—'),
    },
    { label: 'Transmission', getValue: (b) => b.variants?.[0]?.transmission ?? '—' },
    { label: 'Starting', getValue: (b) => b.variants?.[0]?.starting ?? '—' },
    { label: 'Front Brake', getValue: (b) => b.variants?.[0]?.front_brake ?? '—' },
    { label: 'Rear Brake', getValue: (b) => b.variants?.[0]?.rear_brake ?? '—' },
    {
      label: 'Fuel Tank',
      getValue: (b) => (b.variants?.[0]?.fuel_tank_l ? `${b.variants[0].fuel_tank_l} L` : '—'),
    },
    {
      label: 'Kerb Weight',
      getValue: (b) => (b.variants?.[0]?.kerb_weight_kg ? `${b.variants[0].kerb_weight_kg} kg` : '—'),
    },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Compare Motorcycles' }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#E3E4E7]">
        <div>
          <h1 className="font-display text-4xl font-bold text-[#111214]">Compare Motorcycles</h1>
          <p className="mt-1 text-sm text-[#6B7078]">Side-by-side specifications for up to 3 bikes.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-[#111214] cursor-pointer">
            <input
              type="checkbox"
              checked={highlightDiffs}
              onChange={(e) => setHighlightDiffs(e.target.checked)}
              className="h-4 w-4 accent-[#D71920]"
            />
            Highlight differences
          </label>
          {selectedBikes.length >= 2 && (
            <Button size="sm" variant="outline" loading={saving} onClick={() => void handleSaveComparison()}>
              <Bookmark className="h-4 w-4" />
              Save Comparison
            </Button>
          )}
          {selectedBikes.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearCompare}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {selectedBikes.length < 3 && availableToAdd.length > 0 && (
        <div className="mt-6 flex items-end gap-3 max-w-sm">
          <Select
            label="Add bike to comparison"
            value=""
            onChange={(e) => {
              if (e.target.value) toggleCompare(e.target.value);
            }}
          >
            <option value="">Choose a motorcycle...</option>
            {availableToAdd.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.engine_cc} cc)
              </option>
            ))}
          </Select>
          <Plus className="h-5 w-5 text-[#6B7078] mb-3 shrink-0" />
        </div>
      )}

      {selectedBikes.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No motorcycles selected to compare"
            description="Select 2 or 3 bikes using the selector above or from the motorcycle catalog."
            actionLabel="Browse Motorcycles"
            actionTo="/bikes"
          />
        </div>
      ) : (
        <Card className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#E3E4E7] bg-[#F5F5F6]/50">
                <th className="w-48 p-4 text-left font-semibold text-[#6B7078]">Specification</th>
                {selectedBikes.map((bike) => (
                  <th key={bike.id} className="p-4 text-left align-top">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => toggleCompare(bike.id)}
                        aria-label={`Remove ${bike.name}`}
                        className="absolute top-1.5 left-1.5 z-30 rounded-md bg-white/90 p-1 text-[#6B7078] hover:text-[#111214] border border-[#E3E4E7] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <Link to={`/bikes/${bike.slug}`} className="group block rounded-lg overflow-hidden">
                        <BikeAngleImage
                          images={bike.images}
                          alt={bike.name}
                          aspectRatio="4/3"
                          className="rounded-lg"
                        />
                      </Link>
                      <Link
                        to={`/bikes/${bike.slug}`}
                        className="mt-3 block font-bold text-base text-[#111214] hover:text-[#D71920]"
                      >
                        {bike.name}
                      </Link>
                      <Link to={`/book/${bike.slug}`} className="mt-2 inline-block">
                        <Button size="sm">Book Token</Button>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E4E7]">
              {specRows.map((row) => {
                const values = selectedBikes.map(row.getValue);
                const allSame = values.every((v) => v === values[0]);
                const highlight = highlightDiffs && selectedBikes.length > 1 && !allSame;
                return (
                  <tr key={row.label} className={highlight ? 'bg-[#D71920]/[0.04]' : ''}>
                    <th className="p-4 text-left font-medium text-[#6B7078]">{row.label}</th>
                    {values.map((val, i) => (
                      <td key={selectedBikes[i].id} className="p-4 font-medium text-[#111214] tabular-nums">
                        {val}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
