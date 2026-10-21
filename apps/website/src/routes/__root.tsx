import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { WikiLayout } from "@/features/layout/wiki-layout";
import { site } from "@/site";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: site.title,
      },
      {
        name: "description",
        content: site.description,
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        href: "/logo.png",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

function RootLayout() {
  return (
    <WikiLayout>
      <Outlet />
    </WikiLayout>
  );
}

function NotFoundPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <section className="w-full max-w-lg space-y-6 text-center">
        <p className="text-7xl font-semibold tracking-tight text-primary">404</p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">页面未找到</h1>
          <p className="text-muted-foreground">你访问的页面不存在，或者已经被移动。</p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center rounded-4xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          to="/"
        >
          返回首页
        </Link>
      </section>
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
