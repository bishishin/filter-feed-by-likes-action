import { Then, When, type World } from "@cucumber/cucumber";
import { expect } from "chai";
import { loadCacheFile } from "../../src/main.ts";

When("配信済みキャッシュファイルが存在しない", function (this: World) {});

Then("初期起動を考慮しエラーにはならない", async function (this: World) {
  const dummyPath = Date.now().toString();
  const succeed = (await loadCacheFile(dummyPath)) === undefined;
  expect(succeed).to.be.true;
});
