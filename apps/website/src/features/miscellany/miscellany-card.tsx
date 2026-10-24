import { Link } from "@tanstack/react-router";
import type { MiscellaneousItem } from "../collection-view.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";
import { QualityBar } from "@/ui/collection/quality";
import { RecordImage } from "@/ui/collection/record-image";
import { useMiscellanyOrigin } from "./detail-navigation";

export function MiscellanyCard({ item }: { item: MiscellaneousItem }) {
  const origin = useMiscellanyOrigin();
  return (
    <Card
      size="sm"
      role="article"
      className="relative h-full min-w-0 pt-0 transition-shadow hover:ring-2 hover:ring-primary/30 focus-within:ring-2 focus-within:ring-ring"
    >
      <div className="relative shrink-0">
        <RecordImage key={item.image} image={item.image} name={item.name} />
        <QualityBar quality={item.quality} />
      </div>
      <CardHeader>
        <CardTitle>
          <h2 className="truncate" title={item.name}>
            <Link
              to="/collection/miscellany/items/$id"
              params={{ id: String(item.id) }}
              state={{ miscellanyOrigin: origin }}
              className="outline-none after:absolute after:inset-0 after:rounded-xl"
            >
              {item.name}
            </Link>
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="line-clamp-2 min-h-10">
          {item.description || "描述未提供"}
        </CardDescription>
        <p className="mt-2 text-xs text-muted-foreground">编号 {item.id}</p>
      </CardContent>
    </Card>
  );
}
