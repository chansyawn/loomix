import { recordFields } from "../schema.ts";
import type { RecordType } from "../schema.ts";
import type { Evidence, EvidenceRecord, FieldValue, SelectedImage } from "../types.ts";
import type { FieldCandidate } from "../evidence/schema.ts";
export interface Field<T extends FieldValue = FieldValue> {
  value: T;
  evidence: Evidence;
  reason?: string;
}
export const known = <T extends FieldValue>(value: T, evidence: Evidence): Field<T> => ({
  value,
  evidence,
});
export const unknown = (evidence: Evidence, reason: string): Field<null> => ({
  value: null,
  evidence,
  reason,
});
export class RecordBuilder {
  readonly record: Record<string, unknown>;
  readonly proofs: EvidenceRecord[] = [];
  readonly diagnostics: EvidenceRecord[] = [];
  readonly candidates: FieldCandidate[] = [];
  readonly images: SelectedImage[] = [];
  readonly group: RecordType;
  readonly id: number;
  constructor(group: RecordType, id: number, listed: boolean | null) {
    this.group = group;
    this.id = id;
    this.record = { encyclopediaEntry: listed === null ? null : { listed } };
    if (group.endsWith(".item")) this.record.attributes = {};
    for (const field of recordFields(group)) this.assign(field, null);
  }
  private assign(field: string, value: FieldValue): void {
    if (field.startsWith("attributes."))
      Reflect.set(this.record.attributes as object, field.slice(11), value);
    else this.record[field] = value;
  }
  put(
    field: string,
    value: FieldValue | undefined,
    evidence: Evidence,
    reason = "configuration_missing",
    status?: "confirmed" | "unconfirmed",
  ): void {
    const resolved = value ?? null;
    this.assign(field, resolved);
    const detail = {
      id: this.id,
      group: this.group,
      field,
      value: resolved,
      evidence,
      ...(status ? { status } : {}),
      ...(status === "unconfirmed" && resolved !== null ? { reason } : {}),
    };
    if (resolved === null) this.diagnostics.push({ ...detail, reason });
    else this.proofs.push(detail);
  }
  set(field: string, result: Field): void {
    this.put(field, result.value, result.evidence, result.reason);
  }
}
