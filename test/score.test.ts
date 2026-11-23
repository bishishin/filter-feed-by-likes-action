import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expect } from "chai";
import {
  type ApiService,
  HatenaCounts,
  parseHatenaCounts,
  REQUEST_INTERVAL_MS,
} from "../src/score.ts";

describe("parseHatenaCounts", () => {
  it("文字列キー → 整数値のオブジェクトを Map にする", () => {
    expect(parseHatenaCounts({ a: 0, b: 3 })).to.deep.equal(
      new Map([
        ["a", 0],
        ["b", 3],
      ]),
    );
  });

  it("空オブジェクトは空の Map にする", () => {
    expect(parseHatenaCounts({}).size).to.equal(0);
  });

  for (const json of [null, undefined, [], "x", 1]) {
    it(`オブジェクトでない値 ${JSON.stringify(json)} はエラー`, () => {
      expect(() => parseHatenaCounts(json)).to.throw(Error);
    });
  }

  for (const value of [1.5, "1", null, Number.NaN, true]) {
    it(`整数でない値 ${String(value)} を含むとエラー`, () => {
      expect(() => parseHatenaCounts({ a: 1, b: value })).to.throw('"b"');
    });
  }
});

describe("HatenaCounts.fetch", () => {
  /** 呼び出しを記録する偽の ApiService と sleep を作る */
  function createFakes(respond: (params: URLSearchParams) => unknown) {
    const calls: string[] = [];
    const api: ApiService = {
      getJson: async (_url, params) => {
        calls.push(`get:${params.getAll("url").length}`);
        return respond(params);
      },
    };
    const sleep = async (milliseconds: number) => {
      calls.push(`sleep:${milliseconds}`);
    };
    return { calls, api, sleep };
  }

  it("取得対象が無ければリクエストしない", async () => {
    const { calls, api, sleep } = createFakes(() => ({}));
    const result = await new HatenaCounts(api, sleep).fetch(new Set());
    expect(result.size).to.equal(0);
    expect(calls).to.deep.equal([]);
  });

  it("最初のリクエストの前には待たず、以降は間隔を空けて逐次リクエストする", async () => {
    const { calls, api, sleep } = createFakes(() => ({}));
    const links = new Set([...Array(120).keys()].map(String));
    await new HatenaCounts(api, sleep).fetch(links);
    expect(calls).to.deep.equal([
      "get:50",
      `sleep:${REQUEST_INTERVAL_MS}`,
      "get:50",
      `sleep:${REQUEST_INTERVAL_MS}`,
      "get:20",
    ]);
  });

  it("全リクエストの結果を1つの Map にまとめる", async () => {
    const { api, sleep } = createFakes((params) =>
      Object.fromEntries(params.getAll("url").map((url) => [url, url.length])),
    );
    const links = new Set([...Array(60).keys()].map(String));
    const result = await new HatenaCounts(api, sleep).fetch(links);
    expect(result.size).to.equal(60);
    expect(result.get("7")).to.equal(1);
    expect(result.get("59")).to.equal(2);
  });

  it("不正なレスポンスはエラーとして伝える", async () => {
    const { api, sleep } = createFakes(() => ({ a: "1" }));
    await assert.rejects(
      new HatenaCounts(api, sleep).fetch(new Set(["a"])),
      /not an integer/,
    );
  });
});
