export interface TourStep {
  target: string;        // data-tour attribute value — a value with no matching
                          // element is valid and intentional: it renders as a
                          // centered informational card with no spotlight,
                          // used for workflows not yet visible on screen.
  title: string;
  body: string;
  placement: "top" | "bottom" | "left" | "right";
}

// ── Dashboard — first thing any visitor sees ────────────────────────────────
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: "sidebar-brand",
    title: "Welcome to archprep",
    body: "A quick tour of what's here — takes about 20 seconds.",
    placement: "right",
  },
  {
    target: "sidebar-nav",
    title: "Switch sections here",
    body: "System Design, Object-Oriented Design, and more (some still coming soon) all live in this sidebar.",
    placement: "right",
  },
  {
    target: "sidebar-collapse",
    title: "Need more room?",
    body: "Collapse the sidebar down to icons anytime — click it again to bring the labels back.",
    placement: "right",
  },
  {
    target: "header-crumb",
    title: "Always know where you are",
    body: "This breadcrumb updates as you move between sections and topics.",
    placement: "bottom",
  },
  {
    target: "theme-toggle",
    title: "Light or dark",
    body: "Your call — this remembers your preference.",
    placement: "left",
  },
  {
    target: "explore-cards",
    title: "Pick where to start",
    body: "Jump into System Design interview prep or Object-Oriented Design from here.",
    placement: "top",
  },
  {
    target: "category-breakdown",
    title: "Track your progress",
    body: "As you complete topics, this fills in by category so you can see what's left.",
    placement: "top",
  },
];

// ── System Design chat — first time a topic is opened ───────────────────────
export const CHAT_TOUR_STEPS: TourStep[] = [
  {
    target: "header-modes",
    title: "Three ways to study each topic",
    body: "Study explains the concept clearly with tradeoffs. Quiz drills you like a real interviewer — it won't just hand you the answer. Deep Dive walks the full architecture end to end, including what breaks at 10× scale. Switch anytime, even mid-conversation — it starts a fresh chat in the new mode.",
    placement: "bottom",
  },
  {
    target: "chat-quick-starters",
    title: "Quick starters, or ask your own thing",
    body: "Tap a suggestion to jump in, or type below. Every answer shows which book pages or repo docs it drew from — look for “N sources referenced” under the response.",
    placement: "top",
  },
  {
    target: "chat-input",
    title: "Enter to send",
    body: "Shift+Enter for a new line. Responses stream in as they're generated.",
    placement: "top",
  },
  {
    target: "mark-done",
    title: "Track your progress",
    body: "Once a topic clicks for you, mark it done — it updates the progress ring and category breakdown back on the Dashboard.",
    placement: "bottom",
  },
];

// ── OOD section — first time you open Object-Oriented Design ───────────────
export const OOD_TOUR_STEPS: TourStep[] = [
  {
    target: "ood-tabs",
    title: "Two ways to learn OOD",
    body: "Theory is for reading — concepts, class relationships, every classic design pattern, UML, concurrency. Problems is hands-on — you write real C++ and get it reviewed.",
    placement: "bottom",
  },
  {
    target: "theory-grid",
    title: "Browse theory by category",
    body: "Click any topic to read it. Each one has Prev/Next at the top so you can work straight through an entire category without coming back to this grid.",
    placement: "top",
  },
  {
    target: "ood-problems-workflow",
    title: "How Problems mode works",
    body: "Open a problem, then switch between Learn (reference C++ solution) and Practice (an editable starter — write your own). Reveal Solution compares anytime. Once you've written something, hit Evaluate Code for a scored /10 AI review of your specific implementation.",
    placement: "bottom",
  },
];
