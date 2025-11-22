
export function u16leBytes(n: number): Uint8Array {
  const arr = new Uint8Array(2);
  new DataView(arr.buffer).setUint16(0, n, true);
  return arr;
}

export function fixedLenBytes(str: string, len: number): number[] {
  const enc = new TextEncoder().encode(str);
  const out = new Uint8Array(len);
  out.set(enc.slice(0, len));
  return Array.from(out);
}

export function hexToBytes32(hex: string): number[] {
  const clean = hex.replace(/^0x/, "").toLowerCase();
  if (clean.length !== 64) throw new Error("expected 64 hex chars (32 bytes)");
  const out = new Uint8Array(32);
  for (let i=0;i<32;i++) out[i] = parseInt(clean.slice(i*2,i*2+2), 16);
  return Array.from(out);
}

export async function sha256(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
