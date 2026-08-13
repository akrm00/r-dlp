import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Header } from "@/shared/components/Header";
import { DownloadsPanel, useDownloads } from "@/features/downloads";
import HomePage from "./HomePage";

type MainTab = "analyze" | "download";

const PANEL_CLASS = "mx-auto max-w-5xl px-4 py-8";

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
          <TabsList>
            <TabsTrigger value="analyze">Analyze</TabsTrigger>
            <TabsTrigger value="download">
              Download
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 tabular-nums">
                  {activeCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        }
      />

      <main className="flex-1">
        {/* Both panels stay mounted so analysis results and download progress
            survive a tab switch. `forceMount` alone keeps Radix from hiding the
            inactive panel, so `hidden` is set explicitly. */}
        <TabsContent
          value="analyze"
          forceMount
          hidden={tab !== "analyze"}
          className={PANEL_CLASS}
        >
          <HomePage
            key={searchKey}
            onDownloadQueued={() => setTab("download")}
          />
        </TabsContent>

        <TabsContent
          value="download"
          forceMount
          hidden={tab !== "download"}
          className={PANEL_CLASS}
        >
          <DownloadsPanel />
        </TabsContent>
      </main>
    </Tabs>
  );
}
