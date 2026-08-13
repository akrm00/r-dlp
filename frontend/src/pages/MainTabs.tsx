import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DownloadsPanel, useDownloads } from "@/features/downloads";
import HomePage from "./HomePage";

type MainTab = "search" | "downloads";

type MainTabsProps = {
  /** Bumping this resets the search tab, leaving the downloads untouched. */
  searchKey: number;
};

export function MainTabs({ searchKey }: MainTabsProps) {
  const [tab, setTab] = useState<MainTab>("search");
  const { activeCount } = useDownloads();

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as MainTab)}
      className="mx-auto max-w-5xl px-4 py-8"
    >
      <TabsList>
        <TabsTrigger value="search">Download</TabsTrigger>
        <TabsTrigger value="downloads">
          Downloads
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 tabular-nums">
              {activeCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Both panels stay mounted so analysis results and download progress
          survive a tab switch. `forceMount` alone keeps Radix from hiding the
          inactive panel, so `hidden` is set explicitly. */}
      <TabsContent
        value="search"
        forceMount
        hidden={tab !== "search"}
        className="mt-6"
      >
        <HomePage
          key={searchKey}
          onDownloadQueued={() => setTab("downloads")}
        />
      </TabsContent>

      <TabsContent
        value="downloads"
        forceMount
        hidden={tab !== "downloads"}
        className="mt-6"
      >
        <DownloadsPanel />
      </TabsContent>
    </Tabs>
  );
}
