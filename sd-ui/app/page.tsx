"use client";
import { useState, useMemo, useEffect } from "react";
import { Header }          from "@/components/layout/header";
import { Sidebar }         from "@/components/layout/sidebar";
import { CategorySection } from "@/components/dashboard/category-section";
import { DashboardHome }   from "@/components/dashboard/dashboard-home";
import { ChatInterface }   from "@/components/chat/chat-interface";
import { OODSection }      from "@/components/ood/ood-section";
import { SQLSection }      from "@/components/sql/sql-section";
import { MLSection }       from "@/components/ml/ml-section";
import { ProgressRing }    from "@/components/ui/progress-ring";
import { TourOverlay }     from "@/components/tour/tour-overlay";
import { WelcomeScreen }   from "@/components/auth/welcome-screen";
import { useGuestMode }    from "@/hooks/use-guest-mode";
import { useProgress }     from "@/hooks/use-progress";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { useRecentTopics } from "@/hooks/use-recent-topics";
import { useTour }         from "@/hooks/use-tour";
import { CATEGORIES, TOPICS, getCategoryById } from "@/lib/topics";
import { DASHBOARD_TOUR_STEPS, CHAT_TOUR_STEPS, OOD_TOUR_STEPS, SQL_TOUR_STEPS, ML_TOUR_STEPS } from "@/lib/tour-steps";
import type { AppSection, Mode, Topic } from "@/lib/types";

export default function HomePage() {
  const [section, setSection]     = useState<AppSection>("dashboard");
  const [mode, setMode]           = useState<Mode>("study");
  const [search, setSearch]       = useState("");
  const [chatTopic, setChatTopic] = useState<Topic | null>(null);
  const [menuOpen, setMenuOpen]   = useState(false);   // phone-only sidebar drawer

  const { ready, needsWelcome, enterGuest, isGuest } = useGuestMode();
  const { progress, markDone, isDone, doneCount } = useProgress();
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const { recentIds, addRecent } = useRecentTopics();

  // Five independent, contextual tours — each auto-runs once, the first
  // time its part of the app is reached, and never more than one at a time.
  const tourDashboard = useTour("dashboard", DASHBOARD_TOUR_STEPS.length);
  const tourChat      = useTour("chat", CHAT_TOUR_STEPS.length);
  const tourOod       = useTour("ood", OOD_TOUR_STEPS.length);
  const tourSql       = useTour("sql", SQL_TOUR_STEPS.length);
  const tourMl        = useTour("ml", ML_TOUR_STEPS.length);
  const anyTourActive = tourDashboard.active || tourChat.active || tourOod.active || tourSql.active || tourMl.active;

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
    setMenuOpen(false);
  };

  const goBack = () => setChatTopic(null);

  const handleSectionChange = (s: AppSection) => {
    setSection(s);
    setChatTopic(null);  // clear chat when switching sections
    setMenuOpen(false);
  };

  // The drawer only exists below md. If the viewport grows past that (rotation,
  // resizing a desktop window) the in-flow sidebar takes over, so drop the
  // overlay instead of leaving it covering the page.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => { if (mq.matches) setMenuOpen(false); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const isInChat = section === "system-design" && chatTopic !== null;

  // Tours must not fire while the welcome screen is up: autoStart marks a tour
  // as seen, so it would burn the dashboard tour behind a screen the user can't
  // see it on. `appVisible` holds them until a choice has been made.
  const appVisible = ready && !needsWelcome;

  // Dashboard tour: first thing a new visitor sees, once they're in the app.
  useEffect(() => {
    if (!appVisible || anyTourActive) return;
    return tourDashboard.autoStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appVisible]);

  // Chat tour: first time any topic's chat is opened.
  useEffect(() => {
    if (!appVisible || !isInChat || anyTourActive) return;
    return tourChat.autoStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInChat, appVisible]);

  // OOD tour: first time the OOD section is opened.
  useEffect(() => {
    if (!appVisible || section !== "ood" || anyTourActive) return;
    return tourOod.autoStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, appVisible]);

  // SQL tour: first time the SQL section is opened.
  useEffect(() => {
    if (!appVisible || section !== "sql" || anyTourActive) return;
    return tourSql.autoStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, appVisible]);

  // ML tour: first time the Machine Learning section is opened.
  useEffect(() => {
    if (!appVisible || section !== "ml" || anyTourActive) return;
    return tourMl.autoStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, appVisible]);

  const activeTour =
    tourDashboard.active ? { hook: tourDashboard, steps: DASHBOARD_TOUR_STEPS } :
    tourChat.active      ? { hook: tourChat,      steps: CHAT_TOUR_STEPS }      :
    tourOod.active       ? { hook: tourOod,       steps: OOD_TOUR_STEPS }       :
    tourSql.active       ? { hook: tourSql,       steps: SQL_TOUR_STEPS }       :
    tourMl.active        ? { hook: tourMl,        steps: ML_TOUR_STEPS }        :
    null;

  // The "?" replay button always replays whichever tour fits where you are now.
  const contextualTour =
    isInChat ? tourChat :
    section === "ood" ? tourOod :
    section === "sql" ? tourSql :
    section === "ml"  ? tourMl  :
    tourDashboard;

  // Hold the first paint until the session is resolved — rendering the welcome
  // screen and then yanking it away for an already-signed-in user reads as a bug.
  if (!ready) {
    return <div className="h-dvh bg-background" />;
  }

  if (needsWelcome) {
    return <WelcomeScreen onExploreAsGuest={enterGuest} />;
  }

  return (
    // h-dvh, not h-screen: on a phone 100vh is the height with the browser's
    // address bar hidden, so while it's showing, the chat input sits off-screen.
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
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
        isGuest={isGuest}
        onOpenMenu={() => setMenuOpen(true)}
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
          mobileOpen={menuOpen}
          onMobileClose={() => setMenuOpen(false)}
        />

        <main className="flex-1 min-w-0 overflow-hidden flex flex-col">

          {/* ── OOD Section ─────────────────────────────────────────── */}
          {section === "ood" && <OODSection />}

          {/* ── SQL Section ─────────────────────────────────────────── */}
          {section === "sql" && <SQLSection />}

          {/* ── ML Section ──────────────────────────────────────────── */}
          {section === "ml" && <MLSection />}

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
