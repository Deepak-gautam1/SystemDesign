"use client";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, BookOpen, Hash, Pencil, Eye, CheckCircle2,
  Copy, Check, Sparkles, Loader2, X, ChevronDown
} from "lucide-react";
import { marked } from "marked";
import { cn } from "@/lib/utils";
import { wrapTables } from "@/lib/render-markdown";
import { SqlCodeBlock } from "./sql-code-block";
import { DifficultyBadge, TagBadge } from "@/components/ui/badge";
import { evaluateCode } from "@/lib/api";
import type { SQLProblem } from "@/lib/sql-problems";

marked.setOptions({ breaks: true, gfm: true });

type PanelMode = "learn" | "practice";

// ── Small helpers ──────────────────────────────────────────────────────────

function ConceptPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-[11px] font-medium">
      <Hash size={9} /> {label}
    </span>
  );
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded"
    >
      {copied ? <><Check size={11} className="text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy</>}
    </button>
  );
}

// ── Evaluation result panel ────────────────────────────────────────────────

function EvalPanel({
  result, loading, error, onClose,
}: {
  result: string; loading: boolean; error: string | null; onClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Extract score from markdown
  const scoreMatch = result.match(/##\s*Score:\s*(\d+)\s*\/\s*10/i);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

  useEffect(() => {
    if (ref.current && !collapsed) ref.current.scrollTop = ref.current.scrollHeight;
  }, [result, collapsed]);

  return (
    <div className={cn(
      "shrink-0 border-t border-slate-700 bg-slate-900 flex flex-col transition-all duration-200",
      collapsed ? "h-10" : "h-[42%]"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
        {loading
          ? <Loader2 size={13} className="text-sky-400 animate-spin" />
          : <Sparkles size={13} className="text-sky-400" />}
        <span className="text-[11px] font-mono text-slate-300 font-semibold">AI Query Review</span>

        {/* Score badge */}
        {score !== null && !loading && (
          <span className={cn(
            "ml-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full",
            score >= 8 ? "bg-emerald-500/20 text-emerald-400"
            : score >= 5 ? "bg-amber-500/20 text-amber-400"
            : "bg-rose-500/20 text-rose-400"
          )}>
            {score}/10
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors">
            <ChevronDown size={13} className={cn("transition-transform", collapsed && "rotate-180")} />
          </button>
          <button onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div ref={ref} className="flex-1 overflow-y-auto p-4 text-sm">
          {loading && !result && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Loader2 size={12} className="animate-spin" /> Analysing your query…
            </div>
          )}
          {error && (
            <p className="text-rose-400 text-xs">⚠️ {error}</p>
          )}
          {result && (
            <div
              className="prose-chat text-slate-200 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: wrapTables(marked.parse(result) as string) +
                  (loading ? '<span class="inline-block w-[2px] h-3.5 bg-sky-400 ml-0.5 align-middle rounded-sm animate-pulse"></span>' : "")
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface SqlProblemDetailProps {
  problem: SQLProblem;
  onBack: () => void;
}

export function SqlProblemDetail({ problem, onBack }: SqlProblemDetailProps) {
  const [panelMode, setPanelMode]       = useState<PanelMode>("learn");
  const [practiceCode, setPracticeCode] = useState(problem.practicePrompt);
  const [showSolution, setShowSolution] = useState(false);

  // Evaluation state
  const [evalResult,  setEvalResult]  = useState("");
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError,   setEvalError]   = useState<string | null>(null);
  const [showEval,    setShowEval]    = useState(false);

  // Reset when switching problem
  useEffect(() => {
    setPracticeCode(problem.practicePrompt);
    setPanelMode("learn");
    setShowSolution(false);
    setEvalResult(""); setEvalError(null); setShowEval(false);
  }, [problem.id, problem.practicePrompt]);

  const runEvaluation = async () => {
    if (!practiceCode.trim() || practiceCode === problem.practicePrompt) return;
    setEvalResult(""); setEvalError(null);
    setEvalLoading(true); setShowEval(true);

    try {
      for await (const event of evaluateCode({
        studentCode:        practiceCode,
        problemTitle:       problem.title,
        referenceCode:      problem.code,
        problemDescription: problem.description,
        language:           "sql",
      })) {
        if (event.type === "token" && event.text) {
          setEvalResult(prev => prev + event.text);
        } else if (event.type === "error") {
          setEvalError(event.message ?? "Evaluation failed");
        }
      }
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : String(err));
    } finally {
      setEvalLoading(false);
    }
  };

  const hasUserCode = practiceCode.trim() && practiceCode !== problem.practicePrompt;

  // Simple markdown description renderer (mirrors ood/problem-detail.tsx —
  // handles paragraphs, "- " bullets, **bold**, and pipe tables only).
  function renderDesc(text: string) {
    return text.split("\n").map((line, i) => {
      if (!line.trim() || line.startsWith("|")) return <div key={i} className="h-1.5" />;
      if (line.startsWith("- "))
        return <li key={i} className="ml-4 text-muted-foreground text-sm">{line.slice(2)}</li>;
      const parts = line.split(/\*\*([^*]+)\*\*/g);
      if (parts.length === 1) return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
      return (
        <p key={i} className="text-sm text-muted-foreground leading-relaxed">
          {parts.map((p, j) => j % 2 === 1
            ? <strong key={j} className="text-foreground font-semibold">{p}</strong>
            : p)}
        </p>
      );
    });
  }

  function renderTable(text: string) {
    const rows = text.split("\n").filter(l => l.startsWith("|"));
    if (rows.length < 3) return null;
    const headers = rows[0].split("|").slice(1,-1).map(h=>h.trim());
    const data    = rows.slice(2).map(r=>r.split("|").slice(1,-1).map(c=>c.trim()));
    return (
      <div className="overflow-hidden rounded-lg border border-border mt-3 mb-2">
        <table className="w-full text-xs">
          <thead><tr>{headers.map((h,i)=><th key={i} className="text-left px-3 py-2 font-mono uppercase tracking-wider bg-muted text-muted-foreground border-b border-border">{h}</th>)}</tr></thead>
          <tbody>{data.map((r,i)=><tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">{r.map((c,j)=>{
            const parts=c.split(/\*\*([^*]+)\*\*/g);
            return <td key={j} className="px-3 py-2 text-muted-foreground">{parts.map((p,k)=>k%2===1?<strong key={k} className="text-foreground">{p}</strong>:p)}</td>;
          })}</tr>)}</tbody>
        </table>
      </div>
    );
  }

  // The description may contain multiple pipe tables (one per involved
  // table) — render each contiguous block of "|" lines as its own table.
  function renderTables(text: string) {
    const lines = text.split("\n");
    const blocks: string[] = [];
    let current: string[] = [];
    for (const line of lines) {
      if (line.startsWith("|")) {
        current.push(line);
      } else if (current.length) {
        blocks.push(current.join("\n"));
        current = [];
      }
    }
    if (current.length) blocks.push(current.join("\n"));
    return blocks.map((b, i) => <div key={i}>{renderTable(b)}</div>);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Problem bar */}
      <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-12 border-b border-border bg-card">
        <button onClick={onBack} aria-label="Back to problems"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs border border-border rounded-lg px-2.5 py-1.5 transition-colors shrink-0">
          <ArrowLeft size={12} /> <span className="hidden sm:inline">Problems</span>
        </button>
        <div className="w-px h-4 bg-border" />
        <span className="font-display font-semibold text-sm text-foreground truncate">{problem.title}</span>
        <DifficultyBadge difficulty={problem.difficulty} />
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <button onClick={() => { setPanelMode("learn"); setShowEval(false); }} aria-label="Learn"
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              panelMode==="learn" ? "bg-primary/10 text-primary border-primary/25" : "border-border text-muted-foreground hover:text-foreground")}>
            <BookOpen size={12} /> <span className="hidden sm:inline">Learn</span>
          </button>
          <button onClick={() => { setPanelMode("practice"); setShowSolution(false); }} aria-label="Practice"
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              panelMode==="practice" ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25" : "border-border text-muted-foreground hover:text-foreground")}>
            <Pencil size={12} /> <span className="hidden sm:inline">Practice</span>
          </button>
        </div>
      </div>

      {/* Split layout — on phones stacked: description capped on top, editor fills the rest */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        {/* LEFT: Description */}
        <div className="max-h-[35vh] md:max-h-none md:w-[40%] shrink-0 overflow-y-auto scrollbar-thin border-b md:border-b-0 md:border-r border-border p-4 md:p-5">
          <div className="flex flex-wrap gap-1.5 mb-4">{problem.tags.map(t=><TagBadge key={t} label={t}/>)}</div>
          <div className="mb-4">
            <h3 className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground mb-2">SQL Concepts</h3>
            <div className="flex flex-wrap gap-1.5">{problem.concepts.map(c=><ConceptPill key={c} label={c}/>)}</div>
          </div>
          <div className="space-y-1 text-sm">
            {renderDesc(problem.description)}
            {problem.description.includes("|") && renderTables(problem.description)}
          </div>
        </div>

        {/* RIGHT: Code + eval panel */}
        <div className="flex-1 min-w-0 flex flex-col bg-slate-950 overflow-hidden">
          {/* Code toolbar */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800">
            <span className="font-mono text-[11px] text-slate-400 truncate min-w-0">
              {panelMode==="learn" ? problem.filename : "practice.sql"}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {/* Practice mode controls */}
              {panelMode==="practice" && (
                <>
                  <button onClick={() => setShowSolution(s=>!s)} aria-label={showSolution ? "Hide solution" : "Reveal solution"}
                    className={cn("flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border transition-all",
                      showSolution ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                   : "text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200")}>
                    <Eye size={11} /> <span className="hidden sm:inline">{showSolution ? "Hide solution" : "Reveal solution"}</span>
                  </button>

                  {/* ── Evaluate button ── */}
                  <button
                    onClick={runEvaluation}
                    disabled={!hasUserCode || evalLoading}
                    className={cn(
                      "flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-lg border font-medium transition-all",
                      hasUserCode && !evalLoading
                        ? "bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/25"
                        : "text-slate-600 border-slate-800 cursor-not-allowed"
                    )}
                    title={!hasUserCode ? "Write a query first" : "Evaluate with AI"}
                  >
                    {evalLoading
                      ? <><Loader2 size={11} className="animate-spin" /> Evaluating…</>
                      : <><Sparkles size={11} /> Evaluate Query</>}
                  </button>
                </>
              )}

              <CopyButton code={panelMode==="learn" || showSolution ? problem.code : practiceCode} />
            </div>
          </div>

          {/* Code area */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className={cn("overflow-hidden", showEval ? "flex-1" : "flex-1")}>
              {panelMode === "learn" ? (
                <div className="h-full overflow-auto p-4"><SqlCodeBlock code={problem.code} /></div>
              ) : showSolution ? (
                <div className="h-full overflow-auto p-4">
                  <div className="mb-3 flex items-center gap-2 text-emerald-400 text-xs font-medium">
                    <CheckCircle2 size={13} /> Reference solution
                  </div>
                  <SqlCodeBlock code={problem.code} />
                </div>
              ) : (
                <textarea
                  value={practiceCode}
                  onChange={e => setPracticeCode(e.target.value)}
                  spellCheck={false}
                  className="w-full h-full bg-slate-950 text-slate-100 font-mono text-[12.5px] leading-[1.65] p-5 outline-none resize-none border-0"
                  style={{ tabSize: 4 }}
                />
              )}
            </div>

            {/* Eval panel — slides in below the editor */}
            {showEval && (
              <EvalPanel
                result={evalResult}
                loading={evalLoading}
                error={evalError}
                onClose={() => setShowEval(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
