import { randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { getUserAccessToken } from "@/lib/googleAuth";
import { tenTepSaoLuu, type BanSaoLuu } from "@/lib/saoLuu";

/**
 * Cất một bản sao lưu vào Google Drive của studio.
 *
 * Dùng quyền `drive.file` — Google chỉ cho web ghi, sửa đúng những tệp do
 * chính web tạo ra, KHÔNG đụng được tới ảnh của khách hay bất cứ tệp nào khác
 * trên Drive. Quyền đọc ảnh (`drive.readonly`) vẫn là quyền riêng, không đổi.
 *
 * Nén gzip trước khi cất: bản JSON đầy đủ vài MB, nén còn chừng một phần năm.
 * Mỗi đêm một bản, cả năm vẫn chưa tới nửa GB trên kho 2 TB — nên CHƯA làm
 * việc tự xoá bản cũ. Tự xoá là thêm một chỗ có thể xoá nhầm, đổi lấy vài
 * trăm MB không ai cần.
 */

export const TEN_THU_MUC = "Hamita – Sao lưu tự động";

/** Lỗi sao lưu lên Drive. `canKetNoiLai` = sửa được bằng cách bấm "Kết nối lại" Google. */
export class LoiSaoLuuDrive extends Error {
  constructor(
    thongDiep: string,
    public readonly canKetNoiLai = false,
  ) {
    super(thongDiep);
    this.name = "LoiSaoLuuDrive";
  }
}

const THIEU_QUYEN =
  "Kết nối Google chưa có quyền tạo tệp sao lưu. Vào trang quản lý album, bấm " +
  "“Kết nối lại” Google (đúng tài khoản đang kết nối) và tích ô cho phép tạo tệp.";

async function goi(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  if (res.ok) return res;

  const than = await res.text();
  if (res.status === 401 || (res.status === 403 && /insufficient|scope|permission/i.test(than))) {
    throw new LoiSaoLuuDrive(THIEU_QUYEN, true);
  }
  throw new LoiSaoLuuDrive(`Drive trả về ${res.status}: ${than.slice(0, 200)}`);
}

/** Thư mục chứa bản sao lưu — chưa có thì tạo. */
async function layThuMuc(token: string): Promise<string> {
  const q =
    `name = '${TEN_THU_MUC}' and mimeType = 'application/vnd.google-apps.folder' ` +
    `and trashed = false and 'me' in owners`;
  const tim = await goi(
    token,
    `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q, fields: "files(id)", pageSize: "1" })}`,
  );
  const coSan = ((await tim.json()) as { files?: { id: string }[] }).files?.[0]?.id;
  if (coSan) return coSan;

  const tao = await goi(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: TEN_THU_MUC, mimeType: "application/vnd.google-apps.folder" }),
  });
  return ((await tao.json()) as { id: string }).id;
}

export async function luuLenDrive(
  ban: BanSaoLuu,
  luc: Date,
): Promise<{ tenTep: string; kb: number }> {
  const token = await getUserAccessToken().catch(() => null);
  if (!token) throw new LoiSaoLuuDrive("Chưa kết nối Google Drive, hoặc kết nối đã hỏng.", true);

  const thuMuc = await layThuMuc(token);
  const noiDung = gzipSync(Buffer.from(JSON.stringify(ban), "utf8"));
  const tenTep = `${tenTepSaoLuu(luc)}.gz`;

  // Gửi thông tin tệp và nội dung trong MỘT yêu cầu (multipart) của Drive.
  const ranh = `hamita-${randomBytes(8).toString("hex")}`;
  const than = Buffer.concat([
    Buffer.from(
      `--${ranh}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name: tenTep, parents: [thuMuc], mimeType: "application/gzip" }) +
        `\r\n--${ranh}\r\nContent-Type: application/gzip\r\n\r\n`,
      "utf8",
    ),
    noiDung,
    Buffer.from(`\r\n--${ranh}--`, "utf8"),
  ]);

  const res = await goi(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,size",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${ranh}` },
      body: than,
    },
  );

  /*
    Đối chiếu dung lượng Drive báo lại với tệp vừa gửi. Lệch là tệp trên Drive
    hỏng giữa đường — thà báo lỗi ngay còn hơn để studio yên tâm với một bản
    sao lưu không mở ra được.
  */
  const tep = (await res.json()) as { id: string; size?: string };
  if (Number(tep.size) !== noiDung.length) {
    throw new LoiSaoLuuDrive(
      `Tệp trên Drive (${tep.size ?? "?"} byte) không khớp tệp gửi đi (${noiDung.length} byte).`,
    );
  }

  return { tenTep, kb: Math.round(noiDung.length / 1024) };
}
