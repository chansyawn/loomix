import { AppSidebar } from "@/features/layout/app-sidebar";
import { SiteHeader } from "@/features/layout/site-header";
import { SidebarInset, SidebarProvider } from "@/ui/components/sidebar";

export function WikiLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="min-h-0 min-w-0 overflow-clip">
        <SiteHeader />
        <div className="min-h-0 flex-1 overflow-y-auto" data-scroll-restoration-id="wiki-content">
          <div className="container mx-auto p-4 md:px-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
