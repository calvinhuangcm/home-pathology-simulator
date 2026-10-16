import type { SimulationState, Domain } from '../simulation/types';

/** The ceiling view is a different room: map slab-local y to depth, never to wall height. */
export function createBathroomScene(architecture: import('three').Group) {
  const slab = new THREE.Group(), pipes = new THREE.Group();
  slab.name = 'bathroom-slab'; pipes.name = 'bathroom-pipes';
  architecture.add(slab, pipes);
  const colors = [0xd3d1c7, 0xb7b9b5, 0x879499, 0x5b6d76, 0x388d81, 0xb2a493];
  const thickness = [.04, .04, .1, .28, .04, .08];
  let base = 6;
  for (let layer = 0; layer < 6; layer++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(10.5, thickness[layer], 6), new THREE.MeshStandardMaterial({ color: colors[layer], roughness: .88 }));
    mesh.position.set(0, base + thickness[layer] / 2, 3.65); base += thickness[layer];
    mesh.name = layer === 0 ? 'bathroom-ceiling' : `bathroom-layer-${layer}`;
    slab.add(mesh);
  }
  let signature = '';
  return {
    update(s: SimulationState, active: boolean, surface: Domain, reveal: boolean) {
      slab.visible = active && s.scenarioId === 'bathroom' && surface === 'slab';
      pipes.visible = active && s.scenarioId === 'hotpipe';
      const next = s.pipes.map(p => `${p.id}:${p.isolated}:${p.exposed}`).join('|');
      const rebuilt = next !== signature;
      if (rebuilt) {
        for (const child of [...pipes.children]) { const mesh = child as import('three').Mesh; mesh.geometry.dispose(); (mesh.material as import('three').Material).dispose(); pipes.remove(child); }
        for (const pipe of s.pipes) {
          const points = pipe.route.map(p => new THREE.Vector3(p.x, p.y, pipe.exposed ? .87 : .3));
          // Polyline keeps right-angle rerouting explicit instead of inventing a new leak marker.
          const path = new THREE.CurvePath<import('three').Vector3>();
          for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(points[i - 1], points[i]));
          const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 60, .055, 8, false), new THREE.MeshStandardMaterial({ color: pipe.isolated ? 0x657078 : pipe.exposed ? 0xe8b783 : 0xc85b59, roughness: .45, transparent: true, depthTest: pipe.exposed }));
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
