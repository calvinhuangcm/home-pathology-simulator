import {
  boreDirection,
  borePointAt,
  createInjectionLessonState,
  findCrackIntersection,
  FIXED_STEP_SECONDS,
  LESSON_BRANCH,
  LESSON_CRACK,
  resetInjection,
  toggleInjection,
  updateInjectionLesson,
  updateLessonGeometry,
  type InjectionLessonState,
  type LessonGeometry,
  type Vec3,
} from './injectionLessonModel';

type ScreenPoint = { x: number; y: number };
type ViewMode = 'drill' | 'needle' | 'flow';

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.querySelector(id);
  if (!element) throw new Error(`Missing lesson element #${id}`);
  return element as T;
};

const azimuthSlider = $('input#azimuthSlider') as HTMLInputElement;
const tiltSlider = $('input#tiltSlider') as HTMLInputElement;
const boreDepthSlider = $('input#boreDepthSlider') as HTMLInputElement;
const needleDepthSlider = $('input#needleDepthSlider') as HTMLInputElement;
const lessonScene = $('svg#lessonScene') as unknown as SVGSVGElement;
const state: InjectionLessonState = createInjectionLessonState();
let viewMode: ViewMode = 'needle';
let lastFrame = performance.now();
let accumulator = 0;
let frameRequest = 0;
let syringeDrag: { pointerId: number; offset: ScreenPoint } | null = null;

const point = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

function project(value: Vec3): ScreenPoint {
  return {
    x: 130 + value.x * 3.8 + value.z * 4.1,
    y: 452 - value.y * 3.45 - value.z * 2.35,
  };
}

function pathData(points: Vec3[]): string {
  if (!points.length) return '';
  return points.map((value, index) => {
    const p = project(value);
    return `${index === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
}

function pathRange(start: number, end: number, step: number): Vec3[] {
  const points: Vec3[] = [];
  if (end >= start) {
    for (let depth = start; depth < end; depth += step) points.push(borePointAt(state, depth));
  } else {
    for (let depth = start; depth > end; depth -= step) points.push(borePointAt(state, depth));
  }
  points.push(borePointAt(state, end));
  return points;
}

function taperedTunnel(depthCm: number, openingWidth: number, endWidth: number): string {
  const centerline = pathRange(0, depthCm, .5).map(project);
  const left: ScreenPoint[] = [];
  const right: ScreenPoint[] = [];
  centerline.forEach((center, index) => {
    const previous = centerline[Math.max(0, index - 1)]!;
    const next = centerline[Math.min(centerline.length - 1, index + 1)]!;
    const dx = next.x - previous.x, dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const ratio = centerline.length < 2 ? 1 : index / (centerline.length - 1);
    const half = (openingWidth + (endWidth - openingWidth) * ratio) / 2;
    const nx = -dy / length, ny = dx / length;
    left.push({ x: center.x + nx * half, y: center.y + ny * half });
    right.push({ x: center.x - nx * half, y: center.y - ny * half });
  });
  return [...left, ...right.reverse()].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function walkCrack(segmentIndex: number, segmentT: number, length: number, direction: -1 | 1): Vec3[] {
  const anchor = {
    x: LESSON_CRACK[segmentIndex]!.x + (LESSON_CRACK[segmentIndex + 1]!.x - LESSON_CRACK[segmentIndex]!.x) * segmentT,
    y: LESSON_CRACK[segmentIndex]!.y + (LESSON_CRACK[segmentIndex + 1]!.y - LESSON_CRACK[segmentIndex]!.y) * segmentT,
    z: LESSON_CRACK[segmentIndex]!.z + (LESSON_CRACK[segmentIndex + 1]!.z - LESSON_CRACK[segmentIndex]!.z) * segmentT,
  };
  const points = [anchor];
  let remaining = length;
  let index = segmentIndex + (direction === 1 ? 1 : 0);
  while (remaining > 0 && index >= 0 && index < LESSON_CRACK.length) {
    const next = LESSON_CRACK[index]!;
    const previous = points[points.length - 1]!;
    const span = Math.hypot(next.x - previous.x, next.y - previous.y, next.z - previous.z);
    if (span > remaining) {
      const ratio = remaining / span;
      points.push({ x: previous.x + (next.x - previous.x) * ratio, y: previous.y + (next.y - previous.y) * ratio, z: previous.z + (next.z - previous.z) * ratio });
      remaining = 0;
    } else {
      points.push(next);
      remaining -= span;
      index += direction;
    }
  }
  return points;
}

function svgText(x: number, y: number, label: string, className = 'scene-label-svg'): string {
  return `<text class="${className}" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${label}</text>`;
}

function drawWall(): string {
  const front = [point(0, 90, 0), point(100, 90, 0), point(100, 0, 0), point(0, 0, 0)];
  const top = [point(0, 90, 0), point(100, 90, 0), point(100, 90, 28), point(0, 90, 28)];
  const side = [point(100, 90, 0), point(100, 90, 28), point(100, 0, 28), point(100, 0, 0)];
  const polygon = (points: Vec3[]) => points.map(value => {
    const p = project(value);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
  const layers = [
    { name: '面層', from: 0, to: 1, color: '#f0e9db' },
    { name: '批土', from: 1, to: 3, color: '#c9ae88' },
    { name: '砂漿', from: 3, to: 8, color: '#927e6a' },
    { name: 'RC', from: 8, to: 23, color: '#758187' },
    { name: '防水', from: 23, to: 24, color: '#52c5c8' },
    { name: '飾面', from: 24, to: 28, color: '#d1c5a7' },
  ];
  const layerBands = layers.map(layer => {
    const strip = [point(100, 90, layer.from), point(100, 90, layer.to), point(100, 0, layer.to), point(100, 0, layer.from)];
    return `<polygon points="${polygon(strip)}" fill="${layer.color}" opacity=".9" stroke="#27343c" stroke-opacity=".24" stroke-width=".7"/>`;
  }).join('');
  const frontTop = project(front[0]!);
  const frontBottom = project(front[2]!);
  return `
    <polygon points="${polygon(top)}" fill="url(#topConcrete)" stroke="#59676d" stroke-width="2"/>
    <polygon points="${polygon(top)}" fill="url(#aggregate)" opacity=".36"/>
    <polygon points="${polygon(side)}" fill="url(#sideConcrete)" stroke="#4b5960" stroke-width="2"/>
    ${layerBands}
    <polygon points="${polygon(front)}" fill="url(#frontConcrete)" stroke="#626e72" stroke-width="2"/>
    <polygon points="${polygon(front)}" fill="url(#aggregate)" opacity=".58"/>
    <path d="M${frontTop.x.toFixed(1)},${frontTop.y.toFixed(1)}L${frontBottom.x.toFixed(1)},${frontBottom.y.toFixed(1)}" stroke="#eef0ec" stroke-opacity=".38" stroke-width="2"/>
    ${svgText(536, 428, '牆厚方向', 'scene-label-svg layer-label')}
    <path d="M525 421l28-11" stroke="#f0bd70" stroke-width="1.5" marker-end="url(#arrowHead)"/>
    ${svgText(135, 488, '室內側 · 進針面', 'scene-label-svg surface-label')}
    ${svgText(631, 366, '背面', 'scene-label-svg surface-label')}
  `;
}

function drawCracks(): string {
  const primary = pathData(LESSON_CRACK);
  const branch = pathData(LESSON_BRANCH);
  return `
    <path d="${primary}" class="crack-shadow"/>
    <path d="${primary}" class="crack-line"/>
    <path d="${branch}" class="crack-shadow branch-shadow"/>
    <path d="${branch}" class="crack-line branch-line"/>
    ${svgText(project(LESSON_CRACK[1]!).x + 8, project(LESSON_CRACK[1]!).y - 9, '內部裂縫', 'scene-label-svg crack-label')}
  `;
}

function drawBore(): string {
  const intersection = findCrackIntersection(state);
  const entry = project(borePointAt(state, 0));
  const end = project(borePointAt(state, state.boreDepthCm));
  const middle = project(borePointAt(state, state.boreDepthCm * .53));
  const tunnel = pathData(pathRange(0, state.boreDepthCm, .5));
  const tunnelOuter = taperedTunnel(state.boreDepthCm, 12, 4.5);
  const tunnelInner = taperedTunnel(state.boreDepthCm, 7.5, 2.2);
  const direction = boreDirection(state.azimuthDeg, state.tiltDeg);
  const screenAngle = Math.atan2(-direction.y * 3.45 - direction.z * 2.35, direction.x * 3.8 + direction.z * 4.1) * 180 / Math.PI;
  return `
    <polygon points="${tunnelOuter}" class="bore-rim-polygon"/>
    <polygon points="${tunnelInner}" class="bore-dark-polygon"/>
    <path d="${tunnel}" class="bore-bottom-highlight"/>
    <ellipse cx="${entry.x.toFixed(1)}" cy="${entry.y.toFixed(1)}" rx="9.5" ry="6.5" transform="rotate(${screenAngle.toFixed(1)} ${entry.x.toFixed(1)} ${entry.y.toFixed(1)})" fill="#8a9393" opacity=".9"/>
    <ellipse cx="${entry.x.toFixed(1)}" cy="${entry.y.toFixed(1)}" rx="6.4" ry="4.6" transform="rotate(${screenAngle.toFixed(1)} ${entry.x.toFixed(1)} ${entry.y.toFixed(1)})" fill="url(#recess)" stroke="#333f44" stroke-width="1"/>
    <ellipse cx="${entry.x.toFixed(1)}" cy="${entry.y.toFixed(1)}" rx="2.3" ry="1.6" transform="rotate(${screenAngle.toFixed(1)} ${entry.x.toFixed(1)} ${entry.y.toFixed(1)})" fill="#10181c" opacity=".92"/>
    ${svgText(middle.x + 14, middle.y - 13, `孔深 ${state.boreDepthCm.toFixed(1)} cm`, 'scene-label-svg depth-label')}
    <path d="M${entry.x + 13},${entry.y - 7}L${end.x + 3},${end.y - 4}" class="depth-guide" marker-end="url(#arrowHead)"/>
    ${intersection.connected ? `<circle cx="${project(intersection.point).x.toFixed(1)}" cy="${project(intersection.point).y.toFixed(1)}" r="5.5" class="junction-marker"/>${svgText(project(intersection.point).x + 12, project(intersection.point).y + 17, `交會 ${intersection.boreDepthCm.toFixed(1)} cm`, 'scene-label-svg junction-label')}` : ''}
  `;
}

function drawTool(): string {
  const mode = state.injecting ? 'flow' : viewMode;
  const entry = project(borePointAt(state, 0));
  const externalEnd = project(borePointAt(state, -12));
  const needleTip = project(borePointAt(state, state.needleDepthCm));
  if (mode === 'drill') {
    const bitEnd = project(borePointAt(state, Math.min(state.boreDepthCm, 4)));
    return `
      <path d="M${externalEnd.x},${externalEnd.y}L${entry.x},${entry.y}" class="drill-body-shadow"/>
      <path d="M${externalEnd.x},${externalEnd.y}L${entry.x},${entry.y}" class="drill-body"/>
      <path d="M${entry.x},${entry.y}L${bitEnd.x},${bitEnd.y}" class="drill-bit"/>
      <path d="M${externalEnd.x - 8},${externalEnd.y - 18}l-12-13 13-9 19 8 4 9" class="drill-handle"/>
      ${svgText(externalEnd.x - 43, externalEnd.y - 42, '鑽頭姿態', 'scene-label-svg tool-label')}
    `;
  }
  const grip = project(borePointAt(state, -7));
  return `
    <g class="injector-draggable" data-injector-grip="true" aria-label="拖曳注射器調整方向與角度">
      <path d="M${grip.x},${grip.y}L${needleTip.x},${needleTip.y}" class="needle-shadow"/>
      <path d="M${grip.x},${grip.y}L${needleTip.x},${needleTip.y}" class="needle-shaft"/>
      <path d="M${externalEnd.x},${externalEnd.y}L${grip.x},${grip.y}" class="hose-line"/>
      <path d="M${grip.x - 3},${grip.y - 8}l-11-7 8-14 13 7 4 10z" class="needle-grip"/>
      <circle cx="${grip.x.toFixed(1)}" cy="${grip.y.toFixed(1)}" r="48" class="injector-grip-hit"/>
      <circle cx="${grip.x.toFixed(1)}" cy="${grip.y.toFixed(1)}" r="18" class="injector-grip-target"/>
      <circle cx="${needleTip.x.toFixed(1)}" cy="${needleTip.y.toFixed(1)}" r="3.2" class="needle-tip"/>
      ${svgText(grip.x + 18, grip.y + 24, '拖曳握把調角', 'scene-label-svg drag-handle-label')}
      ${svgText(needleTip.x + 10, needleTip.y - 7, `針尖 ${state.needleDepthCm.toFixed(1)} cm`, 'scene-label-svg tool-label')}
    </g>
  `;
}

function drawDepthInset(): string {
  const bounds = { x: 638, y: 133, width: 207, height: 214 };
  const wall = { x: 651, y: 179, width: 176, height: 106 };
  const baseline = wall.y + wall.height * .5;
  const tilt = state.tiltDeg * Math.PI / 180;
  const azimuth = state.azimuthDeg * Math.PI / 180;
  const alongDrillPlane = (value: Vec3) => (value.x - 20) * Math.sin(azimuth) + (value.y - 55) * Math.cos(azimuth);
  const sectionPoint = (value: Vec3): ScreenPoint => ({
    x: wall.x + value.z / 28 * wall.width,
    y: baseline + alongDrillPlane(value) * 1.15,
  });
  const borePoint = (depth: number): ScreenPoint => ({
    x: wall.x + depth * Math.cos(tilt) / 28 * wall.width,
    y: baseline + depth * Math.sin(tilt) * 1.15,
  });
  const crackPath = (points: Vec3[]) => points.map((value, index) => {
    const p = sectionPoint(value);
    return `${index === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
  const borePath = (from: number, to: number) => {
    const points: ScreenPoint[] = [];
    const direction = to >= from ? 1 : -1;
    for (let d = from; direction > 0 ? d < to : d > to; d += direction * .4) points.push(borePoint(d));
    points.push(borePoint(to));
    return points.map((p, index) => `${index === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  };
  const intersection = findCrackIntersection(state);
  const crackAnchor = sectionPoint(intersection.point);
  const boreEnd = borePoint(state.boreDepthCm);
  const needleTip = borePoint(state.needleDepthCm);
  const flowEnd = borePoint(Math.min(state.boreDepthCm, Math.max(state.needleDepthCm, state.boreFlowFrontCm)));
  const crackFluid = intersection.connected && state.crackFlowLengthCm > 0 && state.needleDepthCm <= intersection.boreDepthCm + 3
    ? `<path d="M${crackAnchor.x.toFixed(1)},${crackAnchor.y.toFixed(1)}L${sectionPoint(LESSON_CRACK[Math.min(intersection.crackSegment + 1, LESSON_CRACK.length - 1)]!).x.toFixed(1)},${sectionPoint(LESSON_CRACK[Math.min(intersection.crackSegment + 1, LESSON_CRACK.length - 1)]!).y.toFixed(1)}" class="inset-fluid"/>`
    : '';
  const bandWidths = [1, 2, 5, 15, 1, 4];
  const bandColors = ['#f1e7d4', '#c9ae88', '#8e7964', '#79858a', '#49bec6', '#d0c3a2'];
  let cursor = wall.x;
  const bands = bandWidths.map((cm, index) => {
    const width = wall.width * cm / 28;
    const band = `<rect x="${cursor.toFixed(1)}" y="${wall.y}" width="${width.toFixed(1)}" height="${wall.height}" fill="${bandColors[index]}" opacity=".7"/>`;
    cursor += width;
    return band;
  }).join('');
  const depthLine = `<path d="M${wall.x},${wall.y + wall.height + 12}L${boreEnd.x.toFixed(1)},${wall.y + wall.height + 12}" class="inset-dimension" marker-end="url(#arrowHead)"/>`;
  const fluid = state.injectedMl > 0 && flowEnd.x > needleTip.x + .5
    ? `<path d="${borePath(state.needleDepthCm, Math.min(state.boreDepthCm, state.boreFlowFrontCm))}" class="inset-fluid"/>`
    : '';
  const needle = `<path d="M${wall.x - 27},${baseline}L${needleTip.x.toFixed(1)},${needleTip.y.toFixed(1)}" class="inset-needle"/>`;
  return `
    <rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="10" class="depth-inset-bg"/>
    <text x="${bounds.x + 12}" y="${bounds.y + 18}" class="inset-title">沿孔軸縱剖面</text>
    <text x="${bounds.x + 12}" y="${bounds.y + 32}" class="inset-caption">展開偏轉方向 · 牆厚方向向右</text>
    <defs><clipPath id="depthInsetClip"><rect x="${wall.x}" y="${wall.y}" width="${wall.width}" height="${wall.height}" rx="2"/></clipPath></defs>
    <g clip-path="url(#depthInsetClip)">
      <rect x="${wall.x}" y="${wall.y}" width="${wall.width}" height="${wall.height}" fill="#606b70"/>
      ${bands}
      <path d="${crackPath(LESSON_CRACK)}" class="inset-crack"/>
      <path d="${borePath(0, state.boreDepthCm)}" class="inset-bore"/>
      ${needle}
      ${fluid}${crackFluid}
      ${intersection.connected ? `<circle cx="${crackAnchor.x.toFixed(1)}" cy="${crackAnchor.y.toFixed(1)}" r="3.3" class="inset-junction"/>` : ''}
      <circle cx="${wall.x}" cy="${baseline}" r="5" class="inset-port"/>
    </g>
    <rect x="${wall.x}" y="${wall.y}" width="${wall.width}" height="${wall.height}" fill="none" stroke="#b9c9cd" stroke-opacity=".7"/>
    <text x="${wall.x}" y="${wall.y - 7}" class="inset-small">室內表面</text>
    <text x="${wall.x + wall.width - 26}" y="${wall.y - 7}" class="inset-small">牆內</text>
    ${depthLine}
    <text x="${wall.x}" y="${wall.y + wall.height + 27}" class="inset-small">孔深 ${state.boreDepthCm.toFixed(1)} cm</text>
    <text x="${wall.x + 89}" y="${wall.y + wall.height + 27}" class="inset-small">針尖 ${state.needleDepthCm.toFixed(1)} cm</text>
  `;
}

function drawFluid(): string {
  if (state.injectedMl <= 0) return '';
  const intersection = findCrackIntersection(state);
  const boreFrom = Math.min(state.needleDepthCm, state.boreDepthCm);
  const boreTo = Math.max(boreFrom, Math.min(state.boreFlowFrontCm, state.boreDepthCm));
  const boreFluid = boreTo - boreFrom > .1 ? `<path d="${pathData(pathRange(boreFrom, boreTo, .25))}" class="fluid-bore-glow"/><path d="${pathData(pathRange(boreFrom, boreTo, .25))}" class="fluid-bore"/>` : '';
  if (!intersection.connected || state.needleDepthCm > intersection.boreDepthCm + 3 || state.crackFlowLengthCm <= 0) return boreFluid;
  const forward = walkCrack(intersection.crackSegment, intersection.crackSegmentT, state.crackFlowLengthCm * .64, 1);
  const backward = walkCrack(intersection.crackSegment, intersection.crackSegmentT, state.crackFlowLengthCm * .36, -1);
  const branchLength = Math.max(0, state.crackFlowLengthCm - 10);
  const branch = LESSON_BRANCH.slice(0, 2);
  const branchTargetLength = Math.hypot(LESSON_BRANCH[2]!.x - LESSON_BRANCH[1]!.x, LESSON_BRANCH[2]!.y - LESSON_BRANCH[1]!.y, LESSON_BRANCH[2]!.z - LESSON_BRANCH[1]!.z)
    + Math.hypot(LESSON_BRANCH[3]!.x - LESSON_BRANCH[2]!.x, LESSON_BRANCH[3]!.y - LESSON_BRANCH[2]!.y, LESSON_BRANCH[3]!.z - LESSON_BRANCH[2]!.z);
  const branchFill: Vec3[] = [...branch];
  let left = Math.min(branchLength, branchTargetLength);
  for (let i = 2; i < LESSON_BRANCH.length && left > 0; i += 1) {
    const previous = branchFill[branchFill.length - 1]!;
    const next = LESSON_BRANCH[i]!;
    const span = Math.hypot(next.x - previous.x, next.y - previous.y, next.z - previous.z);
    if (span <= left) { branchFill.push(next); left -= span; }
    else { const ratio = left / span; branchFill.push({ x: previous.x + (next.x - previous.x) * ratio, y: previous.y + (next.y - previous.y) * ratio, z: previous.z + (next.z - previous.z) * ratio }); left = 0; }
  }
  const fluidPaths = [forward, backward, branchFill].filter(points => points.length > 1).map(points => `<path d="${pathData(points)}" class="fluid-crack-glow"/><path d="${pathData(points)}" class="fluid-crack"/>`).join('');
  return `${boreFluid}${fluidPaths}<circle cx="${project(intersection.point).x.toFixed(1)}" cy="${project(intersection.point).y.toFixed(1)}" r="7" class="fluid-junction"/>`;
}

function render(): void {
  const intersection = findCrackIntersection(state);
  const coverage = state.maxCrackLengthCm > 0 ? Math.round(state.crackFlowLengthCm / state.maxCrackLengthCm * 100) : 0;
  const connected = intersection.connected;
  $('g#wallGeometry').innerHTML = drawWall();
  $('g#crackGeometry').innerHTML = drawCracks();
  $('g#boreGeometry').innerHTML = drawBore();
  $('g#fluidGeometry').innerHTML = drawFluid();
  $('g#toolGeometry').innerHTML = drawTool();
  $('g#annotationGeometry').innerHTML = drawDepthInset();

  $('output#azimuthValue').textContent = `${Math.round(state.azimuthDeg)}°`;
  $('output#tiltValue').textContent = `${Math.round(state.tiltDeg)}°`;
  $('output#boreDepthValue').textContent = `${state.boreDepthCm.toFixed(1)} cm`;
  $('output#needleDepthValue').textContent = `${state.needleDepthCm.toFixed(1)} cm`;
  needleDepthSlider.max = state.boreDepthCm.toString();
  needleDepthSlider.value = state.needleDepthCm.toString();
  $('span#needleDepthMax').textContent = `${state.boreDepthCm.toFixed(1)} cm`;
  $('strong#junctionValue').textContent = connected ? `${intersection.boreDepthCm.toFixed(1)} cm` : '未接通';
  $('strong#volumeValue').innerHTML = `${Math.floor(state.injectedMl)} <small>mL</small>`;
  $('strong#coverageValue').innerHTML = `${coverage}<small>%</small>`;
  $('i#coverageBar').style.width = `${coverage}%`;
  $('button#injectionButton').textContent = state.injecting ? 'Ⅱ 停止灌注' : '▶ 開始灌注';
  $('button#injectionButton').classList.toggle('is-active', state.injecting);
  $('span#flowStatus').textContent = state.injecting ? '灌注中' : state.injectedMl > 0 ? '已停止' : '待開始';
  $('span#flowStatus').classList.toggle('is-live', state.injecting);

  const badge = $('div#connectionBadge');
  badge.dataset.connected = String(connected);
  $('strong#connectionTitle').textContent = connected ? '孔軸已接近裂縫' : '尚未接通裂縫';
  $('span#sceneFeedback').textContent = connected
    ? `模型交會深度約 ${intersection.boreDepthCm.toFixed(1)} cm；偏差 ${intersection.distanceCm.toFixed(1)} cm，流體可沿孔道進入裂縫。`
    : `最近距離 ${Number.isFinite(intersection.distanceCm) ? intersection.distanceCm.toFixed(1) : '—'} cm；目前孔軸沒有進入裂縫範圍。`;
  $('p#needleGuidance').textContent = !connected
    ? '先調整孔軸使它接近裂縫；針頭再深也不能補足沒有接通的鑽孔。'
    : state.needleDepthCm > intersection.boreDepthCm + 3
      ? '針尖已越過裂縫交會處；這個示意中，流體從較深的針尖出發，不會自動回流到較淺裂縫。'
      : state.needleDepthCm < intersection.boreDepthCm - 1
        ? `孔軸已接通裂縫，但針尖在交會點前 ${ (intersection.boreDepthCm - state.needleDepthCm).toFixed(1) } cm；開始灌注後需先沿孔道推進。`
        : '針尖位於裂縫交會區附近；開始灌注後，流體會先充填孔道，再沿裂縫分流。';
  $('p#flowExplanation').textContent = !connected
    ? state.injectedMl > 0 ? '可看到流體停留在鑽孔內；因孔軸沒有接通裂縫，裂縫覆蓋仍為 0%。' : '啟動後流體會從針尖沿孔道前進；目前的鑽孔方向尚未接通裂縫。'
    : state.needleDepthCm > intersection.boreDepthCm + 3
      ? '孔道雖與裂縫相交，但針尖已越過交會點；本教學模型不把流體倒灌回較淺裂縫。'
      : state.crackFlowLengthCm > 0
        ? '流體已到達孔裂交會處，並沿主裂縫與分支通道逐步擴展。'
        : state.injectedMl > 0
          ? '流體正在孔道中前進，尚未到達裂縫交會點。'
          : '啟動後流體會從針尖沿孔道前進；只有鑽孔接近裂縫時才會進入裂縫通道。';
  $('span#flowStatus').setAttribute('aria-label', state.injecting ? '灌注進行中' : '灌注已停止');
  $('button#injectionButton').setAttribute('aria-pressed', String(state.injecting));
}

function inputGeometry(): LessonGeometry {
  return {
    azimuthDeg: Number(azimuthSlider.value),
    tiltDeg: Number(tiltSlider.value),
    boreDepthCm: Number(boreDepthSlider.value),
    needleDepthCm: Number(needleDepthSlider.value),
  };
}

function applyGeometry(): void {
  updateLessonGeometry(state, inputGeometry());
  accumulator = 0;
  if (state.injectedMl > 0 || state.injecting) $('span#flowStatus').textContent = '幾何變更，已重置';
  render();
}

function screenToSvg(event: PointerEvent): ScreenPoint | null {
  const matrix = lessonScene.getScreenCTM();
  if (!matrix) return null;
  const screenPoint = lessonScene.createSVGPoint();
  screenPoint.x = event.clientX;
  screenPoint.y = event.clientY;
  const local = screenPoint.matrixTransform(matrix.inverse());
  return { x: local.x, y: local.y };
}

function gripPositionForDirection(direction: Vec3, entry: ScreenPoint): ScreenPoint {
  const depth = -7;
  return {
    x: entry.x + depth * (direction.x * 3.8 + direction.z * 4.1),
    y: entry.y + depth * (-direction.y * 3.45 - direction.z * 2.35),
  };
}

function directionFromGripPosition(position: ScreenPoint): { azimuthDeg: number; tiltDeg: number } {
  const entry = project(borePointAt(state, 0));
  const handleDepth = 7;
  const projectedX = -(position.x - entry.x) / handleDepth;
  const projectedY = (position.y - entry.y) / handleDepth;
  const x0 = projectedX / 3.8, xz = -4.1 / 3.8;
  const y0 = projectedY / 3.45, yz = -2.35 / 3.45;
  const quadraticA = xz * xz + yz * yz + 1;
  const quadraticB = 2 * (x0 * xz + y0 * yz);
  const quadraticC = x0 * x0 + y0 * y0 - 1;
  const discriminant = quadraticB * quadraticB - 4 * quadraticA * quadraticC;
  const minimumNormal = Math.cos(85 * Math.PI / 180);
  const current = boreDirection(state.azimuthDeg, state.tiltDeg);
  const candidates: Vec3[] = [];

  if (discriminant >= -1e-8) {
    const root = Math.sqrt(Math.max(0, discriminant));
    for (const normal of [(-quadraticB - root) / (2 * quadraticA), (-quadraticB + root) / (2 * quadraticA)]) {
      if (normal < minimumNormal - 1e-6 || normal > 1 + 1e-6) continue;
      candidates.push({ x: x0 + xz * normal, y: y0 + yz * normal, z: normal });
    }
  }

  if (!candidates.length) {
    // Outside the reachable screen-space ellipse, keep dragging smoothly along its 85° edge.
    let nearest: { direction: Vec3; distance: number } | null = null;
    for (let azimuthDeg = 0; azimuthDeg < 360; azimuthDeg += 1) {
      const direction = boreDirection(azimuthDeg, 85);
      const grip = gripPositionForDirection(direction, entry);
      const screenDistance = Math.hypot(grip.x - position.x, grip.y - position.y);
      if (!nearest || screenDistance < nearest.distance) nearest = { direction, distance: screenDistance };
    }
    const normalDirection = boreDirection(state.azimuthDeg, 0);
    const normalGrip = gripPositionForDirection(normalDirection, entry);
    const normalDistance = Math.hypot(normalGrip.x - position.x, normalGrip.y - position.y);
    if (!nearest || normalDistance < nearest.distance) nearest = { direction: normalDirection, distance: normalDistance };
    candidates.push(nearest.direction);
  }

  const direction = candidates.reduce((best, candidate) => {
    const candidateDot = candidate.x * current.x + candidate.y * current.y + candidate.z * current.z;
    const bestDot = best.x * current.x + best.y * current.y + best.z * current.z;
    return candidateDot > bestDot ? candidate : best;
  });
  const azimuthDeg = (Math.atan2(direction.x, direction.y) * 180 / Math.PI + 360) % 360;
  const tiltDeg = Math.acos(Math.max(-1, Math.min(1, direction.z))) * 180 / Math.PI;
  return { azimuthDeg, tiltDeg };
}

lessonScene.addEventListener('pointerdown', event => {
  if (state.injecting || !(event.target instanceof Element) || !event.target.closest('[data-injector-grip]')) return;
  const cursor = screenToSvg(event);
  if (!cursor) return;
  const grip = project(borePointAt(state, -7));
  syringeDrag = { pointerId: event.pointerId, offset: { x: grip.x - cursor.x, y: grip.y - cursor.y } };
  lessonScene.dataset.draggingInjector = 'true';
  event.preventDefault();
  lessonScene.setPointerCapture(event.pointerId);
});

lessonScene.addEventListener('pointermove', event => {
  if (!syringeDrag || syringeDrag.pointerId !== event.pointerId || state.injecting) return;
  const cursor = screenToSvg(event);
  if (!cursor) return;
  const next = directionFromGripPosition({ x: cursor.x + syringeDrag.offset.x, y: cursor.y + syringeDrag.offset.y });
  azimuthSlider.value = String(Math.min(359, Math.max(0, Math.round(next.azimuthDeg))));
  tiltSlider.value = String(Math.min(85, Math.max(0, Math.round(next.tiltDeg))));
  applyGeometry();
  event.preventDefault();
});

const finishSyringeDrag = (event: PointerEvent): void => {
  if (syringeDrag?.pointerId !== event.pointerId) return;
  syringeDrag = null;
  delete lessonScene.dataset.draggingInjector;
};
lessonScene.addEventListener('pointerup', finishSyringeDrag);
lessonScene.addEventListener('pointercancel', finishSyringeDrag);
lessonScene.addEventListener('lostpointercapture', finishSyringeDrag);

for (const slider of [azimuthSlider, tiltSlider, boreDepthSlider, needleDepthSlider]) slider.addEventListener('input', applyGeometry);

document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => {
  button.addEventListener('click', () => {
    viewMode = button.dataset.view as ViewMode;
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    render();
  });
});

$('button#injectionButton').addEventListener('click', () => {
  toggleInjection(state);
  if (state.injecting) viewMode = 'flow';
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === viewMode)));
  render();
  if (state.injecting && frameRequest === 0) {
    lastFrame = performance.now();
    frameRequest = requestAnimationFrame(frame);
  }
});

$('button#resetLessonButton').addEventListener('click', () => {
  resetInjection(state);
  accumulator = 0;
  render();
});

function frame(now: number): void {
  frameRequest = 0;
  const elapsed = Math.min(.1, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (state.injecting) {
    accumulator += elapsed;
    while (accumulator >= FIXED_STEP_SECONDS) {
      updateInjectionLesson(state, FIXED_STEP_SECONDS);
      accumulator -= FIXED_STEP_SECONDS;
    }
  }
  render();
  if (state.injecting) frameRequest = requestAnimationFrame(frame);
}

render();

declare global {
  interface Window {
    __injectionLessonTest?: {
      snapshot: () => Pick<InjectionLessonState, 'azimuthDeg' | 'tiltDeg' | 'boreDepthCm' | 'needleDepthCm' | 'injecting' | 'injectedMl' | 'boreFlowFrontCm' | 'crackFlowLengthCm'> & { connected: boolean; intersectionDepthCm: number; };
    };
  }
}

if (new URLSearchParams(location.search).has('test')) {
  window.__injectionLessonTest = {
    snapshot: () => {
      const intersection = findCrackIntersection(state);
      return {
        azimuthDeg: state.azimuthDeg,
        tiltDeg: state.tiltDeg,
        boreDepthCm: state.boreDepthCm,
        needleDepthCm: state.needleDepthCm,
        injecting: state.injecting,
        injectedMl: state.injectedMl,
        boreFlowFrontCm: state.boreFlowFrontCm,
        crackFlowLengthCm: state.crackFlowLengthCm,
        connected: intersection.connected,
        intersectionDepthCm: intersection.boreDepthCm,
      };
    },
  };
}
