import { setTimeout as delay } from "node:timers/promises";

/** HTTP取得の抽象。テストではモックを渡す */
export interface ApiService {
  getJson(url: string, params: URLSearchParams): Promise<unknown>;
}

/** 指定ミリ秒待機する関数。テストでは仮想時刻を進める偽物を渡す */
export type Sleep = (milliseconds: number) => Promise<void>;

/** はてなAPIへの配慮として、リクエスト間に設ける最小間隔 */
export const REQUEST_INTERVAL_MS = 3000;

const defaultSleep: Sleep = (milliseconds) => delay(milliseconds);

export interface ScoreApi {
  fetch(links: ReadonlySet<string>): Promise<ReadonlyMap<string, number>>;
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

/**
 * はてなブックマーク件数APIのレスポンスを検証する。
 * 「文字列キー → 整数値」のオブジェクトでなければ Error を投げる。
 */
export function parseHatenaCounts(json: unknown): Map<string, number> {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error("Invalid response: expected an object of counts");
  }
  const counts = new Map<string, number>();
  for (const [key, value] of Object.entries(json)) {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new Error(
        `Invalid response: count for "${key}" is not an integer: ${String(value)}`,
      );
    }
    counts.set(key, value);
  }
  return counts;
}

export class HatenaCounts implements ScoreApi {
  private readonly api: ApiService;
  private readonly sleep: Sleep;

  constructor(api: ApiService, sleep: Sleep = defaultSleep) {
    this.api = api;
    this.sleep = sleep;
  }

  /**
   * リクエストは並列にせず逐次実行する。
   * 2回目以降のリクエストの前に REQUEST_INTERVAL_MS 待機する。
   */
  public async fetch(
    links: ReadonlySet<string>,
  ): Promise<ReadonlyMap<string, number>> {
    const url = "https://bookmark.hatenaapis.com/count/entries";
    const result = new Map<string, number>();
    const paramsList = HatenaCounts.buildParamsList(links);
    for (const [index, params] of paramsList.entries()) {
      if (index > 0) {
        await this.sleep(REQUEST_INTERVAL_MS);
      }
      const counts = parseHatenaCounts(await this.api.getJson(url, params));
      for (const [link, count] of counts) {
        result.set(link, count);
      }
    }
    return result;
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
