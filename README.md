# filter-feed-by-likes-action
![Prerequisite](https://img.shields.io/badge/node-%3E%3D20-blue.svg?logo=nodedotjs)
![GitHub License](https://img.shields.io/github/license/bishishin/filter-feed-by-likes-action)
[![lint](https://github.com/bishishin/filter-feed-by-likes-action/actions/workflows/lint.yaml/badge.svg)](https://github.com/bishishin/filter-feed-by-likes-action/actions/workflows/lint.yaml)
[![test](https://github.com/bishishin/filter-feed-by-likes-action/actions/workflows/test.yaml/badge.svg)](https://github.com/bishishin/filter-feed-by-likes-action/actions/workflows/test.yaml)

フィードに対していいね数などで配信記事を評価し、閾値でフィルタしたフィードを再生成するカスタムアクション

[カスタムワークフローによるGithubPages](https://docs.github.com/ja/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)でのフィード配信を想定しており、入力されたフィードのファイルからフィルタ済みのファイルを出力する。

現時点だと[はてなブックマーク件数](https://developer.hatena.ne.jp/ja/documents/bookmark/apis/getcount/)による評価にのみ対応している。
内部挙動の概要については[`features/`](features/)以下のGherkinで管理されている仕様を参照。

## Usage

前後処理を想定して、アクション内ではフィード取得や蓄積される一方の過去記事削除といった基本処理も行っていない。
入力の詳細については[`action.yml`](action.yml)を参照。

下記に利用例を示す。

### 最小例
```yaml
- uses: bishishin/filter-feed-by-likes-action@v0
  with:
    original: original.xml
    output: filtered.xml
    threshold: 10
```

### 前後処理を含めた具体例
静的ファイルをデプロイするスターターワークフローを元にしている。
この例では前後処理にXSLTを用いているが、実利用時は任意の言語で問題ない。
```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4
  - name: 配信済み記事のキャッシュ取得
    uses: actions/cache/restore@v3
    id: restore-cache
    with:
      path: feed
      key: feed
  - name: リモートからの取得処理
    run: curl -o original.xml https://qiita.com/popular-items/feed
  - run: npm install xslt3
  - name: はてブ数の取得を阻害するようなクエリ文字列が含まれたフィードのため、除くための前処理
    run: npx xslt3 -xsl:prepare.xsl -s:original.xml -o:normalized.xml
  - uses: bishishin/filter-feed-by-likes-action@v0
    with:
      original: normalized.xml
      cache: feed/qiita.xml
      output: filtered.xml
      threshold: ${{ vars.LIKE_THRESHOLD }}  # 閾値の変更をコミットせずに可能にする
  - name: 20件を超えた記事を削除する後処理
    run: npx xslt3 -xsl:trim.xsl -s:filtered.xml -o:feed/qiita.xml
  - name: 配信済み記事のキャッシュ
    uses: actions/cache/save@v3
    id: save-cache
    with:
      path: feed
      key: feed-${{ github.run_id }}
  - name: Setup Pages
    uses: actions/configure-pages@v4
  - name: Upload artifact
    uses: actions/upload-pages-artifact@v3
    with:
      path: 'feed'
  - name: Deploy to GitHub Pages
    id: deployment
    uses: actions/deploy-pages@v4
```
prepare.xsl
```xsl
<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:atom="http://www.w3.org/2005/Atom">
    <xsl:output method="xml" indent="yes" />

    <xsl:template match="@*|node()">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()" />
        </xsl:copy>
    </xsl:template>

    <xsl:template match="/atom:feed/atom:entry/atom:link/@href">
        <xsl:attribute name="href">
            <xsl:value-of select="substring-before(., '?')" />
        </xsl:attribute>
    </xsl:template>
</xsl:stylesheet>
```
trim.xsl
```xsl
<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:atom="http://www.w3.org/2005/Atom" xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xsl:output method="xml" indent="yes" />

    <xsl:template match="@*|node()">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()" />
        </xsl:copy>
    </xsl:template>

    <xsl:template match="/atom:feed/atom:entry[position() gt 20]">
    </xsl:template>
</xsl:stylesheet>
```