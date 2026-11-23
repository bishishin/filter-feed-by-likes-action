import * as fs from "node:fs";
import { describe, it } from "node:test";
import { expect } from "chai";
import { Effect, TestContext } from "effect";
import { ApiServiceTag } from "../src/generate.ts";
import { main } from "../src/main.ts";

/*
  @effect/platform-nodeのファイル操作を導入した際に、flaky testが発生したため
  概ね100回ほど実行すれば確実に下記エラーを確認できた
  Promise resolution is still pending but the event loop has already resolved
*/
describe("prevent flaky test", async () => {
  for (let step = 0; step < 100; step++) {
    it(`${step} step`, async (t) => {
      const scores: Record<string, number> = {
        "http://example.org/2003/12/13/atom01": 0,
        "http://example.org/2003/12/13/atom02": 0,
        "http://example.org/2003/12/13/atom03": 1,
      };
      const apiService = { getJson: async () => scores };
      const dummyEnv = {
        repositoryOwner: "hoge",
        repositoryId: "01234",
        actionRepository: "foo/bar",
      };
      const dummyInputs = {
        originalPath: "test/original.atom",
        cachePath: "test/cache.atom",
        outputPath: "test/output.atom",
        threshold: 1,
      };
      t.after(() => fs.rmSync(dummyInputs.outputPath));
      const expected = fs.readFileSync("test/expected.atom").toString();
      await Effect.Do.pipe(
        Effect.flatMap(() => main(dummyEnv, dummyInputs)),
        Effect.provideService(ApiServiceTag, apiService),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      );
      const actual = fs.readFileSync(dummyInputs.outputPath).toString();
      expect(actual).to.equal(expected.replace(/\r?\n$/, ""));
    });
  }
});
