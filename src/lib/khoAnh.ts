import { getUserAccessToken } from "@/lib/googleAuth";

/**
 * Chỗ chứa tệp do phần CRM sinh ra: ảnh chấm công, chứng từ thu chi.
 *
 * ── Vì sao không để trong database ────────────────────────────────────────
 * Ảnh nhân viên hiện lưu thẳng vào Postgres (`AnhNhanVien.duLieu Bytes`). Cách
 * đó chạy được với 25 cái avatar, nhưng không chạy với chấm công: bên AppSheet
 * đã có 6.114 lượt, mỗi lượt một ảnh. Cỡ 200 KB một tấm là 1,2 GB, mà gói Neon
 * miễn phí chỉ cho 0,5 GB — chưa kể chứng từ thu chi. Tới mốc đó là database
 * bị khoá và CẢ WEB SẬP, đúng cái đã xảy ra ngày 21/09/2026.
 *
 * ── Vì sao là tài khoản Google thứ hai ────────────────────────────────────
 * Trên Google Drive, TỆP THUỘC VỀ NGƯỜI TẢI LÊN chứ không thuộc về chủ thư
 * mục. Chia sẻ một thư mục của ổ 5 TB cho `hamita.studio` rồi ghi vào đó thì
 * dung lượng vẫn trừ vào ổ 2 TB của `hamita.studio` — mà ổ đó đã dùng
 * 1.880/2.048 GB (đo 13/11/2026). Nên phải ghi DƯỚI DANH NGHĨA tài khoản 5 TB,
 * tức một kết nối OAuth riêng. Xem `KetNoi` trong `src/lib/googleAuth.ts`.
 *
 * ── Quyền ─────────────────────────────────────────────────────────────────
 * Kết nối "kho" trước 15/11/2026 chỉ xin `drive.file`: web chỉ đụng được những tệp do chính
 * nó tạo ra, không nhìn thấy phần còn lại của Drive đó. Nhờ vậy `files.list`
 * ở đây an toàn — nó không thể trả về tệp riêng của anh.
 */

/** Thư mục gốc trên Drive kho. Đổi tên ở đây là lần ghi sau tự tạo thư mục mới. */
const THU_MUC_GOC = "Hamita CRM";

export type NganKho = "cham-cong" | "chung-tu";

const TEN_NGAN: Record<NganKho, string> = {
  "cham-cong": "Chấm công",
  "chung-tu": "Chứng từ thu chi",
};

const LOAI_THU_MUC = "application/vnd.google-apps.folder";

/*
  Nhớ mã thư mục trong bộ nhớ của chính máy đang chạy, cùng lý do với
  `tokenCache` ở googleAuth.ts: mỗi lần ghi mà phải hỏi Drive hai câu để tìm
  lại thư mục là vừa chậm vừa làm phiền Google vô cớ. Máy khởi động lại thì
  hỏi lại một lần, không sao.
*/
const nhoThuMuc = new Map<string, string>();

async function phieuKho(): Promise<string> {
  const token = await getUserAccessToken("kho");
  if (!token) {
    throw new Error(
      "Chưa nối kho ảnh CRM. Vào trang quản lý album, bấm “Nối kho ảnh” rồi chọn tài khoản Drive 5 TB.",
    );
  }
  return token;
}

async function goiDrive(token: string, duongDan: string, init?: RequestInit) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${duongDan}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`Drive trả lỗi ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Tìm thư mục theo tên trong `cha`, chưa có thì tạo.
 *
 * `files.list` với quyền drive.file chỉ thấy tệp do chính web tạo, nên không
 * sợ trùng tên với thư mục nào khác của anh trên ổ đó.
 */
async function timHoacTao(token: string, ten: string, cha: string): Promise<string> {
  const khoaNho = `${cha}/${ten}`;
  const daNho = nhoThuMuc.get(khoaNho);
  if (daNho) return daNho;

  const q = [
    `name = '${ten.replace(/'/g, "\\'")}'`,
    `mimeType = '${LOAI_THU_MUC}'`,
    `'${cha}' in parents`,
    "trashed = false",
  ].join(" and ");

  const tim = (await goiDrive(
    token,
    `files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
  )) as { files?: { id: string }[] };

  let id = tim.files?.[0]?.id;
  if (!id) {
    const tao = (await goiDrive(token, "files?fields=id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: ten, mimeType: LOAI_THU_MUC, parents: [cha] }),
    })) as { id: string };
    id = tao.id;
  }

  nhoThuMuc.set(khoaNho, id);
  return id;
}

/** Mã thư mục của một ngăn, tạo sẵn cả thư mục gốc nếu chưa có. */
async function thuMucNgan(token: string, ngan: NganKho): Promise<string> {
  const goc = await timHoacTao(token, THU_MUC_GOC, "root");
  return timHoacTao(token, TEN_NGAN[ngan], goc);
}

/**
 * Ghi một tệp lên kho, trả về mã tệp trên Drive.
 *
 * Mã đó là thứ DUY NHẤT cần lưu vào database — đừng lưu đường dẫn, vì đường
 * dẫn đổi khi ai đó kéo thư mục đi chỗ khác, còn mã thì không bao giờ đổi.
 */
export async function ghiLenKho(
  ngan: NganKho,
  ten: string,
  kieu: string,
  duLieu: Uint8Array,
): Promise<string> {
  const token = await phieuKho();
  const cha = await thuMucNgan(token, ngan);

  /*
    Gửi kiểu "multipart": một phần là thông tin tệp dạng JSON, một phần là nội
    dung. Google đòi đúng thứ tự này và đòi ranh giới không trùng với dữ liệu —
    chuỗi dưới có phần ngẫu nhiên nên không thể trùng.
  */
  const ranh = `hamita${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const dau = Buffer.from(
    `--${ranh}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify({ name: ten, parents: [cha] })}\r\n` +
      `--${ranh}\r\nContent-Type: ${kieu}\r\n\r\n`,
    "utf8",
  );
  const duoi = Buffer.from(`\r\n--${ranh}--\r\n`, "utf8");
  const than = Buffer.concat([dau, Buffer.from(duLieu), duoi]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${ranh}`,
      },
      body: new Uint8Array(than),
    },
  );
  if (!res.ok) {
    throw new Error(`Không ghi được lên kho: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return ((await res.json()) as { id: string }).id;
}

/**
 * Đọc lại một tệp đã ghi. Dùng để phục vụ ảnh cho trang quản lý — ảnh chấm
 * công và chứng từ KHÔNG được để công khai, nên phải đi qua máy chủ chứ không
 * trỏ thẳng link Drive cho trình duyệt.
 */
export async function docTuKho(
  fileId: string,
): Promise<{ duLieu: ArrayBuffer; kieu: string } | null> {
  const token = await phieuKho();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  return {
    duLieu: await res.arrayBuffer(),
    kieu: res.headers.get("content-type") ?? "application/octet-stream",
  };
}

/** Xoá hẳn một tệp trên kho. Chỉ dùng khi người dùng xoá đúng dòng chứa nó. */
export async function xoaTrenKho(fileId: string): Promise<void> {
  const token = await phieuKho();
  await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
