import { Then, When, World } from "@cucumber/cucumber";
import { expect } from "chai";
import * as R from "rambda";
import { HatenaCounts } from "../../src/score";

class CustomWorld extends World {
  links: Set<string>;
}

When("取得対象が{int}件", function (this: CustomWorld, count: number) {
  this.links = new Set([...Array(count).keys()].map(String));
});

class HatenaCountsForTest extends HatenaCounts {
  buildParamsList = HatenaCounts.buildParamsList;
}

Then(
  "50件ずつにまとめて{int}回のリクエストにする",
  function (this: CustomWorld, count: number) {
    const paramsList = new HatenaCountsForTest().buildParamsList(this.links);
    expect(paramsList.length).to.equal(count);
    const sizes = paramsList.map((v) => v.size);
    expect(sizes.reduce((acc, value) => acc + value, 0)).to.eq(this.links.size);
    const maxSize = Math.max(...sizes);
    expect(maxSize).to.be.at.most(50);
  },
);
