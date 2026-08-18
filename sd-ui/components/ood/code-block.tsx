"use client";

// Simple but effective C++ syntax highlighter (no external deps)
const KEYWORDS  = new Set(["if","else","for","while","do","switch","case","break","continue","return","new","delete","class","struct","enum","public","private","protected","virtual","override","static","const","auto","this","nullptr","true","false","using","namespace","template","typename","typedef","explicit"]);
const TYPES     = new Set(["int","void","bool","char","float","double","string","vector","queue","stack","map","set","pair","size_t","time_t","cout","cin","endl","abs","ceil"]);
const PREPROC   = /^#.*/gm;
const COMMENT   = /\/\/[^\n]*/g;
const BLOCK_CMT = /\/\*[\s\S]*?\*\//g;
const STRING    = /"(?:[^"\\]|\\.)*"/g;
const NUMBER    = /\b\d+(?:\.\d+)?\b/g;

function escapeHtml(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

type Token = { type: string; value: string; start: number; end: number };

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  const add = (type: string, value: string, start: number) =>
    tokens.push({ type, value, start, end: start + value.length });

  const ranges: [number, number][] = [];
  const usedAt = new Set<number>();

  const push = (re: RegExp, type: string) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      let overlap = false;
      for (const [s, e] of ranges) if (m.index < e && m.index + m[0].length > s) { overlap = true; break; }
      if (!overlap) {
        ranges.push([m.index, m.index + m[0].length]);
        for (let i = m.index; i < m.index + m[0].length; i++) usedAt.add(i);
        add(type, m[0], m.index);
      }
    }
  };

  push(BLOCK_CMT, "comment");
  push(COMMENT,   "comment");
  push(STRING,    "string");
  push(PREPROC,   "preproc");
  push(NUMBER,    "number");

  // Identifiers
  const identRe = /[A-Za-z_]\w*/g;
  let m2: RegExpExecArray | null;
  while ((m2 = identRe.exec(code)) !== null) {
    if (usedAt.has(m2.index)) continue;
    const w = m2[0];
    const type = KEYWORDS.has(w) ? "keyword" : TYPES.has(w) ? "type"
               : /^[A-Z][A-Za-z]+$/.test(w) ? "class" : "ident";
    add(type, w, m2.index);
    for (let i = m2.index; i < m2.index + w.length; i++) usedAt.add(i);
  }

  tokens.sort((a, b) => a.start - b.start);
  return tokens;
}

const COLOR: Record<string, string> = {
  keyword: "#569CD6",
  type:    "#4EC9B0",
  class:   "#9CDCFE",
  string:  "#CE9178",
  number:  "#B5CEA8",
  comment: "#6A9955",
  preproc: "#C586C0",
  ident:   "inherit",
};

export function CppCodeBlock({ code }: { code: string }) {
  const tokens = tokenize(code);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const tok of tokens) {
    if (tok.start > cursor) {
      parts.push(
        <span key={`plain-${cursor}`}>{escapeHtml(code.slice(cursor, tok.start))}</span>
      );
    }
    parts.push(
      <span key={`tok-${tok.start}`} style={{ color: COLOR[tok.type] }}>
        {escapeHtml(tok.value)}
      </span>
    );
    cursor = tok.end;
  }
  if (cursor < code.length) {
    parts.push(<span key="tail">{escapeHtml(code.slice(cursor))}</span>);
  }

  return (
    <pre className="text-[12.5px] font-mono leading-[1.65] bg-slate-950 text-slate-200 rounded-xl p-5 overflow-auto h-full">
      <code>{parts}</code>
    </pre>
  );
}
