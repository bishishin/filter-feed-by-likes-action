import * as fs from "node:fs";
import { isBuiltin } from "node:module";
import { describe, it } from "node:test";
import { expect } from "chai";

describe("配布物", () => {
  it("未解決のモジュールを含まない", () => {
    const bundle = fs.readFileSync("dist/index.js", "utf8");

    expect(bundle).not.to.contain("webpackMissingModule");
    expect(bundle).not.to.match(/\brequire\(["']@actions\/core["']\)/);
  });

  it("Node.js組み込みモジュール以外を外部参照しない", () => {
    const bundle = fs.readFileSync("dist/index.js", "utf8");
    const externalModules = Array.from(
      bundle.matchAll(/\brequire\(["']([^"']+)["']\)/g),
      ([, moduleName]) => moduleName,
    ).filter(
      (moduleName) =>
        // nccがコメントとして残す任意のネイティブXMLパーサー
        moduleName !== "node-expat" &&
        !moduleName.startsWith("node:") &&
        !isBuiltin(moduleName),
    );

    expect(externalModules).to.deep.equal([]);
  });

  it("バンドルした依存パッケージのライセンスを含む", () => {
    const licenses = fs.readFileSync("dist/licenses.txt", "utf8");
    expect(licenses).to.match(/^@actions\/core\r?$/m);
    expect(licenses).not.to.contain("\nUNKNOWN\n");
  });
});
