import * as fs from "node:fs";
import { Cause, Effect, Option } from "effect";
import * as gen from "feed";
import parser from "rss-parser";
import { ActionEnvironment, ActionInputs, FeedGenerator } from "./generate";
import { ApiFetchError, ApiService } from "./score";

export function main(
	env: ActionEnvironment,
	inputs: ActionInputs,
): Effect.Effect<
	ApiService,
	Cause.UnknownException | Error | ApiFetchError,
	gen.Feed
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
	never,
	Cause.UnknownException,
	parser.Output<parser.Item> | undefined
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
