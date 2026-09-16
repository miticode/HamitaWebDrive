import ExcelJS from "exceljs";
import { getUserAccessToken } from "@/lib/googleAuth";

/**
 * Đọc file Google Sheet của app AppSheet cũ — chỉ dùng trong các script chuyển
 * dữ liệu (scripts/nhap-*.mts), không bao giờ trong trang web.
 *
 * File đứng tên NGƯỜI BÁN app (admin@appquanlystudio.net); tài khoản studio chỉ
 * có quyền đọc. Mất quyền thì đổi FILE_APPSHEET sang bản sao anh đã tạo trong
 * Drive của Hamita ("AppSheet Hamita – sao lưu 15-09-2026").
 *
 * Tải về nằm trong bộ nhớ lúc chạy, không ghi xuống đĩa — file có số điện thoại
 * khách và bảng lương.
 */
export const FILE_APPSHEET = "1Z0TqSN4GDKWGK1EWXcx_vnngm_DrWfdb6uz2kDN7rKk";

/** Giá trị thật của một ô: bóc công thức, liên kết, chữ nhiều định dạng. */
export function giaTri(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("result" in o) return giaTri(o.result);
    if ("text" in o) return o.text;
    if ("richText" in o) return (o.richText as { text: string }[]).map((t) => t.text).join("");
    return null;
  }
  return v;
}

/** Ô dạng chữ, đã bỏ khoảng trắng hai đầu. Rỗng thì null. */
export function chu(v: unknown): string | null {
  const s = String(giaTri(v) ?? "").trim();
  return s || null;
}

/**
 * Lần cuối file AppSheet được sửa, hỏi Drive bằng một lượt gọi nhẹ (chỉ lấy
 * đúng trường modifiedTime, không tải nội dung).
 *
 * Nhờ nó mà lịch chạy mỗi giờ gần như không tốn gì: ngày thường tiệm chỉ sửa
 * AppSheet vài lần, những lượt còn lại thấy file không đổi là bỏ qua luôn,
 * khỏi tải cả tệp 30.000 dòng về chỉ để so ra "không có gì mới".
 *
 * Hỏi không được thì trả null — lúc đó cứ đồng bộ như thường, thà làm thừa còn
 * hơn bỏ sót hợp đồng mới.
 */
export async function lucSuaFileAppSheet(): Promise<Date | null> {
  const token = await getUserAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${FILE_APPSHEET}?fields=modifiedTime`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { modifiedTime?: string };
    const d = j.modifiedTime ? new Date(j.modifiedTime) : null;
    return d && !isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Tải file một lần, trả về hàm đọc từng trang tính thành danh sách dòng
 * { tên cột: giá trị }. Dòng trống bị bỏ.
 */
export async function docAppSheet(): Promise<(tenBang: string) => Record<string, unknown>[]> {
  const token = await getUserAccessToken();
  if (!token) throw new Error("Chưa kết nối Google Drive của studio.");

  const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${FILE_APPSHEET}/export?mimeType=${encodeURIComponent(mime)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Không tải được file AppSheet: HTTP ${res.status}`);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await res.arrayBuffer()) as never);

  return (tenBang) => {
    const ws = wb.getWorksheet(tenBang);
    if (!ws) throw new Error(`File AppSheet không có trang tính "${tenBang}".`);
    const cot: [string, number][] = [];
    ws.getRow(1).eachCell((c, i) => {
      const t = String(giaTri(c.value) ?? "").trim();
      if (t && !cot.some(([da]) => da === t)) cot.push([t, i]);
    });
    const ds: Record<string, unknown>[] = [];
    for (let i = 2; i <= ws.rowCount; i++) {
      const row = ws.getRow(i);
      const dong: Record<string, unknown> = {};
      let co = false;
      for (const [ten, j] of cot) {
        const v = giaTri(row.getCell(j).value);
        dong[ten] = v;
        if (v !== null && String(v).trim() !== "") co = true;
      }
      if (co) ds.push(dong);
    }
    return ds;
  };
}
