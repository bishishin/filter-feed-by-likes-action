import { Error as PlatformError, FileSystem } from "@effect/platform";
import { type Cause, Effect, Option } from "effect";
import type * as gen from "feed";
import parser from "rss-parser";
import {
  type ActionEnvironment,
  type ActionInputs,
  FeedGenerator,
} from "./generate";
import type { ApiFetchError, ApiService } from "./score";

export function main(
  env: ActionEnvironment,
  inputs: ActionInputs,
): Effect.Effect<
  gen.Feed,
  Cause.UnknownException | Error | ApiFetchError | PlatformError.PlatformError,
  ApiService | FileSystem.FileSystem
> {
  return Effect.Do.pipe(
    Effect.bind("fs", () => FileSystem.FileSystem),
    Effect.bind("origFeed", ({ fs }) =>
      fs.readFileString(inputs.originalPath).pipe(
        Effect.flatMap((content) =>
          Effect.tryPromise(() => new parser().parseString(content)),
        ),
      ),
    ),
    Effect.bind("cacheFeed", () => loadCacheFile(inputs.cachePath)),
    Effect.bind("feed", ({ origFeed, cacheFeed }) =>
      new FeedGenerator(env, inputs).generate(origFeed, cacheFeed),
    ),
    Effect.tap(({ fs, feed }) =>
      fs.writeFileString(inputs.outputPath, feed.atom1()),
    ),
    Effect.map(({ feed }) => feed),
  );
}

export function loadCacheFile(
  path: Option.Option<string>,
): Effect.Effect<
  parser.Output<parser.Item> | undefined,
  Cause.UnknownException | PlatformError.PlatformError,
  FileSystem.FileSystem
> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const result = yield* path.pipe(
      Effect.flatMap((p) =>
        fs.exists(p).pipe(
          Effect.map((exists) => (exists ? Option.some(p) : Option.none())),
        ),
      ),
      Effect.flatten,
      Effect.flatMap((p) => fs.readFileString(p)),
      Effect.flatMap((data) =>
        Effect.tryPromise(() => new parser().parseString(data)),
      ),
      Effect.optionFromOptional,
      Effect.map(Option.getOrUndefined),
    );
    return result;
  });
}
