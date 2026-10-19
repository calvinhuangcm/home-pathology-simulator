import { isCellularScenario } from '../scenarios/bathroom';
/** Transitional view models for the preserved UI. New physics lives only in the engine. */
export function connectEngine(state, engine) {
  const readers = {
    time: () => engine.state.simulationTime,
    wallMoisture: () => Math.max(engine.state.metrics.wallSurfaceMax, engine.state.metrics.ceilingSurfaceMax) / 100,
    efflorescence: () => engine.state.metrics.efflorescence,
    moldRisk: () => engine.state.metrics.mold,
    leakRate: () => engine.state.metrics.leakRate,
  };
  for (const [name, read] of Object.entries(readers)) {
    let legacy = state[name];
    Object.defineProperty(state, name, {
      get: () => isCellularScenario(state.scenario) ? read() : legacy,
      set: value => { if (!isCellularScenario(state.scenario)) legacy = value; },
    });
  }
  return {
    connectInjection() {
      let active = false;
      Object.defineProperty(state.injection, 'active', {
        get: () => isCellularScenario(state.scenario) ? engine.state.repairs.activePortId !== null : active,
        set: value => { if (isCellularScenario(state.scenario)) { if (!value) engine.state.repairs.activePortId = null; } else active = value; },
      });
    },
    connectPort(view, id) {
      const port = () => engine.state.repairs.ports.find(p => p.id === id);
      const getters = { hitPath: () => port()?.connected ?? false, drilled: () => port()?.drillProgress === 1, inserted: () => port()?.inserted ?? false, volume: () => (port()?.volumeMl ?? 0) / 180, material: () => port()?.material ?? null };
      for (const [name, get] of Object.entries(getters)) Object.defineProperty(view, name, { get, set: () => {} });
    },
  };
}
