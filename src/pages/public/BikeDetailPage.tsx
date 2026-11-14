import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, GitCompareArrows, Heart, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { trackEvent } from '../../lib/analytics';
import { formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { getBikeBySlug, getTotalAvailableBikeStock, listBikes } from '../../services/bikes';
import { listMyWishlist, toggleWishlistItem } from '../../services/wishlist';
import { BikeCard } from '../../components/bikes/BikeCard';
import { EmiCalculatorWidget } from '../../components/bikes/EmiCalculatorWidget';
import {
  Accordion,
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  PriceTag,
  SafeImage,
  Skeleton,
} from '../../components/ui/Primitives';

export function BikeDetailPage() {
  const { slug = '' } = useParams();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { compareIds, toggleCompare } = useCart();
  const { toast } = useToast();

  const { data: bike, isLoading, isError, refetch } = useQuery({
    queryKey: ['bike-detail', slug],
    queryFn: () => getBikeBySlug(slug),
    enabled: Boolean(slug),
  });

  const { data: allBikes = [] } = useQuery({ queryKey: ['bikes-published'], queryFn: () => listBikes() });
  const { data: wishlist = [], refetch: refetchWishlist } = useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: () => (user ? listMyWishlist(user.id) : Promise.resolve([])),
    enabled: Boolean(user),
  });

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedColorId, setSelectedColorId] = useState<string>('');
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  useEffect(() => {
    setSelectedVariantId('');
    setSelectedColorId('');
    setSelectedImageIdx(0);
  }, [slug]);

  const activeVariant = useMemo(() => {
    if (!bike?.variants?.length) return undefined;
    return bike.variants.find((v) => v.id === selectedVariantId) ?? bike.variants[0];
  }, [bike, selectedVariantId]);

  const activeColor = useMemo(() => {
    if (!bike?.colors?.length) return undefined;
    return bike.colors.find((c) => c.id === selectedColorId) ?? bike.colors[0];
  }, [bike, selectedColorId]);

  const colorImages = useMemo(() => {
    if (!bike?.images?.length) return [];
    const matched = activeColor
      ? bike.images.filter((i) => i.color_id === activeColor.id || !i.color_id)
      : bike.images;
    const pool = matched.length > 0 ? matched : bike.images;
    const order: Record<string, number> = { front: 0, right: 1, back: 2, left: 3 };
    return pool.slice().sort((a, b) => {
      const ra = a.view_angle ? (order[a.view_angle] ?? 4) : 4;
      const rb = b.view_angle ? (order[b.view_angle] ?? 4) : 4;
      return ra !== rb ? ra - rb : a.sort_order - b.sort_order;
    });
  }, [bike, activeColor]);

  const currentImg = colorImages[selectedImageIdx] ?? colorImages[0];

  const availableComboStock = bike
    ? getTotalAvailableBikeStock(bike, activeVariant?.id, activeColor?.id)
    : 0;

  usePageMeta({
    title: bike?.seo_title || (bike ? `${bike.name} | ${settings.brand_name}` : `Motorcycle | ${settings.brand_name}`),
    description: bike?.seo_description || bike?.tagline || undefined,
    image: bike?.images?.find((i) => i.is_primary)?.url ?? bike?.images?.[0]?.url ?? null,
    jsonLd:
      bike && activeVariant
        ? {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: `${bike.name} - ${activeVariant.name}`,
            description: bike.description || bike.tagline || bike.name,
            sku: activeVariant.sku,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'PKR',
              price: activeVariant.ex_showroom_price,
              availability:
                availableComboStock > 0
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
            },
          }
        : null,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 space-y-6">
        <Skeleton className="h-6 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-7 h-[420px]" />
          <Skeleton className="lg:col-span-5 h-[420px]" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-12">
        <EmptyState
          title="Could not load bike details"
          description="Please retry loading this motorcycle page."
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      </div>
    );
  }

  if (!bike) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-12">
        <EmptyState
          title="Motorcycle not found"
          description="This bike may have been archived or moved."
          actionLabel="Back to Catalog"
          actionTo="/bikes"
        />
      </div>
    );
  }

  const isWishlisted = wishlist.some((w) => w.model_id === bike.id);
  const inCompare = compareIds.includes(bike.id);
  const relatedBikes = allBikes.filter((b) => b.id !== bike.id).slice(0, 3);

  const handleWishlist = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Log in to save bikes to your wishlist.' });
      return;
    }
    try {
      const added = await toggleWishlistItem(user.id, { model_id: bike.id });
      void refetchWishlist();
      toast({ title: added ? 'Saved to wishlist' : 'Removed from wishlist', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Wishlist update failed',
        description: err instanceof Error ? err.message : 'Unable to update wishlist',
        variant: 'error',
      });
    }
  };

  const specRows: Array<{ label: string; value: string | number | null | undefined }> = activeVariant
    ? [
        { label: 'Engine Type', value: activeVariant.engine_type },
        { label: 'Displacement', value: activeVariant.displacement_cc ? `${activeVariant.displacement_cc} cc` : null },
        { label: 'Max Power', value: activeVariant.max_power },
        { label: 'Max Torque', value: activeVariant.max_torque },
        { label: 'Mileage (Est.)', value: activeVariant.mileage_kmpl ? `${activeVariant.mileage_kmpl} km/l` : null },
        { label: 'Transmission', value: activeVariant.transmission },
        { label: 'Starting System', value: activeVariant.starting },
        { label: 'Fuel Tank Capacity', value: activeVariant.fuel_tank_l ? `${activeVariant.fuel_tank_l} L` : null },
        { label: 'Kerb Weight', value: activeVariant.kerb_weight_kg ? `${activeVariant.kerb_weight_kg} kg` : null },
        { label: 'Seat Height', value: activeVariant.seat_height_mm ? `${activeVariant.seat_height_mm} mm` : null },
        { label: 'Ground Clearance', value: activeVariant.ground_clearance_mm ? `${activeVariant.ground_clearance_mm} mm` : null },
        { label: 'Front Brake', value: activeVariant.front_brake },
        { label: 'Rear Brake', value: activeVariant.rear_brake },
        { label: 'Front Tyre', value: activeVariant.front_tyre },
        { label: 'Rear Tyre', value: activeVariant.rear_tyre },
        ...(activeVariant.specs ?? []),
      ].filter((r) => Boolean(r.value))
    : [];

  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-[#111214] text-white border-b border-[#26282C]">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-white/70">
            <Breadcrumb
              items={[
                { label: 'Home', to: '/' },
                { label: 'Motorcycles', to: '/bikes' },
                { label: bike.name },
              ]}
            />
          </div>

          <div className="mt-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#D71920]">
                {bike.category?.name ?? 'Motorcycle'} · {bike.engine_cc} cc
                {activeVariant?.sku ? ` · SKU ${activeVariant.sku}` : ''}
              </p>
              <h1 className="mt-1 font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight">
                {bike.name}
              </h1>
              {bike.tagline && <p className="mt-2 max-w-xl text-sm text-white/75">{bike.tagline}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="block text-xs uppercase tracking-wider text-white/60">
                  Ex-Showroom Price
                </span>
                <p className="font-display text-3xl font-bold text-white tabular-nums">
                  {formatPKR(activeVariant?.ex_showroom_price ?? 0)}
                </p>
              </div>
              {bike.colors && bike.colors.length > 0 && (
                <div className="flex items-center gap-2">
                  {bike.colors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={`Color ${c.name}`}
                      onClick={() => {
                        setSelectedColorId(c.id);
                        setSelectedImageIdx(0);
                      }}
                      className={`h-7 w-7 rounded-full border-2 cursor-pointer transition-transform ${
                        c.id === activeColor?.id ? 'border-white scale-110' : 'border-white/30'
                      }`}
                      style={{ backgroundColor: c.hex_code }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Action Bar */}
      <div className="sticky top-14 z-30 border-b border-[#E3E4E7] bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-[#6B7078]">
            <a href="#highlights" className="hover:text-[#111214]">Highlights</a>
            <a href="#specifications" className="hover:text-[#111214]">Specifications</a>
            <a href="#features" className="hover:text-[#111214]">Features</a>
            <a href="#emi" className="hover:text-[#111214]">EMI</a>
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <a href="#emi">
              <Button size="sm" variant="ghost">EMI</Button>
            </a>
            <Link to={`/inquiry?bike=${bike.slug}`}>
              <Button size="sm" variant="outline">Inquire</Button>
            </Link>
            <Link to={`/test-ride?bike=${bike.slug}`}>
              <Button size="sm" variant="secondary">Test Ride</Button>
            </Link>
            <Link
              to={`/book/${bike.slug}?variant=${activeVariant?.id ?? ''}&color=${activeColor?.id ?? ''}`}
              onClick={() => trackEvent('book_click', { slug: bike.slug, source: 'sticky_bar' })}
            >
              <Button size="sm">Book Now</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Gallery + Sticky Purchase Card */}
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Gallery */}
          <div id="gallery" className="lg:col-span-7 space-y-4">
            <div className="overflow-hidden rounded-xl border border-[#E3E4E7] bg-[#F5F5F6]">
              <SafeImage
                src={currentImg?.url}
                alt={currentImg?.alt_text || bike.name}
                aspectClass="aspect-[16/10]"
                className="w-full aspect-[16/10]"
              />
            </div>
            {colorImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {colorImages.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImageIdx(i)}
                    className={`relative w-24 shrink-0 overflow-hidden rounded-lg border cursor-pointer ${
                      i === selectedImageIdx ? 'border-[#D71920] ring-2 ring-[#D71920]/30' : 'border-[#E3E4E7]'
                    }`}
                  >
                    <SafeImage src={img.url} alt={img.alt_text} aspectClass="aspect-[4/3]" className="w-full aspect-[4/3]" />
                    {img.view_angle && (
                      <span className="absolute bottom-1 left-1 rounded bg-[#111214]/75 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                        {img.view_angle}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Booking Summary Module */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <Card className="p-6 space-y-5">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <span className="block text-xs text-[#6B7078]">Ex-Showroom Price</span>
                  <PriceTag amount={activeVariant?.ex_showroom_price ?? 0} size="lg" />
                </div>
                <span
                  className={`text-xs font-semibold ${
                    availableComboStock > 0 ? 'text-[#1E8E4E]' : 'text-[#C0262D]'
                  }`}
                >
                  {availableComboStock > 0
                    ? `Available (${availableComboStock} in stock)`
                    : 'Out of stock — Inquire'}
                </span>
              </div>

              {/* Variant selector */}
              {bike.variants && bike.variants.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7078] mb-2">
                    Select Variant
                  </p>
                  <div className="space-y-2">
                    {bike.variants.map((variant) => {
                      const selected = variant.id === activeVariant?.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={`w-full min-h-[44px] flex items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                            selected
                              ? 'border-[#D71920] bg-[#D71920]/5 font-semibold text-[#111214]'
                              : 'border-[#E3E4E7] bg-white text-[#26282C] hover:bg-[#F5F5F6]'
                          }`}
                        >
                          <span>{variant.name}</span>
                          <span className="tabular-nums">{formatPKR(variant.ex_showroom_price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color selector */}
              {bike.colors && bike.colors.length > 0 && (
                <div id="colors">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7078] mb-2">
                    Color: <span className="text-[#111214]">{activeColor?.name}</span>
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {bike.colors.map((color) => {
                      const selected = color.id === activeColor?.id;
                      return (
                        <button
                          key={color.id}
                          type="button"
                          aria-label={`Select color ${color.name}`}
                          onClick={() => {
                            setSelectedColorId(color.id);
                            setSelectedImageIdx(0);
                          }}
                          className={`min-h-[40px] inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                            selected
                              ? 'border-[#111214] bg-[#111214] text-white'
                              : 'border-[#E3E4E7] bg-white text-[#111214] hover:bg-[#F5F5F6]'
                          }`}
                        >
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black/20"
                            style={{ backgroundColor: color.hex_code }}
                          />
                          {color.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="space-y-2.5 pt-2">
                {availableComboStock > 0 ? (
                  <Link
                    to={`/book/${bike.slug}?variant=${activeVariant?.id ?? ''}&color=${activeColor?.id ?? ''}`}
                    onClick={() => trackEvent('book_click', { slug: bike.slug })}
                    className="block"
                  >
                    <Button size="lg" className="w-full min-h-[48px]">
                      Book Now with Token ({formatPKR(settings.booking_token_amount)})
                    </Button>
                  </Link>
                ) : (
                  <Link to={`/inquiry?bike=${bike.slug}`} className="block">
                    <Button size="lg" className="w-full min-h-[48px]">
                      Out of Stock — Request Availability
                    </Button>
                  </Link>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Link to={`/test-ride?bike=${bike.slug}`}>
                    <Button variant="secondary" size="md" className="w-full min-h-[44px]">
                      Book Test Ride
                    </Button>
                  </Link>
                  <Link to={`/inquiry?bike=${bike.slug}`}>
                    <Button variant="outline" size="md" className="w-full min-h-[44px]">
                      Send Inquiry
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" size="sm" onClick={handleWishlist} className="min-h-[44px]">
                    <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-[#D71920] text-[#D71920]' : ''}`} />
                    {isWishlisted ? 'Saved' : 'Wishlist'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() => {
                      const res = toggleCompare(bike.id);
                      if (res.message) toast({ title: res.message });
                    }}
                  >
                    <GitCompareArrows className="h-4 w-4" />
                    {inCompare ? 'In Compare' : 'Compare'}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-[#6B7078] pt-3 border-t border-[#E3E4E7]">
                {settings.price_disclaimer_text}
              </p>
            </Card>
          </div>
        </div>

        {/* Section: Highlights */}
        <section id="highlights" className="mt-14 pt-10 border-t border-[#E3E4E7] space-y-5">
          <h2 className="font-display text-3xl font-bold text-[#111214]">Model Highlights</h2>
          <p className="max-w-3xl text-base text-[#26282C] leading-relaxed">
            {bike.description || bike.tagline}
          </p>
          {activeVariant && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4">
                <span className="text-xs text-[#6B7078]">Engine</span>
                <p className="mt-1 text-base font-bold text-[#111214] tabular-nums">
                  {activeVariant.displacement_cc ?? bike.engine_cc} cc
                </p>
              </Card>
              <Card className="p-4">
                <span className="text-xs text-[#6B7078]">Mileage (Est.)</span>
                <p className="mt-1 text-base font-bold text-[#111214] tabular-nums">
                  {activeVariant.mileage_kmpl ? `${activeVariant.mileage_kmpl} km/l` : '—'}
                </p>
              </Card>
              <Card className="p-4">
                <span className="text-xs text-[#6B7078]">Transmission</span>
                <p className="mt-1 text-base font-bold text-[#111214]">
                  {activeVariant.transmission || '4-Speed'}
                </p>
              </Card>
              <Card className="p-4">
                <span className="text-xs text-[#6B7078]">Starting</span>
                <p className="mt-1 text-base font-bold text-[#111214]">
                  {activeVariant.starting || 'Kick / Electric'}
                </p>
              </Card>
            </div>
          )}
        </section>

        {/* Section: Specifications (Table on desktop, Accordion on mobile) */}
        <section id="specifications" className="mt-14 pt-10 border-t border-[#E3E4E7] space-y-5">
          <h2 className="font-display text-3xl font-bold text-[#111214]">Technical Specifications</h2>

          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-[#E3E4E7]">
                  {specRows.map((row) => (
                    <tr key={row.label} className="hover:bg-[#F5F5F6]/60">
                      <th className="w-1/3 px-5 py-3 text-left font-medium text-[#6B7078]">
                        {row.label}
                      </th>
                      <td className="px-5 py-3 font-medium text-[#111214] tabular-nums">
                        {String(row.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="md:hidden">
            <Accordion
              items={[
                {
                  id: 'spec-engine',
                  title: 'Engine & Performance',
                  content: specRows
                    .filter((r) =>
                      ['Engine Type', 'Displacement', 'Max Power', 'Max Torque', 'Mileage (Est.)', 'Transmission', 'Starting System'].includes(r.label)
                    )
                    .map((r) => `${r.label}: ${String(r.value)}`)
                    .join(' · '),
                },
                {
                  id: 'spec-chassis',
                  title: 'Dimensions, Brakes & Tyres',
                  content: specRows
                    .filter((r) =>
                      !['Engine Type', 'Displacement', 'Max Power', 'Max Torque', 'Mileage (Est.)', 'Transmission', 'Starting System'].includes(r.label)
                    )
                    .map((r) => `${r.label}: ${String(r.value)}`)
                    .join(' · '),
                },
              ]}
            />
          </div>
        </section>

        {/* Section: Features & Warranty */}
        <section id="features" className="mt-14 pt-10 border-t border-[#E3E4E7] space-y-5">
          <h2 className="font-display text-3xl font-bold text-[#111214]">Features &amp; Warranty</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeVariant?.features ?? []).map((feat) => (
              <Card key={feat} className="p-4 flex items-center gap-3">
                <Check className="h-4 w-4 text-[#1E8E4E] shrink-0" />
                <span className="text-sm font-medium text-[#111214]">{feat}</span>
              </Card>
            ))}
          </div>
          <Card className="p-6 flex items-start gap-4 max-w-2xl">
            <ShieldCheck className="h-6 w-6 text-[#D71920] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-[#111214]">Warranty Coverage</h3>
              <p className="mt-1 text-sm text-[#6B7078]">
                {activeVariant?.warranty_note ||
                  'Standard showroom warranty applies. Refer to Warranty & Service Policy for scheduled maintenance requirements.'}
              </p>
            </div>
          </Card>
        </section>

        {/* Section: EMI Calculator */}
        <section id="emi" className="mt-14 pt-10 border-t border-[#E3E4E7] space-y-5">
          <h2 className="font-display text-3xl font-bold text-[#111214]">Installment Estimator</h2>
          <EmiCalculatorWidget initialVariantId={activeVariant?.id} />
        </section>

        {/* Related Motorcycles */}
        {relatedBikes.length > 0 && (
          <section className="mt-16 pt-12 border-t border-[#E3E4E7]">
            <h2 className="font-display text-3xl font-bold text-[#111214] mb-6">
              Explore Related Models
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedBikes.map((b) => (
                <BikeCard key={b.id} bike={b} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
