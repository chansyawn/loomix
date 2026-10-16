import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/ui/components/button";

export function FurniturePagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  const numbers = [
    ...new Set([
      1,
      ...Array.from({ length: 3 }, (_, index) => page + index - 1).filter(
        (value) => value > 1 && value < pages,
      ),
      pages,
    ]),
  ];
  return (
    <nav
      aria-label="家具分页"
      className="flex flex-wrap items-center justify-center gap-1.5 border-t py-7"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="上一页"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeftIcon />
      </Button>
      {numbers.map((number, index) => (
        <span key={number} className="flex items-center gap-1.5">
          {index > 0 && number - numbers[index - 1] > 1 && (
            <span className="px-1 text-muted-foreground">…</span>
          )}
          <Button
            variant={number === page ? "default" : "ghost"}
            size="icon"
            aria-label={`第 ${number} 页`}
            aria-current={number === page ? "page" : undefined}
            onClick={() => onChange(number)}
          >
            {number}
          </Button>
        </span>
      ))}
      <Button
        variant="ghost"
        size="icon"
        aria-label="下一页"
        disabled={page === pages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRightIcon />
      </Button>
      <span className="ml-2 text-xs text-muted-foreground">共 {pages} 页</span>
    </nav>
  );
}
