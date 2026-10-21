import type { ContentGroup } from "@loomix/content-schema";

export interface WorkOptions {
  work: string;
}
export interface ContentOptions extends WorkOptions {
  output: string;
  step?: string;
  help?: boolean;
}
export interface IndexedAsset {
  Name?: string;
  Container?: string;
  Type?: string;
  PathID: string;
  Source: string;
}
export interface BinDataAsset extends IndexedAsset {
  Name: string;
  file: string;
}
export interface IconMatch {
  reference: string;
  matched: boolean;
  assetType: string;
  resourceName: string | null;
  container: string | null;
  source: string | null;
  pathId: string | null;
  sourceVariants: { source: string; pathId: string }[];
  matchMethod: string | null;
}
export interface SelectedImage {
  id: number;
  group: ContentGroup;
  reference: string;
  assetType: string;
  resourceName: string;
  container: string;
  source: string;
  pathId: string;
}
export interface ImageManifest extends SelectedImage {
  file: string;
  sha256: string;
  width: number;
  height: number;
}
export interface ConfigFile {
  file: string;
  exists?: boolean;
  md5?: string;
  size?: number;
  sha256?: string;
  matchesManifest?: boolean;
}
export interface ConfigSource {
  dataRevision: number;
  relativeDirectory: string;
  files: ConfigFile[];
}
export interface TableIndex {
  field: number;
  vector: number;
  count: number;
}
export interface TableRow {
  root: number;
  rowOffset: number;
}
export type Row = TableRow | null | undefined;
export type ScalarMethod = "readUInt32LE" | "readUInt8" | "readFloatLE";
export interface TextEntry {
  nameZh: string | null;
  nameEn: string | null;
  rowOffset: number;
  index: number;
}
export interface TextMap {
  byHash: Record<number, TextEntry>;
}
export type FieldValue = string | number | number[] | null;
export interface EvidenceRecord {
  id: number;
  group: ContentGroup;
  field: string;
  value: FieldValue;
  evidence: unknown;
  reason?: string;
}
export interface TagNode {
  TagId: number;
  TagName: string;
  ParentId: number;
  EnumName?: string;
}
export interface SourceCheck {
  expected?: { md5: string; size: number };
  source: string;
  md5: string;
  size: number;
  matchesManifest: boolean;
}
export interface SourceAudit {
  passed: boolean;
  checkedPackages: number;
  records: SourceCheck[];
  configChecks: (Omit<SourceCheck, "source"> & { file: string })[];
}
export interface ValidationReport {
  passed: boolean;
}
