# ARCHITECTURE

## 修改前完整盤點

原專案只有 `漏水打針模擬器.html`，3477 行、約 786 KB。沒有 package.json、獨立 assets 目錄、build、lint 或 typecheck。內嵌 Three.js r128 原始發行程式占檔案的大部分；自製應用約 2900 行。

| 分析項目 | 發現與處置 |
| --- | --- |
| A. 架構 | HTML、CSS、Three.js、場景資料、互動、規則與數值混在同一 IIFE。保留 UI，建立模組入口。 |
| B. 耦合 | 同一 state 同時放牆體平均濕度、孔位與 Mesh；儀器會讀 renderer 的濕痕幾何。新引擎移除 DOM/Three.js 依賴，舊 UI 透過 bridge 讀值。 |
| C. 動畫 | 雨滴、預先定位濕痕、材質前緣、白華顆粒是視覺示意。Scenario 01 的濕痕、損傷、材料圖層改讀 cell。雨線仍是降雨條件的視覺表現。 |
| D. 數值 | 原含水率沒有 Math.random，但由全牆 scalar、預設水路距離及濕痕位置合成；並非逐格水分。原 seeded variation 用於材質與粒子。新儀器直接讀網格。 |
| E. 保留 | 深色三欄 UI、原 Three.js 核心、幾何與程序貼圖、選用遠端資產 URL、視角、射線命中、拖曳／縮放、孔位清單、音效、量測記錄與五步流程。 |
| F. 抽離 | CSS、情境 metadata、場景幾何、外部資產、模擬引擎、工具、狀態橋接與 Canvas renderer。 |
| G. TypeScript | 新引擎、工具、網格 renderer、控制面板使用 strict TypeScript。既有 renderer/controller 保留 JavaScript，checkJs=false；不宣稱整個舊系統已完成型別化。 |
| H. Renderer | 原本已有成熟 WebGL 場景，無須改成 React 或重寫為純 2D。新增 Canvas 2D texture 貼到既有牆面，另以 Canvas 顯示六層切片。 |

原本核心已使用 deltaTime，並非 setTimeout 物理；這次把 scalar 趨近改成固定 timestep 的空間模型。原 setTimeout 僅剩選用素材逾時、通知與音效排程。

## 現在的資料流程

```text
DOM controls / pointer raycast
  → tools/drill, tools/injector, tools/moistureMeter
  → SimulationEngine + 唯一 SimulationState
      wall.cells（moisture / waterPressure / salt / cracks / waterproof / mold / damage / PU）
      waterSources / cracks / waterproofLayers / pipes / repairs / tools / simulationTime
  → Canvas moistureField + existing Three.js geometry
  → DOM telemetry and workflow
```

`moistureMap` 與 `damage` 存放於 `wall.cells`，不建立另一份可變副本。`engineBridge.js` 的舊欄位是 getter；Scenario 01 的實體孔位、材料量、塞針、濕度及損傷都由引擎持有，view model 只保存 Mesh 與孔位 ID。02A／02B 也透過同一橋接讀取引擎；窗框、舊管線示意、結露、樓頂四個舊情境仍留在 `legacy/prototype.js`。

## 模型

- 六層：室內油漆、批土、水泥砂漿、RC 混凝土、防水層、外牆磁磚。每層 42 × 24，共 6048 個 cell。
- `SimulationEngine.update(realDelta)` 累積時間後，以 0.05 秒固定步長更新修復、水分與損傷。Pause、1×、5×、20× 共用同一演算法。瀏覽器背景暫停，長幀最多取 0.1 秒，不追算背景經過時間。
- 含水指標範圍 0–100，本情境平衡乾燥基線為 8；它是教學用相對含水／飽和指標，不是校準後的建材重量含水率。
- 材質界面採 harmonic conductivity，pairwise flux 同時加減。正常防水層通透很低；破損處可通過。RC 較慢、砂漿較快，裂縫有連通方向傳輸。未被修繕的水分不會憑空消失。
- 外側入口在左上方，RC 水路斜向移動後向下，到較低室內出口再擴散。表面裂縫只是可見線索，並不把來源座標直接交給正常模式使用者。
- 蒸散依材質不同，表面較快、RC 較慢。白華依濕潤與蒸散條件累積，黴菌需持續潮濕，漆面損傷依潮濕及鹽分累積；乾燥不自動清除歷史損傷。
- PU 從鑽孔的 RC cell 注入，沿 crack edge 傳輸，遇水反應成膨脹填充，降低局部通透率。串聯水路阻力提高時，來源流量自然降低。錯誤孔不會把材料送往其他裂縫。
- flow 是相對入水流量，MPa、ml、膨脹倍率與時間是明確的教學尺度。材料常數尚未以實驗校準；不是 CFD、結構驗算或現場施工參數。

## Scenario 02：共用引擎的兩種原因

02A 和 02B 是分開的情境，避免把浴室附近的所有壁癌都歸因於防水失效。

| 案例 | 供水與路徑 | 表面症狀 | 有效源頭修復 |
| --- | --- | --- | --- |
| 02A 防水層失效 | 地坪磁磚上的 210 格面狀用水 → 防水破口 → 樓板 RC；牆地交界交換至相鄰牆腳砂漿 | 樓下天花、同樓層相鄰房間牆腳；兩個獨立觀察域 | 停止地坪用水，重作破損防水層與牆地交界，再恢復用水 |
| 02B 熱水暗管破損 | 受供水閥及壓力控制的牆內來源 → 管槽內下移 → 室內飾面 | 破管位置下方的濕區與白華，與來源錯位 | 關閉供水，隔離舊管，接通新明管，再開閥恢復原壓力 |

`SimulationState` 加入可選的 `slab`、`junctions`、帶壓 `pipes` 與固定 tick 的 `repairs.job`。每格仍保存唯一的 moisture、pressure、damage、surfaceCoating；新案例不使用 legacy scalar 物理。樓板與牆體分別為 6048 格，樓板採由磁磚到天花的容量限制向下傳輸。兩域接點以等量加減交換水，不直接把濕度複製到另一表面。

面狀水源只在上側地磚加水，必須經防水格才能進 RC。正常膜的模型通透率為 0.0001，破損時依完整度增加（非校準材料數據）。面板入滲通量為實際膜—RC 邊上的正向流量加總，包含停水後仍由濕地磚往內移動的殘水；不是用水開關乘一個修好百分比。透水率非常低仍不是絕對 0。

表面整修只清除當前觀察域的濕損飾面白華、黴菌及漆損，增加暫時表面塗層；不改變 source、waterproofLevel、pipes 或 moisture。塗層減少表面輸送與蒸散，濕潤時逐漸失效，因此持續供水會再次析鹽、受損。新表面整理不會把所有內層損傷一併清掉。

防水重作與改明管各有固定作業時間（15／10 秒，刻意壓縮供教學）。前置條件由 simulation action 驗證，UI 再提供狀態提示；Pause 會停止作業。改明管必須將舊管 `isolated=true`，新增健康 exposed route。重新開閥後只有新管恢復壓力，原 pipe source 因舊管隔離而失去流量，並非改名或改顏色。

Renderer 沿用 Three.js，Canvas moistureField 可投影到牆面或天花。樓板 local `(x,y)` 對應世界 `(x,5.99,6.65-y)`；探頭在天花反向映射後，從 slab.cells 取樣。房間視圖分開，天花視圖的背景牆不冒用相鄰房間的含水值；樣本保留量測表面標記，跨表面不得當同材質對照。內藏管僅在剖面／DEBUG 顯示，新增明管正常視圖可見。

驗證前必須完成作業並恢復供水；供水條件 key 必須與修繕前一致。測試中鎖定供水、壓力與修繕操作；只關閥或改低壓力不能取得修復比較。牆體乾燥與歷史表面損傷繼續由同一引擎更新。

### 分析依據與模型界線

香港屋宇署將供排水管滲漏、防水層失效列為不同常見來源；聯合辦事處也區分供水管測試、地坪蓄水與牆面噴水等調查方式。這支持本次把兩案的供水條件和修復方式分開，並不表示單看濕斑就能確診。[屋宇署滲水 FAQ](https://www.bd.gov.hk/en/resources/faq/index_water_seepage_problem.html)、[滲水調查技術](https://www.waterseepage.gov.hk/en/water_seepage/technologies.html)。

使用者指定的改明管以「隔離破損暗管 + 健康外露替代路徑」建模；並未模擬現場管徑、接頭、保溫、熱膨脹或真實熱傳，也未聲稱任何浴室都適合相同改管方案。熱像功能使用情境狀態與可調環境條件產生教學估算，並非校正儀器的量測資料。

## 目錄與責任

| 路徑 | 責任 |
| --- | --- |
| `index.html`, `src/ui/styles.css` | 原 UI DOM / 樣式與最少控制項調整 |
| `src/main.ts` | 小型啟動入口 |
| `src/simulation/types.ts`, `wallModel.ts` | cell / source / repair 型別、座標索引與網格邊 |
| `src/simulation/SimulationEngine.ts` | 固定 tick、快照／還原、彙總讀值 |
| `src/simulation/diagnostics.ts` | 證據事件、診斷假設／評分、有限單支排水測試、地下水位轉教學水壓 |
| `waterSimulation.ts`, `damageSimulation.ts`, `repairSimulation.ts` | 獨立的水分、損傷、PU 更新 |
| `src/scenarios/exteriorCrack.ts` | Scenario 01 幾何、材料、來源及裂縫連通資料 |
| `src/scenarios/bathroom.ts`, `src/simulation/bathroomRepairs.ts` | 02A／02B 初始資料、驗證供水與修繕動作、作業狀態更新 |
| `src/renderer/bathroomScene.ts`, `src/ui/bathroomControls.ts` | 樓板／明暗管幾何、供水控制、觀察面及修繕 UI |
| `src/scenarios/legacyCatalog.js` | 舊 UI 情境 metadata，包含明示的舊示意情境 |
| `src/tools/` | 確定性 cell 量測與驗證後的鑽孔／塞針／注入動作 |
| `src/tools/thermalCamera.ts` | 依 moisture、壓力、供水管溫與掃描條件計算表面溫度估算及混淆警示 |
| `src/ui/diagnosticControls.ts`, `diagnosisControls.ts` | 支管／地下水情境控制、證據時間軸、多來源假設與 Diagnosis Score |
| `src/renderer/moistureField.ts` | state → Canvas texture 與六層切片；不影響 physics |
| `src/renderer/sceneGeometry.js`, `externalAssets.js` | 保留的 Three.js 幾何、程序貼圖與選用外部資產 |
| `src/ui/engineBridge.js`, `simulationControls.ts` | 舊 UI view model 及新儀器／DEBUG 控制 |
| `src/legacy/prototype.js` | 過渡 controller、既有手勢／UI 與未移植情境。禁止在此新增物理。 |
| `public/vendor/three-r128.min.js` | 直接抽出原版 Three.js，保留 MIT 授權標頭 |
| `tests/` | 引擎因果測試與真實瀏覽器互動測試 |

## KNOWN ISSUES / TODO

- 窗框、舊管線示意、結露、樓頂仍是 legacy。02B 與舊管線示意是不同卡片；新引擎沒有把舊情境的動畫假裝成物理。排水、多重漏水與地下室已有獨立網格來源與情境邏輯。
- 證據時間軸與 Diagnosis Score 已接入新引擎，分開計算來源精確率、涵蓋率與信心校準；評分依情境來源，是教學回饋。熱像已提供溫度估算、露點、環境混淆警示及判讀信心，但沒有相機校正與量測雜訊。敲診與裂縫計尚未接入新引擎。
- Epoxy、凝膠與自由塗刷防水工具已有各自受限的模擬用途；不得把表面塗層當成管線／內部水源修復。表面整修目前限新案例既有支援範圍。
- 舊版 controller 仍約 2200 行，部分 UI 與舊情境邏輯尚未完全型別化。這是刻意保留的遷移邊界，避免一次破壞其他流程。
- 六層使用簡化網格，不反映實際層厚、孔隙率、溫度與材料本構。表面可視裂縫沿用既有幾何；內部裂縫依新模型，兩者不要求逐點重合。
- 3D 場景需要 WebGL。遠端模型／貼圖由使用者選擇載入，可能受網路或供應商限制；預設本機程序資產不依賴網路。這次沒有驗證所有遠端資產仍可下載。
- 觸控以 Chrome 的行動裝置與多點觸控模擬驗證，未在實體 Android 平板執行。

## NEXT STEP

下一階段可遷移窗框、樓頂與結露的舊情境至網格引擎，再實作敲診／裂縫計與「非校正熱像」的明確雜訊及信心模型。診斷流程亦可增加同點複測、供水事件前後的時間序列圖，並繼續驗證多來源案例及錯誤修復的結果。


## 室內地板模型（2026-10-16）

新增獨立 `floor` domain，80 × 28 × 3 = 6720 個 cell。表層由地磚與填縫連通區組成，下方是砂漿找平層、RC 樓板。地磚使用較低的透水係數；填縫較容易把水帶進砂漿，並不以牆面的平均值假造地板濕度。

| 模組 | 責任 |
| --- | --- |
| `src/simulation/floorModel.ts` | 地板尺寸、材料、牆腳接點、邊界檢查、5 秒有限淋水動作與供水更新 |
| `src/renderer/floorSurface.ts` | 三層 Three.js 地坪、固定地磚／填縫材質、側邊剖面；無含水或物理副本 |
| `src/ui/floorControls.ts` | 地板／牆面視角、淋水選位、實際狀態及倒數顯示 |
| `moistureField.ts` | 同時投影牆面與地板的表面狀態；選取地板時可查看其三層內部資料 |
| `tests/floor.test.ts`, `tests/floor-browser.mjs` | 地板因果、守恆、座標、真實指標、鼠標／觸控與回歸 |

世界範圍 x = [-5.5, 5.5]，z = [0.65, 4.5]，可見地板頂面 y = -0.03。地板 local `(x, depth)` 對應世界 `(x, -0.03, 0.65 + depth)`；和牆高、樓上浴室樓板／樓下天花的座標系不同。幾何與引擎共用 FLOOR_SURFACE 常數，探頭先做邊界與上表面驗證，再查 floor.cells。非針式取第 0 層，針式取第 1 層砂漿。

`SimulationState` 新增 floor、floorJunctions、floorTests。固定 tick 同時更新三域水分；室內地板重力傳輸向層索引增大的 RC，浴室上方樓板則維持原本朝樓下天花的方向。牆腳與地板的砂漿接點以等量加減交換相對儲水指標。有限淋水在頂面局部網格加入水分，5 秒後停止，剩餘水分繼續擴散和蒸散，不立即清零。

正常畫面可同時看到牆面和地板症狀；DEBUG／剖面只投影所選觀察域的內部層。地板貼圖沿 +π/2 旋轉並使用 BackSide，向上可見且保留 local 深度方向。貼圖保持 depthTest、禁用 depthWrite、使用 polygonOffset，沿用旋轉破圖修正。既有重疊地板／GridHelper 在新地坪啟用時隱藏；樓下天花視圖恢復原背景地板，該背景沒有冒用同樓層相鄰地板的資料。

Scenario 01／02A／02B 透過 42 個牆腳接點耦合室內地板。其餘情境仍保留原牆面展示邏輯；新引擎中的牆面水源及牆腳接點停用，地板只有實際定點淋水的獨立模擬，介面明示沒有接入舊牆面水路。

全模型 surfaceMax 可包含地板，但舊 UI 的 wallMoisture getter 與修繕比較只讀牆面／天花最高值；地板指標另行呈現。正在淋水時不能開始源頭修繕成效驗證，驗證進行中也不能新增測試水源。撤銷物理淋水會還原包含地板與測試進度的引擎快照。

限制：網格的填縫連通區代表粗網格中的平均通路，並非每格都代表相同寬度的現場填縫。施水、儲水與流量是相對教學單位，未使用校準孔隙率、實際材料層厚容量或水力本構。沒有地表積水深度、坡度導流或排水口功能。
