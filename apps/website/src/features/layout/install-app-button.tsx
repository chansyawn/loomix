import { ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import LayoutGridPlus from "@/assets/icons/layout-grid-plus.svg?react";
import { Button } from "@/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/components/dialog";
import { useSidebar } from "@/ui/components/sidebar";
import {
  detectInstallGuidePlatform,
  installGuides,
  type InstallGuidePlatform,
} from "./install-guide";

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
  const [guidePlatform, setGuidePlatform] = useState<InstallGuidePlatform | null>(null);

  async function handleGuideOpenChange(open: boolean) {
    if (!open) {
      setGuideOpen(false);
      return;
    }
    if (await promptInstall()) return;
    setGuidePlatform(detectInstallGuidePlatform(window.navigator));
    setGuideOpen(true);
  }

  return (
    <Dialog open={guideOpen} onOpenChange={handleGuideOpenChange}>
      <DialogTrigger
        aria-label="安装应用"
        title="安装应用"
        disabled={prompting}
        render={<Button variant="ghost" size={isMobile ? "default" : "icon"} />}
      >
        <LayoutGridPlus aria-hidden="true" data-icon="inline-start" />
        {isMobile && <span>安装应用</span>}
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>安装络米星集</DialogTitle>
          <DialogDescription>通过浏览器菜单安装到桌面或主屏幕。</DialogDescription>
        </DialogHeader>
        {guidePlatform && <InstallGuideSteps guide={installGuides[guidePlatform]} />}
        <Collapsible>
          <CollapsibleTrigger render={<Button variant="outline" size="sm" />}>
            {guidePlatform ? "其他平台" : "查看各平台安装步骤"}
            <ChevronDownIcon
              aria-hidden="true"
              data-icon="inline-end"
              className="group-aria-expanded/button:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 flex flex-col gap-2">
              {Object.entries(installGuides)
                .filter(([platform]) => platform !== guidePlatform)
                .map(([platform, guide]) => (
                  <li key={platform}>
                    <InstallGuideSteps guide={guide} />
                  </li>
                ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>关闭</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstallGuideSteps({ guide }: { guide: (typeof installGuides)[InstallGuidePlatform] }) {
  return (
    <div className="text-muted-foreground">
      <strong className="font-medium text-foreground">{guide.label}</strong>
      <p>{guide.steps}</p>
    </div>
  );
}
