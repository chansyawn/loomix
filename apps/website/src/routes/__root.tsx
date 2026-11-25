import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { PageNotFound } from "@/features/layout/page-not-found";
import { WikiLayout } from "@/features/layout/wiki-layout";
import { site } from "@/site";
import { Button } from "@/ui/components/button";
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
    <PageNotFound
      title="404 · 页面未找到"
      description="你访问的页面不存在，或者已经被移动。"
      action={
        <Button nativeButton={false} render={<Link to="/" />}>
          返回首页
        </Button>
      }
    />
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
