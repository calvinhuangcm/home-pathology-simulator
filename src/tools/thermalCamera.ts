import type { Domain, Point, SimulationState } from '../simulation/types';
import { cellPoint, pointIndex } from '../simulation/wallModel';

export interface ThermalAssessment {
  surfaceTemperatureC: number;
  apparentTemperatureC: number;
  dewPointC: number;
  confidence: number;
  warnings: string[];
}

/** Deterministic teaching estimate from modeled moisture, pressure, source pipes, and scan conditions. */
export function surfaceTemperatureC(state: SimulationState, point: Point, domain: Domain = 'wall'): number | null {
  const grid = state[domain];
  if (!grid) return null;
  const layer = domain === 'floor' ? 0 : domain === 'slab' ? 5 : 0;
  const moisture = grid.cells[pointIndex(grid, point, layer)].moisture;
  const contrast = Math.abs(state.environment.indoorTemperatureC - state.environment.outdoorTemperatureC);
  const contrastFactor = .2 + Math.min(1, contrast / 8) * .8;
  const solarHeating = state.environment.solarExposure * (1 - Math.exp(-state.environment.solarExposureMinutes / 18)) * 6;
  let value = state.environment.indoorTemperatureC - Math.max(0, moisture - 8) / 92 * 1.8 * contrastFactor + solarHeating;
  if (domain === 'wall') {
    const observation = cellPoint(grid, pointIndex(grid, point, 0));
    for (const pipe of state.pipes) {
      if (pipe.service !== 'supply' || pipe.pressure <= 0 || pipe.waterTemperatureC <= state.environment.indoorTemperatureC) continue;
      const nearest = Math.min(...pipe.cells.map(index => {
        const p = cellPoint(grid, index);
        return Math.hypot(p.x - observation.x, p.y - observation.y);
      }), Infinity);
      const transfer = Math.max(0, 1 - nearest / 1.35) * .075;
      value += (pipe.waterTemperatureC - state.environment.indoorTemperatureC) * transfer;
    }
  }
  const pressure = grid.cells[pointIndex(grid, point, layer)].waterPressure;
  return Math.round((value - Math.min(1.2, pressure * .8)) * 10) / 10;
}

function dewPointC(temperatureC: number, relativeHumidityPct: number): number {
  const rh = Math.max(.01, Math.min(1, relativeHumidityPct / 100));
  const gamma = Math.log(rh) + 17.62 * temperatureC / (243.12 + temperatureC);
  return 243.12 * gamma / (17.62 - gamma);
}

/** Apparent sensor estimate plus conditions that can make a thermal anomaly ambiguous. */
export function thermalAssessment(state: SimulationState, point: Point, domain: Domain = 'wall'): ThermalAssessment | null {
  const surface = surfaceTemperatureC(state, point, domain);
  if (surface === null) return null;
  const emissivity = Math.max(.3, Math.min(1, state.environment.surfaceEmissivity));
  // Linear blend is a deliberately simplified classroom estimate, not radiometric calibration.
  const apparent = surface * emissivity + state.environment.reflectedTemperatureC * (1 - emissivity);
  const dew = dewPointC(state.environment.indoorTemperatureC, state.environment.relativeHumidityPct);
  const contrast = Math.abs(state.environment.indoorTemperatureC - state.environment.outdoorTemperatureC);
  const warnings: string[] = [];
  if (contrast < 4) warnings.push('室內外溫差偏小，熱異常對比可能不足');
  if (state.environment.solarExposure > .2 && state.environment.solarExposureMinutes > 0) warnings.push('表面日照加熱可能干擾判讀');
  if (emissivity < .72) warnings.push('低放射率表面容易反射周圍熱源');
  if (state.environment.relativeHumidityPct >= 65 && apparent <= dew + 1.5) warnings.push('表面接近露點，結露可能與漏水症狀混淆');
  const contrastConfidence = Math.min(1, contrast / 8);
  const emissivityConfidence = Math.max(0, Math.min(1, (emissivity - .3) / .65));
  const confidence = Math.round(Math.max(.08, Math.min(1, .2 + contrastConfidence * .42 + emissivityConfidence * .38 - (warnings.includes('表面日照加熱可能干擾判讀') ? .2 : 0))) * 100);
  return { surfaceTemperatureC: surface, apparentTemperatureC: Math.round(apparent * 10) / 10, dewPointC: Math.round(dew * 10) / 10, confidence, warnings };
}

export function thermalColor(temperatureC: number, minimumC = 19, maximumC = 25): string {
  // The teaching model usually spans roughly 19–25°C; use that tighter window
  // so a few degrees of modeled difference remain visible in the overlay.
  const t = Math.max(0, Math.min(1, (temperatureC - minimumC) / Math.max(.1, maximumC - minimumC)));
  // Ironbow-style palette based on the supplied thermal-camera reference:
  // cold areas stay nearly black purple, then pass through violet and red
  // before reaching orange/yellow at the hottest end.
  const stops: Array<[number, number, number, number]> = [
    [0, 18, 0, 35],
    [.2, 57, 0, 99],
    [.4, 139, 0, 111],
    [.58, 207, 20, 74],
    [.74, 241, 70, 27],
    [.9, 255, 157, 13],
    [1, 255, 234, 91],
  ];
  const upper = stops.findIndex(([position]) => position >= t);
  const start = stops[Math.max(0, upper - 1)];
  const end = stops[Math.max(0, upper)];
  const blend = end[0] === start[0] ? 0 : (t - start[0]) / (end[0] - start[0]);
  const channels = [1, 2, 3].map(channel => Math.round(start[channel] + (end[channel] - start[channel]) * blend));
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
}
