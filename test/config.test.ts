import { describe, it } from "node:test";
import { expect } from "chai";
import { readActionEnvironment, readActionInputs } from "../src/config.ts";

const fullEnv: NodeJS.ProcessEnv = {
  GITHUB_REPOSITORY_OWNER: "hoge",
  GITHUB_REPOSITORY_ID: "01234",
  GITHUB_ACTION_REPOSITORY: "foo/bar",
  INPUT_ORIGINAL: "original.atom",
  INPUT_CACHE: "cache.atom",
  INPUT_OUTPUT: "output.atom",
  INPUT_THRESHOLD: "10",
};

function without(name: string): NodeJS.ProcessEnv {
  const { [name]: _removed, ...rest } = fullEnv;
  return rest;
}

describe("readActionEnvironment", () => {
  it("全項目が揃っていれば読める", () => {
    expect(readActionEnvironment(fullEnv)).to.deep.equal({
      repositoryOwner: "hoge",
      repositoryId: "01234",
      actionRepository: "foo/bar",
    });
  });

  for (const name of [
    "GITHUB_REPOSITORY_OWNER",
    "GITHUB_REPOSITORY_ID",
    "GITHUB_ACTION_REPOSITORY",
  ]) {
    it(`${name} が無ければ変数名を含むエラー`, () => {
      expect(() => readActionEnvironment(without(name))).to.throw(name);
    });
  }
});

describe("readActionInputs", () => {
  it("全項目が揃っていれば読める", () => {
    expect(readActionInputs(fullEnv)).to.deep.equal({
      originalPath: "original.atom",
      cachePath: "cache.atom",
      outputPath: "output.atom",
      threshold: 10,
    });
  });

  for (const name of ["INPUT_ORIGINAL", "INPUT_OUTPUT", "INPUT_THRESHOLD"]) {
    it(`${name} が無ければ変数名を含むエラー`, () => {
      expect(() => readActionInputs(without(name))).to.throw(name);
    });
  }

  it("INPUT_CACHE が未設定なら undefined", () => {
    expect(readActionInputs(without("INPUT_CACHE")).cachePath).to.be.undefined;
  });

  it("INPUT_CACHE が空文字なら undefined", () => {
    expect(readActionInputs({ ...fullEnv, INPUT_CACHE: "" }).cachePath).to.be
      .undefined;
  });

  for (const text of ["abc", "1.5", ""]) {
    it(`INPUT_THRESHOLD が "${text}" ならエラー`, () => {
      expect(() =>
        readActionInputs({ ...fullEnv, INPUT_THRESHOLD: text }),
      ).to.throw("INPUT_THRESHOLD");
    });
  }

  it("INPUT_THRESHOLD の負の整数は受け付ける", () => {
    expect(
      readActionInputs({ ...fullEnv, INPUT_THRESHOLD: "-1" }).threshold,
    ).to.equal(-1);
  });
});
