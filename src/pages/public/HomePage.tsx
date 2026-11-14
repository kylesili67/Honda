import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Compass,
  ShieldCheck,
  Sparkles,
  Tag,
  Wrench,
  Zap,
} from 'lucide-react';
import { MEDIA } from '../../assets/media';
import { useSettings } from '../../context/SettingsContext';
import { trackEvent } from '../../lib/analytics';
import { formatDateKarachi, formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { listBikeCategories, listBikes } from '../../services/bikes';
import { listBanners, listFaqs, listNewsPosts, listOffers } from '../../services/content';
import { BikeAngleImage } from '../../components/bikes/BikeAngleImage';
import { BikeFinderWizard } from '../../components/bikes/BikeFinderWizard';
import { Accordion, Button, Modal, SafeImage, Skeleton } from '../../components/ui/Primitives';
import { CountUpNumber, Reveal } from '../../components/ui/ScrollReveal';

export function HomePage() {
  const { settings } = useSettings();

  const { data: banners = [] } = useQuery({ queryKey: ['banners'], queryFn: () => listBanners() });
  const { data: categories = [] } = useQuery({ queryKey: ['bike-categories'], queryFn: listBikeCategories });
  const { data: bikes = [], isLoading: bikesLoading } = useQuery({
    queryKey: ['bikes-published'],
    queryFn: () => listBikes(),
  });
  const { data: offers = [] } = useQuery({ queryKey: ['offers'], queryFn: () => listOffers() });
  const { data: faqs = [] } = useQuery({ queryKey: ['faqs'], queryFn: () => listFaqs() });
  const { data: newsPosts = [] } = useQuery({ queryKey: ['news-posts'], queryFn: () => listNewsPosts() });

  usePageMeta({
    title: `${settings.brand_name} – Motorcycle Showroom, Accessories & Service`,
    description:
      'Explore Pakistani showroom motorcycles, compare specs, estimate installments, reserve with a token, shop genuine spare parts, and book workshop service.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: settings.legal_business_name,
      telephone: settings.contact_phone,
    },
  });

  // Hero Slider state (driven by featured bikes)
  const heroSlides = useMemo(() => {
    const featured = bikes.filter((b) => b.is_featured);
    return featured.length > 0 ? featured : bikes;
  }, [bikes]);

  const [heroIdx, setHeroIdx] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (heroSlides.length <= 1 || heroPaused) return;
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch {
      // ignore
    }
    const timer = window.setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length, heroPaused]);

  const safeHeroIdx = heroSlides.length > 0 ? heroIdx % heroSlides.length : 0;
  const activeSlide = heroSlides[safeHeroIdx];

  // Bikes sorted by starting ex-showroom price ascending for Section 2 carousel
  const sortedBikes = useMemo(() => {
    return [...bikes].sort((a, b) => {
      const pa = Math.min(...(a.variants ?? []).map((v) => v.ex_showroom_price), Number.MAX_SAFE_INTEGER);
      const pb = Math.min(...(b.variants ?? []).map((v) => v.ex_showroom_price), Number.MAX_SAFE_INTEGER);
      return pa - pb;
    });
  }, [bikes]);

  // Electric category & bikes (Section 3 hidden unless active & non-empty)
  const electricCategory = useMemo(
    () => categories.find((c) => c.is_active && (c.slug === 'electric' || /electric/i.test(c.name))),
    [categories]
  );
  const electricBikes = useMemo(
    () =>
      bikes.filter(
        (b) =>
          b.category?.slug === 'electric' ||
          /electric/i.test(b.category?.name || '') ||
          (electricCategory && b.category_id === electricCategory.id)
      ),
    [bikes, electricCategory]
  );
  const [evIdx, setEvIdx] = useState(0);

  // Secondary banner for Section 4
  const wideBanner = banners.find((b) => b.placement === 'home_secondary');

  // Carousel refs
  const rangeScrollRef = useRef<HTMLDivElement | null>(null);
  const newsScrollRef = useRef<HTMLDivElement | null>(null);

  // Guided Finder modal state (Section 6)
  const [finderOpen, setFinderOpen] = useState(false);

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * 340, behavior: 'smooth' });
  };

  const getMinPrice = (bike: (typeof bikes)[number]) => {
    const prices = (bike.variants ?? []).map((v) => v.ex_showroom_price);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  return (
    <div>
      {/* 1. Full-Width Hero Showcase Slider (featured bike_models) */}
      <section
        aria-label="Featured motorcycles showcase"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || heroSlides.length <= 1) return;
          const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
          const delta = endX - touchStartX.current;
          if (Math.abs(delta) > 45) {
            setHeroIdx((prev) =>
              delta < 0 ? (prev + 1) % heroSlides.length : (prev - 1 + heroSlides.length) % heroSlides.length
            );
          }
          touchStartX.current = null;
        }}
        className="relative overflow-hidden text-white transition-colors duration-500"
        style={{
          background: activeSlide?.colors?.[0]?.hex_code
            ? `linear-gradient(125deg, #111214 0%, #1C1E22 52%, ${activeSlide.colors[0].hex_code}55 100%)`
            : 'linear-gradient(125deg, #111214 0%, #26282C 100%)',
        }}
      >
        {bikesLoading && !activeSlide ? (
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-16">
            <Skeleton className="h-[420px] w-full bg-white/10" />
          </div>
        ) : activeSlide ? (
          <div className="mx-auto max-w-[1280px] grid grid-cols-1 lg:grid-cols-12 items-center min-h-[500px] lg:min-h-[560px] px-4 sm:px-6 py-12 lg:py-16 gap-8">
            <div className="lg:col-span-6 z-10 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                {activeSlide.category?.name ?? 'Showroom'} · {activeSlide.engine_cc} cc
              </p>

              <h1 className="font-display text-[clamp(2.5rem,5vw,4.25rem)] font-bold uppercase leading-[0.98] tracking-tight text-balance">
                {activeSlide.name}
              </h1>

              <p className="font-display text-2xl sm:text-3xl font-bold text-[#D71920] tabular-nums">
                From {formatPKR(getMinPrice(activeSlide))}
              </p>

              {activeSlide.tagline && (
                <p className="max-w-lg text-sm sm:text-base text-white/80 leading-relaxed">
                  {activeSlide.tagline}
                </p>
              )}

              <div className="pt-3 flex flex-wrap items-center gap-3">
                <Link
                  to={`/bikes/${activeSlide.slug}`}
                  onClick={() => trackEvent('book_click', { source: 'home_hero', slug: activeSlide.slug })}
                >
                  <Button size="lg" className="min-h-[48px]">
                    Explore More
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to={`/book/${activeSlide.slug}`}>
                  <Button
                    size="lg"
                    variant="outline-dark"
                    className="min-h-[48px]"
                  >
                    Book Now
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 relative">
              <div
                key={activeSlide.id}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-[#18191D] shadow-2xl"
              >
                <BikeAngleImage
                  images={activeSlide.images}
                  fallbackSrc={MEDIA.heroShowroomBike}
                  alt={activeSlide.name}
                  aspectRatio="16/10"
                  priority
                  className="bg-[#18191D]"
                  enableGroupZoom={false}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Prev / Next Arrows & Pagination Dots */}
        {heroSlides.length > 1 && (
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 pb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2" role="tablist" aria-label="Featured slides">
              {heroSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === safeHeroIdx}
                  aria-label={`View ${slide.name}`}
                  onClick={() => setHeroIdx(idx)}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    idx === safeHeroIdx ? 'w-8 bg-[#D71920]' : 'w-2.5 bg-white/35 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous motorcycle slide"
                onClick={() => setHeroIdx((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/15 cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next motorcycle slide"
                onClick={() => setHeroIdx((prev) => (prev + 1) % heroSlides.length)}
                className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/15 cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. Bike Range Strip / Horizontal Carousel (Sorted by Price) */}
      <Reveal>
        <section className="mx-auto max-w-[1280px] px-4 sm:px-6 py-14 sm:py-18">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#D71920]">
                Complete Lineup
              </p>
              <h2 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-[#111214]">
                Motorcycle Range
              </h2>
              <p className="mt-1 text-sm text-[#6B7078]">
                Sorted by starting ex-showroom price in PKR.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Scroll bikes left"
                onClick={() => scrollCarousel(rangeScrollRef, -1)}
                className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-[#E3E4E7] hover:bg-[#F5F5F6] cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Scroll bikes right"
                onClick={() => scrollCarousel(rangeScrollRef, 1)}
                className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-[#E3E4E7] hover:bg-[#F5F5F6] cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {bikesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80 w-full" />
              ))}
            </div>
          ) : (
            <div
              ref={rangeScrollRef}
              className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-3"
            >
              {sortedBikes.map((bike) => (
                <article
                  key={bike.id}
                  className="group snap-start shrink-0 w-[290px] sm:w-[340px] rounded-xl border border-[#E3E4E7] bg-white overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <Link to={`/bikes/${bike.slug}`} className="block bg-[#F5F5F6] overflow-hidden">
                    <BikeAngleImage
                      images={bike.images}
                      alt={bike.name}
                      aspectRatio="4/3"
                    />
                  </Link>
                    <div className="p-5 flex-1 flex flex-col">
                      <span className="text-xs text-[#6B7078]">
                        {bike.category?.name} · {bike.engine_cc} cc
                      </span>
                      <h3 className="mt-1 text-lg font-bold text-[#111214] group-hover:text-[#D71920] transition-colors">
                        {bike.name}
                      </h3>
                      {bike.tagline && (
                        <p className="mt-1 text-xs text-[#6B7078] line-clamp-2">{bike.tagline}</p>
                      )}
                      <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-[#E3E4E7]">
                        <div>
                          <span className="block text-[11px] uppercase tracking-wider text-[#6B7078]">
                            From
                          </span>
                          <span className="text-base font-bold text-[#111214] tabular-nums">
                            {formatPKR(getMinPrice(bike))}
                          </span>
                        </div>
                        <Link to={`/bikes/${bike.slug}`}>
                          <Button size="sm" variant="outline" className="min-h-[44px]">
                            Explore More
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </article>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* 3. Electric Section (Hidden cleanly unless electric category is active & non-empty) */}
      {electricCategory && electricBikes.length > 0 && (
        <Reveal>
          <section className="bg-[#111214] text-white border-y border-[#26282C]">
            <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-14 sm:py-18">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#D71920]">
                    <Zap className="h-4 w-4" />
                    Electric Mobility
                  </span>
                  <h2 className="mt-1 font-display text-3xl sm:text-4xl font-bold">
                    Zero-Emission Urban Riding
                  </h2>
                  <p className="mt-1 text-sm text-white/70">
                    Quiet torque and plug-in convenience engineered for short city commutes.
                  </p>
                </div>
                {electricBikes.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Previous electric model"
                      onClick={() => setEvIdx((i) => (i - 1 + electricBikes.length) % electricBikes.length)}
                      className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-white/20 hover:bg-white/10 cursor-pointer"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next electric model"
                      onClick={() => setEvIdx((i) => (i + 1) % electricBikes.length)}
                      className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-white/20 hover:bg-white/10 cursor-pointer"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              {(() => {
                const ev = electricBikes[evIdx % electricBikes.length];
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-2xl border border-white/10 bg-[#1B1D21] p-6 sm:p-8">
                    <div className="group lg:col-span-6 overflow-hidden rounded-xl bg-[#111214]">
                      <BikeAngleImage
                        images={ev.images}
                        alt={ev.name}
                        aspectRatio="16/10"
                        className="bg-[#111214]"
                      />
                    </div>
                    <div className="lg:col-span-6 space-y-4">
                      <h3 className="font-display text-3xl font-bold">{ev.name}</h3>
                      <p className="text-xl font-bold text-[#D71920] tabular-nums">
                        From {formatPKR(getMinPrice(ev))}
                      </p>
                      {ev.tagline && <p className="text-sm text-white/75">{ev.tagline}</p>}
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Link to={`/bikes/${ev.slug}`}>
                          <Button className="min-h-[44px]">Explore Electric Model</Button>
                        </Link>
                        <Link to={`/bikes?category=${electricCategory.slug}`}>
                          <Button variant="outline-dark" className="min-h-[44px]">
                            View All Electric
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>
        </Reveal>
      )}

      {/* 4. "View all Motorcycles" Wide Banner */}
      <Reveal>
        <section className="relative bg-[#111214] text-white overflow-hidden">
          <img
            src={wideBanner?.image_url || MEDIA.heroShowroomBike}
            alt="Showroom motorcycle collection banner"
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 py-16 sm:py-24 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D71920]">
                {settings.brand_name} Showroom Collection
              </p>
              <h2 className="mt-2 font-display text-4xl sm:text-5xl font-bold leading-tight">
                {wideBanner?.title || 'Ready to ride the difference?'}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-white/80">
                {wideBanner?.subtitle ||
                  'Compare 70cc commuters, 125cc daily powerhouses, and 150cc touring editions with transparent ex-showroom pricing and live branch stock.'}
              </p>
            </div>
            <Link to={wideBanner?.cta_url || '/bikes'}>
              <Button size="lg" className="min-h-[48px]">
                {wideBanner?.cta_label || 'View All Motorcycles'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </Reveal>

      {/* 5. Two-Up Promo Blocks (Spare Parts + Book a Service) */}
      <Reveal>
        <section className="mx-auto max-w-[1280px] px-4 sm:px-6 py-14 sm:py-18">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Block A: Spare Parts */}
            <Link
              to="/accessories?category=genuine-parts"
              className="group relative overflow-hidden rounded-2xl border border-[#E3E4E7] bg-[#111214] min-h-[280px] flex items-end p-6 sm:p-8 text-white"
            >
              <img
                src={MEDIA.accessoryGlovesKit}
                alt="Genuine motorcycle spare parts and riding gear"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#111214] via-[#111214]/55 to-transparent" />
              <div className="relative z-10 space-y-2 max-w-md">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D71920]">
                  Accessories &amp; Parts Store
                </span>
                <h3 className="font-display text-3xl font-bold">Genuine Spare Parts &amp; Gear</h3>
                <p className="text-sm text-white/80">
                  Tested lubricants, helmets, armored jackets, and model-matched parts shipped nationwide.
                </p>
                <span className="pt-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white group-hover:text-[#D71920] transition-colors">
                  Shop Spare Parts
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>

            {/* Block B: Book a Service */}
            <Link
              to="/service-booking"
              className="group relative overflow-hidden rounded-2xl border border-[#E3E4E7] bg-[#111214] min-h-[280px] flex items-end p-6 sm:p-8 text-white"
            >
              <img
                src={MEDIA.bikePerformance150}
                alt="Showroom workshop service bay"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#111214] via-[#111214]/55 to-transparent" />
              <div className="relative z-10 space-y-2 max-w-md">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D71920]">
                  Showroom Workshop Bays
                </span>
                <h3 className="font-display text-3xl font-bold">Book a Service</h3>
                <p className="text-sm text-white/80">
                  Reserve periodic maintenance or inspection slots online and maintain a digital service history.
                </p>
                <span className="pt-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white group-hover:text-[#D71920] transition-colors">
                  Schedule Bay Slot
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>
        </section>
      </Reveal>

      {/* 6. Find Your Perfect Bike (Guided 4-Step Finder) */}
      <Reveal>
        <section className="bg-[#F5F5F6] border-y border-[#E3E4E7]">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-14 sm:py-18 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#D71920]">
                <Compass className="h-4 w-4" />
                Guided Bike Finder
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#111214]">
                Not Sure Which Model Fits Your Commute?
              </h2>
              <p className="text-sm text-[#26282C] leading-relaxed">
                Answer 4 quick questions about your budget in PKR, daily route, engine capacity preference, and fuel choice to get instant recommendations you can compare side by side.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button size="lg" onClick={() => setFinderOpen(true)} className="min-h-[48px]">
                Launch 4-Step Finder
                <Sparkles className="h-4 w-4" />
              </Button>
              <Link to="/find-your-perfect-bike">
                <Button size="lg" variant="outline" className="min-h-[48px]">
                  Open Full Page
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      <Modal open={finderOpen} onClose={() => setFinderOpen(false)} title="Find Your Perfect Bike">
        <BikeFinderWizard onClose={() => setFinderOpen(false)} />
      </Modal>

      {/* 8. Active Offers Strip */}
      {offers.length > 0 && (
        <Reveal>
          <section className="bg-[#F5F5F6] border-y border-[#E3E4E7]">
            <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-12">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[#D71920]" />
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#111214]">
                    Active Showroom Offers
                  </h2>
                </div>
                <Link to="/accessories" className="text-xs font-semibold text-[#D71920] hover:underline">
                  Explore Store Deals →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="rounded-xl border border-[#E3E4E7] bg-white p-5 flex items-start gap-4 hover:shadow-md transition-shadow"
                  >
                    {offer.image_url && (
                      <SafeImage
                        src={offer.image_url}
                        alt={offer.title}
                        className="h-20 w-20 rounded-lg bg-[#F5F5F6] shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#D71920]">
                        {offer.applies_to}
                      </span>
                      <h3 className="mt-0.5 text-sm font-bold text-[#111214]">{offer.title}</h3>
                      {offer.description && (
                        <p className="mt-1 text-xs text-[#6B7078] line-clamp-2">{offer.description}</p>
                      )}
                      <Link
                        to={
                          offer.applies_to === 'service'
                            ? '/service-booking'
                            : offer.applies_to === 'bikes'
                              ? '/bikes'
                              : '/accessories'
                        }
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#111214] hover:text-[#D71920]"
                      >
                        Claim Offer
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* 9. News & Updates Carousel */}
      {newsPosts.length > 0 && (
        <Reveal>
          <section id="news" className="mx-auto max-w-[1280px] px-4 sm:px-6 py-14 sm:py-18">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#D71920]">
                  Showroom Journal
                </p>
                <h2 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-[#111214]">
                  News &amp; Updates
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/news" className="mr-2 text-xs font-semibold text-[#D71920] hover:underline">
                  All Updates
                </Link>
                <button
                  type="button"
                  aria-label="Scroll news left"
                  onClick={() => scrollCarousel(newsScrollRef, -1)}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-[#E3E4E7] hover:bg-[#F5F5F6] cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll news right"
                  onClick={() => scrollCarousel(newsScrollRef, 1)}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-[#E3E4E7] hover:bg-[#F5F5F6] cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div
              ref={newsScrollRef}
              className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-3"
            >
              {newsPosts.slice(0, 5).map((post) => {
                const linkedBike = post.related_model_id
                  ? bikes.find((b) => b.id === post.related_model_id)
                  : undefined;

                return (
                  <article
                    key={post.id}
                    className="group snap-start shrink-0 w-[290px] sm:w-[360px] rounded-xl border border-[#E3E4E7] bg-white overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
                  >
                    {(linkedBike || post.image_url) && (
                      <Link to={`/news/${post.slug}`} className="block bg-[#F5F5F6] overflow-hidden">
                        {linkedBike ? (
                          <BikeAngleImage
                            images={linkedBike.images}
                            fallbackSrc={post.image_url}
                            alt={post.title}
                            aspectRatio="16/10"
                          />
                        ) : (
                          <SafeImage
                            src={post.image_url}
                            alt={post.title}
                            aspectClass="aspect-[16/10]"
                            className="w-full aspect-[16/10] transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                        )}
                      </Link>
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                      <p className="text-xs text-[#6B7078] flex items-center gap-1.5 tabular-nums">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDateKarachi(post.published_at)}
                      </p>
                      <Link to={`/news/${post.slug}`} className="mt-2 block">
                        <h3 className="text-base font-bold text-[#111214] group-hover:text-[#D71920] transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                      </Link>
                      <p className="mt-2 text-xs text-[#6B7078] line-clamp-3 flex-1">{post.excerpt}</p>
                      <Link
                        to={`/news/${post.slug}`}
                        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#D71920] hover:underline"
                      >
                        Read More
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </Reveal>
      )}

      {/* 10. Why Us / Trust Strip with Count-Up Numbers */}
      <Reveal>
        <section className="bg-[#26282C] text-white border-y border-[#111214]">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
                <ShieldCheck className="h-6 w-6 text-[#D71920]" />
                <p className="font-display text-3xl font-bold">
                  <CountUpNumber target={100} suffix="%" />
                </p>
                <h3 className="text-sm font-semibold">Genuine Spare Parts</h3>
                <p className="text-xs text-white/70">Model-matched consumables, helmets, and showroom parts.</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
                <Calculator className="h-6 w-6 text-[#D71920]" />
                <p className="font-display text-3xl font-bold">
                  <CountUpNumber target={36} suffix=" Mo" />
                </p>
                <h3 className="text-sm font-semibold">Easy Installments</h3>
                <p className="text-xs text-white/70">Up to 36-month indicative EMI planning across variants.</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
                <Compass className="h-6 w-6 text-[#D71920]" />
                <p className="font-display text-3xl font-bold">
                  <CountUpNumber target={15} suffix=" Min" />
                </p>
                <h3 className="text-sm font-semibold">Free Test Ride</h3>
                <p className="text-xs text-white/70">Dedicated branch slots to ride before reserving a token.</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
                <Wrench className="h-6 w-6 text-[#D71920]" />
                <p className="font-display text-3xl font-bold">
                  <CountUpNumber target={50000} suffix="+" />
                </p>
                <h3 className="text-sm font-semibold">Trusted Service Bays</h3>
                <p className="text-xs text-white/70">Verified digital workshop logs tied to your registration.</p>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* 11. Rider Testimonials + FAQ Teaser */}
      <Reveal>
        <section className="mx-auto max-w-[1280px] px-4 sm:px-6 py-14 sm:py-18 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#D71920]">
                Rider Feedback
              </p>
              <h2 className="mt-1 font-display text-3xl font-bold text-[#111214]">
                Trusted Across Pakistan
              </h2>
            </div>

            <div className="rounded-xl border border-[#E3E4E7] bg-[#F5F5F6] p-6 space-y-3">
              <p className="text-sm text-[#111214] leading-relaxed">
                &ldquo;Booked my Street 125 SE token online and tracked the Islamabad excise plate progress step-by-step in my account without calling the desk daily.&rdquo;
              </p>
              <p className="text-xs font-semibold text-[#6B7078]">
                Usman Khalid · Islamabad Branch Customer
              </p>
            </div>

            <div className="rounded-xl border border-[#E3E4E7] bg-white p-6 space-y-3">
              <p className="text-sm text-[#111214] leading-relaxed">
                &ldquo;Scheduled my 1,000 km workshop slot online in Lahore Gulberg, walked in at 10 AM, and my odometer service record appeared right inside my profile.&rdquo;
              </p>
              <p className="text-xs font-semibold text-[#6B7078]">
                Ahsan Raza · Lahore Branch Customer
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold text-[#111214]">
                  Frequently Asked Questions
                </h2>
                <p className="mt-1 text-sm text-[#6B7078]">
                  Quick answers on booking tokens, EMI plans, shipping, and workshop slots.
                </p>
              </div>
              <Link to="/faq" className="text-xs font-semibold text-[#D71920] hover:underline shrink-0">
                All FAQs →
              </Link>
            </div>

            <Accordion
              items={faqs.slice(0, 4).map((f) => ({
                id: f.id,
                title: f.question,
                content: f.answer,
                category: f.category,
              }))}
            />
          </div>
        </section>
      </Reveal>
    </div>
  );
}
