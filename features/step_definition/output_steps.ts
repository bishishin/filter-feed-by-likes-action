import { Given, Then, When, World } from "@cucumber/cucumber";
import { expect } from "chai";
import type * as gen from "feed";
import {
  type ActionEnvironment,
  type ActionInputs,
  FeedGenerator,
} from "../../src/generate.ts";

type SourceItem = {
  readonly link: string;
  readonly title: string;
  readonly isoDate: string;
  readonly pubDate: string;
  readonly creator: string;
  readonly summary: string;
  readonly content: string;
  readonly guid: string;
  readonly categories: string[];
};

class CustomWorld extends World {
  sourceItem: SourceItem;
  outputItem: gen.Item;
}

class FeedGenForTest extends FeedGenerator {
  selectPublishableForTest = this.selectPublishable;
}

Given("本文と要約と作成者を含む元記事", function (this: CustomWorld) {
  this.sourceItem = {
    link: "https://example.com/article",
    title: "Source title",
    isoDate: "2026-01-02T03:04:05.000Z",
    pubDate: "2026-01-02T03:04:05.000Z",
    creator: "Source creator",
    summary: "Source summary",
    content: "Source content",
    guid: "source-guid",
    categories: ["source-category"],
  };
});

When("元記事を配信用の記事に変換", function (this: CustomWorld) {
  const generator = new FeedGenForTest(
    {} as ActionEnvironment,
    {} as ActionInputs,
  );
  [this.outputItem] = generator.selectPublishableForTest([this.sourceItem], []);
});

Then(
  "タイトルとリンクと作成者と更新日時と公開日時だけを引き継ぐ",
  function (this: CustomWorld) {
    expect(this.outputItem).to.deep.equal({
      title: "Source title",
      link: "https://example.com/article",
      date: new Date("2026-01-02T03:04:05.000Z"),
      published: new Date("2026-01-02T03:04:05.000Z"),
      author: [{ name: "Source creator" }],
    });
  },
);
