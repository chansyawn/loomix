import type { ScalarMethod, TableIndex } from "../types.ts";
import fs from "node:fs";
import { profile } from "../../profile.ts";
const utf8 = new TextDecoder("utf-8", { fatal: true });

// 此客户端的字节数组经过逆序处理，并与镜像掩码进行异或运算。
// 标量存储按其自身字节宽度使用相同的变换。
export function decodeBytes(bytes: Uint8Array) {
  const n = bytes.length,
    out = Buffer.allocUnsafe(n),
    key = (n ^ profile.byteMask) >>> 0;
  const mask = [key & 255, (key >>> 8) & 255, (key >>> 16) & 255, key >>> 24];
  for (let i = 0; i < n; i++)
    out[n - 1 - i] = bytes[i] ^ mask[i === n - 1 - i ? 0 : Math.min(i, n - 1 - i) % 4];
  return out;
}

export function decodeTextMapBucket(bytes: Uint8Array) {
  if (bytes.length !== 8) throw new Error("TextMap bucket must be 8 bytes");
  const value = decodeBytes(bytes).readBigUInt64LE(0);
  const low = Number(value & 0xffffffffn);
  return low === 0xffffffff ? null : { hash: Number(value >> 32n), index: low >>> 8 };
}

export class ObbReader {
  file: string | null;
  b: Buffer;
  constructor(file: string | Buffer) {
    this.file = Buffer.isBuffer(file) ? null : file;
    this.b = Buffer.isBuffer(file) ? file : fs.readFileSync(file);
  }
  inRange(p: number, n = 4) {
    return Number.isSafeInteger(p) && p >= 0 && p + n <= this.b.length;
  }
  u32(p: number | null | undefined) {
    if (p == null) throw new Error("Missing OBB scalar field");
    return (this.b.readUInt32BE(p) ^ profile.wordMask) >>> 0;
  }
  i32(p: number) {
    return this.u32(p) | 0;
  }
  u16(p: number) {
    return this.b.readUInt16BE(p) ^ profile.shortMask;
  }
  scalar(p: number, n: number, type: ScalarMethod) {
    const data = decodeBytes(this.b.subarray(p, p + n));
    return data[type](0);
  }
  ref(p: number | null | undefined) {
    if (p == null) throw new Error("Missing OBB reference field");
    return p + this.u32(p);
  }
  fields(p: number) {
    if (!this.inRange(p)) return null;
    const vt = p - this.i32(p);
    if (!this.inRange(vt)) return null;
    const len = this.u16(vt),
      size = this.u16(vt + 2);
    if (
      len < 4 ||
      len % 2 ||
      len > 3000 ||
      size < 4 ||
      size > 20000 ||
      !this.inRange(vt, len) ||
      !this.inRange(p, size)
    )
      return null;
    const fields = Array.from({ length: len / 2 - 2 }, (_, i) => {
      const off = this.u16(vt + 4 + i * 2);
      return off > 0 && off < size ? p + off : null;
    });
    return fields;
  }
  requiredFields(p: number): (number | null)[] {
    const fields = this.fields(p);
    if (!fields) throw new Error(`Invalid OBB table at ${p}`);
    return fields;
  }
  bytesAtRef(p: number | null | undefined, max = 1000000) {
    if (p == null || !this.inRange(p)) return null;
    const t = this.ref(p);
    if (!this.inRange(t)) return null;
    const n = this.u32(t);
    if (n > max || !this.inRange(t + 4, n)) return null;
    return { offset: t + 4, length: n, bytes: decodeBytes(this.b.subarray(t + 4, t + 4 + n)) };
  }
  string(p: number | null | undefined, max = 20000) {
    const data = this.bytesAtRef(p, max);
    if (!data || !data.length) return null;
    try {
      const text = utf8.decode(data.bytes);
      // 说明文本允许制表符和回车、换行符；其他控制字节表明此候选值并非有效字符串。
      // oxlint-disable-next-line no-control-regex
      return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)
        ? null
        : { text, offset: data.offset, length: data.length };
    } catch {
      return null;
    }
  }
  rows(index: TableIndex) {
    return Array.from({ length: index.count }, (_, i) => this.ref(index.vector + 4 + i * 4));
  }
}
