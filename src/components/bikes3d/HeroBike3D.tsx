import React, { Component, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Move, Pause, Play, RotateCcw } from 'lucide-react';
import type { BikeColor } from '../../types/database';
import { supportsWebGL } from '../../lib/webgl';

const LazyBikeScene = lazy(() => import('./BikeScene'));

export interface HeroBike3DProps {
  paintHex?: string;
  colors?: BikeColor[];
  showColorSwatches?: boolean;
  onColorChange?: (color: BikeColor) => void;
  brandWordmark?: string;
  autoRotate?: boolean;
  secondsPerTurn?: number;
  isActive?: boolean;
  fallback?: React.ReactNode;
  className?: string;
}

interface BoundaryState {
  hasError: boolean;
}

class SceneErrorBoundary extends Component<
  { onError: () => void; children: React.ReactNode },
  BoundaryState
> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function Bike3DLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_50%_46%,rgba(215,25,32,0.16)_0%,rgba(38,40,44,0.55)_44%,rgba(17,18,20,0.96)_100%)] text-white"
    >
      <svg
        viewBox="0 0 64 64"
        className="h-12 w-12 animate-spin text-[#D71920]"
        aria-hidden="true"
      >
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="4"
        />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray="48 120"
          strokeLinecap="round"
        />
        <circle cx="32" cy="32" r="6" fill="rgba(255,255,255,0.75)" />
        <line x1="32" y1="6" x2="32" y2="26" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        <line x1="32" y1="38" x2="32" y2="58" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        <line x1="6" y1="32" x2="26" y2="32" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        <line x1="38" y1="32" x2="58" y2="32" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      </svg>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
        Preparing 3D Showroom
      </span>
    </div>
  );
}

export function HeroBike3D({
  paintHex,
  colors,
  showColorSwatches = true,
  onColorChange,
  brandWordmark = 'HONDA',
  autoRotate = true,
  secondsPerTurn = 14,
  isActive = true,
  fallback = null,
  className = '',
}: HeroBike3DProps) {
  const [webglReady, setWebglReady] = useState<boolean>(() => supportsWebGL());
  const [userPlaying, setUserPlaying] = useState<boolean>(autoRotate);
  const [pausedByDrag, setPausedByDrag] = useState<boolean>(false);
  const [showInteractHint, setShowInteractHint] = useState<boolean>(true);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [nudgeTrigger, setNudgeTrigger] = useState<number>(0);
  const [nudgeDeltaRad, setNudgeDeltaRad] = useState<number>(0);
  const [localColorHex, setLocalColorHex] = useState<string>(
    paintHex || colors?.[0]?.hex_code || '#D71920'
  );

  useEffect(() => {
    setUserPlaying(autoRotate);
  }, [autoRotate]);

  useEffect(() => {
    if (paintHex) {
      setLocalColorHex(paintHex);
    } else if (colors && colors.length > 0) {
      setLocalColorHex(colors[0].hex_code);
    }
  }, [paintHex, colors]);

  const activePaintHex = paintHex || localColorHex || '#D71920';

  const handleContextError = useCallback(() => {
    setWebglReady(false);
  }, []);

  const handleInteract = useCallback(() => {
    setShowInteractHint(false);
  }, []);

  const handleResetView = () => {
    setResetTrigger((n) => n + 1);
    setShowInteractHint(false);
  };

  const handleTogglePlay = () => {
    setUserPlaying((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ') {
      e.preventDefault();
      handleTogglePlay();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setNudgeDeltaRad(-0.26);
      setNudgeTrigger((n) => n + 1);
      setShowInteractHint(false);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setNudgeDeltaRad(0.26);
      setNudgeTrigger((n) => n + 1);
      setShowInteractHint(false);
    }
  };

  if (!webglReady) {
    return <>{fallback}</>;
  }

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Interactive 3D motorcycle showroom viewer"
      onKeyDown={handleKeyDown}
      className={`relative aspect-[16/10] w-full overflow-hidden select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D71920] ${className}`}
      style={{
        background:
          'radial-gradient(ellipse at 50% 44%, rgba(215,25,32,0.16) 0%, rgba(38,40,44,0.52) 45%, rgba(17,18,20,0.96) 100%)',
      }}
    >
      {/* Subtle outlined brand watermark behind 3D turntable */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <span
          className="font-display text-[clamp(4.2rem,12vw,8.5rem)] font-bold uppercase tracking-[0.14em] whitespace-nowrap select-none"
          style={{
            color: 'transparent',
            WebkitTextStroke: '1.5px rgba(255,255,255,0.065)',
          }}
        >
          {brandWordmark}
        </span>
      </div>

      {/* Three.js WebGL Stage (lazy chunk) */}
      <div className="relative z-10 h-full w-full">
        <SceneErrorBoundary onError={handleContextError}>
          <Suspense fallback={<Bike3DLoadingFallback />}>
            <LazyBikeScene
              paintHex={activePaintHex}
              brandWordmark={brandWordmark}
              autoRotate={userPlaying}
              secondsPerTurn={secondsPerTurn}
              isActive={isActive}
              resetTrigger={resetTrigger}
              nudgeTrigger={nudgeTrigger}
              nudgeDeltaRad={nudgeDeltaRad}
              onInteract={handleInteract}
              onAutoRotatePausedChange={setPausedByDrag}
              onContextError={handleContextError}
            />
          </Suspense>
        </SceneErrorBoundary>
      </div>

      {/* Top-Left Subtle Drag Hint */}
      {showInteractHint && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#111214]/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/85"
        >
          <Move className="h-3.5 w-3.5 text-[#D71920]" />
          <span>Drag to orbit · Scroll to zoom</span>
        </div>
      )}

      {/* Compact Bottom Showroom Controls HUD */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#111214]/92 px-2 py-1.5 text-white shadow-lg">
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={userPlaying ? 'Pause auto rotation' : 'Resume auto rotation'}
            title={userPlaying ? 'Pause rotation (Space)' : 'Resume rotation (Space)'}
            className="inline-flex h-7 items-center gap-1.5 rounded px-2 text-[11px] font-semibold text-white/90 hover:bg-white/10 cursor-pointer"
          >
            {userPlaying && !pausedByDrag ? (
              <Pause className="h-3.5 w-3.5 text-[#D71920]" />
            ) : (
              <Play className="h-3.5 w-3.5 text-[#D71920]" />
            )}
            <span>{userPlaying ? (pausedByDrag ? 'Paused' : '360° Auto') : 'Paused'}</span>
          </button>

          <span className="h-4 w-px bg-white/15" aria-hidden="true" />

          <button
            type="button"
            onClick={handleResetView}
            aria-label="Reset 3D camera view"
            title="Reset camera angle"
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-semibold text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {showColorSwatches && colors && colors.length > 0 && (
          <div
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#111214]/92 px-2.5 py-1.5 shadow-lg"
            role="radiogroup"
            aria-label="3D motorcycle paint color"
          >
            {colors.map((color) => {
              const selected = activePaintHex.toLowerCase() === color.hex_code.toLowerCase();
              return (
                <button
                  key={color.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={color.name}
                  title={color.name}
                  onClick={() => {
                    setLocalColorHex(color.hex_code);
                    onColorChange?.(color);
                  }}
                  className={`h-5 w-5 rounded-full border transition-transform cursor-pointer ${
                    selected
                      ? 'border-white scale-115 ring-2 ring-[#D71920]'
                      : 'border-white/40 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex_code }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
