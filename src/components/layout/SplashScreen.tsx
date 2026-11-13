import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { SPLASH_CONFIG } from '../../lib/constants';
import { Logo } from '../brand/Logo';

function readSplashSeen(): boolean {
  try {
    return window.sessionStorage.getItem(SPLASH_CONFIG.STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markSplashSeen(): void {
  try {
    window.sessionStorage.setItem(SPLASH_CONFIG.STORAGE_KEY, '1');
  } catch {
    // Ignore storage failures in private browsing or restricted contexts
  }
}

function checkReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const SPEED_LINES = [
  { top: '18%', width: '160px', delay: '0s', dur: '1.25s', opacity: 0.28 },
  { top: '31%', width: '240px', delay: '0.18s', dur: '1.1s', opacity: 0.2 },
  { top: '44%', width: '190px', delay: '0.08s', dur: '1.35s', opacity: 0.32 },
  { top: '57%', width: '280px', delay: '0.26s', dur: '1.05s', opacity: 0.24 },
  { top: '69%', width: '140px', delay: '0.12s', dur: '1.4s', opacity: 0.18 },
];

export function SplashScreen() {
  const { pathname } = useLocation();
  const { settings } = useSettings();

  const isAdminRoute = pathname.startsWith('/admin');
  const [reducedMotion] = useState<boolean>(() => checkReducedMotion());
  const [mounted, setMounted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (window.location.pathname.startsWith('/admin')) return false;
    return !readSplashSeen();
  });
  const [exiting, setExiting] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const dismissedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const brandName = (settings.brand_name || 'Honda').trim() || 'Honda';
  const showLogoImage = Boolean(settings.logo_url) && !logoFailed;

  const clearAllTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const dismissImmediately = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    markSplashSeen();
    clearAllTimers();
    setExiting(true);
    const unmountDelay = reducedMotion
      ? SPLASH_CONFIG.REDUCED_MOTION_EXIT_MS
      : SPLASH_CONFIG.EXIT_DURATION_MS;
    const t = window.setTimeout(() => {
      setMounted(false);
    }, unmountDelay);
    timersRef.current.push(t);
  }, [clearAllTimers, reducedMotion]);

  // Ensure admin routes never display or lock scroll
  useEffect(() => {
    if (isAdminRoute && mounted) {
      clearAllTimers();
      setMounted(false);
    }
  }, [isAdminRoute, mounted, clearAllTimers]);

  // Body scroll lock while mounted & non-admin
  useEffect(() => {
    if (!mounted || isAdminRoute) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted, isAdminRoute]);

  // Timeline orchestration + hard 3.5s safety cap
  useEffect(() => {
    if (!mounted || isAdminRoute) return;
    markSplashSeen();

    if (reducedMotion) {
      const fadeTimer = window.setTimeout(() => {
        if (dismissedRef.current) return;
        dismissedRef.current = true;
        setExiting(true);
      }, SPLASH_CONFIG.REDUCED_MOTION_DURATION_MS);

      const unmountTimer = window.setTimeout(() => {
        setMounted(false);
      }, SPLASH_CONFIG.REDUCED_MOTION_DURATION_MS + SPLASH_CONFIG.REDUCED_MOTION_EXIT_MS);

      timersRef.current.push(fadeTimer, unmountTimer);
      return clearAllTimers;
    }

    const exitStartTimer = window.setTimeout(() => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      setExiting(true);
    }, SPLASH_CONFIG.TIMELINE_END_MS);

    const unmountTimer = window.setTimeout(() => {
      setMounted(false);
    }, SPLASH_CONFIG.TIMELINE_END_MS + SPLASH_CONFIG.EXIT_DURATION_MS);

    // Hard safety cap so splash never exceeds 3.5s even under main-thread pressure
    const hardCapTimer = window.setTimeout(() => {
      setMounted(false);
    }, SPLASH_CONFIG.MAX_DURATION_MS);

    timersRef.current.push(exitStartTimer, unmountTimer, hardCapTimer);
    return clearAllTimers;
  }, [mounted, isAdminRoute, reducedMotion, clearAllTimers]);

  // Keyboard Skip handler (Esc or Enter)
  useEffect(() => {
    if (!mounted || isAdminRoute) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        dismissImmediately();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mounted, isAdminRoute, dismissImmediately]);

  if (!mounted || isAdminRoute) return null;

  // Reduced-motion simplified presentation
  if (reducedMotion) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={`Loading ${brandName}`}
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6 transition-opacity duration-200 ${
          exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          background: 'linear-gradient(160deg, var(--color-ink) 0%, var(--color-charcoal) 100%)',
        }}
      >
        <span className="sr-only">Loading {brandName}</span>
        <div className="text-center max-w-md flex flex-col items-center">
          <Logo variant="mono-light" height={46} to={null} />
          <div
            className="mx-auto mt-3 h-[2px] w-24"
            style={{ backgroundColor: 'var(--color-accent)' }}
            aria-hidden="true"
          />
          <p className="mt-4 text-xs sm:text-sm uppercase tracking-[0.22em] text-white/75">
            {SPLASH_CONFIG.TAGLINE}
          </p>
        </div>

        <button
          type="button"
          onClick={dismissImmediately}
          className="fixed bottom-6 right-6 text-xs font-medium uppercase tracking-widest text-white/65 hover:text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded px-2 py-1 cursor-pointer"
        >
          Skip
        </button>
      </div>
    );
  }

  const letters = Array.from(brandName.toUpperCase());

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${brandName}`}
      className={`fixed inset-0 z-[100] overflow-hidden select-none ${
        exiting ? 'pointer-events-none' : ''
      }`}
    >
      <span className="sr-only">Loading {brandName}</span>

      {/* Top Curtain Half (seamless #111214 -> #1B1D20) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1/2 will-change-transform transition-transform duration-[600ms] ease-[cubic-bezier(0.76,0,0.24,1)]"
        style={{
          background: 'linear-gradient(180deg, var(--color-ink) 0%, #1B1D20 100%)',
          transform: exiting ? 'translate3d(0, -100%, 0)' : 'translate3d(0, 0, 0)',
        }}
      />

      {/* Bottom Curtain Half (seamless #1B1D20 -> #26282C) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 will-change-transform transition-transform duration-[600ms] ease-[cubic-bezier(0.76,0,0.24,1)]"
        style={{
          background: 'linear-gradient(180deg, #1B1D20 0%, var(--color-charcoal) 100%)',
          transform: exiting ? 'translate3d(0, 100%, 0)' : 'translate3d(0, 0, 0)',
        }}
      />

      {/* Center Stage Overlay (fades gently as curtains slide open) */}
      <div
        className={`relative z-10 flex h-full w-full flex-col items-center justify-center px-5 transition-opacity duration-300 ${
          exiting ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* 0.0s Ambient Red Showroom Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 42% at 50% 48%, rgba(215, 25, 32, 0.20) 0%, rgba(215, 25, 32, 0.05) 45%, transparent 72%)',
          }}
        />

        {/* 0.0s Subtle Horizontal Speed Lines */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {SPEED_LINES.map((line, i) => (
            <div
              key={i}
              className="splash-speedline absolute left-0 h-[1px]"
              style={
                {
                  top: line.top,
                  width: line.width,
                  opacity: line.opacity,
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 55%, rgba(215,25,32,0.85) 100%)',
                  '--speed-delay': line.delay,
                  '--speed-dur': line.dur,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* Main Animated Centerpiece */}
        <div className="relative flex w-full max-w-xl flex-col items-center">
          {/* Motorcycle Silhouette + Dust + Headlight Flash + Road */}
          <div aria-hidden="true" className="relative flex w-full flex-col items-center">
            <div className="splash-bike-enter relative flex items-center justify-center">
              {/* Motion dust streaks trailing rear wheel (0.5s - 1.2s) */}
              <div
                className="splash-dust absolute left-2 bottom-2 h-[2px] w-12 rounded-full bg-white/30"
                style={{ '--dust-delay': '540ms' } as React.CSSProperties}
              />
              <div
                className="splash-dust absolute left-4 bottom-4 h-[1.5px] w-9 rounded-full"
                style={
                  {
                    backgroundColor: 'rgba(215, 25, 32, 0.5)',
                    '--dust-delay': '640ms',
                  } as React.CSSProperties
                }
              />

              {/* Original Showroom Motorcycle Silhouette SVG */}
              <svg
                viewBox="0 0 280 116"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-[215px] sm:w-[270px] md:w-[300px] h-auto overflow-visible"
              >
                <defs>
                  <linearGradient id="splashBeamGrad" x1="0" y1="0.5" x2="1" y2="0.5">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                    <stop offset="35%" stopColor="#FFE4E5" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#D71920" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="splashTankGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#C9CCD1" />
                  </linearGradient>
                </defs>

                {/* Headlight Beam Flash (1.3s) */}
                <polygon
                  points="224,41 345,14 345,76 224,49"
                  fill="url(#splashBeamGrad)"
                  className="splash-headlight"
                />

                {/* Ground Shadow */}
                <ellipse cx="140" cy="108" rx="92" ry="4" fill="rgba(0,0,0,0.55)" />

                {/* Rear Wheel */}
                <g className="splash-wheel-rotate">
                  <circle cx="62" cy="84" r="22" stroke="#E4E6EB" strokeWidth="4.5" fill="#141518" />
                  <circle cx="62" cy="84" r="16" stroke="#6B7078" strokeWidth="1.2" />
                  <circle cx="62" cy="84" r="4" fill="#D71920" />
                  <line x1="62" y1="68" x2="62" y2="100" stroke="#9EA3AE" strokeWidth="1.4" />
                  <line x1="46" y1="84" x2="78" y2="84" stroke="#9EA3AE" strokeWidth="1.4" />
                  <line x1="51" y1="73" x2="73" y2="95" stroke="#9EA3AE" strokeWidth="1.2" />
                  <line x1="73" y1="73" x2="51" y2="95" stroke="#9EA3AE" strokeWidth="1.2" />
                </g>

                {/* Front Wheel */}
                <g className="splash-wheel-rotate">
                  <circle cx="214" cy="84" r="22" stroke="#E4E6EB" strokeWidth="4.5" fill="#141518" />
                  <circle cx="214" cy="84" r="16" stroke="#6B7078" strokeWidth="1.2" />
                  <circle cx="214" cy="84" r="9.5" stroke="#D71920" strokeWidth="1.4" strokeDasharray="10 4" />
                  <circle cx="214" cy="84" r="4" fill="#E4E6EB" />
                  <line x1="214" y1="68" x2="214" y2="100" stroke="#9EA3AE" strokeWidth="1.4" />
                  <line x1="198" y1="84" x2="230" y2="84" stroke="#9EA3AE" strokeWidth="1.4" />
                  <line x1="203" y1="73" x2="225" y2="95" stroke="#9EA3AE" strokeWidth="1.2" />
                  <line x1="225" y1="73" x2="203" y2="95" stroke="#9EA3AE" strokeWidth="1.2" />
                </g>

                {/* Swingarm & Exhaust */}
                <path
                  d="M62 84 L118 82 L128 66"
                  stroke="#9EA3AE"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M40 77 L116 88 L148 87 L166 69"
                  stroke="#C9CCD1"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Engine & Crankcase Block */}
                <path
                  d="M116 56 L160 54 L166 78 L122 80 Z"
                  fill="#26282C"
                  stroke="#9EA3AE"
                  strokeWidth="2"
                />
                <line x1="128" y1="62" x2="154" y2="62" stroke="#6B7078" strokeWidth="1.6" />
                <line x1="126" y1="68" x2="156" y2="68" stroke="#6B7078" strokeWidth="1.6" />

                {/* Rear Suspension Strut */}
                <line x1="76" y1="77" x2="96" y2="54" stroke="#D71920" strokeWidth="2.8" strokeLinecap="round" />

                {/* Front Fork & Fender */}
                <line x1="184" y1="30" x2="214" y2="84" stroke="#E4E6EB" strokeWidth="4" strokeLinecap="round" />
                <path d="M196 63 Q215 55 232 67" stroke="#D71920" strokeWidth="2.6" strokeLinecap="round" />

                {/* Tail, Seat & Sculpted Fuel Tank */}
                <path
                  d="M44 46 L86 48 L124 47 C134 34 156 29 180 33 L188 42 L166 54 L120 55 L74 52 Z"
                  fill="url(#splashTankGrad)"
                />
                {/* Accent Trim Stripe */}
                <path
                  d="M128 45 L178 39"
                  stroke="#D71920"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Handlebars & Front Cowl */}
                <path
                  d="M174 27 L186 24 L196 31"
                  stroke="#E4E6EB"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M188 33 L218 37 L224 46 L194 49 Z"
                  fill="#E4E6EB"
                />
                {/* Headlight Lens */}
                <ellipse cx="222" cy="43" rx="3.2" ry="4.5" fill="#FFFFFF" />
              </svg>
            </div>

            {/* 0.3s Road / Horizon Line + Scrolling Dashed Center Line */}
            <div className="splash-road-line relative w-full max-w-md">
              <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-white/55 to-transparent" />
              <div className="splash-road-dashes mt-1.5 h-[1.5px] w-full opacity-75" />
            </div>
          </div>

          {/* 1.4s Brand Wordmark (or Admin Logo URL) + Red Underline Sweep */}
          <div className="mt-7 flex flex-col items-center text-center">
            {showLogoImage ? (
              <div className="splash-tagline" style={{ animationDelay: '1400ms' }}>
                <img
                  src={settings.logo_url!}
                  alt={brandName}
                  onError={() => setLogoFailed(true)}
                  className="h-12 sm:h-16 w-auto object-contain"
                />
              </div>
            ) : (
              <>
                <div className="splash-tagline mb-2.5" style={{ animationDelay: '1320ms' }}>
                  <Logo variant="mono-light" showWordmark={false} height={42} to={null} />
                </div>
                <div
                aria-hidden="true"
                className="font-display text-4xl sm:text-6xl font-bold uppercase tracking-[0.28em] sm:tracking-[0.36em] text-white pl-[0.28em] sm:pl-[0.36em]"
              >
                {letters.map((char, idx) => (
                  <span
                    key={`${char}-${idx}`}
                    className="splash-letter"
                    style={
                      {
                        '--letter-delay': `${1400 + idx * 75}ms`,
                      } as React.CSSProperties
                    }
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
                </div>
              </>
            )}

            {/* Red Underline Sweep */}
            <div
              aria-hidden="true"
              className="splash-underline mt-3 h-[2.5px] w-28 sm:w-36 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />

            {/* 2.0s Tagline Fade-Up */}
            <p className="splash-tagline mt-4 text-xs sm:text-sm font-medium uppercase tracking-[0.24em] text-white/75">
              {SPLASH_CONFIG.TAGLINE}
            </p>
          </div>
        </div>
      </div>

      {/* 2.0s - 2.8s Thin Bottom Red Progress Bar */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/10 transition-opacity duration-200 ${
          exiting ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div
          className="splash-progress h-full w-full shadow-[0_0_12px_rgba(215,25,32,0.8)]"
          style={{ backgroundColor: 'var(--color-accent)' }}
        />
      </div>

      {/* Bottom-Right Skip Text Link */}
      <button
        type="button"
        onClick={dismissImmediately}
        className={`fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30 text-xs font-medium uppercase tracking-[0.2em] text-white/65 hover:text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded px-2 py-1 transition-opacity duration-200 cursor-pointer ${
          exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        Skip
      </button>
    </div>
  );
}
