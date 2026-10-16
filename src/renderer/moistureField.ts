import { FLOOR_SURFACE, floorLayerNames } from '../simulation/floorModel';
import type { Domain, SimulationState } from '../simulation/types';
import { cellIndex, clamp, gridPoint, layerNames } from '../simulation/wallModel';

export interface FieldView { debug: boolean; mode: string; layer: number; cutaway: boolean; surface: Domain }
/** Canvas is only a projection of SimulationState, never a source for meter values. */
export function createMoistureField(world: import('three').Group, domain: Domain = 'wall', anisotropy = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = domain === 'floor' ? 960 : 504; canvas.height = domain === 'floor' ? 336 : 288;
  const context = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = Math.max(1, anisotropy);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(domain === 'floor' ? FLOOR_SURFACE.width : 10.5, domain === 'floor' ? FLOOR_SURFACE.height : 6), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthTest: true, depthWrite: false,
    // Keep the symptoms on their physical surface without z-fighting or showing
    // through the back of the slab. Negative depth bias brings the decal forward.
    side: domain === 'wall' ? THREE.FrontSide : THREE.BackSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  }));
  plane.name = `${domain}-simulation-field`;
  plane.position.set(0, 3, .62);
  if (domain === 'slab') { plane.rotation.x = -Math.PI / 2; plane.position.set(0, 6, 3.65); }
  if (domain === 'floor') { plane.rotation.x = Math.PI / 2; plane.position.set(0, FLOOR_SURFACE.top, FLOOR_SURFACE.originZ + FLOOR_SURFACE.height / 2); }
  plane.renderOrder = 6;
  world.add(plane);
  function draw(state: SimulationState, view: FieldView, active: boolean): void {
    active = active && (domain === 'slab' ? view.surface === 'slab' : view.surface !== 'slab') && !!state[domain];
    plane.visible = active;
    if (!active) return;
    const wall = state[domain]!, size = 12;
    const inspecting = view.surface === domain;
    const mode = inspecting && view.debug ? view.mode : inspecting && view.cutaway ? 'moisture' : 'surface';
    const layer = inspecting && (view.debug || view.cutaway) ? Math.min(view.layer, wall.layers.length - 1) : 0;
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < wall.rows; y++) for (let x = 0; x < wall.cols; x++) {
      const cell = wall.cells[cellIndex(wall, x, y, layer)];
      const cx = x * size, cy = (wall.rows - 1 - y) * size;
      const wet = clamp((cell.moisture - 8) / 50);
      if (mode === 'surface') {
        if (wet > .015) {
          const stain = context.createRadialGradient(cx + 6, cy + 6, 0, cx + 6, cy + 6, 15);
          stain.addColorStop(0, `rgba(25,74,89,${wet * .56})`);
          stain.addColorStop(1, 'rgba(25,74,89,0)');
          context.fillStyle = stain;
          context.fillRect(cx - 9, cy - 9, 30, 30);
        }
        if (cell.saltLevel > .015) {
          context.fillStyle = `rgba(255,250,222,${clamp(cell.saltLevel * 2)})`;
          for (let n = 0; n < 5; n++) context.fillRect(cx + (x * 3 + n * 7) % 11, cy + (y * 7 + n * 3) % 11, 1 + cell.saltLevel * 3, 1.5);
        }
        if (cell.damageLevel > .015) {
          context.strokeStyle = `rgba(72,60,45,${clamp(cell.damageLevel * 4)})`;
          context.beginPath(); context.arc(cx + 6, cy + 6, 2 + cell.damageLevel * 4, 0, Math.PI * 1.6); context.stroke();
        }
        if (cell.moldLevel > .03) { context.fillStyle = `rgba(31,62,42,${cell.moldLevel})`; context.fillRect(cx + 2, cy + 3, 4, 3); }
      } else {
        let color = `rgba(20,45,60,.6)`;
        if (mode === 'moisture' || mode === 'flow') color = `hsla(${215 - cell.moisture * 1.6},80%,${24 + cell.moisture * .35}%,.85)`;
        if (mode === 'cracks') color = cell.crackLevel > 0 || cell.material === 'waterproof' && cell.waterproofLevel < .5 ? '#f7c76ae8' : '#172a3899';
        if (mode === 'pu') color = `rgba(71,245,202,${clamp(cell.pu + cell.expansion, .08, .95)})`;
        context.fillStyle = color; context.fillRect(cx, cy, size, size);
        if (mode === 'flow' && Math.hypot(cell.flowX, cell.flowY) > .15) {
          const magnitude = Math.hypot(cell.flowX, cell.flowY);
          const dx = cell.flowX / magnitude * 5, dy = -cell.flowY / magnitude * 5;
          context.strokeStyle = '#effaff'; context.beginPath(); context.moveTo(cx + 6 - dx / 2, cy + 6 - dy / 2); context.lineTo(cx + 6 + dx, cy + 6 + dy); context.stroke();
          context.fillStyle = '#fff'; context.fillRect(cx + 5 + dx, cy + 5 + dy, 2, 2);
        }
      }
    }
    if (view.debug && mode === 'source') {
      for (const source of state.waterSources.filter(s => s.domain === domain)) {
        context.fillStyle = '#ff778b66';
        for (const i of source.footprint) context.fillRect((i % wall.cols) * size, (wall.rows - 1 - Math.floor(i / wall.cols) % wall.rows) * size, size, size);
        const { x, y } = gridPoint(wall, source.position);
        context.strokeStyle = '#ff778b'; context.lineWidth = 3;
        context.strokeRect(x * size - 4, (wall.rows - 1 - y) * size - 4, 20, 20);
        context.fillStyle = '#fff'; context.font = '13px sans-serif'; context.fillText(source.kind === 'area' ? '地坪面狀供水' : source.kind === 'pipe' ? '破損暗管' : 'Leak source · 外側', x * size + 22, (wall.rows - 1 - y) * size + 10);
      }
    }
    if (domain === 'floor' && view.debug && mode === 'source') {
      context.lineWidth = 2;
      for (const test of state.floorTests) {
        context.strokeStyle = test.remainingSeconds > 0 ? '#ff778b' : '#a6b6be';
        for (const i of test.cells) context.strokeRect(i % wall.cols * size, (wall.rows - 1 - Math.floor(i / wall.cols) % wall.rows) * size, size, size);
      }
    }
    // The drill animation is tied to validated engine work progress, including pause.
    for (const port of domain === 'wall' ? state.repairs.ports : []) if (port.drillProgress < 1) {
      const px = (port.position.x + 5.25) / 10.5 * canvas.width;
      const py = (6 - port.position.y) / 6 * canvas.height;
      context.strokeStyle = '#f7c76a'; context.lineWidth = 2;
      context.beginPath(); context.arc(px, py, 9, 0, Math.PI * 2 * port.drillProgress); context.stroke();
      context.fillStyle = '#ddd3bd';
      for (let n = 0; n < 10; n++) {
        const phase = (port.drillProgress * 3 + n / 10) % 1;
        const angle = n * 2.4;
        context.fillRect(px + Math.cos(angle) * phase * 20, py + Math.sin(angle) * phase * 14 + phase * 10, 2, 2);
      }
    }
    texture.needsUpdate = true;
  }
  return { draw };
}

export function drawSection(canvas: HTMLCanvasElement, state: SimulationState, domain: Domain = 'wall'): void {
  const context = canvas.getContext('2d')!;
  const wall = state[domain];
  if (!wall) return;
  const y = gridPoint(wall, state.tools.probeDomain === domain && state.tools.probe ? state.tools.probe : { x: 0, y: domain === 'floor' ? 1.925 : 1.625 }).y;
  canvas.height = wall.layers.length * 23;
  canvas.setAttribute('aria-label', `${domain === 'floor' ? '室內地板三層' : '牆體或樓板六層'}切片`);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const colors = ['#c9c8c0', '#a7a8a4', '#7f8b91', '#526773', '#4c877e', '#a48975'];
  wall.layers.forEach((_, layer) => {
    context.fillStyle = '#b6cad9'; context.font = '12px sans-serif'; context.fillText(domain === 'floor' ? ['地磚／填縫', '砂漿找平層', floorLayerNames[2]][layer] : domain === 'slab' && layer === 5 ? '浴室地磚' : layerNames[layer], 2, layer * 23 + 16);
    for (let x = 0; x < wall.cols; x++) {
      const cell = wall.cells[cellIndex(wall, x, y, layer)];
      context.fillStyle = colors[layer]; context.fillRect(85 + x * (canvas.width - 85) / wall.cols, layer * 23 + 2, (canvas.width - 85) / wall.cols, 19);
      context.fillStyle = `rgba(20,166,255,${clamp((cell.moisture - 8) / 60)})`; context.fillRect(85 + x * (canvas.width - 85) / wall.cols, layer * 23 + 2, (canvas.width - 85) / wall.cols, 19);
    }
  });
}
