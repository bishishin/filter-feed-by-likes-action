import {
  type Cause,
  Context,
  Duration,
  Effect,
  type ParseResult,
  Record,
  Schedule,
  Schema,
  Stream,
} from "effect";
import * as R from "rambda";

export type ApiFetchError =
  | Cause.UnknownException
  | ParseResult.ParseError
  | Error;
export class ApiService extends Context.Tag("ApiService")<
  ApiService,
  {
    get<T>(
      schema: Schema.Schema<T>,
      url: string,
      params: URLSearchParams,
    ): Effect.Effect<T, ApiFetchError, ApiService>;
  }
>() {}
export type ScoreFetchEffect = Effect.Effect<
  ReadonlyMap<string, number>,
  ApiFetchError,
  ApiService
>;
export interface ScoreApi {
  fetch(links: ReadonlySet<string>): ScoreFetchEffect;
}

export class HatenaCounts implements ScoreApi {
  public fetch(links: ReadonlySet<string>): ScoreFetchEffect {
    const url = "https://bookmark.hatenaapis.com/count/entries";
    const schema = Schema.Record({ key: Schema.String, value: Schema.Int });
    return Stream.Do.pipe(
      Stream.bind("params", () => this.createRequestStream(links)),
      Stream.bindEffect("api", () => ApiService),
      Stream.mapEffect(({ api, params }) => api.get(schema, url, params)),
      Stream.map(Record.toEntries),
      Stream.flattenIterables,
      Stream.runCollect,
      Effect.tap(Effect.logInfo),
      Effect.map((v) => new Map(v)),
    );
  }

  protected createRequestStream(
    links: ReadonlySet<string>,
  ): Stream.Stream<URLSearchParams> {
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
      Array.from(links),
      R.map((l) => ["url", l] as [string, string]),
      R.splitEvery(50),
      R.map((kv) => new URLSearchParams(kv)),
    );
  }
}
