import { useRouter } from "@tanstack/react-router";
import { SearchXIcon, WifiOffIcon } from "lucide-react";
import { Button } from "@/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/ui/components/empty";
import { Skeleton } from "@/ui/components/skeleton";
import { NeighborsGrid, NeighborsListLayout } from "./list-layout";
import { NeighborsReturnLink } from "./navigation";

export function NeighborsLoading() {
  return (
    <NeighborsListLayout search={{ q: "", galaxy: "" }} total={0} loading>
      <div aria-hidden="true">
        <NeighborsGrid>
          {Array.from({ length: 8 }, (_, index) => (
            <Card key={index} padding="flush" className="min-w-0">
              <div className="mx-2 mt-2 shrink-0 overflow-hidden rounded-md">
                <Skeleton shape="square" className="aspect-156/41" />
              </div>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="my-1 h-4 w-20" />
                </CardTitle>
                <CardDescription>
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="mt-1 h-4 w-16" />
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </NeighborsGrid>
      </div>
    </NeighborsListLayout>
  );
}

export function NeighborsEmpty({ onClear }: { onClear: () => void }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h2>没有找到匹配的友邻</h2>
        </EmptyTitle>
        <EmptyDescription>试试其他关键词，或减少一些筛选条件。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onClear}>
          清空筛选
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function NeighborsError() {
  const router = useRouter();
  return (
    <Empty role="alert" className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WifiOffIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>友邻资料暂时无法加载</h1>
        </EmptyTitle>
        <EmptyDescription>请检查网络与资源版本，然后重新加载。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => void router.invalidate()}>重新加载</Button>
      </EmptyContent>
    </Empty>
  );
}
export function NeighborNotFound() {
  return (
    <section className="space-y-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">没有找到这位友邻</h1>
      <NeighborsReturnLink className="underline underline-offset-4">
        返回友邻列表
      </NeighborsReturnLink>
    </section>
  );
}
