# AI エージェント向けカスタム指示

このファイルは、このプロジェクトで作業するAIエージェント(GitHub Copilot等)向けのカスタム指示です。

## プロジェクト概要

このプロジェクトは **filter-feed-by-likes-action** - RSSフィードをはてなブックマーク件数などの「いいね」指標で評価し、閾値を超えた記事だけをフィルタリングして再配信するGitHub Actionです。

### 主な機能

- RSSフィードの取得と解析(Atom/RSS対応)
- はてなブックマークAPI経由での記事評価
- 閾値によるフィルタリング
- 配信済み記事のキャッシュ管理(重複配信防止)
- APIレート制限への配慮(バッチ処理、遅延制御)

## 技術スタック

- **ランタイム**: Node.js 20+
- **言語**: TypeScript
- **主要ライブラリ**:
  - `feed`: Atom/RSSフィード生成
  - `rss-parser`: フィード解析
  - `@actions/core`: GitHub Actions統合
- **テスト**:
  - Node.js組み込みテストランナー(ユニットテスト)
  - Cucumber.js + Gherkin(BDDシナリオテスト)
- **ビルド**: `@vercel/ncc`(単一バンドル生成)
- **コード品質**: Biome(リンター・フォーマッター)

## プロジェクト構造

```text
src/
  ├── index.ts       # GitHub Actionsエントリーポイント(HTTP取得の注入、core.setFailed)
  ├── config.ts      # 環境変数・入力の読み取りと検証(副作用なし)
  ├── main.ts        # メイン処理フロー(フィード読み込み、フィルタ、書き込み)
  ├── generate.ts    # FeedGeneratorクラス(フィード生成ロジック)
  └── score.ts       # ScoreApi実装(はてなブックマーク件数取得、レスポンス検証)
test/
  ├── main.test.ts   # フィード生成のユニットテスト
  ├── config.test.ts # 入力読み取りのユニットテスト
  ├── bundle.test.ts # 配布物(dist)の検査。dist が必要
  ├── *.atom         # テスト用フィードファイル
features/
  ├── main.feature   # Gherkinで記述された仕様
  └── step_definition/  # Cucumberステップ定義
action.yml           # GitHub Action定義
```

## コーディング規約・スタイル

### 言語使用ルール

- **コメント、ドキュメント、会話**: 日本語を使用
- **コード**: 英語を使用

### TypeScript スタイル

- **async/await**: 非同期処理は Promise と async/await で書く
- **イミュータブル**: `readonly`配列、`ReadonlyMap`、`ReadonlySet`等を積極的に使用
- **型安全**: 明示的な型注釈、nullableは `T | undefined` で扱う
- **依存注入**: 外部I/O(HTTP取得、sleep、現在時刻)はコンストラクタ/引数で注入し、テストで差し替え可能にする
- **パラメータプロパティ禁止**: tsconfig の `erasableSyntaxOnly` により `constructor(private readonly x: T)` は使えない。フィールド宣言+代入で書く
- **副作用の分離**: 環境変数の読み取りなど副作用のないロジックは `src/config.ts` のように別モジュールへ切り出す(`index.ts` は import しただけで処理が走るため)

### コード例(既存パターンに従う)

```typescript
// 依存をコンストラクタで注入する(src/score.ts)
export class HatenaCounts implements ScoreApi {
  private readonly api: ApiService;
  private readonly sleep: Sleep;

  constructor(api: ApiService, sleep: Sleep = defaultSleep) {
    this.api = api;
    this.sleep = sleep;
  }

  public async fetch(
    links: ReadonlySet<string>,
  ): Promise<ReadonlyMap<string, number>> {
    // リクエストは逐次実行し、2回目以降の前に REQUEST_INTERVAL_MS 待つ
  }
}

// readonly と undefined の使用(src/generate.ts)
protected selectPublishable(
  fetchedItems: readonly parser.Item[],
  publishedItems: readonly parser.Item[],
): readonly gen.Item[] {
  const publishedLinks = new Set(
    publishedItems.map((item) => item.link).filter(isPresent),
  );
  // ...
}
```

## テスト方針

### ユニットテスト (`test/main.test.ts`)

- Node.js組み込みテストランナー使用
- 主要ロジック(フィルタリング、スコア取得、キャッシュ処理)をテスト
- モックの`ApiService`/`ScoreApi`や現在時刻関数(例: `() => new Date(0)`)を引数で注入

### 入力読み取りのテスト (`test/config.test.ts`)

- `readActionEnvironment` / `readActionInputs` を環境変数オブジェクトを渡して検証
- 必須項目の欠落、`INPUT_CACHE` の未設定・空文字、`INPUT_THRESHOLD` の不正値(整数以外はエラー)

### BDDシナリオテスト (`features/`)

- Gherkinで仕様を記述(日本語)
- ステップ定義は`features/step_definition/`に配置
- 実行: `npm run test-feat`

### テストファイル命名

- ユニット: `*.test.ts`
- フィクスチャ: `test/*.atom`(Atomフィードサンプル)

## ビルド・デプロイ

```bash
# 全工程(テスト+ビルド)
npm run all

# ビルドのみ
npm run bundle  # リント→パッケージング

# テストのみ
npm test  # ユニット+BDD並列実行
```

## デバッグ・トラブルシューティング

### ログ確認

- ログ出力が必要な場合は`@actions/core`の`core.info()`/`core.warning()`等を直接使用
- 処理中の例外は`src/index.ts`で`core.setFailed()`に渡され、Actionが失敗する

### APIレート制限

- `src/score.ts`の`REQUEST_INTERVAL_MS`(3000ms)で遅延制御。リクエストは逐次実行し、2回目以降の前に`sleep`する
- バッチサイズは50件/リクエスト(はてなブックマークAPI制限)

### キャッシュ問題

- `src/main.ts`の`loadCacheFile()`でキャッシュ読み込み処理
- キャッシュパスが未指定、またはファイルが存在しない場合のみ初期状態として扱う
- ファイルは存在するがパースできない場合はエラーになる(無視されない)

## 注意事項

- **テスト駆動**: 機能追加時は必ずテストを追加してください(BDD仕様も更新)
- **本体依存(dependencies)の追加は原則行わない**: 脆弱性対応のメンテコスト削減を優先し、小さな機能は自前実装する。追加が必要な場合は理由をPRに明記する
- **残す本体依存は意図的**: `@actions/core`(GitHub Actionsとしての根幹)、`feed`/`rss-parser`(RSS/Atomの生成・解析は自前再実装が現実的でない)。これらは削除対象にしない
- **devDependencies**: 比較的自由に更新してよい
- **API配慮**: 外部API呼び出しは必ず遅延・バッチ処理を考慮してください
- **ビルド確認**: 変更後は`npm run all`で全工程が通ることを確認してください

## リソース

- [はてなブックマーク件数取得API](https://developer.hatena.ne.jp/ja/documents/bookmark/apis/getcount/)
- [GitHub Actionsカスタムワークフロー](https://docs.github.com/ja/actions/creating-actions/creating-a-javascript-action)
- [RSS 2.0仕様](https://www.rssboard.org/rss-specification)
- [Atom 1.0仕様](https://datatracker.ietf.org/doc/html/rfc4287)
