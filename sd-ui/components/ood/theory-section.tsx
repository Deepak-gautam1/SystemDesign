"use client";
import { BookOpen, ExternalLink } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { THEORY_CATEGORIES, TOTAL_THEORY_TOPICS } from "@/lib/theory";

function LucideIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const I = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  return I ? <I size={size} className={className} /> : null;
}

interface TheorySectionProps {
  onSelectTopic: (topicId: string) => void;
}

export function TheorySection({ onSelectTopic }: TheorySectionProps) {
  return (
    <div data-tour="theory-grid">
      {/* Intro + credit line */}
      <div className="mb-6 animate-fade-in">
        <p className="text-[12.5px] text-muted-foreground leading-relaxed max-w-2xl">
          {TOTAL_THEORY_TOPICS} topics covering OOP fundamentals, class relationships, design principles,
          all the classic design patterns, UML, and concurrency — everything worth knowing before an LLD
          interview. Curriculum structure inspired by{" "}
          <a
            href="https://github.com/ashishps1/awesome-low-level-design"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            ashishps1/awesome-low-level-design <ExternalLink size={10} />
          </a>
          .
        </p>
      </div>

      {/* Category sections */}
      <div className="flex flex-col gap-7 pb-4">
        {THEORY_CATEGORIES.map((cat, ci) => (
          <section key={cat.id} className="animate-fade-in" style={{ animationDelay: `${ci * 40}ms` }}>
            <div className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 border-l-[3px] bg-muted/40", cat.border)}>
              <span className={cat.color}>
                <LucideIcon name={cat.icon} size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className={cn("font-display font-bold text-[13px] leading-none", cat.color)}>{cat.label}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{cat.sub}</p>
              </div>
              <span className={cn("font-mono text-[10px] font-semibold shrink-0", cat.color)}>
                {cat.topics.length} topics
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {cat.topics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => onSelectTopic(topic.id)}
                  className="group text-left flex flex-col gap-1 p-3.5 rounded-xl bg-card border border-border hover:-translate-y-0.5 hover:shadow-elevated hover:border-border/70 transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-display font-semibold text-[13px] text-foreground group-hover:text-primary transition-colors">
                      {topic.title}
                    </h4>
                    <BookOpen size={11} className="text-muted-foreground/50 shrink-0" />
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">{topic.oneLiner}</p>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
