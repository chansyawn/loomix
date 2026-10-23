import type { ContentGroup } from "@loomix/content-schema";
import type {
  Evidence,
  EvidenceRecord,
  FieldValue,
  SelectedImage,
} from "../../tasks/content/types.ts";
import type { FieldCandidate } from "../evidence/schema.ts";
import { additionalFields } from "../../tasks/content/model.ts";

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
  readonly group: ContentGroup;
  readonly id: number;
  readonly record: Record<string, FieldValue> & { id: number };
  readonly proofs: EvidenceRecord[] = [];
  readonly diagnostics: EvidenceRecord[] = [];
  readonly candidates: FieldCandidate[] = [];
  readonly images: SelectedImage[] = [];

  constructor(group: ContentGroup, id: number) {
    this.group = group;
    this.id = id;
    this.record = { name: null, image: null, description: null, id, quality: null };
    for (const field of additionalFields[group]) this.record[field] = null;
  }

  put(
    field: string,
    value: FieldValue | undefined,
    evidence: Evidence,
    reason = "configuration_missing",
  ): void {
    this.record[field] = value ?? null;
    const detail = { id: this.id, group: this.group, field, value: this.record[field], evidence };
    if (this.record[field] === null) this.diagnostics.push({ ...detail, reason });
    else this.proofs.push(detail);
  }

  set(field: string, result: Field): void {
    this.put(field, result.value, result.evidence, result.reason);
  }
}
