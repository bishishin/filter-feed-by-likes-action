import * as fs from "node:fs";
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

export function loadCacheFile(
	path: Option.Option<string>,
): Effect.Effect<
	parser.Output<parser.Item> | undefined,
	Cause.UnknownException
> {
	return path.pipe(
		Effect.flatMap((p) =>
			Effect.try(() => (fs.existsSync(p) ? Option.some(p) : Option.none())),
		),
		Effect.flatten,
		Effect.flatMap((p) => Effect.try(() => fs.readFileSync(p, "utf-8"))),
		Effect.flatMap((data) =>
			Effect.tryPromise(() => new parser().parseString(data)),
		),
		Effect.optionFromOptional,
		Effect.map(Option.getOrUndefined),
	);
}
