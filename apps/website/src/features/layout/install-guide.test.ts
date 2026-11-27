import { expect, test } from "vite-plus/test";
import { detectInstallGuidePlatform } from "./install-guide";

test.each([
  ["Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)", 5, "ios"],
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/26.0 Safari/605.1.15", 5, "ios"],
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/26.0 Safari/605.1.15", 0, "macSafari"],
  [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/143.0.0.0 Safari/537.36",
    0,
    "desktopChrome",
  ],
  [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/143.0.0.0 Edg/143.0.0.0",
    0,
    "macSafari",
  ],
  ["Mozilla/5.0 (Linux; Android 16) Chrome/143.0.0.0", 5, "android"],
  ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/143.0.0.0", 5, "desktopChrome"],
  ["Unknown", 0, null],
] as const)(
  "recommends the install guide for %s with %i touch points",
  (userAgent, maxTouchPoints, platform) => {
    expect(detectInstallGuidePlatform({ userAgent, maxTouchPoints })).toBe(platform);
  },
);
