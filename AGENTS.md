# Project

Interactive building leakage diagnosis and repair simulator. Preserve the existing UI, Three.js scene and pointer workflow. Do not migrate to React or redesign unrelated UI.

# Core rule

This is a simulation, not an animation demo. Never generate random moisture readings. Measurement tools read SimulationState. Scenarios 01, 02A (bathroom membrane failure) and 02B (concealed hot-water pipe failure) are implemented cellular simulations; other scenarios are explicitly labeled legacy demonstrations until migrated.

# Architecture

- Simulation: actions + fixed deltaTime -> state. No DOM, Three.js or timers in simulation modules.
- Renderer: state -> screen. Canvas textures may be used on the existing 3D wall.
- Tools: pointer interaction -> validated simulation actions.
- TypeScript strict for new code. Keep main.ts small. src/legacy is a transitional compatibility boundary, not a place for new physics.
- No setTimeout-based physics. Keep moisture, pressure, damage and repair material in one authoritative SimulationState.
- Distinguish leakage sources from surface symptoms. Drying must take time; accumulated surface damage does not disappear just because water stops.
- Run lint, typecheck, tests and build after meaningful changes. Run browser tests for interaction changes.
- Preserve docs/original-prototype.html as the original user-provided reference.

- Scenario 02A shares water between a slab grid and an adjacent-wall grid. Keep observation coordinates distinct.
- Surface cleanup must not stop sources or erase stored moisture. Membrane repair needs floor use off; pipe bypass needs the supply valve closed and must isolate the old pipe. Verify after restoring the same supply conditions.

- Indoor floor has its own floor grid, finite floorTests and floorJunctions. Floor local depth is world z - 0.65; do not mix it with wall height or the upstairs slab.
- Keep floor telemetry separate from wall/ceiling repair baselines. Active floor water tests must finish before source-repair verification. Legacy wall demos do not supply the new floor network until explicitly migrated.

## 現場診斷知識（依昱揚工程課堂講義整理）

- 先診斷來源，再選修法；症狀位置不一定是進水點。用降雨、用水／排水事件、時間變化與量測趨勢交叉判斷，不可只靠壁癌外觀或單次含水讀值下結論。
- 情境可區分給水管（通常持續承壓）、排水管（主要在排水使用時有水流）及非管線問題。非管線來源至少涵蓋結構裂縫、二次施工縫、蜂巢／孔隙、積水或防水層失效、窗框接縫與地下室負水壓；複合問題可以同時存在。
- 修繕動作必須作用在真正來源：給水管可隔離、改管或廢管；排水問題需依堵塞或管線破損選通管、改管或局部打除修復；非管線問題才依正／負水壓面、裂縫與接縫條件考慮灌注、防水或填縫。表面清理、批土與塗料只能處理表層，不能關閉持續供水。

## 灌注與材料的模擬規則

- 高壓灌注不是通用解法。效果由裂縫／孔隙連通性、鑽孔是否接通水路、基材完整度、含水與水壓、注料位置及可施工面共同決定；錯誤孔位、大片複合問題或管線附近盲目灌注應降低預期效果或要求重新診斷。
- 將講義中的場域差異做成可調情境規則：完整混凝土細裂縫與可接通的蜂巢可能較適合灌注；大蜂巢、砂化基材、紅磚、鋼構、窗框泥作不足、空鼓屋頂及施工縫的結果不同，可能需要打除、補強、重作防水或其他源頭修復。不要把單一成功率套用到所有材料。
- 區分材料用途：疏水性 PU 遇濕氣膨脹並用於止水；親水性 PU 與水反應，適用條件及高水量／高壓下的效果不同；Epoxy 是乾燥條件下的結構補強材料，不可當成含水裂縫的通用止水劑。修復狀態要分別記錄止水、結構補強與表面防水，不能互相冒充。
- 注料量、壓力、膨脹、裂縫覆蓋範圍與漏水下降須由模擬狀態及材料特性推導；不可只播放動畫或宣稱一次灌注已補滿隱藏裂縫。可設計材料反應後的二次注料情境，但等待使用模擬時間步，不使用計時器控制物理狀態。
- 講義提及的鑽孔角度、針距、機具 PSI、管材耐壓與二次注料間隔，都是課程案例／器材資訊，不是全案通用常數。若呈現在工具提示或情境中，須標示為示範值並保持可調，不得當作法規、產品額定值或普遍施工指示。

## 教學與安全界線

- 此專案是診斷與因果關係的教學模擬，不取代現場勘查、結構技師判斷、施工規範或產品說明。課堂講義由 OCR 轉錄，可能有錯字；講義中的案例與數值只作定性或示範參數，勿擴大成工程保證。
- 若加入施工安全流程，至少呈現適用的個人防護、鑽孔粉塵與高溫鑽頭、通風、溶劑護目及高壓止水針方向風險；不得鼓勵人員站在止水針／接頭軸線前，也不可把不明機具或耗材的壓力值說成安全額定值。
