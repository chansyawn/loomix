import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import LayoutGridPlus from "@/assets/icons/layout-grid-plus.svg?react";
import { Button } from "@/ui/components/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { useSidebar } from "@/ui/components/sidebar";

interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface AppInstall {
  prompting: boolean;
  promptInstall: () => Promise<boolean>;
}

const standaloneDisplayMode = "(display-mode: standalone)";

function subscribeToDisplayMode(listener: () => void) {
  const displayMode = window.matchMedia(standaloneDisplayMode);
  displayMode.addEventListener("change", listener);
  return () => displayMode.removeEventListener("change", listener);
}

function isStandalone() {
  const navigator: Navigator & { standalone?: boolean } = window.navigator;
  return window.matchMedia(standaloneDisplayMode).matches || navigator.standalone === true;
}

export function useAppInstall(): AppInstall | null {
  const standaloneOrHydrating = useSyncExternalStore(
    subscribeToDisplayMode,
    isStandalone,
    () => true,
  );
  const deferredPrompt = useRef<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [prompting, setPrompting] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      deferredPrompt.current = event as InstallPromptEvent;
    }

    function handleAppInstalled() {
      deferredPrompt.current = null;
      setInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function promptInstall() {
    const event = deferredPrompt.current;
    if (!event) return false;

    deferredPrompt.current = null;
    setPrompting(true);
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted") setInstalled(true);
      return true;
    } catch {
      return false;
    } finally {
      setPrompting(false);
    }
  }

  return standaloneOrHydrating || installed ? null : { prompting, promptInstall };
}

export function InstallAppButton({ prompting, promptInstall }: AppInstall) {
  const { isMobile } = useSidebar();
  const [guideOpen, setGuideOpen] = useState(false);

  async function handleGuideOpenChange(open: boolean) {
    if (!open || !(await promptInstall())) setGuideOpen(open);
  }

  return (
    <Popover open={guideOpen} onOpenChange={handleGuideOpenChange}>
      <PopoverTrigger
        aria-label="安装应用"
        title="安装应用"
        disabled={prompting}
        render={<Button variant="ghost" size={isMobile ? "default" : "icon"} />}
      >
        <LayoutGridPlus aria-hidden="true" data-icon="inline-start" />
        {isMobile && <span>安装应用</span>}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="max-h-(--available-height) w-[min(20rem,var(--available-width))] overflow-y-auto"
      >
        <PopoverTitle>安装络米星集</PopoverTitle>
        <ul className="flex flex-col gap-2 text-muted-foreground">
          <li>
            <strong className="font-medium text-foreground">桌面 Chrome</strong>
            <p>菜单 → 投放、保存和分享 → 将网页安装为应用。</p>
          </li>
          <li>
            <strong className="font-medium text-foreground">Android Chrome</strong>
            <p>菜单 → 添加到主屏幕 → 安装。</p>
          </li>
          <li>
            <strong className="font-medium text-foreground">iPhone 和 iPad Safari</strong>
            <p>分享 → 添加到主屏幕。如有「作为网页 App 打开」开关，请开启后添加。</p>
          </li>
          <li>
            <strong className="font-medium text-foreground">Mac Safari</strong>
            <p>文件 → 添加到程序坞。</p>
          </li>
        </ul>
        <p className="text-muted-foreground">
          菜单里找不到安装选项时，可用支持安装的浏览器打开链接。
        </p>
      </PopoverContent>
    </Popover>
  );
}
