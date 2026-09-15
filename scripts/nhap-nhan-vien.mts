/**
 * Nhập danh sách nhân viên từ file Google Sheet của AppSheet cũ vào bảng NhanVien.
 *
 *   npx tsx scripts/nhap-nhan-vien.mts            # chỉ thêm người chưa có
 *   npx tsx scripts/nhap-nhan-vien.mts --cap-nhat # thêm, và cập nhật thông tin người đã có
 *
 * Đọc file qua kết nối Google Drive của web (tài khoản studio, chỉ có quyền đọc).
 * File tải về nằm trong bộ nhớ lúc chạy, KHÔNG ghi xuống đĩa.
 *
 * KHÔNG NHẬP những cột sau, cố ý:
 * - Password: bên AppSheet mật khẩu nằm trần, 25/26 cái là số điện thoại, và
 *   người bán app đọc được. Nhân viên được cấp mật khẩu mới trên web.
 * - Lương cứng, STK: chờ đợt 4 (lương), khi đã có phân quyền xem lương.
 * - Quyền xem/thêm/sửa/xoá: cách phân quyền của AppSheet, web có cách riêng.
 * - Hình ảnh: đường dẫn tới thư mục ảnh trong Drive của người bán.
 *
 * Chỉ in SỐ ĐẾM, không in tên hay số điện thoại của ai.
 *
 * Chạy lại bao nhiêu lần cũng được: khoá ghép là "Mã NV". Không bao giờ ghi đè
 * tên đăng nhập, vai trò hay mật khẩu của người đã có — quản lý có thể đã sửa
 * những thứ đó trên web.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
import ExcelJS from "exceljs";

const { getUserAccessToken } = await import("../src/lib/googleAuth");
const { getPrisma } = await import("../src/lib/db");
const { chuanSoDienThoai } = await import("../src/lib/nhanVienChung");
const { ghiNhatKy } = await import("../src/lib/nhatKy");

const FILE_APPSHEET = "1Z0TqSN4GDKWGK1EWXcx_vnngm_DrWfdb6uz2kDN7rKk";
const capNhat = process.argv.includes("--cap-nhat");

/*
  Mã NV KHÔNG BAO GIỜ nhập, kèm lý do.

  NV001 là NGƯỜI BÁN app AppSheet (bảng ghi Admin, chức vụ "APP"), không phải
  nhân viên — studio xoá khỏi web 16/09/2026. Không chặn ở đây thì chạy lại
  script này là người bán quay lại, mà còn mang quyền QUẢN LÝ (vì "Admin" bên
  AppSheet được đổi thành quản lý khi tạo mới).
*/
const KHONG_NHAP = new Map([["NV001", "người bán app AppSheet, không phải nhân viên (xoá 16/09/2026)"]]);

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

function giaTri(v: unknown): unknown {
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
const chu = (v: unknown) => {
  const s = String(giaTri(v) ?? "").trim();
  return s || null;
};

const ws = wb.getWorksheet("Nhân viên");
if (!ws) throw new Error("File không có trang tính 'Nhân viên'.");
const cot = new Map<string, number>();
ws.getRow(1).eachCell((c, i) => {
  const t = String(giaTri(c.value) ?? "").trim();
  if (t && !cot.has(t)) cot.set(t, i);
});
const o = (row: ExcelJS.Row, ten: string) => {
  const i = cot.get(ten);
  return i ? row.getCell(i).value : null;
};

type Dong = {
  maNV: string;
  ten: string;
  soDienThoai: string | null;
  email: string | null;
  gioiTinh: string | null;
  loaiNV: string | null;
  phongBan: string | null;
  chucVu: string | null;
  vaiTro: string;
  dangLam: boolean;
  ngayVaoLam: Date | null;
};

const dsDong: Dong[] = [];
for (let i = 2; i <= ws.rowCount; i++) {
  const row = ws.getRow(i);
  const maNV = chu(o(row, "Mã NV"));
  const ten = chu(o(row, "Tên nhân viên"));
  if (!maNV || !ten) continue;
  const ngay = giaTri(o(row, "Ngày vào làm"));
  dsDong.push({
    maNV,
    ten,
    soDienThoai: chuanSoDienThoai(chu(o(row, "Số điện thoại"))) || null,
    email: chu(o(row, "Email"))?.toLowerCase() ?? null,
    gioiTinh: chu(o(row, "Giới tính")),
    loaiNV: chu(o(row, "Loại NV")),
    phongBan: chu(o(row, "Phòng Ban")),
    chucVu: chu(o(row, "Chức vụ")),
    /*
      "Admin" bên AppSheet → quản lý; phòng Tư Vấn → sale (AppSheet không ghi
      vai trò sale riêng). Chỉ áp khi TẠO MỚI; người đã có thì giữ vai trò đã
      đặt trên web.
    */
    vaiTro:
      chu(o(row, "Phân quyền")) === "Admin"
        ? "quan-tri"
        : chu(o(row, "Phòng Ban")) === "Tư Vấn"
          ? "sale"
          : "nhan-vien",
    dangLam: chu(o(row, "Trạng thái")) !== "Đã nghỉ",
    ngayVaoLam: ngay instanceof Date ? ngay : null,
  });
}

/*
  Tên đăng nhập = số điện thoại. Hai người trùng số (hay gặp khi một người
  từng làm hai vị trí) hoặc không có số thì dùng mã nhân viên, viết thường.
*/
const prisma = getPrisma();
const daCo = await prisma.nhanVien.findMany({ select: { maNV: true, tenDangNhap: true } });
const tenDaDung = new Set(daCo.map((n) => n.tenDangNhap));
const maDaCo = new Set(daCo.map((n) => n.maNV));
const demSo = new Map<string, number>();
for (const d of dsDong) if (d.soDienThoai) demSo.set(d.soDienThoai, (demSo.get(d.soDienThoai) ?? 0) + 1);

let them = 0;
let capNhatDuoc = 0;
let boQua = 0;
let dungMaLamTen = 0;
let boQuaCoY = 0;

for (const d of dsDong) {
  const { maNV, ...thongTin } = d;

  if (KHONG_NHAP.has(maNV)) {
    boQuaCoY++;
    continue;
  }

  if (maDaCo.has(maNV)) {
    if (!capNhat) {
      boQua++;
      continue;
    }
    const { vaiTro: _boQuaVaiTro, ...khongVaiTro } = thongTin;
    void _boQuaVaiTro;
    await prisma.nhanVien.update({ where: { maNV }, data: khongVaiTro });
    capNhatDuoc++;
    continue;
  }

  let tenDangNhap = d.soDienThoai && demSo.get(d.soDienThoai) === 1 ? d.soDienThoai : "";
  if (!tenDangNhap || tenDaDung.has(tenDangNhap)) {
    tenDangNhap = maNV.toLowerCase().replace(/[^a-z0-9._-]/g, "");
    dungMaLamTen++;
  }
  tenDaDung.add(tenDangNhap);

  await prisma.nhanVien.create({ data: { maNV, tenDangNhap, ...thongTin } });
  them++;
}

const so = { "đọc được": dsDong.length, "thêm mới": them, "cập nhật": capNhatDuoc, "bỏ qua (đã có)": boQua };
await ghiNhatKy({
  nguoi: { id: null, ten: "Script nhập dữ liệu" },
  hanhDong: "nhap-du-lieu",
  doiTuong: "NhanVien",
  chiTiet: { so },
});

console.log("Nhân viên đọc từ AppSheet:", dsDong.length);
console.log("  thêm mới:", them, `(trong đó ${dungMaLamTen} người dùng mã NV làm tên đăng nhập vì trùng hoặc thiếu số điện thoại)`);
console.log("  cập nhật:", capNhatDuoc);
console.log("  bỏ qua vì đã có:", boQua);
console.log("  cố ý không nhập:", boQuaCoY, `(${[...KHONG_NHAP.values()].join("; ")})`);
const tong = await prisma.nhanVien.groupBy({ by: ["dangLam", "vaiTro"], _count: true });
console.log("Bảng NhanVien hiện có:", JSON.stringify(tong.map((t) => ({ dangLam: t.dangLam, vaiTro: t.vaiTro, so: t._count }))));
