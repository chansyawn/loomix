import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Fragment } from "react";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/ui/components/pagination";

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
    <Pagination
      aria-label="家具分页"
      className="flex flex-wrap items-center justify-center gap-1.5 border-t py-7"
    >
      <PaginationContent>
        <PaginationItem>
          <PaginationButton
            aria-label="上一页"
            disabled={page === 1}
            onClick={() => onChange(page - 1)}
          >
            <ChevronLeftIcon />
          </PaginationButton>
        </PaginationItem>
        {numbers.map((number, index) => (
          <Fragment key={number}>
            {index > 0 && number - numbers[index - 1] > 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationButton
                isActive={number === page}
                aria-label={`第 ${number} 页`}
                aria-current={number === page ? "page" : undefined}
                onClick={() => onChange(number)}
              >
                {number}
              </PaginationButton>
            </PaginationItem>
          </Fragment>
        ))}
        <PaginationItem>
          <PaginationButton
            aria-label="下一页"
            disabled={page === pages}
            onClick={() => onChange(page + 1)}
          >
            <ChevronRightIcon />
          </PaginationButton>
        </PaginationItem>
      </PaginationContent>
      <span className="ml-2 text-xs text-muted-foreground">共 {pages} 页</span>
    </Pagination>
  );
}
