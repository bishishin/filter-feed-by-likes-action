/**
 * actionのエントリーポイント
 * action環境に依存する実装もここで注入する
 */
import { inspect } from "node:util";
import * as core from "@actions/core";
import { readActionEnvironment, readActionInputs } from "./config.ts";
import { main } from "./main.ts";
import type { ApiService } from "./score.ts";

/** 応答の無いAPIでジョブが止まり続けないよう、1リクエストの上限時間を設ける */
const REQUEST_TIMEOUT_MS = 30_000;

async function getJson(url: string, params: URLSearchParams): Promise<unknown> {
  const response = await fetch(`${url}?${params.toString()}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${response.status}\t${url}`);
  }
  return response.json();
}
const api: ApiService = { getJson };

/**
 * cause を辿ってエラーメッセージを連結する
 * fetch の失敗は message が "fetch failed" だけで、本当の原因(DNS解決失敗など)は cause に入るため
 */
function describeError(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  // 循環参照に備えて辿る深さを制限する
  for (let depth = 0; depth < 5 && current !== undefined; depth++) {
    if (!(current instanceof Error)) {
      messages.push(String(current));
      break;
    }
    messages.push(current.message);
    current = current.cause;
  }
  return messages.join(": ");
}

async function run(): Promise<void> {
  const env = readActionEnvironment(process.env);
  const inputs = readActionInputs(process.env);
  await main(env, inputs, api);
}

run().catch((error: unknown) => {
  core.setFailed(describeError(error));
  // スタックトレースを含む詳細はデバッグログ(ACTIONS_STEP_DEBUG)で確認できるようにする
  core.debug(inspect(error));
});
