/**
 * Bo nho dem theo thoi gian song, dung cho ket qua goi Drive API.
 * Ly do: link gui khach phai "song" — anh tha them folder moi vao Drive thi
 * khach F5 la thay. Nhung khong the goi Drive moi lan co nguoi mo trang,
 * nen cache ngan han la diem can bang.
 */
type Entry<T> = { value: T; expiresAt: number; luc: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  /**
   * Moc bo cache, tinh bang milli-giay (anh chot 19/11/2026).
   *
   * Ban ghi nap TRUOC moc nay thi coi nhu da cu, du chua het TTL. Day la cach
   * mot may biet rang may KHAC vua bam "Lam moi": moc nam trong database nen
   * moi may deu doc duoc, con cai Map duoi day thi may nao giu cua may nay.
   *
   * Khong truyen thi hanh vi y nhu truoc — chi het theo TTL.
   */
  bo?: number | null
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now() && !(bo && hit.luc < bo)) return hit.value as T;

  // Gop cac request den cung luc lam mot, tranh goi Drive song song thua.
  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const promise = loader()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs, luc: Date.now() });
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
