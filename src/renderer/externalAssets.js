// Optional original remote assets. Local procedural equivalents always remain available.
export function createExternalAssets(context) {
  const { state, ui, externalAssets, externalAssetUrls, renderer, architecture, injectionMachineGroup, toolCursorGroup, makeTextSprite, addLog } = context;
    function refreshExternalAssetStatus() {
      const keys = Object.keys(externalAssets.loaded);
      const loadedCount = keys.filter((key) => externalAssets.loaded[key]).length;
      const failedCount = keys.filter((key) => externalAssets.failed[key]).length;
      const finishedCount = loadedCount + failedCount;
      if (!ui.assetStatus) return;

      if (finishedCount < keys.length) {
        ui.assetStatus.className = 'pill warn';
        ui.assetStatus.innerHTML = `<i class="dot"></i>外部素材 ${loadedCount}/${keys.length} 載入中`;
      } else if (loadedCount === keys.length) {
        ui.assetStatus.className = 'pill';
        ui.assetStatus.innerHTML = '<i class="dot"></i>外部模型＋貼圖已載入';
        if (!externalAssets.statusLogged) {
          externalAssets.statusLogged = true;
          addLog('外部素材就緒：室內粉光、夾層磚紋、電鑽與灌注泵浦模型已套用。', 'good');
        }
      } else if (loadedCount > 0) {
        ui.assetStatus.className = 'pill warn';
        ui.assetStatus.innerHTML = `<i class="dot"></i>外部素材部分載入（${loadedCount}/${keys.length}）`;
        if (!externalAssets.statusLogged) {
          externalAssets.statusLogged = true;
          addLog('外部素材部分載入；未完成項目已回退到程序幾何。', 'warn');
        }
      } else {
        ui.assetStatus.className = 'pill warn';
        ui.assetStatus.innerHTML = '<i class="dot"></i>外部素材失敗，使用程序備援';
        if (!externalAssets.statusLogged) {
          externalAssets.statusLogged = true;
          addLog('外部素材無法取得，已使用程序幾何與純色材質備援。', 'warn');
        }
      }
    }

    function markExternalAsset(key, success) {
      externalAssets.loaded[key] = success;
      externalAssets.failed[key] = !success;
      const keys = Object.keys(externalAssets.loaded);
      if (externalAssets.timeout && keys.every((asset) => externalAssets.loaded[asset] || externalAssets.failed[asset])) {
        clearTimeout(externalAssets.timeout);
        externalAssets.timeout = null;
      }
      refreshExternalAssetStatus();
    }

    function configureExternalTexture(texture, repeatX, repeatY, useSrgb = false) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1);
      if (useSrgb && THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
      texture.needsUpdate = true;
      return texture;
    }

    function applyExternalWallTextures() {
      const surface = architecture.getObjectByName('surface-wall');
      const substrate = architecture.getObjectByName('substrate-wall');
      const plaster = architecture.userData.surfaceWallMaterial || surface?.material;
      const ceilingPlaster = architecture.userData.ceilingPlasterMaterial;
      const brick = architecture.userData.innerBrickMaterial || substrate?.material;

      // 室內最前層永遠保持粉光材質；磚貼圖只覆蓋剖面中的結構夾層。
      [plaster, ceilingPlaster].filter(Boolean).forEach((material) => {
        if (externalAssets.plasterDiffuse) material.map = externalAssets.plasterDiffuse;
        if (externalAssets.plasterBump) {
          material.bumpMap = externalAssets.plasterBump;
          material.bumpScale = .018;
        }
        if (externalAssets.plasterDiffuse) material.color.set(0xffffff);
        material.needsUpdate = true;
      });
      if (brick && state.scenario !== 'crack') {
        if (externalAssets.brickDiffuse) brick.map = externalAssets.brickDiffuse;
        if (externalAssets.brickBump) {
          brick.bumpMap = externalAssets.brickBump;
          brick.bumpScale = .055;
        }
        if (externalAssets.brickDiffuse) brick.color.set(0xffffff);
        brick.needsUpdate = true;
      }
    }

    function installExternalMaterialBottle(gltf) {
      const machine = injectionMachineGroup.userData.machine;
      const anchor = machine?.userData.externalModelAnchor;
      if (!anchor || !gltf?.scene) return;

      const model = gltf.scene;
      model.name = 'external-gltf-material-bottle';
      model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        if (object.material) object.material.needsUpdate = true;
      });

      // 依模型包圍盒自動縮放與落地，避免不同來源的 glTF 尺寸把機器或場景撐爆。
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const extent = Math.max(size.x, size.y, size.z, .001);
      const scale = .9 / extent;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
      model.rotation.y = -.28;

      const label = makeTextSprite('外部 glTF 材料桶', '#dffaff', 'rgba(6,28,40,.92)');
      label.scale.set(1.35, .34, 1);
      label.position.set(0, .98, .05);
      anchor.add(model, label);
      anchor.visible = true;
      externalAssets.materialBottle = model;
    }

    function setExternalModelSurface(model, name) {
      model.name = name;
      model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        if (object.material) object.material.needsUpdate = true;
      });
      return model;
    }

    function installExternalDrill(gltf) {
      const drill = toolCursorGroup.userData.drill;
      const anchor = drill?.userData.externalModelAnchor;
      if (!anchor || !gltf?.scene) return;

      const model = setExternalModelSurface(gltf.scene, 'external-cc0-cordless-combi-drill');
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = .8 / Math.max(size.y, size.z, .001);
      model.scale.setScalar(scale);
      // 來源模型的 +Z 是鑽頭朝向；轉向牆面，並把鑽頭尖端放在游標接觸面附近。
      model.rotation.y = Math.PI;
      model.position.set(-center.x * scale, -box.min.y * scale, .1 + box.max.z * scale);
      anchor.add(model);
      anchor.visible = true;
      drill.userData.proceduralBody.visible = false;
      externalAssets.drillTool = model;
    }

    function installExternalInjectionPump(gltf) {
      const machine = injectionMachineGroup.userData.machine;
      const anchor = machine?.userData.externalPumpAnchor;
      if (!anchor || !gltf?.scene) return;

      const model = setExternalModelSurface(gltf.scene, 'external-cc0-injection-pump');
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = .72 / Math.max(size.x, size.y, size.z, .001);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
      anchor.add(model);
      anchor.visible = true;
      // 隱藏重複的簡化泵頭方塊，保留機台、材料桶、壓力表與注射軟管。
      if (machine.userData.pumpHead) machine.userData.pumpHead.visible = false;
      externalAssets.injectionPump = model;
    }

    async function loadExternalAssets() {
      refreshExternalAssetStatus();
      // 外部載入器採非阻塞載入；離線或 CDN 卡住時，本地場景與工具仍立即可操作。
      externalAssets.timeout = setTimeout(() => {
        Object.keys(externalAssets.loaded).forEach((key) => { if (!externalAssets.loaded[key]) markExternalAsset(key, false); });
      }, 18000);

      const textureLoader = new THREE.TextureLoader();
      textureLoader.setCrossOrigin?.('anonymous');
      textureLoader.load(externalAssetUrls.plasterDiffuse, (texture) => {
        externalAssets.plasterDiffuse = configureExternalTexture(texture, 10.5, 6, true);
        applyExternalWallTextures();
        markExternalAsset('plasterDiffuse', true);
      }, undefined, () => markExternalAsset('plasterDiffuse', false));
      textureLoader.load(externalAssetUrls.plasterBump, (texture) => {
        externalAssets.plasterBump = configureExternalTexture(texture, 10.5, 6, false);
        applyExternalWallTextures();
        markExternalAsset('plasterBump', true);
      }, undefined, () => markExternalAsset('plasterBump', false));
      textureLoader.load(externalAssetUrls.brickDiffuse, (texture) => {
        externalAssets.brickDiffuse = configureExternalTexture(texture, 10.1, 5.7, true);
        applyExternalWallTextures();
        markExternalAsset('brickDiffuse', true);
      }, undefined, () => markExternalAsset('brickDiffuse', false));
      textureLoader.load(externalAssetUrls.brickBump, (texture) => {
        externalAssets.brickBump = configureExternalTexture(texture, 10.1, 5.7, false);
        applyExternalWallTextures();
        markExternalAsset('brickBump', true);
      }, undefined, () => markExternalAsset('brickBump', false));

      if (!THREE.GLTFLoader) await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
        script.async = true;
        const timer = setTimeout(() => resolve(false), 10000);
        script.onload = () => { clearTimeout(timer); resolve(true); };
        script.onerror = () => { clearTimeout(timer); resolve(false); };
        document.head.append(script);
      });
      if (!THREE.GLTFLoader) {
        markExternalAsset('materialBottle', false);
        markExternalAsset('drillTool', false);
        markExternalAsset('injectionPump', false);
        return;
      }
      const gltfLoader = new THREE.GLTFLoader();
      [
        ['materialBottle', installExternalMaterialBottle],
        ['drillTool', installExternalDrill],
        ['injectionPump', installExternalInjectionPump],
      ].forEach(([key, install]) => {
        gltfLoader.load(externalAssetUrls[key], (gltf) => {
          install(gltf);
          markExternalAsset(key, true);
        }, undefined, () => markExternalAsset(key, false));
      });
    }

  return { loadExternalAssets };
}
