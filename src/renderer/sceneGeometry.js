// Existing Three.js geometry and Canvas fallback assets retained from the prototype.
import { translate } from '../ui/i18n';
export function createSceneGeometry(context) {
  const { state, reusable, colors, mat, basic, randomSeeded, materialProfiles, architecture, toolCursorGroup, injectionMachineGroup, rainGroup, labelGroup } = context;
    function createFallbackSurfaceMaps(kind) {
      // Canvas 備援材質：即使沒有網路，室內仍是細緻粉光面，剖面夾層仍看得到砌磚。
      const size = 512;
      const diffuseCanvas = document.createElement('canvas');
      const bumpCanvas = document.createElement('canvas');
      diffuseCanvas.width = diffuseCanvas.height = bumpCanvas.width = bumpCanvas.height = size;
      const diffuse = diffuseCanvas.getContext('2d');
      const bump = bumpCanvas.getContext('2d');
      let seed = kind === 'brick' ? 38197 : 27109;
      const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

      if (kind === 'brick') {
        diffuse.fillStyle = '#b9b1a6';
        bump.fillStyle = '#626262';
        diffuse.fillRect(0, 0, size, size);
        bump.fillRect(0, 0, size, size);
        const brickW = 128;
        const brickH = 58;
        const joint = 6;
        for (let row = -1; row < size / (brickH + joint) + 1; row++) {
          const y = row * (brickH + joint);
          const offset = row % 2 ? -brickW / 2 : 0;
          for (let col = -1; col < size / brickW + 2; col++) {
            const x = col * brickW + offset;
            const variation = Math.floor(rand() * 25) - 12;
            const red = 157 + variation;
            const green = 79 + Math.round(variation * .72);
            const blue = 58 + Math.round(variation * .58);
            const shade = `rgb(${red},${green},${blue})`;
            const brickGradient = diffuse.createLinearGradient(x, y, x, y + brickH);
            brickGradient.addColorStop(0, `rgb(${Math.min(255, red + 12)},${Math.min(255, green + 10)},${Math.min(255, blue + 9)})`);
            brickGradient.addColorStop(.16, shade);
            brickGradient.addColorStop(1, `rgb(${Math.max(0, red - 10)},${Math.max(0, green - 8)},${Math.max(0, blue - 6)})`);
            diffuse.fillStyle = brickGradient;
            diffuse.fillRect(x + joint / 2, y + joint / 2, brickW - joint, brickH - joint);
            bump.fillStyle = 'rgb(174,174,174)';
            bump.fillRect(x + joint / 2, y + joint / 2, brickW - joint, brickH - joint);
            for (let fleck = 0; fleck < 18; fleck++) {
              const px = x + joint + rand() * (brickW - joint * 2);
              const py = y + joint + rand() * (brickH - joint * 2);
              diffuse.fillStyle = rand() > .5 ? 'rgba(245,205,169,.12)' : 'rgba(54,37,31,.1)';
              diffuse.fillRect(px, py, 1 + rand() * 5, 1 + rand() * 2);
              const bumpTone = Math.floor(145 + rand() * 55);
              bump.fillStyle = `rgb(${bumpTone},${bumpTone},${bumpTone})`;
              bump.fillRect(px, py, 2 + rand() * 4, 1 + rand() * 2);
            }
          }
        }
      } else {
        const colorPixels = diffuse.createImageData(size, size);
        const heightPixels = bump.createImageData(size, size);
        for (let i = 0; i < colorPixels.data.length; i += 4) {
          const grain = Math.floor(rand() * 13) - 6;
          colorPixels.data[i] = 202 + grain;
          colorPixels.data[i + 1] = 200 + grain;
          colorPixels.data[i + 2] = 192 + grain;
          colorPixels.data[i + 3] = 255;
          const relief = 150 + Math.floor(rand() * 9) - 4;
          heightPixels.data[i] = heightPixels.data[i + 1] = heightPixels.data[i + 2] = relief;
          heightPixels.data[i + 3] = 255;
        }
        diffuse.putImageData(colorPixels, 0, 0);
        bump.putImageData(heightPixels, 0, 0);
        for (let mark = 0; mark < 150; mark++) {
          const x = rand() * size;
          const y = rand() * size;
          const length = 12 + rand() * 118;
          const offset = (rand() - .5) * 9;
          const light = rand() > .52;
          diffuse.strokeStyle = light ? 'rgba(250,248,239,.12)' : 'rgba(105,104,99,.08)';
          diffuse.lineWidth = .5 + rand() * 2;
          diffuse.beginPath();
          diffuse.moveTo(x, y);
          diffuse.quadraticCurveTo(x + length * .48, y + offset, x + length, y + offset * .3);
          diffuse.stroke();
          bump.strokeStyle = light ? 'rgba(210,210,210,.12)' : 'rgba(95,95,95,.1)';
          bump.lineWidth = diffuse.lineWidth;
          bump.beginPath();
          bump.moveTo(x, y);
          bump.quadraticCurveTo(x + length * .48, y + offset, x + length, y + offset * .3);
          bump.stroke();
        }
      }

      const createTexture = (canvas, isColor) => {
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 5.7);
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if (isColor && THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
        texture.needsUpdate = true;
        return texture;
      };
      return { map: createTexture(diffuseCanvas, true), bumpMap: createTexture(bumpCanvas, false) };
    }

    function addBox(group, size, position, material, options = {}) {
      const geometry = options.geometry || reusable.unitBox;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(size[0], size[1], size[2]);
      mesh.position.set(position[0], position[1], position[2]);
      if (options.rotation) mesh.rotation.set(options.rotation[0], options.rotation[1], options.rotation[2]);
      if (options.name) mesh.name = options.name;
      mesh.castShadow = options.castShadow !== false;
      mesh.receiveShadow = options.receiveShadow !== false;
      group.add(mesh);
      return mesh;
    }

    function addLine(points, material, group = architecture, name = '') {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      line.name = name;
      group.add(line);
      return line;
    }

    function paintTextLabel(canvas, text, color, background) {
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = background;
      if (context.roundRect) context.roundRect(7, 15, 498, 92, 18);
      else context.fillRect(7, 15, 498, 92);
      context.fill();
      context.strokeStyle = 'rgba(139, 218, 239, .45)';
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = color;
      context.font = `700 ${text.length <= 4 ? 86 : text.length <= 10 ? 48 : 30}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 256, 62);
    }

    function makeTextSprite(text, color = '#dcefff', background = 'rgba(5,18,30,.84)') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      paintTextLabel(canvas, translate(text), color, background);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
      sprite.scale.set(2.2, .55, 1);
      sprite.userData.canvas = canvas;
      sprite.userData.texture = texture;
      sprite.userData.sourceText = text;
      sprite.userData.labelColor = color;
      sprite.userData.labelBackground = background;
      return sprite;
    }

    function refreshTextSprites() {
      const visited = new Set();
      [architecture, toolCursorGroup, injectionMachineGroup, labelGroup].forEach(group => group?.traverse(object => {
        if (!object.isSprite || !object.userData?.canvas || visited.has(object)) return;
        visited.add(object);
        paintTextLabel(object.userData.canvas, translate(object.userData.sourceText || ''), object.userData.labelColor, object.userData.labelBackground);
        if (object.userData.texture) object.userData.texture.needsUpdate = true;
      }));
    }

    function buildToolCursor() {
      // 外部電鑽成功時取代程序鑽機外殼；鑽頭、接觸圈和游標標籤仍保留為互動提示。
      const drill = new THREE.Group();
      drill.name = 'drill-cursor-tool';
      const proceduralBody = new THREE.Group();
      proceduralBody.name = 'procedural-drill-fallback';
      drill.add(proceduralBody);
      addBox(proceduralBody, [.64, .36, .62], [.08, .12, .68], mat(0x314b5c, { roughness: .42, metalness: .48 }), { name: 'drill-body' });
      addBox(proceduralBody, [.18, .42, .3], [-.12, -.2, .68], mat(0x1a2d3b, { roughness: .52, metalness: .36 }), { name: 'drill-grip' });
      addBox(proceduralBody, [.3, .24, .28], [.29, .02, .49], mat(0x63d9e7, { roughness: .28, metalness: .35 }), { name: 'drill-battery' });
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .48, 16), mat(0x547487, { roughness: .34, metalness: .62 }));
      motor.rotation.x = Math.PI / 2;
      motor.position.set(.08, .18, .58);
      motor.name = 'drill-motor';
      proceduralBody.add(motor);
      const chuck = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .17, 12), mat(0xb0c6d0, { roughness: .25, metalness: .82 }));
      chuck.rotation.x = Math.PI / 2;
      chuck.position.set(.08, .12, .28);
      chuck.name = 'drill-chuck';
      proceduralBody.add(chuck);
      const bit = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .46, 10), basic(0xd8edf4));
      bit.rotation.x = Math.PI / 2;
      bit.position.set(.08, .12, .04);
      bit.name = 'drill-bit';
      drill.add(bit);
      const contactRing = new THREE.Mesh(new THREE.RingGeometry(.14, .19, 20), basic(0x55d6e6, { transparent: true, opacity: .72, side: THREE.DoubleSide }));
      contactRing.position.set(.08, .12, .015);
      contactRing.name = 'drill-contact-ring';
      drill.add(contactRing);
      const drillLabel = makeTextSprite('鑽孔機', '#dffaff', 'rgba(6,28,40,.9)');
      drillLabel.scale.set(1.35, .34, 1);
      drillLabel.position.set(.08, 1, .48);
      drill.add(drillLabel);
      const externalDrillAnchor = new THREE.Group();
      externalDrillAnchor.name = 'external-drill-model-anchor';
      externalDrillAnchor.visible = false;
      drill.add(externalDrillAnchor);
      drill.userData.proceduralBody = proceduralBody;
      drill.userData.externalModelAnchor = externalDrillAnchor;
      drill.userData.label = drillLabel;
      drill.userData.contactRing = contactRing;
      toolCursorGroup.add(drill);

      const needleTool = new THREE.Group();
      needleTool.name = 'needle-cursor-tool';
      const cartridge = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .56, 16), mat(0x607d8b, { roughness: .3, metalness: .42, transparent: true, opacity: .92 }));
      cartridge.rotation.x = Math.PI / 2;
      cartridge.position.set(0, .08, .54);
      cartridge.name = 'needle-cartridge';
      needleTool.add(cartridge);
      addBox(needleTool, [.2, .34, .28], [0, -.22, .58], mat(0x263c49, { roughness: .4, metalness: .35 }), { name: 'needle-handle' });
      const needle = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .42, 8), basic(0xc9f8ff));
      needle.rotation.x = Math.PI / 2;
      needle.position.set(0, .08, .15);
      needle.name = 'needle-tip';
      needleTool.add(needle);
      const needleRing = new THREE.Mesh(new THREE.RingGeometry(.12, .17, 20), basic(0xf7c76a, { transparent: true, opacity: .72, side: THREE.DoubleSide }));
      needleRing.position.set(0, .08, .015);
      needleTool.add(needleRing);
      const needleLabel = makeTextSprite('打針針頭', '#fff1c7', 'rgba(46,31,5,.9)');
      needleLabel.scale.set(1.55, .39, 1);
      needleLabel.position.set(0, .62, .7);
      needleTool.add(needleLabel);
      needleTool.userData.label = needleLabel;
      needleTool.userData.contactRing = needleRing;
      toolCursorGroup.add(needleTool);

      toolCursorGroup.userData.drill = drill;
      toolCursorGroup.userData.needle = needleTool;
      toolCursorGroup.visible = false;
    }

    function buildInjectionMachine() {
      // 自製專用低面數 3D 教學模型：參考便攜式單液 PU 裂縫灌注泵的料斗、驅動馬達、泵頭、壓力表與高壓管配置。
      // 不載入來源不明的下載模型，也不宣稱本模型對應任何品牌或設備額定值。
      const machine = new THREE.Group();
      machine.name = 'expanding-material-injection-machine';
      machine.position.set(3.15, 0, 1.65);
      const frameMaterial = mat(0x536873, { roughness: .38, metalness: .72 });
      const darkMetal = mat(0x1b2a31, { roughness: .4, metalness: .52 });
      const brightMetal = mat(0xb8c9ce, { roughness: .24, metalness: .82 });
      const safetyYellow = mat(0xeab94f, { roughness: .42, metalness: .18 });
      const pumpRed = mat(0xc74e40, { roughness: .43, metalness: .2 });
      const rubber = mat(0x182128, { roughness: .82, metalness: .04 });

      const addRodBetween = (name, start, end, radius, material, sides = 10) => {
        const from = new THREE.Vector3(...start);
        const to = new THREE.Vector3(...end);
        const direction = to.clone().sub(from);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius * .92, radius, direction.length(), sides), material);
        rod.position.copy(from.add(to).multiplyScalar(.5));
        rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        rod.name = name;
        rod.castShadow = true;
        rod.receiveShadow = true;
        machine.add(rod);
        return rod;
      };

      // 四支金屬支腳與托盤，讓機器讀起來是可搬運的工地設備，不是浮在地上的箱子。
      addBox(machine, [1.08, .12, .64], [0, .6, 0], frameMaterial, { name: 'pump-platform' });
      [-.47, .47].forEach((x) => [-.25, .25].forEach((z) => {
        addBox(machine, [.17, .07, .15], [x, .045, z], rubber, { name: 'machine-foot' });
        addRodBetween('machine-frame-leg', [x * 1.04, .08, z * 1.03], [x * .87, .59, z * .86], .035, frameMaterial);
      }));
      [-.25, .25].forEach((z) => addRodBetween('machine-frame-rail', [-.48, .35, z], [.48, .35, z], .025, frameMaterial));
      [-.47, .47].forEach((x) => addRodBetween('machine-frame-crossbar', [x, .4, -.25], [x, .4, .25], .024, frameMaterial));
      addBox(machine, [.72, .07, .52], [-.03, .69, 0], mat(0x283a43, { roughness: .58, metalness: .42 }), { name: 'pump-drip-tray' });

      // 電動驅動馬達與泵頭分成獨立組件，灌注時只做細微振動回饋。
      const pumpHead = new THREE.Group();
      pumpHead.name = 'pump-head';
      pumpHead.position.set(.04, .82, -.015);
      machine.add(pumpHead);
      addBox(pumpHead, [.48, .37, .43], [.16, 0, 0], mat(0x344952, { roughness: .36, metalness: .56 }), { name: 'pressure-pump-housing' });
      addBox(pumpHead, [.18, .32, .35], [.34, -.03, .02], brightMetal, { name: 'pump-fluid-section' });
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(.09, .105, .34, 14), brightMetal);
      piston.position.set(.35, .24, 0);
      piston.name = 'pump-plunger-cylinder';
      pumpHead.add(piston);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .48, 18), darkMetal);
      motor.rotation.z = Math.PI / 2;
      motor.position.set(-.31, .02, -.01);
      motor.name = 'electric-drive-motor';
      pumpHead.add(motor);
      const motorEnd = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .07, 16), pumpRed);
      motorEnd.rotation.z = Math.PI / 2;
      motorEnd.position.set(-.57, .02, -.01);
      motorEnd.name = 'motor-end-cap';
      pumpHead.add(motorEnd);
      for (let i = 0; i < 5; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(.166, .012, 6, 16), frameMaterial);
        rib.rotation.y = Math.PI / 2;
        rib.position.set(-.48 + i * .075, .02, -.01);
        rib.name = `motor-cooling-rib-${i + 1}`;
        pumpHead.add(rib);
      }
      addBox(pumpHead, [.16, .2, .16], [-.3, -.2, .14], rubber, { name: 'motor-mount' });
      addBox(pumpHead, [.1, .045, .08], [-.27, -.08, .22], pumpRed, { name: 'motor-switch' });
      addBox(pumpHead, [.42, .12, .09], [.1, -.2, .25], darkMetal, { name: 'pump-front-control-panel' });

      // 半透明料斗、密封蓋與底部進料頸，材料液位由模擬注料量更新。
      const hopperCenterY = 1.34;
      const hopper = new THREE.Mesh(new THREE.CylinderGeometry(.3, .235, .54, 20, 1, false), mat(0xd7e0d9, { roughness: .26, metalness: .08, transparent: true, opacity: .46, side: THREE.DoubleSide }));
      hopper.position.set(.1, hopperCenterY, -.015);
      hopper.name = 'material-hopper';
      machine.add(hopper);
      const hopperBase = new THREE.Mesh(new THREE.TorusGeometry(.235, .022, 7, 20), brightMetal);
      hopperBase.position.set(.1, 1.07, -.015);
      hopperBase.rotation.x = Math.PI / 2;
      hopperBase.name = 'hopper-base-ring';
      machine.add(hopperBase);
      const fillHeight = .43;
      const tankFill = new THREE.Mesh(new THREE.CylinderGeometry(.225, .19, 1, 18), basic(materialProfiles[state.material].color, { transparent: true, opacity: .76, depthWrite: false }));
      tankFill.scale.set(1, fillHeight, 1);
      tankFill.position.set(.1, 1.105 + fillHeight / 2, -.015);
      tankFill.name = 'material-hopper-fill';
      machine.add(tankFill);
      const tankCap = new THREE.Mesh(new THREE.CylinderGeometry(.315, .315, .07, 20), safetyYellow);
      tankCap.position.set(.1, 1.65, -.015);
      tankCap.name = 'hopper-safety-lid';
      machine.add(tankCap);
      const capGrip = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .08, 12), darkMetal);
      capGrip.position.set(.1, 1.725, -.015);
      capGrip.name = 'hopper-lid-grip';
      machine.add(capGrip);
      const feedNeck = new THREE.Mesh(new THREE.CylinderGeometry(.105, .14, .16, 14), brightMetal);
      feedNeck.position.set(.1, 1.0, -.015);
      feedNeck.name = 'hopper-feed-neck';
      machine.add(feedNeck);

      // 正面類比壓力表與調壓閥；指針仍讀取既有 SimulationState 壓力。
      const gaugeCenter = new THREE.Vector3(-.04, .94, .285);
      const gaugeBody = new THREE.Mesh(new THREE.CylinderGeometry(.151, .151, .055, 24), darkMetal);
      gaugeBody.rotation.x = Math.PI / 2;
      gaugeBody.position.copy(gaugeCenter).add(new THREE.Vector3(0, 0, -.025));
      gaugeBody.name = 'pressure-gauge-body';
      machine.add(gaugeBody);
      const gauge = new THREE.Mesh(new THREE.TorusGeometry(.137, .018, 8, 24), brightMetal);
      gauge.position.copy(gaugeCenter);
      gauge.name = 'pressure-gauge';
      machine.add(gauge);
      const gaugeFace = new THREE.Mesh(new THREE.CircleGeometry(.119, 24), basic(0xe5ece7));
      gaugeFace.position.copy(gaugeCenter).add(new THREE.Vector3(0, 0, .008));
      gaugeFace.name = 'pressure-gauge-face';
      machine.add(gaugeFace);
      for (let tick = 0; tick <= 8; tick++) {
        const angle = Math.PI * (.16 + tick * .085);
        const mark = new THREE.Mesh(new THREE.BoxGeometry(.012, tick % 2 ? .028 : .04, .007), basic(0x26333a));
        mark.position.set(gaugeCenter.x + Math.cos(angle) * .092, gaugeCenter.y + Math.sin(angle) * .092, gaugeCenter.z + .014);
        mark.rotation.z = angle - Math.PI / 2;
        mark.name = `pressure-gauge-tick-${tick}`;
        machine.add(mark);
      }
      const gaugeNeedle = new THREE.Group();
      gaugeNeedle.name = 'pressure-gauge-needle';
      gaugeNeedle.position.set(gaugeCenter.x, gaugeCenter.y, gaugeCenter.z + .024);
      const needleHand = new THREE.Mesh(new THREE.BoxGeometry(.012, .09, .01), basic(0xc4373d));
      needleHand.position.y = .04;
      needleHand.name = 'pressure-gauge-needle-hand';
      gaugeNeedle.add(needleHand);
      machine.add(gaugeNeedle);
      const gaugeHub = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), brightMetal);
      gaugeHub.position.set(gaugeCenter.x, gaugeCenter.y, gaugeCenter.z + .028);
      gaugeHub.name = 'pressure-gauge-hub';
      machine.add(gaugeHub);
      const valveBody = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .14, 10), safetyYellow);
      valveBody.position.set(.39, .82, .2);
      valveBody.name = 'pressure-adjustment-valve';
      machine.add(valveBody);
      const valveHandle = addBox(machine, [.2, .035, .04], [.39, .91, .2], pumpRed, { name: 'pressure-valve-handle' });
      valveHandle.rotation.z = -.25;
      const statusLight = new THREE.Mesh(new THREE.SphereGeometry(.04, 10, 8), basic(0x5fe0a1));
      statusLight.position.set(.42, .77, .28);
      statusLight.name = 'machine-status-light';
      machine.add(statusLight);

      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, .16, 12), brightMetal);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(.45, .72, .28);
      nozzle.name = 'machine-nozzle';
      machine.add(nozzle);
      const nozzleCollar = new THREE.Mesh(new THREE.CylinderGeometry(.061, .061, .045, 12), safetyYellow);
      nozzleCollar.rotation.x = Math.PI / 2;
      nozzleCollar.position.copy(nozzle.position).add(new THREE.Vector3(0, 0, .075));
      nozzleCollar.name = 'high-pressure-outlet-collar';
      machine.add(nozzleCollar);
      const hoseMaterial = mat(0x12679a, { roughness: .34, metalness: .16 });
      const initialCurve = new THREE.CatmullRomCurve3([
        nozzle.position.clone(),
        new THREE.Vector3(.72, .28, .43),
        new THREE.Vector3(.34, .09, -.22),
        new THREE.Vector3(.12, .12, -.66),
      ]);
      const hose = new THREE.Mesh(new THREE.TubeGeometry(initialCurve, 36, .024, 8, false), hoseMaterial);
      hose.name = 'injection-hose';
      hose.castShadow = true;
      hose.receiveShadow = true;
      machine.add(hose);
      const hoseTerminal = new THREE.Mesh(new THREE.CylinderGeometry(.033, .043, .16, 10), brightMetal);
      hoseTerminal.name = 'hose-injection-coupler';
      machine.add(hoseTerminal);
      const label = makeTextSprite('高壓灌注機', '#dffaff', 'rgba(6,28,40,.92)');
      label.scale.set(1.8, .45, 1);
      label.position.set(0, 2.02, .05);
      machine.add(label);
      const externalModelAnchor = new THREE.Group();
      externalModelAnchor.name = 'external-material-bottle-anchor';
      externalModelAnchor.position.set(.62, .72, -.08);
      externalModelAnchor.visible = false;
      machine.add(externalModelAnchor);
      machine.userData.tankFill = tankFill;
      machine.userData.tankFillBaseY = 1.105;
      machine.userData.tankFillMaxHeight = fillHeight;
      machine.userData.statusLight = statusLight;
      machine.userData.gaugeNeedle = gaugeNeedle;
      machine.userData.pumpHead = pumpHead;
      machine.userData.nozzle = nozzle;
      machine.userData.hose = hose;
      machine.userData.hoseTerminal = hoseTerminal;
      machine.userData.label = label;
      machine.userData.externalModelAnchor = externalModelAnchor;
      injectionMachineGroup.add(machine);
      injectionMachineGroup.userData.machine = machine;
      injectionMachineGroup.visible = false;
    }

    function buildFloorAndRoom() {
      addBox(architecture, [11, .18, 9], [0, -.12, 0], mat(0x1d3441, { roughness: .92 }), { name: 'floor' });
      const plasterFallback = createFallbackSurfaceMaps('plaster');
      const plasterMaterial = mat(0xffffff, { map: plasterFallback.map, bumpMap: plasterFallback.bumpMap, bumpScale: .025, roughness: .96 });
      const ceilingPlasterMaterial = plasterMaterial.clone();
      ceilingPlasterMaterial.map = plasterFallback.map.clone();
      ceilingPlasterMaterial.bumpMap = plasterFallback.bumpMap.clone();
      architecture.userData.plasterMaterial = plasterMaterial;
      architecture.userData.plasterFallbackMaps = plasterFallback;
      architecture.userData.ceilingPlasterMaterial = ceilingPlasterMaterial;
      addBox(architecture, [11, .2, 9], [0, 6.1, 0], ceilingPlasterMaterial, { name: 'ceiling' });
      addBox(architecture, [.12, 6.1, 9], [-5.55, 3, 0], mat(0x28424f), { name: 'left-room-edge' });
      addBox(architecture, [.12, 6.1, 9], [5.55, 3, 0], mat(0x28424f), { name: 'right-room-edge' });

      const grid = new THREE.GridHelper(11, 22, 0x366175, 0x1c3b4b);
      grid.position.y = -.01;
      grid.material.transparent = true;
      grid.material.opacity = .28;
      architecture.add(grid);
    }

    function buildWall() {
      // 室內可見面是平整水泥粉光；磚紋只放在後方結構夾層，空腔仍獨立呈現。
      // Canvas 貼圖先提供離線備援，再由 CC0 外部 PBR 貼圖替換同一層材質。
      const brickFallback = createFallbackSurfaceMaps('brick');
      const surfaceWallMaterial = architecture.userData.plasterMaterial;
      const innerBrickMaterial = mat(0xffffff, { map: brickFallback.map, bumpMap: brickFallback.bumpMap, bumpScale: .07, roughness: .96 });
      architecture.userData.surfaceWallMaterial = surfaceWallMaterial;
      architecture.userData.innerBrickMaterial = innerBrickMaterial;
      architecture.userData.brickFallbackMaps = brickFallback;
      addBox(architecture, [10.5, 6, .28], [0, 3, .48], surfaceWallMaterial, { name: 'surface-wall' });
      addBox(architecture, [10.1, 5.7, .36], [0, 3, .18], innerBrickMaterial, { name: 'substrate-wall' });
      addBox(architecture, [9.9, 5.5, .18], [0, 3, -.12], mat(colors.cavity, { roughness: 1 }), { name: 'cavity-wall' });
      addBox(architecture, [10, 5.7, .14], [0, 3, -.42], mat(0x334c58, { roughness: .9 }), { name: 'outer-wall' });
      addLine([new THREE.Vector3(-5.1, .15, .65), new THREE.Vector3(5.1, .15, .65)], new THREE.LineBasicMaterial({ color: 0x0c1e29, transparent: true, opacity: .8 }), architecture, 'wall-base-line');

      // 結構網格，讓剖面時能看見牆內空腔和小尺度材料路徑。
      for (let x = -4.7; x <= 4.7; x += .55) {
        addLine([new THREE.Vector3(x, .25, -.23), new THREE.Vector3(x, 5.75, -.23)], new THREE.LineBasicMaterial({ color: 0x335261, transparent: true, opacity: .15 }), architecture, 'cavity-grid');
      }
      for (let y = .45; y <= 5.55; y += .55) {
        addLine([new THREE.Vector3(-4.85, y, -.23), new THREE.Vector3(4.85, y, -.23)], new THREE.LineBasicMaterial({ color: 0x335261, transparent: true, opacity: .15 }), architecture, 'cavity-grid');
      }
    }

    function buildWindow() {
      const windowGroup = new THREE.Group();
      windowGroup.name = 'window-feature';
      architecture.add(windowGroup);
      const x = 1.6;
      const y = 3.65;
      const z = .72;
      const frameMaterial = mat(colors.frame, { roughness: .42, metalness: .3 });
      const glassMaterial = mat(colors.glass, { roughness: .12, metalness: .05, transparent: true, opacity: .34 });
      addBox(windowGroup, [3.25, .23, .32], [x, y + 1.38, z], frameMaterial, { name: 'window-top' });
      addBox(windowGroup, [3.25, .23, .32], [x, y - 1.38, z], frameMaterial, { name: 'window-bottom' });
      addBox(windowGroup, [.23, 2.75, .32], [x - 1.51, y, z], frameMaterial, { name: 'window-left' });
      addBox(windowGroup, [.23, 2.75, .32], [x + 1.51, y, z], frameMaterial, { name: 'window-right' });
      addBox(windowGroup, [.06, 2.5, .24], [x, y, z + .03], frameMaterial, { name: 'window-divider' });
      addBox(windowGroup, [2.82, 2.42, .04], [x, y, z - .04], glassMaterial, { name: 'window-glass' });
      addBox(windowGroup, [3.65, .18, .7], [x, y - 1.52, .42], mat(0x66808a, { roughness: .55 }), { name: 'window-sill' });
      addBox(windowGroup, [3.5, .08, .5], [x, y - 1.62, .12], mat(0x294653, { roughness: .6 }), { name: 'sill-drainage-plane' });

      const sillLine = new THREE.LineBasicMaterial({ color: 0x8de7f0, transparent: true, opacity: .9 });
      addLine([new THREE.Vector3(x - 1.5, y - 1.47, -.02), new THREE.Vector3(x + 1.5, y - 1.47, -.02)], sillLine, windowGroup, 'drainage-plane-edge');
      addLine([new THREE.Vector3(x - 1.6, y - 1.57, -.02), new THREE.Vector3(x - 1.6, y - 1.57, -.85)], sillLine, windowGroup, 'drainage-arrow');

      architecture.userData.windowGroup = windowGroup;
    }

    function buildRainField() {
      // 雨幕只存在於戶外天空：一般情境的雨在牆頂 6.24 停止，
      // 陽台情境則停在防水層 6.47 之上。即使切換剖面或轉動鏡頭，也不會穿過樓板落進室內。
      // 以深度測試保留建築遮擋；屋內漏水滴仍由獨立水路效果呈現。
      const rainLines = [];
      for (let i = 0; i < 58; i++) {
        const line = addLine([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, -.5, 0),
        ], new THREE.LineBasicMaterial({
          color: state.rainColor,
          transparent: true,
          opacity: .4,
          depthTest: true,
          depthWrite: false,
        }), rainGroup, 'animated-rain-line');
        line.renderOrder = 12;
        line.userData.rainVisual = true;
        line.userData.baseX = -5.25 + randomSeeded(i + 501) * 10.5;
        line.userData.exteriorZ = -1.05 - randomSeeded(i + 541) * 2.2;
        line.userData.balconyZ = -2.45 + randomSeeded(i + 561) * 3.55;
        line.userData.phase = randomSeeded(i + 581) * 3.8;
        line.userData.length = .42 + randomSeeded(i + 621) * .48;
        line.userData.speed = 3.7 + randomSeeded(i + 661) * 2.7;
        line.userData.sway = .04 + randomSeeded(i + 701) * .08;
        rainLines.push(line);
      }
      rainGroup.userData.rainLines = rainLines;
      rainGroup.visible = state.rain > .01;
    }

    function buildPipe() {
      const pipeGroup = new THREE.Group();
      pipeGroup.name = 'pipe-feature';
      architecture.add(pipeGroup);
      const pipeMat = mat(colors.pipe, { roughness: .35, metalness: .3, transparent: true, opacity: .82 });
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 4.4, 16), pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(1.25, 2.45, -.32);
      pipe.name = 'hidden-pipe';
      pipe.castShadow = true;
      pipeGroup.add(pipe);
      const pipeJoint = new THREE.Mesh(new THREE.TorusGeometry(.14, .035, 8, 20), basic(0xf4bf70));
      pipeJoint.rotation.y = Math.PI / 2;
      pipeJoint.position.set(1.25, 2.45, -.32);
      pipeJoint.name = 'pipe-joint';
      pipeGroup.add(pipeJoint);
      architecture.userData.pipeGroup = pipeGroup;
      architecture.userData.pipe = pipe;
      architecture.userData.pipeJoint = pipeJoint;
    }

    function buildRooftopBalcony() {
      // 樓頂陽台以基礎幾何體表現：上方是積水平台，下方是樓板與室內天花，
      // 中間的落水口／樓板裂縫就是雨水往地下滲漏的教學水路。
      const rooftopGroup = new THREE.Group();
      rooftopGroup.name = 'rooftop-feature';
      architecture.add(rooftopGroup);

      addBox(rooftopGroup, [10.6, .22, 4.6], [0, 6.28, -.55], mat(0x718894, { roughness: .9 }), { name: 'balcony-slab' });
      addBox(rooftopGroup, [10.4, .035, 4.25], [0, 6.415, -.55], mat(0x263f4b, { roughness: .98 }), { name: 'balcony-waterproofing' });
      addBox(rooftopGroup, [10.6, .5, .18], [0, 6.58, 1.55], mat(0x46616d, { roughness: .85 }), { name: 'balcony-parapet-front' });
      addBox(rooftopGroup, [.18, .5, 4.4], [-5.2, 6.58, -.55], mat(0x46616d, { roughness: .85 }), { name: 'balcony-parapet-left' });
      addBox(rooftopGroup, [.18, .5, 4.4], [5.2, 6.58, -.55], mat(0x46616d, { roughness: .85 }), { name: 'balcony-parapet-right' });

      const drain = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .055, 20), basic(0x102531, { transparent: true, opacity: .95 }));
      drain.position.set(-2.25, 6.455, .28);
      drain.name = 'balcony-floor-drain';
      rooftopGroup.add(drain);
      const drainRing = new THREE.Mesh(new THREE.TorusGeometry(.29, .035, 8, 20), basic(0x74d9e8));
      drainRing.rotation.x = Math.PI / 2;
      drainRing.position.set(-2.25, 6.49, .28);
      drainRing.name = 'balcony-drain-ring';
      drainRing.userData.rainVisual = true;
      rooftopGroup.add(drainRing);

      const puddle = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .018, 32), basic(colors.wet, { transparent: true, opacity: .36, depthWrite: false }));
      puddle.position.set(-2.25, 6.45, .28);
      puddle.name = 'balcony-puddle';
      puddle.userData.rainVisual = true;
      rooftopGroup.add(puddle);

      const slabCrack = addLine([
        new THREE.Vector3(-2.25, 6.43, .3),
        new THREE.Vector3(-2.25, 5.88, .18),
        new THREE.Vector3(-2.4, 5.28, .78),
      ], new THREE.LineBasicMaterial({ color: state.rainColor, transparent: true, opacity: .55 }), rooftopGroup, 'balcony-slab-leak');
      slabCrack.userData.rainVisual = true;
      slabCrack.userData.path = [
        new THREE.Vector3(-2.25, 6.43, .3),
        new THREE.Vector3(-2.25, 5.88, .18),
        new THREE.Vector3(-2.4, 5.28, .78),
      ];

      architecture.userData.rooftopGroup = rooftopGroup;
    }

    function buildLabels() {
      const labels = [
        ['室內水泥粉光', [-3.9, 5.55, .72], null],
        ['磚牆夾層／空腔水路', [-3.6, 4.95, -.45], null],
        ['窗台排水層', [1.6, 1.92, .8], 'window'],
        ['樓頂陽台防水層', [-3.8, 6.82, 1.34], 'rooftop'],
        ['落水口', [-2.25, 6.84, .38], 'rooftop'],
        ['下層天花濕痕', [-2.7, 5.78, 1.2], 'rooftop'],
      ];
      labels.forEach(([text, position, scenario]) => {
        const sprite = makeTextSprite(text);
        sprite.position.set(position[0], position[1], position[2]);
        sprite.name = `label-${text}`;
        sprite.userData.scenario = scenario;
        sprite.userData.interiorOnly = text === '磚牆夾層／空腔水路';
        labelGroup.add(sprite);
      });
    }

  return { createFallbackSurfaceMaps, addBox, addLine, makeTextSprite, refreshTextSprites, buildFloorAndRoom, buildWall, buildWindow, buildRainField, buildPipe, buildRooftopBalcony, buildLabels, buildToolCursor, buildInjectionMachine };
}
