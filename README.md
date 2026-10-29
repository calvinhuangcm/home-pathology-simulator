# 壁癌模擬器｜Wall Pathology Simulator｜壁面劣化シミュレーター

[繁體中文](#traditional-chinese) · [English](#english) · [日本語](#japanese)

<a id="traditional-chinese"></a>
## 繁體中文

以因果模擬學習建築滲漏診斷：追蹤水源、材料內的水分移動與表面損傷，再透過量測及源頭修復驗證判斷。

**線上版：**[直接開啟 GitHub Pages 模擬器](https://calvinhuangcm.github.io/home-pathology-simulator/)。

### 功能一覽

| 功能 | 說明 |
| --- | --- |
| 因果式水分模擬 | 漏水來源、材質傳輸、裂縫、防水層、蒸散、累積損傷及修復效果由模擬狀態推導；不使用隨機含水率。 |
| 牆體與剖面觀察 | 以既有 Three.js 場景顯示牆面、材料層、水分熱區、裂縫及修繕狀態。 |
| 診斷工具 | 含水率儀、教學用熱像估算、鑽孔、PU 注入、Epoxy、凝膠、表面防水及診斷回饋。 |
| 室內地板 | 獨立地板材質層、地板含水量測、有限時間的定點淋水測試與牆腳水分交換。 |
| 時間與語言 | 暫停或切換 1×、5×、20×；介面提供繁體中文、英文及日文。 |

### 模擬情境與實作狀態

| 情境 | 實作狀態與重點 |
| --- | --- |
| 外牆裂縫滲水 | 網格模擬：降雨入水、裂縫傳輸、偏移的表面症狀、量測、鑽孔、PU 注入及逐步乾燥。 |
| 浴室防水層失效 | 網格模擬：面狀用水經防水缺損進入樓板，水分可移往樓下天花或相鄰房間牆腳；可比較表面整理和源頭防水修復。 |
| 熱水暗管破損 | 網格模擬：受壓管線持續供水，症狀可與破管位置不同；關閥、隔離舊管、接通明管後恢復供水驗證。 |
| 排水管破損 | 新引擎診斷情境：依排水使用事件進行有限時間的單支管測試、觀察通量，再選擇修復。 |
| 多重漏水 | 新引擎診斷情境：浴室防水層失效與排水管破損同時存在，需分別測試、修復及驗證來源。 |
| 地下室負水壓 | 新引擎診斷情境：地下水位推導相對水壓；室內側封堵可降低出水，但不會切斷外側水源。 |
| 其他情境 | 窗框／窗台、管線漏水陷阱、結露與高濕度、樓頂陽台仍保留舊版展示邏輯，尚未遷移至網格物理引擎。 |

### 建議操作流程

1. 選擇情境，先觀察供水來源、使用事件與模擬時間的關係。
2. 用含水率儀比較濕區、乾區及不同觀察面；單次讀值只代表探頭所在位置。
3. 依含水變化、用水事件和症狀分布判斷來源，不要只憑壁癌外觀定位。
4. 修復真正的供水來源，再以相同供水條件執行驗證。
5. 觀察水分逐漸乾燥；已累積的白華、黴菌與表面損傷仍需另外整理。

Scenario 02A 可切換觀察樓下天花與相鄰房間牆腳。只清理或重塗室內表面不會關閉防水層破口或停止用水；要比較源頭修復效果，需依畫面提示停止地坪用水、完成防水修復，再恢復相同用水條件。

### 工具與判讀

| 工具 | 模擬用途 |
| --- | --- |
| 含水率儀 | 讀取探頭位置的牆面、樓板或地板網格狀態。 |
| 紅外線熱像 | 依含水與環境條件估算表面溫度差；不是校正過的現場測溫儀。 |
| 鑽孔與 PU 注入 | Scenario 01 的教學修復流程；效果依孔位與裂縫連通狀態改變。 |
| Epoxy、凝膠與防水塗層 | 各自依材料用途限制發揮作用，不會自動取代管線隔離或內部水源修復。 |

### 開始使用

**本機執行需求：**Node.js、pnpm，以及支援 WebGL 的瀏覽器。

安裝依賴並啟動開發伺服器：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

使用終端機顯示的本機網址開啟模擬器。建立正式版：

```sh
pnpm build
```

### 開發與驗證

執行靜態檢查、型別檢查、模擬測試與建置：

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

瀏覽器互動測試需先在另一個終端機啟動開發伺服器，再執行：

```sh
pnpm test:browser
```

測試範圍與已知限制記錄於[驗證說明](docs/VALIDATION.md)。

### 系統架構

| 層級 | 責任 |
| --- | --- |
| Simulation | TypeScript 引擎以固定時間步更新唯一的 SimulationState。 |
| Tools | 將滑鼠與觸控操作轉成經驗證的模擬動作。 |
| Renderer | Three.js 與 Canvas 將狀態呈現在既有場景；渲染不回寫物理狀態。 |
| UI | DOM 顯示工具、量測值、情境、控制項與診斷回饋。 |

完整模組責任、資料流程與模型假設見[架構說明](docs/ARCHITECTURE.md)。

### 模型與安全界線

這是診斷與因果關係的教學模擬，不是現場檢測儀器、結構分析工具或施工指引。相對含水指標、壓力、注入量、時間及材料反應未經現場校準；不能當作法規、產品額定值、施工參數或工程保證。實際鑽孔、注入、化學品和結構判斷，應依現場條件、產品資料、適用規範與合格專業人員評估。

### 授權與第三方素材

由 Calvin Huang 撰寫的原創模擬器程式碼、介面與專案文件，依 [PolyForm Noncommercial License 1.0.0](LICENSE) 授權。商業用途不在本授權範圍內，需另向權利人取得許可。授權原文列出的慈善、教育、公共研究、公共安全或健康、環境保護及政府組織用途，依條款即使有資金來源也可能屬允許用途；如需排除這些用途，標準條款未必符合需求。英文版 LICENSE 為準。本專案為「公開原始碼、限非商業使用」，不是 OSI 定義下的開源軟體。

AGENTS.md 含有依課程教材整理的開發指引，明確排除於本專案授權之外；其中第三方教材仍由各自權利人持有。Three.js 與 Poly Haven 等第三方軟體及素材依各自授權使用。詳見 [NOTICE](NOTICE) 與[第三方授權清單](THIRD-PARTY-NOTICES.md)。

<a id="english"></a>
## English

Learn building leak diagnosis through cause-and-effect simulation. Track water sources, transport through materials, and surface damage, then use measurements and source repairs to examine your diagnosis.

**Online version:** [Open the simulator on GitHub Pages](https://calvinhuangcm.github.io/home-pathology-simulator/).

### Features

| Feature | Description |
| --- | --- |
| Causal moisture simulation | Sources, material transport, cracks, waterproofing, evaporation, cumulative damage, and repair effects are derived from simulation state; moisture readings are not random. |
| Wall and cutaway views | The existing Three.js scene presents wall surfaces, material layers, moisture fields, cracks, and repair state. |
| Diagnostic tools | Moisture meter, educational thermal estimates, drilling, PU injection, Epoxy, gel, surface waterproofing, and diagnostic feedback. |
| Indoor floor | Separate floor material layers, floor measurements, finite-duration spot water tests, and moisture exchange at the wall junction. |
| Time and language controls | Pause or use 1×, 5×, and 20× speed; the interface supports Traditional Chinese, English, and Japanese. |

### Scenarios and Implementation Status

| Scenario | Status and focus |
| --- | --- |
| Exterior wall crack | Grid simulation: rain entry, crack transport, offset surface symptoms, measurements, drilling, PU injection, and gradual drying. |
| Bathroom membrane failure | Grid simulation: area water use enters the slab through a damaged membrane and may reach the ceiling below or an adjacent room wall base. Compare surface cleanup with source-level membrane repair. |
| Concealed hot-water pipe failure | Grid simulation: a pressurized pipe continues to supply water, and symptoms may appear away from the break. Close the valve, isolate the old pipe, connect an exposed replacement, then verify after restoring supply. |
| Drain-pipe failure | New-engine diagnostic scenario: run a finite single-branch test during a drainage event, observe flow, then choose a repair. |
| Multiple leaks | New-engine diagnostic scenario: bathroom membrane failure and drain-pipe damage coexist; test, repair, and verify each source separately. |
| Basement negative-side pressure | New-engine diagnostic scenario: groundwater level determines relative pressure. Interior-side sealing may reduce visible seepage but does not cut off the exterior source. |
| Other scenarios | Window/frame leakage, the pipe-leak trap, condensation/high humidity, and rooftop/balcony leakage retain legacy demonstration logic and have not been migrated to the grid physics engine. |

### Suggested Workflow

1. Choose a scenario and observe how water supply, usage events, and simulation time relate.
2. Compare wet and dry areas and different observation surfaces with the moisture meter. A reading describes the probe location.
3. Use moisture trends, usage events, and symptom distribution to diagnose the source instead of relying on visible wall damage alone.
4. Repair the actual water source, then verify the result under the same supply conditions.
5. Observe gradual drying. Accumulated efflorescence, mold, and surface damage require separate cleanup.

Scenario 02A lets you inspect both the ceiling below and the base of an adjacent room wall. Cleaning or repainting the room-side surface does not close a membrane defect or stop water use. To compare source-repair results, stop floor use as prompted, complete the membrane repair, and restore the same usage conditions.

### Tools and Interpretation

| Tool | Simulated use |
| --- | --- |
| Moisture meter | Reads the grid state at the probe location on a wall, slab, or floor. |
| Infrared thermal view | Estimates surface temperature differences from moisture and environmental conditions; it is not a calibrated field instrument. |
| Drilling and PU injection | An educational repair workflow for Scenario 01; results depend on hole placement and crack connectivity. |
| Epoxy, gel, and waterproof coating | Each has material-specific limits and does not automatically replace pipe isolation or repair of an internal water source. |

### Getting Started

**Requirements:** Node.js, pnpm, and a WebGL-capable browser.

Install dependencies and start the development server:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed in the terminal. Create a production build with:

```sh
pnpm build
```

### Development and Validation

Run lint, type checking, simulation tests, and a production build:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Browser interaction tests require the development server to be running in another terminal:

```sh
pnpm test:browser
```

See the [validation guide](docs/VALIDATION.md) for test coverage and known limitations.

### Architecture

| Layer | Responsibility |
| --- | --- |
| Simulation | A TypeScript engine updates the single authoritative SimulationState on fixed time steps. |
| Tools | Converts mouse and touch input into validated simulation actions. |
| Renderer | Three.js and Canvas render state in the existing scene; rendering does not write back to physical state. |
| UI | The DOM presents tools, measurements, scenarios, controls, and diagnostic feedback. |

See the [architecture guide](docs/ARCHITECTURE.md) for module responsibilities, data flow, and model assumptions.

### Model and Safety Boundaries

This project is an educational simulation of diagnosis and cause and effect. It is not a field inspection instrument, structural analysis tool, or construction guide. Relative moisture, pressure, injection volume, time, and material response are not calibrated to field conditions. Do not treat them as regulations, product ratings, construction parameters, or engineering guarantees. Real drilling, injection, chemical use, and structural decisions require site-specific assessment, product documentation, applicable requirements, and qualified professionals.

### License and Third-Party Materials

The original simulator code, interface, and project documentation authored by Calvin Huang are licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use is not granted and requires separate permission from the rights holder. The license expressly permits certain charitable, educational, public research, public safety or health, environmental protection, and government organization uses regardless of funding source. If you need to exclude those uses, the standard terms may not fully match your requirement. The English LICENSE text is authoritative. This is a source-available, noncommercial project, not open source under the OSI definition.

AGENTS.md contains development guidance adapted from course materials and is expressly excluded from this project license; third-party course material remains with its respective rights holders. Third-party software and assets, including Three.js and Poly Haven materials, retain their own licenses. See [NOTICE](NOTICE) and the [third-party license inventory](THIRD-PARTY-NOTICES.md).

<a id="japanese"></a>
## 日本語

建物の漏水診断を、原因と結果のシミュレーションで学べます。水源、材料内の水分移動、表面損傷を追跡し、測定と水源側の補修によって診断を確認します。

**オンライン版：**[GitHub Pages でシミュレーターを開く](https://calvinhuangcm.github.io/home-pathology-simulator/)。

### 主な機能

| 機能 | 説明 |
| --- | --- |
| 因果関係に基づく含水シミュレーション | 水源、材料内の移動、ひび割れ、防水層、蒸発、累積損傷、補修効果をシミュレーション状態から計算します。含水率に乱数は使いません。 |
| 壁面と断面の表示 | 既存の Three.js シーンに壁面、材料層、含水分布、ひび割れ、補修状態を表示します。 |
| 診断ツール | 含水計、教材用の熱画像推定、穿孔、PU 注入、Epoxy、ゲル、表面防水、診断フィードバックを利用できます。 |
| 室内床面 | 独立した床材層、含水測定、時間制限付きの局所散水テスト、壁脚部との水分交換を備えています。 |
| 時間と言語の操作 | 一時停止、1×・5×・20×の速度変更に対応し、繁体字中国語、英語、日本語で表示できます。 |

### シナリオと実装状況

| シナリオ | 状況と内容 |
| --- | --- |
| 外壁ひび割れ | グリッドシミュレーション：降雨の浸入、ひび割れ内の移動、水源からずれた表面症状、測定、穿孔、PU 注入、段階的な乾燥。 |
| 浴室防水層の劣化 | グリッドシミュレーション：面状の散水が防水層の損傷部から床スラブに入り、階下の天井や隣室の壁脚へ移動します。表面清掃と水源側の補修を比較できます。 |
| 壁内の給湯管破損 | グリッドシミュレーション：加圧配管から水が流れ続け、破損箇所と異なる位置に症状が出ることがあります。止水、旧配管の隔離、新しい露出配管への接続後、給水を戻して検証します。 |
| 排水管の破損 | 新しいエンジンの診断シナリオ：排水イベント中に一つの枝管を時間限定で試験し、流量を確認してから補修方法を選びます。 |
| 複数の漏水 | 新しいエンジンの診断シナリオ：浴室防水層の劣化と排水管の破損が同時に発生し、それぞれ個別に試験・補修・検証します。 |
| 地下室の負水圧 | 新しいエンジンの診断シナリオ：地下水位から相対水圧を算出します。室内側の封止で見える漏水は減らせますが、外側の水源は止まりません。 |
| その他のシナリオ | 窓枠・窓台、配管漏水の罠、結露・高湿度、屋上・バルコニーの各シナリオには旧来のデモ処理が残っており、グリッド物理エンジンには未移行です。 |

### 推奨する操作手順

1. シナリオを選び、給水、使用イベント、シミュレーション時間の関係を観察します。
2. 含水計で湿潤部と乾燥部、異なる観察面を比較します。測定値はプローブ位置の状態を示します。
3. 表面の症状だけで決めず、含水の変化、使用イベント、症状の分布から水源を診断します。
4. 水源そのものを補修し、同じ給水条件で結果を検証します。
5. 水分が徐々に乾く様子を観察します。蓄積した白華、カビ、表面損傷は別途清掃や補修が必要です。

Scenario 02A では階下の天井と隣室の壁脚を切り替えて観察できます。室内側の清掃や塗り直しでは防水層の破損や継続中の散水は止まりません。水源補修を比較する場合は、画面の案内に従って床面の使用を止め、防水層を補修してから、同じ使用条件に戻してください。

### ツールと判定

| ツール | シミュレーション上の用途 |
| --- | --- |
| 含水計 | 壁、床スラブ、床面のグリッドからプローブ位置の状態を読み取ります。 |
| 赤外線サーマル表示 | 含水状態と環境条件から表面温度差を推定します。校正済みの現場測定器ではありません。 |
| 穿孔と PU 注入 | Scenario 01 の教材用補修フローです。効果は孔位置とひび割れの連結状態に応じて変わります。 |
| Epoxy、ゲル、防水塗膜 | 各材料の用途と制約に従って作用し、配管の隔離や内部水源の補修を代替しません。 |

### 利用方法

**必要環境：**Node.js、pnpm、WebGL 対応ブラウザー。

依存関係をインストールし、開発サーバーを起動します。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

ターミナルに表示されたローカル URL を開いてください。本番用ビルドは次のコマンドで作成できます。

```sh
pnpm build
```

### 開発と検証

Lint、型チェック、シミュレーションテスト、本番ビルドを実行します。

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

ブラウザー操作テストの実行中は、別のターミナルで開発サーバーを起動しておきます。

```sh
pnpm test:browser
```

テスト範囲と既知の制限は[検証ガイド](docs/VALIDATION.md)を参照してください。

### アーキテクチャ

| 層 | 責任 |
| --- | --- |
| Simulation | TypeScript エンジンが単一の SimulationState を固定時間ステップで更新します。 |
| Tools | マウスとタッチ操作を検証済みのシミュレーション操作に変換します。 |
| Renderer | Three.js と Canvas で既存シーンに状態を描画します。描画処理から物理状態を書き換えません。 |
| UI | DOM でツール、測定値、シナリオ、操作ボタン、診断結果を表示します。 |

モジュールの責任、データの流れ、モデルの前提については[アーキテクチャガイド](docs/ARCHITECTURE.md)を参照してください。

### モデルと安全に関する注意

本プロジェクトは診断と因果関係を学ぶためのシミュレーションです。現場用検査機器、構造解析ツール、施工ガイドではありません。相対含水値、圧力、注入量、時間、材料反応は現場条件に合わせて校正されていません。法令、製品定格、施工条件、工事保証として扱わないでください。実際の穿孔、注入、薬剤使用、構造判断には、現場条件、製品資料、適用要件、有資格専門家による評価が必要です。

### ライセンスと第三者素材

Calvin Huang が作成したオリジナルのシミュレーターコード、UI、プロジェクト文書は [PolyForm Noncommercial License 1.0.0](LICENSE) に基づきます。商用利用は許諾されておらず、権利者から別途許可を得る必要があります。ライセンスは、慈善、教育、公共研究、公共の安全または健康、環境保護、政府機関による一定の利用を、資金源にかかわらず明示的に許可しています。これらの利用も禁止したい場合、標準条項では要件に合わない可能性があります。英語版 LICENSE が正式な条文です。本プロジェクトは非商用条件付きのソース公開であり、OSI 定義のオープンソースではありません。

AGENTS.md には講義教材をもとにした開発指針が含まれるため、本プロジェクトのライセンス対象から明示的に除外されています。第三者教材の権利は各権利者に帰属します。Three.js、Poly Haven などの第三者ソフトウェアと素材には、それぞれのライセンスが適用されます。[NOTICE](NOTICE) と[第三者ライセンス一覧](THIRD-PARTY-NOTICES.md)を参照してください。
