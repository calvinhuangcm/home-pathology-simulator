export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface LessonGeometry {
  azimuthDeg: number;
  tiltDeg: number;
  boreDepthCm: number;
  needleDepthCm: number;
}

export interface CrackIntersection {
  connected: boolean;
  distanceCm: number;
  boreDepthCm: number;
  point: Vec3;
  crackSegment: number;
  crackSegmentT: number;
}

export interface InjectionLessonState extends LessonGeometry {
  injecting: boolean;
  elapsedSeconds: number;
  injectedMl: number;
  boreFlowFrontCm: number;
  crackFlowLengthCm: number;
  maxCrackLengthCm: number;
}

export const LESSON_ENTRY: Vec3 = { x: 20, y: 55, z: 0 };

// A fixed, branching fracture lets the learner test whether a 3D bore path actually reaches it.
export const LESSON_CRACK: Vec3[] = [
  { x: 31.6, y: 72, z: 0.7 },
  { x: 31.3, y: 64, z: 5 },
  { x: 31, y: 52, z: 11 },
  { x: 31.6, y: 43, z: 16 },
  { x: 29.5, y: 34, z: 23 },
];

export const LESSON_BRANCH: Vec3[] = [
  LESSON_CRACK[2]!,
  { x: 36, y: 56, z: 14 },
  { x: 40, y: 58, z: 18 },
  { x: 46, y: 59, z: 22 },
];

export const FIXED_STEP_SECONDS = 1 / 60;
const MIN_BORE_DEPTH_CM = 5;
const MAX_BORE_DEPTH_CM = 30;
const MAX_NEEDLE_DEPTH_CM = 30;
const CONNECTION_TOLERANCE_CM = 1.8;
const MAX_INJECTION_ML = 600;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const distance = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export function normalizedGeometry(input: LessonGeometry): LessonGeometry {
  const boreDepthCm = clamp(Number.isFinite(input.boreDepthCm) ? input.boreDepthCm : 18, MIN_BORE_DEPTH_CM, MAX_BORE_DEPTH_CM);
  return {
    azimuthDeg: clamp(Number.isFinite(input.azimuthDeg) ? input.azimuthDeg : 105, 0, 359),
    tiltDeg: clamp(Number.isFinite(input.tiltDeg) ? input.tiltDeg : 45, 0, 85),
    boreDepthCm,
    needleDepthCm: clamp(Number.isFinite(input.needleDepthCm) ? input.needleDepthCm : 15, 0, Math.min(boreDepthCm, MAX_NEEDLE_DEPTH_CM)),
  };
}

export function boreDirection(azimuthDeg: number, tiltDeg: number): Vec3 {
  const azimuth = azimuthDeg * Math.PI / 180;
  const tilt = tiltDeg * Math.PI / 180;
  return {
    x: Math.sin(tilt) * Math.sin(azimuth),
    y: Math.sin(tilt) * Math.cos(azimuth),
    z: Math.cos(tilt),
  };
}

export function borePointAt(geometry: LessonGeometry, depthCm: number): Vec3 {
  const direction = boreDirection(geometry.azimuthDeg, geometry.tiltDeg);
  return {
    x: LESSON_ENTRY.x + direction.x * depthCm,
    y: LESSON_ENTRY.y + direction.y * depthCm,
    z: LESSON_ENTRY.z + direction.z * depthCm,
  };
}

function pointToSegment(point: Vec3, start: Vec3, end: Vec3): { distanceCm: number; t: number; point: Vec3 } {
  const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
  const lengthSquared = dx * dx + dy * dy + dz * dz;
  const t = lengthSquared === 0 ? 0 : clamp(((point.x - start.x) * dx + (point.y - start.y) * dy + (point.z - start.z) * dz) / lengthSquared, 0, 1);
  const nearest = { x: start.x + dx * t, y: start.y + dy * t, z: start.z + dz * t };
  return { distanceCm: distance(point, nearest), t, point: nearest };
}

export function findCrackIntersection(geometry: LessonGeometry): CrackIntersection {
  let best: CrackIntersection = {
    connected: false,
    distanceCm: Number.POSITIVE_INFINITY,
    boreDepthCm: 0,
    point: LESSON_ENTRY,
    crackSegment: 0,
    crackSegmentT: 0,
  };
  const sampleCount = Math.max(1, Math.ceil(geometry.boreDepthCm / .2));
  for (let sample = 0; sample <= sampleCount; sample += 1) {
    const boreDepthCm = geometry.boreDepthCm * sample / sampleCount;
    const borePoint = borePointAt(geometry, boreDepthCm);
    for (let segment = 0; segment < LESSON_CRACK.length - 1; segment += 1) {
      const candidate = pointToSegment(borePoint, LESSON_CRACK[segment]!, LESSON_CRACK[segment + 1]!);
      if (candidate.distanceCm < best.distanceCm) {
        best = {
          connected: false,
          distanceCm: candidate.distanceCm,
          boreDepthCm,
          point: candidate.point,
          crackSegment: segment,
          crackSegmentT: candidate.t,
        };
      }
    }
  }
  return { ...best, connected: best.distanceCm <= CONNECTION_TOLERANCE_CM };
}

export function createInjectionLessonState(input: Partial<LessonGeometry> = {}): InjectionLessonState {
  const geometry = normalizedGeometry({
    azimuthDeg: input.azimuthDeg ?? 105,
    tiltDeg: input.tiltDeg ?? 45,
    boreDepthCm: input.boreDepthCm ?? 18,
    needleDepthCm: input.needleDepthCm ?? 15,
  });
  const crackLength = LESSON_CRACK.slice(1).reduce((sum, point, index) => sum + distance(LESSON_CRACK[index]!, point), 0);
  const branchLength = LESSON_BRANCH.slice(1).reduce((sum, point, index) => sum + distance(LESSON_BRANCH[index]!, point), 0);
  return {
    ...geometry,
    injecting: false,
    elapsedSeconds: 0,
    injectedMl: 0,
    boreFlowFrontCm: geometry.needleDepthCm,
    crackFlowLengthCm: 0,
    maxCrackLengthCm: crackLength + branchLength,
  };
}

export function updateLessonGeometry(state: InjectionLessonState, input: LessonGeometry): void {
  const next = normalizedGeometry(input);
  state.azimuthDeg = next.azimuthDeg;
  state.tiltDeg = next.tiltDeg;
  state.boreDepthCm = next.boreDepthCm;
  state.needleDepthCm = next.needleDepthCm;
  state.injecting = false;
  state.elapsedSeconds = 0;
  state.injectedMl = 0;
  state.boreFlowFrontCm = next.needleDepthCm;
  state.crackFlowLengthCm = 0;
}

export function toggleInjection(state: InjectionLessonState): boolean {
  if (state.injectedMl >= MAX_INJECTION_ML) {
    state.injectedMl = 0;
    state.elapsedSeconds = 0;
    state.boreFlowFrontCm = state.needleDepthCm;
    state.crackFlowLengthCm = 0;
  }
  state.injecting = !state.injecting;
  return state.injecting;
}

export function resetInjection(state: InjectionLessonState): void {
  state.injecting = false;
  state.elapsedSeconds = 0;
  state.injectedMl = 0;
  state.boreFlowFrontCm = state.needleDepthCm;
  state.crackFlowLengthCm = 0;
}

export function updateInjectionLesson(state: InjectionLessonState, deltaTime: number): void {
  if (!state.injecting || !Number.isFinite(deltaTime) || deltaTime <= 0) return;
  const dt = Math.min(deltaTime, .1);
  state.elapsedSeconds += dt;
  state.injectedMl = Math.min(MAX_INJECTION_ML, state.injectedMl + 42 * dt);
  state.boreFlowFrontCm = Math.min(state.boreDepthCm, state.needleDepthCm + state.elapsedSeconds * 4.2);

  const intersection = findCrackIntersection(state);
  const needleOvershotJunction = intersection.connected && state.needleDepthCm > intersection.boreDepthCm + 3;
  if (intersection.connected && !needleOvershotJunction && state.boreFlowFrontCm >= intersection.boreDepthCm) {
    state.crackFlowLengthCm = Math.min(state.maxCrackLengthCm, state.crackFlowLengthCm + dt * 3.4);
  }
  if (state.injectedMl >= MAX_INJECTION_ML) state.injecting = false;
}
