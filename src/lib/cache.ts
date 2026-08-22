/**
 * Bo nho dem theo thoi gian song, dung cho ket qua goi Drive API.
 * Ly do: link gui khach phai "song" — anh tha them folder moi vao Drive thi
 * khach F5 la thay. Nhung khong the goi Drive moi lan co nguoi mo trang,
 * nen cache ngan han la diem can bang.
 */
type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  // Gop cac request den cung luc lam mot, tranh goi Drive song song thua.
  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const promise = loader()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

export function invalidate(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
