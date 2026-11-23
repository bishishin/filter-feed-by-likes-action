import { Then, When, World } from "@cucumber/cucumber";
import { expect } from "chai";
import { HatenaCounts } from "../../src/score.ts";

class CustomWorld extends World {
  requestTimes: number[];
}

When("リクエストが複数回", async function (this: CustomWorld) {
  // 仮想時刻: sleep が呼ばれると進み、api が呼ばれた時の時刻を記録する
  let now = 0;
  const requestTimes: number[] = [];
  const sleep = async (milliseconds: number) => {
    now += milliseconds;
  };
  const api = {
    getJson: async () => {
      requestTimes.push(now);
      return {};
    },
  };
  const dummyLinks = new Set([...Array(100).keys()].map(String));
  await new HatenaCounts(api, sleep).fetch(dummyLinks);
  this.requestTimes = requestTimes;
});

Then("3秒以上の間隔を設ける", function (this: CustomWorld) {
  expect(this.requestTimes.length).to.be.at.least(2);
  const intervals = this.requestTimes
    .slice(1)
    .map((time, index) => time - this.requestTimes[index]);
  expect(Math.min(...intervals)).to.be.at.least(3000);
});
