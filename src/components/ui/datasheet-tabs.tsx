import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

interface TabData {
  id: string;
  title: string;
  description?: string;
  badge?: number;
  content: React.ReactNode;
}

interface DatasheetTabsProps {
  tabs: TabData[];
  defaultTab?: string;
  className?: string;
  orientation?: "horizontal" | "vertical";
  isResponsive?: boolean;
}

export function DatasheetTabs({
  tabs,
  defaultTab,
  className,
  orientation = "horizontal",
  isResponsive = true,
}: DatasheetTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  // For small screens, transform orientation to horizontal if responsive
  const effectiveOrientation = isResponsive 
    ? window.innerWidth < 768 ? "horizontal" : orientation
    : orientation;

  return (
    <Tabs
      defaultValue={activeTab}
      value={activeTab}
      onValueChange={setActiveTab}
      className={cn(
        "w-full",
        effectiveOrientation === "vertical" ? "flex flex-col md:flex-row gap-4" : "",
        className
      )}
    >
      <div className={cn(
        effectiveOrientation === "vertical" 
          ? "md:w-64 w-full overflow-auto" 
          : "w-full overflow-auto pb-2"
      )}>
        <TabsList 
          className={cn(
            "h-auto",
            effectiveOrientation === "vertical" 
              ? "flex-col space-y-1 w-full" 
              : "flex flex-row w-full overflow-auto"
          )}
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center justify-start",
                effectiveOrientation === "vertical" 
                  ? "w-full py-3 px-4 text-left" 
                  : "py-2 px-4"
              )}
            >
              <span className="truncate">{tab.title}</span>
              {tab.badge && (
                <span className="ml-auto bg-primary/10 text-primary px-2 rounded-full text-xs">
                  {tab.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="flex-1 overflow-auto">
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-0 flex-1">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-6 pt-6 pb-3">
                <CardTitle>{tab.title}</CardTitle>
                {tab.description && (
                  <CardDescription>{tab.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {tab.content}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}

interface TabularDataProps {
  title: string;
  description?: string;
  tabs: {
    id: string;
    title: string;
    data: any[];
    columns: any[];
    description?: string;
  }[];
  orientation?: "horizontal" | "vertical";
  isResponsive?: boolean;
}

export function TabularDatasheets({
  title,
  description,
  tabs,
  orientation = "horizontal",
  isResponsive = true,
}: TabularDataProps) {
  const tabsWithContent = tabs.map(tab => ({
    id: tab.id,
    title: tab.title,
    description: tab.description,
    badge: tab.data.length,
    content: (
      <DataTable
        columns={tab.columns}
        data={tab.data}
        showSearch={true}
      />
    )
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      
      <DatasheetTabs 
        tabs={tabsWithContent} 
        orientation={orientation}
        isResponsive={isResponsive}
      />
    </div>
  );
}
