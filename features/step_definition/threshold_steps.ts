import { Given, Then, When, World } from "@cucumber/cucumber";
import { expect } from "chai";
import type * as gen from "feed";
import {
	type ActionEnvironment,
	type ActionInputs,
	FeedGenerator,
} from "../../src/generate";

class CustomWorld extends World {
	threshold: number;
	items: gen.Item[];
	scores: Map<string, number>;
}

class FeedGenForTest extends FeedGenerator {
	publishItemsOnHighScoreForTest = this.publishItemsOnHighScore;
}

Given("配信閾値設定が10", function (this: CustomWorld) {
	this.threshold = 10;
});

When("記事の評価が{int}", function (this: CustomWorld, score: number) {
	this.scores = new Map([["hoge", score]]);
	this.items = [{ title: "", link: "hoge", date: new Date() }];
});

Then(
	"対象記事を生成するフィードに配信{word}",
	function (this: CustomWorld, publishable: string) {
		const generator = new FeedGenForTest(
			{} as ActionEnvironment,
			{ threshold: this.threshold } as ActionInputs,
		);
		const items = generator.publishItemsOnHighScoreForTest(
			this.items,
			this.scores,
		);
		if (publishable === "可能") {
			expect(items).to.be.not.empty;
		} else {
			expect(items).to.be.empty;
		}
	},
);
