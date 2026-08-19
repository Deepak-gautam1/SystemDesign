"use client";
import { useState } from "react";
import { Brain, MessagesSquare } from "lucide-react";
import { MlTheorySection } from "./ml-theory-section";
import { MlTheoryDetail } from "./ml-theory-detail";
import { TopicTutorChat } from "@/components/theory/topic-tutor-chat";
import { FLAT_ML_THEORY_TOPICS, TOTAL_ML_THEORY_TOPICS, getMlTheoryTopicIndex, ML_SYLLABUS } from "@/lib/ml-theory";

export function MLSection() {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [generalQuiz, setGeneralQuiz] = useState(false);

  if (generalQuiz) {
    return (
      <TopicTutorChat
        subject="ml"
        topicTitle=""
        topicContent={ML_SYLLABUS}
        backLabel="Machine Learning"
        onBack={() => setGeneralQuiz(false)}
      />
    );
  }

  if (selectedTopicId) {
    const idx = getMlTheoryTopicIndex(selectedTopicId);
    if (idx !== -1) {
      const { topic, category } = FLAT_ML_THEORY_TOPICS[idx];
      const prev = idx > 0 ? FLAT_ML_THEORY_TOPICS[idx - 1] : undefined;
      const next = idx < FLAT_ML_THEORY_TOPICS.length - 1 ? FLAT_ML_THEORY_TOPICS[idx + 1] : undefined;
      return (
        <MlTheoryDetail
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
      {/* Header — no Theory/Problems tabs here, this section is theory-only */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center text-pink-500 shrink-0">
          <Brain size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-bold text-lg tracking-tight text-foreground">
            Machine Learning Interview Prep
          </h1>
          <p className="text-sm text-muted-foreground">
            {TOTAL_ML_THEORY_TOPICS} theory topics · concepts, tradeoffs & reusable answer frameworks · no coding
          </p>
        </div>
        <button
          data-tour="ml-test-knowledge-general"
          onClick={() => setGeneralQuiz(true)}
          className="ml-auto shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-pink-500/25 bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20 transition-all"
        >
          <MessagesSquare size={13} /> Test Your Knowledge
        </button>
      </div>

      <MlTheorySection onSelectTopic={setSelectedTopicId} />
    </div>
  );
}
