import type { Material, Point, WallModel } from './types';

export const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
export const conductivity: Record<Material, number> = { paint: .16, putty: .28, mortar: .42, rc: .12, waterproof: .002, tile: .07, grout: .6 };
export const layerNames = ['室內油漆', '批土', '水泥砂漿', 'RC 混凝土', '防水層', '外牆磁磚'];
export function cellIndex(wall: WallModel, x: number, y: number, layer: number): number {
  return layer * wall.cols * wall.rows + y * wall.cols + x;
}
export function gridPoint(wall: WallModel, p: Point): { x: number; y: number } {
  return { x: Math.floor(clamp((p.x + wall.width / 2) / wall.width, 0, .99999) * wall.cols), y: Math.floor(clamp(p.y / wall.height, 0, .99999) * wall.rows) };
}
export function pointIndex(wall: WallModel, p: Point, layer = 0): number {
  const { x, y } = gridPoint(wall, p);
  return cellIndex(wall, x, y, layer);
}
export function cellPoint(wall: WallModel, index: number): Point {
  return { x: ((index % wall.cols) + .5) * wall.width / wall.cols - wall.width / 2, y: (Math.floor(index / wall.cols) % wall.rows + .5) * wall.height / wall.rows };
}
export function createCell(material: Material): import('./types').WallCell {
  return { material, moisture: 8, waterPressure: 0, saltLevel: 0, crackLevel: 0, waterproofLevel: material === 'waterproof' ? 1 : 0, moldLevel: 0, damageLevel: 0, pu: 0, expansion: 0, wetDuration: 0, flowX: 0, flowY: 0, flowZ: 0, surfaceCoating: 0, permeabilityScale: 1 };
}
export function createWall(): WallModel {
  const layers: Material[] = ['paint', 'putty', 'mortar', 'rc', 'waterproof', 'tile'];
  const wall: WallModel = { cols: 42, rows: 24, width: 10.5, height: 6, layers, cells: [], edges: [] };
  for (const material of layers) for (let i = 0; i < wall.cols * wall.rows; i++) {
    wall.cells.push(createCell(material));
  }
  return wall;
}
/** One undirected edge per pair. Flux is applied equally and oppositely. */
export function buildEdges(wall: WallModel, channel: number[]): void {
  wall.edges = [];
  const connections = new Set(channel.slice(1).map((b, i) => `${Math.min(channel[i], b)}:${Math.max(channel[i], b)}`));
  for (let l = 0; l < wall.layers.length; l++) for (let y = 0; y < wall.rows; y++) for (let x = 0; x < wall.cols; x++) {
    const a = cellIndex(wall, x, y, l);
    const neighbors: [number, 'x' | 'y' | 'z'][] = [];
    if (x + 1 < wall.cols) neighbors.push([a + 1, 'x']);
    if (y + 1 < wall.rows) neighbors.push([a + wall.cols, 'y']);
    if (l + 1 < wall.layers.length) neighbors.push([a + wall.cols * wall.rows, 'z']);
    for (const [b, axis] of neighbors) wall.edges.push({ a, b, axis, channel: connections.has(`${a}:${b}`), direction: channel.indexOf(a) < channel.indexOf(b) ? 1 : -1 });
  }
}
