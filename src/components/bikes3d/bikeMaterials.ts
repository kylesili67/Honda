import * as THREE from 'three';

export interface BikeMaterialSet {
  paint: THREE.MeshPhysicalMaterial;
  paintAccent: THREE.MeshPhysicalMaterial;
  frameDark: THREE.MeshStandardMaterial;
  aluminum: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  engineDark: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  discSteel: THREE.MeshStandardMaterial;
  caliperAccent: THREE.MeshStandardMaterial;
  chainGold: THREE.MeshStandardMaterial;
  headlightLens: THREE.MeshStandardMaterial;
  tailLightLens: THREE.MeshStandardMaterial;
  indicatorAmber: THREE.MeshStandardMaterial;
  instrumentLcd: THREE.MeshStandardMaterial;
  plateBlank: THREE.MeshStandardMaterial;
  tankWordmark: THREE.MeshStandardMaterial | null;
  textures: THREE.Texture[];
}

function createTyreBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Procedural directional chevron tread grooves
    ctx.strokeStyle = '#1d1d1d';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let x = -32; x < canvas.width + 32; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + 18, 22);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 14, 64);
      ctx.lineTo(x + 32, 106);
      ctx.stroke();
    }

    // Center water channel
    ctx.fillStyle = '#252525';
    ctx.fillRect(0, 61, canvas.width, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 1);
  tex.needsUpdate = true;
  return tex;
}

function createLeatherBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#7f7f7f';
    ctx.fillRect(0, 0, 128, 128);
    // Deterministic subtle grain dots (no randomness mismatch)
    for (let y = 0; y < 128; y += 4) {
      for (let x = 0; x < 128; x += 4) {
        const shade = 105 + (((x * 17 + y * 31) % 37) - 18);
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  tex.needsUpdate = true;
  return tex;
}

function createInstrumentClusterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, 256, 128);

    // Subtle outer border
    ctx.strokeStyle = '#2A3140';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 120);

    // RPM arc
    ctx.beginPath();
    ctx.arc(82, 74, 42, Math.PI * 0.85, Math.PI * 2.05);
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 7;
    ctx.stroke();

    // Redline zone
    ctx.beginPath();
    ctx.arc(82, 74, 42, Math.PI * 1.75, Math.PI * 2.1);
    ctx.strokeStyle = '#D71920';
    ctx.lineWidth = 7;
    ctx.stroke();

    // Digital readout
    ctx.fillStyle = '#F5F7FA';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('00', 142, 68);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('KM/H', 146, 90);
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(212, 22, 16, 16);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createTankWordmarkTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 64);
    const label = text.trim().slice(0, 14).toUpperCase();
    ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
    ctx.font = '700 28px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 34);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function resolveAccentHex(paintHex: string): string {
  const normalized = paintHex.trim().toLowerCase();
  // Keep contrast crisp if main tank paint is already red
  if (normalized === '#d71920' || normalized === '#c0262d' || normalized === '#b01218') {
    return '#E5E7EB';
  }
  return '#D71920';
}

export function createBikeMaterials(
  paintHex = '#D71920',
  brandWordmark?: string
): BikeMaterialSet {
  const textures: THREE.Texture[] = [];
  const tyreBump = createTyreBumpTexture();
  const leatherBump = createLeatherBumpTexture();
  const lcdTex = createInstrumentClusterTexture();
  textures.push(tyreBump, leatherBump, lcdTex);

  const safeColor = paintHex && /^#[0-9a-f]{6}$/i.test(paintHex.trim()) ? paintHex.trim() : '#D71920';
  const accentHex = resolveAccentHex(safeColor);

  const paint = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(safeColor),
    metalness: 0.34,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.92,
    envMapIntensity: 1.25,
  });

  const paintAccent = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(accentHex),
    metalness: 0.42,
    roughness: 0.2,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.15,
  });

  const frameDark = new THREE.MeshStandardMaterial({
    color: 0x1b1e24,
    metalness: 0.72,
    roughness: 0.36,
    envMapIntensity: 1.0,
  });

  const aluminum = new THREE.MeshStandardMaterial({
    color: 0xb2bac6,
    metalness: 0.85,
    roughness: 0.28,
    envMapIntensity: 1.15,
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xedf1f6,
    metalness: 0.96,
    roughness: 0.12,
    envMapIntensity: 1.35,
  });

  const engineDark = new THREE.MeshStandardMaterial({
    color: 0x16181d,
    metalness: 0.35,
    roughness: 0.56,
    envMapIntensity: 0.9,
  });

  const rubber = new THREE.MeshStandardMaterial({
    color: 0x121417,
    metalness: 0.04,
    roughness: 0.88,
    bumpMap: tyreBump,
    bumpScale: 0.008,
  });

  const leather = new THREE.MeshStandardMaterial({
    color: 0x191b20,
    metalness: 0.05,
    roughness: 0.72,
    bumpMap: leatherBump,
    bumpScale: 0.004,
  });

  const discSteel = new THREE.MeshStandardMaterial({
    color: 0xc8cfd8,
    metalness: 0.9,
    roughness: 0.24,
    envMapIntensity: 1.2,
  });

  const caliperAccent = new THREE.MeshStandardMaterial({
    color: 0xd71920,
    metalness: 0.45,
    roughness: 0.32,
  });

  const chainGold = new THREE.MeshStandardMaterial({
    color: 0xc29842,
    metalness: 0.84,
    roughness: 0.26,
    envMapIntensity: 1.1,
  });

  const headlightLens = new THREE.MeshStandardMaterial({
    color: 0xf4f8ff,
    emissive: 0xd9ecff,
    emissiveIntensity: 1.55,
    roughness: 0.12,
    metalness: 0.1,
  });

  const tailLightLens = new THREE.MeshStandardMaterial({
    color: 0xd71920,
    emissive: 0xff1e26,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.15,
  });

  const indicatorAmber = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    metalness: 0.1,
  });

  const instrumentLcd = new THREE.MeshStandardMaterial({
    map: lcdTex,
    emissive: 0xffffff,
    emissiveMap: lcdTex,
    emissiveIntensity: 0.85,
    roughness: 0.22,
    metalness: 0.1,
  });

  const plateBlank = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    metalness: 0.18,
    roughness: 0.45,
  });

  let tankWordmark: THREE.MeshStandardMaterial | null = null;
  if (brandWordmark && brandWordmark.trim()) {
    const wordTex = createTankWordmarkTexture(brandWordmark);
    textures.push(wordTex);
    tankWordmark = new THREE.MeshStandardMaterial({
      map: wordTex,
      transparent: true,
      roughness: 0.3,
      metalness: 0.2,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }

  return {
    paint,
    paintAccent,
    frameDark,
    aluminum,
    chrome,
    engineDark,
    rubber,
    leather,
    discSteel,
    caliperAccent,
    chainGold,
    headlightLens,
    tailLightLens,
    indicatorAmber,
    instrumentLcd,
    plateBlank,
    tankWordmark,
    textures,
  };
}

export function disposeBikeMaterials(set: BikeMaterialSet): void {
  set.paint.dispose();
  set.paintAccent.dispose();
  set.frameDark.dispose();
  set.aluminum.dispose();
  set.chrome.dispose();
  set.engineDark.dispose();
  set.rubber.dispose();
  set.leather.dispose();
  set.discSteel.dispose();
  set.caliperAccent.dispose();
  set.chainGold.dispose();
  set.headlightLens.dispose();
  set.tailLightLens.dispose();
  set.indicatorAmber.dispose();
  set.instrumentLcd.dispose();
  set.plateBlank.dispose();
  set.tankWordmark?.dispose();
  for (const tex of set.textures) {
    tex.dispose();
  }
}
