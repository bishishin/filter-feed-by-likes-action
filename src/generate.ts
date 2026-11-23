import { type Cause, Clock, Context, Effect } from "effect";
import * as gen from "feed";
import type parser from "rss-parser";
import { type ApiService, HatenaCounts } from "./score.ts";

/**
 * 暫定アダプタ: Effect の環境として ApiService を渡すためのタグ
 * generate() を Promise 化する際に削除する
 */
export const ApiServiceTag = Context.GenericTag<ApiService>("ApiService");

export interface ActionEnvironment {
  readonly repositoryOwner: string;
  readonly repositoryId: string;
  readonly actionRepository: string;
}

export interface ActionInputs {
  readonly originalPath: string;
  readonly cachePath: string | undefined;
  readonly outputPath: string;
  readonly threshold: number;
}

export class FeedGenerator {
  private readonly env: ActionEnvironment;
  private readonly inputs: ActionInputs;

  constructor(env: ActionEnvironment, inputs: ActionInputs) {
    this.env = env;
    this.inputs = inputs;
  }

  public generate(
    original: parser.Output<parser.Item>,
    published?: parser.Output<parser.Item>,
  ): Effect.Effect<gen.Feed, Cause.UnknownException | Error, ApiService> {
    return Effect.Do.pipe(
      Effect.bind("now", () => Clock.currentTimeMillis),
      Effect.let("publishableItems", () =>
        this.selectPublishable(original.items, published?.items ?? []),
      ),
      Effect.bind("scores", ({ publishableItems }) =>
        Effect.flatMap(ApiServiceTag, (api) =>
          Effect.tryPromise({
            try: () =>
              new HatenaCounts(api).fetch(
                new Set(publishableItems.map((v) => v.link)),
              ),
            catch: toError,
          }),
        ),
      ),
      Effect.let("newItems", ({ publishableItems, scores }) =>
        this.publishItemsOnHighScore(publishableItems, scores),
      ),
      Effect.map(({ newItems, now }) =>
        this.createFeed(newItems, now, original, published),
      ),
    );
  }

  protected selectPublishable(
    fetchedItems: readonly parser.Item[],
    publishedItems: readonly parser.Item[],
  ): readonly gen.Item[] {
    const publishedLinks = new Set(
      publishedItems.map((item) => item.link).filter(isPresent),
    );
    return fetchedItems
      .map(convertFeedItem)
      .filter(isPresent)
      .filter((item) => !publishedLinks.has(item.link));
  }

  protected publishItemsOnHighScore(
    items: readonly gen.Item[],
    scores: ReadonlyMap<string, number>,
  ): readonly gen.Item[] {
    return items.filter(
      (item) => (scores.get(item.link) ?? 0) >= this.inputs.threshold,
    );
  }

  private createFeed(
    newItems: readonly gen.Item[],
    updateAtMilliseconds: number,
    original: parser.Output<parser.Item>,
    published?: parser.Output<parser.Item>,
  ): gen.Feed {
    const publishedItems =
      published?.items.map(convertFeedItem).filter(isPresent) ?? [];
    const base = this.buildBaseFeed(original, new Date(updateAtMilliseconds));
    for (const item of [...newItems, ...publishedItems]) {
      base.addItem(item);
    }
    return base;
  }

  private buildBaseFeed(
    original: parser.Output<unknown>,
    updateAt: Date,
  ): gen.Feed {
    const tagUriSchema = [
      `tag:${this.env.repositoryOwner}.github.io,2024,`,
      this.env.repositoryId,
      this.inputs.outputPath,
    ].join("/"); // 概ね一意にする
    const title = original.title ?? "";
    return new gen.Feed({
      id: tagUriSchema,
      title: title,
      copyright: `${updateAt.getFullYear()} ${title} ${original.link}`,
      language: "ja",
      generator: this.env.actionRepository,
      updated: updateAt,
      ...(original.link && { link: original.link }),
      ...(original.feedUrl && { feedLinks: { rss: original.feedUrl } }),
    });
  }
}

/** Promise の reject 値を Error に正規化する(元のエラーメッセージを保持する) */
function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

/** null / undefined だけを除外する(空文字は有効な値として残す) */
function isPresent<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}

/** linkが無い項目は変換せず undefined を返す */
function convertFeedItem(item: parser.Item): gen.Item | undefined {
  const { link } = item;
  if (!isPresent(link)) {
    return undefined;
  }
  return {
    title: item.title ?? "",
    link,
    date: item.isoDate ? new Date(item.isoDate) : new Date(),
    ...(item.pubDate && { published: new Date(item.pubDate) }),
    ...(item.creator && { author: [{ name: item.creator }] }),
  };
}
