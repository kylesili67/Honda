import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { detectWebGLSupport } from '../../lib/webgl';
import { buildProceduralBike, type ProceduralBikeRig } from './ProceduralBike';

export interface BikeSceneProps {
  paintHex?: string;
  brandWordmark?: string;
  autoRotate?: boolean;
  secondsPerTurn?: number;
  isActive?: boolean;
  resetTrigger?: number;
  nudgeTrigger?: number;
  nudgeDeltaRad?: number;
  onInteract?: () => void;
  onAutoRotatePausedChange?: (pausedByUser: boolean) => void;
  onContextError?: () => void;
}

const DEFAULT_CAM_POS = new THREE.Vector3(2.32, 1.06, 2.28);
const DEFAULT_TARGET = new THREE.Vector3(0, 0.52, 0);

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.36)');
    grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.1)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createTurntableDeckTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = 256;
    const cy = 256;
    const grad = ctx.createRadialGradient(cx, cy, 24, cx, cy, 254);
    grad.addColorStop(0, '#23262C');
    grad.addColorStop(0.65, '#17191D');
    grad.addColorStop(1, '#101114');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle concentric showroom rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    for (const r of [140, 200, 236]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 36 radial degree tick marks around the turntable perimeter
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const isMajor = i % 3 === 0;
      const rInner = isMajor ? 222 : 228;
      const rOuter = 236;
      ctx.strokeStyle = isMajor ? 'rgba(215, 25, 32, 0.65)' : 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = isMajor ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
      ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function BikeScene({
  paintHex = '#D71920',
  brandWordmark,
  autoRotate = true,
  secondsPerTurn = 14,
  isActive = true,
  resetTrigger = 0,
  nudgeTrigger = 0,
  nudgeDeltaRad = 0,
  onInteract,
  onAutoRotatePausedChange,
  onContextError,
}: BikeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<ProceduralBikeRig | null>(null);

  const autoRotateRef = useRef(autoRotate);
  const secondsPerTurnRef = useRef(secondsPerTurn);
  const isActiveRef = useRef(isActive);
  const onInteractRef = useRef(onInteract);
  const onPausedChangeRef = useRef(onAutoRotatePausedChange);
  const onContextErrorRef = useRef(onContextError);

  const resetAnimRef = useRef<{ active: boolean; progress: number; startPos: THREE.Vector3; startTarget: THREE.Vector3 }>({
    active: false,
    progress: 0,
    startPos: DEFAULT_CAM_POS.clone(),
    startTarget: DEFAULT_TARGET.clone(),
  });
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const turntableRef = useRef<THREE.Group | null>(null);
  const nudgeRemainingRef = useRef(0);
  const requestRenderRef = useRef<(() => void) | null>(null);

  autoRotateRef.current = autoRotate;
  secondsPerTurnRef.current = Math.max(6, Math.min(30, secondsPerTurn || 14));
  isActiveRef.current = isActive;
  onInteractRef.current = onInteract;
  onPausedChangeRef.current = onAutoRotatePausedChange;
  onContextErrorRef.current = onContextError;

  // Live paint color update without rebuilding scene or WebGL context
  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.setPaintColor(paintHex);
      requestRenderRef.current?.();
    }
  }, [paintHex]);

  // Smooth camera reset trigger
  useEffect(() => {
    if (resetTrigger === 0 || !cameraRef.current || !controlsRef.current) return;
    resetAnimRef.current = {
      active: true,
      progress: 0,
      startPos: cameraRef.current.position.clone(),
      startTarget: controlsRef.current.target.clone(),
    };
    requestRenderRef.current?.();
  }, [resetTrigger]);

  // Keyboard nudge trigger
  useEffect(() => {
    if (nudgeTrigger === 0 || !nudgeDeltaRad) return;
    nudgeRemainingRef.current += nudgeDeltaRad;
    requestRenderRef.current?.();
  }, [nudgeTrigger, nudgeDeltaRad]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const capabilities = detectWebGLSupport();
    if (!capabilities.supported) {
      onContextErrorRef.current?.();
      return;
    }

    const isSoftware = capabilities.isSoftware;
    const isMobile =
      window.innerWidth < 768 ||
      (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftware,
        alpha: true,
        powerPreference: isSoftware ? 'default' : 'high-performance',
      });
    } catch {
      onContextErrorRef.current?.();
      return;
    }

    const width = Math.max(240, container.clientWidth || 640);
    const height = Math.max(180, container.clientHeight || 400);

    renderer.setPixelRatio(isSoftware ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftware;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Preserve mobile vertical page scrolling over the canvas
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'pan-y';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Neutral studio IBL environment on every device for crisp clearcoat & chrome reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRenderTarget.texture;
    scene.environmentIntensity = 0.88;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.copy(DEFAULT_CAM_POS);
    cameraRef.current = camera;

    // 3-Point Showroom Lighting + Signature Red Rim Light
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x15171b, 0.6);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.95);
    keyLight.position.set(3.2, 4.6, 3.0);
    keyLight.castShadow = !isSoftware;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -1.8;
    keyLight.shadow.camera.right = 1.8;
    keyLight.shadow.camera.top = 1.8;
    keyLight.shadow.camera.bottom = -1.8;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcbd5e1, 0.72);
    fillLight.position.set(-3.2, 2.4, 2.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xd71920, 1.55);
    rimLight.position.set(-2.5, 2.1, -3.2);
    scene.add(rimLight);

    let areaLight: THREE.RectAreaLight | null = null;
    if (!isSoftware) {
      RectAreaLightUniformsLib.init();
      areaLight = new THREE.RectAreaLight(0xffffff, 2.4, 3.2, 1.5);
      areaLight.position.set(0, 3.2, 0.4);
      areaLight.lookAt(0, 0.5, 0);
      scene.add(areaLight);
    }

    // Turntable Group (bike + platform + accent ring + contact shadow rotate together)
    const turntableGroup = new THREE.Group();
    turntableGroup.name = 'showroomTurntable';
    // Start slightly angled so 3/4 view highlights tank, engine fins & front disc
    turntableGroup.rotation.y = 0.16;
    scene.add(turntableGroup);
    turntableRef.current = turntableGroup;

    const deckTexture = createTurntableDeckTexture();
    const deckGeo = new THREE.CylinderGeometry(1.36, 1.42, 0.032, 64);
    const deckMat = new THREE.MeshStandardMaterial({
      map: deckTexture,
      roughness: 0.45,
      metalness: 0.35,
    });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.y = -0.016;
    deckMesh.receiveShadow = true;
    turntableGroup.add(deckMesh);

    // Signature #D71920 Glowing Turntable Rim
    const ringGeo = new THREE.TorusGeometry(1.365, 0.0085, 10, 72);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd71920,
      emissive: 0xd71920,
      emissiveIntensity: 0.85,
      roughness: 0.3,
      metalness: 0.4,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.003;
    turntableGroup.add(ringMesh);

    // Soft elliptical ground contact shadow under tyres
    const contactTexture = createContactShadowTexture();
    const contactGeo = new THREE.PlaneGeometry(1.35, 2.25);
    contactGeo.rotateX(-Math.PI / 2);
    const contactMat = new THREE.MeshBasicMaterial({
      map: contactTexture,
      transparent: true,
      depthWrite: false,
    });
    const contactMesh = new THREE.Mesh(contactGeo, contactMat);
    contactMesh.position.y = 0.004;
    turntableGroup.add(contactMesh);

    // Build Procedural Motorcycle Rig
    const rig = buildProceduralBike({
      paintHex,
      brandWordmark,
      lowDetail: isMobile,
    });
    rigRef.current = rig;
    turntableGroup.add(rig.group);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(DEFAULT_TARGET);
    controls.enableDamping = !isSoftware;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 1.85;
    controls.maxDistance = 4.6;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.update();
    controlsRef.current = controls;

    // Interaction state & 3s idle resume
    let userDragging = false;
    let pausedByUser = false;
    let resumeTimeoutId: number | null = null;
    let contextLost = false;
    let isInView = true;
    let isTabVisible = typeof document !== 'undefined' ? !document.hidden : true;
    let prefersReducedMotion = false;

    try {
      if (window.matchMedia) {
        prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
    } catch {
      prefersReducedMotion = false;
    }

    const clearResumeTimer = () => {
      if (resumeTimeoutId !== null) {
        window.clearTimeout(resumeTimeoutId);
        resumeTimeoutId = null;
      }
    };

    const handleControlStart = () => {
      userDragging = true;
      pausedByUser = true;
      resetAnimRef.current.active = false;
      clearResumeTimer();
      onInteractRef.current?.();
      onPausedChangeRef.current?.(true);
    };

    const handleControlEnd = () => {
      userDragging = false;
      clearResumeTimer();
      resumeTimeoutId = window.setTimeout(() => {
        pausedByUser = false;
        onPausedChangeRef.current?.(false);
      }, 3000);
    };

    controls.addEventListener('start', handleControlStart);
    controls.addEventListener('end', handleControlEnd);

    // Touch gesture disambiguation so vertical swipe scrolls page cleanly on mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchGestureDecided: 'pending' | 'horizontal' | 'vertical' = 'pending';

    const onTouchStartCapture = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) {
        controls.enabled = true;
        touchGestureDecided = 'horizontal';
        return;
      }
      touchStartX = ev.touches[0].clientX;
      touchStartY = ev.touches[0].clientY;
      touchGestureDecided = 'pending';
      controls.enabled = true;
    };

    const onTouchMoveCapture = (ev: TouchEvent) => {
      if (ev.touches.length !== 1 || touchGestureDecided !== 'pending') return;
      const dx = Math.abs(ev.touches[0].clientX - touchStartX);
      const dy = Math.abs(ev.touches[0].clientY - touchStartY);
      if (dx + dy < 6) return;
      if (dy > dx * 1.2) {
        touchGestureDecided = 'vertical';
        controls.enabled = false;
      } else {
        touchGestureDecided = 'horizontal';
        controls.enabled = true;
      }
    };

    const onTouchEndCapture = () => {
      touchGestureDecided = 'pending';
      controls.enabled = true;
    };

    renderer.domElement.addEventListener('touchstart', onTouchStartCapture, { capture: true, passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMoveCapture, { capture: true, passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEndCapture, { capture: true, passive: true });
    renderer.domElement.addEventListener('touchcancel', onTouchEndCapture, { capture: true, passive: true });

    // WebGL context loss / restore handling
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const onContextRestored = () => {
      contextLost = false;
      renderFrame();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // Visibility & IntersectionObserver
    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              isInView = Boolean(entries[0]?.isIntersecting);
            },
            { threshold: 0.05 }
          )
        : null;
    observer?.observe(container);

    const onVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // ResizeObserver
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (!rect || rect.width < 10 || rect.height < 10) return;
            camera.aspect = rect.width / rect.height;
            camera.updateProjectionMatrix();
            renderer.setSize(rect.width, rect.height);
            renderFrame();
          })
        : null;
    resizeObserver?.observe(container);

    const renderFrame = () => {
      if (contextLost) return;
      renderer.render(scene, camera);
    };
    requestRenderRef.current = renderFrame;

    // Initial render
    renderFrame();

    let rafId = 0;
    let lastTime = performance.now();
    let lastDrawTime = 0;

    const tick = (now: number) => {
      rafId = window.requestAnimationFrame(tick);

      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (contextLost || !isActiveRef.current || !isInView || !isTabVisible) {
        return;
      }

      // Pace software rasterizers cleanly to avoid freezing UI thread
      if (isSoftware && now - lastDrawTime < 34) {
        return;
      }

      let needsRender = false;

      // Smooth camera reset tween
      if (resetAnimRef.current.active) {
        resetAnimRef.current.progress = Math.min(1, resetAnimRef.current.progress + delta * 2.4);
        const t = 1 - Math.pow(1 - resetAnimRef.current.progress, 3);
        camera.position.lerpVectors(resetAnimRef.current.startPos, DEFAULT_CAM_POS, t);
        controls.target.lerpVectors(resetAnimRef.current.startTarget, DEFAULT_TARGET, t);
        if (resetAnimRef.current.progress >= 1) {
          resetAnimRef.current.active = false;
        }
        needsRender = true;
      }

      // Smooth keyboard nudge
      if (Math.abs(nudgeRemainingRef.current) > 0.001) {
        const step = nudgeRemainingRef.current * Math.min(1, delta * 10);
        turntableGroup.rotation.y += step;
        nudgeRemainingRef.current -= step;
        needsRender = true;
      }

      // Frame-rate independent auto-rotation (radians/sec = 2*PI / secondsPerTurn)
      if (autoRotateRef.current && !userDragging && !pausedByUser && !prefersReducedMotion) {
        const angularVelocity = (Math.PI * 2) / secondsPerTurnRef.current;
        turntableGroup.rotation.y += angularVelocity * delta;
        needsRender = true;
      }

      const controlsChanged = controls.update();
      if (needsRender || controlsChanged) {
        lastDrawTime = now;
        renderer.render(scene, camera);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      clearResumeTimer();
      requestRenderRef.current = null;
      rigRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      turntableRef.current = null;

      observer?.disconnect();
      resizeObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);

      controls.removeEventListener('start', handleControlStart);
      controls.removeEventListener('end', handleControlEnd);
      controls.dispose();

      renderer.domElement.removeEventListener('touchstart', onTouchStartCapture, { capture: true });
      renderer.domElement.removeEventListener('touchmove', onTouchMoveCapture, { capture: true });
      renderer.domElement.removeEventListener('touchend', onTouchEndCapture, { capture: true });
      renderer.domElement.removeEventListener('touchcancel', onTouchEndCapture, { capture: true });
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      rig.dispose();
      deckGeo.dispose();
      deckMat.dispose();
      deckTexture.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      contactGeo.dispose();
      contactMat.dispose();
      contactTexture.dispose();
      envRenderTarget.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // Build once per mount; paintHex updates imperatively via rigRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandWordmark]);

  return <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />;
}

export default BikeScene;
