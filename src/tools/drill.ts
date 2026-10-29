import type { DrillAim, DrillDirection, Point, Port, SimulationState } from '../simulation/types';
import { cellPoint, pointIndex } from '../simulation/wallModel';

const DRILL_AIM_DEPTH_M = .35;
const CRACK_HIT_TOLERANCE_M = .3;
const directionVector: Record<DrillDirection, Point> = {
  up: { x: 0, y: 1 }, down: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

export function drill(state: SimulationState, position: Point, aim: DrillAim = { direction: 'down', angleDeg: 45 }): Port | null {
  if (!state.running || !Number.isFinite(position.x) || !Number.isFinite(position.y)
    || state.repairs.ports.length >= 16 || Math.abs(position.x) > state.wall.width / 2 || position.y < 0 || position.y > state.wall.height) return null;
  if (state.repairs.ports.some(p => Math.hypot(p.position.x - position.x, p.position.y - position.y) < .3)) return null;
  const direction: DrillDirection = aim.direction in directionVector ? aim.direction : 'down';
  const angleDeg = Number.isFinite(aim.angleDeg) ? Math.max(0, Math.min(85, aim.angleDeg)) : 45;
  // 教學網格把鑽孔到 RC 裂縫面的距離簡化成 35 cm；45° 時橫向位移約 35 cm。
  // 這是可解釋的示範幾何，不是現場鑽孔深度或施工建議。
  const offset = DRILL_AIM_DEPTH_M * Math.tan(angleDeg * Math.PI / 180);
  const direction2d = directionVector[direction];
  const target = { x: position.x + direction2d.x * offset, y: position.y + direction2d.y * offset };
  let nearest = pointIndex(state.wall, target, 3), distance = Infinity;
  for (const i of state.cracks) {
    if (Math.floor(i / (state.wall.cols * state.wall.rows)) !== 3) continue;
    const p = cellPoint(state.wall, i), d = Math.hypot(p.x - target.x, p.y - target.y);
    if (d < distance) { nearest = i; distance = d; }
  }
  const connected = distance < CRACK_HIT_TOLERANCE_M;
  const port = { id: state.repairs.nextId++, position: { ...position }, cell: connected ? nearest : pointIndex(state.wall, target, 3), connected, material: null, drillDirection: direction, drillAngleDeg: angleDeg, drillProgress: 0, inserted: false, volumeMl: 0 };
  state.repairs.ports.push(port);
  return port;
}
