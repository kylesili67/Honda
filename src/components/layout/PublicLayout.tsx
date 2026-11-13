import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ChevronDown,
  Facebook,
  GitCompareArrows,
  Instagram,
  Menu,
  MessageCircle,
  Phone,
  ShoppingBag,
  Trash2,
  User,
  X,
  Youtube,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { formatPKR } from '../../lib/format';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { listAccessories } from '../../services/accessories';
import { listBikeCategories, listBikes } from '../../services/bikes';
import { Button, SafeImage } from '../ui/Primitives';
import { Logo } from '../brand/Logo';

function TikTokIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export function PublicLayout() {
  const { settings } = useSettings();
  const { user, isStaff } = useAuth();
  const { items, itemCount, subtotal, removeItem, compareIds } = useCart();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<'products' | 'services' | 'dealer' | null>('products');
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [megaTab, setMegaTab] = useState<'motorcycles' | 'electric' | 'parts'>('motorcycles');
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const megaWrapperRef = useRef<HTMLDivElement | null>(null);
  const cartWrapperRef = useRef<HTMLDivElement | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['bike-categories'],
    queryFn: listBikeCategories,
    staleTime: 120_000,
  });
  const { data: bikes = [] } = useQuery({
    queryKey: ['bikes-published'],
    queryFn: () => listBikes(),
    staleTime: 120_000,
  });
  const { data: accessories = [] } = useQuery({
    queryKey: ['accessories-published'],
    queryFn: () => listAccessories(),
    staleTime: 120_000,
  });

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

  const petrolBikes = useMemo(
    () => bikes.filter((b) => !electricBikes.some((e) => e.id === b.id)),
    [bikes, electricBikes]
  );

  const sparePartsAndGear = useMemo(() => {
    const parts = accessories.filter(
      (a) => a.category?.slug === 'genuine-parts' || /part/i.test(a.category?.name || '')
    );
    return (parts.length > 0 ? parts : accessories).slice(0, 6);
  }, [accessories]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMegaMenuOpen(false);
    setMiniCartOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Escape & outside-click close for Mega Menu and Mini Cart
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMegaMenuOpen(false);
        setMiniCartOpen(false);
        setMobileMenuOpen(false);
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (megaWrapperRef.current && !megaWrapperRef.current.contains(target)) {
        setMegaMenuOpen(false);
      }
      if (cartWrapperRef.current && !cartWrapperRef.current.contains(target)) {
        setMiniCartOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  // Lock body scroll when full-screen mobile drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  const brandName = (settings.brand_name || 'Honda').trim() || 'Honda';
  const whatsappDigits = settings.whatsapp_number.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
    `Hello ${brandName} Showroom, I have a question.`
  )}`;

  const openMegaMenu = () => {
    if (hoverCloseTimer.current) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
    setMegaMenuOpen(true);
  };

  const scheduleCloseMegaMenu = () => {
    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = window.setTimeout(() => {
      setMegaMenuOpen(false);
    }, 140);
  };

  const getMinBikePrice = (model: (typeof bikes)[number]) => {
    const prices = (model.variants ?? []).map((v) => v.ex_showroom_price);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111214] overflow-x-clip">
      {!isSupabaseConfigured && !bannerDismissed && (
        <div className="bg-[#26282C] text-white text-xs px-4 py-2 flex items-center justify-between gap-4">
          <p className="truncate">
            Backend not configured — previewing with sample placeholder data. Connect Supabase environment variables for live data.
          </p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss notice"
            className="shrink-0 text-white/70 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Layer 1: Thin Top Utility Bar */}
      <div className="bg-[#111214] text-white/85 border-b border-white/10">
        <div className="mx-auto flex h-10 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 text-xs">
          {/* Left: Social Links from site_settings */}
          <div className="flex items-center gap-3">
            {settings.social_links?.facebook && (
              <a
                href={settings.social_links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="p-1.5 text-white/75 hover:text-white transition-colors"
              >
                <Facebook className="h-3.5 w-3.5" />
              </a>
            )}
            {settings.social_links?.instagram && (
              <a
                href={settings.social_links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="p-1.5 text-white/75 hover:text-white transition-colors"
              >
                <Instagram className="h-3.5 w-3.5" />
              </a>
            )}
            {settings.social_links?.youtube && (
              <a
                href={settings.social_links.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="p-1.5 text-white/75 hover:text-white transition-colors"
              >
                <Youtube className="h-3.5 w-3.5" />
              </a>
            )}
            {settings.social_links?.tiktok && (
              <a
                href={settings.social_links.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="p-1.5 text-white/75 hover:text-white transition-colors"
              >
                <TikTokIcon className="h-3.5 w-3.5" />
              </a>
            )}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Showroom"
              className="p-1.5 text-white/75 hover:text-[#25D366] transition-colors inline-flex items-center gap-1"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </div>

          {/* Right: Login/Register or My Account + Mini-Cart Dropdown */}
          <div className="flex items-center gap-4">
            {isStaff ? (
              <Link to="/admin" className="font-medium hover:text-white transition-colors whitespace-nowrap">
                Admin Panel
              </Link>
            ) : user ? (
              <Link
                to="/account"
                className="inline-flex items-center gap-1.5 font-medium hover:text-white transition-colors whitespace-nowrap"
              >
                <User className="h-3.5 w-3.5" />
                My Account
              </Link>
            ) : (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Link to="/login" className="hover:text-white transition-colors">
                  Login
                </Link>
                <span className="text-white/30">/</span>
                <Link to="/signup" className="hover:text-white transition-colors">
                  Register
                </Link>
              </div>
            )}

            {/* Mini-cart trigger & dropdown */}
            <div ref={cartWrapperRef} className="relative">
              <button
                type="button"
                aria-expanded={miniCartOpen}
                aria-label={`Shopping cart with ${itemCount} items`}
                onClick={() => setMiniCartOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ShoppingBag className="h-3.5 w-3.5 text-[#D71920]" />
                <span className="tabular-nums font-semibold">{itemCount}</span>
              </button>

              {miniCartOpen && (
                <div
                  role="dialog"
                  aria-label="Mini cart"
                  className="mega-menu-enter absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-[#E3E4E7] bg-white text-[#111214] shadow-2xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-[#E3E4E7] flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#111214]">
                      Your Cart ({itemCount})
                    </span>
                    <button
                      type="button"
                      aria-label="Close mini cart"
                      onClick={() => setMiniCartOpen(false)}
                      className="p-1 text-[#6B7078] hover:text-[#111214] cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div className="p-6 text-center space-y-3">
                      <p className="text-sm text-[#6B7078]">Your accessories cart is empty.</p>
                      <Link to="/accessories" onClick={() => setMiniCartOpen(false)}>
                        <Button size="sm" variant="outline" className="w-full">
                          Continue Shopping
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <>
                      <ul className="max-h-64 overflow-y-auto divide-y divide-[#E3E4E7]">
                        {items.map((item) => (
                          <li key={item.variantId} className="p-3.5 flex items-center gap-3">
                            <SafeImage
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-12 w-12 rounded-md bg-[#F5F5F6] shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/accessories/${item.accessorySlug}`}
                                onClick={() => setMiniCartOpen(false)}
                                className="text-xs font-semibold text-[#111214] hover:text-[#D71920] line-clamp-1"
                              >
                                {item.name}
                              </Link>
                              <p className="text-[11px] text-[#6B7078] truncate">
                                {item.variantLabel} · Qty {item.quantity}
                              </p>
                              <p className="text-xs font-bold text-[#111214] tabular-nums mt-0.5">
                                {formatPKR(item.unitPrice * item.quantity)}
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-label={`Remove ${item.name}`}
                              onClick={() => removeItem(item.variantId)}
                              className="p-1.5 text-[#6B7078] hover:text-[#C0262D] cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="p-4 bg-[#F5F5F6] border-t border-[#E3E4E7] space-y-3">
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span>Subtotal</span>
                          <span className="tabular-nums">{formatPKR(subtotal)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Link to="/accessories" onClick={() => setMiniCartOpen(false)}>
                            <Button size="sm" variant="outline" className="w-full">
                              Continue Shopping
                            </Button>
                          </Link>
                          <Link to="/checkout" onClick={() => setMiniCartOpen(false)}>
                            <Button size="sm" className="w-full">
                              Checkout
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Layer 2: Sticky Main Header (shrinks smoothly on scroll) */}
      <header
        ref={megaWrapperRef}
        onMouseLeave={scheduleCloseMegaMenu}
        className={`sticky top-0 z-40 border-b border-[#E3E4E7] bg-white/95 backdrop-blur transition-all duration-200 ${
          scrolled ? 'shadow-md' : ''
        }`}
      >
        <div
          className={`mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-4 sm:px-6 transition-all duration-200 ${
            scrolled ? 'h-14' : 'h-16'
          }`}
        >
          {/* Logo Left (default original SVG emblem + wordmark or site_settings.logo_url) */}
          <div className="flex items-center shrink-0">
            <Logo
              variant={scrolled ? 'icon' : 'full'}
              height={scrolled ? 30 : 34}
              className="sm:hidden"
            />
            <Logo
              variant="full"
              height={scrolled ? 30 : 38}
              className="hidden sm:inline-flex"
            />
          </div>

          {/* Desktop Navigation */}
          <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'text-[#D71920]' : 'text-[#26282C] hover:text-[#111214]'
                }`
              }
            >
              Home
            </NavLink>

            <button
              type="button"
              aria-expanded={megaMenuOpen}
              aria-controls="products-mega-menu"
              onMouseEnter={openMegaMenu}
              onClick={() => setMegaMenuOpen((v) => !v)}
              className={`inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer py-2 ${
                megaMenuOpen || location.pathname.startsWith('/bikes') || location.pathname.startsWith('/accessories')
                  ? 'text-[#D71920]'
                  : 'text-[#26282C] hover:text-[#111214]'
              }`}
            >
              Products
              <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${megaMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <NavLink
              to="/service-booking"
              className={({ isActive }) =>
                `text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'text-[#D71920]' : 'text-[#26282C] hover:text-[#111214]'
                }`
              }
            >
              Book a Service
            </NavLink>

            <NavLink
              to="/branches"
              className={({ isActive }) =>
                `text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'text-[#D71920]' : 'text-[#26282C] hover:text-[#111214]'
                }`
              }
            >
              Find a Dealer
            </NavLink>

            <NavLink
              to="/emi-calculator"
              className={({ isActive }) =>
                `text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'text-[#D71920]' : 'text-[#26282C] hover:text-[#111214]'
                }`
              }
            >
              EMI Calculator
            </NavLink>

            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'text-[#D71920]' : 'text-[#26282C] hover:text-[#111214]'
                }`
              }
            >
              Contact
            </NavLink>
          </nav>

          {/* Right Quick Actions & Mobile Hamburger */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/find-your-perfect-bike" className="hidden xl:inline-block">
              <Button variant="outline" size="sm">
                Bike Finder
              </Button>
            </Link>
            <Link to="/bikes" className="hidden sm:inline-block">
              <Button size="sm">Book a Bike</Button>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#E3E4E7] text-[#111214] cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Desktop Products Mega Menu */}
        {megaMenuOpen && (
          <div
            id="products-mega-menu"
            onMouseEnter={openMegaMenu}
            className="mega-menu-enter hidden lg:block absolute left-0 right-0 top-full border-t border-b border-[#E3E4E7] bg-white shadow-2xl z-40"
          >
            <div className="mx-auto max-w-[1280px] px-6 py-6">
              {/* Tabs */}
              <div role="tablist" aria-label="Product categories" className="flex items-center gap-2 border-b border-[#E3E4E7] pb-3">
                <button
                  type="button"
                  role="tab"
                  aria-selected={megaTab === 'motorcycles'}
                  onClick={() => setMegaTab('motorcycles')}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    megaTab === 'motorcycles'
                      ? 'bg-[#111214] text-white'
                      : 'text-[#6B7078] hover:bg-[#F5F5F6] hover:text-[#111214]'
                  }`}
                >
                  Motorcycles
                </button>

                {electricCategory && electricBikes.length > 0 && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={megaTab === 'electric'}
                    onClick={() => setMegaTab('electric')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                      megaTab === 'electric'
                        ? 'bg-[#D71920] text-white'
                        : 'text-[#6B7078] hover:bg-[#F5F5F6] hover:text-[#111214]'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Electric
                  </button>
                )}

                <button
                  type="button"
                  role="tab"
                  aria-selected={megaTab === 'parts'}
                  onClick={() => setMegaTab('parts')}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    megaTab === 'parts'
                      ? 'bg-[#111214] text-white'
                      : 'text-[#6B7078] hover:bg-[#F5F5F6] hover:text-[#111214]'
                  }`}
                >
                  Spare Parts &amp; Gear
                </button>
              </div>

              {/* Tab Grids */}
              {megaTab === 'motorcycles' && (
                <div className="mt-5">
                  <div className="grid grid-cols-4 gap-4">
                    {(petrolBikes.length > 0 ? petrolBikes : bikes).slice(0, 8).map((bike) => {
                      const img = bike.images?.find((i) => i.is_primary)?.url ?? bike.images?.[0]?.url ?? null;
                      return (
                        <Link
                          key={bike.id}
                          to={`/bikes/${bike.slug}`}
                          onClick={() => setMegaMenuOpen(false)}
                          className="group flex items-center gap-3 rounded-xl border border-[#E3E4E7] p-2.5 hover:border-[#D71920] hover:bg-[#F5F5F6]/50 transition-all"
                        >
                          <SafeImage
                            src={img}
                            alt={bike.name}
                            className="h-14 w-20 rounded-lg bg-[#F5F5F6] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#111214] group-hover:text-[#D71920] truncate">
                              {bike.name}
                            </p>
                            <p className="text-xs text-[#6B7078] tabular-nums">
                              From {formatPKR(getMinBikePrice(bike))}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#E3E4E7] flex items-center justify-between">
                    <Link
                      to="/find-your-perfect-bike"
                      onClick={() => setMegaMenuOpen(false)}
                      className="text-xs font-semibold text-[#26282C] hover:text-[#D71920]"
                    >
                      Not sure? Try Find Your Perfect Bike →
                    </Link>
                    <Link
                      to="/bikes"
                      onClick={() => setMegaMenuOpen(false)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#D71920] hover:underline"
                    >
                      View all Motorcycles
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {megaTab === 'electric' && electricCategory && electricBikes.length > 0 && (
                <div className="mt-5">
                  <div className="grid grid-cols-4 gap-4">
                    {electricBikes.slice(0, 8).map((bike) => {
                      const img = bike.images?.find((i) => i.is_primary)?.url ?? bike.images?.[0]?.url ?? null;
                      return (
                        <Link
                          key={bike.id}
                          to={`/bikes/${bike.slug}`}
                          onClick={() => setMegaMenuOpen(false)}
                          className="group flex items-center gap-3 rounded-xl border border-[#E3E4E7] p-2.5 hover:border-[#D71920] transition-all"
                        >
                          <SafeImage
                            src={img}
                            alt={bike.name}
                            className="h-14 w-20 rounded-lg bg-[#F5F5F6] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#111214] group-hover:text-[#D71920] truncate">
                              {bike.name}
                            </p>
                            <p className="text-xs text-[#6B7078] tabular-nums">
                              From {formatPKR(getMinBikePrice(bike))}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#E3E4E7] flex justify-end">
                    <Link
                      to={`/bikes?category=${electricCategory.slug}`}
                      onClick={() => setMegaMenuOpen(false)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#D71920] hover:underline"
                    >
                      View all Electric Models
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {megaTab === 'parts' && (
                <div className="mt-5">
                  <div className="grid grid-cols-3 gap-4">
                    {sparePartsAndGear.map((item) => (
                      <Link
                        key={item.id}
                        to={`/accessories/${item.slug}`}
                        onClick={() => setMegaMenuOpen(false)}
                        className="group flex items-center gap-3 rounded-xl border border-[#E3E4E7] p-2.5 hover:border-[#D71920] hover:bg-[#F5F5F6]/50 transition-all"
                      >
                        <SafeImage
                          src={item.images?.[0]?.url}
                          alt={item.name}
                          className="h-14 w-14 rounded-lg bg-[#F5F5F6] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#111214] group-hover:text-[#D71920] truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-[#6B7078] tabular-nums">{formatPKR(item.base_price)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#E3E4E7] flex items-center justify-between">
                    <Link
                      to="/accessories?category=genuine-parts"
                      onClick={() => setMegaMenuOpen(false)}
                      className="text-xs font-semibold text-[#26282C] hover:text-[#D71920]"
                    >
                      Browse Genuine Spare Parts
                    </Link>
                    <Link
                      to="/accessories"
                      onClick={() => setMegaMenuOpen(false)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#D71920] hover:underline"
                    >
                      View all Accessories &amp; Parts
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Full-Screen Accordion Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
          className="fixed inset-0 z-50 bg-white flex flex-col lg:hidden overflow-y-auto"
        >
          <div className="flex h-16 items-center justify-between px-4 border-b border-[#E3E4E7] shrink-0">
            <Logo variant="full" height={32} />
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
              className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-[#E3E4E7]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 px-4 py-5 space-y-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-base font-semibold text-[#111214] hover:bg-[#F5F5F6]"
            >
              Home
            </Link>

            {/* Products Accordion */}
            <div className="rounded-xl border border-[#E3E4E7] overflow-hidden">
              <button
                type="button"
                aria-expanded={mobileAccordion === 'products'}
                onClick={() => setMobileAccordion(mobileAccordion === 'products' ? null : 'products')}
                className="flex w-full min-h-[48px] items-center justify-between px-4 text-base font-semibold text-[#111214] bg-[#F5F5F6]/70"
              >
                <span>Products</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${mobileAccordion === 'products' ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileAccordion === 'products' && (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-[#6B7078] mb-1.5">
                      Motorcycles
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {bikes.slice(0, 6).map((b) => (
                        <Link
                          key={b.id}
                          to={`/bikes/${b.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg p-2 hover:bg-[#F5F5F6]"
                        >
                          <SafeImage
                            src={b.images?.[0]?.url}
                            alt={b.name}
                            className="h-10 w-14 rounded bg-[#F5F5F6] shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#111214] truncate">{b.name}</p>
                            <p className="text-xs text-[#6B7078] tabular-nums">
                              From {formatPKR(getMinBikePrice(b))}
                            </p>
                          </div>
                        </Link>
                      ))}
                      <Link
                        to="/bikes"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-2 py-1.5 text-xs font-semibold text-[#D71920]"
                      >
                        View all Motorcycles →
                      </Link>
                    </div>
                  </div>

                  {electricCategory && electricBikes.length > 0 && (
                    <div className="pt-2 border-t border-[#E3E4E7]">
                      <Link
                        to={`/bikes?category=${electricCategory.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex min-h-[44px] items-center gap-2 px-2 text-sm font-semibold text-[#111214]"
                      >
                        <Zap className="h-4 w-4 text-[#D71920]" />
                        Electric Lineup
                      </Link>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#E3E4E7]">
                    <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-[#6B7078] mb-1">
                      Spare Parts &amp; Gear
                    </p>
                    <Link
                      to="/accessories?category=genuine-parts"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex min-h-[44px] items-center px-2 text-sm font-medium text-[#111214]"
                    >
                      Genuine Spare Parts
                    </Link>
                    <Link
                      to="/accessories"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex min-h-[44px] items-center px-2 text-sm font-medium text-[#111214]"
                    >
                      All Helmets, Gear &amp; Parts
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Services Accordion */}
            <div className="rounded-xl border border-[#E3E4E7] overflow-hidden">
              <button
                type="button"
                aria-expanded={mobileAccordion === 'services'}
                onClick={() => setMobileAccordion(mobileAccordion === 'services' ? null : 'services')}
                className="flex w-full min-h-[48px] items-center justify-between px-4 text-base font-semibold text-[#111214] bg-[#F5F5F6]/70"
              >
                <span>Services &amp; Tools</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${mobileAccordion === 'services' ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileAccordion === 'services' && (
                <div className="p-2 space-y-1 bg-white">
                  <Link
                    to="/service-booking"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium"
                  >
                    Book a Service
                  </Link>
                  <Link
                    to="/emi-calculator"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium"
                  >
                    EMI Calculator
                  </Link>
                  <Link
                    to="/find-your-perfect-bike"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium"
                  >
                    Find Your Perfect Bike
                  </Link>
                  <Link
                    to="/test-ride"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium"
                  >
                    Book Test Ride
                  </Link>
                  <Link
                    to="/trade-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium"
                  >
                    Old Bike Trade-In
                  </Link>
                </div>
              )}
            </div>

            <Link
              to="/branches"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-base font-semibold text-[#111214] hover:bg-[#F5F5F6]"
            >
              Find a Dealer / Branches
            </Link>
            <Link
              to="/news"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-base font-semibold text-[#111214] hover:bg-[#F5F5F6]"
            >
              News &amp; Updates
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-base font-semibold text-[#111214] hover:bg-[#F5F5F6]"
            >
              Contact
            </Link>
          </div>

          <div className="p-4 border-t border-[#E3E4E7] grid grid-cols-2 gap-3 bg-[#F5F5F6]">
            <Link to={isStaff ? '/admin' : user ? '/account' : '/login'} onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full min-h-[44px]">
                {isStaff ? 'Admin Panel' : user ? 'My Account' : 'Login / Register'}
              </Button>
            </Link>
            <Link to="/cart" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full min-h-[44px]">Cart ({itemCount})</Button>
            </Link>
          </div>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Sticky Compare Tray when bikes are queued */}
      {compareIds.length > 0 && location.pathname !== '/compare' && (
        <div className="fixed bottom-16 lg:bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-xl border border-[#26282C] bg-[#111214] px-4 py-2.5 text-white shadow-xl">
          <GitCompareArrows className="h-4 w-4 text-[#D71920]" />
          <span className="text-xs font-medium tabular-nums">
            {compareIds.length} bike{compareIds.length > 1 ? 's' : ''} selected
          </span>
          <Link to="/compare">
            <Button size="sm">Compare Now</Button>
          </Link>
        </div>
      )}

      {/* Desktop floating WhatsApp quick action */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="hidden lg:inline-flex fixed bottom-5 right-5 z-30 items-center gap-2 rounded-lg border border-[#1E8E4E]/30 bg-[#1E8E4E] px-4 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-[#17723E] transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp Showroom
      </a>

      {/* Mobile sticky Call / WhatsApp / Book bar (>=44px touch targets) */}
      <div className="lg:hidden sticky bottom-0 z-30 border-t border-[#E3E4E7] bg-white px-3 py-2 grid grid-cols-3 gap-2">
        <a
          href={`tel:${settings.contact_phone}`}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#E3E4E7] text-xs font-semibold text-[#111214]"
        >
          <Phone className="h-4 w-4" />
          Call
        </a>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-[#1E8E4E] text-xs font-semibold text-white"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <Link
          to="/bikes"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#D71920] text-xs font-semibold text-white"
        >
          Book Bike
        </Link>
      </div>

      {/* Section 12: Multi-Column Dark Charcoal Footer */}
      <footer className="bg-[#111214] text-white border-t border-[#26282C]">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Logo variant="mono-light" height={42} />
            <p className="text-sm text-[#E3E4E7]/75 leading-relaxed max-w-sm">
              {settings.legal_business_name}
            </p>
            <div className="text-xs text-[#E3E4E7]/70 space-y-1 tabular-nums">
              <p>{settings.business_hours}</p>
              <p>
                <a href={`tel:${settings.contact_phone}`} className="hover:text-white">
                  {settings.contact_phone}
                </a>{' '}
                · {settings.contact_email}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {settings.social_links?.facebook && (
                <a
                  href={settings.social_links.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-[#D71920] text-white/80 hover:text-white transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {settings.social_links?.instagram && (
                <a
                  href={settings.social_links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-[#D71920] text-white/80 hover:text-white transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {settings.social_links?.youtube && (
                <a
                  href={settings.social_links.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-[#D71920] text-white/80 hover:text-white transition-colors"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              )}
              {settings.social_links?.tiktok && (
                <a
                  href={settings.social_links.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-[#D71920] text-white/80 hover:text-white transition-colors"
                >
                  <TikTokIcon className="h-4 w-4" />
                </a>
              )}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-[#1E8E4E]/80 hover:bg-[#1E8E4E] text-white transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Products</h4>
            <ul className="space-y-2 text-sm text-[#E3E4E7]/75">
              {bikes.slice(0, 4).map((b) => (
                <li key={b.id}>
                  <Link to={`/bikes/${b.slug}`} className="hover:text-white transition-colors">
                    {b.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/bikes" className="hover:text-white transition-colors">
                  All Motorcycles
                </Link>
              </li>
              <li>
                <Link to="/accessories?category=genuine-parts" className="hover:text-white transition-colors">
                  Spare Parts &amp; Gear
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Services</h4>
            <ul className="space-y-2 text-sm text-[#E3E4E7]/75">
              <li><Link to="/service-booking" className="hover:text-white transition-colors">Book a Service</Link></li>
              <li><Link to="/emi-calculator" className="hover:text-white transition-colors">EMI Calculator</Link></li>
              <li><Link to="/test-ride" className="hover:text-white transition-colors">Book Test Ride</Link></li>
              <li><Link to="/trade-in" className="hover:text-white transition-colors">Old Bike Trade-In</Link></li>
              <li><Link to="/find-your-perfect-bike" className="hover:text-white transition-colors">Perfect Bike Finder</Link></li>
            </ul>
          </div>

          {/* Showroom & Media */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Showroom</h4>
            <ul className="space-y-2 text-sm text-[#E3E4E7]/75">
              <li><Link to="/about" className="hover:text-white transition-colors">About Showroom</Link></li>
              <li><Link to="/branches" className="hover:text-white transition-colors">Dealers &amp; Branches</Link></li>
              <li><Link to="/news" className="hover:text-white transition-colors">News &amp; Updates</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQs</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Policies</h4>
            <ul className="space-y-2 text-sm text-[#E3E4E7]/75">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link to="/return-policy" className="hover:text-white transition-colors">Return Policy</Link></li>
              <li><Link to="/warranty-service-policy" className="hover:text-white transition-colors">Warranty &amp; Service</Link></li>
              <li><Link to="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#26282C] bg-[#0B0C0E]">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-[#E3E4E7]/65">
            <div className="space-y-1">
              <p className="font-medium text-white/80">
                &copy; {brandName} {new Date().getFullYear()}. All rights reserved.
              </p>
              <p>{settings.price_disclaimer_text}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span>{settings.contact_phone}</span>
              <Link to="/admin/login" className="hover:text-white transition-colors">
                Staff Portal
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
