Feature: いいね数などで記事を評価しフィルタしたフィードを生成する

  Scenario: 初期キャッシュ挙動
    When 配信済みキャッシュファイルが存在しない
    Then 初期起動を考慮しエラーにはならない

  Scenario: 配信済み記事管理
    Given 配信済みキャッシュが存在する
    When 元フィードの記事がキャッシュに存在
    Then 対象記事を再配信不可能として評価処理を行わない

  Scenario Outline: はてなブックマーク件数を、まとめたリクエストで取得する
  # https://developer.hatena.ne.jp/ja/documents/bookmark/apis/getcount/
    When 取得対象が<targetCount>件
    Then 50件ずつにまとめて<requestCount>回のリクエストにする

    Examples:
      | targetCount | requestCount |
      |           1 |            1 |
      |          50 |            1 |
      |          51 |            2 |

  Scenario: APIサーバ負荷に配慮して取得間隔を設ける
    When リクエストが複数回
    Then 3秒以上の間隔を設ける

  Scenario Outline: 配信閾値
    Given 配信閾値設定が10
    When 記事の評価が<score>
    Then 対象記事を生成するフィードに配信<publishable>

    Examples:
      | score | publishable |
      |    10 | 可能        |
      |     9 | 不可能      |
