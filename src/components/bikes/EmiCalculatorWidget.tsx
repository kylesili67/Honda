import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSettings } from '../../context/SettingsContext';
import { calculateEMI } from '../../lib/emi';
import { formatPKR } from '../../lib/format';
import { listBikes, listEmiPlans } from '../../services/bikes';
import { Button, Card, Select } from '../ui/Primitives';

export function EmiCalculatorWidget({
  initialVariantId,
  compact = false,
}: {
  initialVariantId?: string;
  compact?: boolean;
}) {
  const { settings } = useSettings();
  const { data: bikes = [] } = useQuery({ queryKey: ['bikes-published'], queryFn: () => listBikes() });
  const { data: plans = [] } = useQuery({ queryKey: ['emi-plans'], queryFn: listEmiPlans });

  const allVariants = useMemo(
    () =>
      bikes.flatMap((b) =>
        (b.variants ?? [])
          .filter((v) => v.is_active)
          .map((v) => ({ ...v, modelName: b.name, modelSlug: b.slug }))
      ),
    [bikes]
  );

  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId || '');
  const activeVariant =
    allVariants.find((v) => v.id === (selectedVariantId || initialVariantId)) ?? allVariants[0];

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const activePlan = plans.find((p) => p.id === selectedPlanId) ?? plans[0];

  const minDownPct = activePlan?.min_down_payment_percent ?? 25;
  const minDownAmount = activeVariant
    ? Math.round((activeVariant.ex_showroom_price * minDownPct) / 100)
    : 0;

  const [downPayment, setDownPayment] = useState<number | null>(null);
  const effectiveDown =
    downPayment !== null
      ? Math.max(minDownAmount, Math.min(activeVariant?.ex_showroom_price ?? 0, downPayment))
      : minDownAmount;

  const result = activeVariant
    ? calculateEMI(
        activeVariant.ex_showroom_price,
        effectiveDown,
        activePlan?.tenure_months ?? 12,
        activePlan?.markup_rate_percent_per_year ?? 14
      )
    : null;

  return (
    <Card className={compact ? 'p-5' : 'p-6 sm:p-8'}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-5">
          <Select
            label="Select Bike & Variant"
            value={activeVariant?.id ?? ''}
            onChange={(e) => {
              setSelectedVariantId(e.target.value);
              setDownPayment(null);
            }}
          >
            {allVariants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.modelName} — {v.name} ({formatPKR(v.ex_showroom_price)})
              </option>
            ))}
          </Select>

          <div>
            <label className="block text-sm font-medium text-[#111214] mb-2">
              Tenure Plan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {plans.map((plan) => {
                const isSelected = activePlan?.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`rounded-lg border px-3.5 py-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#D71920] bg-[#D71920]/5 text-[#111214]'
                        : 'border-[#E3E4E7] bg-white text-[#26282C] hover:bg-[#F5F5F6]'
                    }`}
                  >
                    <p className="text-sm font-semibold tabular-nums">{plan.tenure_months} Months</p>
                    <p className="text-xs text-[#6B7078] tabular-nums mt-0.5">
                      Min {plan.min_down_payment_percent}% down · {plan.markup_rate_percent_per_year}%/yr
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {activeVariant && (
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <label htmlFor="down-payment-range" className="font-medium text-[#111214]">
                  Down Payment ({result?.downPaymentPercent ?? minDownPct}%)
                </label>
                <span className="font-semibold text-[#111214] tabular-nums">
                  {formatPKR(effectiveDown)}
                </span>
              </div>
              <input
                id="down-payment-range"
                type="range"
                min={minDownAmount}
                max={Math.round(activeVariant.ex_showroom_price * 0.8)}
                step={1000}
                value={effectiveDown}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full accent-[#D71920] cursor-pointer"
              />
              <div className="mt-1 flex justify-between text-xs text-[#6B7078] tabular-nums">
                <span>Min: {formatPKR(minDownAmount)}</span>
                <span>80%: {formatPKR(Math.round(activeVariant.ex_showroom_price * 0.8))}</span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-xl bg-[#111214] text-white p-6 flex flex-col justify-between">
          {result && activeVariant ? (
            <>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/60">
                  Estimated Monthly Installment
                </p>
                <p className="mt-2 font-display text-4xl font-bold tabular-nums text-white">
                  {formatPKR(result.monthlyInstallment)}
                  <span className="text-base font-normal text-white/60"> / mo</span>
                </p>

                <dl className="mt-6 space-y-2.5 border-t border-white/15 pt-4 text-sm tabular-nums">
                  <div className="flex justify-between">
                    <dt className="text-white/70">Ex-Showroom Price</dt>
                    <dd className="font-medium">{formatPKR(result.vehiclePrice)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-white/70">Down Payment</dt>
                    <dd className="font-medium">{formatPKR(result.downPayment)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-white/70">Financed Principal</dt>
                    <dd className="font-medium">{formatPKR(result.financedAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-white/70">Est. Total Markup ({result.markupRatePercentPerYear}%/yr)</dt>
                    <dd className="font-medium">{formatPKR(result.totalMarkup)}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 pt-4 border-t border-white/15 space-y-3">
                <p className="text-xs text-white/65 leading-relaxed">
                  {settings.emi_disclaimer_text}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link to={`/book/${activeVariant.modelSlug}`}>
                    <Button size="sm" className="w-full">
                      Book Now
                    </Button>
                  </Link>
                  <Link to={`/inquiry?bike=${activeVariant.modelSlug}`}>
                    <Button
                      size="sm"
                      variant="outline-dark"
                      className="w-full"
                    >
                      Inquire
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-white/70">Select a bike model to estimate installments.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
