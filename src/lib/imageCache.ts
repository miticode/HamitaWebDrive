import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Cache anh da resize xuong dia tam.
 * Muc dich: khi CDN chua giu (dev, hoac cold start) thi khong phai goi Drive lai.
 * Tren Vercel day la /tmp cua function, song trong vong doi cua instance.
 */
const DIR = join(tmpdir(), "photo-gallery-cache");

function keyToPath(key: string) {
  const hash = createHash("sha1").update(key).digest("hex");
  return join(DIR, `${hash}.bin`);
}

export async function readCache(key: string): Promise<Buffer | null> {
  try {
    return await readFile(keyToPath(key));
  } catch {
    return null;
  }
}

export async function writeCache(key: string, data: Buffer): Promise<void> {
  try {
    await mkdir(DIR, { recursive: true });
    await writeFile(keyToPath(key), data);
  } catch {
    // Cache loi thi bo qua, khong lam hong request.
  }
}
