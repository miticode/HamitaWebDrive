import { cached } from "@/lib/cache";
import { isAdmin } from "@/lib/auth";
import { getUserAccessToken } from "@/lib/googleAuth";

export const runtime = "nodejs";

/**
 * Chỗ chứa còn lại trên Google Drive của studio.
 *
 * VÌ SAO TÁCH RA MỘT ĐƯỜNG RIÊNG thay vì đọc luôn trong trang quản lý:
 * nguyên tắc 9 nói trang quản lý không gọi Drive. Lý do của nguyên tắc đó là
 * đọc cây thư mục của mọi album tốn ~70 lần gọi và 8–10 giây. Lời gọi ở đây
 * khác hẳn — đúng MỘT lần, không đụng tới album nào — nhưng vẫn không nên đặt
 * vào lượt dựng trang: Drive chậm một nhịp là cả trang quản lý chậm theo.
 *
 * Đặt riêng thì trang hiện ra ngay, khung dung lượng tự điền vào sau. Drive
 * trục trặc thì mất đúng khung đó, không mất trang.
 *
 * Cache 10 phút: con số này thay đổi theo tốc độ studio upload ảnh, tức là rất
 * chậm. Hỏi lại mỗi lần mở trang chỉ tổ tốn hạn mức gọi Drive.
 */

const TTL_MS = 10 * 60 * 1000;

export type KhoAnh = {
  /** Tổng dung lượng của tài khoản, tính bằng byte. */
  tong: number;
  daDung: number;
  conLai: number;
  /** Phần trăm đã dùng, làm tròn một chữ số. */
  phanTram: number;
  email: string | null;
};

async function docKho(): Promise<KhoAnh | null> {
  const token = await getUserAccessToken();
  if (!token) return null; // Chưa nối Google bằng tài khoản chủ.

  const res = await fetch(
    "https://www.googleapis.com/drive/v3/about?fields=storageQuota,user",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Drive trả về ${res.status}`);

  const j = (await res.json()) as {
    storageQuota?: { limit?: string; usage?: string };
    user?: { emailAddress?: string };
  };

  const tong = Number(j.storageQuota?.limit ?? 0);
  const daDung = Number(j.storageQuota?.usage ?? 0);
  // Tài khoản không giới hạn thì không có gì để cảnh báo.
  if (!tong) return null;

  return {
    tong,
    daDung,
    conLai: Math.max(0, tong - daDung),
    phanTram: Math.round((daDung / tong) * 1000) / 10,
    email: j.user?.emailAddress ?? null,
  };
}

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const kho = await cached("kho-anh", TTL_MS, docKho);
    return Response.json(
      { kho },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    /*
      Nuốt lỗi có chủ đích: đây là một khung thông tin thêm, không phải thứ
      trang quản lý sống nhờ. Trả về null thì giao diện tự giấu khung đi.
    */
    return Response.json(
      { kho: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
