import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bike, ChevronLeft, ChevronRight, Hand, Pause, Play } from 'lucide-react';
import type { BikeImage, BikeModel, BikeViewAngle } from '../../types/database';

export interface Bike360ViewerProps {
  frames: string[];
  alt: string;
  autoRotate?: boolean;
  secondsPerTurn?: number;
  dragSensitivity?: number;
  pauseOnHover?: boolean;
  className?: string;
  priority?: boolean;
  isActive?: boolean;
  frameLabels?: string[];
  fallbackSrc?: string | null;
  onLoaded?: () => void;
}

export interface ResolvedBike360Set {
  frames: string[];
  labels?: string[];
  mode: 'spin' | 'angles' | 'single';
}

const ANGLE_ORDER: BikeViewAngle[] = ['front', 'right', 'back', 'left'];
const ANGLE_LABELS: Record<BikeViewAngle, string> = {
  front: 'Front',
  right: 'Right',
  back: 'Back',
  left: 'Left',
};

/**
 * Resolves the best ordered frame list for a bike model & color:
 * 1. Dedicated 360° spin frames (`image_type === 'spin'`) sorted by `frame_index`.
 * 2. Multi-angle fallback (`view_angle` front -> right -> back -> left).
 * 3. Single primary/fallback image.
 */
export function resolveBike360Frames(
  bike: BikeModel | null | undefined,
  colorId?: string | null,
  fallbackSrc?: string | null
): ResolvedBike360Set {
  const allImages: BikeImage[] = (bike?.images ?? []).filter((img) => Boolean(img.url));
  const preferredColorId = colorId ?? bike?.colors?.[0]?.id ?? null;

  const filterByColor = (list: BikeImage[]): BikeImage[] => {
    if (!preferredColorId) return list;
    const exact = list.filter((i) => i.color_id === preferredColorId);
    if (exact.length > 0) return exact;
    const general = list.filter((i) => !i.color_id);
    return general.length > 0 ? general : list;
  };

  // 1. Dedicated spin sequence
  const allSpin = allImages.filter((i) => i.image_type === 'spin');
  const colorSpin = filterByColor(allSpin).sort(
    (a, b) => (a.frame_index ?? a.sort_order) - (b.frame_index ?? b.sort_order)
  );
  if (colorSpin.length >= 2) {
    return {
      frames: colorSpin.map((i) => i.url),
      mode: 'spin',
    };
  }

  // 2. Fallback to available view_angle frames (front -> right -> back -> left)
  const nonSpin = allImages.filter((i) => i.image_type !== 'spin');
  const colorPool = filterByColor(nonSpin).sort((a, b) => a.sort_order - b.sort_order);
  const slotMap = new Map<BikeViewAngle, BikeImage>();
  for (const img of colorPool) {
    if (img.view_angle && ANGLE_ORDER.includes(img.view_angle) && !slotMap.has(img.view_angle)) {
      slotMap.set(img.view_angle, img);
    }
  }
  const orderedAngles = ANGLE_ORDER.filter((a) => slotMap.has(a));
  if (orderedAngles.length >= 2) {
    return {
      frames: orderedAngles.map((a) => slotMap.get(a)!.url),
      labels: orderedAngles.map((a) => ANGLE_LABELS[a]),
      mode: 'angles',
    };
  }

  // 3. Single static image fallback
  const primary =
    colorPool.find((i) => i.is_primary)?.url ??
    colorPool[0]?.url ??
    allImages.find((i) => i.is_primary)?.url ??
    allImages[0]?.url ??
    fallbackSrc ??
    null;

  return {
    frames: primary ? [primary] : [],
    mode: 'single',
  };
}

const IDLE_RESUME_MS = 3000;

export function Bike360Viewer({
  frames,
  alt,
  autoRotate = true,
  secondsPerTurn = 14,
  dragSensitivity = 1,
  pauseOnHover = true,
  className = '',
  priority = false,
  isActive = true,
  frameLabels,
  fallbackSrc = null,
  onLoaded,
}: Bike360ViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const [loadedCount, setLoadedCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoRotate);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [isInView, setIsInView] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isSwitchingSet, setIsSwitchingSet] = useState(false);

  // Normalized rotation progress [0, 1) preserved across color/frame-set switches
  const progressRef = useRef(0);
  const velocityRef = useRef(0); // frames per second during inertia
  const idleUntilRef = useRef(0);
  const pointerDownRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; lastX: number; lastTime: number; lockedAxis: 'x' | 'y' | null } | null>(null);
  const prevFramesKeyRef = useRef('');

  const validFrames = useMemo(
    () => frames.filter((url) => Boolean(url) && !failedUrls.has(url)),
    [frames, failedUrls]
  );

  const validLabels = useMemo(() => {
    if (!frameLabels || frameLabels.length !== frames.length) return undefined;
    return frames
      .map((url, idx) => ({ url, label: frameLabels[idx] }))
      .filter((entry) => Boolean(entry.url) && !failedUrls.has(entry.url))
      .map((entry) => entry.label);
  }, [frames, frameLabels, failedUrls]);

  const frameCount = validFrames.length;
  const isMultiFrame = frameCount > 1;
  const isCrossfadeMode = frameCount > 1 && frameCount < 8;
  const framesKey = frames.join('|');

  // Preserve rotation progress & apply brief crossfade when switching color frame sets
  useEffect(() => {
    if (prevFramesKeyRef.current && prevFramesKeyRef.current !== framesKey) {
      setIsSwitchingSet(true);
      const nextIdx = frameCount > 0 ? Math.floor(progressRef.current * frameCount) % frameCount : 0;
      setCurrentIndex(nextIdx);
      const timer = window.setTimeout(() => setIsSwitchingSet(false), 240);
      prevFramesKeyRef.current = framesKey;
      return () => window.clearTimeout(timer);
    }
    prevFramesKeyRef.current = framesKey;
  }, [framesKey, frameCount]);

  // Sync autoRotate prop
  useEffect(() => {
    setIsPlaying(autoRotate);
  }, [autoRotate]);

  // Reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Pause when off-screen (IntersectionObserver)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        setIsInView(Boolean(entries[0]?.isIntersecting));
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pause when browser tab is hidden
  useEffect(() => {
    const onVisibility = () => setIsTabVisible(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Background preload all frames into Image cache
  useEffect(() => {
    if (frames.length <= 1) {
      setLoadedCount(frames.length);
      setIsReady(true);
      onLoadedRef.current?.();
      return;
    }

    let cancelled = false;
    const uniqueUrls = Array.from(new Set(frames.filter(Boolean)));
    const total = uniqueUrls.length;
    let done = 0;

    setLoadedCount(0);
    setIsReady(false);

    const markDone = () => {
      if (cancelled) return;
      done += 1;
      setLoadedCount(done);
      if (done >= total) {
        setIsReady(true);
        onLoadedRef.current?.();
      }
    };

    for (const url of uniqueUrls) {
      const cached = cacheRef.current.get(url);
      if (cached && cached.complete && cached.naturalWidth > 0) {
        markDone();
        continue;
      }
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.onload = () => {
        cacheRef.current.set(url, img);
        markDone();
      };
      img.onerror = () => {
        if (!cancelled) {
          setFailedUrls((prev) => {
            if (prev.has(url)) return prev;
            const next = new Set(prev);
            next.add(url);
            return next;
          });
        }
        markDone();
      };
      img.src = url;
    }

    return () => {
      cancelled = true;
    };
  }, [framesKey, frames]);

  const setFrameIndexSafe = useCallback(
    (nextIndex: number) => {
      if (frameCount <= 0) return;
      const wrapped = ((nextIndex % frameCount) + frameCount) % frameCount;
      progressRef.current = wrapped / frameCount;
      setCurrentIndex(wrapped);
    },
    [frameCount]
  );

  const stepFrame = useCallback(
    (delta: number) => {
      if (!isMultiFrame || !isReady) return;
      setShowHint(false);
      velocityRef.current = 0;
      idleUntilRef.current = performance.now() + IDLE_RESUME_MS;
      setFrameIndexSafe(Math.round(progressRef.current * frameCount) + delta);
    },
    [frameCount, isMultiFrame, isReady, setFrameIndexSafe]
  );

  // Main requestAnimationFrame loop for auto-rotate and post-drag inertia
  useEffect(() => {
    if (!isMultiFrame || !isReady || !isActive || !isInView || !isTabVisible) return;

    let rafId = 0;
    let lastTime = performance.now();
    const safeSeconds = Math.max(4, secondsPerTurn);

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!pointerDownRef.current) {
        // 1. Apply inertia decay after drag release
        if (Math.abs(velocityRef.current) > 0.05) {
          progressRef.current = (progressRef.current + (velocityRef.current * dt) / frameCount + 1) % 1;
          velocityRef.current *= Math.pow(0.06, dt); // smooth exponential damping
          if (Math.abs(velocityRef.current) <= 0.05) {
            velocityRef.current = 0;
          }
          const idx = Math.floor(progressRef.current * frameCount) % frameCount;
          setCurrentIndex((prev) => (prev === idx ? prev : idx));
        } else if (
          isPlaying &&
          !prefersReducedMotion &&
          !(pauseOnHover && isHovered) &&
          now >= idleUntilRef.current
        ) {
          // 2. Smooth auto-rotation
          progressRef.current = (progressRef.current + dt / safeSeconds) % 1;
          const idx = Math.floor(progressRef.current * frameCount) % frameCount;
          setCurrentIndex((prev) => (prev === idx ? prev : idx));
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [
    frameCount,
    isActive,
    isHovered,
    isInView,
    isMultiFrame,
    isPlaying,
    isReady,
    isTabVisible,
    pauseOnHover,
    prefersReducedMotion,
    secondsPerTurn,
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMultiFrame || !isReady) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerDownRef.current = true;
    pointerIdRef.current = e.pointerId;
    velocityRef.current = 0;
    setShowHint(false);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastTime: performance.now(),
      lockedAxis: null,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture not supported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current || !dragStartRef.current || !isMultiFrame || !isReady) return;
    const state = dragStartRef.current;
    const totalDx = e.clientX - state.x;
    const totalDy = e.clientY - state.y;

    // On touch devices, allow vertical page scrolling if user swipes vertically
    if (!state.lockedAxis && (Math.abs(totalDx) > 6 || Math.abs(totalDy) > 6)) {
      state.lockedAxis = Math.abs(totalDx) >= Math.abs(totalDy) ? 'x' : 'y';
    }
    if (state.lockedAxis === 'y') return;

    const now = performance.now();
    const dx = e.clientX - state.lastX;
    const dt = Math.max(0.008, (now - state.lastTime) / 1000);
    const width = Math.max(240, containerRef.current?.clientWidth ?? 480);
    const deltaProgress = (dx / width) * dragSensitivity;

    progressRef.current = (progressRef.current + deltaProgress + 10) % 1;
    const nextIdx = Math.floor(progressRef.current * frameCount) % frameCount;
    setCurrentIndex((prev) => (prev === nextIdx ? prev : nextIdx));

    // Track instantaneous angular velocity (frames/sec) for post-release inertia
    const instantVel = (deltaProgress * frameCount) / dt;
    velocityRef.current = Math.max(-28, Math.min(28, instantVel * 0.65));

    state.lastX = e.clientX;
    state.lastTime = now;
  };

  const endDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;
    setIsDragging(false);
    dragStartRef.current = null;
    idleUntilRef.current = performance.now() + IDLE_RESUME_MS;
    if (e && pointerIdRef.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      } catch {
        // ignore
      }
    }
    pointerIdRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isMultiFrame || !isReady) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepFrame(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepFrame(1);
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      setShowHint(false);
      setIsPlaying((prev) => !prev);
      idleUntilRef.current = 0;
    }
  };

  const safeIdx = frameCount > 0 ? currentIndex % frameCount : 0;
  const activeUrl = validFrames[safeIdx] ?? fallbackSrc ?? null;
  const uniqueTotal = Math.max(1, new Set(frames.filter(Boolean)).size);
  const loadPercent = Math.min(100, Math.round((loadedCount / uniqueTotal) * 100));

  if (!activeUrl) {
    return (
      <div
        className={`relative aspect-[16/10] w-full flex flex-col items-center justify-center rounded-2xl bg-[#18191D] text-white/60 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Bike className="h-12 w-12 stroke-[1.5]" />
        <span className="mt-2 text-xs">{alt}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={isMultiFrame ? 0 : undefined}
      role={isMultiFrame ? 'region' : undefined}
      aria-label={isMultiFrame ? `${alt} interactive 360 degree viewer` : alt}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        endDrag();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      className={`relative aspect-[16/10] w-full overflow-hidden select-none touch-pan-y focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D71920] ${
        isMultiFrame && isReady ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      } ${className}`}
    >
      {/* Ambient dark charcoal stage + red glow + elliptical ground shadow + turntable ring */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_46%,rgba(215,25,32,0.16)_0%,rgba(38,40,44,0.55)_42%,rgba(17,18,20,0.92)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 bottom-[11%] h-10 w-[72%] -translate-x-1/2 rounded-[100%] bg-black/65 blur-xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 bottom-[9%] h-12 w-[78%] -translate-x-1/2 rounded-[100%] border border-white/15 shadow-[0_0_24px_rgba(215,25,32,0.18)]"
      />

      {/* Bike Image Stage */}
      <div
        className={`relative z-[1] h-full w-full flex items-center justify-center p-3 sm:p-5 transition-opacity duration-200 ${
          isSwitchingSet ? 'opacity-40' : 'opacity-100'
        }`}
      >
        {isCrossfadeMode ? (
          validFrames.map((url, idx) => (
            <img
              key={`${idx}-${url}`}
              src={url}
              alt={validLabels?.[idx] ? `${alt} — ${validLabels[idx]} view` : alt}
              width={1600}
              height={1000}
              draggable={false}
              loading={priority && idx === 0 ? 'eager' : 'lazy'}
              fetchPriority={priority && idx === 0 ? 'high' : undefined}
              referrerPolicy="no-referrer"
              onError={() =>
                setFailedUrls((prev) => {
                  if (prev.has(url)) return prev;
                  const next = new Set(prev);
                  next.add(url);
                  return next;
                })
              }
              className={`absolute inset-0 h-full w-full object-contain p-3 sm:p-5 drop-shadow-[0_22px_26px_rgba(0,0,0,0.55)] transition-opacity duration-300 ease-in-out ${
                idx === safeIdx ? 'opacity-100 z-[1]' : 'opacity-0 pointer-events-none z-0'
              }`}
            />
          ))
        ) : (
          <img
            src={activeUrl}
            alt={alt}
            width={1600}
            height={1000}
            draggable={false}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            referrerPolicy="no-referrer"
            onError={() =>
              setFailedUrls((prev) => {
                if (prev.has(activeUrl)) return prev;
                const next = new Set(prev);
                next.add(activeUrl);
                return next;
              })
            }
            className={`h-full w-full object-contain drop-shadow-[0_22px_26px_rgba(0,0,0,0.55)] ${
              !isMultiFrame && !prefersReducedMotion ? 'bike-360-float' : ''
            }`}
          />
        )}
      </div>

      {/* Loading 360° Progress Ring / Bar */}
      {isMultiFrame && !isReady && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-[#111214]/80 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm"
        >
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white/25 border-t-[#D71920] animate-spin" />
          <span className="tabular-nums">Loading 360° ({loadPercent}%)</span>
        </div>
      )}

      {/* First-visit "Drag to rotate" Hint */}
      {isMultiFrame && isReady && showHint && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#111214]/70 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-sm"
        >
          <Hand className="h-3.5 w-3.5 text-[#D71920] animate-pulse" />
          <span>Drag to rotate</span>
        </div>
      )}

      {/* Controls Bar (hidden for single-image fallback) */}
      {isMultiFrame && (
        <div
          className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="rounded-md border border-white/15 bg-[#111214]/75 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-sm tabular-nums">
            {validLabels?.[safeIdx] ? validLabels[safeIdx] : `360° · ${safeIdx + 1}/${frameCount}`}
          </span>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#111214]/75 p-1 backdrop-blur-sm">
            <button
              type="button"
              disabled={!isReady}
              aria-label="Rotate previous angle"
              onClick={() => stepFrame(-1)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-white/85 hover:bg-white/15 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!isReady || prefersReducedMotion}
              aria-label={isPlaying ? 'Pause 360 rotation' : 'Play 360 rotation'}
              aria-pressed={isPlaying}
              onClick={() => {
                setShowHint(false);
                idleUntilRef.current = 0;
                setIsPlaying((prev) => !prev);
              }}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-white/85 hover:bg-white/15 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              {isPlaying && !prefersReducedMotion ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              disabled={!isReady}
              aria-label="Rotate next angle"
              onClick={() => stepFrame(1)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-white/85 hover:bg-white/15 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
