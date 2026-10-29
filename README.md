# 壁癌模擬器 · Wall Pathology Simulator · 壁面劣化シミュレーター

[繁體中文](#traditional-chinese) · [English](#english) · [日本語](#japanese)

<a id="traditional-chinese"></a>
## 繁體中文

互動式建築滲漏診斷與修繕教學模擬器。使用者可觀察水分如何從不同來源進入牆體或樓板、沿材料與接縫移動、形成表面症狀，再透過量測與源頭修復驗證因果關係。

**線上體驗：**[壁癌模擬器 GitHub Pages](https://calvinhuangcm.github.io/home-pathology-simulator/)

本專案提供工程概念與診斷流程的教學模型，不是現場檢測儀器、結構分析工具或施工指引。模擬數值是相對教學尺度；現場判斷須依勘查結果、產品資料、當地規範與合格專業人員評估。

### 功能概覽

- **分層牆體與三維場景：**保留 Three.js 場景和操作方式，以網格狀態呈現水分、裂縫、防水層、損傷及修復材料。
- **因果式水分模擬：**來源供水、材質傳輸、裂縫連通、蒸散乾燥與累積損傷由同一模擬狀態更新；量測工具讀取探頭所在位置，不使用隨機讀值。
- **診斷工具：**含水率量測、熱像教學估算、鑽孔與 PU 注入，以及 Epoxy、凝膠、表面防水和修繕驗證等工具。
- **地板觀察：**提供獨立地板材質層、含水量測與有限時間的定點淋水測試。
- **時間控制：**可暫停及調整模擬速度，觀察供水、擴散、損傷、修復與乾燥的變化。
- **多語介面：**繁體中文、English、日本語；切換語言不會重置模擬進度。

### 情境

| 情境 | 模擬內容 |
| --- | --- |
| 外牆裂縫滲水 | 降雨入水、裂縫傳輸、牆內擴散、偏移的表面症狀、量測、鑽孔、PU 注入與逐步乾燥。 |
| 浴室防水層失效 | 面狀用水經破損防水層進入樓板，水分可移至樓下天花或相鄰房間牆腳；可比較表面整理與源頭防水修復。 |
| 熱水暗管破損 | 承壓管線持續供水，症狀位置可與破管位置不同；以關閥、隔離舊管、改接新管及恢復原供水條件驗證。 |
| 排水、多重漏水、地下室 | 依排水事件測試支管、多來源分別修復，並以情境水位表現地下室相對水壓。 |

外牆裂縫、浴室防水失效與熱水暗管破損已有分層網格模擬。其他可選情境仍有部分使用舊版展示邏輯；請以介面標示及[架構說明](docs/ARCHITECTURE.md)確認各情境的實作範圍。

### 開始使用

**線上版：**開啟上方 GitHub Pages 連結即可使用。首次載入需要網路連線；三維場景依賴支援 WebGL 的瀏覽器。

**本機開發：**需要 Node.js 與 pnpm。安裝依賴並啟動 Vite 開發伺服器：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

啟動後使用終端機顯示的網址開啟模擬器。建置正式版本：

```sh
pnpm build
```

### 開發驗證

```sh
pnpm lint
pnpm typecheck
pnpm test
```

瀏覽器互動測試需先在另一個終端機啟動 `pnpm dev`：

```sh
pnpm test:browser
```

各項測試範圍及已知限制記錄於[驗證說明](docs/VALIDATION.md)。

### 技術架構

- **Simulation:** TypeScript 模擬引擎以固定時間步更新唯一的 `SimulationState`。
- **Tools:** 滑鼠與觸控操作轉成經驗證的模擬動作。
- **Renderer:** Three.js 與 Canvas 將模擬狀態呈現在既有場景中；渲染不回寫物理狀態。
- **UI:** DOM 顯示工具、量測值、情境資訊、控制項與診斷回饋。

完整模組責任、資料流程與模型假設見[架構說明](docs/ARCHITECTURE.md)。專案驗證紀錄見[驗證說明](docs/VALIDATION.md)。

### 專業與安全界線

漏水症狀的位置不一定等於水源。清理壁癌、批土或表面塗裝不會停止持續供水；應先診斷來源，再選擇相符的源頭修復。鑽孔、注入、化學材料與結構判斷均可能涉及現場安全及專業風險，請勿將本模擬器當作施工參數或工程保證。

### 授權與第三方素材

本專案由 Calvin Huang 撰寫的原創程式碼、模擬器介面與專案文件，依 [PolyForm Noncommercial License 1.0.0](LICENSE) 授權。授權允許依條款作非商業用途、修改及散布；商業用途不在此授權範圍內，須另向權利人取得許可。授權原文另將慈善組織、教育機構、公共研究組織、公共安全或健康組織、環境保護組織及政府機關的使用列為允許用途，不因經費來源而改變。若你的要求是這些組織也不得在任何有資金往來的情況下使用，PolyForm 標準條款可能不完全符合，需另行擬定並審閱條款。法律條文以英文版 `LICENSE` 為準；本專案屬於「公開原始碼、限非商業使用」，不是 OSI 定義下的開源軟體。

`AGENTS.md` 含有依課程教材整理的開發指引，明確排除於本專案 PolyForm 授權範圍之外；其中第三方教材表達的權利仍屬各自權利人。第三方軟體與素材也保留各自授權，不因本專案使用 PolyForm 而改變。詳見 [`NOTICE`](NOTICE) 與[第三方授權清單](THIRD-PARTY-NOTICES.md)。網站建置時會將授權與聲明檔一併複製到 `dist/`，GitHub Pages 也提供授權連結。

<a id="english"></a>
## English

An interactive educational simulator for building leak diagnosis and repair. Explore how water enters walls and slabs from different sources, travels through materials and joints, and creates visible symptoms. Use measurements and source repairs to examine cause-and-effect relationships.

**Live demo:** [Wall Pathology Simulator on GitHub Pages](https://calvinhuangcm.github.io/home-pathology-simulator/)

This project teaches engineering concepts and diagnostic workflows. It is not a field inspection instrument, structural analysis tool, or construction guide. Simulation values use a relative teaching scale. Real-world decisions require site inspection, product documentation, applicable local requirements, and assessment by qualified professionals.

### Features

- **Layered walls and 3D scene:** Retains the Three.js scene and interaction model, with grid state for moisture, cracks, waterproofing, damage, and repair materials.
- **Causal moisture simulation:** Sources, material transport, crack connectivity, evaporation, drying, and cumulative damage update from one simulation state. Measurement tools read the probe location and do not use random readings.
- **Diagnostic tools:** Moisture measurements, educational thermal estimates, drilling and PU injection, plus Epoxy, gel, surface waterproofing, and repair verification.
- **Floor inspection:** Separate floor material layers, moisture measurements, and finite-duration spot water tests.
- **Time controls:** Pause or change simulation speed to observe supply, diffusion, damage, repair, and drying.
- **Multilingual interface:** Traditional Chinese, English, and Japanese. Changing languages does not reset simulation progress.

### Scenarios

| Scenario | Simulation |
| --- | --- |
| Exterior wall crack | Rain entry, crack transport, internal wall diffusion, offset surface symptoms, measurement, drilling, PU injection, and gradual drying. |
| Bathroom membrane failure | Area water use enters the slab through a damaged membrane and may reach the ceiling below or the base of an adjacent room wall. Compare surface cleanup with source-level membrane repair. |
| Concealed hot-water pipe failure | A pressurized pipe continues to supply water, and symptoms may appear away from the break. Close the valve, isolate the old pipe, connect a replacement route, then verify after restoring the original supply conditions. |
| Drainage, multiple leaks, and basement | Test drain branches during drainage events, repair multiple sources independently, and model relative basement water pressure from the scenario water level. |

Layered-grid simulations are implemented for the exterior crack, bathroom membrane failure, and concealed hot-water pipe scenarios. Some other selectable scenarios still use legacy demonstration logic. Check the interface labels and [architecture guide](docs/ARCHITECTURE.md) for the implementation status of each scenario.

### Getting Started

**Online:** Open the GitHub Pages link above. An internet connection is required for the initial page load. The 3D scene requires a WebGL-capable browser.

**Local development:** Requires Node.js and pnpm. Install dependencies and start the Vite development server:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed in the terminal. Build the production version with:

```sh
pnpm build
```

### Development Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
```

Browser interaction tests require `pnpm dev` to be running in another terminal:

```sh
pnpm test:browser
```

See the [validation guide](docs/VALIDATION.md) for test coverage and known limitations.

### Architecture

- **Simulation:** A TypeScript engine updates the single authoritative `SimulationState` on fixed time steps.
- **Tools:** Mouse and touch interactions become validated simulation actions.
- **Renderer:** Three.js and Canvas render simulation state in the existing scene; rendering does not write back to physical state.
- **UI:** The DOM presents tools, measurements, scenario information, controls, and diagnostic feedback.

See the [architecture guide](docs/ARCHITECTURE.md) for module responsibilities, data flow, and model assumptions. See the [validation guide](docs/VALIDATION.md) for project checks.

### Professional and Safety Boundaries

The visible location of water damage may differ from the source. Cleaning wall damage, applying putty, or repainting will not stop an active water source. Diagnose the source before selecting a source-level repair. Drilling, injection, chemicals, and structural assessment involve site-specific safety and professional risks; do not treat this simulator as a set of construction parameters or an engineering guarantee.

### License and Third-Party Materials

The original application code, simulator interface, and project documentation authored by Calvin Huang are licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). It permits use, modification, and redistribution for permitted noncommercial purposes under its terms. Commercial purposes are not granted by this license and require separate permission from the rights holder. The license also expressly permits use by charitable organizations, educational institutions, public research organizations, public safety or health organizations, environmental protection organizations, and government institutions regardless of funding source. If you intend to prohibit every funded or paid use by those organizations too, the standard PolyForm terms may not fully match that requirement and need separate legal review. The English `LICENSE` file is authoritative. This is a source-available, noncommercial project, not open source under the OSI definition.

`AGENTS.md` contains development guidance adapted from course materials and is expressly excluded from this project license; rights to any third-party course material remain with their respective owners. Third-party software and assets keep their own licenses, which are not changed by this project's PolyForm license. See [`NOTICE`](NOTICE) and the [third-party license inventory](THIRD-PARTY-NOTICES.md). The build copies these license and notice files into `dist/`, and GitHub Pages links to them.

<a id="japanese"></a>
## 日本語

建物の漏水診断と補修を学ぶためのインタラクティブなシミュレーターです。水がさまざまな水源から壁や床スラブに入り、材料や接合部を通って移動し、表面症状を生じる過程を観察できます。測定と水源の補修を通じて、原因と結果の関係を確認できます。

**オンライン版：**[GitHub Pages の壁面劣化シミュレーター](https://calvinhuangcm.github.io/home-pathology-simulator/)

本プロジェクトは、工学の概念と診断手順を学ぶためのモデルです。現場用の検査機器、構造解析ツール、施工手順書ではありません。シミュレーションの数値は相対的な教材用スケールです。実際の判断には、現場調査、製品資料、適用される地域の要件、および有資格の専門家による評価が必要です。

### 主な機能

- **層構成の壁と3Dシーン：**既存の Three.js シーンと操作方法を維持し、含水、ひび割れ、防水層、損傷、補修材をグリッド状態で表示します。
- **因果関係に基づく含水シミュレーション：**水源、材料内の移動、ひび割れの連結、蒸発・乾燥、累積損傷を単一のシミュレーション状態から更新します。測定ツールはプローブ位置の状態を読み取り、ランダムな測定値は使用しません。
- **診断ツール：**含水測定、教材用の熱画像推定、穿孔と PU 注入、Epoxy、ゲル、表面防水、補修後の検証を利用できます。
- **床面の調査：**独立した床材層、含水測定、時間制限付きの局所散水テストを備えています。
- **時間制御：**一時停止や時間倍率の変更により、給水、拡散、損傷、補修、乾燥の変化を観察できます。
- **多言語 UI：**繁体字中国語、英語、日本語に対応します。言語を切り替えてもシミュレーションの進行状況はリセットされません。

### シナリオ

| シナリオ | シミュレーション内容 |
| --- | --- |
| 外壁のひび割れ漏水 | 降雨による浸入、ひび割れ内の移動、壁内部の拡散、水源からずれた表面症状、測定、穿孔、PU 注入、段階的な乾燥を扱います。 |
| 浴室防水層の劣化 | 面状の散水が防水層の損傷部から床スラブに入り、階下の天井や隣室の壁脚へ移動する場合を扱います。表面清掃と水源側の防水補修を比較できます。 |
| 壁内の給湯管破損 | 加圧された配管から水が流れ続け、破損箇所とは異なる位置に症状が現れる場合を扱います。止水、旧配管の隔離、新しい配管経路への接続後、元の給水条件に戻して検証します。 |
| 排水、多重漏水、地下室 | 排水時に支管をテストし、複数の水源を個別に補修します。地下室ではシナリオの水位から相対的な水圧をモデル化します。 |

外壁ひび割れ、浴室防水層の劣化、壁内給湯管破損には層別グリッドシミュレーションを実装しています。選択できるその他のシナリオには、旧来のデモ表示を使うものがあります。各シナリオの実装状況は、画面の表示と[アーキテクチャガイド](docs/ARCHITECTURE.md)を確認してください。

### 利用方法

**オンライン版：**上記の GitHub Pages リンクを開いてください。初回表示にはインターネット接続が必要です。3D シーンには WebGL 対応ブラウザーが必要です。

**ローカル開発：**Node.js と pnpm が必要です。依存関係をインストールして Vite 開発サーバーを起動します。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

ターミナルに表示された URL を開いてください。本番用ビルドは次のコマンドで作成できます。

```sh
pnpm build
```

### 開発時の確認

```sh
pnpm lint
pnpm typecheck
pnpm test
```

ブラウザー操作テストを実行するには、別のターミナルで `pnpm dev` を起動しておきます。

```sh
pnpm test:browser
```

テスト範囲と既知の制限については[検証ガイド](docs/VALIDATION.md)を参照してください。

### アーキテクチャ

- **Simulation：**TypeScript のエンジンが、唯一の `SimulationState` を固定時間ステップで更新します。
- **Tools：**マウスとタッチ操作を検証済みのシミュレーション操作に変換します。
- **Renderer：**Three.js と Canvas で既存シーンに状態を描画します。描画処理から物理状態を書き換えません。
- **UI：**DOM でツール、測定値、シナリオ情報、操作ボタン、診断結果を表示します。

モジュールの責務、データの流れ、モデルの前提は[アーキテクチャガイド](docs/ARCHITECTURE.md)を、プロジェクトの検証記録は[検証ガイド](docs/VALIDATION.md)を参照してください。

### 専門性と安全に関する注意

水による症状の位置は、水源の位置と異なることがあります。壁面の清掃、パテ処理、再塗装では、継続中の水源は止まりません。まず水源を診断し、その水源に対する補修方法を選んでください。穿孔、注入、薬剤、構造判断には現場固有の安全面と専門上のリスクがあります。本シミュレーターを施工条件や工事保証として扱わないでください。

### ライセンスと第三者素材

Calvin Huang が作成した本プロジェクトのオリジナルコード、シミュレーター UI、プロジェクト文書は、[PolyForm Noncommercial License 1.0.0](LICENSE) の下で提供されます。条項に従う非商用目的での利用、改変、再配布が許可されます。商用目的はこのライセンスの許諾範囲外であり、権利者から別途許可を得る必要があります。また、慈善団体、教育機関、公共研究機関、公共安全・健康機関、環境保護団体、政府機関による利用は、資金源にかかわらず許可されると原文に定められています。これらの機関による資金提供・有償利用もすべて禁止したい場合、PolyForm の標準条項では要件を完全に満たさない可能性があり、別途条項の作成と確認が必要です。法的な本文は英語版の `LICENSE` が優先されます。本プロジェクトは「ソース公開・非商用」であり、OSI の定義におけるオープンソースではありません。

`AGENTS.md` には講義資料をもとに整理した開発ガイドが含まれるため、本プロジェクトの PolyForm ライセンスの対象外です。第三者の教材に関する権利は、それぞれの権利者に帰属します。第三者のソフトウェアや素材にも個別のライセンスが適用され、本プロジェクトの PolyForm ライセンスによって変更されません。[`NOTICE`](NOTICE) と[第三者ライセンス一覧](THIRD-PARTY-NOTICES.md)を参照してください。ビルド時にライセンスと通知ファイルを `dist/` にコピーし、GitHub Pages からも確認できます。
