import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function SectionPlaceholder({ title, description, Icon }: { title: string; description: string; Icon: LucideIcon }) {
  return (
    <div className="space-y-7">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card className="flex min-h-72 flex-col items-center justify-center text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary"><Icon className="size-6" aria-hidden /></span>
        <h2 className="font-semibold">{title} will appear here</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">This section is ready for your SmartExpiry workspace. Its management tools can be added here next.</p>
      </Card>
    </div>
  );
}
