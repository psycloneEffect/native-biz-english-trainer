import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NO_KEY, CLEAR_ON_CLOSE_KEY,
  loadNo, saveNo, loadClearOnClose, saveClearOnClose, inputsAfterClose,
} from "../../public/prefs.js";
import { fakeStorage, throwingStorage } from "../helpers/fake-storage.mjs";

// ---- キー名 ----

test("保存キー名は既存の値と一致する（変えると利用者の設定や連番が消える）", () => {
  assert.equal(NO_KEY, "trainer-next-no");
  assert.equal(CLEAR_ON_CLOSE_KEY, "trainer-clear-on-close");
});

// ---- 「閉じる」で入力をクリアする設定 ----

test("未保存なら OFF（既定値は OFF）", () => {
  assert.equal(loadClearOnClose(fakeStorage()), false);
});

test('"1" のときだけ ON、それ以外の保存値は OFF', () => {
  assert.equal(loadClearOnClose(fakeStorage({ [CLEAR_ON_CLOSE_KEY]: "1" })), true);
  for (const v of ["0", "", "true", "on", "yes", "2"]) {
    assert.equal(loadClearOnClose(fakeStorage({ [CLEAR_ON_CLOSE_KEY]: v })), false, JSON.stringify(v));
  }
});

test('ON は "1"、OFF は "0" として保存し、読み戻すと同じ値になる', () => {
  const s = fakeStorage();
  saveClearOnClose(true, s);
  assert.equal(s.getItem(CLEAR_ON_CLOSE_KEY), "1");
  assert.equal(loadClearOnClose(s), true);
  saveClearOnClose(false, s);
  assert.equal(s.getItem(CLEAR_ON_CLOSE_KEY), "0");
  assert.equal(loadClearOnClose(s), false);
});

test("設定を保存してもファイル番号には影響しない", () => {
  const s = fakeStorage({ [NO_KEY]: "42" });
  saveClearOnClose(true, s);
  assert.equal(loadNo(s), 42);
});

test("storage が使えない環境では OFF として扱い、保存しても例外を出さない", () => {
  assert.equal(loadClearOnClose(throwingStorage()), false);
  assert.doesNotThrow(() => saveClearOnClose(true, throwingStorage()));
  assert.equal(loadClearOnClose(null), false);
  assert.doesNotThrow(() => saveClearOnClose(true, null));
});

// ---- 「閉じる」の後の入力欄 ----

const INPUTS = { situation: "合格の報告を受けた", ng: "Oh great.", native: "Congrats!" };

test("ON なら3欄すべてを空にする", () => {
  assert.deepEqual(inputsAfterClose(INPUTS, true), { situation: "", ng: "", native: "" });
});

test("OFF なら入力をそのまま残す", () => {
  assert.deepEqual(inputsAfterClose(INPUTS, false), INPUTS);
});

test("受け取った入力オブジェクトを書き換えない", () => {
  const before = { ...INPUTS };
  inputsAfterClose(INPUTS, true);
  inputsAfterClose(INPUTS, false);
  assert.deepEqual(INPUTS, before);
});

test("OFF でも別のオブジェクトを返す（呼び出し側が誤って元を書き換えないため）", () => {
  assert.notEqual(inputsAfterClose(INPUTS, false), INPUTS);
});

test("欄が増えても ON ならすべて空にする（クリア漏れの防止）", () => {
  assert.deepEqual(inputsAfterClose({ ...INPUTS, memo: "x" }, true), { situation: "", ng: "", native: "", memo: "" });
});

// ---- ファイル番号 ----

test("未保存・数値でない値なら 1", () => {
  assert.equal(loadNo(fakeStorage()), 1);
  for (const v of ["", "abc", "NaN"]) assert.equal(loadNo(fakeStorage({ [NO_KEY]: v })), 1, JSON.stringify(v));
});

test("1〜999 はそのまま、範囲外は 1", () => {
  assert.equal(loadNo(fakeStorage({ [NO_KEY]: "1" })), 1);
  assert.equal(loadNo(fakeStorage({ [NO_KEY]: "999" })), 999);
  for (const v of ["0", "-5", "1000"]) assert.equal(loadNo(fakeStorage({ [NO_KEY]: v })), 1, v);
});

test("保存した番号を読み戻せる", () => {
  const s = fakeStorage();
  saveNo(17, s);
  assert.equal(s.getItem(NO_KEY), "17");
  assert.equal(loadNo(s), 17);
});

test("storage が使えない環境では 1 として扱い、保存しても例外を出さない", () => {
  assert.equal(loadNo(throwingStorage()), 1);
  assert.doesNotThrow(() => saveNo(5, throwingStorage()));
});
