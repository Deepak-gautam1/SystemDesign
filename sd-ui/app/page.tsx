"use client";
import { useState, useMemo } from "react";
import { Header }          from "@/components/layout/header";
import { Sidebar }         from "@/components/layout/sidebar";
import { CategorySection } from "@/components/dashboard/category-section";
import { DashboardHome }   from "@/components/dashboard/dashboard-home";
import { ChatInterface }   from "@/components/chat/chat-interface";
import { OODSection }      from "@/components/ood/ood-section";
import { ProgressRing }    from "@/components/ui/progress-ring";
import { useProgress }     from "@/hooks/use-progress";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { useRecentTopics } from "@/hooks/use-recent-topics";
import { CATEGORIES, TOPICS, getCategoryById } from "@/lib/topics";
import type { AppSection, Mode, Topic } from "@/lib/types";

export default function HomePage() {
  const [section, setSection]     = useState<AppSection>("dashboard");
  const [mode, setMode]           = useState<Mode>("study");
  const [search, setSearch]       = useState("");
  const [chatTopic, setChatTopic] = useState<Topic | null>(null);

  const { progress, markDone, isDone, doneCount } = useProgress();
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const { recentIds, addRecent } = useRecentTopics();

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
    </div>
  );
}
