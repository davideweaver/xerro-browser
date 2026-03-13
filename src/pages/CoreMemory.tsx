import { useQuery } from "@tanstack/react-query";
import { memoryBlocksService } from "@/api/memoryBlocksService";
import Container from "@/components/container/Container";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MarkdownViewer } from "@/components/document-viewers";

const SYSTEM_TABS = [
  { label: "system/capabilities", title: "Capabilities" },
  { label: "system/human", title: "About Me" },
  { label: "system/instructions", title: "Instructions" },
  { label: "system/persona", title: "Persona" },
] as const;

function CoreMemoryTabContent({ label }: { label: string }) {
  const { data: block, isLoading } = useQuery({
    queryKey: ["memory-block", label],
    queryFn: () => memoryBlocksService.getBlock(label),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 bg-accent/50 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
        ))}
      </div>
    );
  }

  if (!block) {
    return <div className="pt-4 text-sm text-muted-foreground">Block not found.</div>;
  }

  return (
    <div className="pt-4">
      <MarkdownViewer content={block.content} documentPath={block.path} />
    </div>
  );
}

export default function CoreMemory() {
  return (
    <Container title="Core Memory" description="Injected into agents as Memory Context">
      <Tabs defaultValue={SYSTEM_TABS[0].label}>
        <TabsList>
          {SYSTEM_TABS.map((tab) => (
            <TabsTrigger key={tab.label} value={tab.label}>
              {tab.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {SYSTEM_TABS.map((tab) => (
          <TabsContent key={tab.label} value={tab.label}>
            <CoreMemoryTabContent label={tab.label} />
          </TabsContent>
        ))}
      </Tabs>
    </Container>
  );
}
