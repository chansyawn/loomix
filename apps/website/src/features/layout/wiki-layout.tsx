import { AppSidebar } from "@/features/layout/app-sidebar";
import { SiteHeader } from "@/features/layout/site-header";
import { SidebarInset, SidebarProvider } from "@/ui/components/sidebar";

export function WikiLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <SiteHeader />
        <div
          className="container mx-auto min-h-0 flex-1 overflow-y-auto p-4 md:px-6"
          data-scroll-restoration-id="wiki-content"
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
