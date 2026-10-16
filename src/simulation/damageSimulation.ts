import type { SimulationState } from './types';
import { clamp } from './wallModel';

export function updateDamage(state: SimulationState, dt: number): void {
  for (const grid of [state.wall, state.slab, state.floor]) if (grid) for (const cell of grid.cells) {
    const damp = Math.max(0, cell.moisture - 18) / 82;
    cell.wetDuration = damp > .1 ? cell.wetDuration + dt : Math.max(0, cell.wetDuration - dt * .1);
    if (cell.material !== 'paint' && cell.material !== 'putty' && cell.material !== 'grout') continue;
    cell.surfaceCoating = Math.max(0, cell.surfaceCoating - damp * dt * .012);
    // Salt crystallization is strongest while a damp surface can evaporate.
    cell.saltLevel = clamp(cell.saltLevel + damp * (1 - cell.moisture / 110) * dt * .014);
    cell.damageLevel = clamp(cell.damageLevel + damp * cell.saltLevel * dt * .012);
    if (cell.wetDuration > 30) cell.moldLevel = clamp(cell.moldLevel + Math.max(0, cell.moisture - 30) / 70 * dt * .01);
    // Existing salt, blisters and mold damage persist after drying until surface repair.
  }
}
