"use client";
import { useState, useMemo, useEffect } from "react";
import { Header }          from "@/components/layout/header";
import { Sidebar }         from "@/components/layout/sidebar";
import { CategorySection } from "@/components/dashboard/category-section";
import { DashboardHome }   from "@/components/dashboard/dashboard-home";
import { ChatInterface }   from "@/components/chat/chat-interface";
import { OODSection }      from "@/components/ood/ood-section";
import { ProgressRing }    from "@/components/ui/progress-ring";
import { TourOverlay }     from "@/components/tour/tour-overlay";
import { useProgress }     from "@/hooks/use-progress";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { useRecentTopics } from "@/hooks/use-recent-topics";
import { useTour }         from "@/hooks/use-tour";
import { CATEGORIES, TOPICS, getCategoryById } from "@/lib/topics";
import { DASHBOARD_TOUR_STEPS, CHAT_TOUR_STEPS, OOD_TOUR_STEPS } from "@/lib/tour-steps";
import type { AppSection, Mode, Topic } from "@/lib/types";

export default function HomePage() {
  const [section, setSection]     = useState<AppSection>("dashboard");
  const [mode, setMode]           = useState<Mode>("study");
  const [search, setSearch]       = useState("");
  const [chatTopic, setChatTopic] = useState<Topic | null>(null);

  const { progress, markDone, isDone, doneCount } = useProgress();
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const { recentIds, addRecent } = useRecentTopics();

  // Three independent, contextual tours — each auto-runs once, the first
  // time its part of the app is reached, and never more than one at a time.
  const tourDashboard = useTour("dashboard", DASHBOARD_TOUR_STEPS.length);
  const tourChat      = useTour("chat", CHAT_TOUR_STEPS.length);
  const tourOod       = useTour("ood", OOD_TOUR_STEPS.length);
  const anyTourActive = tourDashboard.active || tourChat.active || tourOod.active;

  const recentTopics = useMemo(
    () => recentIds.map(id => TOPICS.find(t => t.id === id)).filter((t): t is Topic => !!t),
    [recentIds]
  );

  const filteredTopics = useMemo(() => {
    if (!search.trim()) return TOPICS;
    const q = search.toLowerCase();
    return TOPICS.filter(t =>
      t.label.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }, [search]);

  const openChat = (topic: Topic, selectedMode?: Mode) => {
    setChatTopic(topic);
    if (selectedMode) setMode(selectedMode);
    setSection("system-design");
    addRecent(topic.id);
  };

  const goBack = () => setChatTopic(null);

  const handleSectionChange = (s: AppSection) => {
    setSection(s);
    setChatTopic(null);  // clear chat when switching sections
  };

  const isInChat = section === "system-design" && chatTopic !== null;

  // Dashboard tour: first thing a new visitor sees, on mount.
  useEffect(() => {
    if (anyTourActive) return;
    return tourDashboard.autoStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chat tour: first time any topic's chat is opened.
  useEffect(() => {
    if (!isInChat || anyTourActive) return;
    return tourChat.autoStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInChat]);

  // OOD tour: first time the OOD section is opened.
  useEffect(() => {
    if (section !== "ood" || anyTourActive) return;
    return tourOod.autoStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const activeTour =
    tourDashboard.active ? { hook: tourDashboard, steps: DASHBOARD_TOUR_STEPS } :
    tourChat.active      ? { hook: tourChat,      steps: CHAT_TOUR_STEPS }      :
    tourOod.active       ? { hook: tourOod,       steps: OOD_TOUR_STEPS }       :
    null;

  // The "?" replay button always replays whichever tour fits where you are now.
  const contextualTour = isInChat ? tourChat : section === "ood" ? tourOod : tourDashboard;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header
        section={section}
        mode={mode}
        onModeChange={setMode}
        doneCount={doneCount}
        total={TOPICS.length}
        activeTopic={chatTopic}
        search={search}
        onSearchChange={setSearch}
        showSearch={section === "system-design" && !isInChat}
        onReplayTour={contextualTour.start}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          section={section}
          onSectionChange={handleSectionChange}
          activeTopic={chatTopic?.id}
          progress={progress}
          mode={mode}
          onTopicSelect={openChat}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
        />

        <main className="flex-1 min-w-0 overflow-hidden flex flex-col">

          {/* ── OOD Section ─────────────────────────────────────────── */}
          {section === "ood" && <OODSection />}

          {/* ── Dashboard / Chat ────────────────────────────────────── */}
          {section === "system-design" && (
            isInChat ? (
              <ChatInterface
                topic={chatTopic}
                category={getCategoryById(chatTopic.cat)!}
                mode={mode}
                onBack={goBack}
                onMarkDone={markDone}
                isDone={isDone(chatTopic.id)}
              />
            ) : (
              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
                <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 mb-6 animate-fade-in">
                  <div>
                    <h1 className="font-display font-bold text-lg tracking-tight text-foreground mb-1">
                      System Design Interview Prep
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {TOPICS.length} topics · Alex Xu Books + donnemartin + ByteByteGo
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <ProgressRing done={doneCount} total={TOPICS.length} />
                    <div className="hidden sm:flex gap-5">
                      <div className="text-center">
                        <p className="font-display font-bold text-xl text-primary leading-none">{doneCount}</p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">done</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display font-bold text-xl text-muted-foreground leading-none">{TOPICS.length - doneCount}</p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">left</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  {CATEGORIES.map(cat => (
                    <CategorySection
                      key={cat.id}
                      category={cat}
                      topics={filteredTopics.filter(t => t.cat === cat.id)}
                      progress={progress}
                      mode={mode}
                      onSelect={openChat}
                    />
                  ))}
                </div>
              </div>
            )
          )}

          {/* ── Dashboard overview ───────────────────────────────────── */}
          {section === "dashboard" && (
            <DashboardHome
              doneCount={doneCount}
              totalTopics={TOPICS.length}
              categories={CATEGORIES}
              topics={TOPICS}
              progress={progress}
              recentTopics={recentTopics}
              onSelectTopic={openChat}
              onNavigateSection={handleSectionChange}
            />
          )}

        </main>
      </div>

      <TourOverlay
        steps={activeTour?.steps ?? []}
        active={!!activeTour}
        stepIndex={activeTour?.hook.stepIndex ?? 0}
        onNext={activeTour?.hook.next ?? (() => {})}
        onPrev={activeTour?.hook.prev ?? (() => {})}
        onEnd={activeTour?.hook.end ?? (() => {})}
      />
    </div>
  );
}
