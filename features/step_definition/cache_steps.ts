import { Given, Then, When, World } from "@cucumber/cucumber";
import { expect } from "chai";
import type * as parser from "rss-parser";
import {
  type ActionEnvironment,
  type ActionInputs,
  FeedGenerator,
} from "../../src/generate";

class CustomWorld extends World {
  publishedList: parser.Item[];
  fetchedList: parser.Item[];
}

class FeedGenForTest extends FeedGenerator {
  selectPublishableFotTest = this.selectPublishable;
}

Given("配信済みキャッシュが存在する", function (this: CustomWorld) {
  this.publishedList = [{ link: "hoge" }];
});

When("元フィードの記事がキャッシュに存在", function (this: CustomWorld) {
  this.fetchedList = [...this.publishedList];
});

Then(
  "対象記事を再配信不可能として評価処理を行わない",
  async function (this: CustomWorld) {
    const generator = new FeedGenForTest(
      {} as ActionEnvironment,
      {} as ActionInputs,
    );
    const existCache = generator.selectPublishableFotTest(
      this.fetchedList,
      this.publishedList,
    );
    const notExistCache = generator.selectPublishableFotTest(
      this.fetchedList,
      [],
    );
    expect(notExistCache).to.be.not.empty;
    expect(existCache).to.be.empty;
  },
);
