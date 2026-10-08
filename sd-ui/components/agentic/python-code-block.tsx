"use client";

// Python highlighter for the Agentic AI code panels — same palette and output
// shape as CppCodeBlock, so the C++, SQL and Python panels read as one family.
// One left-to-right regex pass instead of CppCodeBlock's per-category passes:
// in Python a "#" inside a string literal is not a comment and an f-string can
// hold both quote styles, so whichever token starts earliest has to win — which
// is exactly what a single alternation scanning forward gives you.

const KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "case", "class",
  "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if",
  "import", "in", "is", "lambda", "match", "nonlocal", "not", "or", "pass", "raise", "return",
  "try", "while", "with", "yield",
]);

const BUILTINS = new Set([
  "self", "cls", "print", "len", "range", "enumerate", "zip", "map", "filter", "sorted", "sum",
  "min", "max", "abs", "round", "isinstance", "getattr", "setattr", "hasattr", "open", "repr",
  "str", "int", "float", "bool", "list", "dict", "set", "tuple", "type", "object", "super",
  "any", "all", "next", "iter", "Exception", "ValueError", "KeyError", "TypeError",
  "RuntimeError", "TimeoutError", "NotImplementedError",
]);

// Groups: 1 string (optional r/b/u/f prefix, triple quotes first), 2 comment,
// 3 decorator, 4 number, 5 identifier.
const TOKEN =
  /([rRbBuUfF]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'))|(#[^\n]*)|(@[A-Za-z_][\w.]*)|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_]\w*)/g;

const COLOR: Record<string, string> = {
  keyword:   "#569CD6",
  builtin:   "#4EC9B0",
  class:     "#9CDCFE",
  fn:        "#DCDCAA",
  string:    "#CE9178",
  number:    "#B5CEA8",
  comment:   "#6A9955",
  decorator: "#C586C0",
};

function classify(m: RegExpMatchArray, prevWord: string): string | null {
  if (m[1] !== undefined) return "string";
  if (m[2] !== undefined) return "comment";
  if (m[3] !== undefined) return "decorator";
  if (m[4] !== undefined) return "number";
  const w = m[5];
  if (KEYWORDS.has(w)) return "keyword";
  if (prevWord === "def" || prevWord === "class") return prevWord === "def" ? "fn" : "class";
  if (BUILTINS.has(w)) return "builtin";
  if (/^[A-Z][A-Za-z0-9]+$/.test(w)) return "class";
  return null;
}

export function PythonCodeBlock({ code }: { code: string }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let prevWord = "";

  // JSX text children are escaped by React, so "<", ">" and "&" in the source
  // render as-is without any manual HTML escaping.
  for (const m of code.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    const type = classify(m, prevWord);
    if (start > cursor) parts.push(<span key={`p-${cursor}`}>{code.slice(cursor, start)}</span>);
    parts.push(
      <span key={`t-${start}`} style={type ? { color: COLOR[type] } : undefined}>
        {m[0]}
      </span>
    );
    cursor = start + m[0].length;
    if (m[5] !== undefined) prevWord = m[5];
  }
  if (cursor < code.length) parts.push(<span key="tail">{code.slice(cursor)}</span>);

  return (
    <pre className="text-[12.5px] font-mono leading-[1.65] bg-slate-950 text-slate-200 rounded-xl p-5 overflow-auto h-full">
      <code>{parts}</code>
    </pre>
  );
}
