import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';

export type LogoVariant = 'full' | 'icon' | 'mono-light' | 'mono-dark';

export interface LogoProps {
  variant?: LogoVariant;
  height?: number;
  className?: string;
  to?: string | null;
  showSubtitle?: boolean;
  showWordmark?: boolean;
}

/**
 * Original speedometer/wheel inspired showroom emblem + wordmark.
 * Renders site_settings.logo_url when configured, falling back to this original inline SVG mark.
 */
export function Logo({
  variant = 'full',
  height = 38,
  className = '',
  to = '/',
  showSubtitle = true,
  showWordmark = true,
}: LogoProps) {
  const { settings } = useSettings();
  const [imgFailed, setImgFailed] = useState(false);

  const logoUrl = (settings.logo_url || '').trim();
  const brandName = (settings.brand_name || 'Honda').trim() || 'Honda';
  const subtitle = (settings.brand_subtitle ?? 'SHOWROOM').trim();

  useEffect(() => {
    setImgFailed(false);
  }, [logoUrl]);

  const clampedHeight = Math.max(24, Math.min(64, height));
  const isMonoLight = variant === 'mono-light';
  const isMonoDark = variant === 'mono-dark';
  const isIconOnly = variant === 'icon' || !showWordmark;

  const ringColor = isMonoLight ? '#FFFFFF' : '#111214';
  const trackColor = isMonoLight ? 'rgba(255,255,255,0.26)' : 'rgba(17,18,20,0.16)';
  const arcColor = isMonoLight ? '#FFFFFF' : isMonoDark ? '#111214' : '#D71920';
  const needleColor = isMonoLight ? '#FFFFFF' : '#111214';
  const hubColor = isMonoLight ? '#FFFFFF' : isMonoDark ? '#111214' : '#D71920';
  const wordColor = isMonoLight ? 'text-white' : 'text-[#111214]';
  const underlineColor = isMonoLight
    ? 'bg-white/60'
    : isMonoDark
      ? 'bg-[#111214]'
      : 'bg-[#D71920]';
  const subtitleColor = isMonoLight
    ? 'text-white/70'
    : isMonoDark
      ? 'text-[#111214]/75'
      : 'text-[#6B7078]';

  // Proportional sizing so logo stays crisp between 24px and 64px
  const wordSizePx = Math.round(clampedHeight * 0.56);
  const subSizePx = Math.max(8, Math.round(clampedHeight * 0.22));

  const content =
    logoUrl && !imgFailed ? (
      <img
        src={logoUrl}
        alt={brandName}
        onError={() => setImgFailed(true)}
        style={{ height: `${clampedHeight}px` }}
        className="w-auto max-w-[190px] object-contain"
      />
    ) : (
      <span className="inline-flex items-center gap-2.5 select-none">
        {/* Original Speedometer / Wheel Emblem (not an official manufacturer mark) */}
        <svg
          width={clampedHeight}
          height={clampedHeight}
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
          className="shrink-0 overflow-visible"
        >
          {/* Outer thin ring */}
          <circle cx="24" cy="24" r="21" stroke={ringColor} strokeWidth="2.2" />
          {/* Inner dial track */}
          <circle cx="24" cy="24" r="15.5" stroke={trackColor} strokeWidth="2.5" />
          {/* Subtle gauge ticks */}
          <path
            d="M11 33 L13.5 31 M9.5 22 L12.5 22.5 M16 11.5 L17.8 14 M28 10 L27 13 M37.5 18 L34.5 19.2"
            stroke={trackColor}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Speedometer sweep arc (animated gently on hover) */}
          <path
            d="M12.5 34.5 A15.5 15.5 0 1 1 35.5 13.5"
            stroke={arcColor}
            strokeWidth="3.2"
            strokeLinecap="round"
            className="transition-opacity duration-200 group-hover:opacity-90"
          />
          {/* Speed needle / slash with hover sweep */}
          <g className="origin-[24px_24px] transition-transform duration-300 ease-out group-hover:rotate-[16deg]">
            <path
              d="M24 24 L33.5 14.5"
              stroke={needleColor}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </g>
          {/* Center pivot */}
          <circle cx="24" cy="24" r="3" fill={hubColor} />
        </svg>

        {!isIconOnly && (
          <span className="flex flex-col justify-center leading-none">
            <span
              className={`font-display font-bold uppercase tracking-[0.18em] ${wordColor}`}
              style={{ fontSize: `${wordSizePx}px`, lineHeight: 0.96 }}
            >
              {brandName}
            </span>
            <span
              className={`mt-1 h-[2px] w-full rounded-full transition-transform duration-300 origin-left group-hover:scale-x-105 ${underlineColor}`}
            />
            {showSubtitle && subtitle && clampedHeight >= 28 && (
              <span
                className={`mt-1 font-semibold uppercase tracking-[0.28em] ${subtitleColor}`}
                style={{ fontSize: `${subSizePx}px`, lineHeight: 1 }}
              >
                {subtitle}
              </span>
            )}
          </span>
        )}
      </span>
    );

  if (to === null) {
    return (
      <span
        aria-label={`${brandName} showroom home`}
        className={`group inline-flex items-center shrink-0 ${className}`}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      to={to}
      aria-label={`${brandName} showroom home`}
      className={`group inline-flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D71920] focus-visible:ring-offset-2 rounded-md ${className}`}
    >
      {content}
    </Link>
  );
}
