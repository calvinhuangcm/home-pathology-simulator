// Optional original remote assets. Local procedural equivalents always remain available.
export function createExternalAssets(context) {
  const { state, ui, externalAssets, externalAssetUrls, renderer, architecture, injectionMachineGroup, toolCursorGroup, makeTextSprite, addLog } = context;
    function refreshExternalAssetStatus() {
      const keys = Object.keys(externalAssets.loaded);
      const loadedCount = keys.filter((key) => externalAssets.loaded[key]).length;
      const failedCount = keys.filter((key) => externalAssets.failed[key]).length;
      const finishedCount = loadedCount + failedCount;
      if (!ui.assetStatus) return;

      if (!externalAssets.fullLoadRequested) {
        if (externalAssets.loaded.drillTool) {
          ui.assetStatus.className = 'pill';
          ui.assetStatus.innerHTML = '<i class="dot"></i>Poly Haven Drill 01 已載入';
        } else if (externalAssets.loading.drillTool) {
          ui.assetStatus.className = 'pill warn';
          ui.assetStatus.innerHTML = '<i class="dot"></i>Poly Haven Drill 01 載入中';
        } else if (externalAssets.failed.drillTool) {
          ui.assetStatus.className = 'pill warn';
          ui.assetStatus.innerHTML = '<i class="dot"></i>電鑽使用內建程序模型';
        }
        return;
      }

      if (finishedCount < keys.length) {
        ui.assetStatus.className = 'pill warn';
        ui.assetStatus.innerHTML = `<i class="dot"></i>外部素材 ${loadedCount}/${keys.length} 載入中`;
      } else if (loadedCount === keys.length) {
        ui.assetStatus.className = 'pill';
        ui.assetStatus.innerHTML = '<i class="dot"></i>外部模型＋貼圖已載入';
        if (!externalAssets.statusLogged) {
          externalAssets.statusLogged = true;
          addLog('外觀素材就緒：牆面貼圖與 Poly Haven Drill 01 電鑽模型已載入。', 'good');
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
      if (externalAssets.loading?.[key] !== undefined) externalAssets.loading[key] = false;
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

      const model = setExternalModelSurface(gltf.scene, 'polyhaven-drill-01-cc0');
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      // Front-view inspection foreshortens the tool along its drilling axis; enlarge the model so it remains recognizable at 1280px and tablet widths.
      const scale = 1.2 / Math.max(size.x, size.y, .001);
      model.scale.setScalar(scale);
      // 水平反轉 180°：將模型的 -X 鑽頭端轉到局部 -Z，朝向牆內；同時讓鑽尖留在牆面前緣。
      model.rotation.y = -Math.PI / 2;
      model.position.set(-center.z * scale, -box.min.y * scale, .28 - box.min.x * scale);
      anchor.add(model);
      const modelOption = ui.drillModelSelect?.querySelector('option[value="external"]');
      if (modelOption) { modelOption.disabled = false; modelOption.textContent = 'Poly Haven Drill 01（CC0）'; }
      // 載入成功後預設切換為真實鑽孔機模型；若使用者在載入期間明確選了程序模型，尊重其選擇。
      if (!state.drillModelExplicit) {
        state.drillModel = 'external';
        if (ui.drillModelSelect) ui.drillModelSelect.value = 'external';
      }
      const useExternalModel = state.drillModel === 'external';
      anchor.visible = useExternalModel;
      drill.userData.proceduralBody.visible = !useExternalModel;
      externalAssets.drillTool = model;
    }

    function ensureGltfLoader() {
      if (THREE.GLTFLoader) return Promise.resolve(true);
      if (externalAssets.gltfLoaderPromise) return externalAssets.gltfLoaderPromise;

      externalAssets.gltfLoaderPromise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
        script.async = true;
        const finish = (available) => {
          clearTimeout(timer);
          if (!available) externalAssets.gltfLoaderPromise = null;
          resolve(available);
        };
        const timer = setTimeout(() => finish(false), 10000);
        script.onload = () => finish(!!THREE.GLTFLoader);
        script.onerror = () => finish(false);
        document.head.append(script);
      });
      return externalAssets.gltfLoaderPromise;
    }

    function loadDrillAsset() {
      if (externalAssets.loaded.drillTool || externalAssets.loading.drillTool) return;
      externalAssets.loading.drillTool = true;
      externalAssets.failed.drillTool = false;
      refreshExternalAssetStatus();

      ensureGltfLoader().then((available) => {
        if (!available || !THREE.GLTFLoader) {
          markExternalAsset('drillTool', false);
          return;
        }
        const loader = new THREE.GLTFLoader();
        loader.load(externalAssetUrls.drillTool, (gltf) => {
          try {
            installExternalDrill(gltf);
            markExternalAsset('drillTool', true);
          } catch (error) {
            console.error('Poly Haven Drill 01 could not be installed.', error);
            markExternalAsset('drillTool', false);
          }
        }, undefined, () => markExternalAsset('drillTool', false));
      });
    }

    async function loadExternalAssets() {
      externalAssets.fullLoadRequested = true;
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

      const hasGltfLoader = await ensureGltfLoader();
      if (!hasGltfLoader || !THREE.GLTFLoader) {
        markExternalAsset('materialBottle', false);
        return;
      }
      const gltfLoader = new THREE.GLTFLoader();
      gltfLoader.load(externalAssetUrls.materialBottle, (gltf) => {
        installExternalMaterialBottle(gltf);
        markExternalAsset('materialBottle', true);
      }, undefined, () => markExternalAsset('materialBottle', false));
      loadDrillAsset();
    }

  return { loadDrillAsset, loadExternalAssets };
}
