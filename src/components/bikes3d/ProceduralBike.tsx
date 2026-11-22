import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  createBikeMaterials,
  disposeBikeMaterials,
  resolveAccentHex,
  type BikeMaterialSet,
} from './bikeMaterials';

export interface ProceduralBikeParts {
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  frame: THREE.Group;
  tank: THREE.Group;
  seat: THREE.Group;
  engine: THREE.Group;
  exhaust: THREE.Group;
  fork: THREE.Group;
  swingarm: THREE.Group;
  handlebar: THREE.Group;
  headlight: THREE.Group;
  tailLight: THREE.Group;
  frontFender: THREE.Group;
  rearFender: THREE.Group;
  sidePanels: THREE.Group;
  chainDrive: THREE.Group;
  footpegs: THREE.Group;
  kickstand: THREE.Group;
  numberPlate: THREE.Group;
}

export interface ProceduralBikeRig {
  group: THREE.Group;
  parts: ProceduralBikeParts;
  materials: BikeMaterialSet;
  triangleCount: number;
  setPaintColor: (hex: string) => void;
  dispose: () => void;
}

export interface BuildProceduralBikeOptions {
  paintHex?: string;
  brandWordmark?: string;
  lowDetail?: boolean;
}

function mergeNormalized(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geos.length === 0) return new THREE.BufferGeometry();
  const normalized = geos.map((raw) => {
    const g = raw.index ? raw.toNonIndexed() : raw.clone();
    if (!g.getAttribute('normal')) {
      g.computeVertexNormals();
    }
    if (!g.getAttribute('uv')) {
      const count = g.getAttribute('position').count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    // Keep only position, normal, uv for clean merging
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') {
        g.deleteAttribute(key);
      }
    }
    raw.dispose();
    return g;
  });

  const merged = mergeGeometries(normalized, false);
  for (const g of normalized) g.dispose();
  if (!merged) return new THREE.BufferGeometry();
  merged.computeBoundingSphere();
  return merged;
}

function makeTube(
  points: Array<[number, number, number]>,
  radius: number,
  tubularSegs: number,
  radialSegs: number
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, tubularSegs, radius, radialSegs, false);
}

function makeStrut(
  a: [number, number, number],
  b: [number, number, number],
  radiusTop: number,
  radiusBottom: number,
  radialSegs: number
): THREE.BufferGeometry {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = Math.max(0.001, dir.length());
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, len, radialSegs);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize()
  );
  const mat = new THREE.Matrix4().compose(
    start.clone().add(end).multiplyScalar(0.5),
    quat,
    new THREE.Vector3(1, 1, 1)
  );
  geo.applyMatrix4(mat);
  return geo;
}

function makePositionedGeo(
  geo: THREE.BufferGeometry,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1]
): THREE.BufferGeometry {
  const euler = new THREE.Euler(rot[0], rot[1], rot[2]);
  const quat = new THREE.Quaternion().setFromEuler(euler);
  const mat = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    quat,
    new THREE.Vector3(...scale)
  );
  geo.applyMatrix4(mat);
  return geo;
}

function createHelicalSpringGeo(
  start: [number, number, number],
  end: [number, number, number],
  coilRadius: number,
  wireRadius: number,
  turns: number,
  tubularSegs: number,
  radialSegs: number
): THREE.BufferGeometry {
  const p0 = new THREE.Vector3(...start);
  const p1 = new THREE.Vector3(...end);
  const axis = new THREE.Vector3().subVectors(p1, p0);
  const len = axis.length();
  const dir = axis.clone().normalize();
  const up = Math.abs(dir.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const orthoA = new THREE.Vector3().crossVectors(dir, up).normalize();
  const orthoB = new THREE.Vector3().crossVectors(dir, orthoA).normalize();

  const pts: THREE.Vector3[] = [];
  const totalSamples = turns * 10;
  for (let i = 0; i <= totalSamples; i++) {
    const t = i / totalSamples;
    const angle = t * turns * Math.PI * 2;
    const pt = p0
      .clone()
      .addScaledVector(dir, t * len)
      .addScaledVector(orthoA, Math.cos(angle) * coilRadius)
      .addScaledVector(orthoB, Math.sin(angle) * coilRadius);
    pts.push(pt);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, tubularSegs, wireRadius, radialSegs, false);
}

/**
 * Builds an original, generic modern commuter/sport motorcycle in Three.js.
 * Coordinate system: +Z = front, -Z = rear, +Y = up.
 * Units: 1 unit = 1 metre. Wheelbase = 1.32 m, length ≈ 2.0 m, height ≈ 1.12 m.
 * Pivot rests at ground center (0, 0, 0).
 */
export function buildProceduralBike(options: BuildProceduralBikeOptions = {}): ProceduralBikeRig {
  const { paintHex = '#D71920', brandWordmark, lowDetail = false } = options;

  const materials = createBikeMaterials(paintHex, brandWordmark);
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const makeMesh = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    castShadow = true,
    receiveShadow = true
  ) => {
    trackGeo(geo);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = castShadow;
    m.receiveShadow = receiveShadow;
    return m;
  };

  // LOD segments
  const tyreRadial = lowDetail ? 12 : 16;
  const tyreTubular = lowDetail ? 32 : 48;
  const tubeRadial = lowDetail ? 6 : 8;
  const cylSegs = lowDetail ? 12 : 20;

  const group = new THREE.Group();
  group.name = 'motorcycleRoot';

  const FRONT_Z = 0.66;
  const REAR_Z = -0.66;
  const WHEEL_RADIUS = 0.315; // 0.245 core + 0.070 tyre tube = 0.315 m so ground contact is y = 0

  // =========================================================
  // 1. WHEELS (frontWheel & rearWheel)
  // =========================================================
  const buildWheel = (isFront: boolean): THREE.Group => {
    const wheelGroup = new THREE.Group();
    wheelGroup.name = isFront ? 'frontWheel' : 'rearWheel';
    wheelGroup.position.set(0, WHEEL_RADIUS, isFront ? FRONT_Z : REAR_Z);

    const tubeR = isFront ? 0.068 : 0.076;
    const majorR = WHEEL_RADIUS - tubeR;

    // Tyre Torus
    const tyreGeo = makePositionedGeo(
      new THREE.TorusGeometry(majorR, tubeR, tyreRadial, tyreTubular),
      [0, 0, 0],
      [0, Math.PI / 2, 0]
    );
    wheelGroup.add(makeMesh(tyreGeo, materials.rubber));

    // Rim + Hub + 14 alloy/wire spokes merged
    const rimParts: THREE.BufferGeometry[] = [
      makePositionedGeo(
        new THREE.TorusGeometry(0.198, 0.017, 8, tyreTubular),
        [0, 0, 0],
        [0, Math.PI / 2, 0]
      ),
      makePositionedGeo(
        new THREE.TorusGeometry(0.184, 0.008, 6, tyreTubular),
        [0, 0, 0],
        [0, Math.PI / 2, 0]
      ),
      makePositionedGeo(
        new THREE.CylinderGeometry(0.048, 0.048, isFront ? 0.11 : 0.13, cylSegs),
        [0, 0, 0],
        [0, 0, Math.PI / 2]
      ),
    ];

    const spokeCount = 14;
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2;
      const sideOffset = (i % 2 === 0 ? 1 : -1) * 0.022;
      rimParts.push(
        makeStrut(
          [sideOffset, Math.sin(a) * 0.042, Math.cos(a) * 0.042],
          [0, Math.sin(a) * 0.188, Math.cos(a) * 0.188],
          0.0055,
          0.0045,
          lowDetail ? 5 : 6
        )
      );
    }

    const mergedRim = mergeNormalized(rimParts);
    wheelGroup.add(makeMesh(mergedRim, materials.aluminum));

    // Subtle Red Pin-Stripe on Rim
    const rimStripe = makePositionedGeo(
      new THREE.TorusGeometry(0.197, 0.0035, 6, tyreTubular),
      [isFront ? 0.015 : 0.016, 0, 0],
      [0, Math.PI / 2, 0]
    );
    const rimStripeR = makePositionedGeo(
      new THREE.TorusGeometry(0.197, 0.0035, 6, tyreTubular),
      [isFront ? -0.015 : -0.016, 0, 0],
      [0, Math.PI / 2, 0]
    );
    wheelGroup.add(makeMesh(mergeNormalized([rimStripe, rimStripeR]), materials.paintAccent, false));

    // Front Disc Brake (+ Drilled Rotor Look) OR Rear Drum/Disc & Sprocket
    if (isFront) {
      const rotorParts: THREE.BufferGeometry[] = [
        makePositionedGeo(
          new THREE.CylinderGeometry(0.132, 0.132, 0.006, 28),
          [0.056, 0, 0],
          [0, 0, Math.PI / 2]
        ),
        makePositionedGeo(
          new THREE.TorusGeometry(0.112, 0.0045, 6, 28),
          [0.059, 0, 0],
          [0, Math.PI / 2, 0]
        ),
        makePositionedGeo(
          new THREE.TorusGeometry(0.088, 0.0045, 6, 28),
          [0.059, 0, 0],
          [0, Math.PI / 2, 0]
        ),
      ];
      // Carrier bolts & drilled vent bosses
      for (let b = 0; b < 6; b++) {
        const ang = (b / 6) * Math.PI * 2;
        rotorParts.push(
          makePositionedGeo(
            new THREE.CylinderGeometry(0.006, 0.006, 0.01, 6),
            [0.056, Math.sin(ang) * 0.068, Math.cos(ang) * 0.068],
            [0, 0, Math.PI / 2]
          )
        );
      }
      wheelGroup.add(makeMesh(mergeNormalized(rotorParts), materials.discSteel));
    } else {
      // Rear smaller disc + left-side sprocket
      const rearDisc = makePositionedGeo(
        new THREE.CylinderGeometry(0.1, 0.1, 0.006, 24),
        [-0.068, 0, 0],
        [0, 0, Math.PI / 2]
      );
      wheelGroup.add(makeMesh(rearDisc, materials.discSteel));

      // Rear sprocket on +X (left side)
      const sprocketParts: THREE.BufferGeometry[] = [
        makePositionedGeo(
          new THREE.CylinderGeometry(0.105, 0.105, 0.008, 24),
          [0.072, 0, 0],
          [0, 0, Math.PI / 2]
        ),
      ];
      for (let t = 0; t < 18; t++) {
        const a = (t / 18) * Math.PI * 2;
        sprocketParts.push(
          makePositionedGeo(
            new THREE.BoxGeometry(0.008, 0.014, 0.014),
            [0.072, Math.sin(a) * 0.108, Math.cos(a) * 0.108],
            [a, 0, 0]
          )
        );
      }
      wheelGroup.add(makeMesh(mergeNormalized(sprocketParts), materials.chainGold));
    }

    return wheelGroup;
  };

  const frontWheel = buildWheel(true);
  const rearWheel = buildWheel(false);
  group.add(frontWheel, rearWheel);

  // =========================================================
  // 2. FRAME (Tubular Perimeter Frame + Subframe)
  // =========================================================
  const frame = new THREE.Group();
  frame.name = 'frame';

  const frameGeos: THREE.BufferGeometry[] = [
    // Steering head tube (24° rake)
    makeStrut([0, 0.72, 0.48], [0, 0.9, 0.4], 0.03, 0.03, cylSegs),
  ];

  for (const side of [-1, 1]) {
    const x = side * 0.072;
    // Main spine tube arching over tank to swingarm pivot
    frameGeos.push(
      makeTube(
        [
          [side * 0.03, 0.87, 0.41],
          [x * 1.15, 0.81, 0.16],
          [x * 1.25, 0.64, -0.06],
          [x * 1.1, 0.37, -0.18],
        ],
        0.019,
        18,
        tubeRadial
      )
    );
    // Front engine cradle downtube
    frameGeos.push(
      makeTube(
        [
          [side * 0.03, 0.74, 0.46],
          [x * 1.1, 0.52, 0.3],
          [x * 1.1, 0.26, 0.14],
          [x * 1.1, 0.25, -0.14],
          [x * 1.1, 0.37, -0.18],
        ],
        0.017,
        20,
        tubeRadial
      )
    );
    // Rear subframe seat rails
    frameGeos.push(
      makeTube(
        [
          [x * 1.1, 0.64, -0.06],
          [x * 1.05, 0.69, -0.45],
          [x * 0.85, 0.75, -0.78],
        ],
        0.014,
        14,
        tubeRadial
      ),
      makeStrut([x * 1.1, 0.38, -0.18], [x * 0.95, 0.71, -0.58], 0.012, 0.012, tubeRadial)
    );
  }
  // Cross braces
  frameGeos.push(
    makeStrut([-0.08, 0.37, -0.18], [0.08, 0.37, -0.18], 0.022, 0.022, cylSegs),
    makeStrut([-0.06, 0.75, -0.78], [0.06, 0.75, -0.78], 0.013, 0.013, tubeRadial)
  );

  frame.add(makeMesh(mergeNormalized(frameGeos), materials.frameDark));
  group.add(frame);

  // =========================================================
  // 3. FUEL TANK (Sculpted Extruded Profile + Clearcoat Paint)
  // =========================================================
  const tank = new THREE.Group();
  tank.name = 'tank';

  // Sculpted side-profile extruded and tapered smoothly in Z/X
  const tankShape = new THREE.Shape();
  tankShape.moveTo(-0.24, 0.0);
  tankShape.bezierCurveTo(-0.2, 0.12, -0.08, 0.2, 0.08, 0.19);
  tankShape.bezierCurveTo(0.21, 0.18, 0.29, 0.09, 0.28, -0.02);
  tankShape.bezierCurveTo(0.25, -0.09, 0.1, -0.08, -0.04, -0.07);
  tankShape.bezierCurveTo(-0.16, -0.07, -0.25, -0.05, -0.24, 0.0);

  const tankGeo = new THREE.ExtrudeGeometry(tankShape, {
    steps: 2,
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.065,
    bevelSize: 0.045,
    bevelSegments: lowDetail ? 4 : 7,
    curveSegments: lowDetail ? 12 : 20,
  });
  tankGeo.center();
  // Rotate so shape's X aligns with bike +Z (front) and extrusion depth aligns with X width
  tankGeo.rotateY(-Math.PI / 2);

  // Sculpt subtle teardrop taper: narrower toward seat (-Z), wider muscular shoulders at +Z
  const posAttr = tankGeo.getAttribute('position');
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const frontFactor = THREE.MathUtils.clamp((z + 0.28) / 0.56, 0, 1);
    const widthScale = THREE.MathUtils.lerp(0.72, 1.18, frontFactor);
    const crownTuck = y > 0 ? 1 - y * 0.9 : 1;
    posAttr.setX(i, x * widthScale * Math.max(0.68, crownTuck));
  }
  tankGeo.computeVertexNormals();
  tankGeo.translate(0, 0.855, 0.16);
  tank.add(makeMesh(tankGeo, materials.paint));

  // Tank lower knee shrouds & sport accent stripes
  const shroudGeos: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    shroudGeos.push(
      makePositionedGeo(
        new THREE.BoxGeometry(0.028, 0.12, 0.22),
        [side * 0.155, 0.77, 0.26],
        [0.18, side * -0.18, side * 0.12]
      )
    );
  }
  tank.add(makeMesh(mergeNormalized(shroudGeos), materials.paintAccent));

  // Recessed billet chrome fuel cap on tank top
  const capGeo = mergeNormalized([
    makePositionedGeo(new THREE.CylinderGeometry(0.036, 0.04, 0.012, 18), [0, 0.985, 0.21]),
    makePositionedGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.016, 14), [0, 0.99, 0.21]),
  ]);
  tank.add(makeMesh(capGeo, materials.chrome));

  // Optional neutral text wordmark on left & right flanks of tank (plain text only, no trademark icons)
  if (materials.tankWordmark) {
    const leftBadge = makeMesh(
      makePositionedGeo(new THREE.PlaneGeometry(0.16, 0.04), [0.168, 0.87, 0.18], [0, Math.PI / 2, 0]),
      materials.tankWordmark,
      false,
      false
    );
    const rightBadge = makeMesh(
      makePositionedGeo(new THREE.PlaneGeometry(0.16, 0.04), [-0.168, 0.87, 0.18], [0, -Math.PI / 2, 0]),
      materials.tankWordmark,
      false,
      false
    );
    tank.add(leftBadge, rightBadge);
  }

  group.add(tank);

  // =========================================================
  // 4. SEAT & REAR COWL
  // =========================================================
  const seat = new THREE.Group();
  seat.name = 'seat';

  const seatShape = new THREE.Shape();
  seatShape.moveTo(-0.34, 0.04); // rear pillion
  seatShape.quadraticCurveTo(-0.22, 0.06, -0.14, 0.015); // step down
  seatShape.quadraticCurveTo(0.02, -0.02, 0.2, 0.01); // rider saddle
  seatShape.lineTo(0.21, -0.04);
  seatShape.lineTo(-0.33, -0.035);
  seatShape.closePath();

  const seatGeo = new THREE.ExtrudeGeometry(seatShape, {
    steps: 1,
    depth: 0.17,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.022,
    bevelSegments: lowDetail ? 3 : 5,
  });
  seatGeo.center();
  seatGeo.rotateY(-Math.PI / 2);
  seatGeo.translate(0, 0.775, -0.34);
  seat.add(makeMesh(seatGeo, materials.leather));

  // Painted Rear Tail Cowl & Grab Rail
  const cowlShape = new THREE.Shape();
  cowlShape.moveTo(-0.22, -0.02);
  cowlShape.lineTo(0.2, 0.02);
  cowlShape.lineTo(0.18, 0.085);
  cowlShape.quadraticCurveTo(-0.04, 0.08, -0.23, 0.025);
  cowlShape.closePath();

  const cowlGeo = new THREE.ExtrudeGeometry(cowlShape, {
    steps: 1,
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.018,
    bevelSegments: 3,
  });
  cowlGeo.center();
  cowlGeo.rotateY(-Math.PI / 2);
  cowlGeo.translate(0, 0.77, -0.67);
  seat.add(makeMesh(cowlGeo, materials.paint));

  // Pillion rear grab rail
  const grabRail = makeTube(
    [
      [-0.085, 0.79, -0.66],
      [-0.095, 0.825, -0.82],
      [0, 0.835, -0.855],
      [0.095, 0.825, -0.82],
      [0.085, 0.79, -0.66],
    ],
    0.011,
    18,
    tubeRadial
  );
  seat.add(makeMesh(grabRail, materials.aluminum));
  group.add(seat);

  // =========================================================
  // 5. ENGINE BLOCK (Crankcase, Cylinder, Cooling Fins, Covers)
  // =========================================================
  const engine = new THREE.Group();
  engine.name = 'engine';

  const engineDarkParts: THREE.BufferGeometry[] = [
    // Lower crankcase
    makePositionedGeo(new THREE.BoxGeometry(0.2, 0.2, 0.25), [0, 0.36, 0.03]),
    // Tilted cylinder block
    makePositionedGeo(new THREE.CylinderGeometry(0.072, 0.075, 0.17, cylSegs), [0, 0.52, 0.09], [0.28, 0, 0]),
    // Cylinder head
    makePositionedGeo(new THREE.BoxGeometry(0.16, 0.085, 0.15), [0, 0.62, 0.12], [0.28, 0, 0]),
    // EFI throttle body / intake boot behind cylinder
    makePositionedGeo(new THREE.CylinderGeometry(0.028, 0.032, 0.12, 12), [0, 0.56, -0.02], [1.1, 0, 0]),
  ];
  engine.add(makeMesh(mergeNormalized(engineDarkParts), materials.engineDark));

  // Brushed Silver Crankcase Covers + Stacked Cooling Fins
  const engineAlloyParts: THREE.BufferGeometry[] = [
    // Left stator cover
    makePositionedGeo(new THREE.CylinderGeometry(0.088, 0.092, 0.035, cylSegs), [0.112, 0.355, 0.01], [0, 0, Math.PI / 2]),
    // Right clutch cover
    makePositionedGeo(new THREE.CylinderGeometry(0.096, 0.1, 0.04, cylSegs), [-0.115, 0.355, 0.04], [0, 0, Math.PI / 2]),
    // Valve cover cap
    makePositionedGeo(new THREE.BoxGeometry(0.14, 0.024, 0.12), [0, 0.67, 0.135], [0.28, 0, 0]),
  ];
  // 7 stacked cooling fins along tilted cylinder axis
  for (let f = 0; f < 7; f++) {
    const offset = f * 0.02;
    engineAlloyParts.push(
      makePositionedGeo(
        new THREE.BoxGeometry(0.175, 0.008, 0.165),
        [0, 0.455 + offset * 0.96, 0.07 + offset * 0.27],
        [0.28, 0, 0]
      )
    );
  }
  engine.add(makeMesh(mergeNormalized(engineAlloyParts), materials.aluminum));
  group.add(engine);

  // =========================================================
  // 6. EXHAUST (Curved Header + Upswept Muffler + Heat Shield)
  // =========================================================
  const exhaust = new THREE.Group();
  exhaust.name = 'exhaust';

  const headerPipe = makeTube(
    [
      [0, 0.58, 0.19],
      [-0.08, 0.49, 0.27],
      [-0.125, 0.26, 0.22],
      [-0.135, 0.22, -0.05],
      [-0.15, 0.26, -0.34],
    ],
    0.02,
    24,
    tubeRadial
  );
  exhaust.add(makeMesh(headerPipe, materials.chrome));

  // Muffler canister + heat shield
  const mufflerBody = makePositionedGeo(
    new THREE.CylinderGeometry(0.052, 0.042, 0.42, cylSegs),
    [-0.165, 0.33, -0.54],
    [1.34, 0, -0.04]
  );
  const mufflerTip = makePositionedGeo(
    new THREE.CylinderGeometry(0.036, 0.05, 0.06, cylSegs),
    [-0.17, 0.382, -0.76],
    [1.34, 0, -0.04]
  );
  exhaust.add(makeMesh(mufflerBody, materials.engineDark));
  exhaust.add(makeMesh(mufflerTip, materials.chrome));

  const heatShield = makePositionedGeo(
    new THREE.BoxGeometry(0.018, 0.055, 0.28),
    [-0.214, 0.33, -0.53],
    [-0.23, 0, 0]
  );
  exhaust.add(makeMesh(heatShield, materials.aluminum));
  group.add(exhaust);

  // =========================================================
  // 7. FRONT FORK, HANDLEBAR, MIRRORS, INSTRUMENT CLUSTER
  // =========================================================
  const fork = new THREE.Group();
  fork.name = 'fork';

  const forkChrome: THREE.BufferGeometry[] = [];
  const forkDark: THREE.BufferGeometry[] = [];

  for (const side of [-1, 1]) {
    const fx = side * 0.088;
    // Lower fork leg (dark anodized slider)
    forkDark.push(makeStrut([fx, WHEEL_RADIUS, FRONT_Z], [fx, 0.62, 0.53], 0.026, 0.024, cylSegs));
    // Upper chrome stanchion tube
    forkChrome.push(makeStrut([fx, 0.58, 0.545], [fx, 0.91, 0.41], 0.019, 0.019, cylSegs));
  }
  // Upper & lower triple clamps
  forkDark.push(
    makePositionedGeo(new THREE.BoxGeometry(0.21, 0.024, 0.065), [0, 0.895, 0.415], [0.38, 0, 0]),
    makePositionedGeo(new THREE.BoxGeometry(0.21, 0.026, 0.065), [0, 0.715, 0.49], [0.38, 0, 0])
  );
  // Front brake caliper mounted to right lower fork leg (x = +0.075 near front rotor)
  const frontCaliper = makePositionedGeo(
    new THREE.BoxGeometry(0.036, 0.075, 0.055),
    [0.068, WHEEL_RADIUS + 0.05, FRONT_Z - 0.11],
    [-0.4, 0, 0]
  );
  fork.add(makeMesh(frontCaliper, materials.caliperAccent));
  fork.add(makeMesh(mergeNormalized(forkDark), materials.frameDark));
  fork.add(makeMesh(mergeNormalized(forkChrome), materials.chrome));

  // Handlebar sub-group
  const handlebar = new THREE.Group();
  handlebar.name = 'handlebar';

  const barTube = makeTube(
    [
      [-0.31, 0.96, 0.34],
      [-0.18, 0.97, 0.38],
      [-0.07, 0.935, 0.4],
      [0.07, 0.935, 0.4],
      [0.18, 0.97, 0.38],
      [0.31, 0.96, 0.34],
    ],
    0.013,
    20,
    tubeRadial
  );
  handlebar.add(makeMesh(barTube, materials.frameDark));

  // Rubber grips + bar ends + levers + mirrors
  const gripParts: THREE.BufferGeometry[] = [];
  const leverParts: THREE.BufferGeometry[] = [];
  const mirrorCaps: THREE.BufferGeometry[] = [];

  for (const side of [-1, 1]) {
    gripParts.push(
      makeStrut([side * 0.21, 0.965, 0.365], [side * 0.32, 0.958, 0.335], 0.018, 0.018, 12)
    );
    leverParts.push(
      makeStrut([side * 0.2, 0.955, 0.39], [side * 0.295, 0.948, 0.368], 0.006, 0.005, 6),
      makeStrut([side * 0.18, 0.975, 0.38], [side * 0.26, 1.09, 0.39], 0.006, 0.006, 6)
    );
    mirrorCaps.push(
      makePositionedGeo(
        new THREE.BoxGeometry(0.095, 0.048, 0.022),
        [side * 0.295, 1.105, 0.39],
        [0.1, side * -0.22, side * -0.08]
      )
    );
  }
  handlebar.add(makeMesh(mergeNormalized(gripParts), materials.rubber));
  handlebar.add(makeMesh(mergeNormalized(leverParts), materials.aluminum));
  handlebar.add(makeMesh(mergeNormalized(mirrorCaps), materials.engineDark));

  // Instrument cluster housing + emissive digital LCD screen
  const clusterHousing = makePositionedGeo(
    new THREE.BoxGeometry(0.115, 0.068, 0.042),
    [0, 0.965, 0.465],
    [-0.65, 0, 0]
  );
  handlebar.add(makeMesh(clusterHousing, materials.engineDark));

  const clusterScreen = makePositionedGeo(
    new THREE.PlaneGeometry(0.096, 0.048),
    [0, 0.98, 0.451],
    [-0.65 + Math.PI, Math.PI, 0]
  );
  // Orient LCD toward rider (-Z, +Y)
  const lcdPlane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.096, 0.048)), materials.instrumentLcd);
  lcdPlane.position.set(0, 0.979, 0.45);
  lcdPlane.rotation.set(-0.92, Math.PI, 0);
  handlebar.add(lcdPlane);
  // Dispose unused temp plane
  clusterScreen.dispose();

  fork.add(handlebar);
  group.add(fork);

  // =========================================================
  // 8. SWINGARM, DUAL REAR SHOCKS & CHAIN DRIVE
  // =========================================================
  const swingarm = new THREE.Group();
  swingarm.name = 'swingarm';

  const swingGeos: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    swingGeos.push(
      makeStrut([side * 0.095, 0.37, -0.18], [side * 0.095, WHEEL_RADIUS, REAR_Z], 0.022, 0.018, 8)
    );
  }
  swingGeos.push(
    makePositionedGeo(new THREE.BoxGeometry(0.19, 0.036, 0.06), [0, 0.365, -0.23])
  );
  swingarm.add(makeMesh(mergeNormalized(swingGeos), materials.aluminum));

  // Dual Coil-Over Rear Shocks
  const shockBodies: THREE.BufferGeometry[] = [];
  const shockSprings: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const sx = side * 0.1;
    shockBodies.push(makeStrut([sx, 0.36, -0.58], [sx, 0.68, -0.44], 0.014, 0.014, 8));
    shockSprings.push(
      createHelicalSpringGeo([sx, 0.4, -0.562], [sx, 0.64, -0.458], 0.025, 0.0055, 7, 36, 5)
    );
  }
  swingarm.add(makeMesh(mergeNormalized(shockBodies), materials.chrome));
  swingarm.add(makeMesh(mergeNormalized(shockSprings), materials.paintAccent));
  group.add(swingarm);

  // Chain Drive + Guard
  const chainDrive = new THREE.Group();
  chainDrive.name = 'chainDrive';
  const chainLoop = makeTube(
    [
      [0.072, 0.42, REAR_Z],
      [0.072, 0.41, -0.13],
      [0.072, 0.32, -0.13],
      [0.072, 0.21, REAR_Z],
      [0.072, 0.315, REAR_Z - 0.105],
      [0.072, 0.42, REAR_Z],
    ],
    0.009,
    24,
    6
  );
  chainDrive.add(makeMesh(chainLoop, materials.chainGold));
  const chainGuard = makePositionedGeo(
    new THREE.BoxGeometry(0.028, 0.022, 0.42),
    [0.076, 0.435, -0.42],
    [0.02, 0, 0]
  );
  chainDrive.add(makeMesh(chainGuard, materials.engineDark));
  group.add(chainDrive);

  // =========================================================
  // 9. HEADLIGHT, TAIL LIGHT, INDICATORS & NUMBER PLATE
  // =========================================================
  const headlight = new THREE.Group();
  headlight.name = 'headlight';

  const headlightShell = makePositionedGeo(
    new THREE.CylinderGeometry(0.092, 0.068, 0.11, cylSegs),
    [0, 0.855, 0.525],
    [Math.PI / 2 - 0.12, 0, 0]
  );
  headlight.add(makeMesh(headlightShell, materials.engineDark));

  // Chrome bezel + LED lens + small tinted flyscreen
  const bezel = makePositionedGeo(
    new THREE.TorusGeometry(0.09, 0.008, 8, cylSegs),
    [0, 0.861, 0.578],
    [-0.12, 0, 0]
  );
  headlight.add(makeMesh(bezel, materials.chrome));

  const lens = makePositionedGeo(
    new THREE.SphereGeometry(0.084, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
    [0, 0.861, 0.562],
    [Math.PI / 2 - 0.12, 0, 0]
  );
  headlight.add(makeMesh(lens, materials.headlightLens, false, false));

  // Front amber indicators
  const indicatorStalks: THREE.BufferGeometry[] = [];
  const indicatorBulbs: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    indicatorStalks.push(makeStrut([side * 0.095, 0.84, 0.52], [side * 0.145, 0.84, 0.525], 0.007, 0.007, 6));
    indicatorBulbs.push(
      makePositionedGeo(new THREE.SphereGeometry(0.017, 10, 8), [side * 0.155, 0.84, 0.528], [0, 0, 0], [0.8, 0.8, 1.3])
    );
  }
  headlight.add(makeMesh(mergeNormalized(indicatorStalks), materials.engineDark));
  headlight.add(makeMesh(mergeNormalized(indicatorBulbs), materials.indicatorAmber, false, false));
  group.add(headlight);

  // Tail Light + Rear Indicators
  const tailLight = new THREE.Group();
  tailLight.name = 'tailLight';
  const tailLens = makePositionedGeo(
    new THREE.BoxGeometry(0.11, 0.036, 0.03),
    [0, 0.77, -0.89],
    [-0.2, 0, 0]
  );
  tailLight.add(makeMesh(tailLens, materials.tailLightLens, false, false));

  const rearStalks: THREE.BufferGeometry[] = [];
  const rearBulbs: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    rearStalks.push(makeStrut([side * 0.055, 0.7, -0.87], [side * 0.115, 0.7, -0.87], 0.006, 0.006, 6));
    rearBulbs.push(
      makePositionedGeo(new THREE.SphereGeometry(0.016, 10, 8), [side * 0.122, 0.7, -0.87], [0, 0, 0], [0.8, 0.8, 1.3])
    );
  }
  tailLight.add(makeMesh(mergeNormalized(rearStalks), materials.engineDark));
  tailLight.add(makeMesh(mergeNormalized(rearBulbs), materials.indicatorAmber, false, false));
  group.add(tailLight);

  // Blank Number Plate Placeholder (no text)
  const numberPlate = new THREE.Group();
  numberPlate.name = 'numberPlate';
  const plateBracket = makeStrut([0, 0.74, -0.86], [0, 0.62, -0.94], 0.012, 0.012, 6);
  numberPlate.add(makeMesh(plateBracket, materials.frameDark));
  const plateMesh = makePositionedGeo(
    new THREE.BoxGeometry(0.145, 0.085, 0.006),
    [0, 0.6, -0.955],
    [-0.3, 0, 0]
  );
  numberPlate.add(makeMesh(plateMesh, materials.plateBlank));
  group.add(numberPlate);

  // =========================================================
  // 10. FENDERS, SIDE PANELS, FOOTPEGS, KICKSTAND
  // =========================================================
  const frontFender = new THREE.Group();
  frontFender.name = 'frontFender';
  // Curved mudguard hugging front tyre
  const frontFenderGeo = new THREE.CylinderGeometry(0.345, 0.345, 0.135, 20, 1, true, -0.75, 1.5);
  frontFenderGeo.rotateZ(Math.PI / 2);
  frontFenderGeo.rotateX(-0.2);
  frontFenderGeo.translate(0, WHEEL_RADIUS, FRONT_Z);
  // Give fender double-sided visibility via thin extrude feel or DoubleSide
  const frontFenderMat = materials.paint.clone();
  frontFenderMat.side = THREE.DoubleSide;
  const frontFenderMesh = makeMesh(frontFenderGeo, frontFenderMat);
  frontFender.add(frontFenderMesh);
  group.add(frontFender);

  const rearFender = new THREE.Group();
  rearFender.name = 'rearFender';
  const rearFenderGeo = new THREE.CylinderGeometry(0.355, 0.355, 0.155, 18, 1, true, -2.55, 1.35);
  rearFenderGeo.rotateZ(Math.PI / 2);
  rearFenderGeo.translate(0, WHEEL_RADIUS, REAR_Z);
  const rearFenderMat = materials.engineDark.clone();
  rearFenderMat.side = THREE.DoubleSide;
  rearFender.add(makeMesh(rearFenderGeo, rearFenderMat));
  group.add(rearFender);

  // Side Panels
  const sidePanels = new THREE.Group();
  sidePanels.name = 'sidePanels';
  const panelGeos: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    panelGeos.push(
      makePositionedGeo(
        new THREE.BoxGeometry(0.025, 0.17, 0.28),
        [side * 0.115, 0.59, -0.22],
        [-0.22, side * 0.12, side * -0.14]
      )
    );
  }
  sidePanels.add(makeMesh(mergeNormalized(panelGeos), materials.engineDark));
  group.add(sidePanels);

  // Rider + Pillion Footpegs
  const footpegs = new THREE.Group();
  footpegs.name = 'footpegs';
  const pegGeos: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    pegGeos.push(
      makeStrut([side * 0.095, 0.29, -0.08], [side * 0.185, 0.285, -0.08], 0.012, 0.011, 8),
      makeStrut([side * 0.095, 0.39, -0.44], [side * 0.175, 0.385, -0.44], 0.011, 0.01, 8)
    );
  }
  footpegs.add(makeMesh(mergeNormalized(pegGeos), materials.aluminum));
  group.add(footpegs);

  // Left-side Kickstand grounded cleanly at y = 0.005
  const kickstand = new THREE.Group();
  kickstand.name = 'kickstand';
  const standGeo = mergeNormalized([
    makeStrut([0.1, 0.26, -0.14], [0.22, 0.01, -0.22], 0.01, 0.008, 8),
    makePositionedGeo(new THREE.CylinderGeometry(0.022, 0.024, 0.012, 10), [0.22, 0.006, -0.22]),
  ]);
  kickstand.add(makeMesh(standGeo, materials.frameDark));
  group.add(kickstand);

  // Compute total triangles for verification/telemetry
  let triangleCount = 0;
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      const geo = obj.geometry;
      triangleCount += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    }
  });

  return {
    group,
    parts: {
      frontWheel,
      rearWheel,
      frame,
      tank,
      seat,
      engine,
      exhaust,
      fork,
      swingarm,
      handlebar,
      headlight,
      tailLight,
      frontFender,
      rearFender,
      sidePanels,
      chainDrive,
      footpegs,
      kickstand,
      numberPlate,
    },
    materials,
    triangleCount: Math.round(triangleCount),
    setPaintColor: (hex: string) => {
      const safe = hex && /^#[0-9a-f]{6}$/i.test(hex.trim()) ? hex.trim() : '#D71920';
      materials.paint.color.set(safe);
      frontFenderMat.color.set(safe);
      materials.paintAccent.color.set(resolveAccentHex(safe));
    },
    dispose: () => {
      for (const geo of geometries) geo.dispose();
      frontFenderMat.dispose();
      rearFenderMat.dispose();
      disposeBikeMaterials(materials);
    },
  };
}
