/**
 * actionのエントリーポイント
 * action環境に依存する実装もここで注入する
 */
import * as core from "@actions/core";
import { NodeRuntime as Node } from "@effect/platform-node";
import {
  Config,
  Effect,
  Either,
  Layer,
  type LogLevel,
  Logger,
  Match,
  Schema,
  identity,
} from "effect";
import { main } from "./main";
import { type ApiFetchError, ApiService } from "./score";

// https://docs.github.com/ja/actions/learn-github-actions/variables#default-environment-variables
const actionEnvConfig = Config.all({
  repositoryOwner: Config.string("GITHUB_REPOSITORY_OWNER"),
  repositoryId: Config.string("GITHUB_REPOSITORY_ID"),
  actionRepository: Config.string("GITHUB_ACTION_REPOSITORY"),
});
// core.getInputを使わずとも、内部実装的にも自動的で設定されるINPUT_*環境変数を見ているため、環境変数利用に合わせる
// https://docs.github.com/ja/actions/creating-actions/metadata-syntax-for-github-actions#example-specifying-inputs
const actionInputsConfig = Config.all({
  originalPath: Config.string("INPUT_ORIGINAL"),
  cachePath: Config.option(Config.string("INPUT_CACHE")),
  outputPath: Config.string("INPUT_OUTPUT"),
  threshold: Config.integer("INPUT_THRESHOLD"),
});
function get<T>(
  schema: Schema.Schema<T>,
  url: string,
  params: URLSearchParams,
): Effect.Effect<T, ApiFetchError> {
  return Effect.tryPromise(() => fetch(`${url}?${params.toString()}`)).pipe(
    Effect.filterOrFail(
      (response) => response.ok,
      (response) => new Error(`${response.status}\t${response.url}`),
    ),
    Effect.flatMap((response) => Effect.tryPromise(() => response.json())),
    Effect.flatMap(Schema.decodeUnknownEither(schema)),
  );
}
const makeApiService = Effect.succeed(ApiService.of({ get }));
const logger = Logger.make(({ logLevel, message }) => {
  Match.type<LogLevel.LogLevel>().pipe(
    Match.tagsExhaustive({
      Fatal: () => core.error(`${message}`),
      Error: () => core.error(`${message}`),
      Warning: () => core.warning(`${message}`),
      Info: () => core.info(`${message}`),
      Debug: () => core.debug(`${message}`),
      Trace: () => core.debug(`${message}`),
      All: identity,
      None: () => identity,
    }),
  )(logLevel);
});
Effect.Do.pipe(
  Effect.bind("env", () => actionEnvConfig),
  Effect.bind("inputs", () => actionInputsConfig),
  Effect.flatMap(({ env, inputs }) => main(env, inputs)),
  Effect.provide(Layer.effect(ApiService, makeApiService)),
  Effect.provide(Logger.replace(Logger.defaultLogger, logger)),
  Effect.catchAllCause((e) => Either.try(() => core.setFailed(e.toString()))),
  Node.runMain,
);
