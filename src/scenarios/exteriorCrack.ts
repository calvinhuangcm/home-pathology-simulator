import { createFloor, floorWallJunctions } from '../simulation/floorModel';
import { buildEdges, cellIndex, createWall, gridPoint, pointIndex } from '../simulation/wallModel';
import type { Point, SimulationState } from '../simulation/types';

export const exteriorSource: Point = { x: -3.125, y: 5.125 };
export const interiorOutlet: Point = { x: -1.125, y: 1.625 };
export function createExteriorCrack(): SimulationState {
  const wall = createWall();
  const cracks: number[] = [];
  const add = (x: number, y: number, layer: number) => {
    const id = cellIndex(wall, x, y, layer);
    if (cracks.at(-1) !== id) cracks.push(id);
    wall.cells[id].crackLevel = .7;
    wall.cells[id].waterproofLevel = 0;
  };
  const start = gridPoint(wall, exteriorSource);
  for (let layer = 5; layer >= 3; layer--) add(start.x, start.y, layer);
  let { x, y } = start;
  for (const target of [{ x: -2.125, y: 4.625 }, { x: -1.125, y: 4.125 }, interiorOutlet]) {
    const goal = gridPoint(wall, target);
    while (x !== goal.x || y !== goal.y) {
      if (x !== goal.x) { x += Math.sign(goal.x - x); add(x, y, 3); }
      if (y !== goal.y) { y += Math.sign(goal.y - y); add(x, y, 3); }
    }
  }
  for (let layer = 2; layer >= 0; layer--) add(x, y, layer);
  buildEdges(wall, cracks);
  const floor = createFloor();
  return {
    floor, floorJunctions: floorWallJunctions(wall, floor), floorTests: [],
    scenarioId: 'crack', slab: null, junctions: [],
    wall, cracks, waterproofLayers: [4], pipes: [],
    waterSources: [{ cell: pointIndex(wall, exteriorSource, 5), position: exteriorSource, enabled: true, flow: 0, unsealedFlow: 0, kind: 'rain', domain: 'wall', footprint: [], defects: [] }],
    repairs: { ports: [], activePortId: null, pressure: 0, nextId: 1, job: null, waterproofRepaired: false, bypassInstalled: false, surfacePatchCount: 0 },
    tools: { probe: null, probeDomain: 'wall', mode: 'pinless', floorTestArmed: false }, environment: { rain: .72, wind: .38, bathroomUse: 1, pipeValveOpen: true, pipePressure: .4 },
    simulationTime: 0, running: true, timeScale: 1,
    metrics: { meanMoisture: 8, surfaceMax: 8, wallSurfaceMax: 8, ceilingSurfaceMax: 8, floorSurfaceMax: 8, floorMeanMoisture: 8, floorInflow: 0, internalMax: 8, efflorescence: 0, mold: 0, damage: 0, leakRate: 0, reduction: 0, expansion: 1, volumeMl: 0 },
  };
}
