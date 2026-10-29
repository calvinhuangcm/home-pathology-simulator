# Wall Pathology Simulator | Project and Development Guide
# 壁癌模擬器｜專案與開發手冊

This document defines the long-term working rules for adding scenarios, changing simulations, updating the interface, and fixing defects. Before starting, read this guide, the relevant parts of `README.md`, `docs/ARCHITECTURE.md`, `docs/VALIDATION.md`, and the existing code. Treat the current program behavior as authoritative. If the code and documentation disagree, investigate and update the documentation; do not assume a scenario already has a complete physical model.

本文件是新增情境、調整模擬、修改介面與修復問題時的長期工作準則。開始前先閱讀本文件，以及與任務相關的 `README.md`、`docs/ARCHITECTURE.md`、`docs/VALIDATION.md` 和既有程式碼。以目前程式實際行為為準；若文件與程式不一致，先查明差異並同步修正文件，不要假設某個情境已具備完整物理模型。

## 1. Project Scope and Non-Negotiable Principles
## 1. 專案定位與不可變原則

- This is an educational simulator for building leaks, wall pathology diagnosis, and repair. It should show observable and verifiable cause-and-effect relationships between sources, water transport, symptoms, and repairs. It is not a construction animation or a guarantee of field results.
  - 本專案是「建築滲漏、壁癌診斷與修繕」教學模擬器。目標是呈現可觀察、可驗證的來源、傳輸、症狀與修復因果關係，不是播放施工動畫或提供現場施工保證。
- Preserve the existing dark, three-column interface, Three.js scene, tool interactions, view controls, mouse and touch workflows, and working features. Do not migrate to React, rewrite the entire UI, or make large visual changes unrelated to the task for convenience.
  - 保留既有深色三欄介面、Three.js 場景、工具操作方式、視角控制、滑鼠／觸控流程與已正常運作的功能。不得為了方便而遷移 React、重寫整個 UI，或大幅改動與任務無關的視覺設計。
- Do not claim unfinished features are complete. Clearly mark features that are not connected to real state, calculations, or interaction as TODO or demonstrations. Never present random values, fake data, or decorative animation as implemented functionality.
  - 不捏造已完成的功能。尚未接入真實狀態、計算或互動的項目，明確標示為 TODO／示範，不得以隨機值、假資料或只有外觀的動畫包裝成已實作。
- Keep `docs/original-prototype.html` as the original single-file reference. Do not modify or overwrite it.
  - 保留 `docs/original-prototype.html` 作為原始單檔參考，不修改或覆蓋它。
- The home page currently has no link to the “Injection Lesson” page. If the lesson remains available at a standalone URL, do not add a link back to the home page unless the user asks.
  - 主頁目前不提供「打針教學頁」連結；教學頁若保留為獨立網址，也不得自行把入口加回主頁，除非使用者另行要求。

## 2. Field Diagnosis: Find the Water Source Before Choosing a Repair
## 2. 現場診斷方法：先找水源，再決定修法

### 2.1 Recommended Diagnostic Workflow
### 2.1 建議的診斷流程

1. **Establish the event and environmental conditions:** Record when the leak occurs and how it relates to rain, showers, floor washing, drainage, water-supply pressure, groundwater level, air conditioning, and indoor humidity. Compare conditions before, during, and after the event.
   - **釐清事件與環境：**記錄漏水何時發生，與降雨、淋浴、地坪用水、排水、供水壓力、地下水位、空調及室內濕度的關係。比較事件前、事件中與停止後的變化。
2. **Classify the likely source:** Decide whether the evidence better fits pressurized supply water, a drainage-use event, membrane or joint ingress, a structural crack or void, groundwater, capillary rise, or surface condensation. Allow multiple sources when appropriate.
   - **區分水源類型：**先判斷較符合承壓給水、排水使用事件、防水層／接縫進水、結構裂縫或孔隙、地下水、毛細上升，還是表面結露。必要時允許多個來源同時成立。
3. **Create comparable measurements:** Measure a dry area first, then a suspect area made of the same material and surface under similar conditions. Use fixed locations and repeat measurements to follow trends. Do not compare pin-type and pinless meter readings without explaining their differences.
   - **建立可比較的量測：**在同材質、同表面與相近條件下先量乾區，再量可疑區；固定位置並重複量測，追蹤趨勢。針式與非針式儀器的讀值不可不加說明地互相比較。
4. **Cross-check the hypothesis:** Compare measurements with supply or drainage events, rain, thermal images, surface cracks, joints, hollow-sounding areas, and pipe locations. A single moisture reading, thermal color patch, or visible wall damage does not prove the source on its own.
   - **交叉驗證假設：**將量測結果與供水／排水事件、降雨、熱像、表面裂縫、接縫、空鼓或管線位置交叉比對。單次含水讀值、單一熱像色塊或壁癌外觀都不足以單獨證明水源。
5. **Choose a source-directed repair:** Confirm the working surface, pressure, material, and substrate conditions before selecting pipe isolation, drain repair, waterproofing renewal, crack or void injection, or another suitable method. Cleaning wall damage, applying putty, or repainting treats the surface only; it does not shut off an active water source.
   - **選擇作用在水源的修法：**先確認施工面、壓力、材料與基材條件，再選隔離管線、修復排水、防水重作、裂縫／孔隙灌注或其他合適方式。先清壁癌、批土或重塗只能處理表層，不能關閉仍在供水的來源。
6. **Verify under the same conditions:** After repair, restore the original rain, water-use, drainage, or supply-pressure conditions and observe source flow and measurement trends. Water stored in walls and slabs takes time to dry after the source stops. Historic efflorescence, mold, and paint damage do not disappear immediately when leakage is stopped.
   - **以相同條件驗證：**修復後恢復原本的降雨、用水、排水或供水壓力，再觀察來源通量與量測趨勢。來源已停止後，牆體及樓板的儲水仍需時間乾燥；歷史白華、黴菌與漆面損傷不會因止水而立即消失。

### 2.2 Scenario Clues and Repair Principles
### 2.2 情境判讀與修復原則

| Possible source / 可能來源 | Key clues / 重要線索 | Diagnostic and repair logic for the simulator / 模擬器應呈現的診斷／修復邏輯 |
| --- | --- | --- |
| **Pressurized supply-pipe failure**<br>**給水管破損** | It may continue after showering stops; flow is affected by the supply valve and pressure.<br>可能在停止淋浴後仍持續；流量受供水閥與壓力影響。 | Close the valve, locate and isolate the old pipe, then reroute or abandon it and verify under the same pressure. Sealing the wall or merely closing a valve does not mean the pipe has been repaired.<br>關閥、定位並隔離舊管；改管或廢管後，恢復相同壓力驗證。只封牆面或只關閥不代表管線已修復。 |
| **Drain-pipe damage or blockage**<br>**排水管破損或堵塞** | It is usually associated with drainage events. Distinguish a blockage from a failed joint or pipe body.<br>通常與排水事件相關；須區分堵塞、接頭或管身破損。 | Make each test identify which pipe is being tested, and let finite tests finish according to simulation time. Choose drain clearing, pipe repair, or localized removal based on the cause. Repairing one pipe must not automatically stop other branches.<br>測試要指出正在測哪一支管，有限測試依模擬時間結束；按原因選通管、修管或局部打除。修復一支管不能自動關閉其他支管。 |
| **Bathroom or balcony membrane failure**<br>**浴室／陽台防水失效** | After use or rain, water may enter through a breach, travel through a slab, and appear on a ceiling below or at an adjacent wall base.<br>用水或降雨後，水可能經破口進入樓板，再移至樓下天花或相鄰牆腳。 | Show the source location separately from downstream symptoms. Stop relevant surface water use before membrane repair, then restore the same conditions for verification. Repainting the damaged interior surface alone does not repair the membrane.<br>分開呈現水源位置與下游症狀。防水修復前停止相關面狀用水；完成後恢復同條件驗證。只重塗室內受損表面不會修復膜層。 |
| **Structural crack, construction joint, honeycombing, or voids**<br>**結構裂縫、施工縫、蜂巢／孔隙** | Water can travel through internal paths, so the visible exit may be offset from the entry. Consider crack activity, connectivity, substrate integrity, and water pressure.<br>進水可沿內部水路移動，表面出水點可能偏離入口；須考量活動性、連通性、基材完整度及水壓。 | Do not assume injection will work just because a crack is visible. If a drilled hole does not connect to a water path, do not render material flowing to a remote crack. Prompt for renewed diagnosis or another repair when needed.<br>不能只看到裂縫就假設灌注有效。鑽孔若沒有接通水路，材料不得被畫成流到遠端裂縫。必要時提示重新診斷或其他修法。 |
| **Window frame or exterior-wall joint**<br>**窗框與外牆接縫** | Often related to wind-driven rain, sill drainage, flashing, sealant, or exterior finishing details.<br>常與雨向、窗台排水、泛水、填縫或外牆收邊有關。 | Include drainage and joint details in diagnosis. Do not equate a high moisture reading directly with “suitable for injection.”<br>把排水與接縫細節納入判斷；不可將高含水讀值直接等同於「適合打針」。 |
| **Basement leakage under negative-side water pressure**<br>**地下室負水壓滲水** | Ingress is related to groundwater level, defects on the water-facing side, and interior-side seepage.<br>入水與地下水位、迎水面缺損和室內側出水有關。 | Derive relative pressure from the scenario water level. Interior-side plugging may reduce visible seepage but does not cut off groundwater outside. Represent access and pressure constraints for water-side repairs.<br>由情境水位推導相對水壓。室內側封堵可降低室內出水，但不等於切斷外側地下水源；迎水側修復需反映可施工性及水壓條件。 |
| **Capillary rise**<br>**毛細上升** | The wet region often rises from the wall base. Observe its height distribution, salt content, and wall assembly.<br>濕區常由牆腳向上，需觀察高度分布、鹽分與牆體構造。 | Do not classify from a single reading. Compare with ground moisture protection, salt content, and other possible sources.<br>不以單點讀值直接判定；與地面防潮、含鹽與其他水源交叉比較。 |
| **Condensation**<br>**結露** | Related to indoor humidity, surface temperature, ventilation, insulation, and seasonal conditions.<br>與室內濕度、表面溫度、通風、隔熱及季節條件相關。 | Distinguish condensation from external leakage. Prefer comparing dew point with surface temperature; do not use crack injection as a universal repair.<br>將結露與外部滲水分開；優先比較露點與表面溫度，不套用裂縫灌注作為通用修法。 |

Wall pathology, efflorescence, blistered paint, and mold are surface or material responses to moisture. Their visible locations may be where water finally emerges, not where it first entered. The interface, hints, and Diagnosis Score should distinguish measured evidence from inference and explain the source of uncertainty. Diagnosis Score is educational feedback based on simulator rules; it is not a calibrated probability of a real-world diagnosis or a professional certification.

壁癌、白華、漆膜鼓起與黴菌是表面或材料受潮的結果，位置可能是水分最後析出的地方，不一定是最初進水點。介面、提示與 Diagnosis Score 應讓使用者知道哪些是量測證據、哪些是推論，以及不確定性來自哪裡。Diagnosis Score 是依教學規則提供的回饋，不是經校準的現場診斷機率或專業簽證。

## 3. Repair Materials and Safety Boundaries
## 3. 修繕材料與施工安全的模擬界線

- **High-pressure injection is not a universal repair.** Its effect should depend on crack or void connectivity, drill direction and depth, injection location, substrate condition, moisture, water pressure, and available work surface. Incorrect holes, compound water paths, or blind injection near pipes should reduce effectiveness or prompt renewed diagnosis.
  - **高壓灌注不是通用解法。**效果需由裂縫／孔隙連通性、鑽孔方向與深度、注料位置、基材狀態、含水、水壓及可施工面共同決定。錯誤孔位、複合水路或管線附近的盲目灌注，應降低效果或要求重新診斷。
- **Keep material purposes distinct:** hydrophobic PU, hydrophilic PU, Epoxy, gel/acrylic materials, and surface waterproof coatings must not be treated as interchangeable. PU foam reaction, expansion, and water-stopping behavior vary by formulation and product. Epoxy is commonly used for specific structural-repair conditions and must not be described as a universal waterstop for wet cracks. A surface coating cannot replace repair of a pipe or internal water path.
  - **區分材料用途：**疏水性 PU、親水性 PU、Epoxy、凝膠／丙烯酸類材料與表面防水塗料不可互相冒充。PU 泡沫的遇水反應、膨脹與止水特性依配方及產品而異；Epoxy 常用於特定結構補強條件，不可描述為含水裂縫的萬用止水劑；表面塗層也不能替代管線或內部水路修復。
- Track each material's **water stopping, structural reinforcement, joint filling, and surface waterproofing** purposes and outcomes separately. If the source is still supplying water, do not report it repaired just because a coating or putty was applied.
  - 將材料類型分開記錄其**止水、結構補強、接縫填充、表面防水**用途與結果。若來源仍持續供水，不得只因表面塗料或批土完成，就顯示來源已修復。
- Derive injection volume, pressure, reaction time, expansion, crack coverage, and leak reduction from simulation state and explicit teaching parameters. Do not rely on animation alone or claim one injection fills every hidden crack.
  - 注料量、壓力、反應時間、膨脹、裂縫覆蓋範圍與漏水下降，必須由模擬狀態和明確的教學參數推導；不得只播放動畫或宣稱一次注料已填滿所有隱藏裂縫。
- Drill angles, spacing, machine PSI, pipe pressure ratings, and intervals between injection passes from course examples are not universal values. If displayed, label them as “demonstration values,” keep them adjustable, and do not present them as regulations, product ratings, or general construction instructions.
  - 課堂案例中的鑽孔角度、孔距、機具 PSI、管材耐壓與二次注料間隔，都不是全案通用值。若要顯示，註明「示範值」，保持可調，並不得當作法規、產品額定值或普遍施工指示。
- The simulator does not replace site inspection, structural-professional judgment, local construction requirements, product technical data, or assessment by qualified workers. Base real material selection and construction values on current product documentation and site conditions.
  - 模擬器不取代現場勘查、結構專業判斷、當地施工規範、產品技術資料或合格施工人員評估。施工相關數值與材料選擇必須以實際產品最新版資料及現場條件為準。

## 4. Simulation Model and Scenario Boundaries
## 4. 模擬模型與情境邊界

### 4.1 Authoritative State and Causal Rules
### 4.1 唯一狀態與因果規則

- `SimulationState` is the sole authority for physical state. It should cover wall, slab, and indoor-floor grids; water sources; cracks; waterproof layers; pipes; damage; repairs; tool state; and simulation time. Do not create a second mutable copy of physical state in the UI or renderer.
  - `SimulationState` 是物理狀態的唯一權威來源，至少涵蓋牆體／樓板／室內地板網格、水源、裂縫、防水層、管線、損傷、修復、工具狀態與模擬時間。新增數值不得另存在 UI 或 renderer 中形成第二份可變物理狀態。
- Readings must come from the actual simulated grid cell and material layer touched by the probe. Never use `Math.random()`, wet-stain texture color, or a fixed default as a measurement.
  - 讀值必須取自探頭命中的實際模擬網格與材質層，不得用 `Math.random()`、濕痕貼圖顏色或固定預設值冒充量測。
- Water enters from sources, moves between neighboring cells according to material permeability, crack/joint connectivity, membrane defects, and water pressure, then affects surface moisture, salt, efflorescence, mold, and paint damage. After the source stops, retain stored moisture and dry it gradually. Historical damage remains until an explicit surface-restoration action occurs.
  - 水分由來源進入，依材質通透、裂縫／接縫連通、防水層缺損與水壓在相鄰網格間傳輸，再影響表面含水、鹽分、白華、黴菌與漆面損傷。停止來源後要保留既有水分並逐步乾燥；歷史損傷保留，直到有明確的表面整修動作。
- Drying, damage, repair materials, and water pressure must update through a fixed timestep or `deltaTime`. Do not advance physics directly with `setTimeout`, animation progress, or DOM events.
  - 乾燥、損傷、修復材料與水壓都由固定 timestep／`deltaTime` 更新。不得用 `setTimeout`、動畫進度或 DOM 事件直接推進物理。
- If moisture indices, relative flow, pressure, milliliters, expansion ratios, or time are not calibrated, label them clearly as teaching-scale values. Do not imply real instrument measurements, material ratings, or CFD results.
  - 含水指標、相對流量、壓力、毫升數、膨脹倍率與時間若未校準，必須清楚標為教學尺度，不得暗示是現場儀器實測、材料額定值或 CFD 結果。
- Current moisture is a bounded relative teaching index. Its dry baseline and displayed percentage are not equivalent to material gravimetric moisture content or calibrated water content. When changing index range, baseline, or UI units, update meter labels, README, architecture documentation, and tests together.
  - 目前含水量是有界的相對教學指標，乾燥基線與讀值百分比不等於材料的重量含水率或校正後的含水量。變更指標範圍、基線或 UI 單位時，同步更新儀器標示、README、架構文件與測試。

### 4.2 Scenarios and Observation Domains
### 4.2 情境與觀察域

- Scenario 01 (exterior-wall crack), 02A (bathroom membrane failure), and 02B (concealed hot-water pipe failure) currently have layered-grid simulations. Drainage, multiple leaks, basement leakage, and thermal diagnosis have newer engine logic. Other scenario cards may still be legacy demonstrations. Before adding features, check `docs/ARCHITECTURE.md` and `src/scenarios/`; a selectable card does not imply a complete physical simulation.
  - 目前 Scenario 01 外牆裂縫、02A 浴室防水層失效、02B 熱水暗管破損有分層網格模擬；排水、多重漏水、地下室與熱像診斷已有新引擎邏輯。其他卡片可能仍屬 legacy 展示，新增功能前先核對 `docs/ARCHITECTURE.md` 和 `src/scenarios/`，不得把「卡片可選」等同「完整物理已實作」。
- In 02A, the bathroom slab and adjacent wall are separate observation domains. The ceiling below and the wall base in an adjacent room are also separate locations. Exchange water only through explicit junctions; do not mix their coordinates or treat their readings as one surface.
  - 02A 的浴室樓板與相鄰牆體是不同觀察域；樓下天花與同樓層相鄰房間牆腳是不同位置。可以透過明確的接點交換水分，但不得混用它們的座標或把兩個讀值當成同一表面。
- The indoor floor has a separate `floor` grid, finite `floorTests`, and `floorJunctions`. Its local depth is world coordinate `z - 0.65`. Do not mix it with wall height or the upstairs bathroom slab/downstairs ceiling coordinates. Physical junctions may exchange water, but floor telemetry and wall/ceiling repair baselines must remain separate.
  - 室內地板有獨立 `floor` 網格、有限 `floorTests` 和 `floorJunctions`。地板局部深度是世界座標 `z - 0.65`，不可與牆面高度或樓上浴室樓板／樓下天花座標混用。物理接點可以交換水分；地板遙測與牆／天花修繕基準仍須分開呈現。
- A floor water test in progress must finish before source-repair effectiveness is verified. In 02A, stop relevant floor water use before membrane repair. In 02B, close the supply valve and isolate the old pipe before rerouting it. Restore the original conditions before verifying either repair.
  - 進行中的地板淋水測試必須完成，才能開始來源修復成效驗證。02A 膜層修復前需停止相關地坪用水；02B 改明管前需關閉供水閥並隔離舊管。兩者都要恢復原本條件再驗證。
- Legacy scenarios that have not migrated to the new grid must not pretend to provide the new floor network or diagnostic state. The interface must identify model limitations.
  - 未遷移至新網格的 legacy 情境，不可假裝提供新地板水路或新診斷狀態；介面需標出模型限制。

## 5. Frontend Architecture and Interface Rules
## 5. 前端架構與介面準則

```text
DOM controls / pointer interaction
  → tools / validated actions
  → SimulationEngine + SimulationState
  → renderer (existing Three.js scene, Canvas texture, cross-section)
  → DOM telemetry / workflow
```

- **Simulation:** Handle actions, fixed time steps, and state only. Do not depend on the DOM, Three.js, or browser timers.
  - **Simulation：**只處理動作、固定時間步與狀態，不依賴 DOM、Three.js 或瀏覽器計時器。
- **Tools:** Convert mouse/touch input into validated simulation actions. Validate coordinates, tool state, prerequisites, and boundaries. Do not fake physical outcomes by directly editing renderer geometry.
  - **Tools：**把滑鼠／觸控操作轉成已驗證的模擬動作，驗證座標、工具狀態、施工前置條件與邊界；不直接改 renderer 幾何來假造物理結果。
- **Renderer:** Read state and draw the scene; do not write physical outcomes back. Canvas textures may be used on the existing 3D wall. Do not create large numbers of absolutely positioned DIVs or a second engine for convenience.
  - **Renderer：**讀取狀態並繪成畫面，不回寫物理結果。可在既有 3D 牆面使用 Canvas 貼圖，不要為方便而建立大量絕對定位 DIV 或另寫一套引擎。
- **UI:** Use the DOM for toolbars, instrument readings, instructions, tasks, control buttons, and diagnostic feedback. Use Three.js/Canvas for walls, material layers, pipes, cracks, water, damage, and repair effects.
  - **UI：**DOM 負責工具列、儀器數字、說明、任務、控制按鈕與診斷回饋；Three.js／Canvas 負責牆體、材質層、管線、裂縫、水分、損傷及修復效果。
- Write new code in strict TypeScript. Keep `src/main.ts` small and clear. `src/legacy/prototype.js` is a compatibility layer for the existing UI and gestures, not a place for new physics. Do not rewrite legacy modules at scale just to reorganize them.
  - 新程式碼使用 TypeScript strict。保持 `src/main.ts` 小而清楚；`src/legacy/prototype.js` 是既有 UI／手勢與相容層，不是新增物理邏輯的位置。不要為整理而大規模重寫 legacy 模組。
- Every new tool must have real input, a state source, prerequisites, success/failure outcomes, reset behavior, and tests. Mark unfinished tools as TODO.
  - 任何新工具都要具備實際輸入、狀態來源、前置條件、成功／失敗結果、重置與測試；尚未完成時標註 TODO。
- Maintain Traditional Chinese, English, and Japanese. When adding or changing visible text, update `src/ui/i18n.ts`, dynamic text, button states, `aria-label`, `title`, `placeholder`, and scene text as applicable. Changing language must not reset physical state.
  - 維持繁體中文、英文、日文三語。新增或修改可見文字時，同步處理 `src/ui/i18n.ts`、動態文字、按鈕狀態、`aria-label`、`title`、`placeholder` 與場景文字；切換語言不得重置物理狀態。
- Keep GitHub Pages subpath support. Follow `vite.config.ts` when resolving asset URLs; do not hard-code paths that only work at the site root.
  - 保持 GitHub Pages 子路徑相容，依 `vite.config.ts` 的設定處理資產 URL，不要硬編碼只適用於網站根目錄的路徑。

## 6. Main Source Locations
## 6. 主要程式位置

| Location / 位置 | Responsibility / 職責 |
| --- | --- |
| `src/simulation/SimulationEngine.ts`, `types.ts` | Fixed time steps, authoritative state, and domain types.<br>固定時間步、唯一狀態與領域資料型別。 |
| `src/simulation/wallModel.ts`, `waterSimulation.ts`, `damageSimulation.ts` | Grid materials, water transport, pressure/drying, and cumulative damage.<br>網格材質、水分傳輸、壓力／乾燥與累積損傷。 |
| `src/simulation/repairSimulation.ts`, `bathroomRepairs.ts` | Injection, surface/source repair state, and prerequisites.<br>注料、表面及來源修復狀態與前置條件。 |
| `src/simulation/floorModel.ts`, `diagnostics.ts` | Indoor-floor model, finite water tests, diagnostic events, and inference.<br>室內地板模型、有限水測試、診斷事件與推論。 |
| `src/scenarios/` | Scenario initial states, sources, and scenario rules.<br>情境初始狀態、來源與情境規則。 |
| `src/tools/` | Moisture meter, thermal camera, drilling, injection, and surface-waterproofing tool logic.<br>含水率儀、熱像、鑽孔、注入、表面防水等工具邏輯。 |
| `src/renderer/` | 3D scene, floor, external assets, and moisture-grid textures; projects state to screen.<br>三維場景、地板、外部素材與網格含水貼圖；狀態到畫面的投影。 |
| `src/ui/` | Scenario controls, diagnosis interface, languages, measurement, and workflow UI.<br>情境控制、診斷介面、語系、量測與流程 UI。 |
| `src/legacy/prototype.js`, `src/ui/engineBridge.js` | Existing Three.js interaction workflow and old/new state compatibility boundary.<br>既有 Three.js 操作流程與新舊狀態相容邊界。 |
| `docs/ARCHITECTURE.md`, `docs/VALIDATION.md` | Architecture, known limits, validation evidence, and migration status.<br>架構現況、已知限制、驗證證據與遷移狀態。 |
| `docs/original-prototype.html` | Original single-file reference; keep unchanged.<br>原始單檔參考，保持不變。 |

When adding files or changing module responsibilities, update this table and `docs/ARCHITECTURE.md`.

新增檔案或改變模組責任時，同步更新本表與 `docs/ARCHITECTURE.md`。

## 7. Development and Validation Workflow
## 7. 開發與驗證流程

1. Read the relevant scenario, engine, UI, renderer, and existing tests first. Identify whether the task changes a source, simulation, renderer, or UI.
   - 先讀相關情境、引擎、UI、renderer 及既有測試，確認任務改動的是 source、simulation、renderer 還是 UI。
2. Prefer the smallest complete vertical slice: connect one source, state change, measurement/action, visual output, and repair verification into a causal workflow before expanding to more scenarios.
   - 優先採最小垂直切片：先讓一個來源、狀態變化、量測／操作、視覺輸出與修復驗證形成完整因果流程，再擴充其他情境。
3. Put new physics in `src/simulation/`, tool actions in `src/tools/`, and presentation in `src/renderer/` or `src/ui/`. Do not put physics in `index.html`, `main.ts`, or a legacy controller.
   - 新物理進 `src/simulation/`；工具動作進 `src/tools/`；顯示進 `src/renderer/` 或 `src/ui/`。不得把物理塞進 `index.html`、`main.ts` 或 legacy controller。
4. After meaningful code changes, run:
   - 有意義的程式變更後執行：

   ```sh
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

5. For changes to interaction, scenes, touch, or language, start `npm run dev` in another terminal, then run `npm run test:browser`. This suite covers language support, Scenarios 01/02A/02B, rendering, floor, drainage/multiple-source/basement behavior, thermal imaging, and the standalone injection lesson. To run a single suite:
   - 若修改互動、場景、觸控或語系，先在另一個終端執行 `npm run dev`，再執行 `npm run test:browser`。該套件涵蓋語系、Scenario 01、02A／02B、渲染、地板、排水／多來源／地下室、熱像與獨立注射教學頁。需要單跑時，使用下列命令：

   ```sh
   npm run test:browser:i18n
   npm run test:browser:bathroom
   npm run test:browser:rendering
   npm run test:browser:floor
   npm run test:browser:diagnostic
   npm run test:browser:lesson
   ```

6. Browser tests must use the real UI. Check 1280×720, 1920×1080, tablet and phone viewports, mouse and touch input, and console/runtime errors. Do not use test-only shortcuts that directly mutate physical state.
   - 瀏覽器測試須透過實際 UI 操作，檢查 1280×720、1920×1080、平板／手機視窗、滑鼠與觸控、console／runtime errors；不要透過測試專用捷徑直接改物理狀態。
7. If physical models, measurement meaning, scenario capabilities, workflows, or known limitations change, update the README, architecture documentation, and validation documentation. Report what was actually tested; do not claim untested Android devices, Safari, product performance, or construction outcomes passed.
   - 若改變物理模型、量測意義、情境能力、操作流程或已知限制，同步更新 README／架構文件／驗證文件。報告實際測過的內容，不要把尚未測的 Android 實機、Safari、產品性能或工程效果寫成通過。

## 8. Safety, Health, and Professional Boundaries
## 8. 安全、健康與專業界線

- Drilling and injection can involve dust, hot drill bits, noise, solvents/chemicals, pressurized lines, failed injection packers, and accidental damage to structures or pipes. If the interface includes safety guidance, cover appropriate personal protective equipment, ventilation, dust control, and material labels. Never encourage anyone to stand in front of an injection packer or connector along its axis.
  - 鑽孔與灌注可能涉及粉塵、高溫鑽頭、噪音、溶劑／化學品、高壓管線、止水針脫落及結構或管線誤傷。若介面加入安全流程，說明適用的個人防護、通風、粉塵控制與材料標示；不可鼓勵人員站在止水針或接頭軸線前。
- Do not provide a safe pressure rating for unidentified equipment, consumables, or piping. If pressure, volume, spacing, angle, or curing time appears in the simulation, label it as a teaching example and do not present it as a rating or construction instruction.
  - 不提供不明機具、耗材或管材的安全壓力值。壓力、用量、孔距、角度和養護時間若用於模擬，必須標成教學示範參數，且不可被誤認為額定值或施工指令。
- Surface restoration for mold or wall pathology should follow source control and adequate drying. For health concerns, contaminated water, extensive damage, or structural concerns, recommend assessment by qualified professionals. Do not describe cleaning, covering, or repainting as repair of the leak source.
  - 黴菌與壁癌表面整修需先處理潮濕來源並讓材料適當乾燥；有健康疑慮、污染水、廣泛受損或結構疑慮時，提示尋求合格專業人員。勿將清潔、遮蓋或重新塗裝描述為漏水源頭修復。

## 9. References and General Principles
## 9. 參考原則

These sources support general diagnostic principles only. They do not replace Taiwan regulations, site inspection, or current technical documentation for a specific product.

以下資料只支援一般判讀原則，不取代台灣法規、現場勘查或各產品最新版技術資料：

- [US EPA: Mold cleanup and moisture control](https://www.epa.gov/mold/what-are-basic-mold-cleanup-steps): Address leaks and moisture sources before mold cleanup; distinguish surface cleaning, drying, and repainting.
  - [US EPA：壁癌／黴菌處理與水分控制](https://www.epa.gov/mold/what-are-basic-mold-cleanup-steps)：處理黴菌前須處理漏水與潮濕來源，表面清潔、乾燥和重新塗裝應分開看待。
- [FLIR: Detecting water leaks with thermal imaging](https://www.flir.com/discover/professional-tools/how-to-detect-a-water-leak-with-thermal-imaging): Thermal cameras show temperature differences, not water inside a wall. Confirm thermal clues with moisture meters and other evidence.
  - [FLIR：以熱像協助找漏水](https://www.flir.com/discover/professional-tools/how-to-detect-a-water-leak-with-thermal-imaging)：熱像呈現溫度差異，不是直接看見牆內水分；熱像線索需搭配含水儀及其他證據確認。
- [FLIR: Emissivity and reflected temperature](https://www.flir.com/en-gb/discover/professional-tools/how-does-emissivity-affect-thermal-imaging/); [Sika: Injection materials and systems](https://www.sika.com/en/construction/injections.html): Thermal interpretation is affected by surface emissivity and environmental reflections. Select injection materials according to their product, substrate, moisture, and water-flow conditions; do not apply one material rule to every site.
  - [FLIR：放射率與反射溫度](https://www.flir.com/en-gb/discover/professional-tools/how-does-emissivity-affect-thermal-imaging/)；[Sika：注入材料與系統](https://www.sika.com/en/construction/injections.html)：熱像判讀受表面放射率與環境反射影響；注入材料依產品、基材、含水與水流條件選擇，不能用單一材料規則套用所有現場。
