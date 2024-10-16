import { Then, When, type World } from "@cucumber/cucumber";
import { NodeContext } from "@effect/platform-node";
import { expect } from "chai";
import { Effect, Option } from "effect";
import { loadCacheFile } from "../../src/main";

When("配信済みキャッシュファイルが存在しない", function (this: World) {});

Then("初期起動を考慮しエラーにはならない", async function (this: World) {
  const dummyPath = Option.some(new Date().getTime().toString());
  const succeed = await loadCacheFile(dummyPath).pipe(
    Effect.map((v) => v === undefined),
    Effect.provide(NodeContext.layer),
    Effect.runPromise,
  );
  expect(succeed).to.be.true;
});
