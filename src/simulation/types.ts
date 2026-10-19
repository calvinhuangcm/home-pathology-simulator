export interface Point { x: number; y: number }
export type ScenarioId = 'crack' | 'bathroom' | 'hotpipe' | 'drain' | 'multi' | 'basement';
export type Domain = 'wall' | 'slab' | 'floor';
export type Material = 'paint' | 'putty' | 'mortar' | 'rc' | 'waterproof' | 'tile' | 'grout';
export interface WallCell {
  moisture: number;
  waterPressure: number;
  saltLevel: number;
  crackLevel: number;
  waterproofLevel: number;
  moldLevel: number;
  damageLevel: number;
  pu: number;
  epoxy: number;
  gel: number;
  epoxyBond: number;
  gelSeal: number;
  expansion: number;
  wetDuration: number;
  flowX: number;
  flowY: number;
  flowZ: number;
  material: Material;
  surfaceCoating: number;
  permeabilityScale: number;
}
export interface Edge { a: number; b: number; axis: 'x' | 'y' | 'z'; channel: boolean; direction: number }
export interface WallModel {
  cols: number; rows: number; layers: Material[]; width: number; height: number;
  cells: WallCell[]; edges: Edge[];
}
export interface WaterSource {
  cell: number; position: Point; enabled: boolean; flow: number; unsealedFlow: number;
  kind: 'rain' | 'area' | 'pipe' | 'drain' | 'groundwater'; domain: Domain;
  footprint: number[]; defects: number[]; pipeId?: string;
}
export interface PipeModel {
  id: string; cells: number[]; route: Point[]; leaking: boolean;
  isolated: boolean; exposed: boolean; pressure: number;
  service: 'supply' | 'drain'; waterTemperatureC: number;
}
export type RepairKind = 'waterproof' | 'surface' | 'bypass' | 'drain';
export interface RepairJob {
  kind: RepairKind; domain: Domain; cells: number[]; elapsed: number; duration: number;
}
export interface Port {
  id: number; position: Point; cell: number; connected: boolean; material: 'pu' | 'epoxy' | 'acrylate' | null;
  drillProgress: number; inserted: boolean; volumeMl: number;
}
export interface FloorWaterTest {
  id: number; position: Point; cells: number[];
  remainingSeconds: number; appliedWater: number;
}
export interface SimulationState {
  scenarioId: ScenarioId;
  wall: WallModel;
  slab: WallModel | null;
  floor: WallModel;
  junctions: { slabCell: number; wallCell: number; conductance: number }[];
  floorJunctions: { wallCell: number; floorCell: number; conductance: number }[];
  floorTests: FloorWaterTest[];
  waterSources: WaterSource[];
  cracks: number[];
  waterproofLayers: number[];
  pipes: PipeModel[];
  repairs: { ports: Port[]; activePortId: number | null; pressure: number; nextId: number; job: RepairJob | null; waterproofRepaired: boolean; bypassInstalled: boolean; drainRepaired: boolean; surfacePatchCount: number };
  tools: { probe: Point | null; probeDomain: Domain; mode: 'pin' | 'pinless'; floorTestArmed: boolean };
  environment: { rain: number; wind: number; bathroomUse: number; pipeValveOpen: boolean; pipePressure: number; drainUse: number; groundwaterPressure: number; ambientTemperatureC: number };
  simulationTime: number;
  running: boolean;
  timeScale: number;
  metrics: { meanMoisture: number; surfaceMax: number; wallSurfaceMax: number; ceilingSurfaceMax: number; floorSurfaceMax: number; floorMeanMoisture: number; floorInflow: number; internalMax: number; efflorescence: number; mold: number; damage: number; leakRate: number; reduction: number; expansion: number; volumeMl: number };
}
