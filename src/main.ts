import * as fs from "node:fs";
import { type Cause, Effect } from "effect";
import type * as gen from "feed";
import parser from "rss-parser";
import {
  type ActionEnvironment,
  type ActionInputs,
  FeedGenerator,
} from "./generate.ts";
import type { ApiFetchError, ApiService } from "./score.ts";

export function main(
  env: ActionEnvironment,
  inputs: ActionInputs,
): Effect.Effect<
  gen.Feed,
  Cause.UnknownException | Error | ApiFetchError,
  ApiService
> {
  return Effect.Do.pipe(
    Effect.bind("origFeed", () =>
      Effect.tryPromise(() =>
        new parser().parseString(fs.readFileSync(inputs.originalPath, "utf-8")),
      ),
    ),
    Effect.bind("cacheFeed", () => loadCacheFile(inputs.cachePath)),
    Effect.flatMap(({ origFeed, cacheFeed }) =>
      new FeedGenerator(env, inputs).generate(origFeed, cacheFeed),
    ),
    Effect.tap((feed) => fs.writeFileSync(inputs.outputPath, feed.atom1())),
  );
}

/**
 * 配信済みキャッシュを読み込む
 * - path が undefined、またはファイルが存在しない場合は undefined(初期起動扱い)
 * - 読み込み・パースに失敗した場合はエラー
 */
export function loadCacheFile(
  path: string | undefined,
): Effect.Effect<
  parser.Output<parser.Item> | undefined,
  Cause.UnknownException
> {
  return Effect.try(() => path !== undefined && fs.existsSync(path)).pipe(
    Effect.flatMap((exists) =>
      exists && path !== undefined
        ? Effect.Do.pipe(
            Effect.bind("data", () =>
              Effect.try(() => fs.readFileSync(path, "utf-8")),
            ),
            Effect.flatMap(({ data }) =>
              Effect.tryPromise(() => new parser().parseString(data)),
            ),
          )
        : Effect.succeed(undefined),
    ),
  );
}
