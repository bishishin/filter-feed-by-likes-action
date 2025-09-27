/**
 * MIMEタイプのバリデーションと正規化を行う機能を提供します
 */
import db from "mime-db";

/**
 * MIMEタイプの検証設定
 */
export interface MimeTypeValidationOptions {
  /** バリデーションを有効にするかどうか */
  enabled: boolean;
  /** 不正なMIMEタイプを検出した場合のデフォルト値 */
  defaultMimeType: string;
}

/**
 * MIMEタイプの文字列が有効かどうかを検証します
 * @param mimeType 検証対象のMIMEタイプ文字列
 * @returns 有効な場合はtrue、そうでない場合はfalse
 */
export function isValidMimeType(mimeType: string): boolean {
  // 空文字列や無効な形式のMIMEタイプを拒否
  if (!mimeType || !mimeType.includes("/")) {
    return false;
  }

  // mime-dbに登録されているタイプかどうかをチェック
  return mimeType in db;
}

/**
 * MIMEタイプの文字列を検証し、必要に応じて正規化します
 * @param mimeType 検証・正規化対象のMIMEタイプ文字列
 * @param options バリデーション設定
 * @returns 正規化されたMIMEタイプ文字列、またはnull（バリデーション無効時）
 */
export function validateAndNormalizeMimeType(
  mimeType: string,
  options: MimeTypeValidationOptions
): string | null {
  // バリデーションが無効な場合は、元の値をそのまま返す
  if (!options.enabled) {
    return null;
  }

  // MIMEタイプが有効な場合は、そのまま返す
  if (isValidMimeType(mimeType)) {
    return mimeType;
  }

  // 不正なMIMEタイプの場合は、デフォルト値を返す
  return options.defaultMimeType;
}