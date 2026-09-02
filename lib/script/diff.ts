// Word-level diff (LCS) for comparing two script versions. Small inputs only;
// scripts are short. Runtime-neutral, no dependencies.
export type DiffOp = { type: "equal" | "insert" | "delete"; text: string };

function tokenize(s: string): string[] {
  // Keep whitespace tokens so the rendered diff preserves line breaks.
  return s.split(/(\s+)/).filter((t) => t.length > 0);
}

export function wordDiff(oldText: string, newText: string): DiffOp[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const n = a.length;
  const m = b.length;
  // LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  const push = (type: DiffOp["type"], text: string) => {
    const last = ops[ops.length - 1];
    if (last && last.type === type) last.text += text;
    else ops.push({ type, text });
  };
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("equal", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("delete", a[i]);
      i++;
    } else {
      push("insert", b[j]);
      j++;
    }
  }
  while (i < n) push("delete", a[i++]);
  while (j < m) push("insert", b[j++]);
  return ops;
}

export function diffStats(ops: DiffOp[]): { inserted: number; deleted: number } {
  const count = (t: DiffOp["type"]) =>
    ops.filter((o) => o.type === t).reduce((n, o) => n + (o.text.match(/\S+/g)?.length ?? 0), 0);
  return { inserted: count("insert"), deleted: count("delete") };
}
