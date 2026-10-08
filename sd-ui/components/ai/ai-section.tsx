"use client";
import { useState } from "react";
import { Sparkles, MessagesSquare } from "lucide-react";
import { AiTheorySection } from "./ai-theory-section";
import { AiTheoryDetail } from "./ai-theory-detail";
import { TopicTutorChat } from "@/components/theory/topic-tutor-chat";
import { FLAT_AI_THEORY_TOPICS, TOTAL_AI_THEORY_TOPICS, getAiTheoryTopicIndex, AI_SYLLABUS } from "@/lib/ai-theory";

export function AISection() {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [generalQuiz, setGeneralQuiz] = useState(false);

  if (generalQuiz) {
    return (
      <TopicTutorChat
        subject="ai"
        topicTitle=""
        topicContent={AI_SYLLABUS}
        backLabel="Artificial Intelligence"
        onBack={() => setGeneralQuiz(false)}
      />
    );
  }

  if (selectedTopicId) {
    const idx = getAiTheoryTopicIndex(selectedTopicId);
    if (idx !== -1) {
      const { topic, category } = FLAT_AI_THEORY_TOPICS[idx];
      const prev = idx > 0 ? FLAT_AI_THEORY_TOPICS[idx - 1] : undefined;
      const next = idx < FLAT_AI_THEORY_TOPICS.length - 1 ? FLAT_AI_THEORY_TOPICS[idx + 1] : undefined;
      return (
        <AiTheoryDetail
          topic={topic}
          category={category}
          onBack={() => setSelectedTopicId(null)}
          prev={prev}
          next={next}
          onNavigate={setSelectedTopicId}
        />
      );
    }
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
      {/* Header — no Theory/Problems tabs; the agent topics carry their code beside the notes instead */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-500 shrink-0">
          <Sparkles size={20} />
        </div>
        {/* basis keeps the title beside the icon; on phones the button wraps under */}
        <div className="min-w-0 grow basis-48">
          <h1 className="font-display font-bold text-lg tracking-tight text-foreground">
            Artificial Intelligence Interview Prep
          </h1>
          <p className="text-sm text-muted-foreground">
            {TOTAL_AI_THEORY_TOPICS} theory topics · how LLMs are built, trained and served · RAG & agents
          </p>
        </div>
        <button
          data-tour="ai-test-knowledge-general"
          onClick={() => setGeneralQuiz(true)}
          className="sm:ml-auto shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-orange-500/25 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-all"
        >
          <MessagesSquare size={13} /> Test Your Knowledge
        </button>
      </div>

      <AiTheorySection onSelectTopic={setSelectedTopicId} />
    </div>
  );
}
