export type Language = 'zh-Hant' | 'en' | 'ja';

const storageKey = 'wall-pathology-simulator.language';
const translations: Record<string, readonly [string, string]> = {
  '語言': ['Language', '言語'], '選擇語言': ['Choose language', '言語を選択'], '選擇操作工具': ['Choose a tool', 'ツールを選択'], '選擇鑽孔斜向': ['Choose drilling direction', '穿孔方向を選択'], '選擇鑽孔機外觀': ['Choose drill model', 'ドリルモデルを選択'], '選擇雨水顏色': ['Choose rain color', '雨水の色を選択'], '修繕進度': ['Repair progress', '補修の進行状況'], '目前作業進度': ['Current operation progress', '現在の作業進捗'], '場景視角與顯示': ['Scene view and display', 'シーン表示と視点'], '量測記錄目標': ['Measurement record target', '測定記録の対象'], '六層牆體水平切片': ['Six-layer wall cross-section', '壁体6層の断面'], '教學規則的符合程度，不是經校準的現場診斷機率。': ['Agreement with teaching rules; not a calibrated probability of a field diagnosis.', '教材ルールとの一致度であり、現場診断確率として校正された値ではありません。'],
  '壁癌模擬器': ['Wall Pathology Simulator', '壁面劣化シミュレーター'],
  '授權條款：PolyForm Noncommercial 1.0.0': ['License: PolyForm Noncommercial 1.0.0', 'ライセンス：PolyForm Noncommercial 1.0.0'], '著作權聲明': ['Copyright notice', '著作権表示'], '第三方素材授權': ['Third-party notices', '第三者素材のライセンス'],
  '建築漏水診斷與修繕模擬器：逐格水分擴散與 PU 止水': ['Building leakage diagnosis and repair simulator with cellular moisture diffusion and PU water stopping', 'セル状含水拡散とPU止水を扱う建物漏水診断・補修シミュレーター'],
  '電鑽使用內建程序模型': ['Using built-in procedural drill model', '内蔵プロシージャルドリルを使用'], 'Poly Haven Drill 01 載入中': ['Loading Poly Haven Drill 01', 'Poly Haven Drill 01 を読み込み中'], '外部模型＋貼圖已載入': ['External models and textures loaded', '外部モデルとテクスチャを読み込みました'], '外觀素材就緒：牆面貼圖與 Poly Haven Drill 01 電鑽模型已載入。': ['Visual assets ready: wall textures and the Poly Haven Drill 01 model are loaded.', '外観素材の準備完了：壁面テクスチャと Poly Haven Drill 01 モデルを読み込みました。'], '外部素材部分載入；未完成項目已回退到程序幾何。': ['Some external assets loaded; missing items use procedural geometry.', '一部の外部素材を読み込みました。未取得の項目はプロシージャル形状に切り替えました。'], '外部素材無法取得，已使用程序幾何與純色材質備援。': ['External assets are unavailable; procedural geometry and solid-color materials are being used.', '外部素材を取得できないため、プロシージャル形状と単色素材を使用しています。'],
  '室內水泥粉光': ['Interior cement finish', '室内モルタル仕上げ'], '磚牆夾層／空腔水路': ['Masonry cavity / water path', 'れんが壁の空隙／水みち'], '窗台排水層': ['Window sill drainage layer', '窓台の排水層'], '樓頂陽台防水層': ['Rooftop balcony waterproofing', '屋上バルコニー防水層'], '落水口': ['Drain outlet', '排水口'], '下層天花濕痕': ['Damp mark on ceiling below', '階下天井の湿痕'], '鑽孔機': ['Drill', 'ドリル'], '打針針頭': ['Injection packer', '注入プラグ'], '高壓灌注機': ['High-pressure injection pump', '高圧注入ポンプ'], '外部 glTF 材料桶': ['External glTF material tank', '外部glTF材料タンク'],
  '在牆面或地板拖曳自由塗刷防水': ['Drag over the wall or floor to apply waterproof coating', '壁面または床面をドラッグして防水材を塗布'],
  '壁癌模擬器 · 互動實驗室': ['Wall Pathology Simulator · Interactive Lab', '壁面劣化シミュレーター · インタラクティブ実験室'],
  '互動實驗室 · 找到水路，追蹤修復效果': ['Interactive Lab · Trace the water path and track repair results', 'インタラクティブ実験室 · 水みちを特定し、補修効果を追跡'],
  '本機程序素材就緒': ['Procedural assets ready', 'プロシージャル素材の準備完了'],
  'Poly Haven Drill 01 已載入': ['Poly Haven Drill 01 loaded', 'Poly Haven Drill 01 を読み込みました'],
  '分層含水模擬': ['Layered moisture simulation', '層別含水シミュレーション'],
  '教育模擬，不是施工規範': ['Educational simulation, not construction guidance', '教育用シミュレーションです。施工基準ではありません'],
  '操作流程': ['Workflow', '操作手順'], '1 — 6 快捷鍵': ['Hotkeys 1–6', 'ショートカット 1〜6'],
  '檢測': ['Inspect', '測定'], '鑽孔': ['Drill', '穿孔'], '塞針': ['Install packer', '注入プラグ取付'],
  '注入': ['Inject', '注入'], '驗證': ['Verify', '検証'], '塗刷': ['Coat', '塗布'],
  '鑽孔方向': ['Drill direction', '穿孔方向'], '45° 示範傾角': ['45° demo angle', '45°のデモ角度'],
  '↑ 上': ['↑ Up', '↑ 上'], '← 左': ['← Left', '← 左'], '↓ 下': ['↓ Down', '↓ 下'], '→ 右': ['→ Right', '→ 右'],
  '鑽孔機外觀': ['Drill model', 'ドリルモデル'], '內建程序模型': ['Built-in procedural model', '内蔵プロシージャルモデル'],
  'Poly Haven Drill 01（CC0）': ['Poly Haven Drill 01 (CC0)', 'Poly Haven Drill 01（CC0）'],
  '載入成功後以 Poly Haven Drill 01 進行灌注前鑽孔；塞針與注料仍使用止水針及灌注機。傾角與牆厚為教學示意值。': ['When loaded, Poly Haven Drill 01 is used for pre-injection drilling. Packer installation and material injection use the injection packer and pump. Angles and wall thickness are illustrative teaching values.', '読み込み後、注入前の穿孔に Poly Haven Drill 01 を使用します。プラグ取付と注入には止水プラグと注入ポンプを使用します。角度と壁厚は教材用の例示値です。'],
  'Poly Haven Drill 01（載入素材後可用）': ['Poly Haven Drill 01 (available after loading assets)', 'Poly Haven Drill 01（素材読み込み後に使用可能）'],
  '量測 0/2 · 孔位 0 · 塞針 0 · 注入 0': ['Measurements 0/2 · Holes 0 · Packers 0 · Injected 0', '測定 0/2 · 穿孔 0 · プラグ 0 · 注入 0'],
  '移動預覽濕度，點擊記錄；先量測基準濕度點，再測可疑點。': ['Move to preview moisture. Click to record; measure a baseline first, then a suspect area.', 'カーソル移動で含水状態を確認し、クリックで記録します。まず基準点を測り、次に疑わしい箇所を測定してください。'],
  '↶ 撤銷上一步': ['↶ Undo', '↶ 元に戻す'], '情境選擇': ['Scenarios', 'シナリオ選択'], '情境案例': ['Case studies', 'ケース'],
  '外牆裂縫、浴室防水、暗管、排水、多重漏水與地下室等情境使用分層含水引擎；其他情境仍為原型診斷展示。切換會重置進度。': ['Exterior cracks, bathroom waterproofing, concealed pipes, drains, multiple leaks, and basement cases use the layered moisture engine. Other cases remain legacy demonstrations. Changing cases resets progress.', '外壁ひび割れ、浴室防水、隠ぺい配管、排水管、複合漏水、地下室の各シナリオは層別含水エンジンを使用します。その他は旧式の診断デモです。シナリオを切り替えると進行状況がリセットされます。'],
  '窗框／窗台滲水': ['Window frame / sill leak', '窓枠・窓台からの漏水'], '雨水從開口與排水層進入牆體': ['Rain enters the wall through the opening and drainage layer', '開口部と排水層から雨水が壁内へ浸入'],
  '外牆裂縫滲水': ['Exterior wall crack leak', '外壁ひび割れからの漏水'], '逐格擴散 → PU 止水 → 乾燥': ['Cell diffusion → PU water stop → drying', 'セル拡散 → PU止水 → 乾燥'],
  '浴室防水失效': ['Bathroom membrane failure', '浴室防水層の劣化'], '樓下天花／外側牆腳': ['Ceiling below / exterior wall base', '階下の天井／隣室側の壁脚'],
  '熱水暗管破損': ['Concealed hot-water pipe failure', '壁内給湯管の破損'], '隔離舊管 → 改明管': ['Isolate old pipe → install exposed pipe', '旧配管を隔離 → 露出配管へ変更'],
  '排水管破損': ['Drain pipe failure', '排水管の破損'], '排水時漏水 → 局部修管': ['Leaks during drainage → local pipe repair', '排水時に漏水 → 部分補修'],
  '多重漏水': ['Multiple leaks', '複合漏水'], '防水層 + 排水管兩個來源': ['Two sources: membrane + drain pipe', '防水層と排水管の2つの水源'],
  '地下室負水壓': ['Basement negative-side pressure', '地下室の背面水圧'], '地下水壓 → 迎水側缺損': ['Groundwater pressure → defect on the water-facing side', '地下水圧 → 迎水面の防水欠損'],
  '管線漏水陷阱': ['Pipe leak diagnostic trap', '配管漏水の診断トラップ'], '高讀值不代表適合打針': ['A high reading does not mean injection is appropriate', '高い測定値でも注入補修が適切とは限りません'],
  '結露與高濕度': ['Condensation and high humidity', '結露と高湿度'], '分辨水氣問題與外牆漏水': ['Distinguish condensation from exterior leakage', '結露と外壁漏水を見分ける'],
  '樓頂陽台向下滲漏': ['Balcony leakage to the floor below', '屋上バルコニーから階下への漏水'], '雨水積在陽台，穿過樓板漏到下層天花': ['Rainwater ponds on the balcony, passes through the slab, and leaks onto the ceiling below', 'バルコニーにたまった雨水が床スラブを通り、階下の天井へ漏れます'],
  '環境控制': ['Environment', '環境設定'], '降雨強度': ['Rain intensity', '降雨強度'], '雨水顏色': ['Rain color', '雨水の色'], '↺ 預設顏色': ['↺ Default color', '↺ 初期色'],
  '套用到雨線、水滴、水路與滴水標記': ['Applied to rain streaks, drops, water paths, and leak markers', '雨筋、水滴、水みち、漏水マーカーに適用'],
  '側風／水壓': ['Crosswind / water pressure', '横風／水圧'], '時間倍率': ['Time scale', '時間倍率'],
  '⏸ 暫停模擬': ['⏸ Pause simulation', '⏸ シミュレーション一時停止'], '▶ 繼續模擬': ['▶ Resume simulation', '▶ シミュレーション再開'], '↺ 重置': ['↺ Reset', '↺ リセット'],
  '工具設定': ['Tools', 'ツール設定'], '水分儀模式': ['Moisture meter mode', '水分計モード'], '非針式：表面近場': ['Pinless: near-surface', '非接触式：表面付近'], '針式：局部插入': ['Pin type: local insertion', 'ピン式：局所挿入'],
  '材料模式': ['Material', '材料'], 'PU／聚氨酯：止水、柔性': ['PU / polyurethane: water stopping, flexible', 'PU／ポリウレタン：止水・柔軟'], '環氧樹脂：靜止裂縫、黏結': ['Epoxy: stable cracks, bonding', 'エポキシ：安定ひび割れ・接着'], '丙烯酸凝膠：細微通道、進階': ['Acrylate gel: fine channels, advanced', 'アクリルゲル：微細経路・上級'],
  '裂縫狀態': ['Crack state', 'ひび割れの状態'], '靜止': ['Stable', '安定'], '活動': ['Moving', '進行中'], '⌁ 測量基準濕度點': ['⌁ Measure baseline', '⌁ 基準含水率を測定'], '◈ 剖面視圖': ['◈ Section view', '◈ 断面表示'], '◈ 還原外觀': ['◈ Restore surface view', '◈ 表面表示に戻す'],
  '🔇 開啟滴水音': ['🔇 Enable dripping sound', '🔇 水滴音を有効化'], '🔊 關閉滴水音': ['🔊 Disable dripping sound', '🔊 水滴音を無効化'], '🏷 隱藏標籤': ['🏷 Hide labels', '🏷 ラベルを非表示'], '🏷 顯示標籤': ['🏷 Show labels', '🏷 ラベルを表示'],
  '載入其他外觀素材（選用）': ['Load optional visual assets', '追加の外観素材を読み込む（任意）'], 'Poly Haven · Drill 01': ['Poly Haven · Drill 01', 'Poly Haven · Drill 01'],
  '（Fernando Quinn，CC0）會自動載入並用於鑽孔游標；切到「鑽孔」後將游標移到牆面即可看見。灌注機為內建自製 3D 教學模型，依便攜式單液注漿泵的料斗、驅動馬達、壓力表與高壓管配置建模，非特定品牌產品；造型配置參考': ['(Fernando Quinn, CC0) loads automatically for the drilling cursor. Select “Drill” and move the cursor over the wall to see it. The injection pump is a custom-built 3D teaching model based on the hopper, drive motor, pressure gauge, and high-pressure hose of a portable single-component grouting pump; it is not a branded product. Its configuration references', '（Fernando Quinn、CC0）は穿孔カーソル用に自動で読み込まれます。「穿孔」を選び、壁面上にカーソルを移動すると表示されます。注入ポンプは、携帯型単液グラウトポンプのホッパー、駆動モーター、圧力計、高圧ホースを参考にした独自の3D教材モデルで、特定ブランドの製品ではありません。形状の参考資料：'],
  '專用化學注漿泵資料': ['dedicated chemical grouting pump specifications', '化学注入ポンプの製品資料'],
  '浴室 · 供水與源頭修繕': ['Bathroom · Water supply and source repair', '浴室 · 給水と水源の補修'], '源頭修復': ['Source repair', '水源の補修'], '觀察位置（不同房間）': ['Observation surface (different rooms)', '観察位置（別の部屋）'],
  '相鄰房間 · 浴室外側牆腳': ['Adjacent room · wall base outside bathroom', '隣室 · 浴室外側の壁脚'], '相鄰房間 · 室內地板': ['Adjacent room · interior floor', '隣室 · 室内床'], '樓下房間 · 天花底面': ['Room below · underside of ceiling', '階下の部屋 · 天井下面'],
  '淋浴／地坪用水': ['Shower / floor water use', 'シャワー／床面への散水'], '熱水供水閥開啟': ['Hot-water supply valve open', '給湯バルブ開'], '供水壓力': ['Supply pressure', '給水圧力'],
  '只清理／重塗目前室內濕損表面': ['Clean / repaint only the currently damaged interior surface', '現在の室内損傷面だけを清掃／再塗装'], '重作浴室防水與牆地交界': ['Renew bathroom waterproofing and wall-floor junction', '浴室防水層と壁・床取り合いを再施工'], '隔離舊暗管 → 接通新明管': ['Isolate old concealed pipe → connect new exposed pipe', '旧隠ぺい配管を隔離 → 新しい露出配管を接続'],
  '源頭修復後，恢復相同用水／壓力再選「驗證」。表面整修不會清除內部水分。施工與乾燥時間為壓縮教學尺度。': ['After source repair, restore the same water use / pressure and select “Verify.” Surface repairs do not remove moisture stored inside the wall. Work and drying times are compressed for teaching.', '水源の補修後、同じ使用水量／圧力に戻して「検証」を選んでください。表面補修では壁内に残った水分は除去されません。施工・乾燥時間は教材用に短縮しています。'],
  '源頭供水控制': ['Source and supply controls', '水源・給水の制御'], '來源修繕': ['Source repair', '水源の補修'], '操作／觀察表面': ['Operate / observe surface', '操作／観察面'], '室內牆面': ['Interior wall', '室内壁'], '浴室地坪／樓板': ['Bathroom floor / slab', '浴室床／床スラブ'],
  '浴室面狀用水': ['Bathroom area water supply', '浴室の面状給水'], '一般排水使用（所有漏水支管）': ['Normal drainage use (all leaking branches)', '通常排水（漏水中の全枝管）'], '測試／修復排水支管': ['Test / repair drain branch', '排水枝管の試験／補修'], '開始 20 秒單支管測試': ['Start 20-second single-branch test', '20秒の単一枝管試験を開始'], '中止支管測試': ['Stop branch test', '枝管試験を中止'], '地下水位相對高度': ['Relative groundwater level', '相対地下水位'],
  '修復防水層': ['Repair waterproofing layer', '防水層を補修'], '室內側負水壓封堵': ['Interior-side negative-pressure seal', '室内側の背面水圧止水'], '修復排水管': ['Repair drain pipe', '排水管を補修'], '只整修目前表面濕損': ['Repair only the currently damaged surface', '現在の損傷面だけを補修'],
  '室內地板 · 表面與含水': ['Interior floor · surface and moisture', '室内床 · 表面と含水'], '地磚／填縫 → 水泥砂漿找平層 → RC 樓板。含水數字讀取地板網格，為相對教學指標。': ['Tile / grout → cement mortar screed → RC slab. Moisture readings come from the floor grid and are relative teaching indicators.', 'タイル／目地 → セメントモルタル下地 → RC床スラブ。含水値は床グリッドから取得する教材用の相対指標です。'],
  '室內地板俯視': ['Interior floor plan view', '室内床の平面表示'], '返回牆面': ['Return to wall', '壁面に戻る'], '地板表面最高': ['Floor surface maximum', '床面の最大値'], '相對含水指標': ['Relative moisture indicator', '相対含水指標'], '地板各層平均': ['Floor layer average', '床各層の平均'], '實際入水通量': ['Current inflow', '現在の流入量'], '· 相對教學單位／秒': ['· relative teaching units/s', '· 相対教材単位／秒'], '定點淋水測試 · 5 秒': ['Spot water test · 5 sec', '定点散水試験 · 5秒'],
  '切換地板俯視後，可移動探頭量測。選擇淋水測試，再點擊地板放置測試位置。': ['Switch to the floor plan to measure with the probe. Select the water test, then click the floor to place it.', '床の平面表示に切り替えてプローブで測定します。散水試験を選び、床面をクリックして試験位置を設定してください。'],
  '⚠ 本工具將現場材料、壓力與水路簡化成可解釋的教學模型。實際鑽孔、注入、化學品與結構判斷，需依現場條件、產品資料與合格專業人員評估。': ['⚠ This tool simplifies materials, pressure, and water paths into an explanatory teaching model. Actual drilling, injection, chemical use, and structural decisions require on-site assessment, product documentation, and qualified professionals.', '⚠ 本ツールは材料・圧力・水みちを説明用の教材モデルとして簡略化しています。実際の穿孔、注入、薬剤使用、構造判断は現場条件・製品資料を確認し、有資格の専門家が評価してください。'],
  '漏水互動場景：點擊執行工具，拖曳旋轉，雙指縮放。也可透過右側孔位清單進行塞針與注入。': ['Interactive leak scene: click to use the selected tool, drag to rotate, and pinch to zoom. Packers and injection can also be operated from the port list.', '漏水のインタラクティブシーンです。クリックで選択中のツールを実行し、ドラッグで回転、ピンチで拡大縮小します。右側の孔リストからプラグ取付と注入も操作できます。'],
  '外牆裂縫／接縫滲水信心': ['Exterior crack / joint leakage confidence', '外壁ひび割れ／目地漏水の確信度'], '浴室防水層失效信心': ['Bathroom waterproofing failure confidence', '浴室防水層劣化の確信度'], '牆內熱水給水管破損信心': ['Concealed hot-water pipe failure confidence', '壁内給湯管破損の確信度'], '排水管或排水接頭破損信心': ['Drain pipe or joint failure confidence', '排水管・継手破損の確信度'], '地下水／負水壓滲入信心': ['Groundwater / negative-side pressure ingress confidence', '地下水／背面水圧の浸入に対する確信度'], '室內濕氣／表面結露信心': ['Indoor humidity / surface condensation confidence', '室内湿気／表面結露の確信度'],
  '正面定位': ['Front view', '正面表示'], '全景': ['Home view', '全体表示'], '陽台俯視': ['Balcony top view', 'バルコニー俯瞰'], '剖面': ['Section', '断面'], '檢測模式': ['Inspection mode', '測定モード'],
  '01 · 建立基準濕度點': ['01 · Measure baseline', '01 · 基準点を測定'], '點擊場景量測': ['Click scene to measure', 'シーンをクリックして測定'], '點擊場景測量': ['Click scene to measure', 'シーンをクリックして測定'], '停止注入': ['Stop injection', '注入停止'],
  '水路／濕區': ['Water path / wet area', '水みち／湿潤域'], '灌注材料': ['Injection material', '注入材'], '白華': ['Efflorescence', '白華'], '黴菌累積': ['Mold accumulation', 'カビの蓄積'], '拖曳旋轉 · 滾輪縮放 · 點擊執行目前工具': ['Drag to rotate · scroll to zoom · click to use the selected tool', 'ドラッグで回転 · ホイールで拡大縮小 · クリックで選択中のツールを実行'],
  '診斷證據與假設': ['Diagnostic evidence and hypotheses', '診断の根拠と仮説'], '記錄過程': ['Evidence log', '記録'], '先用量測與供水事件建立證據，再勾選可能來源並評估信心。提交前不顯示情境答案。': ['Build evidence from measurements and supply events, then select likely sources and set confidence. The case answer stays hidden until submission.', '測定と給水イベントから根拠を集め、可能性のある水源を選び確信度を設定してください。提出前はシナリオの正解を表示しません。'],
  '外牆裂縫／接縫滲水': ['Exterior crack / joint leakage', '外壁ひび割れ／目地からの漏水'], '浴室防水層失效': ['Bathroom waterproofing failure', '浴室防水層の劣化'], '牆內熱水給水管破損': ['Concealed hot-water supply pipe failure', '壁内給湯管の破損'], '排水管或排水接頭破損': ['Drain pipe or joint failure', '排水管または継手の破損'], '地下水／負水壓滲入': ['Groundwater / negative-side pressure ingress', '地下水／背面水圧による浸入'], '室內濕氣／表面結露': ['Indoor humidity / surface condensation', '室内湿気／表面結露'], '信心': ['Confidence', '確信度'], '提交診斷': ['Submit diagnosis', '診断を提出'], '清除選擇': ['Clear selection', '選択を解除'], '尚未提交診斷': ['No diagnosis submitted', '診断は未提出です'], '證據時間軸': ['Evidence timeline', '根拠のタイムライン'], '筆': ['events', '件'], '尚無事件；先進行量測或操作供水條件。': ['No events yet. Measure or change a water-supply condition first.', 'イベントはまだありません。測定するか、給水条件を変更してください。'],
  '模擬狀態': ['Simulation state', 'シミュレーション状態'], '室內地板 · 模擬狀態': ['Interior floor · simulation state', '室内床 · シミュレーション状態'],
  '從乾牆開始。以 20× 觀察約 1–3 分鐘模擬時間，再量測室內濕區。比例為教學指標。': ['Start with a dry wall. Use 20× and observe for about 1–3 simulated minutes, then measure the interior wet area. Values are teaching indicators.', '乾燥した壁から開始します。20倍速でシミュレーション時間を約1〜3分進めてから、室内の湿潤域を測定してください。数値は教材用の指標です。'],
  '從乾燥狀態開始，使用 20× 觀察 1–3 分鐘模擬時間。數字為相對含水指標。': ['Start dry and observe 1–3 simulated minutes at 20×. Values are relative moisture indicators.', '乾燥状態から開始し、20倍速でシミュレーション時間を1〜3分観察します。数値は相対含水指標です。'],
  '地磚／填縫 → 砂漿 → RC。定點淋水、牆腳交換與乾燥共用固定模擬時間。': ['Tile / grout → mortar → RC. Spot watering, wall-base exchange, and drying use the same fixed simulation clock.', 'タイル／目地 → モルタル → RC。定点散水、壁脚との水分交換、乾燥は同じ固定シミュレーション時間で進みます。'],
  'Injection Pressure': ['Injection pressure', '注入圧力'], 'Injection Volume': ['Injection volume', '注入量'], 'Material Expansion': ['Material expansion', '材料膨張倍率'], 'Leak Reduction': ['Leak reduction', '漏水低減率'], 'MPa · 教學尺度': ['MPa · teaching scale', 'MPa · 教材用スケール'], '本次累計': ['This operation total', '今回の累計'], '局部最大膨脹倍率': ['Maximum local expansion ratio', '局所最大膨張倍率'], '與相同雨勢未封堵比較': ['Compared with the same rainfall without sealing', '同じ降雨条件で未封止の場合との比較'],
  '已實作：來源分離、證據時間軸、多來源診斷信心、熱像判讀條件、PU／Epoxy／凝膠材料模型與局部塗刷。敲診與裂縫計仍待實作。': ['Implemented: source separation, evidence timeline, multi-source diagnosis confidence, thermal interpretation conditions, PU / epoxy / gel models, and local coating. Hammer sounding and crack-width measurement are still pending.', '実装済み：水源の分離、根拠タイムライン、複数水源の診断確信度、熱画像の判読条件、PU／エポキシ／ゲル材モデル、部分塗布。打診とひび割れ幅測定は未実装です。'],
  '🌡 開啟紅外線熱像': ['🌡 Enable thermal camera', '🌡 赤外線サーモカメラを開始'], '🌡 關閉紅外線熱像': ['🌡 Disable thermal camera', '🌡 赤外線サーモカメラを終了'], '熱像儀關閉': ['Thermal camera off', 'サーモカメラ停止中'], '熱像判讀條件（教學參數）': ['Thermal interpretation conditions (teaching parameters)', 'サーモ画像の判読条件（教材用パラメータ）'],
  '室內溫度': ['Indoor temperature', '室内温度'], '室外溫度': ['Outdoor temperature', '屋外温度'], '相對濕度': ['Relative humidity', '相対湿度'], '表面日照強度': ['Surface solar exposure', '表面の日射強度'], '掃描前受日照時間': ['Sun exposure before scan', '撮影前の日照時間'], '表面放射率': ['Surface emissivity', '表面放射率'], '反射環境溫度': ['Reflected ambient temperature', '反射環境温度'], '分': ['min', '分'],
  '熱像只呈現表面溫度異常的教學估算；溫差、日照、反射與濕度都可能混淆判讀，請搭配其他證據。': ['Thermal imaging shows an estimated surface-temperature anomaly for teaching only. Temperature difference, sunlight, reflections, and humidity can affect interpretation; use other evidence too.', 'サーモ画像は表面温度異常の教材用推定値です。温度差、日射、反射、湿度が判読に影響するため、他の根拠と併せて確認してください。'],
  'DEBUG · 顯示內部診斷資料': ['DEBUG · Show internal diagnostic data', 'DEBUG · 内部診断データを表示'], '診斷圖層': ['Diagnostic layer', '診断レイヤー'], 'Moisture Heatmap': ['Moisture heatmap', '含水ヒートマップ'], 'Water Flow': ['Water flow', '水流'], 'Crack Network': ['Crack network', 'ひび割れネットワーク'], 'Injection Material': ['Injection material', '注入材'], 'Leak Source': ['Leak source', '漏水源'], '水流箭頭為當前通量；PU 圖層為實際材料分布。': ['Arrows show current water flux; the PU layer shows the material distribution.', '矢印は現在の水分フラックスを示し、PUレイヤーは材料分布を表示します。'],
  '剖面觀察材質': ['Section material', '断面の材質'], '室內油漆': ['Interior paint', '室内塗装'], '批土': ['Skim coat', 'パテ'], '水泥砂漿': ['Cement mortar', 'セメントモルタル'], 'RC 混凝土': ['Reinforced concrete', '鉄筋コンクリート'], '防水層': ['Waterproofing layer', '防水層'], '外牆磁磚': ['Exterior tile', '外壁タイル'],
  '孔位與作業': ['Ports and operations', '注入口と作業'], '個孔位': ['ports', 'か所'], '鑽孔後可點選清單定位，再塞針、注入。': ['After drilling, select a port in the list to locate it, then install a packer and inject.', '穿孔後、一覧から注入口を選択して位置を確認し、プラグを取り付けて注入します。'],
  '修繕效果驗證': ['Repair verification', '補修効果の検証'], '同條件比較': ['Compare under the same conditions', '同条件で比較'], '現場狀態': ['Site status', '現場状態'], '目前漏水率': ['Current leak rate', '現在の漏水率'], '牆／天花最高含水': ['Maximum wall / ceiling moisture', '壁／天井の最大含水値'], '逐格模型 · 0–100%': ['Cell model · 0–100%', 'セルモデル · 0〜100%'], '白華累積': ['Accumulated efflorescence', '白華の蓄積'], '鹽分與乾濕循環': ['Salt and wet-dry cycles', '塩分と乾湿サイクル'], '持續潮濕指標': ['Persistent dampness indicator', '継続的な湿潤の指標'],
  '診斷建議': ['Diagnostic guidance', '診断ガイダンス'], '以量測與修繕結果判斷': ['Assess using measurements and repair results', '測定値と補修結果から判断'], '先建立同材質量測對照': ['First establish a same-material baseline', 'まず同じ材質で基準値を取る'], '規則符合度': ['Rule match', 'ルール適合度'], '測量讀值': ['Measurements', '測定値'], 'Meter reading': ['Meter reading', '計測値'], '記錄基準濕度點': ['Record baseline', '基準点を記録'], '記錄可疑點': ['Record suspect point', '疑わしい点を記録'], '基準濕度點': ['Baseline', '基準点'], '尚未建立': ['Not established', '未設定'], '可疑點': ['Suspect point', '疑わしい点'], '濕度 —': ['Moisture —', '含水 —'], '本情境的行動': ['Actions for this case', 'このシナリオの操作'], 'Next actions': ['Next actions', '次の操作'], '操作紀錄': ['Operation log', '操作ログ'], 'Event log': ['Event log', 'イベントログ'],
  '熱像儀 · 暗紫低溫 → 紅橘高溫 · 教學估算，請搭配現場量測': ['Thermal camera · dark purple = cooler → red/orange = warmer · estimate only; verify on site', 'サーモカメラ · 暗紫＝低温 → 赤・橙＝高温 · 教材用推定値。現場測定と併用'],
  '表面觀察 · 內部漏水源隱藏': ['Surface view · internal leak source hidden', '表面表示 · 壁内の漏水源は非表示'], '移動預覽濕度 · 點擊固定讀值 · 拖曳旋轉 · 滾輪／雙指縮放': ['Move to preview moisture · click to record · drag to rotate · scroll / pinch to zoom', '移動して含水状態を確認 · クリックで記録 · ドラッグで回転 · ホイール／ピンチで拡大縮小'],
  '已載入「外牆裂縫滲水」情境。': ['Loaded “Exterior wall crack leak” scenario.', '「外壁ひび割れからの漏水」シナリオを読み込みました。'], '提示：拖曳旋轉場景，滾輪縮放，點擊牆面執行目前工具。': ['Tip: drag to rotate, scroll to zoom, and click the wall to use the selected tool.', 'ヒント：ドラッグで回転、ホイールで拡大縮小、壁をクリックして選択中のツールを実行します。'],
  '本工具將現場材料、壓力與水路簡化成可解釋的教學模型。': ['This tool simplifies materials, pressure, and water paths into an explanatory teaching model.', '本ツールは材料・圧力・水みちを説明用の教材モデルとして簡略化しています。'],
  '未實作': ['Not implemented', '未実装'], 'surface': ['surface', '表面'],
  '相對入水流量': ['Relative inflow rate', '相対流入量'],
  '源頭修繕': ['Source repair', '水源の補修'], '先判斷裂縫是否活動，再決定柔性止水或剛性黏結；不要把材料當成萬用解。': ['Check whether the crack is moving before choosing flexible water stopping or rigid bonding. No material is a universal fix.', '柔軟な止水材か剛性接着材かを選ぶ前に、ひび割れが動いているかを確認してください。万能な材料はありません。'], '檢查裂縫原因': ['Inspect crack cause', 'ひび割れ原因を確認'],
  '雨水 → RC 水路 → 室內濕區 → PU 止水 → 緩慢乾燥': ['Rain → RC water path → interior wet area → PU water stop → gradual drying', '雨水 → RC内の水みち → 室内の湿潤域 → PU止水 → ゆっくり乾燥'],
  '排水管破損只在排水使用時有流量；地下室水位推導相對水壓。室內側封堵只降低表面出水，不會切斷外側水源。': ['A damaged drain pipe flows only during drainage use. Basement pressure is derived from groundwater level. Interior-side sealing reduces surface outflow but does not stop the external water source.', '排水管の破損は排水使用時にのみ流量が発生します。地下室の水圧は地下水位から算出します。室内側の止水は表面への流出を抑えますが、外側の水源は止まりません。'],
  '尚未開始定點淋水；地板數值來自目前模擬狀態。': ['No spot water test has started. Floor readings reflect the current simulation state.', '定点散水試験はまだ開始していません。床の測定値は現在のシミュレーション状態を反映しています。'],
  '牆腳與室內地板共享接點，水分依兩側含水差交換；表面受潮位置可能偏離漏水源。': ['The wall base and interior floor share an exchange boundary. Moisture moves according to the difference between both sides, so the visible wet area may be away from the leak source.', '壁脚と室内床は接続部を共有し、両側の含水差に応じて水分を交換します。表面の湿潤位置は漏水源から離れることがあります。'],
  '情境開始': ['Scenario started', 'シナリオ開始'], '已載入情境 crack；量測與事件會依模擬時間記錄。': ['Loaded scenario crack; measurements and events are recorded on the simulation clock.', 'シナリオ crack を読み込みました。測定値とイベントはシミュレーション時間で記録されます。'],
  '室內症狀可能遠離外側源頭。沿表面裂縫量測，鑽孔與灌注後比較相同降雨下的水流。白華與鼓包不會隨水分消失。': ['Interior symptoms may appear far from the exterior source. Measure along the surface crack, then compare flow under the same rainfall after drilling and injection. Efflorescence and paint blisters remain after moisture decreases.', '室内の症状は外側の水源から離れた位置に現れることがあります。表面ひび割いに沿って測定し、穿孔・注入後は同じ降雨条件で水流を比較してください。白華や塗膜の膨れは含水低下後も残ります。'],
  '確認裂縫是否已受控': ['Confirm the crack is stable', 'ひび割れが安定しているか確認'], '靜止且需要黏結的裂縫才適合討論環氧。': ['Epoxy is only a candidate for stable cracks that need bonding.', 'エポキシは、接着が必要な安定したひび割れに限り候補となります。'], '沿裂縫建立鑽孔，再固定針頭': ['Drill along the crack, then install a packer', 'ひび割いに沿って穿孔し、プラグを取り付ける'], '鑽孔要和牆內裂縫或空腔連通；位置不對，塞針後材料也填不進去。': ['The bore must connect to an internal crack or void. If the position is wrong, the material will not reach it even after installing a packer.', '穿孔は壁内のひび割れまたは空隙につながる必要があります。位置がずれていると、プラグを取り付けても材料は届きません。'], '塞針後再灌注驗證': ['Install the packer, inject, and verify', 'プラグ取付後に注入し、効果を検証'], '注入機會把材料沿連通路徑推入，之後觀察漏水率、濕度、白華和下一次環境事件。': ['The pump drives material through connected paths. Then observe leak rate, moisture, efflorescence, and the next environmental event.', 'ポンプで接続経路に材料を送り込みます。その後、漏水率、含水、白華、次の環境イベントを観察してください。'],
  '從 8% 乾牆開始。使用 20× 觀察雨水進入後，量測濕區與乾區。': ['Starting from a dry wall at 8%. Use 20× to observe rain ingress, then measure wet and dry areas.', '含水8％の乾燥壁から開始します。20倍速で雨水の浸入を観察し、湿潤部と乾燥部を測定してください。'],
  '牆體六層 · 高度 1.63 · 藍色為水分': ['Six wall layers · height 1.63 · blue indicates moisture', '壁体6層 · 高さ 1.63 · 青色は含水'], '0 分': ['0 min', '0分'], '1.75 · 水壓 0.42': ['1.75 · pressure 0.42', '1.75 · 水圧 0.42'],
  '從乾牆開始。使用 20× 觀察雨水進入後，量測濕區與乾區。': ['Start with a dry wall. Use 20× to observe rain ingress, then measure wet and dry areas.', '乾燥した壁から開始します。20倍速で雨水の浸入を観察し、湿潤部と乾燥部を測定してください。'],
  'Floor': ['Floor', '床'], 'Environment': ['Environment', '環境'], 'Instrument': ['Instrument', '計測器'], 'Source first': ['Source first', '水源を優先'], 'Live state': ['Live state', '現場状態'], 'Explainable rules': ['Explainable rules', '説明可能なルール'], 'Pause': ['Pause', '一時停止'],
  '量測濕區與乾區；依來源調整供水與修繕，再驗證乾燥趨勢。': ['Measure wet and dry areas. Adjust supply and repair based on the source, then verify the drying trend.', '湿潤部と乾燥部を測定します。水源に応じて給水条件と補修方法を調整し、乾燥傾向を検証してください。'],
  '老舊熱水暗管破損': ['Aging concealed hot-water pipe failure', '老朽化した壁内給湯管の破損'],
  '面狀用水 → 樓板滲透 → 樓下天花與相鄰牆腳': ['Area water use → slab penetration → ceiling below and adjacent wall base', '面状の水使用 → 床スラブへ浸透 → 階下天井と隣室の壁脚'], '面狀用水 → 防水破口 → 樓板內移動 → 樓下天花／相鄰牆腳。兩個觀察位置共用這組實際水路。': ['Area water use → membrane defect → migration through the slab → ceiling below / adjacent wall base. Both observation surfaces share this simulated water path.', '面状の水使用 → 防水層の欠損 → 床スラブ内を移動 → 階下天井／隣室の壁脚。両方の観察面は同じ水みちを共有します。'],
  '停止地坪用水，重作源頭防水，再恢復用水驗證。': ['Stop floor water use, renew waterproofing at the source, then restore water use to verify.', '床面への水使用を止め、水源となる防水層を再施工してから、同じ水使用条件に戻して検証してください。'], '重作防水': ['Renew waterproofing', '防水層を再施工'],
  '老舊熱水暗管破損。停止淋浴仍可能維持管內壓力；關閉供水與隔離破管才會停止持續入水。': ['A damaged aging hot-water pipe can remain pressurized after the shower is turned off. Close the supply valve and isolate the damaged pipe to stop ongoing ingress.', '老朽化した給湯管は、シャワーを止めても管内圧力が残ることがあります。給水バルブを閉じ、破損した旧管を隔離して初めて継続的な浸入が止まります。'],
  '停止淋浴不會卸除供水壓力；先關閥，再隔離破損舊管並接通明管。': ['Turning off the shower does not remove supply pressure. Close the valve, isolate the damaged pipe, and connect the exposed replacement pipe.', 'シャワーを止めても給水圧力は解除されません。バルブを閉じ、破損した旧管を隔離してから露出配管へ接続してください。'],
  '排水使用 → 管線裂口 → 牆內擴散 → 局部修管': ['Drain use → pipe opening → spread inside wall → local pipe repair', '排水使用 → 配管の破損箇所 → 壁内へ拡散 → 部分補修'], '地下水壓 → 迎水側防水缺損 → 牆腳受潮': ['Groundwater pressure → water-facing waterproofing defect → damp wall base', '地下水圧 → 迎水面の防水欠損 → 壁脚の湿潤'],
  '浴室防水失效 + 排水管破損 · 兩個來源獨立運作': ['Bathroom membrane failure + damaged drain pipe · two independent sources', '浴室防水層の劣化＋排水管破損 · 独立した2つの水源'], '帶壓暗管 → 牆內移動 → 牆腳濕損 → 隔離舊管／改明管': ['Pressurized concealed pipe → migration inside wall → damp wall base → isolate old pipe / install exposed pipe', '加圧された隠ぺい配管 → 壁内を移動 → 壁脚の湿損 → 旧管を隔離／露出配管へ変更'],
  '外牆裂縫供水': ['Exterior crack water supply', '外壁ひび割れへの給水'], '觀察雨水如何進入牆內排水層': ['Observe how rain enters the wall drainage layer', '雨水が壁内の排水層に入る様子を観察'], '高讀值不代表牆面裂縫適合打針': ['A high reading does not mean wall injection is appropriate', '高い測定値でも壁面への注入補修が適切とは限りません'], '觀察雨水積在陽台後，穿過樓板往下層天花滲漏': ['Observe rain ponding on the balcony, passing through the slab, and leaking onto the ceiling below', 'バルコニーにたまった雨水が床スラブを通り、階下の天井へ漏れる様子を観察'],
  '先修正窗台排水與泛水路徑；只補表面膠可能把水封在牆內。': ['Correct the sill drainage and flashing path first; surface caulking alone can trap water inside the wall.', 'まず窓台の排水と水切り経路を補修してください。表面だけのシーリングでは壁内に水を閉じ込めることがあります。'], '修正窗台排水': ['Correct sill drainage', '窓台の排水を補修'], '修正陽台排水': ['Correct balcony drainage', 'バルコニー排水を補修'], '檢修管線': ['Inspect pipework', '配管を点検'], '通風除濕': ['Ventilate and dehumidify', '換気・除湿'],
  '目前情境的牆面尚未接入地板水路。地板仍以獨立網格模擬定點淋水、擴散與乾燥，讀值來自實際狀態。': ['The wall in this case is not yet coupled to the floor water path. The floor still has an independent grid for spot watering, diffusion, and drying; readings come from its current state.', 'このシナリオの壁は床の水みちにまだ接続されていません。床は独立グリッドで定点散水、拡散、乾燥を模擬し、測定値は実際の状態から取得します。'],
  '先停止一般排水，再選一支管做有限時間測試；其他支管保持停用。觀察來源通量與延遲後的濕度變化，再決定是否修復。': ['Stop normal drainage, then test one branch for a limited time while all others remain off. Compare source flow with the delayed moisture response before deciding on a repair.', '通常排水を止めてから、他の枝管を停止したまま1本だけを時間限定で試験します。水源流量と遅れて現れる含水変化を比較して補修方法を判断してください。'],
  '多重漏水：浴室防水層失效與排水管破損同時存在；可分別測試與修復排水支管，並在相同事件下驗證各來源。': ['Multiple leaks: bathroom waterproofing failure and a damaged drain pipe occur together. Test and repair the drain branch independently, then verify both sources under the same events.', '複合漏水：浴室防水層の劣化と排水管の破損が同時に発生します。排水枝管を個別に試験・補修し、同じイベント条件で各水源を検証してください。'],
  '地下室負水壓：調整地下水位會推導相對水壓；觀察迎水側缺損與室內牆腳／牆地交界。室內側封堵會保留外側入水，觀察重點是內部儲水與表面出水的差異。': ['Basement negative-side pressure: relative pressure is derived from groundwater level. Observe the water-facing defect and interior wall base / wall-floor junction. Interior sealing leaves the external source active; compare stored moisture with surface outflow.', '地下室の背面水圧：地下水位から相対水圧を算出します。迎水面の欠損と室内側の壁脚・壁床取り合いを観察してください。室内側の止水後も外側の水源は続くため、内部の貯留水分と表面流出の違いを確認します。'],
  '依量測與供水事件判斷來源；記錄症狀面、時間變化和修繕後的同條件驗證。': ['Use measurements and supply events to identify the source. Record the symptom surface, changes over time, and verification under the same conditions after repair.', '測定値と給水イベントから水源を判断します。症状のある面、時間変化、補修後の同条件検証を記録してください。'],
  '持續供水與表面症狀分開驗證': ['Verify ongoing supply and surface symptoms separately', '継続する給水と表面症状を分けて検証'], '表面重塗不能解除持續供水': ['Repainting the surface cannot stop ongoing supply', '表面の再塗装では継続給水を止められません'], '表面重塗不會清除牆內水分，也不會關閉漏水源。': ['Repainting does not remove moisture inside the wall or shut off the leak source.', '表面を塗り直しても壁内の水分や漏水源はなくなりません。'], '恢復供水後驗證': ['Restore supply and verify', '給水を戻して検証'], '相同條件下確認通量下降，再持續追蹤乾燥。': ['Confirm reduced flow under the same conditions, then continue tracking drying.', '同条件で流量の低下を確認し、その後も乾燥を追跡してください。'], '對照樓下天花與相鄰牆腳；停止地坪用水只能暫時中斷供水。重作防水後恢復相同用水再驗證。兩種觀察位置要分別建立同表面乾濕對照。': ['Compare the ceiling below with the adjacent wall base. Stopping floor water use only pauses supply temporarily. Renew waterproofing, restore the same water use, and verify again. Establish separate same-surface baselines for both observation areas.', '階下天井と隣室の壁脚を比較してください。床面への水使用を止めても一時的に給水が止まるだけです。防水層を再施工した後、同じ水使用条件に戻して検証します。観察面ごとに同一面の乾湿基準を取ってください。'],
  '天花和牆面分別量測，切換觀察面後重建對照。': ['Measure the ceiling and wall separately; rebuild the baseline after switching surfaces.', '天井と壁面は別々に測定し、観察面を切り替えたら基準値を取り直してください。'], '比較表面整修與源頭修復': ['Compare surface work with source repair', '表面補修と水源の補修を比較'], '建立同表面乾濕對照': ['Establish a same-surface wet/dry baseline', '同じ表面で乾湿の基準を取る'],
  '結露通常先處理環境，不是打針問題。': ['Condensation is usually an environmental issue, not an injection repair problem.', '結露は通常、注入補修ではなく環境側の問題です。'], '先檢查空氣濕度與表面溫度': ['Check indoor humidity and surface temperature first', 'まず室内湿度と表面温度を確認'], '比較基準濕度點與冷表面': ['Compare the baseline with the cold surface', '基準値と低温面を比較'], '針式或非針式讀值都要搭配材質與位置解讀。': ['Interpret pin and pinless readings in context of the material and location.', 'ピン式・非接触式のどちらも、材質と位置を踏まえて解釈してください。'], '不要封住需要乾燥的表面': ['Do not seal a surface that needs to dry', '乾燥が必要な面を塞がないでください'], '過早封膜可能把水氣困在牆內。': ['Sealing too early can trap moisture inside the wall.', '早すぎる被膜は壁内に水分を閉じ込めることがあります。'],
  '確認窗台泛水與排水層': ['Check sill flashing and drainage layer', '窓台の水切りと排水層を確認'], '把水導向室外；不要用表面密封取代排水。': ['Direct water outdoors; surface sealant is not a substitute for drainage.', '水を屋外へ導いてください。表面シーリングで排水の代わりにはなりません。'], '建立基準濕度點，再測可疑區域': ['Measure a baseline, then test the suspect area', '基準点を測定してから疑わしい箇所を測る'], '同材質對照比單一數值更可靠，還要注意鹽分和金屬干擾。': ['A same-material comparison is more reliable than one reading; also consider salt and metal interference.', '同じ材質での比較は単独の数値より信頼できます。塩分や金属の影響にも注意してください。'], '不要把灌注當成窗框萬用解': ['Do not treat injection as a universal window-frame fix', '窓枠の問題に注入を万能策として使わない'], '窗框開口的核心是排水與泛水細部。': ['The key details around a window opening are drainage and flashing.', '窓開口部では排水と水切りの納まりが重要です。'],
  '先定位與檢修管線': ['Locate and inspect the pipe first', 'まず配管の位置を特定して点検'], '不建議用牆面灌注取代管線更換。': ['Wall injection is not a substitute for replacing a damaged pipe.', '壁面への注入補修は破損配管の交換に代わるものではありません。'], '用水分儀建立濕區範圍': ['Map the wet area with the moisture meter', '水分計で湿潤範囲を把握'], '把讀值用來追蹤濕區，不把它當作自動判定。': ['Use readings to track the wet area, not as an automatic diagnosis.', '測定値は湿潤範囲の追跡に使い、自動診断の根拠にしないでください。'], '避免表面遮蔽症狀': ['Avoid concealing surface symptoms', '表面症状を隠さない'], '錯誤注入可能讓表面暫時變乾，但管線仍在漏。': ['Incorrect injection may dry the surface temporarily while the pipe continues to leak.', '誤った注入で表面が一時的に乾いても、配管の漏水は続くことがあります。'],
  '先清理落水口、確認坡度': ['Clear the drain and check the slope first', 'まず排水口を清掃し、勾配を確認'], '雨水應往落水口排走，不應長時間積在陽台防水層上。': ['Rain should drain toward the outlet rather than ponding on the balcony membrane.', '雨水は排水口へ流し、バルコニー防水層の上に長時間ためないでください。'], '從樓板下方建立基準濕度點與可疑點': ['Measure baseline and suspect points from below the slab', '床スラブ下面で基準点と疑わしい点を測定'], '把上層積水、落水口位置與下層天花讀值互相對照。': ['Compare ponding above and drain location with readings on the ceiling below.', '上階の滞水、排水口の位置、階下天井の測定値を照合してください。'], '塞針後再作室內局部灌注': ['After installing a packer, demonstrate local interior injection', 'プラグ取付後、室内側の局所注入を試す'], '若針頭碰到樓板水路，可以觀察局部止水；真正源頭仍要回到陽台防水與排水。': ['If the packer reaches the slab water path, observe local water stopping; the source still requires balcony waterproofing and drainage repair.', 'プラグが床スラブ内の水みちに届けば局所止水を観察できますが、水源の補修にはバルコニー防水と排水の修復が必要です。'],
  '查看供水與源頭修繕': ['View supply and source repairs', '給水・水源の補修を確認'], '水分儀的單一數字不能直接證明漏水。請先在同材質、未受影響的位置建立基準濕度讀值。': ['A single moisture-meter reading does not prove a leak. First record a baseline on the same material in an unaffected area.', '水分計の単一値だけでは漏水を証明できません。まず、影響のない同じ材質の場所で基準値を記録してください。'], '目前觀察': ['Current observation', '現在の観察'],
  '先建立基準濕度點': ['Measure a baseline first', 'まず基準点を測定'], '源頭通量已下降，觀察乾燥': ['Source flow has decreased; track drying', '水源流量が低下しました。乾燥を追跡してください'], '高讀值可能來自牆內管線': ['A high reading may come from concealed pipework', '高い測定値は壁内配管が原因の可能性があります'], '目前更像結露而非外牆裂縫': ['This looks more like condensation than an exterior wall crack', '外壁ひび割れより結露の可能性が高そうです'],
  '先處理樓頂陽台積水與防水層': ['Address ponding and waterproofing on the rooftop balcony first', 'まず屋上バルコニーの滞水と防水層を補修'], '優先檢查窗台泛水與外牆排水層': ['Check sill flashing and exterior wall drainage first', 'まず窓台の水切りと外壁排水層を確認'], '先建立基準濕度點，再量測可疑區域': ['Record a baseline, then measure the suspect area', '基準点を記録してから疑わしい箇所を測定'], '已塞入打針針頭': ['Packers installed', '注入プラグ取付済み'], '已有初步對照': ['A preliminary baseline is available', '暫定基準を記録済み'],
  '驗證完成，右側可查看前後比較。': ['Verification complete. Compare before and after on the right.', '検証完了。右側で補修前後を比較できます。'], '取得至少兩個同材質的讀值，再比較基準與可疑區。': ['Take at least two readings on the same material, then compare the baseline and suspect area.', '同じ材質で少なくとも2点を測定し、基準点と疑わしい箇所を比較してください。'],
  '相鄰房間 · 浴室外側牆腳 · 內部漏水源隱藏': ['Adjacent room · wall base outside bathroom · internal leak source hidden', '隣室 · 浴室外側の壁脚 · 壁内の漏水源は非表示'],
  '地坪面狀用水 → 防水破口 → 樓板內移動 → 樓下天花／相鄰牆腳。兩個觀察位置共用這組實際水路。': ['Floor area water use → membrane defect → migration through the slab → ceiling below / adjacent wall base. Both observation surfaces share this simulated water path.', '床面への面状給水 → 防水層の欠損 → 床スラブ内を移動 → 階下天井／隣室の壁脚。両方の観察面は同じ水みちを共有します。'],
  '防水層尚未重作': ['Waterproofing not renewed', '防水層は未再施工'],
  '停止淋浴仍可能帶壓漏水。先關供水閥，隔離舊管並改明管，再開閥驗證；只關閥不能算完成修復。': ['The concealed pipe can still leak under pressure after the shower stops. Close the supply valve, isolate the old pipe, install an exposed replacement, then reopen the valve to verify. Closing the valve alone is not a completed repair.', 'シャワーを止めても壁内配管は加圧状態で漏水することがあります。給水バルブを閉じ、旧管を隔離して露出配管に変更してから、バルブを開いて検証してください。バルブを閉じるだけでは補修完了ではありません。'],
  '先開啟檢修與管線定位流程；牆面灌注可能只遮住症狀。': ['Start the pipe inspection and locating workflow. Wall injection may only mask the symptom.', '配管の点検・位置特定から始めてください。壁面への注入は症状を隠すだけの可能性があります。'],
  '先通風、除濕與檢查表面溫度；結露不是裂縫灌注問題。': ['Improve ventilation and dehumidification, and check the surface temperature first. Condensation is not a crack-injection problem.', 'まず換気・除湿を行い、表面温度を確認してください。結露はひび割れへの注入補修の問題ではありません。'],
  '先清理落水口、確認陽台坡度與防水層；下層天花的濕痕通常只是結果，不是源頭。': ['Clear the drain and check the balcony slope and waterproofing first. Damp marks on the ceiling below are usually symptoms, not the source.', 'まず排水口を清掃し、バルコニーの勾配と防水層を確認してください。階下天井の湿痕は通常、結果であって水源ではありません。'],
  '儀器不同，不能直接比較': ['Different meters cannot be compared directly', '異なる計器の値は直接比較できません'], '表面材質不同，不能直接比較': ['Different surface materials cannot be compared directly', '表面材質が異なる値は直接比較できません'], '在可疑區域測量，並把讀值與同材質的基準濕度點比較。': ['Measure the suspect area and compare it with a baseline on the same material.', '疑わしい箇所を測定し、同じ材質の基準点と比較してください。'], '兩個讀值使用不同儀器，請重新建立同儀器對照。': ['The two readings use different meters. Re-establish a comparison with the same meter.', '2つの測定値で計器が異なります。同じ計器で測定し直してください。'],
  '現在應讓時間前進，確認雨水是否仍能進入牆內；表面濕度不會瞬間歸零。': ['Advance simulation time to see whether rain still enters the wall. Surface moisture will not drop to zero instantly.', '時間を進めて、雨水が壁内に浸入し続けるか確認してください。表面の含水は瞬時にゼロにはなりません。'], '管線源頭已處理，接下來要等牆體乾燥，再判斷是否仍有其他水路。': ['The pipe source has been addressed. Let the wall dry, then check for any other water paths.', '配管の水源は補修済みです。壁が乾くのを待ってから、他の水みちが残っているか確認してください。'], '如果注入點沒有接觸裂縫或空腔，灌注只會遮住表面症狀，不能修好破裂管線。': ['If the injection point does not reach a crack or void, injection only masks the surface symptom and cannot repair a broken pipe.', '注入位置がひび割れや空隙に接続していなければ、表面症状を隠すだけで破損配管は直りません。'],
  '如果雨後上層陽台積水、下層天花同步升濕，應先查坡度、落水口與防水層，不能只在室內表面封膠。': ['If rain ponds on the upper balcony while the ceiling below gets wetter, inspect the slope, drain, and waterproofing first. Interior surface sealant is not enough.', '雨後に上階バルコニーに水がたまり、階下天井の含水も上がる場合は、勾配・排水口・防水層を先に確認してください。室内表面のシーリングだけでは不十分です。'], '可疑區域若與冷表面和室內高濕度一致，應先改善通風、除濕或隔熱。': ['If the suspect area aligns with a cold surface and high indoor humidity, improve ventilation, dehumidification, or insulation first.', '疑わしい箇所が低温面や室内高湿度と一致する場合は、まず換気・除湿・断熱を改善してください。'],
};

const languageSelect = (): HTMLSelectElement | null => document.querySelector<HTMLSelectElement>('#languageSelect');
const validLanguage = (value: unknown): value is Language => value === 'zh-Hant' || value === 'en' || value === 'ja';
let language: Language = 'zh-Hant';
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
let observer: MutationObserver | null = null;
let applyingLocale = false;

function safeReadLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return validLanguage(stored) ? stored : 'zh-Hant';
  } catch {
    return 'zh-Hant';
  }
}

function resolveTranslation(source: string, target: Language): string {
  if (target === 'zh-Hant') return source;
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  const core = source.slice(leading.length, source.length - trailing.length || undefined);
  if (core !== source) return `${leading}${resolveTranslation(core, target)}${trailing}`;
  if (!core) return source;
  const exact = translations[core];
  if (exact) return exact[target === 'en' ? 0 : 1];

  const patterns: Array<[RegExp, (match: RegExpExecArray) => string]> = [
    [/^量測 (\d+)\/2 · 孔位 (\d+) · 塞針 (\d+) · 注入 (\d+)$/, m => target === 'en' ? `Measurements ${m[1]}/2 · Holes ${m[2]} · Packers ${m[3]} · Injected ${m[4]}` : `測定 ${m[1]}/2 · 穿孔 ${m[2]} · プラグ ${m[3]} · 注入 ${m[4]}`],
    [/^模擬 (\d+s)$/, m => target === 'en' ? `Sim ${m[1]}` : `模擬 ${m[1]}`],
    [/^已載入「(.+)」情境。$/, m => target === 'en' ? `Loaded “${resolveTranslation(m[1], target)}” scenario.` : `「${resolveTranslation(m[1], target)}」シナリオを読み込みました。`],
    [/^切換情境：(.+)$/, m => target === 'en' ? `Scenario changed: ${resolveTranslation(m[1], target)}` : `シナリオを切り替えました：${resolveTranslation(m[1], target)}`],
    [/^Scenario changed: (.+)$/, m => target === 'en' ? `Scenario changed: ${resolveTranslation(m[1], target)}` : `シナリオを切り替えました：${resolveTranslation(m[1], target)}`],
    [/^Loaded “(.+)” scenario\.$/, m => target === 'en' ? `Loaded “${resolveTranslation(m[1], target)}” scenario.` : `「${resolveTranslation(m[1], target)}」シナリオを読み込みました。`],
    [/^#(\d+) (待驗證|鑽孔中|連通|偏離) · (已塞針|待塞針) · (\d+%)$/, m => target === 'en' ? `#${m[1]} ${({ 待驗證: 'verify', 鑽孔中: 'drilling', 連通: 'connected', 偏離: 'off path' } as Record<string,string>)[m[2]]} · ${m[3] === '已塞針' ? 'packer installed' : 'packer pending'} · ${m[4]}` : `#${m[1]} ${{ 待驗證: '要検証', 鑽孔中: '穿孔中', 連通: '水みちに接続', 偏離: '水みちから外れ' }[m[2]]} · ${m[3] === '已塞針' ? 'プラグ取付済み' : 'プラグ未取付'} · ${m[4]}`],
    [/^(\d+) 個孔位$/, m => target === 'en' ? `${m[1]} ports` : `${m[1]}か所`],
    [/^(\d+) 筆$/, m => target === 'en' ? `${m[1]} events` : `${m[1]}件`],
    [/^熱像估算 ([\d.]+)°C$/, m => target === 'en' ? `Thermal estimate ${m[1]}°C` : `熱画像推定 ${m[1]}°C`],
    [/^顯示高風險|^顯示 DEBUG$/, () => source],
    [/^模型平均 ([\d.]+)% · 表面最高 ([\d.]+)% · 請量測同材質乾區與濕區，追蹤變化。$/, m => target === 'en' ? `Model average ${m[1]}% · surface maximum ${m[2]}% · Measure a dry and wet area of the same material and track the change.` : `モデル平均 ${m[1]}％ · 表面最大 ${m[2]}％ · 同じ材質の乾燥部と湿潤部を測定し、変化を追跡してください。`],
    [/^模擬平均 ([\d.]+)% · 表面最高 ([\d.]+)% · (.+)$/, m => target === 'en' ? `Model average ${m[1]}% · surface maximum ${m[2]}% · ${resolveTranslation(m[3], target)}` : `モデル平均 ${m[1]}％ · 表面最大 ${m[2]}％ · ${resolveTranslation(m[3], target)}`],
    [/^地板表面最高 ([\d.]+)% · 各層平均 ([\d.]+)% · 入水通量 ([\d.]+)（相對值）。$/, m => target === 'en' ? `Floor surface max ${m[1]}% · layer average ${m[2]}% · inflow ${m[3]} (relative).` : `床面最大 ${m[1]}％ · 各層平均 ${m[2]}％ · 流入量 ${m[3]}（相対値）。`],
    [/^地坪用水(開啟|停止) · 樓板入滲通量 ([\d.]+)（教學尺度）$/, m => target === 'en' ? `Floor water use ${m[1] === '開啟' ? 'on' : 'off'} · slab inflow ${m[2]} (teaching scale)` : `床面への散水${m[1] === '開啟' ? '中' : '停止'} · 床スラブ流入量 ${m[2]}（教材用スケール）`],
    [/^表面最高 ([\d.]+)% · 各層平均 ([\d.]+)% · 入水通量 ([\d.]+)（相對值）。$/, m => target === 'en' ? `Surface max ${m[1]}% · layer average ${m[2]}% · inflow ${m[3]} (relative).` : `表面最大 ${m[1]}％ · 各層平均 ${m[2]}％ · 流入量 ${m[3]}（相対値）。`],
    [/^目前漏水率 (.+)$/, m => target === 'en' ? `Current leak rate ${m[1]}` : `現在の漏水率 ${m[1]}`],
    [/^模擬 ([\d.]+)% · 表面最高 ([\d.]+)% · (.+)$/, m => target === 'en' ? `Model average ${m[1]}% · surface maximum ${m[2]}% · ${resolveTranslation(m[3], target)}` : `モデル平均 ${m[1]}％ · 表面最大 ${m[2]}％ · ${resolveTranslation(m[3], target)}`],
    [/^([\d.]+) · 水壓 ([\d.]+)$/, m => target === 'en' ? `${m[1]} · pressure ${m[2]}` : `${m[1]} · 水圧 ${m[2]}`],
    [/^已載入情境 (.+)；量測與事件會依模擬時間記錄。$/, m => target === 'en' ? `Loaded scenario ${resolveTranslation(m[1], target)}; measurements and events are recorded on the simulation clock.` : `シナリオ ${resolveTranslation(m[1], target)} を読み込みました。測定値とイベントはシミュレーション時間で記録されます。`],
    [/^表面整修 (\d+) 次 · (.+)$/, m => target === 'en' ? `Surface repairs ${m[1]} · ${resolveTranslation(m[2], target)}` : `表面補修 ${m[1]}回 · ${resolveTranslation(m[2], target)}`],
    [/^舊暗管 ([\d.]+) MPa · (.+)$/, m => target === 'en' ? `Old concealed pipe ${m[1]} MPa · ${resolveTranslation(m[2], target)}` : `旧隠ぺい配管 ${m[1]} MPa · ${resolveTranslation(m[2], target)}`],
    [/^尚未隔離舊管 · 淋浴開關不控制管內壓力$/, () => target === 'en' ? 'Old pipe not isolated · shower switch does not control pipe pressure' : '旧管は未隔離 · シャワーのスイッチは管内圧力を制御しません'],
    [/^暗管尚未更換$/, () => target === 'en' ? 'Concealed pipe not replaced' : '壁内配管は未交換'],
    [/^牆面最高 ([\d.]+)% · 天花最高 ([\d.]+)% · 入水通量 ([\d.]+)。水源降低後仍需乾燥；白華與漆損需另行整修。$/, m => target === 'en' ? `Wall max ${m[1]}% · ceiling max ${m[2]}% · inflow ${m[3]}. Drying is still needed after reducing the source; efflorescence and paint damage need separate repair.` : `壁面最大 ${m[1]}％ · 天井最大 ${m[2]}％ · 流入量 ${m[3]}。水源を抑えた後も乾燥が必要です。白華や塗膜の損傷は別途補修してください。`],
    [/^牆面最高 ([\d.]+)% · 入水通量 ([\d.]+)。水源降低後仍需乾燥；白華與漆損需另行整修。$/, m => target === 'en' ? `Wall max ${m[1]}% · inflow ${m[2]}. Drying is still needed after reducing the source; efflorescence and paint damage need separate repair.` : `壁面最大 ${m[1]}％ · 流入量 ${m[2]}。水源を抑えた後も乾燥が必要です。白華や塗膜の損傷は別途補修してください。`],
    [/^牆面最高 ([\d.]+)% · 天花最高 ([\d.]+)% · 入水通量 ([\d.]+)。水源降低後仍需乾燥；白華與漆損需另行整修。$/, m => target === 'en' ? `Wall max ${m[1]}% · ceiling max ${m[2]}% · inflow ${m[3]}. Drying is still needed after reducing the source; efflorescence and paint damage need separate repair.` : `壁面最大 ${m[1]}％ · 天井最大 ${m[2]}％ · 流入量 ${m[3]}。水源を抑えた後も乾燥が必要です。白華や塗膜の損傷は別途補修してください。`],
    [/^移動預覽濕度 · 點擊固定讀值 · 拖曳旋轉 · 滾輪／雙指縮放(?: · 完成量測後，使用左側情境控制。)?$/, m => target === 'en' ? 'Move to preview moisture · click to record · drag to rotate · scroll / pinch to zoom' + (m[0].includes('完成量測') ? ' · After measuring, use the scenario controls on the left.' : '') : '移動して含水状態を確認 · クリックで記録 · ドラッグで回転 · ホイール／ピンチで拡大縮小' + (m[0].includes('完成量測') ? ' · 測定後は左側のシナリオ操作を使用してください。' : '')],
    [/^尚未接上網格引擎 · (.+)$/, m => target === 'en' ? `Legacy demo · ${resolveTranslation(m[1], target)}` : `旧式デモ · ${resolveTranslation(m[1], target)}`],
    [/^目前來源通量：(.+) · 地下水位 ([\d.]+) \/ 水壓 ([\d.]+) · 已修復：(.+) · 供水條件 (.+)（(作用中|已停止)）$/, m => target === 'en' ? `Source flow: ${m[1]} · groundwater level ${m[2]} / pressure ${m[3]} · repairs: ${resolveTranslation(m[4], target)} · supply condition ${m[5]} (${m[6] === '作用中' ? 'active' : 'stopped'})` : `水源流量：${m[1]} · 地下水位 ${m[2]}／水圧 ${m[3]} · 補修：${resolveTranslation(m[4], target)} · 給水条件 ${m[5]}（${m[6] === '作用中' ? '作動中' : '停止中'}）`],
    [/^排水管 (\d+)\/(\d+) 支$/, m => target === 'en' ? `drain pipes ${m[1]}/${m[2]}` : `排水管 ${m[1]}/${m[2]}本`],
    [/^尚無$/, () => target === 'en' ? 'none' : 'なし'],
    [/^([\d.]+) · 水壓 ([\d.]+)（教學尺度）$/, m => target === 'en' ? `${m[1]} · pressure ${m[2]} (teaching scale)` : `${m[1]} · 水圧 ${m[2]}（教材用スケール）`],
    [/^模擬平均 ([\d.]+)% · 表面最高 ([\d.]+)% · 牆面最高 ([\d.]+)%/, m => target === 'en' ? `Model average ${m[1]}% · surface max ${m[2]}% · wall max ${m[3]}%` : `モデル平均 ${m[1]}％ · 表面最大 ${m[2]}％ · 壁面最大 ${m[3]}％`],
  ];
  for (const [pattern, replace] of patterns) {
    const match = pattern.exec(source);
    if (match) return replace(match);
  }
  return source;
}

function sourceForText(node: Text, preserveSource = false): string {
  const current = node.data;
  const previous = originalText.get(node);
  if (preserveSource && previous !== undefined) return previous;
  if (previous !== undefined && current === resolveTranslation(previous, language)) return previous;
  originalText.set(node, current);
  return current;
}

function localizeText(node: Text, preserveSource = false): void {
  if (!node.parentElement || node.parentElement.closest('script, style, [data-no-translate]')) return;
  const source = sourceForText(node, preserveSource);
  const localized = resolveTranslation(source, language);
  if (node.data !== localized) node.data = localized;
}

const observedAttributes = ['aria-label', 'aria-description', 'title', 'placeholder', 'content'];
function localizeAttribute(element: Element, name: string, preserveSource = false): void {
  const current = element.getAttribute(name);
  if (current === null) return;
  let originals = originalAttributes.get(element);
  if (!originals) { originals = new Map(); originalAttributes.set(element, originals); }
  let source = originals.get(name);
  if (preserveSource && source !== undefined) {
    // Keep the source while switching languages.
  } else if (source === undefined || current !== resolveTranslation(source, language)) {
    source = current;
    originals.set(name, source);
  }
  const localized = resolveTranslation(source, language);
  if (current !== localized) element.setAttribute(name, localized);
}

function localizeTree(root: Node, preserveSource = false): void {
  if (root.nodeType === Node.TEXT_NODE) { localizeText(root as Text, preserveSource); return; }
  if (root.nodeType === Node.ELEMENT_NODE) {
    const element = root as Element;
    for (const name of observedAttributes) localizeAttribute(element, name, preserveSource);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === Node.TEXT_NODE) localizeText(node as Text, preserveSource);
    else for (const name of observedAttributes) localizeAttribute(node as Element, name, preserveSource);
  }
}

function applyLanguage(): void {
  applyingLocale = true;
  document.documentElement.lang = language;
  localizeTree(document, true);
  const selector = languageSelect();
  if (selector) selector.value = language;
  applyingLocale = false;
  document.dispatchEvent(new CustomEvent('simulator:languagechange', { detail: { language } }));
}

export function getLanguage(): Language { return language; }

export function setLanguage(next: Language): void {
  if (!validLanguage(next)) return;
  language = next;
  try { window.localStorage.setItem(storageKey, next); } catch { /* Storage may be unavailable for local files or private browsing. */ }
  applyLanguage();
}

export function translate(source: string): string {
  return resolveTranslation(source, language);
}

export function initializeLocalization(): void {
  if (observer) return;
  language = safeReadLanguage();
  const selector = languageSelect();
  if (selector) selector.addEventListener('change', () => {
    const selected = selector.value;
    if (validLanguage(selected)) setLanguage(selected);
  });

  observer = new MutationObserver(records => {
    if (applyingLocale) return;
    for (const record of records) {
      if (record.type === 'characterData') localizeText(record.target as Text);
      else if (record.type === 'attributes') localizeAttribute(record.target as Element, record.attributeName!);
      else Array.from(record.addedNodes).forEach(node => localizeTree(node));
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: observedAttributes });
  applyLanguage();
}

initializeLocalization();
