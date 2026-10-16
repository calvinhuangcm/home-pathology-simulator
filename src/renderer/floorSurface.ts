import { FLOOR_SURFACE } from '../simulation/floorModel';
export { FLOOR_SURFACE } from '../simulation/floorModel';

function createCeramicMaps() {
  const color = document.createElement('canvas'), relief = document.createElement('canvas');
  color.width = relief.width = 1024; color.height = relief.height = 512;
  const context = color.getContext('2d')!, bump = relief.getContext('2d')!;
  context.fillStyle = '#677273'; context.fillRect(0, 0, color.width, color.height);
  bump.fillStyle = '#454545'; bump.fillRect(0, 0, relief.width, relief.height);
  // Square 0.55 m tiles. Material variation is deterministic and has no moisture state.
  const tileWidth = color.width / 20, tileHeight = color.height / 7;
  for (let row = 0; row < 7; row++) for (let col = 0; col < 20; col++) {
    const x = col * tileWidth, y = row * tileHeight;
    const tone = 163 + Math.round(Math.sin(col * 2.31 + row * 4.71) * 5);
    context.fillStyle = `rgb(${tone},${tone + 5},${tone + 2})`;
    context.fillRect(x + 1.1, y + 1.1, tileWidth - 2.2, tileHeight - 2.2);
    bump.fillStyle = '#d0d0d0';
    bump.fillRect(x + 1.1, y + 1.1, tileWidth - 2.2, tileHeight - 2.2);
    context.strokeStyle = 'rgba(220,225,217,.07)'; context.lineWidth = .7;
    for (let grain = 0; grain < 5; grain++) {
      const inset = (grain + 1) * tileWidth / 6;
      context.beginPath(); context.moveTo(x + inset, y + 3);
      context.lineTo(x + inset + Math.sin(col + grain) * 4, y + tileHeight - 3); context.stroke();
    }
  }
  const map = new THREE.CanvasTexture(color), bumpMap = new THREE.CanvasTexture(relief);
  map.encoding = THREE.sRGBEncoding;
  map.anisotropy = bumpMap.anisotropy = 4;
  return { map, bumpMap };
}

/** Material-only geometry. Simulation cells and the moisture decal are owned separately. */
export function createFloorSurface(architecture: import('three').Group) {
  const group = new THREE.Group(); group.name = 'indoor-floor-model'; group.visible = false;
  architecture.add(group);
  const oldFloor = architecture.getObjectByName('floor');
  const oldGrid = architecture.children.filter(child => child.type === 'GridHelper');
  const savedVisibility = new Map<import('three').Object3D, boolean>();
  const { width, height, originZ, top } = FLOOR_SURFACE;
  const centerZ = originZ + height / 2;
  const maps = createCeramicMaps();
  const layerSpecs = [
    { name: 'surface', materialName: '室內地磚', thickness: .05, material: new THREE.MeshStandardMaterial({ color: 0xffffff, ...maps, bumpScale: .004, roughness: .78, metalness: 0 }) },
    { name: 'screed', materialName: '水泥砂漿找平層', thickness: .08, material: new THREE.MeshStandardMaterial({ color: 0x8a8d83, roughness: .98 }) },
    { name: 'rc', materialName: 'RC 樓板', thickness: .24, material: new THREE.MeshStandardMaterial({ color: 0x536872, roughness: 1 }) },
  ];
  let layerTop = top;
  const layers = layerSpecs.map(spec => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, spec.thickness, height), spec.material);
    mesh.name = `indoor-floor-${spec.name}`;
    mesh.position.set(0, layerTop - spec.thickness / 2, centerZ);
    mesh.receiveShadow = true; mesh.castShadow = false;
    mesh.userData.materialName = spec.materialName;
    mesh.userData.top = layerTop; mesh.userData.bottom = layerTop - spec.thickness;
    group.add(mesh); layerTop -= spec.thickness;
    return mesh;
  });
  const surface = layers[0];
  // The old floor crosses both sides of the wall. Preserve its rear area while
  // replacing only the indoor footprint, avoiding a coplanar second top face.
  if (oldFloor instanceof THREE.Mesh) {
    const rear = new THREE.Mesh(new THREE.BoxGeometry(width, .18, originZ + 4.5), oldFloor.material);
    rear.name = 'indoor-floor-rear-substrate'; rear.position.set(0, -.12, (originZ - 4.5) / 2);
    rear.receiveShadow = true; group.add(rear);
  }
  const edgePoints: import('three').Vector3[] = [];
  for (const y of [top, top - .05, top - .13, layerTop]) {
    edgePoints.push(new THREE.Vector3(-width / 2, y, originZ + height + .002), new THREE.Vector3(width / 2, y, originZ + height + .002));
  }
  const sectionEdges = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edgePoints), new THREE.LineBasicMaterial({ color: 0xaec5c7, transparent: true, opacity: .72, depthWrite: false }));
  sectionEdges.name = 'indoor-floor-section-edges'; sectionEdges.visible = false; group.add(sectionEdges);
  let wasActive = false;
  return {
    group, surface, layers,
    update(active: boolean, cutaway: boolean): void {
      if (active && !wasActive) {
        for (const object of [oldFloor, ...oldGrid]) if (object) savedVisibility.set(object, object.visible);
      }
      if (active) {
        if (oldFloor) oldFloor.visible = false;
        for (const grid of oldGrid) grid.visible = false;
      } else if (wasActive) {
        for (const [object, visible] of savedVisibility) object.visible = visible;
        savedVisibility.clear();
      }
      group.visible = active;
      sectionEdges.visible = active && cutaway;
      wasActive = active;
    },
  };
}
