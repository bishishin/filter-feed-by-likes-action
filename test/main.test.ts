import * as fs from "node:fs";
import { describe, it } from "node:test";
import { Schema } from "@effect/schema";
import { expect } from "chai";
import {
	Duration,
	Effect,
	Layer,
	Option,
	TestClock,
	TestContext,
} from "effect";
import * as R from "rambda";
import { main } from "../src/main";
import { ApiServiceContext } from "../src/score";

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
			const schema = Schema.record(Schema.string, Schema.Int);
			const makeApiService = Effect.succeed(
				ApiServiceContext.of({ get: <T>() => Effect.succeed(scores as T) }),
			);
			const dummyEnv = {
				repositoryOwner: "hoge",
				repositoryId: "01234",
				actionRepository: "foo/bar",
			};
			const dummyInputs = {
				originalPath: "test/original.atom",
				cachePath: Option.some("test/cache.atom"),
				outputPath: "test/output.atom",
				threshold: 1,
			};
			t.after(() => fs.rmSync(dummyInputs.outputPath));
			const expected = fs.readFileSync("test/expected.atom").toString();
			await Effect.Do.pipe(
				Effect.flatMap(() => main(dummyEnv, dummyInputs)),
				Effect.zipLeft(TestClock.adjust(Duration.seconds(3)), {
					concurrent: true,
				}),
				Effect.provide(Layer.effect(ApiServiceContext, makeApiService)),
				Effect.provide(TestContext.TestContext),
				Effect.runPromise,
			);
			const actual = fs.readFileSync(dummyInputs.outputPath).toString();
			for (const lines of R.zip(actual.split("\n"), expected.split("\n"))) {
				expect(lines[0]).to.equal(lines[1]);
			}
		});
	}
});
