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
- **言語**: TypeScript 5.x
- **主要ライブラリ**:
  - `effect`: 関数型プログラミング、副作用管理
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
  ├── index.ts       # GitHub Actionsエントリーポイント
  ├── main.ts        # メイン処理フロー(フィード読み込み、フィルタ、書き込み)
  ├── generate.ts    # FeedGeneratorクラス(フィード生成ロジック)
  └── score.ts       # ScoreApi実装(はてなブックマーク件数取得)
test/
  ├── main.test.ts   # ユニットテスト
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

- **関数型プログラミング**: Effect-TSを活用した副作用管理
- **イミュータブル**: `readonly`配列、ReadonlyMap等を積極的に使用
- **型安全**: 明示的な型注釈、`Option`型でnullableを扱う
- **Effect パイプライン**: `Effect.Do.pipe()`によるEffect合成パターンを踏襲
- **副作用の分離**: ファイルI/O、API呼び出しなどはEffectでラップ

### コード例(既存パターンに従う)

```typescript
// Effect パイプライン
return Effect.Do.pipe(
  Effect.bind("data", () => fetchData()),
  Effect.map(({ data }) => processData(data)),
  Effect.tap((result) => Effect.logInfo(result)),
);

// readonly と Option の使用
protected selectPublishable(
  fetchedItems: readonly parser.Item[],
  publishedItems: readonly parser.Item[],
): readonly gen.Item[] {
  const publishedLinks = new Set(
    publishedItems
      .map((item) => Option.fromNullable(item.link))
      .flatMap(Option.toArray),
  );
  // ...
}
```

## テスト方針

### ユニットテスト (`test/main.test.ts`)

- Node.js組み込みテストランナー使用
- 主要ロジック(フィルタリング、スコア取得、キャッシュ処理)をテスト
- モックAPIサービスを`Effect.provideService()`で注入

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

- Effect-TSの`Effect.logInfo()`/`Effect.logError()`を使用
- GitHub Actions実行時は`@actions/core`のロギングが出力される

### APIレート制限

- `src/score.ts`の`Schedule.spaced(Duration.seconds(3))`で遅延制御
- バッチサイズは50件/リクエスト(はてなブックマークAPI制限)

### キャッシュ問題

- `src/main.ts`の`loadCacheFile()`でキャッシュ読み込み処理
- キャッシュファイルが不正な場合は無視して初期状態として扱う

## 注意事項

- **Effect-TSの理解**: このプロジェクトはEffect-TSを中心に構築されています。Effect、Stream、Optionなどの概念を理解してください
- **関数型スタイル**: 副作用は可能な限りEffectでラップし、純粋関数を心がけてください
- **テスト駆動**: 機能追加時は必ずテストを追加してください(BDD仕様も更新)
- **API配慮**: 外部API呼び出しは必ず遅延・バッチ処理を考慮してください
- **ビルド確認**: 変更後は`npm run all`で全工程が通ることを確認してください

## リソース

- [Effect-TS公式ドキュメント](https://effect.website/)
- [はてなブックマーク件数取得API](https://developer.hatena.ne.jp/ja/documents/bookmark/apis/getcount/)
- [GitHub Actionsカスタムワークフロー](https://docs.github.com/ja/actions/creating-actions/creating-a-javascript-action)
- [RSS 2.0仕様](https://www.rssboard.org/rss-specification)
- [Atom 1.0仕様](https://datatracker.ietf.org/doc/html/rfc4287)
