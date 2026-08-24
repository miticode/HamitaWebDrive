import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { isAdmin } from "@/lib/auth";
import { getGalleryBySlug, getLists, getSelections } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Xuat file Excel that (.xlsx) danh sach anh khach da chon — de doi chieu khi
 * giao cho ben in anh. Gom ca danh sach nao (Anh in / Anh chon), thu muc, ten
 * anh, ghi chu rieng cua khach (vi du "in cỡ 40x60") va gio chon.
 *
 * Dung exceljs de dung dinh dang .xlsx that, mo duoc bang Excel/Google Sheets
 * — khac voi nut "Chep danh sach ten file" cu chi la van ban thuan.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  const [lists, selections] = await Promise.all([
    getLists(gallery.id),
    getSelections(gallery.id),
  ]);
  const tenDanhSach = new Map(lists.map((l) => [l.id, l.name]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Hamita Studio";
  wb.created = new Date();

  const sheet = wb.addWorksheet("Ảnh đã chọn", {
    views: [{ state: "frozen", ySplit: 1 }], // Khoa dong tieu de khi cuon.
  });

  sheet.columns = [
    { header: "STT", key: "stt", width: 6 },
    { header: "Danh sách", key: "danhSach", width: 14 },
    { header: "Thư mục", key: "thuMuc", width: 28 },
    { header: "Tên ảnh", key: "tenAnh", width: 26 },
    { header: "Ghi chú", key: "ghiChu", width: 26 },
    { header: "Thời gian chọn", key: "gioChon", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };

  const sapXep = [...selections].sort((a, b) => {
    const ds = (tenDanhSach.get(a.listId) ?? "").localeCompare(
      tenDanhSach.get(b.listId) ?? "",
      "vi"
    );
    if (ds !== 0) return ds;
    const tm = a.albumName.localeCompare(b.albumName, "vi");
    if (tm !== 0) return tm;
    return a.fileName.localeCompare(b.fileName, "vi");
  });

  sapXep.forEach((s, i) => {
    sheet.addRow({
      stt: i + 1,
      danhSach: tenDanhSach.get(s.listId) ?? "?",
      thuMuc: s.albumName || "(thư mục gốc)",
      tenAnh: s.fileName,
      ghiChu: s.note ?? "",
      gioChon: new Date(s.createdAt).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  const tenFile = `${gallery.slug}-anh-da-chon.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(tenFile)}`,
    },
  });
}
