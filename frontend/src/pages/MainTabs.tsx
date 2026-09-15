import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Header } from "@/shared/components/Header";
import { SegmentedControl } from "@/shared/components/SegmentedControl";
import { PANEL_SLIDE_PX, SPRING } from "@/shared/motion/springs";
import { DownloadsPanel, useDownloads } from "@/features/downloads";
import HomePage from "./HomePage";

type MainTab = "analyze" | "download";

/** Left-to-right order, which is also the direction panels travel. */
const TAB_ORDER: readonly MainTab[] = ["analyze", "download"];

type MainTabsProps = {
  /** Bumping this resets the analyze tab, leaving the downloads untouched. */
  searchKey: number;
  onLogoClick: () => void;
};

export function MainTabs({ searchKey, onLogoClick }: MainTabsProps) {
  const [tab, setTab] = useState<MainTab>("analyze");
  const { activeCount } = useDownloads();

  return (
    // `contents` keeps the tabs root out of the layout, so the header and main
    // stay direct children of the page column.
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as MainTab)}
      className="contents"
    >
      <Header
        onLogoClick={onLogoClick}
        nav={
          <SegmentedControl
            label="Sections"
            layoutId="main-nav"
            value={tab}
            items={[
              { value: "analyze", label: "Analyze" },
              {
                value: "download",
                label: (
                  <>
                    Download
                    {activeCount > 0 && (
                      <span className="bg-primary text-primary-foreground tabular ml-0.5 rounded-full px-1.5 py-px text-[0.6875rem] leading-4">
                        {activeCount}
                      </span>
                    )}
                  </>
                ),
              },
            ]}
          />
        }
      />

      <main className="relative flex-1">
        <TabPanel value="analyze" activeTab={tab}>
          <HomePage key={searchKey} onDownloadQueued={() => setTab("download")} />
        </TabPanel>

        <TabPanel value="download" activeTab={tab}>
          <DownloadsPanel />
        </TabPanel>
      </main>
    </Tabs>
  );
}

type TabPanelProps = {
  value: MainTab;
  activeTab: MainTab;
  children: ReactNode;
};

/**
 * A tab panel that stays mounted — analysis results and in-flight downloads
 * must survive a tab switch — and slides along the axis the tabs are laid out
 * on, so a panel always leaves towards where its tab sits and returns the same
 * way.
 */
function TabPanel({ value, activeTab, children }: TabPanelProps) {
  const isActive = value === activeTab;
  const offset =
    (TAB_ORDER.indexOf(value) - TAB_ORDER.indexOf(activeTab)) * PANEL_SLIDE_PX;

  return (
    <TabsContent value={value} forceMount asChild>
      <motion.div
        // `inert` takes the hidden panel out of the accessibility tree and out
        // of tab order, which `hidden` also did — but without blocking motion.
        inert={!isActive}
        initial={false}
        animate={{ opacity: isActive ? 1 : 0, x: offset }}
        transition={SPRING.default}
        className={cn(
          "mx-auto w-full max-w-5xl px-5 py-8",
          // The inactive panel leaves the flow so it cannot dictate page height.
          !isActive && "pointer-events-none absolute inset-x-0 top-0",
        )}
      >
        {children}
      </motion.div>
    </TabsContent>
  );
}
