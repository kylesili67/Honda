import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bike, Box, Hand, Image as ImageIcon } from 'lucide-react';
import type { BikeModel, HeroDisplayMode } from '../../types/database';
import { HeroBike3D } from '../bikes3d/HeroBike3D';
import { Bike360Viewer, resolveBike360Frames } from './Bike360Viewer';

export interface Bike3DShowcaseProps {
  bike: BikeModel | null | undefined;
  colorId?: string | null;
  activeColorHex?: string | null;
  showColorSwatches?: boolean;
  fallbackSrc?: string | null;
  brandWordmark?: string;
  heroMode?: HeroDisplayMode;
  autoRotate?: boolean;
  secondsPerTurn?: number;
  effectsEnabled?: boolean;
  priority?: boolean;
  isActive?: boolean;
  className?: string;
}

const MODEL_VIEWER_CDN =
  'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';

let modelViewerScriptPromise: Promise<void> | null = null;

function ensureModelViewerLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (customElements.get('model-viewer')) return Promise.resolve();
  if (modelViewerScriptPromise) return modelViewerScriptPromise;

  modelViewerScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MODEL_VIEWER_CDN}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load model-viewer')), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = MODEL_VIEWER_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load model-viewer'));
    document.head.appendChild(script);
  });

  return modelViewerScriptPromise;
}

interface ModelViewerStageProps {
  src: string;
  poster: string | null;
  alt: string;
  autoRotate: boolean;
  secondsPerTurn: number;
  isActive: boolean;
  onError: () => void;
}

function ModelViewerStage({
  src,
  poster,
  alt,
  autoRotate,
  secondsPerTurn,
  isActive,
  onError,
}: ModelViewerStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let viewerEl: HTMLElement | null = null;

    const mountViewer = async () => {
      try {
        await ensureModelViewerLoaded();
        if (cancelled || !hostRef.current) return;

        const el = document.createElement('model-viewer');
        el.setAttribute('src', src);
        if (poster) el.setAttribute('poster', poster);
        el.setAttribute('alt', `${alt} interactive 3D model`);
        el.setAttribute('camera-controls', '');
        el.setAttribute('disable-pan', '');
        el.setAttribute('interaction-prompt', 'auto');
        el.setAttribute('shadow-intensity', '1.1');
        el.setAttribute('shadow-softness', '0.85');
        el.setAttribute('environment-image', 'neutral');
        el.setAttribute('exposure', '1.05');
        el.setAttribute('loading', 'lazy');
        el.setAttribute('min-camera-orbit', 'auto 55deg 70%');
        el.setAttribute('max-camera-orbit', 'auto 95deg 130%');
        el.setAttribute('auto-rotate-delay', '3000');

        const degPerSec = Math.round(360 / Math.max(6, secondsPerTurn));
        el.setAttribute('rotation-per-second', `${degPerSec}deg`);
        if (autoRotate && isActive) {
          el.setAttribute('auto-rotate', '');
        }

        el.style.width = '100%';
        el.style.height = '100%';
        el.style.backgroundColor = 'transparent';

        const handleProgress = (ev: Event) => {
          const detail = (ev as CustomEvent<{ totalProgress?: number }>).detail;
          if (typeof detail?.totalProgress === 'number') {
            setProgress(Math.round(detail.totalProgress * 100));
          }
        };
        const handleLoad = () => {
          if (!cancelled) {
            setLoaded(true);
            setProgress(100);
          }
        };
        const handleError = () => {
          if (!cancelled) onError();
        };

        el.addEventListener('progress', handleProgress);
        el.addEventListener('load', handleLoad);
        el.addEventListener('error', handleError);

        hostRef.current.innerHTML = '';
        hostRef.current.appendChild(el);
        viewerEl = el;
      } catch {
        if (!cancelled) onError();
      }
    };

    void mountViewer();

    return () => {
      cancelled = true;
      if (viewerEl && hostRef.current?.contains(viewerEl)) {
        hostRef.current.removeChild(viewerEl);
      }
    };
  }, [src, poster, alt, autoRotate, secondsPerTurn, isActive, onError]);

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_46%,rgba(215,25,32,0.16)_0%,rgba(38,40,44,0.55)_42%,rgba(17,18,20,0.95)_100%)]">
      <div ref={hostRef} className="h-full w-full" />
      {!loaded && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-[#111214]/80 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm"
        >
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white/25 border-t-[#D71920] animate-spin" />
          <span className="tabular-nums">Loading 3D ({progress}%)</span>
        </div>
      )}
    </div>
  );
}

interface Pseudo3DStageProps {
  imageUrl: string | null;
  alt: string;
  watermarkText: string;
  autoRotate: boolean;
  effectsEnabled: boolean;
  priority: boolean;
  isActive: boolean;
  className?: string;
}

const DUST_PARTICLES = [
  { left: '14%', top: '24%', size: 3, dur: '6.5s', delay: '0s', mobile: true },
  { left: '28%', top: '68%', size: 2, dur: '8.2s', delay: '1.1s', mobile: false },
  { left: '46%', top: '18%', size: 2.5, dur: '7.4s', delay: '0.6s', mobile: true },
  { left: '66%', top: '74%', size: 3, dur: '9.0s', delay: '1.8s', mobile: false },
  { left: '78%', top: '30%', size: 2, dur: '6.8s', delay: '2.2s', mobile: true },
  { left: '88%', top: '60%', size: 2.5, dur: '7.8s', delay: '0.4s', mobile: false },
];

function Pseudo3DStage({
  imageUrl,
  alt,
  watermarkText,
  autoRotate,
  effectsEnabled,
  priority,
  isActive,
  className = '',
}: Pseudo3DStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const watermarkRef = useRef<HTMLDivElement | null>(null);

  const [imgFailed, setImgFailed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [isInView, setIsInView] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Interactive physics refs (avoid React re-renders at 60fps)
  const pointerDownRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  const dragYawTargetRef = useRef(0);
  const dragYawCurrentRef = useRef(0);
  const hoverTargetRef = useRef({ x: 0, y: 0 });
  const hoverCurrentRef = useRef({ x: 0, y: 0 });
  const phaseRef = useRef(0);

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => setIsInView(Boolean(entries[0]?.isIntersecting)),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setIsTabVisible(!document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // 60fps GPU-composited transform loop: continuous yaw sway (-14°..+14°), mouse parallax, drag spring-back
  useEffect(() => {
    if (prefersReducedMotion || !isActive || !isInView || !isTabVisible) {
      if (stageRef.current) stageRef.current.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg) scale(1)';
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (autoRotate && !pointerDownRef.current) {
        // 9-second full smooth sway cycle
        phaseRef.current += (dt * Math.PI * 2) / 9;
      }

      // Smooth spring-back for drag offset when released
      if (!pointerDownRef.current) {
        dragYawTargetRef.current *= Math.pow(0.015, dt);
        if (Math.abs(dragYawTargetRef.current) < 0.05) dragYawTargetRef.current = 0;
      }

      // Smooth interpolation
      const lerp = 1 - Math.exp(-9 * dt);
      dragYawCurrentRef.current += (dragYawTargetRef.current - dragYawCurrentRef.current) * lerp;
      hoverCurrentRef.current.x += (hoverTargetRef.current.x - hoverCurrentRef.current.x) * lerp;
      hoverCurrentRef.current.y += (hoverTargetRef.current.y - hoverCurrentRef.current.y) * lerp;

      const autoYaw = autoRotate ? Math.sin(phaseRef.current) * 14 : 0;
      const autoPitch = autoRotate ? Math.cos(phaseRef.current * 0.5) * 1.8 : 0;
      const autoScale = autoRotate ? 1 + Math.sin(phaseRef.current * 2) * 0.012 : 1;

      const totalYaw = Math.max(
        -22,
        Math.min(22, autoYaw + dragYawCurrentRef.current + hoverCurrentRef.current.x * 6)
      );
      const totalPitch = Math.max(-6, Math.min(6, autoPitch - hoverCurrentRef.current.y * 4));

      if (stageRef.current) {
        stageRef.current.style.transform = `perspective(1200px) rotateY(${totalYaw.toFixed(2)}deg) rotateX(${totalPitch.toFixed(2)}deg) scale(${autoScale.toFixed(4)})`;
      }
      if (shadowRef.current) {
        const shiftX = (-totalYaw * 1.15).toFixed(1);
        const scaleX = (1 - Math.abs(totalYaw) * 0.004).toFixed(3);
        shadowRef.current.style.transform = `translate3d(calc(-50% + ${shiftX}px), 0, 0) scaleX(${scaleX})`;
      }
      if (ringRef.current) {
        const ringSpin = (totalYaw * 1.6).toFixed(1);
        ringRef.current.style.transform = `translate3d(-50%, 0, 0) rotateX(74deg) rotateZ(${ringSpin}deg)`;
      }
      if (watermarkRef.current) {
        const wmX = (-totalYaw * 1.4).toFixed(1);
        const wmY = (-totalPitch * 1.2).toFixed(1);
        watermarkRef.current.style.transform = `translate3d(${wmX}px, ${wmY}px, 0)`;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [autoRotate, isActive, isInView, isTabVisible, prefersReducedMotion]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerDownRef.current = true;
    pointerIdRef.current = e.pointerId;
    dragStartXRef.current = e.clientX;
    setIsDragging(true);
    setShowHint(false);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && e.pointerType === 'mouse' && !pointerDownRef.current) {
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      hoverTargetRef.current = { x: nx, y: ny };
    }
    if (pointerDownRef.current) {
      const dx = e.clientX - dragStartXRef.current;
      const width = Math.max(240, rect?.width ?? 480);
      dragYawTargetRef.current = Math.max(-20, Math.min(20, (dx / width) * 52));
    }
  };

  const endDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;
    setIsDragging(false);
    if (e && pointerIdRef.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      } catch {
        // ignore
      }
    }
    pointerIdRef.current = null;
  };

  if (!imageUrl || imgFailed) {
    return (
      <div
        className={`relative aspect-[16/10] w-full flex flex-col items-center justify-center bg-[#18191D] text-white/60 ${className}`}
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
      role="region"
      aria-label={`${alt} interactive 3D showroom preview`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseLeave={() => {
        hoverTargetRef.current = { x: 0, y: 0 };
        endDrag();
      }}
      className={`relative aspect-[16/10] w-full overflow-hidden select-none touch-pan-y ${
        !prefersReducedMotion ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      } ${className}`}
    >
      {/* Dark Charcoal Showroom Backdrop + Red Radial Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_44%,rgba(215,25,32,0.18)_0%,rgba(38,40,44,0.52)_44%,rgba(17,18,20,0.96)_100%)]"
      />

      {/* Parallax Outlined Background Wordmark (6–8% opacity) */}
      <div
        ref={watermarkRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden will-change-transform"
      >
        <span
          className="font-display text-[clamp(4.5rem,13vw,9.5rem)] font-bold uppercase tracking-[0.14em] whitespace-nowrap select-none"
          style={{
            color: 'transparent',
            WebkitTextStroke: '1.5px rgba(255,255,255,0.075)',
          }}
        >
          {watermarkText}
        </span>
      </div>

      {/* Lightweight CSS-only Speed-Lines & Floating Dust Particles */}
      {effectsEnabled && !prefersReducedMotion && isActive && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="hero-speed-streak absolute top-[22%] left-0 h-px w-36 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            style={{ animationDelay: '0s' }}
          />
          <div
            className="hero-speed-streak hidden sm:block absolute top-[62%] left-0 h-px w-48 bg-gradient-to-r from-transparent via-[#D71920]/40 to-transparent"
            style={{ animationDelay: '2.1s' }}
          />
          {DUST_PARTICLES.map((p, idx) => (
            <span
              key={idx}
              className={`hero-dust-particle absolute rounded-full bg-white/30 ${p.mobile ? '' : 'hidden sm:block'}`}
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: p.dur,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Synchronized Rotating Turntable Platform (concentric rings + red glow) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 bottom-[7%] h-40 w-[82%] -translate-x-1/2"
        style={{ perspective: '600px' }}
      >
        <div
          ref={ringRef}
          className="absolute left-1/2 bottom-0 h-44 w-full rounded-full border border-[#D71920]/45 shadow-[0_0_28px_rgba(215,25,32,0.28),inset_0_0_20px_rgba(215,25,32,0.12)] will-change-transform"
          style={{ transform: 'translate3d(-50%, 0, 0) rotateX(74deg)' }}
        >
          <div className="absolute inset-4 rounded-full border border-dashed border-white/20" />
          <div className="absolute inset-10 rounded-full border border-white/10" />
        </div>
      </div>

      {/* Dynamic Ground Shadow shifting with yaw angle */}
      <div
        ref={shadowRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 bottom-[11%] h-10 w-[68%] rounded-[100%] bg-black/70 blur-xl will-change-transform"
        style={{ transform: 'translate3d(-50%, 0, 0)' }}
      />

      {/* 3D Perspective Bike Stage */}
      <div
        ref={stageRef}
        className="relative z-[2] h-full w-full flex items-center justify-center p-4 sm:p-6 will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="relative h-full w-full flex items-center justify-center">
          <img
            src={imageUrl}
            alt={alt}
            width={1600}
            height={1000}
            draggable={false}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain drop-shadow-[0_24px_28px_rgba(0,0,0,0.62)]"
            style={{
              WebkitMaskImage:
                'radial-gradient(ellipse 94% 92% at 50% 50%, #000 78%, transparent 100%)',
              maskImage:
                'radial-gradient(ellipse 94% 92% at 50% 50%, #000 78%, transparent 100%)',
            }}
          />

          {/* Diagonal Specular Light Sweep (every ~5s) */}
          {!prefersReducedMotion && isActive && (
            <div
              aria-hidden="true"
              className="hero-light-sweep pointer-events-none absolute inset-0 overflow-hidden mix-blend-screen"
            />
          )}
        </div>
      </div>

      {/* Subtle Drag Hint */}
      {!prefersReducedMotion && showHint && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#111214]/70 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/85 backdrop-blur-sm"
        >
          <Hand className="h-3.5 w-3.5 text-[#D71920]" />
          <span>Drag to tilt</span>
        </div>
      )}
    </div>
  );
}

/**
 * Hero 3D Showroom Priority Chain:
 * Mode 1: Real 3D .glb model (`bike.model_3d_url`) via lazy-loaded <model-viewer> (falls back silently on error).
 * Mode 2: Dedicated 360° spin frames (`image_type === 'spin'`) via existing Bike360Viewer.
 * Mode 3: Original Procedural Three.js 3D Motorcycle (`HeroBike3D`), falling back to Pseudo3DStage if WebGL is unavailable.
 */
export function Bike3DShowcase({
  bike,
  colorId,
  activeColorHex = null,
  showColorSwatches = false,
  fallbackSrc = null,
  brandWordmark = 'HONDA',
  heroMode = 'auto',
  autoRotate = true,
  secondsPerTurn = 14,
  effectsEnabled = true,
  priority = false,
  isActive = true,
  className = '',
}: Bike3DShowcaseProps) {
  const [modelFailed, setModelFailed] = useState(false);
  const [preferPhotoView, setPreferPhotoView] = useState(false);

  const modelUrl = bike?.model_3d_url?.trim() || null;

  useEffect(() => {
    setModelFailed(false);
  }, [modelUrl, bike?.id]);

  const resolvedSet = useMemo(
    () => resolveBike360Frames(bike, colorId, fallbackSrc),
    [bike, colorId, fallbackSrc]
  );

  const primaryImage =
    bike?.model_3d_poster_url?.trim() || resolvedSet.frames[0] || fallbackSrc || null;

  const hasSpinFrames = resolvedSet.mode === 'spin' && resolvedSet.frames.length >= 2;
  const canUseModel = Boolean(modelUrl) && !modelFailed;

  // Determine effective mode according to admin setting + priority chain
  let activeMode: 'model' | 'frames' | 'procedural' | 'image' = 'procedural';
  if (heroMode === 'model') {
    activeMode = canUseModel ? 'model' : hasSpinFrames ? 'frames' : 'procedural';
  } else if (heroMode === 'frames') {
    activeMode = resolvedSet.frames.length >= 2 ? 'frames' : 'image';
  } else if (heroMode === 'image') {
    activeMode = 'image';
  } else if (heroMode === 'procedural') {
    activeMode = 'procedural';
  } else {
    // 'auto' priority chain: 1. Real 3D .glb -> 2. Spin frames -> 3. Procedural Three.js 3D Motorcycle
    if (canUseModel) activeMode = 'model';
    else if (hasSpinFrames) activeMode = 'frames';
    else activeMode = 'procedural';
  }

  if (activeMode === 'model' && modelUrl) {
    return (
      <ModelViewerStage
        src={modelUrl}
        poster={primaryImage}
        alt={bike?.name || 'Motorcycle'}
        autoRotate={autoRotate}
        secondsPerTurn={secondsPerTurn}
        isActive={isActive}
        onError={() => setModelFailed(true)}
      />
    );
  }

  if (activeMode === 'frames') {
    return (
      <Bike360Viewer
        frames={resolvedSet.frames}
        frameLabels={resolvedSet.labels}
        fallbackSrc={fallbackSrc}
        alt={bike?.name || 'Motorcycle'}
        autoRotate={autoRotate}
        secondsPerTurn={secondsPerTurn}
        priority={priority}
        isActive={isActive}
        className={className}
      />
    );
  }

  const pseudoStageFallback = (
    <Pseudo3DStage
      imageUrl={primaryImage}
      alt={bike?.name || 'Motorcycle'}
      watermarkText={brandWordmark || bike?.name || 'HONDA'}
      autoRotate={autoRotate}
      effectsEnabled={effectsEnabled}
      priority={priority}
      isActive={isActive}
      className={className}
    />
  );

  if (activeMode === 'procedural') {
    return (
      <div className="relative w-full">
        {preferPhotoView && primaryImage ? (
          pseudoStageFallback
        ) : (
          <HeroBike3D
            paintHex={activeColorHex || bike?.colors?.[0]?.hex_code || '#D71920'}
            colors={bike?.colors}
            showColorSwatches={showColorSwatches}
            brandWordmark={brandWordmark || 'HONDA'}
            autoRotate={autoRotate}
            secondsPerTurn={secondsPerTurn}
            isActive={isActive}
            fallback={pseudoStageFallback}
            className={className}
          />
        )}

        {primaryImage && (
          <button
            type="button"
            onClick={() => setPreferPhotoView((v) => !v)}
            aria-label={preferPhotoView ? 'Switch to interactive 3D motorcycle' : 'Switch to showroom photo'}
            className="absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#111214]/90 px-2.5 py-1 text-[11px] font-semibold text-white/85 hover:border-white/30 hover:text-white cursor-pointer"
          >
            {preferPhotoView ? (
              <>
                <Box className="h-3.5 w-3.5 text-[#D71920]" />
                <span>3D Model</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-3.5 w-3.5 text-[#D71920]" />
                <span>Photo</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  return pseudoStageFallback;
}
