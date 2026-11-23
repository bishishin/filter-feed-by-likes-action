/**
 * actionのエントリーポイント
 * action環境に依存する実装もここで注入する
 */
import * as core from "@actions/core";
import { readActionEnvironment, readActionInputs } from "./config.ts";
import { main } from "./main.ts";
import type { ApiService } from "./score.ts";

async function getJson(url: string, params: URLSearchParams): Promise<unknown> {
  const response = await fetch(`${url}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`${response.status}\t${url}`);
  }
  return response.json();
}
const api: ApiService = { getJson };

async function run(): Promise<void> {
  const env = readActionEnvironment(process.env);
  const inputs = readActionInputs(process.env);
  await main(env, inputs, api);
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
