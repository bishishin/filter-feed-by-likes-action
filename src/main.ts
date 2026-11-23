import * as fs from "node:fs";
import type * as gen from "feed";
import parser from "rss-parser";
import {
  type ActionEnvironment,
  type ActionInputs,
  FeedGenerator,
} from "./generate.ts";
import { type ApiService, HatenaCounts } from "./score.ts";

export async function main(
  env: ActionEnvironment,
  inputs: ActionInputs,
  api: ApiService,
  now?: () => Date,
): Promise<gen.Feed> {
  const origFeed = await new parser().parseString(
    fs.readFileSync(inputs.originalPath, "utf-8"),
  );
  const cacheFeed = await loadCacheFile(inputs.cachePath);
  const feed = await new FeedGenerator(
    env,
    inputs,
    new HatenaCounts(api),
    now,
  ).generate(origFeed, cacheFeed);
  fs.writeFileSync(inputs.outputPath, feed.atom1());
  return feed;
}

/**
 * 配信済みキャッシュを読み込む
 * - path が undefined、またはファイルが存在しない場合は undefined(初期起動扱い)
 * - 読み込み・パースに失敗した場合は reject
 */
export async function loadCacheFile(
  path: string | undefined,
): Promise<parser.Output<parser.Item> | undefined> {
  if (path === undefined || !fs.existsSync(path)) {
    return undefined;
  }
  return new parser().parseString(fs.readFileSync(path, "utf-8"));
}
