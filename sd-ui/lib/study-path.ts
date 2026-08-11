import type { Message, Topic } from "./types";

// A fixed, ordered study path for Study mode — mirrors the 4-step framework the
// books use (scope → high-level → deep dive → wrap-up), expanded into the
// concrete questions a student actually needs to ask.
//
// The questions are templated with the topic label rather than authored per
// topic: the backend already anchors retrieval to the current topic, so
// "What's the data model for Hotel Reservation?" reliably produces the
// hotels/rooms schema without us hand-writing 22 sets of questions.

export interface StudyStep {
  id:    string;
  label: string;                    // short chip label
  ask:   (topicLabel: string) => string;   // the message actually sent
}

export const STUDY_STEPS: StudyStep[] = [
  {
    id: "scope",
    label: "Requirements & scope",
    ask: t => `What are the functional and non-functional requirements for ${t}? Which clarifying questions should I ask first to scope it properly?`,
  },
  {
    id: "estimates",
    label: "Capacity estimates",
    ask: t => `Walk me through the back-of-the-envelope estimates for ${t} — QPS, storage, and bandwidth — showing the actual numbers and how you derive them.`,
  },
  {
    id: "highlevel",
    label: "High-level design",
    ask: t => `Show the high-level architecture for ${t}: the main components, and how a single request flows through them end to end.`,
  },
  {
    id: "datamodel",
    label: "Data model & schema",
    ask: t => `What's the data model for ${t}? Show the tables or collections with their key fields, and explain whether SQL or NoSQL fits better and why.`,
  },
  {
    id: "deepdive",
    label: "Core deep dive",
    ask: t => `Deep dive into the core mechanism of ${t} — the key algorithm or design decision at its heart, step by step.`,
  },
  {
    id: "scale",
    label: "Scaling & bottlenecks",
    ask: t => `How does ${t} scale? Where are the bottlenecks at 10× and 100× traffic, and what do caching, sharding, and replication change?`,
  },
  {
    id: "tradeoffs",
    label: "Tradeoffs & failure modes",
    ask: t => `What are the main design tradeoffs in ${t}, and what are its failure modes? What breaks, and how would you mitigate each?`,
  },
  {
    id: "recap",
    label: "Recap & checklist",
    ask: t => `Give me a concise recap of ${t}: the checklist of points I must mention in an interview, and the common mistakes to avoid.`,
  },
];

/**
 * Which steps has the student already asked?
 *
 * Derived from the conversation itself rather than tracked as separate state —
 * chips send their question verbatim, so an exact match on any user message is
 * enough. This means step progress restores with the saved session for free and
 * can never drift out of sync with the visible chat.
 */
export function doneStepIds(messages: Message[], topicLabel: string): Set<string> {
  const asked = new Set(
    messages.filter(m => m.role === "user").map(m => m.content.trim())
  );
  return new Set(
    STUDY_STEPS.filter(s => asked.has(s.ask(topicLabel).trim())).map(s => s.id)
  );
}

/** The next step to nudge — first one not yet asked, or null once all are done. */
export function nextStep(messages: Message[], topicLabel: string): StudyStep | null {
  const done = doneStepIds(messages, topicLabel);
  return STUDY_STEPS.find(s => !done.has(s.id)) ?? null;
}

export function studyPathFor(topic: Topic) {
  return STUDY_STEPS.map(s => ({ ...s, question: s.ask(topic.label) }));
}
