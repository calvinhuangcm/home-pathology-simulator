import type { Domain, Point, SimulationState } from '../simulation/types';
import { cellPoint, pointIndex } from '../simulation/wallModel';

/** Deterministic teaching estimate from modeled moisture, pressure, and modeled hot-water pipes. */
export function surfaceTemperatureC(state: SimulationState, point: Point, domain: Domain = 'wall'): number | null {
  const grid = state[domain];
  if (!grid) return null;
  const layer = domain === 'floor' ? 0 : domain === 'slab' ? 5 : 0;
  const moisture = grid.cells[pointIndex(grid, point, layer)].moisture;
  let value = state.environment.ambientTemperatureC - Math.max(0, moisture - 8) / 92 * 1.8;
  if (domain === 'wall') {
    const observation = cellPoint(grid, pointIndex(grid, point, 0));
    for (const pipe of state.pipes) {
      if (pipe.service !== 'supply' || pipe.pressure <= 0 || pipe.waterTemperatureC <= state.environment.ambientTemperatureC) continue;
      const nearest = Math.min(...pipe.cells.map(index => {
        const p = cellPoint(grid, index);
        return Math.hypot(p.x - observation.x, p.y - observation.y);
      }), Infinity);
      const transfer = Math.max(0, 1 - nearest / 1.35) * .075;
      value += (pipe.waterTemperatureC - state.environment.ambientTemperatureC) * transfer;
    }
  }
  const pressure = grid.cells[pointIndex(grid, point, layer)].waterPressure;
  return Math.round((value - Math.min(1.2, pressure * .8)) * 10) / 10;
}

export function thermalColor(temperatureC: number): string {
  // The teaching model usually spans roughly 19–25°C; use that tighter window
  // so a few degrees of modeled difference remain visible in the overlay.
  const t = Math.max(0, Math.min(1, (temperatureC - 19) / 6));
  // Ironbow-style palette based on the supplied thermal-camera reference:
  // cold areas stay nearly black purple, then pass through violet and red
  // before reaching orange/yellow at the hottest end.
  const stops: Array<[number, number, number, number]> = [
    [0, 18, 0, 35],
    [.2, 57, 0, 99],
    [.4, 139, 0, 111],
    [.58, 207, 20, 74],
    [.74, 241, 70, 27],
    [.9, 255, 157, 13],
    [1, 255, 234, 91],
  ];
  const upper = stops.findIndex(([position]) => position >= t);
  const start = stops[Math.max(0, upper - 1)];
  const end = stops[Math.max(0, upper)];
  const blend = end[0] === start[0] ? 0 : (t - start[0]) / (end[0] - start[0]);
  const channels = [1, 2, 3].map(channel => Math.round(start[channel] + (end[channel] - start[channel]) * blend));
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
}
