import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, GitCompareArrows, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { formatPKR } from '../../lib/format';
import { listBikes } from '../../services/bikes';
import { Button, Card } from '../ui/Primitives';
import { BikeAngleImage } from './BikeAngleImage';

type BudgetOption = 'under_200k' | '200k_350k' | 'above_350k' | 'any';
type UseCaseOption = 'commute' | 'long_ride' | 'family';
type EngineOption = 'small' | 'mid' | 'performance' | 'any';
type PowertrainOption = 'petrol' | 'electric' | 'any';

export function BikeFinderWizard({ onClose }: { onClose?: () => void }) {
  const { data: bikes = [] } = useQuery({ queryKey: ['bikes-published'], queryFn: () => listBikes() });
  const { compareIds, toggleCompare } = useCart();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState<BudgetOption>('any');
  const [useCase, setUseCase] = useState<UseCaseOption>('commute');
  const [engineSize, setEngineSize] = useState<EngineOption>('any');
  const [powertrain, setPowertrain] = useState<PowertrainOption>('petrol');

  const hasElectricCategory = useMemo(
    () => bikes.some((b) => b.category?.slug === 'electric' || /electric/i.test(b.category?.name || '')),
    [bikes]
  );

  const matchedBikes = useMemo(() => {
    const scored = bikes.map((bike) => {
      const prices = (bike.variants ?? []).map((v) => v.ex_showroom_price);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const isElectric = bike.category?.slug === 'electric' || /electric/i.test(bike.category?.name || '');

      let score = 0;

      // Powertrain filter
      if (powertrain === 'electric' && !isElectric) score -= 10;
      if (powertrain === 'petrol' && isElectric) score -= 10;

      // Budget match
      if (budget === 'under_200k') score += minPrice <= 210000 ? 4 : -2;
      else if (budget === '200k_350k') score += minPrice >= 180000 && minPrice <= 360000 ? 4 : 0;
      else if (budget === 'above_350k') score += minPrice >= 350000 ? 4 : 0;
      else score += 2;

      // Engine size
      if (engineSize === 'small') score += bike.engine_cc <= 100 ? 4 : 0;
      else if (engineSize === 'mid') score += bike.engine_cc >= 101 && bike.engine_cc <= 135 ? 4 : 0;
      else if (engineSize === 'performance') score += bike.engine_cc >= 140 ? 4 : 0;
      else score += 2;

      // Daily use affinity
      if (useCase === 'commute' && bike.engine_cc <= 125) score += 2;
      if (useCase === 'family' && bike.engine_cc <= 125) score += 2;
      if (useCase === 'long_ride' && bike.engine_cc >= 124) score += 3;

      return { bike, minPrice, score };
    });

    const filtered = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score || a.minPrice - b.minPrice);
    if (filtered.length > 0) return filtered.slice(0, 3);
    return scored.sort((a, b) => a.minPrice - b.minPrice).slice(0, 3);
  }, [bikes, budget, useCase, engineSize, powertrain]);

  const resetWizard = () => {
    setStep(0);
    setBudget('any');
    setUseCase('commute');
    setEngineSize('any');
    setPowertrain('petrol');
  };

  const optionButtonClass = (active: boolean) =>
    `flex items-center justify-between rounded-xl border p-4 text-left transition-all cursor-pointer min-h-[56px] ${
      active
        ? 'border-[#D71920] bg-[#D71920]/5 text-[#111214] ring-1 ring-[#D71920]/30'
        : 'border-[#E3E4E7] bg-white text-[#26282C] hover:border-[#111214]/40 hover:bg-[#F5F5F6]/50'
    }`;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx < step
                  ? 'w-7 bg-[#1E8E4E]'
                  : idx === step
                    ? 'w-10 bg-[#D71920]'
                    : 'w-5 bg-[#E3E4E7]'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-[#6B7078] tabular-nums">
          {step < 4 ? `Step ${step + 1} of 4` : 'Recommended Matches'}
        </span>
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-[#111214]">1. What is your target budget (PKR)?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'under_200k' as const, label: 'Under PKR 200,000', sub: 'Economical city commuters' },
              { id: '200k_350k' as const, label: 'PKR 200,000 – 350,000', sub: 'Everyday 125cc street power' },
              { id: 'above_350k' as const, label: 'PKR 350,000+', sub: '150cc touring & alloy editions' },
              { id: 'any' as const, label: 'Show All Budgets', sub: 'Compare across the full lineup' },
            ].map((opt) => (
              <button key={opt.id} type="button" onClick={() => setBudget(opt.id)} className={optionButtonClass(budget === opt.id)}>
                <div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-[#6B7078] mt-0.5">{opt.sub}</p>
                </div>
                {budget === opt.id && <Check className="h-4 w-4 text-[#D71920] shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-[#111214]">2. How will you primarily ride?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'commute' as const, label: 'Daily Commute', sub: 'Fuel economy & traffic agility' },
              { id: 'long_ride' as const, label: 'Highway & Touring', sub: 'Comfort, disc brake & poise' },
              { id: 'family' as const, label: 'Family & Utility', sub: 'Balanced seat & easy upkeep' },
            ].map((opt) => (
              <button key={opt.id} type="button" onClick={() => setUseCase(opt.id)} className={optionButtonClass(useCase === opt.id)}>
                <div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-[#6B7078] mt-0.5">{opt.sub}</p>
                </div>
                {useCase === opt.id && <Check className="h-4 w-4 text-[#D71920] shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-[#111214]">3. Preferred engine capacity?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'small' as const, label: '70cc – 100cc', sub: 'Maximum fuel efficiency' },
              { id: 'mid' as const, label: '110cc – 135cc', sub: 'Punchy acceleration & pickup' },
              { id: 'performance' as const, label: '150cc & Above', sub: 'Counter-balanced & disc brake' },
              { id: 'any' as const, label: 'No Preference', sub: 'Let showroom specs decide' },
            ].map((opt) => (
              <button key={opt.id} type="button" onClick={() => setEngineSize(opt.id)} className={optionButtonClass(engineSize === opt.id)}>
                <div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-[#6B7078] mt-0.5">{opt.sub}</p>
                </div>
                {engineSize === opt.id && <Check className="h-4 w-4 text-[#D71920] shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-[#111214]">4. Petrol or Electric preference?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'petrol' as const, label: 'Petrol Engine', sub: 'Proven 4-stroke nationwide service' },
              {
                id: 'electric' as const,
                label: hasElectricCategory ? 'Electric (EV)' : 'Electric (Coming Soon)',
                sub: hasElectricCategory ? 'Zero-emission city commuting' : 'Currently previewing petrol models',
              },
              { id: 'any' as const, label: 'Either / Open', sub: 'Show best overall match' },
            ].map((opt) => (
              <button key={opt.id} type="button" onClick={() => setPowertrain(opt.id)} className={optionButtonClass(powertrain === opt.id)}>
                <div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-[#6B7078] mt-0.5">{opt.sub}</p>
                </div>
                {powertrain === opt.id && <Check className="h-4 w-4 text-[#D71920] shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-[#111214]">Your Recommended Showroom Lineup</h3>
            <button
              type="button"
              onClick={resetWizard}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D71920] hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retake Finder
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {matchedBikes.map(({ bike, minPrice }) => {
              const inCompare = compareIds.includes(bike.id);
              return (
                <Card key={bike.id} className="group overflow-hidden flex flex-col">
                  <Link to={`/bikes/${bike.slug}`} onClick={onClose} className="block">
                    <BikeAngleImage images={bike.images} alt={bike.name} aspectRatio="4/3" />
                  </Link>
                  <div className="p-4 flex-1 flex flex-col">
                    <span className="text-xs text-[#6B7078]">
                      {bike.category?.name} · {bike.engine_cc} cc
                    </span>
                    <h4 className="mt-1 text-base font-bold text-[#111214]">{bike.name}</h4>
                    <p className="mt-1 text-sm font-semibold text-[#D71920] tabular-nums">
                      From {formatPKR(minPrice)}
                    </p>
                    <div className="mt-4 pt-3 border-t border-[#E3E4E7] flex items-center gap-2">
                      <Link to={`/bikes/${bike.slug}`} onClick={onClose} className="flex-1">
                        <Button size="sm" className="w-full">
                          Explore
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant={inCompare ? 'secondary' : 'outline'}
                        onClick={() => {
                          const res = toggleCompare(bike.id);
                          if (res.message) toast({ title: res.message });
                        }}
                        aria-label={`Compare ${bike.name}`}
                      >
                        <GitCompareArrows className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      {step < 4 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#E3E4E7]">
          <Button type="button" variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="button" size="sm" onClick={() => setStep((s) => Math.min(4, s + 1))}>
            {step === 3 ? 'See Matches' : 'Next Step'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
