"use client";
import { useEffect, useRef } from "react";
import { Building2 } from "lucide-react";
import { marked } from "marked";
import { cn } from "@/lib/utils";
import { SourcePanel } from "./source-panel";
import type { Message } from "@/lib/types";

marked.setOptions({ breaks: true, gfm: true });

function AIAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 border-[1.5px] border-primary/30 flex items-center justify-center shrink-0 ring-2 ring-primary/10">
      <Building2 size={14} className="text-primary" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-muted border-[1.5px] border-border flex items-center justify-center shrink-0">
      <span className="font-display font-bold text-[11px] text-muted-foreground">U</span>
    </div>
  );
}

function AIMessage({ msg }: { msg: Message }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const raw = marked.parse(msg.content || "") as string;
    ref.current.innerHTML = raw + (msg.streaming
      ? '<span class="inline-block w-[2px] h-[14px] bg-primary animate-stream-cursor ml-0.5 align-middle rounded-sm"></span>'
      : "");
  }, [msg.content, msg.streaming]);

  return (
    <div className="flex gap-2.5 animate-slide-up">
      <AIAvatar />
      <div className="flex-1 min-w-0 max-w-[min(85%,900px)]">
        <div
          ref={ref}
          className={cn(
            "prose-chat text-sm text-foreground leading-relaxed",
            "rounded-xl rounded-tl-sm bg-card border border-border px-4 py-3"
          )}
        />
        {!msg.streaming && <SourcePanel sources={msg.sources ?? []} />}
      </div>
    </div>
  );
}

function UserMessage({ msg }: { msg: Message }) {
  return (
    <div className="flex gap-2.5 flex-row-reverse animate-slide-up">
      <UserAvatar />
      <div className="max-w-[min(70%,700px)] bg-primary/10 border border-primary/20 rounded-xl rounded-tr-sm px-4 py-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {msg.content}
      </div>
    </div>
  );
}

export function MessageBubble({ msg }: { msg: Message }) {
  return msg.role === "user" ? <UserMessage msg={msg} /> : <AIMessage msg={msg} />;
}
