/**
 * 画面の設定をブラウザに保存する処理。
 *
 * React やブラウザの描画に依存しない純粋な関数だけを置く。
 * app.js は React の UMD を前提にしていて node:test から読めないため、
 * テストしたい判断はここへ切り出す（tests/public/prefs.test.mjs）。
 *
 * storage を引数で受けるのは、テストで偽の localStorage を渡すため。
 * 省略時はブラウザの localStorage を使う。
 */

/** 次に使うファイル番号。キー名を変えると利用者の連番がリセットされるので変えない。 */
export const NO_KEY = "trainer-next-no";

/** 「閉じる」で入力をクリアするか。既定は OFF。 */
export const CLEAR_ON_CLOSE_KEY = "trainer-clear-on-close";

const NO_MIN = 1;
const NO_MAX = 999;

/** localStorage を取得する。プライベートモード等で参照自体が例外になる環境では null。 */
function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch (e) {
    return null;
  }
}

/** 保存済みのファイル番号を返す。未保存・不正値・範囲外は 1。 */
export function loadNo(storage = defaultStorage()) {
  try {
    const v = parseInt(storage.getItem(NO_KEY), 10);
    return Number.isFinite(v) && v >= NO_MIN && v <= NO_MAX ? v : NO_MIN;
  } catch (e) {
    return NO_MIN;
  }
}

/** ファイル番号を保存する。保存できない環境では黙って諦める（画面の動作は止めない）。 */
export function saveNo(n, storage = defaultStorage()) {
  try { storage.setItem(NO_KEY, String(n)); } catch (e) { /* プライベートモード等 */ }
}

/** 「閉じる」で入力をクリアするか。"1" のときだけ ON、それ以外（未保存を含む）は OFF。 */
export function loadClearOnClose(storage = defaultStorage()) {
  try {
    return storage.getItem(CLEAR_ON_CLOSE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

/** 「閉じる」で入力をクリアするかを保存する。 */
export function saveClearOnClose(on, storage = defaultStorage()) {
  try { storage.setItem(CLEAR_ON_CLOSE_KEY, on ? "1" : "0"); } catch (e) { /* プライベートモード等 */ }
}

/**
 * 「閉じる」を押した後の入力欄の値を返す。
 * ON なら3欄すべてを空にし、OFF なら受け取った値をそのまま返す。
 * 欄を足したときにクリア漏れが起きないよう、受け取ったキーをすべて空にする。
 */
export function inputsAfterClose(inputs, clearOnClose) {
  if (!clearOnClose) return { ...inputs };
  return Object.fromEntries(Object.keys(inputs).map((k) => [k, ""]));
}
