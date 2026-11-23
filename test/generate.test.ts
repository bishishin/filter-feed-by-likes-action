import { describe, it } from "node:test";
import { expect } from "chai";
import type parser from "rss-parser";
import {
  type ActionEnvironment,
  type ActionInputs,
  FeedGenerator,
} from "../src/generate.ts";

describe("FeedGenerator.generate", () => {
  const env: ActionEnvironment = {
    repositoryOwner: "hoge",
    repositoryId: "01234",
    actionRepository: "foo/bar",
  };
  const inputs: ActionInputs = {
    originalPath: "original.atom",
    cachePath: undefined,
    outputPath: "output.atom",
    threshold: 1,
  };
  const scoreApi = {
    fetch: async (links: ReadonlySet<string>) =>
      new Map([...links].map((link) => [link, 1])),
  };

  it("更新日時の無い記事と、フィード自体の更新日時に注入した現在時刻を使う", async () => {
    const now = new Date("2026-01-02T03:04:05.000Z");
    const original = {
      title: "original",
      items: [{ link: "https://example.com/no-date", title: "no date" }],
    } as parser.Output<parser.Item>;
    const feed = await new FeedGenerator(
      env,
      inputs,
      scoreApi,
      () => now,
    ).generate(original);
    expect(feed.options.updated).to.deep.equal(now);
    expect(feed.items.map((item) => item.date)).to.deep.equal([now]);
  });
});
