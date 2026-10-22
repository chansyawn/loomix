import type { ProcessOptions } from "../process.ts";

export type RunProcess = (
  executable: string,
  args: string[],
  options?: ProcessOptions,
) => Promise<void>;
export interface DownloadOptions {
  hash: string;
  algorithm?: string;
}
export type Download = (
  url: string,
  destination: string,
  checksum: DownloadOptions,
) => Promise<void>;
export interface UnpackOptions {
  platform: string;
  run: RunProcess;
}
export type Unpack = (
  archive: string,
  destination: string,
  options: UnpackOptions,
) => Promise<void>;
export interface PlatformOptions extends UnpackOptions {
  directory: string;
  work: string;
  rid: string;
  fetchFile?: Download;
  extract?: Unpack;
}
export interface ToolOptions {
  root?: string;
  platform?: string;
  architecture?: string;
  prepare?: (options: PlatformOptions) => Promise<void>;
  run?: RunProcess;
  patch?: string | Buffer;
}
export interface ExtractionOptions {
  input: string;
  output: string;
  game: string;
  logFile?: string;
}
export interface ExportOptions extends ExtractionOptions {
  types: string[];
  names?: string[];
  containers?: string[];
}
export interface AnimeStudio {
  ensureAnimeStudio: () => Promise<string>;
  exportAssets: (options: ExportOptions) => Promise<void>;
  buildAssetMap: (options: ExtractionOptions) => Promise<string>;
}
