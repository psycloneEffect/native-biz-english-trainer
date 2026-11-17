import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA, schemaBlock, missingFields, dictLink, toMarkdown, safeTitle, pad3,
} from "../../../public/shared/schema.js";

/** 必須項目をすべて満たす教材。各テストで必要な箇所だけ上書きする。 */
const lesson = (over = {}) => ({
  file_title: "相手の成功を祝う表現",
  native: "Congrats!",
  lead: "相手の努力をまっすぐ認める言い方です。",
  ng_phrases: ["Oh great.", "Good for you."],
  why_ng: "1段落目。\n\n2段落目。",
  impression: { listener: "合格した同僚", ng: "皮肉に聞こえる", native: "素直に嬉しい", gap: "信頼が変わる" },
  standard: { en: "Congrats!", ja: "おめでとう！" },
  formal: { en: "Congratulations on passing.", ja: "合格おめでとうございます。" },
  sources: [{ name: "Cambridge", keyword: "congrats", url: "https://example.test/c", note: "くだけた祝意" }],
  ...over,
});

// ---- SCHEMA / schemaBlock ----

test("SCHEMA のキーは重複しない", () => {
  const keys = SCHEMA.map((f) => f.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("schemaBlock は SCHEMA の全キーを順序どおりに含む", () => {
  const block = schemaBlock();
  let pos = -1;
  for (const f of SCHEMA) {
    const i = block.indexOf(`"${f.key}"`);
    assert.ok(i > pos, f.key + " が見つからないか順序が違う");
    pos = i;
  }
});

test("schemaBlock は配列型を [] で、オブジェクト配列を [{ }] で表す", () => {
  const block = schemaBlock();
  assert.match(block, /"ng_phrases": \["/);
  assert.match(block, /"sources": \[\{/);
  assert.match(block, /\}\]\s*\n\}$/);
});

// ---- missingFields ----

test("必須項目がそろっていれば空配列", () => {
  assert.deepEqual(missingFields(lesson()), []);
});

test("任意項目（sources、impression の listener / gap）が無くても妥当", () => {
  const d = lesson({ impression: { ng: "a", native: "b" } });
  delete d.sources;
  assert.deepEqual(missingFields(d), []);
});

test("オブジェクトでない入力は (not an object)", () => {
  for (const v of [null, undefined, "x", 5]) assert.deepEqual(missingFields(v), ["(not an object)"]);
});

test("空文字・空白のみの必須文字列は欠落として扱う", () => {
  assert.deepEqual(missingFields(lesson({ lead: "  " })), ["lead"]);
  assert.deepEqual(missingFields(lesson({ native: "" })), ["native"]);
});

test("ng_phrases は空でない要素が1つも無ければ欠落", () => {
  assert.deepEqual(missingFields(lesson({ ng_phrases: [] })), ["ng_phrases"]);
  assert.deepEqual(missingFields(lesson({ ng_phrases: ["", " "] })), ["ng_phrases"]);
  assert.deepEqual(missingFields(lesson({ ng_phrases: "Oh great." })), ["ng_phrases"]);
});

test("オブジェクト項目は、中の必須フィールドが欠けていれば欠落", () => {
  assert.deepEqual(missingFields(lesson({ standard: { en: "x" } })), ["standard"]);
  assert.deepEqual(missingFields(lesson({ impression: { ng: "a" } })), ["impression"]);
  assert.deepEqual(missingFields(lesson({ formal: "x" })), ["formal"]);
});

test("欠落が複数あればすべて返す", () => {
  assert.deepEqual(missingFields(lesson({ lead: "", why_ng: "" })).sort(), ["lead", "why_ng"]);
});

// ---- dictLink ----

test("既知の辞書は見出し語の検索リンクを返し、見出し語をエンコードする", () => {
  assert.equal(dictLink("英辞郎 on the WEB", "good for you"), "https://eow.alc.co.jp/search?q=good%20for%20you");
  assert.match(dictLink("Cambridge Dictionary", "x"), /^https:\/\/dictionary\.cambridge\.org\/search\//);
  assert.equal(dictLink("Merriam-Webster", "x"), "https://www.merriam-webster.com/dictionary/x");
  assert.match(dictLink("Oxford Learner's", "x"), /^https:\/\/www\.oxfordlearnersdictionaries\.com\/search\//);
});

test("未知の辞書や見出し語なしは空文字（推測で URL を組み立てない）", () => {
  assert.equal(dictLink("Unknown Dict", "x"), "");
  assert.equal(dictLink("Cambridge", ""), "");
  assert.equal(dictLink("Cambridge", "   "), "");
  assert.equal(dictLink("Cambridge", undefined), "");
});

// ---- toMarkdown ----

test("各見出しを決まった順序で出力し、末尾は改行1つ", () => {
  const md = toMarkdown(lesson(), "合格の報告");
  const heads = ["❌ 日本人がやりがちなNGフレーズ", "💡 なぜNGなのか", "🎭 この場面での印象の違い",
    "⭕️ ネイティブが使う自然なOKフレーズ", "📖 ソース・参考情報"];
  let pos = -1;
  for (const h of heads) {
    const i = md.indexOf("### " + h);
    assert.ok(i > pos, h);
    pos = i;
  }
  assert.ok(md.endsWith("\n") && !md.endsWith("\n\n"));
});

test("why_ng の段落区切り（空行）を保つ", () => {
  const md = toMarkdown(lesson(), "x");
  assert.match(md, /1段落目。\n\n2段落目。/);
});

test("表のセルでは | を全角に、改行を空白に置き換える（表が崩れないように）", () => {
  const md = toMarkdown(lesson({ impression: { ng: "a|b\nc", native: "ok" } }), "x");
  assert.match(md, /\| a／b c \|/);
});

test("コード表記の中のバッククォートは ' に置き換える", () => {
  const md = toMarkdown(lesson({ ng_phrases: ["say `hi`"] }), "x");
  assert.match(md, /\* `say 'hi'`/);
});

test("任意項目の listener / gap が無ければ、その行を出さない", () => {
  const md = toMarkdown(lesson({ impression: { ng: "a", native: "b" } }), "x");
  assert.doesNotMatch(md, /聞き手:/);
  assert.doesNotMatch(md, /差が生むもの/);
});

test("出典 URL があればそれを使い、無ければ辞書の検索リンクを「辞書で確認」として出す", () => {
  const md = toMarkdown(lesson({
    sources: [
      { name: "Cambridge", keyword: "congrats", url: "https://example.test/c", note: "n1" },
      { name: "Merriam-Webster", keyword: "congrats", note: "n2" },
    ],
  }), "x");
  assert.match(md, /\[出典\]\(https:\/\/example\.test\/c\)/);
  assert.match(md, /\[辞書で確認\]\(https:\/\/www\.merriam-webster\.com\/dictionary\/congrats\)/);
  assert.match(md, /\*\*出典:\*\* Cambridge \/ Merriam-Webster/);
});

test("出典が無ければ「なし」と確認を促す文を出す", () => {
  const md = toMarkdown(lesson({ sources: [] }), "x");
  assert.match(md, /\*\*出典:\*\* なし/);
  assert.match(md, /参考情報が得られませんでした/);
});

test("同じ辞書が複数あっても出典名は1回だけ", () => {
  const md = toMarkdown(lesson({
    sources: [{ name: "Cambridge", note: "a" }, { name: "Cambridge", note: "b" }],
  }), "x");
  assert.match(md, /\*\*出典:\*\* Cambridge\n/);
});

// ---- safeTitle / pad3 ----

test("safeTitle はファイル名に使えない文字を落とし、40文字で切る", () => {
  assert.equal(safeTitle('a\\b/c:d*e?f"g<h>i|j\r\n\tk'), "abcdefghijk");
  assert.equal(safeTitle("あ".repeat(50)).length, 40);
});

test("safeTitle は空になったら「表現メモ」", () => {
  assert.equal(safeTitle(""), "表現メモ");
  assert.equal(safeTitle("  "), "表現メモ");
  assert.equal(safeTitle("///"), "表現メモ");
});

test("pad3 は3桁に0埋めし、3桁以上はそのまま", () => {
  assert.equal(pad3(1), "001");
  assert.equal(pad3(42), "042");
  assert.equal(pad3(999), "999");
  assert.equal(pad3(1000), "1000");
});
