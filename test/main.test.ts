import * as fs from "node:fs";
import { describe, it } from "node:test";
import { expect } from "chai";
import { main } from "../src/main.ts";

describe("main", () => {
  it("元フィードとキャッシュから期待通りのフィードを生成する", async (t) => {
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
    await main(dummyEnv, dummyInputs, apiService, () => new Date(0));
    const actual = fs.readFileSync(dummyInputs.outputPath).toString();
    expect(actual).to.equal(expected.replace(/\r?\n$/, ""));
  });
});
