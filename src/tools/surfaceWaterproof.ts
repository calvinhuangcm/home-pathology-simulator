import type { Domain, Point, SimulationState } from '../simulation/types';
import { cellIndex, gridPoint } from '../simulation/wallModel';

export interface CoatingResult { changed: number; cells: number[] }

/** Applies one hand-sized brush stamp to the face the user can actually paint. */
export function brushWaterproof(state: SimulationState, domain: Domain, point: Point, painted = new Set<number>(), radius = .42): CoatingResult {
  const grid = state[domain];
  if (!grid || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return { changed: 0, cells: [] };
  const center = gridPoint(grid, point), cellWidth = grid.width / grid.cols, cellHeight = grid.height / grid.rows;
  const spanX = Math.ceil(radius / cellWidth), spanY = Math.ceil(radius / cellHeight), changed: number[] = [];
  // A wall brush changes only the visible room-side finish. Slab and floor brushing target
  // their exposed tile faces. The finish can reduce local transport, but direct pipe feed and
  // the buried basement membrane source remain separate and still require source repair.
  const surfaceLayers = domain === 'wall' || domain === 'floor' ? [0] : [5];
  for (let y = Math.max(0, center.y - spanY); y <= Math.min(grid.rows - 1, center.y + spanY); y++) {
    for (let x = Math.max(0, center.x - spanX); x <= Math.min(grid.cols - 1, center.x + spanX); x++) {
      const dx = ((x - center.x) + .5) * cellWidth, dy = ((y - center.y) + .5) * cellHeight;
      if (Math.hypot(dx, dy) > radius) continue;
      for (const layer of surfaceLayers) {
        const index = cellIndex(grid, x, y, layer), key = domain === 'floor' ? index : layer * grid.cols * grid.rows + y * grid.cols + x;
        if (painted.has(key)) continue;
        const cell = grid.cells[index];
        cell.surfaceCoating = Math.min(1, cell.surfaceCoating + .22);
        painted.add(key); changed.push(index);
      }
    }
  }
  return { changed: changed.length, cells: changed };
}
