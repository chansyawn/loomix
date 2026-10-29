import type { ReactNode } from "react";
import { Badge } from "@/ui/components/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";

export interface CollectionTab<V extends string = string> {
  value: V;
  label: string;
  icon: ReactNode;
  count?: number;
}

export function CollectionPage<V extends string>({
  title,
  tabs = [],
  view,
  onViewChange,
  loading = false,
  children,
}: {
  title: string;
  tabs?: CollectionTab<V>[];
  view?: V;
  onViewChange?: (value: V) => void;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="@container"
      aria-busy={loading || undefined}
      aria-label={loading ? `正在加载${title}图鉴` : undefined}
    >
      <div className="mb-7">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      </div>
      {tabs.length > 0 ? (
        <Tabs
          value={view}
          onValueChange={(value) => {
            const tab = tabs.find((item) => item.value === value);
            if (tab) onViewChange?.(tab.value);
          }}
        >
          <TabsList
            aria-label={`${title}视图`}
            className={tabs.length > 2 ? "w-full max-w-sm" : undefined}
          >
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={loading}
                className={
                  tabs.length > 2 ? "min-w-0 [&_svg]:hidden @min-[380px]:[&_svg]:block" : undefined
                }
              >
                {tab.icon}
                {tab.label}
                <Badge variant="secondary">{tab.count ?? "—"}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {view === tab.value ? children : null}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        children
      )}
    </section>
  );
}
