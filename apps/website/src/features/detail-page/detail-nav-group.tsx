import { Menu } from "@base-ui/react/menu";
import { ChevronDownIcon, type LucideIcon } from "lucide-react";
import { cloneElement, type ReactElement } from "react";
import { Button } from "@/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu";

type DetailNavList = {
  key: string;
  label?: string;
  items: readonly (DetailNavLink & { children?: readonly DetailNavLink[] })[];
};

type DetailNavLink = {
  key: string | number;
  label: string;
  link: ReactElement<{ className?: string }>;
};

const headingClass = "px-2.5 py-1.5 text-xs font-medium wrap-break-word text-muted-foreground";
const linkClass =
  "flex min-h-9 min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm wrap-break-word text-muted-foreground outline-none hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-current:bg-muted data-current:text-foreground";
const menuLinkClass =
  "flex min-h-11 min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm wrap-break-word outline-hidden select-none data-current:bg-muted data-highlighted:bg-accent data-highlighted:text-accent-foreground";
const childListClass = "ms-3 flex flex-col gap-0.5 border-s ps-1.5";

export type DetailNavigation = {
  title: string;
  label?: string;
  icon: LucideIcon;
  align?: "start" | "end";
  lists: readonly DetailNavList[];
  notice?: string;
};

export function DetailNavGroup({
  title,
  label = title,
  icon: Icon,
  align,
  lists,
  notice,
}: DetailNavigation) {
  const note = notice && <p className="px-2.5 py-1.5 text-xs/5 text-muted-foreground">{notice}</p>;

  return (
    <nav
      aria-label={label}
      className="min-w-0 @min-[48rem]/detail-page:not-first:border-t @min-[48rem]/detail-page:not-first:pt-2"
    >
      <div className="@min-[48rem]/detail-page:hidden">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger render={<Button variant="ghost" className="h-11" />}>
            <Icon data-icon="inline-start" />
            {title}
            <ChevronDownIcon data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align}>
            <div className="flex flex-col gap-1">
              {lists.map((list) => (
                <DropdownMenuGroup key={list.key}>
                  {list.label && <DropdownMenuLabel>{list.label}</DropdownMenuLabel>}
                  <div className="flex flex-col gap-0.5">
                    {list.items.map(({ children, ...item }) => (
                      <div key={item.key} className="flex flex-col gap-0.5">
                        <DetailNavMenuLink item={item} />
                        {children && (
                          <DropdownMenuGroup aria-label={item.label}>
                            <div className={childListClass}>
                              {children.map((child) => (
                                <DetailNavMenuLink key={child.key} item={child} />
                              ))}
                            </div>
                          </DropdownMenuGroup>
                        )}
                      </div>
                    ))}
                  </div>
                </DropdownMenuGroup>
              ))}
              {note}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="hidden flex-col gap-1 @min-[48rem]/detail-page:flex">
        <p className={headingClass}>{title}</p>
        {lists.map((list) => (
          <div key={list.key}>
            {list.label && <p className={headingClass}>{list.label}</p>}
            <ul className="flex flex-col gap-0.5" aria-label={list.label}>
              {list.items.map(({ key, link, children }) => (
                <li key={key} className="flex flex-col gap-0.5">
                  {cloneElement(link, { className: linkClass })}
                  {children && (
                    <ul className={childListClass}>
                      {children.map((child) => (
                        <li key={child.key}>
                          {cloneElement(child.link, { className: linkClass })}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {note}
      </div>
    </nav>
  );
}

function DetailNavMenuLink({ item }: { item: DetailNavLink }) {
  return (
    <Menu.LinkItem label={item.label} render={item.link} closeOnClick className={menuLinkClass} />
  );
}
