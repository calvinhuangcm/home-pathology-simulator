import { createFloorSurface } from '../renderer/floorSurface';
import { createFloorControls } from '../ui/floorControls';
import { FLOOR_SURFACE, isFloorPoint, startFloorWaterTest } from '../simulation/floorModel';
import { isCellularScenario, isBathroomScenario } from '../scenarios/bathroom';
import { createBathroomControls, bathroomSupplyKey, bathroomSupplyActive } from '../ui/bathroomControls';
import { createBathroomScene } from '../renderer/bathroomScene';
import { createExternalAssets } from '../renderer/externalAssets';
import { createSceneGeometry } from '../renderer/sceneGeometry';
import { scenarios, materialProfiles, modeLabels } from '../scenarios/legacyCatalog';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { moistureReading, moistureStatus } from '../tools/moistureMeter';
import { drill as drillCell } from '../tools/drill';
import { insertNeedle as fixNeedle, startInjection } from '../tools/injector';
import { createMoistureField } from '../renderer/moistureField';
import { createSimulationControls } from '../ui/simulationControls';
import { connectEngine } from '../ui/engineBridge';
import { createDiagnosticControls } from '../ui/diagnosticControls';
import { brushWaterproof } from '../tools/surfaceWaterproof';
import { surfaceTemperatureC } from '../tools/thermalCamera';

// Preserved prototype controller. Only legacy scenarios use the scalar demo model below.
// Scenario 01 delegates every physical reading/action to the typed SimulationEngine.

  (() => {
    'use strict';

    // =========================
    // DOM 與基礎工具
    // =========================
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));
    const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
    const lerp = (a, b, t) => a + (b - a) * t;
    const fmtPct = (value) => `${Math.round(clamp(value) * 100)}%`;
    const fmt = (value) => Number(value).toFixed(2);
    const randomSeeded = (seed) => {
      let x = Math.sin(seed * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };

    const ui = {
      viewport: $('#viewport'),
      canvas: $('#scene'),
      assetStatus: $('#assetStatus'),
      toast: $('#toast'),
      sceneTitle: $('#sceneTitle'),
      sceneSubtitle: $('#sceneSubtitle'),
      modeBadge: $('#modeBadge'),
      modeHint: $('#modeHint'),
      rainSlider: $('#rainSlider'),
      rainValue: $('#rainValue'),
      rainColorPicker: $('#rainColorPicker'),
      rainColorResetBtn: $('#rainColorResetBtn'),
      rainColorValue: $('#rainColorValue'),
      windSlider: $('#windSlider'),
      windValue: $('#windValue'),
      timeSlider: $('#timeSlider'),
      timeValue: $('#timeValue'),
      playPauseBtn: $('#playPauseBtn'),
      resetBtn: $('#resetBtn'),
      meterSelect: $('#meterSelect'),
      materialSelect: $('#materialSelect'),
      crackStateField: $('#crackStateField'),
      sourceHint: $('#sourceHint'),
      sourceFixBtn: $('#sourceFixBtn'),
      measureBtn: $('#measureBtn'),
      sectionBtn: $('#sectionBtn'),
      soundBtn: $('#soundBtn'),
      labelsBtn: $('#labelsBtn'),
      leakMetric: $('#leakMetric'),
      moistureMetric: $('#moistureMetric'),
      effloMetric: $('#effloMetric'),
      moldMetric: $('#moldMetric'),
      diagnosisEyebrow: $('#diagnosisEyebrow'),
      diagnosisTitle: $('#diagnosisTitle'),
      diagnosisText: $('#diagnosisText'),
      confidenceBar: $('#confidenceBar'),
      confidenceValue: $('#confidenceValue'),
      controlMetric: $('#controlMetric'),
      controlMeta: $('#controlMeta'),
      suspectMetric: $('#suspectMetric'),
      suspectMeta: $('#suspectMeta'),
      actionList: $('#actionList'),
      eventLog: $('#eventLog'),
      waterLegendSwatch: $('#waterLegendSwatch'),
      ...Object.fromEntries(['workflowSummary', 'undoBtn', 'frontViewBtn', 'homeViewBtn', 'topViewBtn', 'cutawayBtn', 'hoverReadout', 'operationTitle', 'operationDetail', 'operationProgress', 'nextStepBtn', 'stopInjectionBtn', 'portCount', 'portHint', 'portList', 'verificationSection', 'verificationResult', 'controlSampleBtn', 'suspectSampleBtn'].map((id) => [id, $('#' + id)])),
    };

    // =========================
    // 情境資料：把真實案例抽象成可解釋的教學模型
    // =========================
    const defaultRainColor = '#51d6f4';

    // 外部素材採「可選增強」策略：室內粉光、牆體磚層貼圖與 CC0 glTF 工具模型從網路載入，
    // 離線時改用 Canvas 程式材質和程序幾何，保留單檔 HTML 的基本操作能力。
    // 貼圖採 Poly Haven 的 White Plaster 02／Red Brick 03（CC0）；電鑽與泵體採 3DAssets.dev（CC0）。
    // 泵體是通用轉送泵的視覺素材，不代表實際高壓灌注機規格；壓力表與灌注流程仍由本模擬器呈現。
    const externalAssetUrls = {
      plasterDiffuse: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/white_plaster_02/white_plaster_02_diff_1k.jpg',
      plasterBump: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/white_plaster_02/white_plaster_02_bump_1k.jpg',
      brickDiffuse: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/red_brick_03/red_brick_03_diff_1k.jpg',
      brickBump: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/red_brick_03/red_brick_03_bump_1k.jpg',
      materialBottle: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/WaterBottle/glTF-Binary/WaterBottle.glb',
      drillTool: 'https://cdn.3dassets.dev/assets/23934/v1/model.glb',
      injectionPump: 'https://cdn.3dassets.dev/assets/30870/v1/model.glb',
    };
    const externalAssets = {
      plasterDiffuse: null,
      plasterBump: null,
      brickDiffuse: null,
      brickBump: null,
      materialBottle: null,
      drillTool: null,
      injectionPump: null,
      loaded: { plasterDiffuse: false, plasterBump: false, brickDiffuse: false, brickBump: false, materialBottle: false, drillTool: false, injectionPump: false },
      failed: { plasterDiffuse: false, plasterBump: false, brickDiffuse: false, brickBump: false, materialBottle: false, drillTool: false, injectionPump: false },
      statusLogged: false,
      timeout: null,
    };

    const state = {
      scenario: 'crack',
      mode: 'inspect',
      material: 'pu',
      meter: 'pinless',
      crackState: 'static',
      running: true,
      timeScale: 1,
      rain: .72,
      rainColor: defaultRainColor,
      wind: .38,
      time: 0,
      cutaway: false,
      labels: true,
      sourceFixed: false,
      ventilationFixed: false,
      pipeFixed: false,
      rooftopFixed: false,
      controlReading: null,
      suspectReading: null,
      ports: [],
      nextPortId: 1,
      selectedPort: null,
      samples: { control: null, suspect: null },
      sampleTarget: 'control',
      history: [],
      repairBaseline: null,
      verification: null,
      injection: { active: false, total: 0, wrong: 0, overflow: 0, targetPort: null },
      wallMoisture: .42,
      efflorescence: .12,
      moldRisk: .18,
      leakRate: .86,
      lastReadingPoint: null,
      log: [],
      hovered: null,
      hoverHit: null,
    };
    const engine = new SimulationEngine();
    const bridge = connectEngine(state, engine);
    bridge.connectInjection();
    const simulationControls = createSimulationControls(engine);
    const bathroomControls = createBathroomControls(engine, simulationControls.view, {
      notify: (message, type) => { showToast(message, type); addLog(message, type); },
      beforeChange: () => { if (bathroomSupplyActive(engine.state) && !engine.state.repairs.waterproofRepaired && !engine.state.repairs.bypassInstalled) captureRepairBaseline(true); },
      changed: () => { state.verification = null; refreshUI(); },
      changeView: () => { cancelGestures(); setView('home'); updateMeasurementMarkers(); refreshUI(); },
      remember: snapshot => remember('浴室修繕', () => {}, snapshot),
    });
    const diagnosticControls = createDiagnosticControls(engine, simulationControls.view, {
      notify: (message, type) => { showToast(message, type); addLog(message, type); },
      beforeChange: () => captureRepairBaseline(),
      changed: () => { state.verification = null; refreshUI(); },
      changeView: () => { cancelGestures(); setView('home'); updateMeasurementMarkers(); refreshUI(); },
      remember: snapshot => remember('診斷情境修繕', () => {}, snapshot),
    });
    const floorControls = createFloorControls(engine, simulationControls.view, {
      changeView: () => { if (engine.state.tools.floorTestArmed && state.mode !== 'inspect') setMode('inspect'); cancelGestures(); setView('home'); updateMeasurementMarkers(); refreshUI(); },
      notify: (message, type) => showToast(message, type),
    });
    let fieldRenderer, ceilingFieldRenderer, floorFieldRenderer, bathroomScene, floorSurface;
    let activePath = [];
    let activeBrushStroke = null;
    let uiElapsed = 0;
    let visualElapsed = 0;

    // =========================
    // Three.js 場景與程序幾何
    // =========================
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x07111f, 15, 33);
    const camera = new THREE.PerspectiveCamera(43, 1, .1, 100);
    camera.position.set(9.2, 6.4, 12.8);

    const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x07111f, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

    const ambient = new THREE.HemisphereLight(0x9ed8ff, 0x07111f, 1.45);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xbce9ff, 1.6);
    keyLight.position.set(6, 11, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x2b8eaf, 1.2, 18);
    fillLight.position.set(-4, 4, 5);
    scene.add(fillLight);

    const world = new THREE.Group();
    const architecture = new THREE.Group();
    const rainGroup = new THREE.Group();
    const waterGroup = new THREE.Group();
    const wetGroup = new THREE.Group();
    const degradationGroup = new THREE.Group();
    const injectionGroup = new THREE.Group();
    const portGroup = new THREE.Group();
    const needleGroup = new THREE.Group();
    const toolCursorGroup = new THREE.Group();
    const injectionMachineGroup = new THREE.Group();
    const labelGroup = new THREE.Group();
    const measurementGroup = new THREE.Group();
    world.add(architecture, rainGroup, waterGroup, wetGroup, degradationGroup, injectionGroup, portGroup, needleGroup, toolCursorGroup, injectionMachineGroup, labelGroup, measurementGroup);
    scene.add(world);

    const colors = {
      wall: 0x9aabb5,
      wallInner: 0x6f828c,
      slab: 0x536772,
      cavity: 0x172d3a,
      frame: 0x364b58,
      glass: 0x5ab1c8,
      pipe: 0xc84f62,
      water: 0x51d6f4,
      wet: 0x367d99,
      efflorescence: 0xf5f0c9,
      mold: 0x4fa878,
      crack: 0x18242c,
      marker: 0xff778b,
    };

    const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: .04, ...options });
    const basic = (color, options = {}) => new THREE.MeshBasicMaterial({ color, ...options });

    const reusable = {
      unitBox: new THREE.BoxGeometry(1, 1, 1),
      unitPlane: new THREE.PlaneGeometry(1, 1),
      smallSphere: new THREE.SphereGeometry(.07, 8, 6),
      portCylinder: new THREE.CylinderGeometry(.085, .085, .22, 12),
      targetRing: new THREE.RingGeometry(.12, .155, 28),
    };

    const { createFallbackSurfaceMaps, addBox, addLine, makeTextSprite, buildFloorAndRoom, buildWall, buildWindow, buildRainField, buildPipe, buildRooftopBalcony, buildLabels, buildToolCursor, buildInjectionMachine } = createSceneGeometry({ state, reusable, colors, mat, basic, randomSeeded, materialProfiles, architecture, toolCursorGroup, injectionMachineGroup, rainGroup, labelGroup });

    const hoverRing = new THREE.Mesh(reusable.targetRing, basic(0x55d6e6, { side: THREE.DoubleSide, depthTest: false, depthWrite: false, transparent: true, opacity: .95 }));
    hoverRing.renderOrder = 20;
    hoverRing.visible = false;
    world.add(hoverRing);

    function disposeObject(object) {
      // 只釋放本物件擁有的資源；共享基本幾何留給其他孔位、測量標記重用。
      // 內嵌核心為 Three.js r128，使用其支援的 parent.remove，避免切換情境中途失敗。
      object.parent?.remove(object);
      const disposed = new Set();
      object.traverse((child) => {
        if (child.geometry && !Object.values(reusable).includes(child.geometry) && !disposed.has(child.geometry)) {
          disposed.add(child.geometry);
          child.geometry.dispose();
        }
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.filter(Boolean).forEach((material) => {
          if (disposed.has(material)) return;
          disposed.add(material);
          if (child.isSprite && material.map) material.map.dispose();
          material.dispose();
        });
      });
    }

    function clearGroup(group) {
      while (group.children.length) disposeObject(group.children[group.children.length - 1]);
    }

    const { loadExternalAssets } = createExternalAssets({ state, ui, externalAssets, externalAssetUrls, renderer, architecture, injectionMachineGroup, toolCursorGroup, makeTextSprite, addLog });

    function createScene() {
      buildFloorAndRoom();
      buildWall();
      buildWindow();
      buildRainField();
      buildPipe();
      buildRooftopBalcony();
      buildLabels();
      bathroomScene = createBathroomScene(architecture);
      floorSurface = createFloorSurface(architecture);
      buildToolCursor();
      buildInjectionMachine();
      indexInteractionSurfaces();
      rebuildScenarioGeometry();
    }

    function setMaterialOpacity(material, opacity) {
      material.opacity = opacity;
      material.transparent = opacity < .999;
      material.needsUpdate = true;
    }

    function updateCutawayVisual() {
      const surface = architecture.getObjectByName('surface-wall');
      const substrate = architecture.getObjectByName('substrate-wall');
      const cavity = architecture.getObjectByName('cavity-wall');
      const outer = architecture.getObjectByName('outer-wall');
      if (!surface) return;
      // Solid walls must render before translucent surface damage. Otherwise those
      // particles write depth first and punch brick-shaped holes through the plaster.
      setMaterialOpacity(surface.material, state.cutaway ? .22 : 1);
      setMaterialOpacity(substrate.material, state.cutaway ? .44 : 1);
      setMaterialOpacity(cavity.material, state.cutaway ? .92 : 1);
      setMaterialOpacity(outer.material, state.cutaway ? .35 : 1);
      // Cutaway shells blend back-to-front without hiding the internal field.
      [outer, cavity, substrate, surface].forEach((mesh, index) => {
        mesh.material.depthWrite = !state.cutaway;
        mesh.renderOrder = state.cutaway ? index + 1 : 0;
      });
      ['ceiling', 'balcony-slab'].forEach((name) => {
        const mesh = architecture.getObjectByName(name);
        if (mesh) { setMaterialOpacity(mesh.material, state.cutaway ? .25 : 1); mesh.material.depthWrite = !state.cutaway; }
      });
      if (isCellularScenario(state.scenario)) {
        substrate.material.map = null; substrate.material.bumpMap = null; substrate.material.color.setHex(0x65747b);
        substrate.material.needsUpdate = true;
      } else {
        substrate.material.map = externalAssets.brickDiffuse || architecture.userData.brickFallbackMaps.map;
        substrate.material.bumpMap = externalAssets.brickBump || architecture.userData.brickFallbackMaps.bumpMap;
        substrate.material.color.setHex(0xffffff);
      }
      updateScenarioFeatureVisibility();
      ui.cutawayBtn.setAttribute('aria-pressed', String(state.cutaway));
      ui.sectionBtn.setAttribute('aria-pressed', String(state.cutaway));
      ui.sectionBtn.textContent = state.cutaway ? '◈ 還原外觀' : '◈ 剖面視圖';
    }

    function updateScenarioFeatureVisibility() {
      // 情境是單選狀態：未選取的情境群組保持隱藏，避免窗框、管線、陽台水路互相疊加。
      // 天花板是陽台向下滲漏的剖面背景，只有選到陽台情境才顯示，避免其他情境出現多餘樓板。
      const showRooftop = state.scenario === 'rooftop';
      ui.topViewBtn.hidden = !showRooftop;
      const ceiling = architecture.getObjectByName('ceiling');
      if (ceiling) ceiling.visible = showRooftop;
      if (architecture.userData.windowGroup) architecture.userData.windowGroup.visible = state.scenario === 'window';
      if (architecture.userData.pipeGroup) architecture.userData.pipeGroup.visible = state.scenario === 'pipe';
      if (architecture.userData.rooftopGroup) architecture.userData.rooftopGroup.visible = showRooftop;
      // 牆內連通水路只在剖面視圖顯示；外觀視圖改由不規則濕痕和局部注入口擴散表示，避免出現長條色帶。
      waterGroup.traverse((object) => {
        if (object.userData?.interiorOnly) object.visible = state.cutaway;
      });
      labelGroup.visible = state.labels;
      labelGroup.children.forEach((label) => {
        label.visible = state.labels && !(state.scenario === 'crack' && label.userData.interiorOnly) && (!label.userData.scenario || label.userData.scenario === state.scenario) && (!label.userData.interiorOnly || state.cutaway);
      });
    }

    function crackPoints() {
      if (state.scenario === 'crack') {
        return [
          new THREE.Vector3(-1.22, 5.35, .73),
          new THREE.Vector3(-1.05, 4.85, .73),
          new THREE.Vector3(-1.35, 4.3, .73),
          new THREE.Vector3(-1.12, 3.78, .73),
          new THREE.Vector3(-1.4, 3.18, .73),
          new THREE.Vector3(-1.18, 2.48, .73),
          new THREE.Vector3(-1.38, 1.76, .73),
          new THREE.Vector3(-1.28, 1.12, .73),
        ];
      }
      if (state.scenario === 'condensation') {
        return [
          new THREE.Vector3(-3.9, 5.18, .73),
          new THREE.Vector3(-2.8, 5.05, .73),
          new THREE.Vector3(-1.7, 5.17, .73),
          new THREE.Vector3(-.6, 5.02, .73),
        ];
      }
      return [
        new THREE.Vector3(-3.2, 4.88, .73),
        new THREE.Vector3(-2.1, 4.88, .73),
        new THREE.Vector3(-1.2, 4.89, .73),
      ];
    }

    function pathPoints() {
      const scenario = state.scenario;
      if (scenario === 'window') {
        return [
          new THREE.Vector3(2.85, 4.75, -.75),
          new THREE.Vector3(2.6, 4.28, -.55),
          new THREE.Vector3(2.42, 3.85, -.35),
          new THREE.Vector3(2.15, 3.42, -.22),
          new THREE.Vector3(1.92, 2.95, -.08),
          new THREE.Vector3(1.78, 2.45, .2),
          new THREE.Vector3(1.55, 2.05, .55),
        ];
      }
      if (scenario === 'crack') return crackPoints().map((p, i) => new THREE.Vector3(p.x, p.y, -.12 + i * .06));
      if (scenario === 'pipe') {
        return [
          new THREE.Vector3(3.45, 2.45, -.36),
          new THREE.Vector3(2.55, 2.45, -.34),
          new THREE.Vector3(1.25, 2.45, -.32),
          new THREE.Vector3(.2, 2.45, -.18),
          new THREE.Vector3(-.5, 2.45, .18),
        ];
      }
      if (scenario === 'rooftop') {
        return [
          new THREE.Vector3(-4.15, 7.72, 1.28),
          new THREE.Vector3(-3.92, 6.86, 1.28),
          new THREE.Vector3(-3.12, 6.52, .98),
          new THREE.Vector3(-2.25, 6.43, .38),
          new THREE.Vector3(-2.25, 5.86, .18),
          new THREE.Vector3(-2.42, 5.28, .78),
          new THREE.Vector3(-2.36, 4.68, .8),
          new THREE.Vector3(-2.48, 4.04, .8),
          new THREE.Vector3(-2.4, 3.38, .8),
          new THREE.Vector3(-2.56, 2.76, .8),
        ];
      }
      return [
        new THREE.Vector3(-3.7, 5.55, .7),
        new THREE.Vector3(-3.1, 5.22, .7),
        new THREE.Vector3(-2.5, 4.95, .7),
        new THREE.Vector3(-1.9, 4.78, .7),
      ];
    }

    // 濕痕不使用外部貼圖：用自訂 BufferGeometry 做不規則放射狀多邊形，
    // 再用 shader 讓中心較深、邊緣逐漸淡出，避免再出現生硬的矩形色塊。
    const wetStainVertexShader = `
      attribute float aDistance;
      varying float vDistance;
      void main() {
        vDistance = aDistance;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const wetStainFragmentShader = `
      uniform vec3 uColor;
      uniform vec3 uEdgeColor;
      uniform float uOpacity;
      uniform float uPulse;
      varying float vDistance;
      void main() {
        float center = 1.0 - smoothstep(0.0, 1.0, vDistance);
        float edgeFade = 1.0 - smoothstep(0.54, 1.0, vDistance);
        float mottling = 0.94 + 0.06 * sin(vDistance * 22.0 + uPulse);
        vec3 tint = mix(uEdgeColor, uColor, smoothstep(0.04, 0.72, center));
        float alpha = uOpacity * edgeFade * (0.72 + center * 0.72) * mottling;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(tint, alpha);
      }
    `;

    function createIrregularStainGeometry(size, seed, pointCount = 18) {
      const positions = [0, 0, 0];
      const distances = [0];
      const indices = [];
      for (let i = 0; i < pointCount; i++) {
        const angle = (i / pointCount) * Math.PI * 2 + (randomSeeded(seed + i * 1.73) - .5) * .22;
        const radius = .82 + randomSeeded(seed + i * 2.91 + 7) * .26;
        const wobbleX = .92 + randomSeeded(seed + i * 4.13 + 11) * .14;
        const wobbleY = .9 + randomSeeded(seed + i * 5.37 + 17) * .18;
        positions.push(
          Math.cos(angle) * size[0] * .5 * radius * wobbleX,
          Math.sin(angle) * size[1] * .5 * radius * wobbleY,
          0,
        );
        distances.push(1);
      }
      for (let i = 0; i < pointCount; i++) {
        const next = i === pointCount - 1 ? 1 : i + 2;
        indices.push(0, i + 1, next);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('aDistance', new THREE.Float32BufferAttribute(distances, 1));
      geometry.setIndex(indices);
      geometry.computeBoundingSphere();
      return geometry;
    }

    function createProceduralStainMesh(position, size, color, options = {}) {
      const edgeColor = options.edgeColor ?? 0x718f9a;
      const geometry = createIrregularStainGeometry(size, options.seed ?? 1, options.points ?? 18);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uEdgeColor: { value: new THREE.Color(edgeColor) },
          uOpacity: { value: .2 },
          uPulse: { value: 0 },
        },
        vertexShader: wetStainVertexShader,
        fragmentShader: wetStainFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const stain = new THREE.Mesh(geometry, material);
      stain.position.set(position[0], position[1], position[2]);
      stain.renderOrder = options.renderOrder ?? 4;
      stain.name = options.name ?? 'irregular-procedural-stain';
      return stain;
    }

    function createWetStain(position, size, color = colors.wet, options = {}) {
      const stain = createProceduralStainMesh(position, size, color, options);
      stain.name = 'irregular-wet-stain';
      // 這些基準值同時提供給濕度視覺與壁癌範圍判定，讓畫面和讀值使用同一套空間模型。
      stain.userData.basePosition = new THREE.Vector2(position[0], position[1]);
      stain.userData.baseSize = new THREE.Vector2(size[0], size[1]);
      stain.userData.baseOpacity = options.opacity ?? .3;
      stain.userData.weight = options.weight ?? 1;
      stain.userData.seed = options.seed ?? 1;
      stain.userData.surface = 'wall';
      wetGroup.add(stain);
      wetGroup.userData.stains.push(stain);
      return stain;
    }

    function wetInfluenceAt(x, y) {
      const stains = wetGroup.userData.stains || [];
      let influence = 0;
      stains.forEach((stain) => {
        const base = stain.userData;
        const radiusX = Math.max(.001, base.baseSize.x * .5);
        const radiusY = Math.max(.001, base.baseSize.y * .5);
        const dx = (x - base.basePosition.x) / radiusX;
        const dy = (y - base.basePosition.y) / radiusY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const local = clamp(1 - distance);
        influence = Math.max(influence, local * (base.weight ?? 1));
      });
      return clamp(influence);
    }

    function ceilingWetInfluenceAt(x, z) {
      return Math.exp(-((x + 2.25) ** 2 / 1.5 + (z - .9) ** 2 / 1.2));
    }

    function updateWetVisuals() {
      if (isCellularScenario(state.scenario)) { wetGroup.visible = false; return; }
      wetGroup.visible = true;
      // 濕痕強度跟著牆體含水率、漏水率與雨勢變化；源頭修好後會隨乾燥逐步淡出。
      const humiditySignal = clamp((state.wallMoisture - .1) / .78);
      const leakSignal = clamp(state.leakRate / 1.3);
      const rainBoost = (state.scenario === 'window' || state.scenario === 'rooftop') ? state.rain * .12 : 0;
      const fieldStrength = clamp(.12 + humiditySignal * .68 + leakSignal * .25 + rainBoost, .04, 1);
      wetGroup.userData.stains?.forEach((stain, index) => {
        const localStrength = clamp(fieldStrength * (.82 + (stain.userData.weight ?? 1) * .18), 0, 1.15);
        const scale = .88 + localStrength * .16;
        stain.scale.set(scale, scale, 1);
        stain.material.uniforms.uOpacity.value = stain.userData.baseOpacity * (.32 + localStrength * .88);
        stain.material.uniforms.uPulse.value = state.time * .55 + index;
      });
      wetGroup.userData.horizontalStains?.forEach((stain) => {
        const local = ceilingWetInfluenceAt(stain.position.x, stain.position.z);
        stain.material.uniforms.uOpacity.value = stain.userData.baseOpacity * fieldStrength * local;
        stain.material.uniforms.uPulse.value = state.time * .55;
      });
    }

    function createParticles(count, color, size, group) {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({ color, size, transparent: true, opacity: .82, depthWrite: false, blending: THREE.AdditiveBlending });
      const particles = new THREE.Points(geometry, material);
      particles.userData.count = count;
      particles.userData.color = color;
      group.add(particles);
      return particles;
    }

    function createDegradation() {
      clearGroup(degradationGroup);
      const stains = wetGroup.userData.stains || [];
      degradationGroup.userData.efflo = [];
      degradationGroup.userData.mold = [];
      if (!stains.length) return;

      // 壁癌不再散落整面牆：每個白華／黴菌點都從目前情境的濕痕取樣，
      // 因此情境、濕區形狀與壁癌生成範圍會保持一致。
      const sampleWetPoint = (index, offset) => {
        const stain = stains[Math.floor(randomSeeded(index * 1.31 + offset) * stains.length) % stains.length];
        const angle = randomSeeded(index * 2.17 + offset + 9) * Math.PI * 2;
        const radius = Math.sqrt(randomSeeded(index * 3.41 + offset + 21)) * .78;
        const x = stain.userData.basePosition.x + Math.cos(angle) * stain.userData.baseSize.x * .5 * radius;
        const y = stain.userData.basePosition.y + Math.sin(angle) * stain.userData.baseSize.y * .5 * radius;
        return { x, y, z: stain.position.z + .035 + randomSeeded(index * 4.19 + offset + 33) * .012 };
      };

      const efflo = [];
      for (let i = 0; i < 52; i++) {
        const sphere = new THREE.Mesh(reusable.smallSphere, mat(colors.efflorescence, { roughness: .95, transparent: true, opacity: 0, depthWrite: false }));
        sphere.scale.set(.45 + randomSeeded(i + 33) * 1.8, .4 + randomSeeded(i + 42) * 1.4, .18);
        const point = sampleWetPoint(i, 300);
        sphere.position.set(point.x, point.y, point.z);
        sphere.name = 'efflorescence';
        sphere.renderOrder = 5;
        sphere.userData.baseScale = sphere.scale.clone();
        degradationGroup.add(sphere);
        efflo.push(sphere);
      }
      const mold = [];
      for (let i = 0; i < 48; i++) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(.16 + randomSeeded(i + 101) * .15, 7, 5), mat(colors.mold, { roughness: 1, transparent: true, opacity: 0, depthWrite: false }));
        blob.scale.z = .22;
        const point = sampleWetPoint(i, 700);
        blob.position.set(point.x, point.y, point.z + .012);
        blob.name = 'mold';
        blob.renderOrder = 6;
        blob.userData.baseScale = blob.scale.clone();
        degradationGroup.add(blob);
        mold.push(blob);
      }
      degradationGroup.userData.efflo = efflo;
      degradationGroup.userData.mold = mold;
    }

    function createScenarioVisuals() {
      clearGroup(waterGroup);
      clearGroup(wetGroup);
      wetGroup.userData.stains = [];
      wetGroup.userData.horizontalStains = [];
      clearGroup(injectionGroup);
      clearGroup(portGroup);
      clearGroup(needleGroup);
      if (isCellularScenario(state.scenario)) { updateCutawayVisual(); return; }
      const path = pathPoints();
      const pathLine = addLine(path, new THREE.LineBasicMaterial({ color: state.rainColor, transparent: true, opacity: .25 }), waterGroup, 'water-path');
      pathLine.userData.path = path;
      pathLine.userData.rainVisual = true;
      pathLine.userData.interiorOnly = true;
      const droplets = createParticles(36, state.rainColor, .09, waterGroup);
      droplets.userData.path = path;
      droplets.userData.kind = 'water';
      droplets.userData.rainVisual = true;
      droplets.userData.interiorOnly = true;

      if (state.scenario === 'window') {
        const wallWetZ = .665;
        createWetStain([1.5, 1.62, wallWetZ], [2.65, 2.25], 0x2a7088, { seed: 101, weight: 1.05, opacity: .46, edgeColor: 0x6e8d98 });
        createWetStain([2.05, 2.72, wallWetZ + .004], [1.35, 1.28], 0x245e74, { seed: 129, weight: 1.12, opacity: .5, edgeColor: 0x64848f });
        createWetStain([.66, 1.18, wallWetZ + .006], [.82, .92], 0x3d7689, { seed: 147, weight: .76, opacity: .34, edgeColor: 0x748f98, points: 15 });
        createWetStain([2.65, 1.3, wallWetZ + .008], [1.05, .72], 0x326a80, { seed: 168, weight: .82, opacity: .35, edgeColor: 0x718c96, points: 16 });
        createWetStain([1.12, 2.45, wallWetZ + .01], [.62, .5], 0x235b73, { seed: 185, weight: .88, opacity: .32, edgeColor: 0x698991, points: 14 });
      } else if (state.scenario === 'crack') {
        createWetStain([-1.25, 3.1, .665], [1.6, 3.8], colors.wet, { seed: 201, weight: 1.05, opacity: .3, edgeColor: 0x78929a });
        createWetStain([-1.3, 2.04, .67], [.78, 1.05], 0x2e657e, { seed: 218, weight: .86, opacity: .24, edgeColor: 0x78929a, points: 15 });
        // WebGL 的 Line.linewidth 通常只有 1px；細管幾何讓實際裂縫在磚紋上仍可辨識。
        const crackLine = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crackPoints()), 60, .022, 5, false), basic(colors.crack));
        crackLine.name = 'visible-crack';
        waterGroup.add(crackLine);
      } else if (state.scenario === 'pipe') {
        createWetStain([-.1, 2.45, .665], [3.4, 1.7], colors.wet, { seed: 301, weight: 1.04, opacity: .3, edgeColor: 0x78929a });
        createWetStain([1.52, 2.42, .67], [1.25, .62], 0x2e657e, { seed: 319, weight: .9, opacity: .25, edgeColor: 0x78929a, points: 16 });
        const pipeLeak = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), basic(state.rainColor, { transparent: true, opacity: .95 }));
        pipeLeak.position.set(-.48, 2.45, -.05);
        pipeLeak.name = 'pipe-leak-marker';
        pipeLeak.userData.rainVisual = true;
        waterGroup.add(pipeLeak);
      } else if (state.scenario === 'rooftop') {
        createWetStain([-2.42, 4.42, .79], [1.65, 3.1], colors.wet, { seed: 401, weight: 1.05, opacity: .3, edgeColor: 0x718b98 });
        createWetStain([-2.62, 3.12, .795], [.78, 1.12], 0x2e657e, { seed: 418, weight: .88, opacity: .24, edgeColor: 0x718b98, points: 15 });
        // 水平濕區貼在真正的天花底面／陽台地坪，和 XZ 平面的水分儀讀值使用同一影響場。
        [[-2.25, 5.985, .9, 2.6, 1.7], [-2.8, 5.981, 1.1, 1.1, .65], [-1.7, 5.98, .8, 1.3, .85], [-2.25, 6.46, .5, 3.1, 1.6]].forEach(([x, y, z, width, depth], i) => {
          const stain = createProceduralStainMesh([x, y, z], [width, depth], colors.wet, { seed: 440 + i * 17, name: 'horizontal-wet-stain' });
          stain.rotation.x = Math.PI / 2;
          stain.userData.baseOpacity = i === 3 ? .4 : .62;
          wetGroup.add(stain);
          wetGroup.userData.horizontalStains.push(stain);
        });
        const ceilingDrip = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 8), basic(state.rainColor, { transparent: true, opacity: .9 }));
        ceilingDrip.position.set(-2.55, 2.75, .84);
        ceilingDrip.name = 'ceiling-drip-marker';
        ceilingDrip.userData.rainVisual = true;
        waterGroup.add(ceilingDrip);
      } else {
        createWetStain([-2.55, 5.05, .665], [3.3, 1.35], 0x5869b5, { seed: 501, weight: .98, opacity: .25, edgeColor: 0x7a83a8 });
        createWetStain([-1.25, 4.75, .67], [1.15, .58], 0x7073bd, { seed: 518, weight: .72, opacity: .2, edgeColor: 0x8087ad, points: 15 });
        const coldSpot = new THREE.Mesh(new THREE.CircleGeometry(.8, 24), basic(0x9b9ce9, { transparent: true, opacity: .28, depthWrite: false }));
        coldSpot.position.set(-2.45, 4.95, .79);
        coldSpot.name = 'cold-spot';
        wetGroup.add(coldSpot);
      }
      updateCutawayVisual();
      updateRainColorVisuals();
    }

    function rebuildScenarioGeometry() {
      activePath = pathPoints();
      createScenarioVisuals();
      createDegradation();
      updateWetVisuals();
      updateDegradationVisuals();
      updateScenarioLabels();
      updateActionList();
      updateDiagnosis();
    }

    function updateScenarioLabels() {
      const scenario = scenarios[state.scenario];
      ui.sceneTitle.textContent = scenario.title;
      ui.sceneSubtitle.textContent = (isCellularScenario(state.scenario) ? '' : '尚未接上網格引擎 · ') + scenario.subtitle;
      ui.sourceHint.textContent = scenario.sourceHint;
      ui.sourceFixBtn.textContent = scenario.sourceButton;
      ui.crackStateField.classList.toggle('hidden', state.scenario !== 'crack');
      const badge = modeLabels[state.mode][0];
      ui.modeBadge.textContent = badge;
      ui.modeHint.textContent = state.scenario === 'crack' && state.mode === 'verify' ? '在相同雨勢與側風下觀察 120 秒模擬時間，比較修繕前後趨勢。' : modeLabels[state.mode][1];
      if (state.scenario !== 'crack' && isCellularScenario(state.scenario)) ui.modeHint.textContent = state.mode === 'verify' ? '恢復修繕前相同供水條件，觀察 120 秒。' : '量測濕區與乾區；依來源調整供水與修繕，再驗證乾燥趨勢。';
      document.getElementById('scenarioActionSection').hidden = isCellularScenario(state.scenario);
      updateScenarioFeatureVisibility();
    }

    function updateRainField() {
      if (isCellularScenario(state.scenario) && state.scenario !== 'crack') { rainGroup.visible = false; return; }
      const intensity = state.rain;
      rainGroup.visible = intensity > .01;
      const opacity = .16 + intensity * .48;
      const skyTop = 9.05;
      // 室內天花板最高 6.20；陽台鋪面最高 6.433。多留少量間隔，避免雨線碰穿表面。
      const skyBottom = state.scenario === 'rooftop' ? 6.47 : 6.24;
      rainGroup.userData.rainLines?.forEach((line) => {
        const data = line.userData;
        const cycle = skyTop - skyBottom + data.length;
        const headY = skyTop + data.length - ((state.time * data.speed + data.phase) % cycle);
        const tailY = headY - data.length;
        const clippedTop = Math.min(skyTop, headY);
        const clippedBottom = Math.max(skyBottom, tailY);
        const hasVisibleSegment = intensity > .01 && clippedTop - clippedBottom > .015;
        line.visible = hasVisibleSegment;
        const skew = .04 + state.wind * .2;
        const drift = Math.sin(state.time * 1.8 + data.phase) * data.sway + state.wind * .12;
        const attribute = line.geometry.attributes.position;
        const z = state.scenario === 'rooftop' ? data.balconyZ : data.exteriorZ;
        attribute.setXYZ(0, data.baseX + drift + skew * (skyTop - clippedTop) / data.length, clippedTop, z);
        attribute.setXYZ(1, data.baseX + drift + skew * (skyTop - clippedBottom) / data.length, clippedBottom, z);
        attribute.needsUpdate = true;
        line.frustumCulled = false;
        line.material.opacity = opacity * (.72 + (data.speed - 3.7) * .12);
      });
    }

    function updateWaterVisuals() {
      updateRainField();
      const path = activePath;
      if (isCellularScenario(state.scenario)) {
        waterGroup.children.forEach(child => { child.visible = child.name === 'visible-crack' && !state.cutaway && !simulationControls.view.debug; });
        return;
      }
      waterGroup.traverse((object) => {
        if (object.type !== 'Points' || !object.userData.path) return;
        const positions = object.geometry.attributes.position.array;
        const count = object.userData.count;
        const particlePath = object.userData.path.length > 1 ? object.userData.path : path;
        if (!particlePath || particlePath.length < 2 || !count) return;
        for (let i = 0; i < count; i++) {
          const phase = (state.time * (.36 + state.rain * .8) + i / count) % 1;
          const segmentFloat = phase * (particlePath.length - 1);
          const index = Math.min(particlePath.length - 2, Math.floor(segmentFloat));
          const t = segmentFloat - index;
          const a = particlePath[index] || particlePath[0];
          const b = particlePath[index + 1] || a;
          const jitterX = (randomSeeded(i + Math.floor(state.time * 2)) - .5) * .08;
          const jitterY = (randomSeeded(i + 90 + Math.floor(state.time * 2)) - .5) * .08;
          positions[i * 3] = lerp(a.x, b.x, t) + jitterX;
          positions[i * 3 + 1] = lerp(a.y, b.y, t) + jitterY;
          positions[i * 3 + 2] = lerp(a.z, b.z, t) + .03;
        }
        object.geometry.attributes.position.needsUpdate = true;
        object.material.opacity = .12 + state.leakRate * .48;
      });
    }

    function updateRainColorVisuals() {
      // 雨水顏色是展示參數，不改變漏水量判定；只同步到所有帶有 rainVisual 標記的水路物件。
      const color = state.rainColor;
      const applyColor = (object) => {
        if (object?.material?.color) object.material.color.set(color);
      };
      rainGroup.traverse((object) => {
        if (object.userData?.rainVisual) applyColor(object);
      });
      waterGroup.traverse((object) => {
        if (object.userData?.rainVisual) applyColor(object);
      });
      ui.rainColorValue.textContent = color.toUpperCase();
      ui.waterLegendSwatch.style.background = color;
      ui.waterLegendSwatch.style.boxShadow = `0 0 7px ${color}`;
    }

    function setRainColor(value) {
      if (!/^#[0-9a-f]{6}$/i.test(value)) return;
      state.rainColor = value.toLowerCase();
      ui.rainColorPicker.value = state.rainColor;
      updateRainColorVisuals();
    }

    function updateDegradationVisuals() {
      if (isCellularScenario(state.scenario)) { degradationGroup.visible = false; return; }
      degradationGroup.visible = true;
      // 白華與黴菌的可見範圍由同一個濕痕影響場決定，濕度下降時會同步縮小、淡出。
      const moistureSignal = clamp((state.wallMoisture - .1) / .78);
      const effOpacity = clamp((state.efflorescence - .035) * 1.32) * (.28 + moistureSignal * .72);
      const moldOpacity = clamp((state.moldRisk - .06) * 1.35) * (.24 + moistureSignal * .76);
      degradationGroup.userData.efflo?.forEach((mesh, i) => {
        const influence = wetInfluenceAt(mesh.position.x, mesh.position.y);
        const local = clamp(influence * (.25 + moistureSignal * .95));
        mesh.visible = local > .018;
        mesh.material.opacity = effOpacity * local * (.22 + randomSeeded(i + 12) * .58);
        const growth = .58 + local * .9;
        if (mesh.userData.baseScale) mesh.scale.copy(mesh.userData.baseScale).multiplyScalar(growth);
      });
      degradationGroup.userData.mold?.forEach((mesh, i) => {
        const influence = wetInfluenceAt(mesh.position.x, mesh.position.y);
        const local = clamp(influence * (.18 + moistureSignal * 1.05));
        mesh.visible = local > .025;
        mesh.material.opacity = moldOpacity * local * (.2 + randomSeeded(i + 112) * .72);
        const growth = .6 + local * .92;
        if (mesh.userData.baseScale) mesh.scale.copy(mesh.userData.baseScale).multiplyScalar(growth);
      });
    }

    function pointOnPath(path, progress) {
      if (!path.length) return new THREE.Vector3();
      if (path.length === 1) return path[0].clone();
      const safeProgress = clamp(progress, 0, .9999);
      const segmentFloat = safeProgress * (path.length - 1);
      const index = Math.min(path.length - 2, Math.floor(segmentFloat));
      const t = segmentFloat - index;
      return path[index].clone().lerp(path[index + 1], t);
    }

    function nearestPathProgress(path, point) {
      if (path.length < 2) return 0;
      let bestDistance = Infinity;
      let bestProgress = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const ab = new THREE.Vector3(b.x - a.x, b.y - a.y, 0);
        const ap = new THREE.Vector3(point.x - a.x, point.y - a.y, 0);
        const t = clamp(ap.dot(ab) / Math.max(.0001, ab.lengthSq()));
        const closest = a.clone().lerp(b, t);
        const distance = Math.hypot(closest.x - point.x, closest.y - point.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestProgress = (i + t) / (path.length - 1);
        }
      }
      return bestProgress;
    }

    function updateInjectionVisuals() {
      if (isCellularScenario(state.scenario)) return; // Actual PU field is drawn by moistureField.ts.
      // 每孔只建立一組網格；每幀修改位置、縮放與透明度，避免持續銷毀／重建 GPU 資源。
      const path = activePath;
      state.ports.forEach((port) => {
        if (!port.volume && !port.visuals) return;
        const profile = materialProfiles[port.material || state.material];
        if (!port.visuals) {
          port.visuals = new THREE.Group();
          for (let i = 0; i < 11; i++) {
            const stain = createProceduralStainMesh([0, 0, 0], [1, 1], profile.color, { seed: 1200 + port.id * 67 + i * 13, points: 16, renderOrder: 8, name: i ? 'injection-diffusion-stain' : 'injection-port-halo' });
            // 剖面內的藥液是教學透視層；只有切換剖面時顯示，不受外牆深度遮蔽。
            if (i) stain.material.depthTest = false;
            port.visuals.add(stain);
          }
          injectionGroup.add(port.visuals);
        }
        port.visuals.visible = port.volume > 0;
        const v = port.volume;
        const anchor = nearestPathProgress(path, port.point);
        port.visuals.children.forEach((stain, i) => {
          stain.visible = i === 0 || state.cutaway;
          stain.material.uniforms.uColor.value.setHex(profile.color);
          stain.material.uniforms.uOpacity.value = (i === 0 ? .3 : .76) * Math.sqrt(v);
          stain.material.uniforms.uPulse.value = state.time * .35 + i;
          const seed = port.id * 67 + i * 13;
          const radius = (.18 + v * .58 * profile.spread) * (.65 + randomSeeded(seed) * .6);
          stain.scale.set(radius * 1.4, radius, 1);
          if (i === 0) {
            stain.position.copy(port.point).addScaledVector(port.normal, .035);
            stain.quaternion.setFromUnitVectors(outward, port.normal);
            stain.scale.multiplyScalar(1.5);
          } else if (!port.hitPath || port.surface === 'ceiling') {
            // 未命中時只在孔附近積聚，不能把材料瞬間傳送到遠處的主要水路。
            const angle = i * 2.4;
            const reach = Math.sqrt(i / 10) * v * (port.hitPath ? 1.2 : .35);
            const offset = new THREE.Vector3(Math.cos(angle) * reach, Math.sin(angle) * reach, -.06);
            offset.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(outward, port.normal));
            stain.position.copy(port.point).add(offset);
            stain.quaternion.setFromUnitVectors(outward, port.normal);
          } else {
            const offset = (i % 2 ? 1 : -1) * Math.ceil(i / 2) / 5 * v * .26 * profile.spread;
            stain.position.copy(pointOnPath(path, clamp(anchor + offset)));
            stain.position.x += (randomSeeded(seed + 4) - .5) * .17;
            stain.position.z += .08;
          }
        });
      });
    }

    function updateInjectionMachineVisuals() {
      const machine = injectionMachineGroup.userData.machine;
      if (!machine) return;
      const visible = state.mode === 'inject' || state.injection.active;
      injectionMachineGroup.visible = visible;
      machine.userData.label.visible = state.labels && visible;
      machine.userData.externalModelAnchor?.children.forEach((child) => { if (child.isSprite) child.visible = state.labels; });
      const port = state.injection.targetPort;
      const profile = materialProfiles[port?.material || state.material];
      const pumping = state.injection.active && state.running && state.timeScale > 0;
      machine.userData.tankFill.material.color.setHex(profile.color);
      machine.userData.tankFill.scale.y = Math.max(.18, 1 - state.injection.total * .15);
      machine.userData.statusLight.material.color.setHex(pumping ? profile.color : 0x5fe0a1);
      machine.userData.pumpHead.position.y = .82 + (pumping ? Math.sin(state.time * 9) * .035 : 0);
      machine.userData.gaugeNeedle.rotation.z = -.45 - (state.scenario === 'crack' ? engine.state.repairs.pressure / 2 : pumping ? .5 + (port?.volume || 0) : 0);
      // 軟管只在切换目標時更新，沿用固定的 3 個頂點。
      if (machine.userData.hoseTarget !== port) {
        const start = machine.userData.nozzle.position;
        const target = port ? port.point.clone().addScaledVector(port.normal, .26).sub(machine.position) : new THREE.Vector3(.72, .24, .45);
        const mid = start.clone().lerp(target, .52); mid.y = .32;
        const attribute = machine.userData.hose.geometry.attributes.position;
        [start, mid, target].forEach((point, i) => attribute.setXYZ(i, point.x, point.y, point.z));
        attribute.needsUpdate = true;
        machine.userData.hose.geometry.computeBoundingSphere();
        machine.userData.hoseTarget = port;
      }
      machine.userData.hose.visible = visible;
    }

    function addPort(hit) {
      const physical = state.scenario === 'crack' ? drillCell(engine.state, hit.point) : null;
      if (state.scenario === 'crack' && !physical) return null;
      const id = physical?.id ?? state.nextPortId++;
      const marker = new THREE.Mesh(reusable.portCylinder, mat(colors.marker, { emissive: 0x4f0f20, emissiveIntensity: .3, roughness: .38, metalness: .2 }));
      marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hit.normal);
      marker.position.copy(hit.point).addScaledVector(hit.normal, .08);
      marker.name = `port-${id}`;
      const label = makeTextSprite(`#${id}`);
      label.scale.set(.9, .225, 1);
      label.position.set(0, .5, 0);
      marker.add(label);
      marker.userData.label = label;
      portGroup.add(marker);
      const port = { id, point: hit.point.clone(), normal: hit.normal.clone(), surface: hit.surface, marker, hitPath: isPortOnPath(hit.point, hit.surface), drilled: true, inserted: false, needle: null, volume: 0, material: null, visuals: null };
      if (physical) bridge.connectPort(port, id);
      state.ports.push(port);
      return port;
    }

    function isPortOnPath(point, surface = 'wall') {
      if (surface === 'ceiling') return state.scenario === 'rooftop' && Math.hypot(point.x + 2.25, point.z - .9) < .85;
      return distanceToWaterPath(point) < .5;
    }

    function updatePorts() {
      state.ports.forEach((port) => {
        port.marker.material.color.setHex(port.inserted ? 0x62e4f1 : state.scenario === 'crack' && !simulationControls.view.debug ? 0xf7c76a : port.hitPath ? 0xffc86e : 0xff778b);
        port.marker.material.emissive.setHex(port === state.selectedPort ? 0x547a80 : 0x172a30);
        port.marker.scale.setScalar(port === state.selectedPort ? 1.2 : 1);
        port.marker.userData.label.visible = state.labels;
        if (port.needle) port.needle.visible = port.inserted;
      });
    }

    function insertNeedle(port) {
      if (!port || port.inserted) return false;
      if (state.scenario === 'crack' && !fixNeedle(engine.state, port.id)) return false;
      const assembly = new THREE.Group();
      assembly.name = `injection-needle-${port.id}`;
      assembly.position.copy(port.point);
      assembly.quaternion.setFromUnitVectors(outward, port.normal);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(.12, .028, 8, 18), basic(0xf7c76a));
      collar.position.z = .045;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .3, 12), mat(0x9ce9f0, { roughness: .2, metalness: .72 }));
      stem.rotation.x = Math.PI / 2;
      stem.position.z = .17;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.105, .105, .12, 12), mat(0x2e5262, { roughness: .35, metalness: .34 }));
      cap.rotation.x = Math.PI / 2;
      cap.position.z = .32;
      assembly.add(collar, stem, cap);
      needleGroup.add(assembly);
      port.needle = assembly;
      port.inserted = true;
      updatePorts();
      return true;
    }

    // =========================
    // 規則判定：這裡刻意使用可解釋的本地規則，不呼叫外部 AI。
    // 每條規則都以「觀察證據 → 建議 → 風險」為核心，方便後續維護與教學。
    // =========================
    function calculateDiagnosis() {
      if (isBathroomScenario(state.scenario)) return { eyebrow: '持續供水與表面症狀分開驗證', title: engine.state.metrics.reduction > .7 ? '源頭通量已下降，觀察乾燥' : '表面重塗不能解除持續供水', text: state.scenario === 'bathroom' ? '對照樓下天花與相鄰牆腳；停止地坪用水只能暫時中斷供水。重作防水後恢復相同用水再驗證。兩種觀察位置要分別建立同表面乾濕對照。' : '停止淋浴仍可能帶壓漏水。先關供水閥，隔離舊管並改明管，再開閥驗證；只關閥不能算完成修復。', confidence: 0 };

      if (state.scenario === 'crack') {
        const measured = state.samples.control && state.samples.suspect;
        const same = measured && state.samples.control.meter === state.samples.suspect.meter;
        return { eyebrow: '以量測與修繕結果判斷', title: engine.state.metrics.reduction > .7 ? '入水已下降，繼續追蹤乾燥' : measured ? '比較濕區與乾區的變化' : '先建立同材質量測對照', text: !same && measured ? '兩個讀值使用不同儀器，請重新建立同儀器對照。' : '室內症狀可能遠離外側源頭。沿表面裂縫量測，鑽孔與灌注後比較相同降雨下的水流。白華與鼓包不會隨水分消失。', confidence: same ? .7 : .2 };
      }
      const scenario = scenarios[state.scenario];
      const hasControl = state.controlReading !== null;
      const hasSuspect = state.suspectReading !== null;
      const hasGoodPort = state.ports.some((port) => port.hitPath && port.inserted && port.volume > 0);
      const injectedMaterial = state.selectedPort?.material || state.material;
      const profile = materialProfiles[injectedMaterial];
      const comparisonIssue = hasControl && hasSuspect && (state.samples.control?.meter !== state.samples.suspect?.meter ? '儀器不同' : state.samples.control?.surface !== state.samples.suspect?.surface ? '表面材質不同' : '');
      let title = hasControl ? '已有初步對照' : '先建立基準濕度點';
      let text = hasControl ? '請在可疑區域測量，並把讀值與同材質的基準濕度點比較。' : '水分儀的單一數字不能直接證明漏水。請先在同材質、未受影響的位置建立基準濕度讀值。';
      let confidence = hasControl ? .52 : .42;
      let eyebrow = '目前觀察';

      if (hasControl && hasSuspect && !comparisonIssue) {
        const delta = state.suspectReading - state.controlReading;
        confidence += clamp(delta / .6) * .2;
        if (state.scenario === 'window') {
          eyebrow = '源頭優先';
          title = state.sourceFixed ? '排水層已修正，持續觀察濕度' : '優先檢查窗台泛水與外牆排水層';
          text = state.sourceFixed ? '現在應讓時間前進，確認雨水是否仍能進入牆內；表面濕度不會瞬間歸零。' : '可疑點與基準濕度點有差異，但窗框漏水應先處理排水與泛水路徑，再考慮表面修補。';
          confidence += .12;
        } else if (state.scenario === 'crack') {
          eyebrow = '材料適配';
          if (state.crackState === 'moving' && state.material === 'epoxy') {
            title = '活動裂縫不宜直接用環氧樹脂';
            text = '環氧樹脂偏剛性；目前模型判定裂縫仍會位移，應先釐清原因，或改用適合止水與位移的方案。';
            confidence += .16;
          } else if (state.material === 'pu') {
            title = 'PU 可作為潮濕裂縫的止水候選';
            text = '目前材料偏向止水與柔性填充，不等於結構補強。請檢查注入口是否碰到裂縫水路。';
            confidence += .13;
          } else if (state.material === 'epoxy') {
            title = '環氧適合靜止且需要黏結的裂縫';
            text = '若裂縫原因已受控且不再活動，環氧可作為黏結與封閉候選；灌注前仍需確認連通性。';
            confidence += .13;
          } else {
            title = '丙烯酸凝膠偏向細微通道的進階方案';
            text = '它可能較容易進入細小路徑，但結構補強能力不是重點，且需要更嚴格的材料與安全評估。';
            confidence += .1;
          }
        } else if (state.scenario === 'pipe') {
          eyebrow = '避免誤修';
          title = state.pipeFixed ? '管線已檢修，觀察剩餘濕氣' : '高讀值可能來自牆內管線';
          text = state.pipeFixed ? '管線源頭已處理，接下來要等牆體乾燥，再判斷是否仍有其他水路。' : '如果注入點沒有接觸裂縫或空腔，灌注只會遮住表面症狀，不能修好破裂管線。';
          confidence += .18;
        } else if (state.scenario === 'rooftop') {
          eyebrow = '樓板向下滲漏';
          title = state.rooftopFixed ? '陽台排水已修正，觀察樓板乾燥' : '先處理樓頂陽台積水與防水層';
          text = state.rooftopFixed ? '源頭排水已改善，接下來讓樓板與下層天花乾燥；若仍有水路，再檢查樓板裂縫與落水口周邊。' : '如果雨後上層陽台積水、下層天花同步升濕，應先查坡度、落水口與防水層，不能只在室內表面封膠。';
          confidence += .2;
        } else {
          eyebrow = '環境判斷';
          title = state.ventilationFixed ? '通風除濕已改善，觀察冷橋表面' : '目前更像結露而非外牆裂縫';
          text = state.ventilationFixed ? '持續降低室內濕度並觀察表面溫度；不要把結露直接當成灌注問題。' : '可疑區域若與冷表面和室內高濕度一致，應先改善通風、除濕或隔熱。';
          confidence += .17;
        }
      }

      if (state.mode === 'drill' && state.ports.length) {
        eyebrow = '注入口檢查';
        const good = state.ports.filter((port) => port.hitPath).length;
        title = good ? `已有 ${good} 個注入口接觸水路` : '目前注入口尚未接觸主要水路';
        text = good ? '先進入塞入打針模式，把針頭固定在命中水路的孔位，再進行注入；孔位多不等於一定更好。' : '請切換剖面視圖，沿裂縫或空腔重新選擇位置。錯誤孔位會造成材料停滯或外溢。';
        confidence = .65 + good * .08;
      }

      if (state.mode === 'insert') {
        eyebrow = '塞針作業';
        const drilled = state.ports.length;
        const inserted = state.ports.filter((port) => port.inserted).length;
        if (!drilled) {
          title = '先完成牆面鑽孔';
          text = '目前沒有可塞入的孔位。請先切換鑽孔模式，在牆面或天花水路建立孔位。';
          confidence = .56;
        } else if (inserted < drilled) {
          title = `已塞入 ${inserted}/${drilled} 個打針針頭`;
          text = '點擊黃色孔位完成塞針；針頭必須固定在牆面孔位，下一步才能讓注入機加壓。';
          confidence = .7;
        } else {
          title = '打針針頭已就位';
          text = '所有孔位都已完成塞針，可以切換注入模式，使用地板上的膨脹材料注入機。';
          confidence = .86;
        }
      }

      if (state.mode === 'inject' && state.injection.total > 0) {
        eyebrow = '灌注回饋';
        if (state.injection.wrong > 0 && state.scenario !== 'crack' && state.scenario !== 'rooftop') {
          title = '材料沒有修到真正的源頭';
          text = state.scenario === 'pipe' ? '牆內管線仍然漏水。請停止灌注並改走管線檢修流程。' : '窗框或結露問題不是單靠牆內灌注解決，請回到源頭修繕。';
          confidence = .88;
        } else if (state.scenario === 'rooftop' && state.injection.wrong > 0) {
          title = '室內灌注只能暫時減少局部濕痕';
          text = '樓頂陽台仍是主要水源。即使室內注入形成局部阻水，下一場雨仍可能從防水層或落水口周邊重新進入。';
          confidence = .9;
        } else if (state.crackState === 'moving' && injectedMaterial === 'epoxy') {
          title = '灌注暫時有效，但活動裂縫有復漏風險';
          text = '模型將環氧視為剛性材料；若裂縫繼續位移，填充線可能再次被拉開。';
          confidence = .91;
        } else if (hasGoodPort) {
          title = state.scenario === 'rooftop' ? '材料已進入樓板連通水路' : '材料正沿著連通裂縫填充';
          text = state.scenario === 'rooftop'
            ? `${profile.label} 的示意前緣已進入樓板／天花連通水路，但這不是取代陽台防水的永久解法。請修正上方源頭後再驗證。`
            : `${profile.label} 的示意前緣已進入牆內水路。請用驗證模式讓時間前進，確認漏水率與濕度趨勢。`;
          confidence = .86;
        }
      }

      if (state.mode === 'inspect' && comparisonIssue) {
        eyebrow = '量測條件不一致';
        title = `${comparisonIssue}，不能直接比較`;
        text = '地板維持低濕度不代表整面牆異常；請在同材質的乾燥牆面，用同一種水分儀重測基準濕度點。數值是模擬相對濕度指標，不是實測含水率。';
        confidence = .35;
      }
      return { title, text, confidence: clamp(confidence), eyebrow };
    }

    function updateDiagnosis() {
      document.querySelector('.confidence').hidden = isCellularScenario(state.scenario);
      const result = calculateDiagnosis();
      ui.diagnosisEyebrow.textContent = result.eyebrow;
      ui.diagnosisTitle.textContent = result.title;
      ui.diagnosisText.textContent = result.text;
      ui.confidenceBar.style.width = `${Math.round(result.confidence * 100)}%`;
      ui.confidenceValue.textContent = `${Math.round(result.confidence * 100)}%`;
    }

    function updateActionList() {
      const items = [];
      if (isBathroomScenario(state.scenario)) {
        items.push(['01', '建立同表面乾濕對照', '天花和牆面分別量測，切換觀察面後重建對照。']);
        items.push(['02', '比較表面整修與源頭修復', '表面重塗不會清除牆內水分，也不會關閉漏水源。']);
        items.push(['03', '恢復供水後驗證', '相同條件下確認通量下降，再持續追蹤乾燥。']);
      } else if (state.scenario === 'window') {
        items.push(['01', state.sourceFixed ? '窗台排水已修正' : '確認窗台泛水與排水層', state.sourceFixed ? '讓模擬時間前進，檢查下一場雨是否仍形成入水路。' : '把水導向室外；不要用表面密封取代排水。']);
        items.push(['02', '建立基準濕度點，再測可疑區域', '同材質對照比單一數值更可靠，還要注意鹽分和金屬干擾。']);
        items.push(['03', '不要把灌注當成窗框萬用解', '窗框開口的核心是排水與泛水細部。']);
      } else if (state.scenario === 'crack') {
        items.push(['01', state.crackState === 'moving' ? '判斷裂縫活動性' : '確認裂縫是否已受控', state.crackState === 'moving' ? '活動裂縫對剛性材料有復漏風險。' : '靜止且需要黏結的裂縫才適合討論環氧。']);
        items.push(['02', '沿裂縫建立鑽孔，再固定針頭', '鑽孔要和牆內裂縫或空腔連通；位置不對，塞針後材料也填不進去。']);
        items.push(['03', '塞針後再灌注驗證', '注入機會把材料沿連通路徑推入，之後觀察漏水率、濕度、白華和下一次環境事件。']);
      } else if (state.scenario === 'pipe') {
        items.push(['01', state.pipeFixed ? '管線源頭已修復' : '先定位與檢修管線', state.pipeFixed ? '牆體仍需乾燥，才能判斷是否有其他水路。' : '不建議用牆面灌注取代管線更換。']);
        items.push(['02', '用水分儀建立濕區範圍', '把讀值用來追蹤濕區，不把它當作自動判定。']);
        items.push(['03', '避免表面遮蔽症狀', '錯誤注入可能讓表面暫時變乾，但管線仍在漏。']);
      } else if (state.scenario === 'rooftop') {
        items.push(['01', state.rooftopFixed ? '陽台排水與防水已修正' : '先清理落水口、確認坡度', state.rooftopFixed ? '讓下一場雨進入模擬，確認樓板與下層天花的濕度趨勢。' : '雨水應往落水口排走，不應長時間積在陽台防水層上。']);
        items.push(['02', '從樓板下方建立基準濕度點與可疑點', '把上層積水、落水口位置與下層天花讀值互相對照。']);
        items.push(['03', '塞針後再作室內局部灌注', '若針頭碰到樓板水路，可以觀察局部止水；真正源頭仍要回到陽台防水與排水。']);
      } else {
        items.push(['01', state.ventilationFixed ? '持續通風除濕' : '先檢查空氣濕度與表面溫度', state.ventilationFixed ? '讓模型時間前進，觀察冷橋表面是否恢復。' : '結露通常先處理環境，不是打針問題。']);
        items.push(['02', '比較基準濕度點與冷表面', '針式或非針式讀值都要搭配材質與位置解讀。']);
        items.push(['03', '不要封住需要乾燥的表面', '過早封膜可能把水氣困在牆內。']);
      }
      ui.actionList.innerHTML = items.map(([mark, title, detail]) => `<div class="action-card"><span class="mark">${mark}</span><span><strong>${title}</strong><span>${detail}</span></span></div>`).join('');
    }

    // =========================
    // 本地模擬核心：水分、漏水、白華、黴菌與修復狀態
    // =========================
    function effectiveSourceStrength() {
      if (state.scenario === 'window') return state.sourceFixed ? .12 : (.4 + state.rain * .64 + state.wind * .18);
      if (state.scenario === 'crack') return .3 + state.rain * .52 + state.wind * .22;
      if (state.scenario === 'pipe') return state.pipeFixed ? .1 : .9;
      if (state.scenario === 'rooftop') return state.rooftopFixed ? .12 : (.24 + state.rain * .82 + state.wind * .16);
      return state.ventilationFixed ? .26 : (.32 + (state.rain * .08) + .54);
    }

    function injectionEffect() {
      if (!['crack', 'rooftop'].includes(state.scenario)) return 0;
      // 止水效果只累積「有實際注入且命中」的孔位，並沿用每孔原本的材料。
      // 改變下拉選單不能把已硬化的材料變成另一種，也不會讓未注入的孔位自動有填充效果。
      const strength = state.ports.reduce((total, port) => {
        if (!port.hitPath || !port.inserted || !port.material) return total;
        const profile = materialProfiles[port.material];
        const compatibility = state.crackState === 'moving' && port.material === 'epoxy' ? .26 : port.material === 'pu' ? .88 : port.material === 'epoxy' ? .9 : .72;
        return total + port.volume * profile.spread * compatibility;
      }, 0);
      return (1 - Math.exp(-strength * 1.8)) * (state.scenario === 'rooftop' ? .48 : 1);
    }

    function updateSimulation(dt) {
      if (!state.running || state.timeScale === 0 || document.hidden) return;
      let step = dt * state.timeScale;
      if (isCellularScenario(state.scenario)) {
        engine.state.running = state.running;
        engine.state.timeScale = state.timeScale;
        engine.state.environment.rain = state.rain;
        engine.state.environment.wind = state.wind;
        const before = engine.state.simulationTime;
        engine.update(dt);
        step = engine.state.simulationTime - before;
        syncInjectionTotals();
      } else {
        // The retained wall demos do not supply the new floor. Its local water
        // tests still run through the same fixed-step engine with wall sources off.
        engine.state.running = state.running; engine.state.timeScale = state.timeScale;
        engine.update(dt);
        state.time += step;
      const target = state.injection.targetPort;
      if (state.injection.active && target) {
        target.volume = clamp(target.volume + step * .085);
        syncInjectionTotals();
        if (target.volume >= 1) {
          stopInjection(false);
          addLog(`孔位 #${target.id} 已達示意填充上限，注入機自動停止。`, 'good');
          showToast('已達填充上限，注入自動停止，可以驗證。', 'good');
        }
      }
      const source = effectiveSourceStrength();
      const injection = injectionEffect();
      const drainRecovery = state.sourceFixed || state.pipeFixed || state.ventilationFixed || state.rooftopFixed ? .55 : 0;
      const leakTarget = clamp(source * (1 - injection * .88) + state.injection.wrong * .08, 0, 1.8);
      state.leakRate = lerp(state.leakRate, leakTarget, 1 - Math.exp(-step * .6));
      const moistureTarget = clamp(.22 + state.leakRate * .52 + source * .14 - drainRecovery * .18);
      // 指數趨近使用經過時間，避免 30fps 與 60fps 的乾燥速度不同。
      state.wallMoisture = lerp(state.wallMoisture, moistureTarget, 1 - Math.exp(-step * .1));
      const saltFactor = ['window', 'crack', 'rooftop'].includes(state.scenario) ? .95 : .52;
      const dryFactor = drainRecovery ? .34 : .02;
      state.efflorescence = clamp(state.efflorescence + step * (state.wallMoisture * saltFactor * .0048 - dryFactor * .00192));
      state.moldRisk = clamp(state.moldRisk + step * (state.wallMoisture * (state.scenario === 'condensation' ? 1.2 : .85) * .0049 - dryFactor * .00385));
      }
      const verification = state.verification;
      if (verification?.active) {
        verification.elapsed = Math.min(verification.duration, verification.elapsed + step);
        if (verification.elapsed >= verification.duration) {
          verification.active = false;
          verification.result = { leak: state.leakRate, moisture: state.wallMoisture };
          const drop = (verification.baseline.leak - state.leakRate) / Math.max(.01, verification.baseline.leak);
          addLog(`驗證完成：漏水率相對起點${drop >= 0 ? '下降' : '增加'} ${(Math.abs(drop) * 100).toFixed(1)}%。`, drop > .25 ? 'good' : 'warn');
          showToast('驗證完成，右侧可查看前後比較。', 'good');
        }
      }
    }

    function distanceToWaterPath(point) {
      const path = activePath;
      let nearest = Infinity;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSq = Math.max(.0001, dx * dx + dy * dy);
        const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq);
        const closestX = a.x + dx * t;
        const closestY = a.y + dy * t;
        nearest = Math.min(nearest, Math.hypot(point.x - closestX, point.y - closestY));
      }
      return nearest;
    }

    function meterReading(point, mode = state.meter, surface = 'wall') {
      if (surface === 'floor') {
        const local = { x: point.x, y: point.z - FLOOR_SURFACE.originZ };
        if (simulationControls.view.surface === 'slab' || !isFloorPoint(local)) return null;
        return moistureReading(engine.state, local, mode, 'floor') / 100;
      }
      if (isCellularScenario(state.scenario)) {
        if (engine.state.slab && ((surface === 'wall' && simulationControls.view.surface === 'slab') || (surface === 'ceiling' && simulationControls.view.surface !== 'slab'))) return null;
        if (surface === 'wall') return moistureReading(engine.state, point, mode) / 100;
        if (surface === 'ceiling' && engine.state.slab) return moistureReading(engine.state, { x: point.x, y: 6.65 - point.z }, mode, 'slab') / 100;
        return null;
      }
      const scenario = scenarios[state.scenario];
      const modeFactor = mode === 'pin' ? 1.05 : .92;
      if (surface === 'ceiling' || surface === 'balcony') {
        const influence = ceilingWetInfluenceAt(point.x, point.z);
        return clamp((.12 + state.wallMoisture * .24 + influence * state.leakRate * .57) * modeFactor, .03, .98);
      }

      // 牆面讀值由「牆體背景含水率」加上「距離模擬水路的遠近」組成，
      // 因此點在可疑水路附近會高，點在乾燥牆面或地板會低。
      const materialNoise = state.scenario === 'pipe' ? .12 : state.scenario === 'condensation' ? .06 : .02;
      const saltNoise = state.scenario === 'window' || state.scenario === 'crack' || state.scenario === 'rooftop' ? scenario.baseEfflorescence * .14 : .01;
      const metalNoise = state.scenario === 'pipe' && point.x > -.6 && point.x < 2.7 ? .17 : 0;
      const pathReach = state.scenario === 'condensation' ? 1.3 : state.scenario === 'rooftop' ? 1.05 : .9;
      const pathSignal = clamp(1 - distanceToWaterPath(point) / pathReach);
      // 讀值同時參考程序化濕痕的空間影響，讓「點到畫面濕區」會得到對應的高濕度。
      // 地板分支在上方已提前返回，因此地板仍維持低濕度乾燥對照。
      const stainSignal = wetInfluenceAt(point.x, point.y);
      const waterSignal = Math.max(pathSignal, stainSignal * .82);
      const backgroundHumidity = .1 + state.wallMoisture * .35;
      const pathHumidity = waterSignal * (.27 + state.leakRate * .24);
      const value = (backgroundHumidity + pathHumidity + materialNoise + saltNoise + metalNoise) * modeFactor;
      return clamp(value, .03, .98);
    }

    function updateMetrics() {
      ui.leakMetric.textContent = fmt(state.leakRate);
      ui.moistureMetric.textContent = fmtPct(state.wallMoisture);
      ui.effloMetric.textContent = fmtPct(state.efflorescence);
      ui.moldMetric.textContent = fmtPct(state.moldRisk);
      ui.leakMetric.parentElement.className = `metric ${state.leakRate > .85 ? 'accent' : state.leakRate < .28 ? 'good' : 'warning'}`;
      ui.moistureMetric.parentElement.className = `metric ${state.wallMoisture > .72 ? 'danger' : state.wallMoisture > .45 ? 'warning' : 'good'}`;
      ui.effloMetric.parentElement.className = `metric ${state.efflorescence > .6 ? 'warning' : ''}`;
      ui.moldMetric.parentElement.className = `metric ${state.moldRisk > .65 ? 'danger' : state.moldRisk < .28 ? 'good' : 'warning'}`;
      if (state.controlReading !== null) {
        ui.controlMetric.textContent = fmtPct(state.controlReading);
        const sample = state.samples.control;
        ui.controlMeta.textContent = sample ? `${surfaceNames[sample.surface]} · ${sample.meter === 'pin' ? '針式' : '非針式'} · ${Math.floor(sample.time)}s` : '固定讀值';
      } else {
        ui.controlMetric.textContent = '—';
        ui.controlMeta.textContent = '尚未建立';
      }
      if (state.suspectReading !== null) {
        ui.suspectMetric.textContent = `濕度 ${fmtPct(state.suspectReading)}`;
        const delta = state.suspectReading - (state.controlReading || 0);
        const sameSurface = state.samples.control?.surface === state.samples.suspect?.surface;
        const sameMeter = state.samples.control?.meter === state.samples.suspect?.meter;
        ui.suspectMeta.textContent = state.controlReading === null ? '尚未有基準濕度點' : !sameMeter ? '儀器不同，請重新建立對照' : `比基準點 ${delta >= 0 ? '+' : ''}${Math.round(delta * 100)} 個百分點${sameSurface ? '' : '（不同表面）'}`;
      } else {
        ui.suspectMetric.textContent = '濕度 —';
        ui.suspectMeta.textContent = '點擊場景測量';
      }
    }

    // =========================
    // 互動層：以真正的可見表面做射線測試，再以螢幕像素吸附孔位。
    // 不用大面積透明平面代替建築，避免窗外、空中或地板被誤判為可鑽牆面。
    // =========================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pickMeshes = [];
    const surfaceNames = { wall: '牆面', floor: '室內地板', ceiling: '天花板', balcony: '陽台地坪', frame: '窗框／窗台', glass: '窗玻璃', blocked: '非操作表面' };
    const outward = new THREE.Vector3(0, 0, 1);
    const gestures = { pointers: new Map(), primary: null, moved: false, multi: false, pinch: 0, hover: null };

    function indexInteractionSurfaces() {
      pickMeshes.length = 0;
      architecture.traverse((mesh) => {
        if (!mesh.isMesh) return;
        const name = mesh.name;
        mesh.userData.surface = name === 'surface-wall' ? 'wall' : (name === 'floor' || name === 'indoor-floor-surface') ? 'floor' : (name === 'ceiling' || name === 'bathroom-ceiling') ? 'ceiling'
          : name === 'balcony-waterproofing' ? 'balcony' : name === 'window-glass' ? 'glass'
          : name.startsWith('window-') ? 'frame' : 'blocked';
        pickMeshes.push(mesh);
      });
    }

    function isVisibleInScene(object) {
      for (let node = object; node; node = node.parent) if (!node.visible) return false;
      return true;
    }

    const orbit = {
      target: new THREE.Vector3(0, 3, 0),
      yaw: .2,
      pitch: .12,
      distance: 16.5,
      dragging: false,
      moved: false,
      lastX: 0,
      lastY: 0,
      startX: 0,
      startY: 0,
    };

    function updateCamera() {
      orbit.pitch = clamp(orbit.pitch, -.48, 1.35);
      orbit.yaw = clamp(orbit.yaw, -1.15, 1.15);
      orbit.distance = clamp(orbit.distance, 6, 42);
      const cp = Math.cos(orbit.pitch);
      camera.position.set(
        orbit.target.x + Math.sin(orbit.yaw) * cp * orbit.distance,
        orbit.target.y + Math.sin(orbit.pitch) * orbit.distance,
        orbit.target.z + Math.cos(orbit.yaw) * cp * orbit.distance
      );
      camera.lookAt(orbit.target);
      camera.updateMatrixWorld();
    }

    function setView(view) {
      hideToolCursor();
      if (simulationControls.view.surface === 'floor') {
        orbit.target.set(0, FLOOR_SURFACE.top, FLOOR_SURFACE.originZ + FLOOR_SURFACE.height / 2); orbit.yaw = 0; orbit.pitch = 1.12; orbit.distance = 15.5 * Math.max(1, .86 / Math.max(.25, camera.aspect)); updateCamera(); return;
      }
      if ((state.scenario === 'bathroom' || state.scenario === 'multi') && simulationControls.view.surface === 'slab') {
        orbit.target.set(0, 5.8, 3.65); orbit.yaw = 0; orbit.pitch = -.48; orbit.distance = 15 * Math.max(1, .86 / Math.max(.25, camera.aspect)); updateCamera(); return;
      }
      const roof = state.scenario === 'rooftop';
      orbit.target.set(0, roof ? 3.7 : 2.95, .4);
      orbit.yaw = view === 'front' ? 0 : view === 'top' ? .08 : .2;
      orbit.pitch = view === 'front' ? (roof ? -.08 : .025) : view === 'top' ? 1.16 : .12;
      const fitWidth = Math.max(1, .86 / Math.max(.25, camera.aspect));
      orbit.distance = (view === 'top' ? 19 : roof ? 20 : 16.5) * fitWidth;
      updateCamera();
    }

    function getIntersection(event) {
      const rect = ui.canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      scene.updateMatrixWorld(true);
      raycaster.setFromCamera(pointer, camera);
      const raw = raycaster.intersectObjects(pickMeshes.filter(isVisibleInScene), false)[0];
      let hit = null;
      if (raw) {
        const normal = raw.face.normal.clone().transformDirection(raw.object.matrixWorld);
        let surface = raw.object.userData.surface;
        if (surface === 'wall' && normal.z < .8) surface = 'blocked';
        if (surface === 'ceiling' && normal.y > -.8) surface = 'blocked';
        if (['floor', 'balcony'].includes(surface) && normal.y < .8) surface = 'blocked';
        hit = { ...raw, normal, surface, port: null };
      }
      // 吸附範圍使用固定螢幕像素；縮放後孔位仍容易點到，且只吸附未被其他表面遮住的孔位。
      if (state.mode === 'insert' || state.mode === 'inject') {
        let bestPixels = event.pointerType === 'touch' ? 32 : 22;
        state.ports.forEach((port) => {
          if (camera.position.clone().sub(port.point).dot(port.normal) <= 0) return;
          const projected = port.point.clone().addScaledVector(port.normal, .08).project(camera);
          if (projected.z < -1 || projected.z > 1) return;
          const px = rect.left + (projected.x + 1) * rect.width / 2;
          const py = rect.top + (1 - projected.y) * rect.height / 2;
          const pixels = Math.hypot(px - event.clientX, py - event.clientY);
          if (pixels > bestPixels || (raw && raw.distance < camera.position.distanceTo(port.point) - .5)) return;
          bestPixels = pixels;
          hit = { point: port.point.clone(), normal: port.normal.clone(), surface: port.surface, object: port.marker, port };
        });
      }
      return hit;
    }

    function updateToolCursorFromHit(hit) {
      state.hoverHit = hit;
      const drillTool = toolCursorGroup.userData.drill;
      const needleTool = toolCursorGroup.userData.needle;
      const toolMode = state.mode === 'drill' || state.mode === 'insert';
      const surface = hit?.surface;
      const invalidSurface = !hit || !['wall', 'ceiling'].includes(surface);
      hoverRing.visible = !!hit && surface !== 'blocked' && surface !== 'glass';
      if (hoverRing.visible) {
        hoverRing.position.copy(hit.point).addScaledVector(hit.normal, .028);
        hoverRing.quaternion.setFromUnitVectors(outward, hit.normal);
        const color = (state.mode === 'drill' || state.mode === 'paint') && invalidSurface ? 0xff778b : state.mode === 'paint' ? 0x54e0b3 : hit.port ? 0xf7c76a : 0x55d6e6;
        hoverRing.material.color.setHex(color);
        hoverRing.scale.setScalar(hit.port ? 1.5 : 1);
      }
      if (!toolMode || invalidSurface) {
        toolCursorGroup.visible = false;
        ui.canvas.classList.remove('tool-mode');
        return;
      }

      const port = hit.port;
      toolCursorGroup.position.copy(hit.point);
      toolCursorGroup.quaternion.setFromUnitVectors(outward, hit.normal);
      drillTool.visible = state.mode === 'drill';
      needleTool.visible = state.mode === 'insert';
      drillTool.userData.label.visible = state.labels && drillTool.visible;
      needleTool.userData.label.visible = state.labels && needleTool.visible;
      if (state.mode === 'insert') {
        needleTool.userData.contactRing.material.color.setHex(port ? (port.inserted ? 0x5fe0a1 : 0xf7c76a) : 0xff778b);
      }
      toolCursorGroup.visible = true;
      ui.canvas.classList.add('tool-mode');
    }

    function hideToolCursor() {
      state.hoverHit = null;
      gestures.hover = null;
      toolCursorGroup.visible = false;
      hoverRing.visible = false;
      ui.hoverReadout.hidden = true;
      ui.canvas.classList.remove('tool-mode');
    }

    function showHover(event) {
      const hit = getIntersection(event);
      updateToolCursorFromHit(hit);
      if (!hit) { ui.hoverReadout.hidden = true; return; }
      const label = surfaceNames[hit.surface];
      let message = label;
      if (engine.state.tools.floorTestArmed) message += hit.surface === 'floor' ? '\n點擊開始 5 秒地板淋水測試' : '\n請在室內地板表面選位';
      else if (hit.surface === 'glass' || hit.surface === 'blocked') message += ' · 請選牆面、地板或天花';
      else if (state.mode === 'inspect') {
        const reading = meterReading(hit.point, state.meter, hit.surface);
        message += reading === null ? ' · 尚未建立此表面模型' : ` · 濕度 ${fmtPct(reading)} · ${moistureStatus(reading * 100)}\n點擊記錄${state.sampleTarget === 'control' ? '基準濕度點' : '可疑點'}`;
        if (simulationControls.view.thermal && reading !== null && isCellularScenario(state.scenario)) {
          const domain = hit.surface === 'floor' ? 'floor' : hit.surface === 'ceiling' ? 'slab' : 'wall';
          const point = { x: hit.point.x, y: domain === 'floor' ? hit.point.z - FLOOR_SURFACE.originZ : domain === 'slab' ? 6.65 - hit.point.z : hit.point.y };
          const temperature = surfaceTemperatureC(engine.state, point, domain);
          if (temperature !== null) message += `\n熱像估算 ${temperature.toFixed(1)}°C`;
        }
        if ((isCellularScenario(state.scenario) || hit.surface === 'floor') && reading !== null) {
          const domain = hit.surface === 'floor' ? 'floor' : hit.surface === 'ceiling' ? 'slab' : 'wall';
          engine.state.tools.probeDomain = domain;
          engine.state.tools.probe = { x: hit.point.x, y: domain === 'floor' ? hit.point.z - FLOOR_SURFACE.originZ : domain === 'slab' ? 6.65 - hit.point.z : hit.point.y };
        }
      }
      else if (state.mode === 'paint') message += ['wall', 'ceiling', 'floor'].includes(hit.surface) ? '\n按住左鍵拖曳自由塗刷防水' : '\n此表面不可塗刷';
      else if (state.mode === 'drill') message += ['wall', 'ceiling'].includes(hit.surface) ? '\n點擊鑽孔' : '\n這個表面不建立注入口';
      else if (hit.port) message += ` · 孔位 #${hit.port.id}\n${hit.port.inserted ? '已塞針' : '已鑽孔'} · 填充 ${fmtPct(hit.port.volume)}`;
      else if (state.mode !== 'verify') message += '\n靠近已有孔位以吸附';
      ui.hoverReadout.textContent = message;
      ui.hoverReadout.style.whiteSpace = 'pre-line';
      const rect = ui.viewport.getBoundingClientRect();
      ui.hoverReadout.style.left = `${clamp(event.clientX - rect.left + 16, 8, Math.max(8, rect.width - 230))}px`;
      ui.hoverReadout.style.top = `${clamp(event.clientY - rect.top + 16, 145, Math.max(145, rect.height - 230))}px`;
      ui.hoverReadout.hidden = false;
    }

    function remember(label, undo, snapshot = isCellularScenario(state.scenario) ? engine.checkpoint() : null) {
      state.history.push({ label, undo: () => { undo(); if (snapshot) engine.restore(snapshot); }, baseline: state.repairBaseline });
      if (state.history.length > 40) state.history.shift();
    }

    function undoLastAction() {
      if (state.verification?.active) return;
      stopInjection(false);
      const action = state.history.pop();
      if (!action) return;
      action.undo();
      state.repairBaseline = action.baseline;
      state.verification = null;
      syncInjectionTotals();
      updatePorts();
      updateMeasurementMarkers();
      if (!canEnterMode(state.mode)) setMode(state.ports.length ? 'insert' : 'drill');
      refreshUI();
      showToast(`已撤銷：${action.label}`);
    }

    function captureRepairBaseline(force = false) {
      if (force || !state.repairBaseline) state.repairBaseline = { leak: state.leakRate, moisture: state.wallMoisture, rain: state.rain, wind: state.wind, supply: bathroomSupplyKey(engine.state), origin: '修繕前' };
      state.verification = null;
    }

    function recordSample(hit) {
      if ((isCellularScenario(state.scenario) || hit.surface === 'floor') && meterReading(hit.point, state.meter, hit.surface) === null) { showToast('此表面尚未建立含水模型。', 'warn'); return; }
      if (hit.surface === 'blocked' || hit.surface === 'glass') {
        showToast('請在牆面、地板、天花板或陽台地坪量測。', 'warn'); return;
      }
      const target = state.sampleTarget;
      const previous = state.samples[target];
      remember(target === 'control' ? '基準濕度點量測' : '可疑點量測', () => {
        state.samples[target] = previous;
        state.sampleTarget = target;
        syncSamples();
      }, null);
      const sample = { point: hit.point.clone(), normal: hit.normal.clone(), surface: hit.surface, meter: state.meter, reading: meterReading(hit.point, state.meter, hit.surface), time: state.time };
      state.samples[target] = sample;
      if (target === 'control') state.sampleTarget = 'suspect';
      syncSamples();
      updateMeasurementMarkers();
      addLog(`${target === 'control' ? '基準濕度點' : '可疑點'}：${surfaceNames[hit.surface]} 濕度 ${fmtPct(sample.reading)}`);
      showToast(target === 'control' ? '基準濕度點已記錄，接著點擊可疑濕區。' : `可疑點濕度 ${fmtPct(sample.reading)}，已固定讀值。`, 'good');
    }

    function syncSamples() {
      state.controlReading = state.samples.control?.reading ?? null;
      state.suspectReading = state.samples.suspect?.reading ?? null;
      state.lastReadingPoint = state.samples.suspect?.point ?? null;
    }

    function updateMeasurementMarkers() {
      clearGroup(measurementGroup);
      for (const [key, sample] of Object.entries(state.samples)) {
        if (!sample) continue;
        if (simulationControls.view.surface === 'slab' && sample.surface !== 'ceiling') continue;
        if (isCellularScenario(state.scenario) && simulationControls.view.surface !== 'slab' && sample.surface === 'ceiling') continue;
        const marker = new THREE.Mesh(reusable.targetRing, basic(key === 'control' ? 0x5fe0a1 : 0xf7c76a, { side: THREE.DoubleSide, depthWrite: false }));
        marker.position.copy(sample.point).addScaledVector(sample.normal, .03);
        marker.quaternion.setFromUnitVectors(outward, sample.normal);
        const label = makeTextSprite(`${key === 'control' ? '控制' : '可疑'} ${fmtPct(sample.reading)}`);
        label.position.copy(marker.position).addScaledVector(sample.normal, .08);
        label.position.y += .3;
        label.scale.set(1.1, .275, 1);
        measurementGroup.add(marker, label);
      }
    }

    function paintDomainPoint(hit) {
      if (hit.surface === 'wall') return { domain: 'wall', point: { x: hit.point.x, y: hit.point.y } };
      if (hit.surface === 'ceiling') return { domain: 'slab', point: { x: hit.point.x, y: 6.65 - hit.point.z } };
      if (hit.surface === 'floor') return { domain: 'floor', point: { x: hit.point.x, y: hit.point.z - FLOOR_SURFACE.originZ } };
      return null;
    }

    function applyBrushAtHit(hit, stroke) {
      if (!hit || !isCellularScenario(state.scenario)) return false;
      const target = paintDomainPoint(hit);
      if (!target) { showToast('自由塗刷只能施作在室內牆面、地板或可見樓板表面。', 'warn'); return false; }
      const key = target.domain;
      if (!stroke.paintedByDomain.has(key)) stroke.paintedByDomain.set(key, new Set());
      const painted = stroke.paintedByDomain.get(key);
      const previous = stroke.lastByDomain.get(key);
      const distance = previous ? Math.hypot(target.point.x - previous.x, target.point.y - previous.y) : 0;
      const steps = Math.max(1, Math.ceil(distance / .24));
      for (let step = 1; step <= steps; step++) {
        const point = previous ? { x: lerp(previous.x, target.point.x, step / steps), y: lerp(previous.y, target.point.y, step / steps) } : target.point;
        const result = brushWaterproof(engine.state, target.domain, point, painted);
        stroke.count += result.changed;
      }
      stroke.lastByDomain.set(key, target.point);
      if (stroke.count > 0) captureRepairBaseline();
      return true;
    }

    function commitBrushStroke() {
      if (!activeBrushStroke) return;
      if (activeBrushStroke.count > 0) {
        remember('自由塗刷防水', () => {}, activeBrushStroke.snapshot);
        addLog(`自由塗刷防水：更新 ${activeBrushStroke.count} 個表層網格；不會封堵持續中的管線或負水壓水源。`, 'good');
        showToast(`已塗刷 ${activeBrushStroke.count} 個表層網格；內部濕氣保留，持續供水仍須修源。`, 'good');
        refreshUI();
      }
      activeBrushStroke = null;
      ui.canvas.classList.remove('painting');
    }

    function operateAtHit(hit) {
      if (!hit) return;
      if (state.mode === 'paint') {
        activeBrushStroke = { snapshot: engine.checkpoint(), paintedByDomain: new Map(), lastByDomain: new Map(), count: 0 };
        applyBrushAtHit(hit, activeBrushStroke);
        commitBrushStroke();
        return;
      }
      if (engine.state.tools.floorTestArmed) {
        if (state.verification?.active) return;
        if (hit.surface !== 'floor' || simulationControls.view.surface === 'slab') { showToast('請在室內地板表面選位。', 'warn'); return; }
        const snapshot = engine.checkpoint();
        const result = startFloorWaterTest(engine.state, { x: hit.point.x, y: hit.point.z - FLOOR_SURFACE.originZ });
        if (result.ok) { remember('地板定點淋水', () => {}, snapshot); addLog(result.message, 'good'); }
        showToast(result.message, result.ok ? 'good' : 'warn'); refreshUI(); return;
      }
      if (state.mode === 'inspect') recordSample(hit);
      else if (state.mode === 'drill') {
        if (state.scenario === 'crack' && (hit.surface !== 'wall' || !state.running)) { showToast('請繼續模擬後在牆面鑽孔。', 'warn'); return; }
        if (!['wall', 'ceiling'].includes(hit.surface)) {
          showToast('這裡無法建立注入口，請點擊牆面或天花板。', 'warn'); return;
        }
        if (state.ports.some((port) => port.point.distanceTo(hit.point) < .3)) {
          showToast('這裡已有孔位，請選擇另一個位置。', 'warn'); return;
        }
        if (state.ports.length >= 16) { showToast('本次最多建立 16 個孔位，可撤銷再調整。', 'warn'); return; }
        const checkpoint = state.scenario === 'crack' ? engine.checkpoint() : null;
        const port = addPort(hit);
        if (!port) return;
        remember(`孔位 #${port.id} 鑽孔`, () => {
          state.ports = state.ports.filter((item) => item !== port);
          disposeObject(port.marker);
          if (port.needle) disposeObject(port.needle);
          if (port.visuals) disposeObject(port.visuals);
          state.selectedPort = state.ports[state.ports.length - 1] || null;
          if (state.injection.targetPort === port) state.injection.targetPort = null;
        }, checkpoint);
        state.selectedPort = port;
        updatePorts();
        if (state.scenario === 'crack') {
          addLog(`孔位 #${port.id} 鑽進中，完成後可固定針頭。`);
          showToast('鑽孔中（2 秒模擬時間），孔位是否有效需灌注後驗證。');
          refreshUI(); return;
        }
        addLog(`孔位 #${port.id}：${port.hitPath ? '已連通模擬水路' : '未接觸主要水路'}`, port.hitPath ? 'good' : 'warn');
        showToast(port.hitPath ? '已接觸水路，下一步請塞入針頭。' : '孔位偏離水路，可撤銷並用剖面重新定位。', port.hitPath ? 'good' : 'warn');
      } else if (state.mode === 'insert') {
        if (!hit.port) { showToast('請靠近並點擊孔位，或從右側清單選擇。', 'warn'); return; }
        selectPort(hit.port);
        insertSelectedPort();
      } else if (state.mode === 'inject') {
        if (!hit.port) { showToast('請點擊已塞入針頭的孔位。', 'warn'); return; }
        selectPort(hit.port);
        beginInjection(hit.port);
      } else startVerification();
      refreshUI();
    }

    function selectPort(port) {
      if (state.injection.active && state.injection.targetPort !== port) stopInjection(false);
      state.selectedPort = port;
      updatePorts();
    }

    function insertSelectedPort() {
      const port = state.selectedPort;
      if (!port) { showToast('先選擇一個已鑽孔位。', 'warn'); return; }
      if (port.inserted) { showToast('這個孔位已塞入針頭。'); return; }
      if (!port.drilled) { showToast('鑽孔尚未完成，請讓模擬繼續。', 'warn'); return; }
      remember(`孔位 #${port.id} 塞針`, () => {
        if (port.needle) disposeObject(port.needle);
        port.needle = null;
        port.inserted = false;
      });
      insertNeedle(port);
      addLog(`孔位 #${port.id} 針頭已固定。`, 'good');
      showToast('針頭已固定，接著切換注入模式。', 'good');
    }

    function beginInjection(port) {
      if (state.scenario === 'crack' && state.material === 'epoxy' && state.crackState === 'moving') { showToast('Epoxy 僅示範用於已確認穩定、乾燥且接通的裂縫；活動裂縫請重新診斷。', 'warn'); return; }
      if (!port?.inserted) { showToast('這個孔位尚未塞入針頭。', 'warn'); return; }
      if (state.injection.active && state.injection.targetPort === port) { stopInjection(); return; }
      if (port.volume >= 1) { showToast('這個孔位已達示意填充上限，請進行驗證。'); return; }
      if (port.material && port.material !== state.material) {
        showToast('同一孔位保留已注入材料；請選回原材料或改用新孔位。', 'warn'); return;
      }
      stopInjection(false);
      const checkpoint = engine.checkpoint();
      if (state.scenario === 'crack' && !startInjection(engine.state, port.id, state.material)) {
        showToast(state.material === 'epoxy' ? '此孔未接通裂縫、含水過高或水壓偏高；Epoxy 需要乾燥、低壓且穩定的已連通裂縫。' : state.material === 'acrylate' ? '此孔未接通水路或含水不足；凝膠需進入潮濕的細微通道。' : '目前孔位條件不符合此材料的示範範圍。', 'warn');
        return;
      }
      const oldVolume = port.volume;
      const oldMaterial = port.material;
      remember(`孔位 #${port.id} 本次注入`, () => { port.volume = oldVolume; port.material = oldMaterial; }, checkpoint);
      captureRepairBaseline();
      state.selectedPort = port;
      state.injection.targetPort = port;
      state.injection.active = true;
      setRunning(true);
      addLog(`孔位 #${port.id} 開始注入 ${materialProfiles[port.material].label}。`, port.hitPath ? 'good' : 'warn');
      refreshUI();
    }

    function stopInjection(notify = true) {
      const wasActive = state.injection.active;
      state.injection.active = false;
      if (wasActive && notify) {
        const port = state.injection.targetPort;
        addLog(`孔位 #${port.id} 已停止注入，填充 ${fmtPct(port.volume)}。`);
        showToast('注入已停止，已注入的材料會保留。');
      }
      updateInjectionMachineVisuals();
    }

    function syncInjectionTotals() {
      state.injection.total = state.ports.reduce((sum, port) => sum + port.volume, 0);
      state.injection.wrong = clamp(state.ports.filter((port) => !port.hitPath || !['crack', 'rooftop'].includes(state.scenario)).reduce((sum, port) => sum + port.volume, 0));
      state.injection.overflow = clamp(state.injection.wrong - .65);
    }

    function startVerification() {
      if (state.verification?.active) return;
      if (engine.state.floorTests.some(test => test.remainingSeconds > 0)) { showToast('請等待地板淋水測試結束，再比較來源修繕結果。', 'warn'); return; }
      stopInjection(false);
      if (isCellularScenario(state.scenario) && state.scenario !== 'crack') {
        if (engine.state.repairs.job || !bathroomSupplyActive(engine.state)) { showToast('請完成施工並恢復用水／供水壓力（與修繕前相同），再驗證持續供水下的結果。', 'warn'); return; }
        if (state.repairBaseline && state.repairBaseline.supply !== bathroomSupplyKey(engine.state)) { showToast('請恢復修繕前相同的用水與供水壓力，才能比較修復成效。', 'warn'); return; }
      }
      const baseline = state.repairBaseline || { leak: state.leakRate, moisture: state.wallMoisture, rain: state.rain, wind: state.wind, origin: '本次觀察起點' };
      state.verification = { active: true, elapsed: 0, duration: isCellularScenario(state.scenario) ? 120 : 20, baseline, result: null, rain: state.rain, wind: state.wind };
      setRunning(true);
      addLog(`開始驗證：固定${isCellularScenario(state.scenario) && state.scenario !== 'crack' ? '用水／供水／地下水壓力' : '雨勢與側風'}，觀察 ${state.verification.duration} 秒模擬時間。`);
      refreshUI();
    }

    // =========================
    // 音效：使用 Web Audio API 程序生成，不載入任何音訊檔
    // =========================
    const audio = {
      context: null,
      master: null,
      timer: null,
      enabled: false,
    };

    function ensureAudio() {
      if (!audio.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return false;
        audio.context = new AudioContext();
        audio.master = audio.context.createGain();
        audio.master.gain.value = .055;
        audio.master.connect(audio.context.destination);
      }
      if (audio.context.state === 'suspended') audio.context.resume();
      return true;
    }

    function playDrip() {
      if (!audio.enabled || !state.running || document.hidden || !ensureAudio()) return;
      const ctx = audio.context;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580 + state.leakRate * 280, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + .16);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.4, now + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .18);
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start(now);
      osc.stop(now + .2);
    }

    function scheduleDrips() {
      clearTimeout(audio.timer);
      if (!audio.enabled) return;
      audio.timer = setTimeout(() => { playDrip(); scheduleDrips(); }, Math.max(320, 1100 - state.leakRate * 520));
    }

    function toggleAudio() {
      audio.enabled = !audio.enabled;
      if (audio.enabled) {
        if (!ensureAudio()) {
          audio.enabled = false;
          showToast('此瀏覽器不支援 Web Audio，仍可使用其他功能。', 'warn');
          return;
        }
        scheduleDrips();
        ui.soundBtn.textContent = '🔊 關閉滴水音';
        addLog('已開啟程序生成滴水音：聲音只作為狀態回饋。');
      } else {
        clearTimeout(audio.timer);
        ui.soundBtn.textContent = '🔇 開啟滴水音';
      }
    }

    // =========================
    // UI 綁定
    // =========================
    let nextAction = null;
    let portListSignature = '';
    const modeButtons = $$('#modeButtons button');
    const modeOrder = ['inspect', 'drill', 'insert', 'inject', 'verify', 'paint'];

    function canEnterMode(mode) {
      if (mode === 'paint') return isCellularScenario(state.scenario);
      if (isBathroomScenario(state.scenario)) return ['inspect', 'verify'].includes(mode);
      if (isCellularScenario(state.scenario) && state.scenario !== 'crack') return ['inspect', 'verify', 'paint'].includes(mode);
      return mode === 'insert' ? state.ports.length > 0 : mode === 'inject' ? state.ports.some((port) => port.inserted) : modeOrder.includes(mode);
    }

    function setRunning(running) {
      state.running = running;
      engine.state.running = running;
      if (running && state.timeScale === 0) state.timeScale = 1;
      engine.state.timeScale = state.timeScale;
      ui.timeSlider.value = String(state.timeScale);
      ui.timeValue.textContent = `${state.timeScale}×`;
      ui.playPauseBtn.textContent = running ? '⏸ 暫停模擬' : '▶ 繼續模擬';
      ui.playPauseBtn.setAttribute('aria-pressed', String(!running));
    }

    function renderWorkflow() {
      const inserted = state.ports.filter((port) => port.inserted).length;
      const filled = state.ports.filter((port) => port.volume > 0).length;
      const samples = Number(!!state.samples.control) + Number(!!state.samples.suspect);
      ui.workflowSummary.textContent = `量測 ${samples}/2 · 孔位 ${state.ports.length} · 塞針 ${inserted} · 注入 ${filled}`;
      const coated = [engine.state.wall, engine.state.slab, engine.state.floor].some(grid => grid?.cells.some(cell => cell.surfaceCoating > .02));
      const completed = { inspect: samples === 2, drill: state.ports.length > 0, insert: inserted > 0, inject: filled > 0 && !state.injection.active, verify: !!state.verification?.result, paint: coated };
      modeButtons.forEach((button) => {
        const mode = button.dataset.mode;
        button.classList.toggle('active', mode === state.mode);
        button.classList.toggle('done', completed[mode]);
        button.setAttribute('aria-pressed', String(mode === state.mode));
        button.disabled = !canEnterMode(mode);
      });
      ui.undoBtn.disabled = state.history.length === 0 || !!state.verification?.active;
      ui.controlSampleBtn.setAttribute('aria-pressed', String(state.sampleTarget === 'control'));
      ui.suspectSampleBtn.setAttribute('aria-pressed', String(state.sampleTarget === 'suspect'));
      ui.materialSelect.disabled = state.injection.active;
      const testing = !!state.verification?.active;
      [ui.rainSlider, ui.windSlider, ui.sourceFixBtn].forEach((element) => { element.disabled = testing; });
      $$('#crackStateButtons button').forEach((button) => { button.disabled = testing; });
      const port = state.selectedPort;
      const uninserted = state.ports.find((item) => !item.inserted);
      let title = '', detail = '', label = '', progress = null;
      nextAction = null;
      if (state.mode === 'inspect') {
        title = samples < 2 ? (state.sampleTarget === 'control' ? '01 · 建立基準濕度點' : '01 · 量測可疑濕區') : '01 · 量測已記錄';
        detail = '移動預覽濕度 · 點擊固定讀值 · 拖曳旋轉 · 滾輪／雙指縮放';
        label = samples < 2 ? '點擊場景量測' : state.scenario === 'crack' ? '前往鑽孔' : isCellularScenario(state.scenario) ? '查看供水與源頭修繕' : '修繕源頭';
        if (samples === 2) nextAction = state.scenario === 'crack' ? () => setMode('drill')
          : isCellularScenario(state.scenario) ? () => document.getElementById(isBathroomScenario(state.scenario) ? 'bathroomPanel' : 'diagnosticScenarioPanel').scrollIntoView({ block: 'center', behavior: 'smooth' })
            : () => { sourceRepair(); setMode('verify'); };
      } else if (state.mode === 'drill') {
        title = `02 · 已建立 ${state.ports.length} 個孔位`;
        detail = state.scenario === 'crack' ? '鑽孔需 2 秒模擬時間；正常模式不透露內部連通性。可開啟 DEBUG 檢查。' : '黃色：接觸水路 · 紅色：偏離水路 · 可用剖面與撤銷調整';
        label = '前往塞針';
        if (state.ports.length) nextAction = () => setMode('insert');
      } else if (state.mode === 'insert') {
        const target = port && !port.inserted ? port : uninserted;
        title = `03 · 已固定 ${inserted}/${state.ports.length} 支針頭`;
        detail = '點擊場景孔位，或選擇右側清單後固定針頭。';
        label = target ? `固定 #${target.id} 針頭` : '前往注入';
        nextAction = target ? () => { selectPort(target); insertSelectedPort(); refreshUI(); } : () => setMode('inject');
      } else if (state.mode === 'inject') {
        title = port ? `04 · 孔位 #${port.id} · 填充 ${fmtPct(port.volume)}` : '04 · 選擇已塞針孔位';
        detail = state.injection.active ? (state.running ? '正在連續注入；再點孔位或按 Esc 可停止。' : '模擬已暫停，材料不會繼續增加。') : port?.material ? `此孔使用 ${materialProfiles[port.material].label}；繼續注入須選擇相同材料，達 100% 自動停止。` : '每孔保存自己的材料與填充量，達 100% 自動停止。';
        progress = port?.volume ?? 0;
        label = state.injection.active ? '注入中' : !port ? '請選擇孔位' : !port.inserted ? '先固定針頭' : port.volume >= 1 ? '前往驗證' : `開始注入 #${port.id}`;
        if (!state.injection.active && port) nextAction = !port.inserted ? () => setMode('insert') : port.volume >= 1 ? () => setMode('verify') : () => beginInjection(port);
      } else if (state.mode === 'paint') {
        title = '表面防水塗刷';
        detail = '按住左鍵在可施工牆面、樓板或室內地板拖曳；每格塗層會依實際表面位置減少入水。塗刷不會封堵暗管或地下水來源。';
        label = '返回檢測';
        nextAction = () => setMode('inspect');
      } else {
        const verification = state.verification;
        title = testing ? `05 · 驗證 ${Math.floor(verification.elapsed)} / ${verification.duration} 秒` : verification?.result ? '05 · 驗證完成' : '05 · 觀察修繕後的變化';
        detail = `測試期間固定${isCellularScenario(state.scenario) && state.scenario !== 'crack' ? '目前供水／地下水壓力' : '雨勢與側風'}；${isCellularScenario(state.scenario) ? 120 : 20} 秒模擬時間後保留前後數值。`;
        progress = verification ? verification.elapsed / verification.duration : 0;
        label = testing ? (state.running ? '觀察中' : '已暫停') : verification?.result ? '重新驗證' : `開始 ${isCellularScenario(state.scenario) ? 120 : 20} 秒驗證`;
        if (!testing) nextAction = startVerification;
      }
      if (state.scenario !== 'crack' && isCellularScenario(state.scenario) && state.mode === 'inspect') {
        label = '查看供水與源頭修繕'; nextAction = () => document.getElementById(isBathroomScenario(state.scenario) ? 'bathroomPanel' : 'diagnosticScenarioPanel').scrollIntoView({ block: 'center', behavior: 'smooth' });
        detail += ' · 完成量測後，使用左側情境控制。';
      }
      ui.operationTitle.textContent = title;
      ui.operationDetail.textContent = detail;
      ui.nextStepBtn.textContent = label;
      ui.nextStepBtn.disabled = !nextAction;
      ui.stopInjectionBtn.hidden = !state.injection.active;
      ui.operationProgress.hidden = progress === null;
      ui.operationProgress.value = progress ?? 0;
      ui.portCount.textContent = `${state.ports.length} 個孔位`;
      ui.portHint.hidden = state.ports.length > 0;
      const signature = state.ports.map((item) => `${item.id}:${item.drilled}:${item.inserted}:${item.material}:${Math.round(item.volume * 100)}:${item === port}:${simulationControls.view.debug}`).join('|');
      if (signature !== portListSignature) {
        portListSignature = signature;
        // 保留原本按鈕的焦點；只有增刪孔位時才增刪 DOM 節點。
        const ids = new Set(state.ports.map((item) => String(item.id)));
        [...ui.portList.children].forEach((button) => { if (!ids.has(button.dataset.portId)) button.remove(); });
        state.ports.forEach((item) => {
          let button = ui.portList.querySelector(`[data-port-id="${item.id}"]`);
          if (!button) { button = document.createElement('button'); button.type = 'button'; button.className = 'btn port-row'; button.dataset.portId = String(item.id); ui.portList.append(button); }
          button.textContent = `#${item.id} ${state.scenario === 'crack' && !simulationControls.view.debug ? (item.drilled ? '待驗證' : '鑽孔中') : item.hitPath ? '連通' : '偏離'} · ${item.inserted ? '已塞針' : '待塞針'} · ${fmtPct(item.volume)}${item.material ? ' · ' + materialProfiles[item.material].label : ''}`;
          button.setAttribute('aria-pressed', String(item === port));
        });
      }
      ui.crackStateField.hidden = state.scenario !== 'crack';
      [...ui.materialSelect.options].forEach(option => { option.disabled = false; option.textContent = option.textContent.replace(' · TODO', ''); });
      if (state.scenario === 'crack') {
        if (state.mode === 'insert' && port && !port.drilled) { ui.nextStepBtn.disabled = true; ui.operationDetail.textContent = '鑽孔中，請讓時間前進至完成。'; }
      }
      renderVerification();
    }

    function renderVerification() {
      const verification = state.verification;
      ui.verificationSection.hidden = !verification;
      if (!verification) return;
      if (verification.active) {
        const message = '正在相同供水條件下觀察，完成後會保留比較結果。';
        if (ui.verificationResult.textContent !== message) ui.verificationResult.textContent = message;
        return;
      }
      const result = verification.result;
      if (!result) { ui.verificationResult.textContent = '本次驗證已中止，可重新開始。'; return; }
      const baseline = verification.baseline;
      const drop = (baseline.leak - result.leak) / Math.max(.01, baseline.leak);
      const moistureDelta = (result.moisture - baseline.moisture) * 100;
      const trend = drop > .25 ? '漏水已有改善，牆體仍需乾燥。' : '漏水改善有限，請重新檢查源頭或孔位。';
      const message = `${baseline.origin} → 觀察結束\n漏水率 ${fmt(baseline.leak)} → ${fmt(result.leak)}（${drop >= 0 ? '下降' : '增加'} ${(Math.abs(drop) * 100).toFixed(1)}%）\n牆體濕度 ${fmtPct(baseline.moisture)} → ${fmtPct(result.moisture)}（${moistureDelta >= 0 ? '+' : ''}${Math.round(moistureDelta)} 個百分點）\n${trend}`;
      if (ui.verificationResult.textContent !== message) ui.verificationResult.textContent = message;
    }

    function refreshUI() {
      simulationControls.update(isCellularScenario(state.scenario) || simulationControls.view.surface === 'floor', state.cutaway, isCellularScenario(state.scenario));
      floorControls.update(!!state.verification?.active, isCellularScenario(state.scenario));
      floorSurface?.update(simulationControls.view.surface !== 'slab', state.cutaway && simulationControls.view.surface === 'floor');
      bathroomControls.update(isBathroomScenario(state.scenario), !!state.verification?.active);
      if (bathroomScene?.update(engine.state, isCellularScenario(state.scenario), simulationControls.view.surface, state.cutaway || simulationControls.view.debug)) indexInteractionSurfaces();
      diagnosticControls.update(['drain', 'multi', 'basement'].includes(state.scenario), !!state.verification?.active);
      const migratedNonCrack = isCellularScenario(state.scenario) && state.scenario !== 'crack';
      for (const id of ['rainSlider', 'rainColorPicker', 'windSlider']) $( `#${id}` ).closest('.field').hidden = migratedNonCrack;
      ui.portList.closest('.section').hidden = migratedNonCrack;
      ui.materialSelect.closest('.field').hidden = migratedNonCrack;
      updatePorts();
      updateMetrics();
      updateDiagnosis();
      renderWorkflow();
      updateInjectionMachineVisuals();
    }

    let toastTimer = null;
    function showToast(message, type = '') {
      clearTimeout(toastTimer);
      ui.toast.textContent = message;
      ui.toast.className = `toast show ${type}`;
      toastTimer = setTimeout(() => { ui.toast.className = 'toast'; }, 2600);
    }

    function addLog(message, type = '') {
      const time = `${Math.floor(state.time).toString().padStart(2, '0')}s`;
      state.log.unshift({ message, type, time });
      state.log = state.log.slice(0, 16);
      ui.eventLog.innerHTML = state.log.map((entry) => `<div class="log-entry ${entry.type}"><time>模擬 ${entry.time}</time>${entry.message}</div>`).join('');
    }

    function setScenario(key, force = false) {
      if (!scenarios[key]) return;
      if (key === state.scenario && !force) return;
      stopInjection(false);
      cancelGestures();
      state.scenario = key;
      engine.reset(isCellularScenario(key) ? key : 'crack');
      engine.state.environment.rain = state.rain;
      engine.state.environment.wind = state.wind;
      if (!isCellularScenario(key)) { for (const source of engine.state.waterSources) source.enabled = false; engine.state.floorJunctions = []; }
      simulationControls.reset();
      if (key === 'crack') { state.material = 'pu'; ui.materialSelect.value = 'pu'; }
      state.time = 0;
      state.controlReading = null;
      state.suspectReading = null;
      state.lastReadingPoint = null;
      state.samples = { control: null, suspect: null };
      state.sampleTarget = 'control';
      state.history = [];
      state.selectedPort = null;
      state.nextPortId = 1;
      state.repairBaseline = null;
      state.verification = null;
      clearGroup(measurementGroup);
      state.ports = [];
      state.injection = { active: false, total: 0, wrong: 0, overflow: 0, targetPort: null };
      bridge.connectInjection();
      state.hoverHit = null;
      state.wallMoisture = scenarios[key].baseMoisture;
      state.efflorescence = scenarios[key].baseEfflorescence;
      state.moldRisk = scenarios[key].baseMold;
      state.leakRate = .86;
      state.sourceFixed = false;
      state.pipeFixed = false;
      state.ventilationFixed = false;
      state.rooftopFixed = false;
      state.crackState = 'static';
      state.cutaway = false;
      state.timeScale = 1;
      setRunning(true);
      state.log = [];
      ui.eventLog.innerHTML = '';
      state.mode = 'inspect';
      $$('.scenario-card').forEach((card) => {
        const active = card.dataset.scenario === key;
        card.classList.toggle('active', active);
        card.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      $$('#modeButtons button').forEach((button) => button.classList.toggle('active', button.dataset.mode === 'inspect'));
      $$('#crackStateButtons button').forEach((button) => button.classList.toggle('active', button.dataset.crack === 'static'));
      setView('home');
      ui.sectionBtn.textContent = '◈ 剖面視圖';
      updateScenarioLabels();
      rebuildScenarioGeometry();
      hideToolCursor();
      updateInjectionMachineVisuals();
      refreshUI();
      addLog(`切換情境：${scenarios[key].title}`);
      showToast(`已載入「${scenarios[key].title}」情境。`, 'good');
    }

    function setMode(mode) {
      if (!canEnterMode(mode)) { showToast(mode === 'insert' ? '請先鑽孔，再進行塞針。' : '請先固定至少一支針頭。', 'warn'); return; }
      if (state.mode === mode) return;
      stopInjection(false);
      cancelGestures();
      if (state.verification?.active) { state.verification.active = false; addLog('工具已切換，本次驗證中止。'); }
      state.mode = mode;
      if (mode !== 'inspect') engine.state.tools.floorTestArmed = false;
      if (!state.selectedPort) state.selectedPort = state.ports[0] || null;
      $$('#modeButtons button').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
      updateScenarioLabels();
      updateInjectionMachineVisuals();
      updateToolCursorFromHit(state.hoverHit);
      updatePorts();
      refreshUI();
      showToast(modeLabels[mode][1], '');
    }

    function sourceRepair() {
      if (state.verification?.active) return;
      const property = { window: 'sourceFixed', pipe: 'pipeFixed', condensation: 'ventilationFixed', rooftop: 'rooftopFixed' }[state.scenario];
      if (property && state[property]) { showToast('源頭已處理，請進行驗證。'); return; }
      if (property) {
        remember('源頭修繕', () => { state[property] = false; updateActionList(); });
        captureRepairBaseline();
      }
      if (state.scenario === 'window') {
        state.sourceFixed = true;
        addLog('完成窗台排水層修正：水被導向室外，仍需等待牆體乾燥。', 'good');
        showToast('排水路徑已修正，現在用驗證模式觀察下一場雨。', 'good');
      } else if (state.scenario === 'pipe') {
        state.pipeFixed = true;
        addLog('完成管線源頭檢修：停止新的管內入水。', 'good');
        showToast('管線源頭已處理，牆體還需要時間乾燥。', 'good');
      } else if (state.scenario === 'condensation') {
        state.ventilationFixed = true;
        addLog('完成通風除濕：降低結露條件，繼續觀察冷橋表面。', 'good');
        showToast('通風除濕已開啟，先不要進行灌注。', 'good');
      } else if (state.scenario === 'rooftop') {
        state.rooftopFixed = true;
        addLog('完成陽台源頭修繕：清理落水口、恢復排水與防水層。', 'good');
        showToast('陽台排水與防水源頭已修正，請用驗證模式觀察樓板乾燥。', 'good');
      } else {
        addLog('裂縫原因檢查：目前仍需用活動性與結構狀態判斷材料。', 'warn');
        showToast('先判斷裂縫原因與是否活動，再選材料。', 'warn');
      }
      updateActionList();
      refreshUI();
    }

    function resetState() {
      setScenario(state.scenario, true);
      state.running = true;
      state.timeScale = 1;
      ui.timeSlider.value = '1';
      ui.timeValue.textContent = '1×';
      ui.playPauseBtn.textContent = '⏸ 暫停模擬';
      addLog('情境已重置。');
    }

    $$('.scenario-card').forEach((card) => card.addEventListener('click', () => setScenario(card.dataset.scenario)));
    $$('#modeButtons button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
    $$('#crackStateButtons button').forEach((button) => button.addEventListener('click', () => {
      state.crackState = button.dataset.crack;
      state.repairBaseline = null;
      state.verification = null;
      $$('#crackStateButtons button').forEach((item) => item.classList.toggle('active', item === button));
      addLog(`裂縫狀態切換為：${state.crackState === 'moving' ? '活動' : '靜止'}`, state.crackState === 'moving' ? 'warn' : '');
      updateDiagnosis();
    }));
    ui.rainSlider.addEventListener('input', () => { state.rain = Number(ui.rainSlider.value) / 100; ui.rainValue.textContent = `${ui.rainSlider.value}%`; state.repairBaseline = null; state.verification = null; updateRainField(); refreshUI(); });
    ui.rainColorPicker.addEventListener('input', () => setRainColor(ui.rainColorPicker.value));
    ui.rainColorPicker.addEventListener('change', () => {
      setRainColor(ui.rainColorPicker.value);
      addLog(`雨水顏色切換為：${state.rainColor.toUpperCase()}`);
      showToast(`雨水顏色已套用：${state.rainColor.toUpperCase()}`, 'good');
    });
    ui.rainColorResetBtn.addEventListener('click', () => {
      setRainColor(defaultRainColor);
      addLog(`雨水顏色還原預設：${defaultRainColor.toUpperCase()}`);
      showToast(`雨水顏色已還原為預設：${defaultRainColor.toUpperCase()}`, 'good');
    });
    ui.windSlider.addEventListener('input', () => { state.wind = Number(ui.windSlider.value) / 100; ui.windValue.textContent = `${ui.windSlider.value}%`; state.repairBaseline = null; state.verification = null; refreshUI(); });
    ui.timeSlider.addEventListener('input', () => { state.timeScale = Number(ui.timeSlider.value); setRunning(state.timeScale > 0); refreshUI(); });
    ui.playPauseBtn.addEventListener('click', () => { setRunning(!state.running); refreshUI(); });
    ui.resetBtn.addEventListener('click', resetState);
    ui.meterSelect.addEventListener('change', () => { state.meter = ui.meterSelect.value; addLog(`水分儀切換：${state.meter === 'pin' ? '針式' : '非針式'}；已記錄數據保留原儀器標記。`); refreshUI(); });
    ui.materialSelect.addEventListener('change', () => { state.material = ui.materialSelect.value; addLog(`新注入材料：${materialProfiles[state.material].label}；已注入孔位的材料保留。`); refreshUI(); });
    ui.sourceFixBtn.addEventListener('click', sourceRepair);
    function chooseSample(target) { state.sampleTarget = target; setMode('inspect'); refreshUI(); }
    function toggleCutaway() { state.cutaway = !state.cutaway; hideToolCursor(); updateCutawayVisual(); }
    ui.measureBtn.addEventListener('click', () => chooseSample('control'));
    ui.controlSampleBtn.addEventListener('click', () => chooseSample('control'));
    ui.suspectSampleBtn.addEventListener('click', () => chooseSample('suspect'));
    ui.sectionBtn.addEventListener('click', toggleCutaway);
    ui.cutawayBtn.addEventListener('click', toggleCutaway);
    ui.soundBtn.addEventListener('click', toggleAudio);
    ui.labelsBtn.addEventListener('click', () => { state.labels = !state.labels; labelGroup.visible = state.labels; ui.labelsBtn.textContent = state.labels ? '🏷 隱藏標籤' : '🏷 顯示標籤'; ui.labelsBtn.setAttribute('aria-pressed', String(state.labels)); updatePorts(); updateInjectionMachineVisuals(); updateToolCursorFromHit(state.hoverHit); });
    ui.frontViewBtn.addEventListener('click', () => setView('front'));
    ui.homeViewBtn.addEventListener('click', () => setView('home'));
    ui.topViewBtn.addEventListener('click', () => setView('top'));
    ui.undoBtn.addEventListener('click', undoLastAction);
    ui.nextStepBtn.addEventListener('click', () => { if (nextAction) nextAction(); });
    ui.stopInjectionBtn.addEventListener('click', () => { stopInjection(); refreshUI(); });
    ui.portList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-port-id]');
      const port = state.ports.find((item) => item.id === Number(button?.dataset.portId));
      if (!port) return;
      selectPort(port);
      if (state.mode !== 'insert' && state.mode !== 'inject') setMode(port.inserted ? 'inject' : 'insert');
      refreshUI();
    });

    function cancelGestures() {
      commitBrushStroke();
      const captured = [...gestures.pointers.keys()];
      gestures.pointers.clear();
      gestures.primary = null;
      gestures.moved = false;
      gestures.multi = false;
      gestures.pinch = 0;
      orbit.dragging = false;
      captured.forEach((id) => { if (ui.canvas.hasPointerCapture(id)) ui.canvas.releasePointerCapture(id); });
      ui.canvas.classList.remove('dragging');
      ui.canvas.classList.remove('painting');
      hideToolCursor();
    }

    ui.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    ui.canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.button !== 2) return;
      hideToolCursor();
      gestures.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (gestures.pointers.size === 1) {
        gestures.primary = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, button: event.button };
        gestures.moved = false;
        gestures.multi = false;
        if (state.mode === 'paint' && event.button === 0) activeBrushStroke = { snapshot: engine.checkpoint(), paintedByDomain: new Map(), lastByDomain: new Map(), count: 0 };
      } else {
        gestures.multi = true;
        gestures.moved = true;
        const [a, b] = [...gestures.pointers.values()];
        gestures.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
      ui.canvas.setPointerCapture(event.pointerId);
    });
    ui.canvas.addEventListener('pointermove', (event) => {
      if (!gestures.pointers.has(event.pointerId)) {
        gestures.hover = { clientX: event.clientX, clientY: event.clientY, pointerType: event.pointerType };
        return;
      }
      gestures.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (gestures.pointers.size >= 2) {
        const [a, b] = [...gestures.pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (gestures.pinch > 0 && distance > 0) orbit.distance *= gestures.pinch / distance;
        gestures.pinch = distance;
        updateCamera();
        return;
      }
      const p = gestures.primary;
      if (!p || p.id !== event.pointerId || gestures.multi) return;
      const threshold = event.pointerType === 'touch' ? 10 : 6;
      // 超過門檻才開始旋轉；點擊抖動不改視角，拖曳放開不觸發鑽孔。
      if (!gestures.moved && Math.hypot(event.clientX - p.x, event.clientY - p.y) < threshold) return;
      if (state.mode === 'paint' && p.button === 0 && activeBrushStroke) {
        gestures.moved = true;
        ui.canvas.classList.add('painting');
        const hit = getIntersection(event);
        updateToolCursorFromHit(hit);
        applyBrushAtHit(hit, activeBrushStroke);
        return;
      }
      gestures.moved = true;
      orbit.dragging = true;
      ui.canvas.classList.add('dragging');
      const dx = event.clientX - p.lastX;
      const dy = event.clientY - p.lastY;
      if (p.button === 2 || event.shiftKey) {
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        orbit.target.addScaledVector(right, -dx * orbit.distance * .0014);
        orbit.target.y = clamp(orbit.target.y + dy * orbit.distance * .0014, .5, 7);
        orbit.target.x = clamp(orbit.target.x, -4, 4);
      } else {
        orbit.yaw -= dx * .006;
        orbit.pitch += dy * .005;
      }
      p.lastX = event.clientX;
      p.lastY = event.clientY;
      updateCamera();
    });
    ui.canvas.addEventListener('pointerup', (event) => {
      if (!gestures.pointers.has(event.pointerId)) return;
      const wasMoved = gestures.moved;
      const shouldOperate = !wasMoved && !gestures.multi && gestures.primary?.id === event.pointerId && event.button === 0;
      const hit = shouldOperate ? getIntersection(event) : null;
      gestures.pointers.delete(event.pointerId);
      if (ui.canvas.hasPointerCapture(event.pointerId)) ui.canvas.releasePointerCapture(event.pointerId);
      if (!gestures.pointers.size) {
        gestures.primary = null;
        gestures.multi = false;
        gestures.moved = false;
        orbit.dragging = false;
        ui.canvas.classList.remove('dragging');
      }
      if (activeBrushStroke) {
        if (shouldOperate) applyBrushAtHit(hit, activeBrushStroke);
        commitBrushStroke();
      } else if (shouldOperate) operateAtHit(hit);
      if (event.pointerType !== 'touch') gestures.hover = { clientX: event.clientX, clientY: event.clientY, pointerType: event.pointerType };
    });
    ui.canvas.addEventListener('pointercancel', cancelGestures);
    ui.canvas.addEventListener('lostpointercapture', (event) => {
      if (gestures.pointers.has(event.pointerId)) cancelGestures();
    });
    ui.canvas.addEventListener('pointerleave', () => { if (!gestures.pointers.size) hideToolCursor(); });
    ui.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? ui.canvas.clientHeight : 1);
      orbit.distance *= Math.exp(clamp(delta * .0012, -.25, .25));
      hideToolCursor();
      updateCamera();
    }, { passive: false });
    window.addEventListener('blur', cancelGestures);
    document.addEventListener('visibilitychange', () => {
      cancelGestures();
      // 回到背景分頁時停止送藥，避免沒有看到畫面卻累積注入。
      if (document.hidden) stopInjection(false);
      lastTime = performance.now();
      refreshUI();
    });
    document.addEventListener('keydown', (event) => {
      if (event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
      if (event.key === 'Escape') { stopInjection(); cancelGestures(); refreshUI(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undoLastAction(); return; }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (/^[1-6]$/.test(event.key)) { event.preventDefault(); setMode(modeOrder[Number(event.key) - 1]); }
      if (event.key === ' ' && !event.target.closest('button')) { event.preventDefault(); setRunning(!state.running); refreshUI(); }
      if (event.key.toLowerCase() === 'c') toggleCutaway();
      if (event.key.toLowerCase() === 'r') setView('home');
    });

    // =========================
    // 初始化與動畫迴圈
    // =========================
    createScene();
    const fieldAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    fieldRenderer = createMoistureField(world, 'wall', fieldAnisotropy);
    ceilingFieldRenderer = createMoistureField(world, 'slab', fieldAnisotropy);
    floorFieldRenderer = createMoistureField(world, 'floor', fieldAnisotropy);
    document.getElementById('loadAssetsBtn').addEventListener('click', (event) => { event.currentTarget.disabled = true; loadExternalAssets(); });
    updateCamera();
    refreshUI();
    setScenario('crack', true);
    addLog('從 8% 乾牆開始。使用 20× 觀察雨水進入後，量測濕區與乾區。');
    addLog('提示：拖曳旋轉場景，滾輪縮放，點擊牆面執行目前工具。');

    if (import.meta.env.DEV && new URLSearchParams(location.search).has('test')) {
      window.__simTest = {
        snapshot: () => engine.checkpoint(),
        project: (x, y, surface = 'wall') => { const p = (surface === 'floor' ? new THREE.Vector3(x, FLOOR_SURFACE.top, FLOOR_SURFACE.originZ + y) : surface === 'ceiling' ? new THREE.Vector3(x, 5.99, 6.65 - y) : new THREE.Vector3(x, y, .65)).project(camera); const r = ui.canvas.getBoundingClientRect(); return { x: r.left + (p.x + 1) * r.width / 2, y: r.top + (1 - p.y) * r.height / 2 }; },
      };
    }
    let lastTime = performance.now();
    function animate(now) {
      const dt = Math.min(.1, (now - lastTime) / 1000);
      lastTime = now;
      if (document.hidden) { requestAnimationFrame(animate); return; }
      updateSimulation(dt);
      updateWaterVisuals();
      updateInjectionMachineVisuals();
      updateInjectionVisuals();
      visualElapsed += dt;
      uiElapsed += dt;
      if (visualElapsed >= .05) { updateWetVisuals(); updateDegradationVisuals(); fieldRenderer.draw(engine.state, simulationControls.view, isCellularScenario(state.scenario)); ceilingFieldRenderer.draw(engine.state, simulationControls.view, isCellularScenario(state.scenario)); floorFieldRenderer.draw(engine.state, simulationControls.view, true); visualElapsed = 0; }
      // 數據與介面 5Hz、濕痕 20Hz、鏡頭與雨滴逐幀更新，操作不依賴 DOM 重建。
      if (uiElapsed >= .2) { refreshUI(); if (gestures.hover) showHover(gestures.hover); uiElapsed = 0; }
      else if (gestures.hover && gestures.hover !== gestures.lastHover) showHover(gestures.hover);
      gestures.lastHover = gestures.hover;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    function resize() {
      const width = ui.viewport.clientWidth;
      const height = ui.viewport.clientHeight;
      if (!width || !height) return;
      const oldFit = Math.max(1, .86 / Math.max(.25, camera.aspect));
      camera.aspect = width / height;
      const newFit = Math.max(1, .86 / Math.max(.25, camera.aspect));
      // 改變視窗寬高時保留使用者縮放比例，同時讓窄螢幕不裁掉半面牆。
      orbit.distance *= newFit / oldFit;
      camera.updateProjectionMatrix();
      updateCamera();
      renderer.setSize(width, height, false);
    }
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(ui.viewport);
    resize();
  })();
  
