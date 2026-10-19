import { createBathroom } from '../scenarios/bathroom';
import { updateBathroomRepairs } from './bathroomRepairs';
import { createExteriorCrack } from '../scenarios/exteriorCrack';
import { createDiagnosticScenario } from '../scenarios/diagnostic';
import { updateDamage } from './damageSimulation';
import { updateRepairs } from './repairSimulation';
import { updateWater } from './waterSimulation';
import type { ScenarioId, SimulationState } from './types';

export class SimulationEngine {
  state: SimulationState = createExteriorCrack();
  readonly fixedStep = .05;
  private accumulator = 0;
  private delta = new Float64Array(this.state.wall.cells.length);
  private slabDelta = new Float64Array(0);
  private floorDelta = new Float64Array(0);
  constructor(scenario: ScenarioId = 'crack') { this.reset(scenario); }
  reset(scenario: ScenarioId = 'crack'): void {
    this.state = scenario === 'crack' ? createExteriorCrack()
      : scenario === 'bathroom' || scenario === 'hotpipe' ? createBathroom(scenario)
        : createDiagnosticScenario(scenario);
    this.delta = new Float64Array(this.state.wall.cells.length); this.slabDelta = new Float64Array(this.state.slab?.cells.length ?? 0); this.floorDelta = new Float64Array(this.state.floor.cells.length);
    this.accumulator = 0;
  }
  checkpoint(): SimulationState { return structuredClone(this.state); }
  restore(snapshot: SimulationState): void { this.state = structuredClone(snapshot); this.accumulator = 0; this.delta = new Float64Array(this.state.wall.cells.length); this.slabDelta = new Float64Array(this.state.slab?.cells.length ?? 0); this.floorDelta = new Float64Array(this.state.floor.cells.length); }
  update(deltaTime: number): void {
    if (!this.state.running || this.state.timeScale === 0 || !Number.isFinite(deltaTime) || deltaTime <= 0) return;
    // Caller bounds background-frame gaps. All simulation time here is conserved.
    this.accumulator += deltaTime * this.state.timeScale;
    while (this.accumulator + 1e-9 >= this.fixedStep) {
      updateBathroomRepairs(this.state, this.fixedStep);
      updateRepairs(this.state, this.fixedStep, this.delta);
      updateWater(this.state, this.fixedStep, this.delta, this.slabDelta, this.floorDelta);
      updateDamage(this.state, this.fixedStep);
      this.state.simulationTime += this.fixedStep;
      this.accumulator -= this.fixedStep;
    }
    this.updateMetrics();
  }
  private updateMetrics(): void {
    const s = this.state;
    let total = 0, count = 0, wallMax = 8, ceilingMax = 8, floorMax = 8, floorTotal = 0, internalMax = 8, salt = 0, mold = 0, damage = 0, expansion = 0;
    for (const grid of [s.wall, s.slab, s.floor]) if (grid) {
      const size = grid.cols * grid.rows;
      for (let i = 0; i < grid.cells.length; i++) {
        const c = grid.cells[i]; total += c.moisture; count++;
        expansion = Math.max(expansion, c.expansion);
        if (grid === s.floor) floorTotal += c.moisture;
        if (i >= size) internalMax = Math.max(internalMax, c.moisture);
        else {
          if (grid === s.wall) wallMax = Math.max(wallMax, c.moisture);
          else if (grid === s.floor) floorMax = Math.max(floorMax, c.moisture);
          else ceilingMax = Math.max(ceilingMax, c.moisture);
          salt = Math.max(salt, c.saltLevel); mold = Math.max(mold, c.moldLevel); damage = Math.max(damage, c.damageLevel);
        }
      }
    }
    const flow = s.waterSources.reduce((sum, source) => sum + source.flow, 0);
    const reference = s.waterSources.reduce((sum, source) => sum + source.unsealedFlow, 0);
    s.metrics = { meanMoisture: total / count, surfaceMax: Math.max(wallMax, ceilingMax, floorMax), wallSurfaceMax: wallMax, ceilingSurfaceMax: ceilingMax, floorSurfaceMax: floorMax, floorMeanMoisture: floorTotal / s.floor.cells.length, floorInflow: s.metrics.floorInflow, internalMax, efflorescence: salt, mold, damage, leakRate: flow, reduction: reference > 0 ? Math.max(0, 1 - flow / reference) : 0, expansion: 1 + expansion * 3, volumeMl: s.repairs.ports.reduce((sum, p) => sum + p.volumeMl, 0) };
  }
}
