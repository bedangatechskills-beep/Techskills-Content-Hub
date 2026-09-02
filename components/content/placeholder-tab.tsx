import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderTab({
  title,
  phase,
  body,
}: {
  title: string;
  phase: string;
  body: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Arrives in {phase}.</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">{body}</CardContent>
    </Card>
  );
}
