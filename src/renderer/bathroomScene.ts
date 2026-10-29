import type { SimulationState, Domain } from '../simulation/types';

/** The ceiling view is a different room: map slab-local y to depth, never to wall height. */
export function createBathroomScene(architecture: import('three').Group) {
  const slab = new THREE.Group(), pipes = new THREE.Group(), basement = new THREE.Group();
  slab.name = 'bathroom-slab'; pipes.name = 'bathroom-pipes'; basement.name = 'basement-soil-and-pressure';
  architecture.add(slab, pipes, basement);
  const colors = [0xd3d1c7, 0xb7b9b5, 0x879499, 0x5b6d76, 0x388d81, 0xb2a493];
  const thickness = [.04, .04, .1, .28, .04, .08];
  let base = 6;
  for (let layer = 0; layer < 6; layer++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(10.5, thickness[layer], 6), new THREE.MeshStandardMaterial({ color: colors[layer], roughness: .88 }));
    mesh.position.set(0, base + thickness[layer] / 2, 3.65); base += thickness[layer];
    mesh.name = layer === 0 ? 'bathroom-ceiling' : `bathroom-layer-${layer}`;
    slab.add(mesh);
  }
  const soil = new THREE.Mesh(new THREE.BoxGeometry(10.6, 6.1, .52), new THREE.MeshStandardMaterial({ color: 0x59483b, roughness: 1, transparent: true, opacity: .55, depthWrite: false }));
  soil.position.set(0, 3, -1.05); soil.name = 'basement-soil-mass'; basement.add(soil);
  const waterBody = new THREE.Mesh(new THREE.PlaneGeometry(10.25, 6), new THREE.MeshBasicMaterial({ color: 0x1e8da8, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }));
  waterBody.name = 'groundwater-body'; waterBody.renderOrder = 1; basement.add(waterBody);
  const waterLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5.12, 0, -.69), new THREE.Vector3(5.12, 0, -.69)]), new THREE.LineBasicMaterial({ color: 0x6ce6f5, transparent: true, opacity: .9 }));
  waterLine.name = 'groundwater-level-line'; waterLine.renderOrder = 2; basement.add(waterLine);
  for (let n = 0; n < 8; n++) {
    const y = .45 + n * .72;
    const stratum = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5.1, y, -.77), new THREE.Vector3(5.1, y, -.77)]), new THREE.LineBasicMaterial({ color: n % 2 ? 0x8d7963 : 0x6d5a49, transparent: true, opacity: .55 }));
    stratum.name = 'soil-stratum'; basement.add(stratum);
  }
  for (const x of [-3.4, -1.7, 1.7, 3.4]) {
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(x, .65, -1.55), .7, 0x59c6e6, .18, .12);
    arrow.name = 'groundwater-pressure-arrow'; basement.add(arrow);
  }
  let signature = '';
  return {
    update(s: SimulationState, active: boolean, surface: Domain, reveal: boolean) {
      slab.visible = active && (s.scenarioId === 'bathroom' || s.scenarioId === 'multi') && surface === 'slab';
      pipes.visible = active && ['hotpipe', 'drain', 'multi'].includes(s.scenarioId);
      basement.visible = active && s.scenarioId === 'basement' && reveal;
      waterBody.scale.y = s.environment.groundwaterLevel / 6;
      waterBody.position.set(0, s.environment.groundwaterLevel / 2, -.69);
      waterLine.position.y = s.environment.groundwaterLevel;
      const next = s.pipes.map(p => `${p.id}:${p.isolated}:${p.exposed}:${p.service}`).join('|');
      const rebuilt = next !== signature;
      if (rebuilt) {
        for (const child of [...pipes.children]) { const mesh = child as import('three').Mesh; mesh.geometry.dispose(); (mesh.material as import('three').Material).dispose(); pipes.remove(child); }
        for (const pipe of s.pipes) {
          const points = pipe.route.map(p => new THREE.Vector3(p.x, p.y, pipe.exposed ? .87 : .3));
          // Polyline keeps right-angle rerouting explicit instead of inventing a new leak marker.
          const path = new THREE.CurvePath<import('three').Vector3>();
          for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(points[i - 1], points[i]));
          const color = pipe.isolated ? 0x657078 : pipe.exposed ? pipe.service === 'drain' ? 0x55bdd5 : 0xe8b783 : pipe.service === 'drain' ? 0x55bdd5 : 0xc85b59;
          const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 60, .055, 8, false), new THREE.MeshStandardMaterial({ color, roughness: .45, transparent: true, depthTest: pipe.exposed }));
          mesh.userData.exposed = pipe.exposed; mesh.renderOrder = 7;
          pipes.add(mesh);
        }
        signature = next;
      }
      for (const mesh of pipes.children) mesh.visible = mesh.userData.exposed || reveal;
      return rebuilt;
    },
  };
}
