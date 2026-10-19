import type { Point, Port, SimulationState } from '../simulation/types';
import { cellPoint, pointIndex } from '../simulation/wallModel';

export function drill(state: SimulationState, position: Point): Port | null {
  if (!state.running || state.repairs.ports.length >= 16 || Math.abs(position.x) > state.wall.width / 2 || position.y < 0 || position.y > state.wall.height) return null;
  if (state.repairs.ports.some(p => Math.hypot(p.position.x - position.x, p.position.y - position.y) < .3)) return null;
  let nearest = pointIndex(state.wall, position, 3), distance = Infinity;
  for (const i of state.cracks) {
    if (Math.floor(i / (state.wall.cols * state.wall.rows)) !== 3) continue;
    const p = cellPoint(state.wall, i), d = Math.hypot(p.x - position.x, p.y - position.y);
    if (d < distance) { nearest = i; distance = d; }
  }
  const connected = distance < .3;
  const port = { id: state.repairs.nextId++, position: { ...position }, cell: connected ? nearest : pointIndex(state.wall, position, 3), connected, material: null, drillProgress: 0, inserted: false, volumeMl: 0 };
  state.repairs.ports.push(port);
  return port;
}
