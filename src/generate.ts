import { Clock, Effect, Option } from "effect";
import * as gen from "feed";
import type parser from "rss-parser";
import {
  type ApiFetchError,
  type ApiService,
  HatenaCounts,
  type ScoreApi,
} from "./score";

export interface ActionEnvironment {
  readonly repositoryOwner: string;
  readonly repositoryId: string;
  readonly actionRepository: string;
}

export interface ActionInputs {
  readonly originalPath: string;
  readonly cachePath: Option.Option<string>;
  readonly outputPath: string;
  readonly threshold: number;
}

export class FeedGenerator {
  private readonly scoreApi: ScoreApi;

  constructor(
    private readonly env: ActionEnvironment,
    private readonly inputs: ActionInputs,
  ) {
    this.scoreApi = new HatenaCounts();
  }

  public generate(
    original: parser.Output<parser.Item>,
    published?: parser.Output<parser.Item>,
  ): Effect.Effect<gen.Feed, ApiFetchError | Error, ApiService> {
    return Effect.Do.pipe(
      Effect.bind("now", () => Clock.currentTimeMillis),
      Effect.let("publishableItems", () =>
        this.selectPublishable(original.items, published?.items ?? []),
      ),
      Effect.bind("scores", ({ publishableItems }) =>
        this.scoreApi.fetch(new Set(publishableItems.map((v) => v.link))),
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
      publishedItems
        .map((item) => Option.fromNullable(item.link))
        .flatMap(Option.toArray),
    );
    return fetchedItems
      .map(convertFeedItem)
      .flatMap(Option.toArray)
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
      published?.items.map(convertFeedItem).flatMap(Option.toArray) ?? [];
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
      ...(original.description && { description: original.description }),
      ...(original.link && { link: original.link }),
      ...(original.feedUrl && { feedLinks: original.feedUrl }),
      ...(original.image && { image: original.image.url }),
    });
  }
}

function convertFeedItem(item: parser.Item): Option.Option<gen.Item> {
  return Option.fromNullable(item.link).pipe(
    Option.map((l) => ({
      title: item.title ?? "",
      link: l,
      date: item.isoDate ? new Date(item.isoDate) : new Date(),
      ...(item.pubDate && { published: new Date(item.pubDate) }),
      ...(item.summary && { description: item.summary }),
      ...(item.content && { content: item.content }),
      ...(item.guid && { guid: item.guid }),
      ...(item.creator && { author: [{ name: item.creator }] }),
      ...(item.enclosure && { enclosure: item.enclosure }),
      ...(item.categories && {
        category: item.categories.map((v) => ({ name: v })),
      }),
    })),
  );
}
