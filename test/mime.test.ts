import { expect } from "chai";
import { describe, it } from "node:test";
import {
  type MimeTypeValidationOptions,
  isValidMimeType,
  validateAndNormalizeMimeType,
} from "../src/mime";

describe("MIMEタイプバリデーション", async () => {
  describe("isValidMimeType", () => {
    it("正しいMIMEタイプを受け入れる", () => {
      expect(isValidMimeType("image/jpeg")).to.be.true;
      expect(isValidMimeType("image/png")).to.be.true;
      expect(isValidMimeType("image/gif")).to.be.true;
      expect(isValidMimeType("image/webp")).to.be.true;
      expect(isValidMimeType("application/pdf")).to.be.true;
      expect(isValidMimeType("text/html")).to.be.true;
    });

    it("不正なMIMEタイプを拒否する", () => {
      expect(isValidMimeType("image//i/jbkwRaW")).to.be.false;
      expect(isValidMimeType("invalid")).to.be.false;
      expect(isValidMimeType("text/not-a-real-type")).to.be.false;
      expect(isValidMimeType("")).to.be.false;
      expect(isValidMimeType("fake/type")).to.be.false;
    });
  });

  describe("validateAndNormalizeMimeType", () => {
    const options: MimeTypeValidationOptions = {
      enabled: true,
      defaultMimeType: "image/jpeg",
    };

    it("バリデーション無効時は元の値を返す", () => {
      const result = validateAndNormalizeMimeType("image//i/jbkwRaW", {
        enabled: false,
        defaultMimeType: "image/jpeg",
      });
      expect(result).to.be.null;
    });

    it("正しいMIMEタイプはそのまま返す", () => {
      expect(validateAndNormalizeMimeType("image/png", options)).to.equal("image/png");
      expect(validateAndNormalizeMimeType("application/pdf", options)).to.equal("application/pdf");
      expect(validateAndNormalizeMimeType("text/html", options)).to.equal("text/html");
    });

    it("不正なMIMEタイプはデフォルト値に置換", () => {
      expect(validateAndNormalizeMimeType("image//i/jbkwRaW", options)).to.equal("image/jpeg");
      expect(validateAndNormalizeMimeType("invalid", options)).to.equal("image/jpeg");
      expect(validateAndNormalizeMimeType("text/not-a-real-type", options)).to.equal("image/jpeg");
    });
  });
});