import { Then, When, World } from "@cucumber/cucumber";
import { expect } from "chai";
import {
  Duration,
  Effect,
  Fiber,
  Logger,
  Stream,
  TestClock,
  TestContext,
} from "effect";
import * as R from "rambda";
import { HatenaCounts } from "../../src/score";

class CustomWorld extends World {
  streams: Stream.Stream<URLSearchParams, never, never>[];
}

class HatenaCountsForTest extends HatenaCounts {
  createRequestStreamFotTest = this.createRequestStream;
}

When("リクエストが複数回", function (this: CustomWorld) {
  const dummyLinks = new Set([...Array(100).keys()].map(String));
  this.streams = [
    new HatenaCountsForTest().createRequestStreamFotTest(dummyLinks),
  ];
});

Then("3秒以上の間隔を設ける", async function (this: CustomWorld) {
  const logger = Logger.make(({ message }) => this.attach(`${message}`));
  const loggerLayer = Logger.replace(Logger.defaultLogger, logger);
  for (const stream of this.streams) {
    const minInterval = await stream.pipe(
      Stream.mapEffect(() => TestClock.currentTimeMillis),
      Stream.sliding(2),
      Stream.map((v) => Array.from<number>(v)),
      Stream.map((v) => v[1] - v[0]),
      Stream.runCollect,
      Effect.map((v) => Array.from<number>(v)),
      Effect.map((v) => Math.min(...v)),
      Effect.fork,
      Effect.tap(() => TestClock.adjust(Duration.millis(6000))),
      Effect.flatMap(Fiber.join),
      Effect.provide(loggerLayer),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    );
    expect(minInterval).to.equal(3000);
  }
});
