import { marked } from "marked";
import katex from "katex";

marked.setOptions({ breaks: true, gfm: true });

// Chat models (ML/SQL/OOD tutor, System Design chat) routinely answer in
// LaTeX — `\[ ... \]` for a display equation, `\( ... \)` inline — because
// that's the convention their training data uses for math. Handing that
// straight to `marked` renders it wrong in a specific, confusing way: CommonMark
// treats `\[` and `\]` as *escaped punctuation* and silently drops the
// backslash, so `\[ w \leftarrow w - \eta \frac{\partial L}{\partial w} \]`
// comes out as a bare `[ ... ]` with every LaTeX command (`\leftarrow`, `\eta`,
// `\frac{}{}`) left as literal, unrendered text — exactly the garbled equation
// this was written to fix.
//
// The fix has to run BEFORE marked.parse(): once CommonMark has eaten the
// backslash there's no reliable way to tell "this bracket was math" apart from
// an ordinary bracket. So math spans are pulled out first, rendered to HTML by
// KaTeX, and swapped in for numbered placeholders that marked can't
// mis-interpret — then marked runs on what's left, and the placeholders are
// substituted back in as raw (already-safe) HTML.
//
// Single-`$` inline math is deliberately NOT supported: this app's own content
// talks about real dollar amounts ("$50/month", "$0.023/GB"), and a lone `$`
// delimiter would misfire on those constantly. `\( ... \)`, `\[ ... \]` and
// `$$ ... $$` are all unambiguous, so those three are enough to cover what the
// models actually produce.
const MATH_PATTERNS: { re: RegExp; display: boolean }[] = [
  { re: /\\\[([\s\S]+?)\\\]/g, display: true },
  { re: /\$\$([\s\S]+?)\$\$/g, display: true },
  { re: /\\\(([\s\S]+?)\\\)/g, display: false },
];

function renderTex(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode: display,
      throwOnError: false,
      strict: false,
    });
  } catch {
    // Malformed TeX from the model — show the raw source rather than taking
    // the whole message render down over one bad equation.
    return display ? `\\[${tex}\\]` : `\\(${tex}\\)`;
  }
}

// A table can't shrink below its longest words, so a wide one (a five-column
// comparison is routine in these answers) spills out of its container on a
// phone. Each table gets a horizontal scroller around it instead — styled as
// `.prose-chat .table-scroll` in globals.css.
export function wrapTables(html: string): string {
  return html
    .replace(/<table>/g, '<div class="table-scroll"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

export function renderMarkdownWithMath(source: string): string {
  const slots: string[] = [];
  let working = source;

  for (const { re, display } of MATH_PATTERNS) {
    working = working.replace(re, (_match, tex: string) => {
      slots.push(renderTex(tex, display));
      return `@@MATHSLOT${slots.length - 1}@@`;
    });
  }

  const html = marked.parse(working) as string;
  // marked may wrap a placeholder in a <p> or leave it inline — either way
  // it passes through untouched (no markdown-special characters in it), so a
  // plain string substitution is enough to drop the real KaTeX HTML back in.
  return wrapTables(html).replace(/@@MATHSLOT(\d+)@@/g, (_match, i: string) => slots[Number(i)] ?? "");
}
