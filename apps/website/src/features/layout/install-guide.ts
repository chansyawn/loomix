export const installGuides = {
  desktopChrome: {
    label: "桌面 Chrome",
    steps:
      "在 Chrome 中打开本站。点击地址栏右侧的安装图标，或从「更多 → 投放、保存和分享 → 将网页安装为应用」安装。",
  },
  android: {
    label: "Android Chrome",
    steps: "在 Chrome 中打开本站，点按「更多 → 添加到主屏幕 → 安装」。",
  },
  ios: {
    label: "iPhone 和 iPad Safari",
    steps:
      "在 Safari 中打开本站，点按「分享 → 添加到主屏幕」。如有「作为网页 App 打开」开关，请开启后添加。",
  },
  macSafari: {
    label: "Mac Safari",
    steps: "在 Safari 中打开本站，选择「文件 → 添加到程序坞」。",
  },
};

export type InstallGuidePlatform = keyof typeof installGuides;

export function detectInstallGuidePlatform({
  userAgent,
  maxTouchPoints,
}: Pick<Navigator, "userAgent" | "maxTouchPoints">): InstallGuidePlatform | null {
  const isMac = /Macintosh/.test(userAgent);

  if (/iPhone|iPad|iPod/.test(userAgent) || (isMac && maxTouchPoints > 1)) return "ios";
  if (/Android/.test(userAgent)) return "android";
  if (isMac) {
    const isChrome = /Chrome\//.test(userAgent) && !/Edg\/|OPR\//.test(userAgent);
    return isChrome ? "desktopChrome" : "macSafari";
  }
  if (/Windows NT|Linux|CrOS/.test(userAgent)) return "desktopChrome";
  return null;
}
