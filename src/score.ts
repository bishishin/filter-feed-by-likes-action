import { ParseResult, Schema } from "@effect/schema";
import {
	Cause,
	Context,
	Duration,
	Effect,
	ReadonlyRecord,
	Schedule,
	Stream,
} from "effect";
import * as R from "rambda/immutable";

export type ApiFetchError =
	| Cause.UnknownException
	| ParseResult.ParseError
	| Error;
export interface ApiService {
	get<T>(
		schema: Schema.Schema<T>,
		url: string,
		params: URLSearchParams,
	): Effect.Effect<ApiService, ApiFetchError, T>;
}
export const ApiServiceContext = Context.Tag<ApiService>();
export type ScoreFetchEffect = Effect.Effect<
	ApiService,
	ApiFetchError,
	ReadonlyMap<string, number>
>;
export interface ScoreApi {
	fetch(links: ReadonlySet<string>): ScoreFetchEffect;
}

export class HatenaCounts implements ScoreApi {
	public fetch(links: ReadonlySet<string>): ScoreFetchEffect {
		const url = "https://bookmark.hatenaapis.com/count/entries";
		const schema = Schema.record(Schema.string, Schema.Int);
		return Stream.Do.pipe(
			Stream.bind("params", () => this.createRequestStream(links)),
			Stream.bindEffect("api", () => ApiServiceContext),
			Stream.mapEffect(({ api, params }) => api.get(schema, url, params)),
			Stream.map(ReadonlyRecord.toEntries),
			Stream.flattenIterables,
			Stream.runCollect,
			Effect.tap(Effect.logInfo),
			Effect.map((v) => new Map(v)),
		);
	}

	protected createRequestStream(
		links: ReadonlySet<string>,
	): Stream.Stream<never, never, URLSearchParams> {
		const paramsList = HatenaCounts.buildParamsList(links);
		return Stream.fromIterable(paramsList).pipe(
			Stream.tap((v) => Effect.logInfo(v.toString())),
			Stream.schedule(Schedule.spaced(Duration.seconds(3))),
		);
	}

	protected static buildParamsList(
		links: ReadonlySet<string>,
	): readonly URLSearchParams[] {
		return R.pipe(
			R.map((l) => ["url", l]),
			R.splitEvery(50),
			R.map((kv: readonly [string, string][]) => new URLSearchParams(kv)),
		)(Array.from(links));
	}
}
