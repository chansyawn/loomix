import { useRouter } from "@tanstack/react-router";
import { Button } from "@/ui/components/button";
import { NeighborsReturnLink } from "./navigation";

export function NeighborsLoading() {
  return (
    <section aria-busy="true" aria-label="正在加载友邻资料" className="space-y-6 py-8">
      <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="aspect-3/4 animate-pulse rounded-3xl bg-muted" />
        ))}
      </div>
    </section>
  );
}
export function NeighborsError() {
  const router = useRouter();
  return (
    <section role="alert" className="space-y-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">友邻资料暂时无法加载</h1>
      <p className="text-muted-foreground">请检查网络与资源版本，然后重新加载。</p>
      <Button onClick={() => void router.invalidate()}>重新加载</Button>
    </section>
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
