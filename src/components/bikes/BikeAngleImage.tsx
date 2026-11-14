import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Bike, RotateCw } from 'lucide-react';
import type { BikeImage, BikeViewAngle } from '../../types/database';

export type BikeAngleImageItem = Pick<
  BikeImage,
  'id' | 'url' | 'alt_text' | 'color_id' | 'is_primary' | 'sort_order' | 'view_angle'
>;

export interface BikeAngleImageProps {
  images?: BikeAngleImageItem[] | null;
  fallbackSrc?: string | null;
  alt: string;
  colorId?: string | null;
  holdDelayMs?: number;
  stepMs?: number;
  aspectRatio?: '4/3' | '16/10' | '16/9' | 'square' | string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  interactive?: boolean;
  enableGroupZoom?: boolean;
}

const ANGLE_ORDER: BikeViewAngle[] = ['front', 'right', 'back', 'left'];

const ANGLE_LABELS: Record<BikeViewAngle, string> = {
  front: 'Front',
  right: 'Right',
  back: 'Back',
  left: 'Left',
};

const ASPECT_CLASS_MAP: Record<string, string> = {
  '4/3': 'aspect-[4/3]',
  '16/10': 'aspect-[16/10]',
  '16/9': 'aspect-[16/9]',
  square: 'aspect-square',
};

const SAME_URL_ANGLE_FRAMING: Record<BikeViewAngle, string> = {
  front: 'scale-100 object-center',
  right: 'scale-[1.18] object-[82%_55%]',
  back: 'scale-[1.24] object-[18%_45%]',
  left: 'scale-x-[-1.12] scale-y-[1.12] object-center',
};

// Module-level coordinator ensures at most one bike card rotates at a time
let currentActiveCardId: string | null = null;
const activeStopListeners = new Map<string, () => void>();

function claimActiveCard(id: string): void {
  currentActiveCardId = id;
  activeStopListeners.forEach((stopFn, listenerId) => {
    if (listenerId !== id) {
      stopFn();
    }
  });
}

function releaseActiveCard(id: string): void {
  if (currentActiveCardId === id) {
    currentActiveCardId = null;
  }
}

interface ResolvedAngleFrame {
  angle: BikeViewAngle;
  image: BikeAngleImageItem;
}

function resolveAngleFrames(
  images: BikeAngleImageItem[] | null | undefined,
  colorId: string | null | undefined,
  fallbackSrc: string | null | undefined,
  alt: string,
  failedIds: Set<string>
): ResolvedAngleFrame[] {
  const validPool = (images ?? [])
    .filter((img) => Boolean(img.url) && !failedIds.has(img.id))
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  let selectedPool: BikeAngleImageItem[] = [];

  if (validPool.length > 0) {
    if (colorId) {
      const colorMatches = validPool.filter((i) => i.color_id === colorId);
      if (colorMatches.length > 0) {
        selectedPool = colorMatches;
      } else {
        const primaryItem = validPool.find((i) => i.is_primary) ?? validPool[0];
        selectedPool = primaryItem?.color_id
          ? validPool.filter((i) => i.color_id === primaryItem.color_id || !i.color_id)
          : validPool;
      }
    } else {
      const primaryItem = validPool.find((i) => i.is_primary) ?? validPool[0];
      selectedPool = primaryItem?.color_id
        ? validPool.filter((i) => i.color_id === primaryItem.color_id || !i.color_id)
        : validPool;
    }

    if (selectedPool.length === 0) {
      selectedPool = validPool;
    }
  }

  const slotMap = new Map<BikeViewAngle, BikeAngleImageItem>();

  for (const item of selectedPool) {
    const angle = item.view_angle;
    if (angle && ANGLE_ORDER.includes(angle)) {
      const prev = slotMap.get(angle);
      if (!prev || (!prev.is_primary && item.is_primary)) {
        slotMap.set(angle, item);
      }
    }
  }

  if (!slotMap.has('front') && selectedPool.length > 0) {
    const frontCandidate =
      selectedPool.find((i) => i.is_primary && !i.view_angle) ??
      selectedPool.find((i) => !i.view_angle) ??
      selectedPool.find((i) => i.is_primary) ??
      selectedPool[0];
    if (frontCandidate) {
      slotMap.set('front', frontCandidate);
    }
  }

  const frames: ResolvedAngleFrame[] = ANGLE_ORDER.filter((a) => slotMap.has(a)).map((a) => ({
    angle: a,
    image: slotMap.get(a)!,
  }));

  if (frames.length === 0 && fallbackSrc && !failedIds.has('__fallback__')) {
    frames.push({
      angle: 'front',
      image: {
        id: '__fallback__',
        url: fallbackSrc,
        alt_text: alt,
        color_id: null,
        is_primary: true,
        sort_order: 1,
        view_angle: 'front',
      },
    });
  }

  return frames;
}

export function BikeAngleImage({
  images,
  fallbackSrc = null,
  alt,
  colorId = null,
  holdDelayMs = 2000,
  stepMs = 1200,
  aspectRatio = '4/3',
  className = '',
  imgClassName = '',
  priority = false,
  width = 1200,
  height = 900,
  interactive = true,
  enableGroupZoom = true,
}: BikeAngleImageProps) {
  const instanceId = useId();
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [preloadArmed, setPreloadArmed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const holdTimerRef = useRef<number | null>(null);
  const stepTimerRef = useRef<number | null>(null);
  const touchHoldTimerRef = useRef<number | null>(null);
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);
  const touchPressActiveRef = useRef(false);
  const preloadedUrlsRef = useRef<Set<string>>(new Set());
  const hasInteractedRef = useRef(false);

  const frames = useMemo(
    () => resolveAngleFrames(images, colorId, fallbackSrc, alt, failedIds),
    [images, colorId, fallbackSrc, alt, failedIds]
  );

  const canRotate = interactive && frames.length > 1;
  const safeIndex = frames.length > 0 ? activeIndex % frames.length : 0;
  const activeFrame = frames[safeIndex];

  const allSameUrl = useMemo(
    () => frames.length > 1 && frames.every((frame) => frame.image.url === frames[0].image.url),
    [frames]
  );

  const availableAngles = useMemo(() => new Set(frames.map((f) => f.angle)), [frames]);

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (stepTimerRef.current !== null) {
      window.clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
    if (touchHoldTimerRef.current !== null) {
      window.clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
  }, []);

  const stopAndReset = useCallback(() => {
    clearTimers();
    touchOriginRef.current = null;
    touchPressActiveRef.current = false;
    setIsHolding(false);
    setIsRotating(false);
    setIsPinned(false);
    setActiveIndex(0);
    releaseActiveCard(instanceId);
  }, [clearTimers, instanceId]);

  const preloadAllAngles = useCallback(() => {
    setPreloadArmed(true);
    if (typeof Image === 'undefined') return;
    for (const frame of frames) {
      const url = frame.image.url;
      if (url && !preloadedUrlsRef.current.has(url)) {
        preloadedUrlsRef.current.add(url);
        const preloader = new Image();
        preloader.referrerPolicy = 'no-referrer';
        preloader.src = url;
      }
    }
  }, [frames]);

  const startRotation = useCallback(
    (pinned = false) => {
      if (!canRotate) return;
      clearTimers();
      preloadAllAngles();
      claimActiveCard(instanceId);
      hasInteractedRef.current = true;
      setIsHolding(false);
      setIsRotating(true);
      setIsPinned(pinned);

      if (prefersReducedMotion) {
        setActiveIndex((prev) => (prev + 1) % frames.length);
        return;
      }

      // Immediately show next angle when rotation engages after the hold delay or toggle click
      setActiveIndex((prev) => (prev === 0 ? 1 : (prev + 1) % frames.length));
      stepTimerRef.current = window.setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % frames.length);
      }, stepMs);
    },
    [canRotate, clearTimers, frames.length, instanceId, preloadAllAngles, prefersReducedMotion, stepMs]
  );

  // Sync reduced motion media query
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Register with global single-active-card coordinator & clean up timers on unmount
  useEffect(() => {
    activeStopListeners.set(instanceId, stopAndReset);
    return () => {
      activeStopListeners.delete(instanceId);
      releaseActiveCard(instanceId);
      clearTimers();
    };
  }, [instanceId, stopAndReset, clearTimers]);

  // Reset cleanly if color or available frames change
  useEffect(() => {
    stopAndReset();
  }, [colorId, stopAndReset]);

  useEffect(() => {
    if (!canRotate) {
      clearTimers();
      setIsHolding(false);
      setIsRotating(false);
      setIsPinned(false);
      setActiveIndex(0);
    }
  }, [canRotate, clearTimers]);

  // Announce active angle to screen readers only during active rotation or manual switching
  useEffect(() => {
    if (!hasInteractedRef.current || !activeFrame) return;
    if (isRotating || isPinned || prefersReducedMotion) {
      setAnnouncement(`${alt} — ${ANGLE_LABELS[activeFrame.angle]} view`);
    }
  }, [activeFrame, alt, isPinned, isRotating, prefersReducedMotion]);

  const scheduleHoverHold = () => {
    if (!canRotate || prefersReducedMotion || isRotating) return;
    preloadAllAngles();
    clearTimers();
    setIsHolding(true);
    holdTimerRef.current = window.setTimeout(() => {
      startRotation(false);
    }, holdDelayMs);
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      stopAndReset();
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!canRotate || prefersReducedMotion) return;
    const touch = e.touches[0];
    if (!touch) return;
    preloadAllAngles();
    touchOriginRef.current = { x: touch.clientX, y: touch.clientY };
    touchPressActiveRef.current = false;
    if (touchHoldTimerRef.current !== null) {
      window.clearTimeout(touchHoldTimerRef.current);
    }
    touchHoldTimerRef.current = window.setTimeout(() => {
      touchPressActiveRef.current = true;
      startRotation(false);
    }, 600);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const origin = touchOriginRef.current;
    const touch = e.touches[0];
    if (!origin || !touch) return;
    const distance = Math.hypot(touch.clientX - origin.x, touch.clientY - origin.y);
    if (distance > 10) {
      // Cancel long-press immediately so scrolling or carousel swiping never conflicts
      if (touchHoldTimerRef.current !== null) {
        window.clearTimeout(touchHoldTimerRef.current);
        touchHoldTimerRef.current = null;
      }
      touchOriginRef.current = null;
    }
  };

  const handleTouchEndOrCancel = () => {
    if (touchHoldTimerRef.current !== null) {
      window.clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
    touchOriginRef.current = null;
    if (touchPressActiveRef.current && !isPinned) {
      stopAndReset();
    }
    touchPressActiveRef.current = false;
  };

  const handleFocusCapture = () => {
    if (!canRotate || prefersReducedMotion || isRotating) return;
    preloadAllAngles();
    clearTimers();
    setIsHolding(true);
    holdTimerRef.current = window.setTimeout(() => {
      startRotation(false);
    }, holdDelayMs);
  };

  const handleBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      stopAndReset();
    }
  };

  const handleToggleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canRotate) return;

    if (prefersReducedMotion) {
      preloadAllAngles();
      claimActiveCard(instanceId);
      hasInteractedRef.current = true;
      setIsPinned(true);
      setActiveIndex((prev) => (prev + 1) % frames.length);
      return;
    }

    if (isRotating) {
      stopAndReset();
    } else {
      startRotation(true);
    }
  };

  const handleSelectAngle = (e: React.MouseEvent<HTMLButtonElement>, angle: BikeViewAngle) => {
    e.preventDefault();
    e.stopPropagation();
    const targetIdx = frames.findIndex((f) => f.angle === angle);
    if (targetIdx === -1) return;
    clearTimers();
    preloadAllAngles();
    claimActiveCard(instanceId);
    hasInteractedRef.current = true;
    setIsHolding(false);
    setIsRotating(false);
    setIsPinned(true);
    setActiveIndex(targetIdx);
  };

  const handleImageError = (imageId: string) => {
    setFailedIds((prev) => {
      if (prev.has(imageId)) return prev;
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  };

  const aspectClass = ASPECT_CLASS_MAP[aspectRatio] ?? 'aspect-[4/3]';

  if (frames.length === 0) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-[#F5F5F6] text-[#6B7078] overflow-hidden ${aspectClass} ${className}`}
        role="img"
        aria-label={alt}
      >
        <Bike className="h-9 w-9 stroke-[1.5] text-[#6B7078]/60" />
        <span className="mt-2 px-3 text-center text-xs font-medium text-[#6B7078] line-clamp-1">
          {alt}
        </span>
      </div>
    );
  }

  // On initial load render ONLY the front frame; render remaining frames once interaction preloads them
  const renderedFrames = preloadArmed ? frames : [frames[0]];
  const showOverlayBar = canRotate && (isRotating || isPinned || prefersReducedMotion);
  const shouldZoomOnHover = enableGroupZoom && !isRotating && !isHolding && !isPinned;

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#F5F5F6] select-none ${aspectClass} ${className}`}
      onMouseEnter={scheduleHoverHold}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEndOrCancel}
      onTouchCancel={handleTouchEndOrCancel}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      {renderedFrames.map((frame) => {
        const isCurrent = activeFrame?.angle === frame.angle;
        const framingClass = allSameUrl ? SAME_URL_ANGLE_FRAMING[frame.angle] : 'object-center';

        return (
          <img
            key={`${frame.angle}-${frame.image.id}`}
            src={frame.image.url}
            alt={frame.image.alt_text || `${alt} — ${ANGLE_LABELS[frame.angle]} view`}
            width={width}
            height={height}
            loading={priority && frame.angle === 'front' ? 'eager' : 'lazy'}
            fetchPriority={priority && frame.angle === 'front' ? 'high' : undefined}
            referrerPolicy="no-referrer"
            onError={() => handleImageError(frame.image.id)}
            className={`absolute inset-0 h-full w-full object-cover ${framingClass} ${
              prefersReducedMotion ? 'transition-none' : 'transition-all duration-300 ease-in-out'
            } ${shouldZoomOnHover ? 'group-hover:scale-[1.04]' : ''} ${
              isCurrent ? 'opacity-100 z-[1]' : 'opacity-0 pointer-events-none z-0'
            } ${imgClassName}`}
          />
        );
      })}

      {/* 2-second hold progress indicator along bottom edge */}
      {isHolding && !isRotating && !prefersReducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-0.5 bg-[#111214]/15"
        >
          <div
            className="h-full bg-[#D71920]"
            style={{
              animation: `bikeHoldFill ${holdDelayMs}ms linear forwards`,
            }}
          />
        </div>
      )}

      {/* Corner 360° Toggle Button (touch-safe, does not hijack card navigation) */}
      {canRotate && (
        <button
          type="button"
          aria-label="Rotate bike view"
          aria-pressed={isRotating}
          title={prefersReducedMotion ? 'Cycle bike view angle' : isRotating ? 'Stop 360° rotation' : 'Preview 360° angles'}
          onClick={handleToggleButtonClick}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseEnter={(e) => e.stopPropagation()}
          className={`absolute top-2.5 right-2.5 z-20 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide transition-colors cursor-pointer min-h-[32px] backdrop-blur-sm ${
            isRotating || isPinned
              ? 'bg-[#D71920] text-white shadow-sm'
              : 'bg-[#111214]/65 text-white/95 hover:bg-[#111214]'
          }`}
        >
          <RotateCw className={`h-3 w-3 ${isRotating && !prefersReducedMotion ? 'animate-spin' : ''}`} />
          <span>360°</span>
        </button>
      )}

      {/* Active Angle Label & 4-Dot Indicator */}
      {showOverlayBar && activeFrame && (
        <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 flex items-center justify-between gap-2">
          <span className="rounded-md bg-[#111214]/75 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white backdrop-blur-sm">
            {ANGLE_LABELS[activeFrame.angle]}
          </span>

          <div
            className="pointer-events-auto flex items-center gap-1.5 rounded-md bg-[#111214]/70 px-2 py-1 backdrop-blur-sm"
            role="group"
            aria-label="Bike view angles"
            onTouchStart={(e) => e.stopPropagation()}
          >
            {ANGLE_ORDER.map((angle) => {
              const isAvailable = availableAngles.has(angle);
              const isActive = activeFrame.angle === angle;
              return (
                <button
                  key={angle}
                  type="button"
                  disabled={!isAvailable}
                  aria-label={`${ANGLE_LABELS[angle]} view`}
                  aria-current={isActive ? 'true' : undefined}
                  title={isAvailable ? `${ANGLE_LABELS[angle]} view` : `${ANGLE_LABELS[angle]} view unavailable`}
                  onClick={(e) => handleSelectAngle(e, angle)}
                  className={`h-2 rounded-full transition-all ${
                    !isAvailable
                      ? 'w-2 bg-white/25 cursor-not-allowed'
                      : isActive
                        ? 'w-4 bg-[#D71920] cursor-pointer'
                        : 'w-2 bg-white/60 hover:bg-white cursor-pointer'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
