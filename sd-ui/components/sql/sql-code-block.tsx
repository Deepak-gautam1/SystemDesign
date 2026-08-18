"use client";

// Simple but effective SQL syntax highlighter (no external deps) — mirrors
// the C++ highlighter in components/ood/code-block.tsx, adapted for SQL's
// case-insensitive keywords, single-quoted strings, and -- line comments.
const KEYWORDS = new Set([
  "SELECT","FROM","WHERE","GROUP","BY","HAVING","ORDER","LIMIT","OFFSET","AS",
  "JOIN","INNER","LEFT","RIGHT","FULL","OUTER","CROSS","ON","AND","OR","NOT",
  "IN","EXISTS","BETWEEN","LIKE","IS","NULL","DISTINCT","ALL","ANY","SOME",
  "UNION","INTERSECT","EXCEPT","MINUS",
  "CASE","WHEN","THEN","ELSE","END",
  "WITH","RECURSIVE",
  "INSERT","INTO","VALUES","UPDATE","SET","DELETE",
  "CREATE","TABLE","TEMP","TEMPORARY","ALTER","DROP","ADD","COLUMN",
  "PRIMARY","KEY","FOREIGN","REFERENCES","UNIQUE","CHECK","DEFAULT","CONSTRAINT",
  "INDEX","VIEW","MATERIALIZED","TRIGGER","PROCEDURE","FUNCTION",
  "RETURNS","RETURN","BEGIN","LANGUAGE","DECLARE","IF","ELSEIF","LOOP","FOR","WHILE","EXECUTE",
  "GRANT","REVOKE","TO","COMMIT","ROLLBACK","SAVEPOINT","TRANSACTION","START",
  "PARTITION","OVER","ROWS","RANGE","PRECEDING","FOLLOWING","UNBOUNDED","CURRENT","ROW","FILTER",
  "ASC","DESC","INTERVAL","CAST","USING","CASCADE","RESTRICT","NULLS","FIRST","LAST",
]);

const TYPES = new Set([
  "INT","INTEGER","BIGINT","SMALLINT","NUMERIC","DECIMAL","FLOAT","DOUBLE","REAL",
  "VARCHAR","CHAR","TEXT","BOOLEAN","BOOL","DATE","TIMESTAMP","TIME","SERIAL","UUID","JSON","JSONB",
  "COUNT","SUM","AVG","MIN","MAX",
  "ROW_NUMBER","RANK","DENSE_RANK","LAG","LEAD","NTILE","FIRST_VALUE","LAST_VALUE",
  "COALESCE","NULLIF","ROUND","ABS","CEIL","FLOOR","CONCAT","SUBSTRING","TRIM",
  "UPPER","LOWER","LENGTH","NOW","EXTRACT","GETDATE","GENERATE_SERIES",
]);

const BLOCK_CMT = /\/\*[\s\S]*?\*\//g;
const LINE_CMT  = /--[^\n]*/g;
const SQ_STRING = /'(?:[^'\\]|\\.|'')*'/g;
const DQ_IDENT  = /"(?:[^"\\]|\\.)*"/g;
const NUMBER    = /\b\d+(?:\.\d+)?\b/g;
const PARAM     = /:[A-Za-z_]\w*/g;

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
      if (m[0].length === 0) re.lastIndex++;
    }
  };

  push(BLOCK_CMT, "comment");
  push(LINE_CMT,  "comment");
  push(SQ_STRING, "string");
  push(DQ_IDENT,  "ident-quoted");
  push(PARAM,     "param");
  push(NUMBER,    "number");

  // Identifiers / keywords — SQL keywords are case-insensitive, so classify
  // by the uppercased form while keeping the original casing in the output.
  const identRe = /[A-Za-z_]\w*/g;
  let m2: RegExpExecArray | null;
  while ((m2 = identRe.exec(code)) !== null) {
    if (usedAt.has(m2.index)) continue;
    const w = m2[0];
    const upper = w.toUpperCase();
    const type = KEYWORDS.has(upper) ? "keyword" : TYPES.has(upper) ? "type" : "ident";
    add(type, w, m2.index);
    for (let i = m2.index; i < m2.index + w.length; i++) usedAt.add(i);
  }

  tokens.sort((a, b) => a.start - b.start);
  return tokens;
}

const COLOR: Record<string, string> = {
  keyword:       "#569CD6",
  type:          "#4EC9B0",
  "ident-quoted": "#9CDCFE",
  string:        "#CE9178",
  number:        "#B5CEA8",
  comment:       "#6A9955",
  param:         "#C586C0",
  ident:         "inherit",
};

export function SqlCodeBlock({ code }: { code: string }) {
  const tokens = tokenize(code);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  // JSX text children are escaped automatically by React on render — no
  // manual HTML-escaping here, or "<"/">"/"&" in the source would show up
  // literally as "&lt;"/"&gt;"/"&amp;" instead of being displayed as-is.
  for (const tok of tokens) {
    if (tok.start > cursor) {
      parts.push(
        <span key={`plain-${cursor}`}>{code.slice(cursor, tok.start)}</span>
      );
    }
    parts.push(
      <span key={`tok-${tok.start}`} style={{ color: COLOR[tok.type] }}>
        {tok.value}
      </span>
    );
    cursor = tok.end;
  }
  if (cursor < code.length) {
    parts.push(<span key="tail">{code.slice(cursor)}</span>);
  }

  return (
    <pre className="text-[12.5px] font-mono leading-[1.65] bg-zinc-950 text-zinc-200 rounded-xl p-5 overflow-auto h-full">
      <code>{parts}</code>
    </pre>
  );
}
