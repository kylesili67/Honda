import { useEffect, useState } from 'react';

/**
 * Thin red scroll progress bar pinned to the top of the viewport.
 */
export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
      setProgress(Math.min(100, Math.max(0, (scrollTop / max) * 100)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-[#D71920] via-[#FF3B42] to-[#D71920] transition-[width] duration-75 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/**
 * Signature Speedometer-Arc SVG section divider.
 */
export function SpeedometerArcDivider({
  tone = 'light',
  className = '',
}: {
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const strokeMuted = tone === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(17,18,20,0.12)';
  return (
    <div aria-hidden="true" className={`w-full overflow-hidden flex justify-center ${className}`}>
      <svg
        viewBox="0 0 1200 32"
        fill="none"
        className="w-full max-w-[1280px] h-7"
        preserveAspectRatio="none"
      >
        <path
          d="M 40 28 Q 600 -10 1160 28"
          stroke={strokeMuted}
          strokeWidth="1.25"
          fill="none"
        />
        <path
          d="M 460 12 Q 600 4 740 12"
          stroke="#D71920"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="600" cy="8" r="3" fill="#D71920" />
      </svg>
    </div>
  );
}

/**
 * Road-line / dashed-center-line section separator.
 */
export function RoadLineSeparator({
  tone = 'light',
  className = '',
}: {
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const borderClass = tone === 'dark' ? 'border-white/15' : 'border-[#111214]/15';
  return (
    <div aria-hidden="true" className={`mx-auto max-w-[1280px] px-4 sm:px-6 ${className}`}>
      <div className="flex items-center gap-3">
        <span className={`h-px flex-1 border-t border-dashed ${borderClass}`} />
        <span className="h-1.5 w-8 rounded-full bg-[#D71920]" />
        <span className={`h-px flex-1 border-t border-dashed ${borderClass}`} />
      </div>
    </div>
  );
}

/**
 * Branded rotating motorcycle wheel/spoke loader.
 */
export function WheelSpokeLoader({ label = 'Loading showroom...' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-20 gap-4 text-[#6B7078]"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="h-12 w-12 night-wheel-spin"
      >
        <circle cx="32" cy="32" r="26" stroke="#111214" strokeWidth="4.5" />
        <circle cx="32" cy="32" r="20" stroke="#D71920" strokeWidth="1.5" strokeDasharray="16 10" />
        <line x1="32" y1="12" x2="32" y2="52" stroke="#26282C" strokeWidth="2" />
        <line x1="12" y1="32" x2="52" y2="32" stroke="#26282C" strokeWidth="2" />
        <line x1="17.8" y1="17.8" x2="46.2" y2="46.2" stroke="#26282C" strokeWidth="2" />
        <line x1="46.2" y1="17.8" x2="17.8" y2="46.2" stroke="#26282C" strokeWidth="2" />
        <circle cx="32" cy="32" r="5" fill="#D71920" />
      </svg>
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#26282C]">
        {label}
      </span>
    </div>
  );
}

/**
 * Animated road-silhouette strip for the dark charcoal footer.
 */
export function FooterRoadStrip() {
  return (
    <div
      aria-hidden="true"
      className="relative h-7 w-full overflow-hidden border-t border-white/10 bg-[#0D0E10]"
    >
      <div className="footer-road-dashes absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 opacity-60" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-24 bg-[#D71920]/70 blur-[1px]" />
    </div>
  );
}
