import type { FloorWaterTest, Point, SimulationState, WallModel } from './types';
import { buildEdges, cellIndex, cellPoint, createCell, gridPoint, pointIndex } from './wallModel';

/** Room-side floor; its depth coordinate is unrelated to wall height or upstairs slab depth. */
export const FLOOR_SURFACE = Object.freeze({ width: 11, height: 3.85, originZ: .65, top: -.03 });
export const floorLayerNames = ['室內地磚／填縫', '水泥砂漿找平層', 'RC 樓板'];
export function createFloor(): WallModel {
  const floor: WallModel = { cols: 80, rows: 28, width: FLOOR_SURFACE.width, height: FLOOR_SURFACE.height, layers: ['tile', 'mortar', 'rc'], cells: [], edges: [] };
  for (let layer = 0; layer < floor.layers.length; layer++) for (let y = 0; y < floor.rows; y++) for (let x = 0; x < floor.cols; x++) {
    // A surface cell represents a patch of tile or a grout-connected patch. Narrow
    // physical joints are rendered independently; coefficients are teaching values.
    const material = layer === 0 && (x % 4 === 0 || y % 4 === 0) ? 'grout' : floor.layers[layer];
    const cell = createCell(material);
    if (material === 'tile') cell.permeabilityScale = .08;
    floor.cells.push(cell);
  }
  buildEdges(floor, []);
  return floor;
}
export function floorWallJunctions(wall: WallModel, floor: WallModel): SimulationState['floorJunctions'] {
  return Array.from({ length: wall.cols }, (_, x) => {
    const p = cellPoint(wall, cellIndex(wall, x, 0, 2));
    const { x: floorX } = gridPoint(floor, { x: p.x, y: 0 });
    return { wallCell: cellIndex(wall, x, 0, 2), floorCell: cellIndex(floor, floorX, 0, 1), conductance: .12 };
  });
}
export function isFloorPoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= -FLOOR_SURFACE.width / 2 && point.x <= FLOOR_SURFACE.width / 2 && point.y >= 0 && point.y <= FLOOR_SURFACE.height;
}
export function startFloorWaterTest(s: SimulationState, position: Point): { ok: boolean; message: string; test?: FloorWaterTest } {
  if (!isFloorPoint(position)) return { ok: false, message: '請在室內地磚範圍內點選淋水測試位置。' };
  if (s.floorTests.filter(test => test.remainingSeconds > 0).length >= 4) return { ok: false, message: '已有四處淋水測試進行中，請等待完成。' };
  const center = pointIndex(s.floor, position);
  if (s.floorTests.some(test => test.remainingSeconds > 0 && test.cells.includes(center))) return { ok: false, message: '此處正在淋水，請先觀察或選擇其他位置。' };
  const { x, y } = gridPoint(s.floor, position), cells: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (Math.abs(dx) + Math.abs(dy) > 1 || x + dx < 0 || x + dx >= s.floor.cols || y + dy < 0 || y + dy >= s.floor.rows) continue;
    cells.push(cellIndex(s.floor, x + dx, y + dy, 0));
  }
  const test: FloorWaterTest = { id: Math.max(0, ...s.floorTests.map(test => test.id)) + 1, position: { ...position }, cells, remainingSeconds: 5, appliedWater: 0 };
  s.floorTests = [...s.floorTests.slice(-15), test]; s.tools.floorTestArmed = false;
  return { ok: true, message: '開始 5 秒地板定點淋水。水會滲入填縫及砂漿，之後可量測擴散與乾燥。', test };
}
export function updateFloorWaterTests(s: SimulationState, dt: number): number {
  let added = 0;
  for (const test of s.floorTests) {
    const step = Math.min(dt, test.remainingSeconds);
    if (step <= 0) continue;
    for (const i of test.cells) {
      const cell = s.floor.cells[i], amount = Math.min(100 - cell.moisture, 12 * step);
      cell.moisture += amount; test.appliedWater += amount; added += amount;
    }
    test.remainingSeconds = Math.max(0, test.remainingSeconds - step);
    if (test.remainingSeconds < 1e-8) test.remainingSeconds = 0;
  }
  return added / dt;
}
