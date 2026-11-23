/**
 * 環境変数からactionの実行環境と入力を読み取る(副作用なし)
 */
import type { ActionEnvironment, ActionInputs } from "./generate.ts";

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// https://docs.github.com/ja/actions/learn-github-actions/variables#default-environment-variables
export function readActionEnvironment(
  env: NodeJS.ProcessEnv,
): ActionEnvironment {
  return {
    repositoryOwner: required(env, "GITHUB_REPOSITORY_OWNER"),
    repositoryId: required(env, "GITHUB_REPOSITORY_ID"),
    actionRepository: required(env, "GITHUB_ACTION_REPOSITORY"),
  };
}

// core.getInputを使わずとも、内部実装的にも自動的で設定されるINPUT_*環境変数を見ているため、環境変数利用に合わせる
// https://docs.github.com/ja/actions/creating-actions/metadata-syntax-for-github-actions#example-specifying-inputs
export function readActionInputs(env: NodeJS.ProcessEnv): ActionInputs {
  const thresholdText = required(env, "INPUT_THRESHOLD");
  // Number() だけだと "0x10" や "1e3" も整数として通るため、10進の整数表記に限定する
  // 前後の空白は core.getInput と同様に許容する
  const threshold = Number(thresholdText);
  if (
    !/^\s*[+-]?\d+\s*$/.test(thresholdText) ||
    !Number.isSafeInteger(threshold)
  ) {
    throw new Error(
      `Invalid INPUT_THRESHOLD: expected an integer but got "${thresholdText}"`,
    );
  }
  // 未指定のinputは空文字で渡されることがあるため、空文字も未指定として扱う
  const cachePath = env.INPUT_CACHE;
  return {
    originalPath: required(env, "INPUT_ORIGINAL"),
    cachePath:
      cachePath === undefined || cachePath === "" ? undefined : cachePath,
    outputPath: required(env, "INPUT_OUTPUT"),
    threshold,
  };
}
