import { useEffect, useRef, useState } from 'react';

interface Bike3DViewerProps {
  alt: string;
  fallbackSrc?: string;
}

type ThreeModule = any;

function buildMotorcycle(THREE: ThreeModule) {
  const bike = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0x1454a2, metalness: 0.62, roughness: 0.28 });
  const darkPaint = new THREE.MeshStandardMaterial({ color: 0x171b22, metalness: 0.28, roughness: 0.42 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x090b0e, roughness: 0.96 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xaeb8c3, metalness: 0.86, roughness: 0.25 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe0e5e9, metalness: 0.92, roughness: 0.16 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd71920, metalness: 0.38, roughness: 0.3 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xe7f2ff, emissive: 0x8abfff, emissiveIntensity: 0.45 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb88b38, metalness: 0.82, roughness: 0.28 });

  const add = (geometry: any, material: any, position: [number, number, number], scale?: [number, number, number]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    bike.add(mesh);
    return mesh;
  };
  const box = (pos: [number, number, number], size: [number, number, number], material: any) =>
    add(new THREE.BoxGeometry(...size), material, pos);
  const sphere = (pos: [number, number, number], size: [number, number, number], material: any) =>
    add(new THREE.SphereGeometry(1, 24, 16), material, pos, size);
  const rod = (a: [number, number, number], b: [number, number, number], radius: number, material: any) => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const direction = new THREE.Vector3().subVectors(end, start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 12), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    bike.add(mesh);
    return mesh;
  };

  // Wheels: the front of the motorcycle points toward +Z.
  for (const z of [-1.12, 1.12]) {
    const wheel = add(new THREE.CylinderGeometry(0.52, 0.52, 0.19, 48), rubber, [0, 0.56, z]);
    wheel.rotation.z = Math.PI / 2;
    const rim = add(new THREE.TorusGeometry(0.405, 0.035, 10, 48), chrome, [0, 0.56, z]);
    rim.rotation.y = Math.PI / 2;
    const inner = add(new THREE.TorusGeometry(0.30, 0.012, 8, 40), metal, [0, 0.56, z]);
    inner.rotation.y = Math.PI / 2;
    const hub = add(new THREE.CylinderGeometry(0.10, 0.10, 0.24, 24), metal, [0, 0.56, z]);
    hub.rotation.z = Math.PI / 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      rod([0, 0.56, z], [0, 0.56 + Math.sin(a) * 0.36, z + Math.cos(a) * 0.36], 0.009, chrome);
    }
  }

  // Swingarm, trellis frame and engine.
  rod([-0.12, 0.66, -0.98], [-0.12, 1.06, 0.05], 0.055, metal);
  rod([0.12, 0.66, -0.98], [0.12, 1.06, 0.05], 0.055, metal);
  rod([-0.12, 0.86, -0.55], [-0.12, 1.42, 0.28], 0.055, darkPaint);
  rod([0.12, 0.86, -0.55], [0.12, 1.42, 0.28], 0.055, darkPaint);
  box([0, 0.99, -0.12], [0.52, 0.55, 0.58], metal);
  box([-0.275, 0.99, -0.12], [0.07, 0.35, 0.38], darkPaint);
  box([0.275, 0.99, -0.12], [0.07, 0.35, 0.38], darkPaint);
  for (let i = 0; i < 5; i++) box([0, 1.22, -0.31 + i * 0.10], [0.57, 0.025, 0.025], chrome);

  // Fuel tank, side panels, seat and tail cowl.
  sphere([0, 1.57, 0.25], [0.42, 0.32, 0.62], paint);
  sphere([0, 1.73, 0.25], [0.33, 0.12, 0.42], paint);
  for (const side of [-1, 1]) {
    sphere([side * 0.32, 1.37, 0.55], [0.16, 0.28, 0.43], paint);
    sphere([side * 0.27, 1.16, 0.25], [0.12, 0.20, 0.30], darkPaint);
  }
  box([0, 1.62, -0.48], [0.48, 0.14, 0.72], darkPaint);
  sphere([0, 1.72, -0.44], [0.28, 0.09, 0.50], rubber);
  sphere([0, 1.70, -0.94], [0.31, 0.18, 0.33], paint);
  sphere([0, 1.70, -1.19], [0.11, 0.07, 0.06], red);

  // Front forks, handlebar, mirrors and headlight.
  for (const side of [-1, 1]) {
    rod([side * 0.12, 0.62, 1.15], [side * 0.12, 1.68, 0.93], 0.043, chrome);
    rod([side * 0.12, 0.68, 1.12], [side * 0.12, 1.54, 0.96], 0.06, darkPaint);
    rod([side * 0.22, 1.88, 0.86], [side * 0.49, 2.10, 0.88], 0.018, metal);
    sphere([side * 0.51, 2.12, 0.89], [0.12, 0.05, 0.085], darkPaint);
  }
  rod([-0.48, 1.87, 0.88], [0.48, 1.87, 0.88], 0.032, metal);
  for (const side of [-1, 1]) rod([side * 0.44, 1.87, 0.88], [side * 0.60, 1.87, 0.88], 0.05, rubber);
  sphere([0, 1.76, 1.02], [0.29, 0.22, 0.15], paint);
  sphere([0, 1.72, 1.13], [0.18, 0.16, 0.06], lamp);
  sphere([0, 1.02, 1.20], [0.32, 0.09, 0.43], paint);
  sphere([0, 0.98, -1.10], [0.27, 0.07, 0.34], darkPaint);

  // Exhaust, foot pegs, chain and brake details.
  rod([0.22, 0.82, -0.28], [0.30, 0.73, -0.91], 0.05, chrome);
  const muffler = add(new THREE.CylinderGeometry(0.095, 0.12, 0.52, 20), darkPaint, [0.32, 0.78, -0.78]);
  muffler.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) rod([side * 0.22, 0.84, -0.34], [side * 0.42, 0.84, -0.34], 0.032, chrome);
  const sprocket = add(new THREE.TorusGeometry(0.18, 0.022, 8, 32), gold, [0.16, 0.65, -1.12]);
  sprocket.rotation.y = Math.PI / 2;
  rod([0.16, 0.65, -1.12], [0.16, 0.84, -0.20], 0.014, gold);
  box([0.18, 0.70, 1.30], [0.09, 0.22, 0.15], gold);
  return bike;
}

export function Bike3DViewer({ alt, fallbackSrc }: Bike3DViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderer: any;
    let frame = 0;
    let resizeObserver: ResizeObserver | undefined;
    let pointerDown = false;
    let lastX = 0;
    let lastY = 0;
    let dragging = false;

    const host = hostRef.current;
    if (!host) return;

    const onPointerDown = (event: PointerEvent) => {
      pointerDown = true;
      dragging = false;
      lastX = event.clientX;
      lastY = event.clientY;
      host.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDown || !bikeGroup) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 1) dragging = true;
      bikeGroup.rotation.y += dx * 0.009;
      bikeGroup.rotation.x = Math.max(-0.28, Math.min(0.28, bikeGroup.rotation.x + dy * 0.004));
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerUp = () => { pointerDown = false; };

    let bikeGroup: any;
    const start = async () => {
      try {
        // Load Three.js as an external ES module so the showroom does not need a new build dependency.
        const THREE: ThreeModule = await import(/* @vite-ignore */ 'https://esm.sh/three@0.180.0');
        if (cancelled || !host) return;

        const scene = new THREE.Scene();
        scene.background = null;
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(3.7, 2.7, 4.8);
        camera.lookAt(0, 1.05, 0);

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(host.clientWidth || 640, host.clientHeight || 420);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.setAttribute('aria-label', alt);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.cursor = 'grab';
        host.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xddeaff, 0x242936, 2.0));
        const key = new THREE.DirectionalLight(0xffffff, 3.0);
        key.position.set(4, 7, 5);
        key.castShadow = true;
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x6aa8ff, 1.6);
        rim.position.set(-4, 3, -4);
        scene.add(rim);
        const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({ color: 0x20242b, transparent: true, opacity: 0.32 }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.015;
        scene.add(floor);

        bikeGroup = new THREE.Group();
        bikeGroup.add(buildMotorcycle(THREE));
        scene.add(bikeGroup);

        const resize = () => {
          if (!host || !renderer) return;
          const width = Math.max(1, host.clientWidth);
          const height = Math.max(1, host.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        host.addEventListener('pointerdown', onPointerDown);
        host.addEventListener('pointermove', onPointerMove);
        host.addEventListener('pointerup', onPointerUp);
        host.addEventListener('pointercancel', onPointerUp);

        let previous = performance.now();
        const animate = (now: number) => {
          if (cancelled) return;
          const delta = Math.min((now - previous) / 1000, 0.05);
          previous = now;
          if (!pointerDown && !dragging) bikeGroup.rotation.y += delta * 0.42;
          if (!pointerDown) dragging = false;
          renderer.render(scene, camera);
          frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
      } catch (error) {
        console.error('3D motorcycle viewer could not start:', error);
        if (!cancelled) setLoadError(true);
      }
    };

    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerUp);
      host.removeEventListener('pointercancel', onPointerUp);
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [alt]);

  return (
    <div ref={hostRef} className="relative h-full min-h-[320px] w-full touch-pan-y overflow-hidden">
      {loadError && fallbackSrc && (
        <img src={fallbackSrc} alt={alt} className="absolute inset-0 h-full w-full object-contain p-8" />
      )}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-white/85 backdrop-blur-sm">
        DRAG TO EXPLORE 360°
      </div>
    </div>
  );
}
