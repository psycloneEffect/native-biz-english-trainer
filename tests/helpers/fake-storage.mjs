// 画面の設定テスト用の偽 localStorage。node:test だけで動かすため、依存は使わない。

/** Web Storage の getItem / setItem / removeItem だけを持つ最小限の実装。値は文字列で保存する。 */
export function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, String(v)]));
  return {
    store,
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
  };
}

/** プライベートモード等を想定し、読み書きのたびに例外を投げる storage。 */
export function throwingStorage() {
  const err = () => { throw new Error("SecurityError: storage is not available"); };
  return { getItem: err, setItem: err, removeItem: err };
}
