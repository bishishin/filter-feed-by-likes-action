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

/**
 * 配列を size 件ずつのチャンクに分割する純粋関数。
 * 空配列は空の配列を返す。最後のチャンクは size 未満になることがある。
 */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
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
      Effect.map((v) => new Map(v)),
    );
  }

  protected createRequestStream(
    links: ReadonlySet<string>,
  ): Stream.Stream<URLSearchParams> {
    const paramsList = HatenaCounts.buildParamsList(links);
    return Stream.fromIterable(paramsList).pipe(
      Stream.schedule(Schedule.spaced(Duration.seconds(3))),
    );
  }

  protected static buildParamsList(
    links: ReadonlySet<string>,
  ): readonly URLSearchParams[] {
    return chunk(Array.from(links), 50).map(
      (urls) =>
        new URLSearchParams(urls.map((l) => ["url", l] as [string, string])),
    );
  }
}
