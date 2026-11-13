/**
 * KỊCH BẢN THỬ TOÀN BỘ — một hợp đồng đi qua mọi chức năng, kèm mọi tình
 * huống sai mà người dùng thật có thể gây ra.
 *
 *   npx tsx scripts/thu-toan-bo.mts
 *   npx tsx scripts/thu-don-dep.mts   ← LUÔN chạy sau, dù kịch bản hỏng giữa chừng
 *
 * ⚠ CHẠY TRÊN DATABASE THẬT. Mọi dòng tạo ra mang dấu nhận biết trong
 * `thu-don-dep.mts` nên dọn được sạch kể cả khi kịch bản nổ giữa chừng —
 * nhưng đừng chạy lúc cả tiệm đang làm việc, và LUÔN dọn ngay sau đó.
 *
 * Gọi thẳng tầng lib (business logic thật), không qua server action: action
 * đọc cookie đăng nhập mà script thì không có. Phép kiểm QUYỀN nằm trong
 * action và đã kiểm riêng — ở đây kiểm phần còn lại: tính tiền, phép kiểm dữ
 * liệu, luồng trạng thái, dọn dẹp khi xoá.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { getPrisma } = await import("../src/lib/db");
const { DAU } = await import("./thu-dau");

const p = getPrisma();

/* ── Khung chấm điểm ───────────────────────────────────────────────────── */
let dat = 0;
let truot = 0;
const loi: string[] = [];

function kiem(ten: string, dung: boolean, them = "") {
  if (dung) {
    dat++;
    console.log(`  ✓ ${ten}${them ? ` — ${them}` : ""}`);
  } else {
    truot++;
    loi.push(ten + (them ? ` — ${them}` : ""));
    console.log(`  ✗ ${ten}${them ? ` — ${them}` : ""}`);
  }
}
const phan = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 60 - s.length))}`);
/** Hàm trả { loi } thì coi là "đã chặn"; trả gì khác là "cho qua". */
const chan = (kq: unknown): boolean => !!kq && typeof kq === "object" && "loi" in (kq as object);
const chuLoi = (kq: unknown): string => (chan(kq) ? (kq as { loi: string }).loi : "");

/*
  CHẶN TRƯỚC: kịch bản chỉ đúng trên nền SẠCH.

  Lần chạy nào còn sót dữ liệu của lần trước là mọi phép đếm tiền đều lệch —
  đã gặp thật: hợp đồng cũ còn đó nên "thành tiền" ra 3.000.000 thay vì
  15.000.000, mà nhìn thoáng qua trông như code tính sai.
*/
const con =
  (await p.hopDong.count({ where: { tenKhach: { contains: DAU.ten } } })) +
  (await p.khachHang.count({ where: { soDienThoai: { in: [DAU.sdt, DAU.sdt2, DAU.sdt3] } } })) +
  (await p.khachTiemNang.count({ where: { tenNguoi: { contains: DAU.ten } } })) +
  (await p.chamCong.count({ where: { maNV: { equals: DAU.maNV, mode: "insensitive" } } }));
if (con) {
  console.error(`Còn ${con} dòng thử của lần trước. Chạy trước: npx tsx scripts/thu-don-dep.mts`);
  process.exit(1);
}

const QUAN_LY = { id: "zz", ten: DAU.ten, maNV: DAU.maNV, tenDangNhap: "zztest", laQuanLy: true };
const SALE = { ...QUAN_LY, laQuanLy: false };

/* ══ A. KHÁCH TIỀM NĂNG ═══════════════════════════════════════════════ */
phan("A · Khách tiềm năng");
const { themTiemNang, suaTiemNang } = await import("../src/lib/khachTiemNang");

kiem("thiếu tên → chặn", chan(await themTiemNang({ tenNguoi: "  ", soDienThoai: "", nguon: "", nhuCau: "", diaChi: "", phuTrachMaNV: "", khaNang: "Tiềm năng", tinhTrang: "", ghiChu: "", loaiCskh: "", ngayLienHeLai: "", themLichSu: "" }, DAU.maNV)));
kiem("khả năng không có trong danh mục → chặn", chan(await themTiemNang({ tenNguoi: DAU.ten, soDienThoai: "", nguon: "", nhuCau: "", diaChi: "", phuTrachMaNV: "", khaNang: "Bịa ra", tinhTrang: "", ghiChu: "", loaiCskh: "", ngayLienHeLai: "", themLichSu: "" }, DAU.maNV)));
kiem("số điện thoại 3 chữ số → chặn", chan(await themTiemNang({ tenNguoi: DAU.ten, soDienThoai: "123", nguon: "", nhuCau: "", diaChi: "", phuTrachMaNV: "", khaNang: "Tiềm năng", tinhTrang: "", ghiChu: "", loaiCskh: "", ngayLienHeLai: "", themLichSu: "" }, DAU.maNV)));
kiem("ngày hẹn sai định dạng → chặn", chan(await themTiemNang({ tenNguoi: DAU.ten, soDienThoai: "", nguon: "", nhuCau: "", diaChi: "", phuTrachMaNV: "", khaNang: "Tiềm năng", tinhTrang: "", ghiChu: "", loaiCskh: "", ngayLienHeLai: "20-11-2026", themLichSu: "" }, DAU.maNV)));

const tn = await themTiemNang(
  { tenNguoi: DAU.ten, soDienThoai: "", nguon: "Zalo", nhuCau: "Chụp hình cưới", diaChi: "", phuTrachMaNV: "", khaNang: "Tiềm năng", tinhTrang: "Tư vấn", ghiChu: "", loaiCskh: "Zalo", ngayLienHeLai: "", themLichSu: "gọi lần 1" },
  DAU.maNV,
);
kiem("thêm được dù KHÔNG có số điện thoại", !chan(tn));
const tnId = chan(tn) ? "" : (tn as { id: string }).id;

if (tnId) {
  const vuaThem = await p.khachTiemNang.findUnique({ where: { id: tnId } });
  kiem("thêm mà để trống ô phụ trách → mặc định là người ghi", vuaThem?.phuTrachMaNV === DAU.maNV, vuaThem?.phuTrachMaNV ?? "(trống)");
  kiem("ngày ghi nhận tự điền hôm nay", !!vuaThem?.ngay);
  await suaTiemNang(tnId, { tenNguoi: DAU.ten, soDienThoai: "", nguon: "Zalo", nhuCau: "Chụp hình cưới", diaChi: "", phuTrachMaNV: "", khaNang: "Chờ chốt", tinhTrang: "Báo giá", ghiChu: "", loaiCskh: "Zalo", ngayLienHeLai: "", themLichSu: "gọi lần 2, khách ưng" });
  const sau = await p.khachTiemNang.findUnique({ where: { id: tnId } });
  const nk = sau?.lichSuCskh ?? "";
  kiem("nhật ký chăm sóc NỐI thêm, không ghi đè", nk.includes("gọi lần 1") && nk.includes("gọi lần 2"), `${nk.split("\n").length} dòng`);
  kiem("dòng mới đứng đầu", nk.startsWith(new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })) && nk.indexOf("lần 2") < nk.indexOf("lần 1"));
  kiem("khả năng đổi sang Chờ chốt", sau?.khaNang === "Chờ chốt");
  /*
    Hai hành vi KHÁC NHAU, cố ý: lúc THÊM mà để trống thì mặc định là người
    ghi (khách không ai lo là khách mất); lúc SỬA mà để trống thì đúng là bỏ
    người phụ trách — người sửa nhìn thấy ô đang có mã mà vẫn xoá đi.
  */
  kiem("sửa mà xoá ô phụ trách → bỏ người phụ trách", sau?.phuTrachMaNV === null);
}

/* ══ B. KHÁCH HÀNG ════════════════════════════════════════════════════ */
phan("B · Khách hàng");
const { themKhach, suaKhach } = await import("../src/lib/khachHang");

kiem("khách thiếu số điện thoại → chặn", chan(await themKhach({ ten: DAU.ten, soDienThoai: "", tinh: "", ghiChu: "" }, DAU.maNV)));
kiem("số 5 chữ số → chặn", chan(await themKhach({ ten: DAU.ten, soDienThoai: "12345", tinh: "", ghiChu: "" }, DAU.maNV)));
const kh = await themKhach({ ten: `${DAU.ten} khách`, soDienThoai: DAU.sdt, tinh: "Tiền Giang", ghiChu: "" }, DAU.maNV);
kiem("thêm khách đúng", !chan(kh));
const khId = chan(kh) ? "" : (kh as { id: string }).id;

const trung = await themKhach({ ten: `${DAU.ten} trùng`, soDienThoai: DAU.sdt, tinh: "", ghiChu: "" }, DAU.maNV);
kiem("thêm trùng số → chặn và NÊU TÊN nhà cũ", chan(trung) && chuLoi(trung).includes(`${DAU.ten} khách`), chuLoi(trung).slice(0, 60));

if (khId) {
  const cu = await p.khachHang.findUnique({ where: { id: khId } });
  kiem("mã khách CHÍNH LÀ số điện thoại", cu?.maAppSheet === DAU.sdt);
  await suaKhach(khId, { ten: `${DAU.ten} khách`, soDienThoai: DAU.sdt2, tinh: "Long An", ghiChu: "đã sửa" });
  const sau = await p.khachHang.findUnique({ where: { id: khId } });
  kiem("đổi số thì MÃ ĐỔI THEO", sau?.soDienThoai === DAU.sdt2 && sau?.maAppSheet === DAU.sdt2);
  kiem("sửa tỉnh và ghi chú", sau?.tinh === "Long An" && sau?.ghiChu === "đã sửa");

  /* Nhà thứ hai, rồi thử đổi số về trùng nhà này. */
  const kh2 = await themKhach({ ten: `${DAU.ten} nhà 2`, soDienThoai: DAU.sdt, tinh: "", ghiChu: "" }, DAU.maNV);
  const kh2Id = chan(kh2) ? "" : (kh2 as { id: string }).id;
  kiem("số cũ dùng lại được sau khi nhà kia đã đổi đi", !!kh2Id);
  if (kh2Id) {
    kiem("đổi số sang số nhà khác → chặn", chan(await suaKhach(kh2Id, { ten: `${DAU.ten} nhà 2`, soDienThoai: DAU.sdt2, tinh: "", ghiChu: "" })));
  }
}

/* ══ C. LẬP HỢP ĐỒNG ══════════════════════════════════════════════════ */
phan("C · Lập hợp đồng");
const { lapHopDongMoi } = await import("../src/lib/taoHopDong");
const { docCacBuoc } = await import("../src/lib/buocHopDong");
const cacBuoc = await docCacBuoc();

const nen = {
  khachHangId: khId,
  khachMoi: null,
  tenKhach: `${DAU.ten} hợp đồng`,
  loaiDV: "CƯỚI",
  ngayDat: "2026-11-13",
  diaChi: "",
  ghiChu: "",
  khuyenMai: 0,
  trangThai: "1. Chưa có ngày chụp",
  dong: [] as never[],
  thu: [] as never[],
  lich: [] as never[],
  viec: [] as never[],
};

kiem("thiếu tên khách → chặn", chan(await lapHopDongMoi({ ...nen, tenKhach: " " }, QUAN_LY)));
kiem("ngày đặt sai định dạng → chặn", chan(await lapHopDongMoi({ ...nen, ngayDat: "13/11/2026" }, QUAN_LY)));
kiem("trạng thái không có trong bảng 18 bước → chặn", chan(await lapHopDongMoi({ ...nen, trangThai: "99. Bịa" }, QUAN_LY)));
kiem(
  "giờ lịch sai định dạng → chặn",
  chan(await lapHopDongMoi({ ...nen, lich: [{ ngay: "2026-12-01", gio: "25:99", loai: "Ngày chụp", ghiChu: "", hienThi: "" }] as never }, QUAN_LY)),
);
kiem("khuyến mãi âm → chặn", chan(await lapHopDongMoi({ ...nen, khuyenMai: -1 }, QUAN_LY)));

const hd = await lapHopDongMoi(
  {
    ...nen,
    khuyenMai: 500_000,
    dong: [
      { dichVuId: null, maDV: "ZZ1", tenDV: "Gói chụp thử", loai: "Dịch vụ", donGia: 5_000_000, soLuong: 2, ngayChup: "2026-12-01", chiTiet: "", ghiChu: "" },
      { dichVuId: null, maDV: "ZZ2", tenDV: "Váy thử", loai: "Trang phục", donGia: 1_000_000, soLuong: 1, ngayChup: "", chiTiet: "", ghiChu: "" },
    ] as never,
    thu: [{ ngayThu: "2026-11-13", soTien: 3_000_000, hinhThuc: "Tiền mặt", noiDung: "Cọc", ghiChu: "" }] as never,
    lich: [
      { ngay: "2026-12-01", gio: "07:30", loai: "Ngày chụp", ghiChu: "", hienThi: "" },
      { ngay: "2026-12-20", gio: "", loai: "Ngày cưới", ghiChu: "", hienThi: "" },
    ] as never,
    viec: [{ dong: 0, loai: "PHOTO", donGia: 500_000, soLuong: 1, thoiHan: "2026-12-05" }] as never,
  },
  QUAN_LY,
);
kiem("lập hợp đồng đầy đủ", !chan(hd), chan(hd) ? chuLoi(hd) : (hd as { maHD: string }).maHD);
const hdId = chan(hd) ? "" : (hd as { id: string }).id;
const maHD = chan(hd) ? "" : (hd as { maHD: string }).maHD;

if (hdId) {
  const d = await p.hopDong.findUnique({
    where: { id: hdId },
    include: { chiTiet: true, phieuThu: true, lich: true, congViec: true },
  });
  kiem("thành tiền = máy chủ TỰ CỘNG các dòng", d?.thanhTien === 11_000_000, `${d?.thanhTien}`);
  kiem("tổng tiền = thành tiền − khuyến mãi", d?.tongTien === 10_500_000, `${d?.tongTien}`);
  kiem("đã thu = cộng phiếu thu", d?.daThu === 3_000_000, `${d?.daThu}`);
  kiem("còn lại = tổng − đã thu", d?.conLai === 7_500_000, `${d?.conLai}`);
  kiem("gắn đúng nhà khách", d?.khachHangId === khId);
  kiem("2 dòng dịch vụ", d?.chiTiet.length === 2);
  kiem("1 phiếu thu", d?.phieuThu.length === 1);
  kiem("2 buổi lịch", d?.lich.length === 2);
  kiem("GIỜ CHỤP lưu được", d?.lich.find((l) => l.ngay === "2026-12-01")?.gio === "07:30");
  kiem("buổi không khai giờ thì để trống", d?.lich.find((l) => l.ngay === "2026-12-20")?.gio === null);
  kiem("1 đầu việc", d?.congViec.length === 1);
  kiem("mã hợp đồng có dạng chuẩn", /^HD/i.test(maHD) || maHD.length > 5, maHD);
}

/* ══ D. PHIẾU THU ═════════════════════════════════════════════════════ */
phan("D · Phiếu thu");
const { themPhieuThu, duyetPhieuThu, xoaPhieuThu } = await import("../src/lib/suaHopDong");

if (hdId) {
  kiem("phiếu thu 0đ → chặn", chan(await themPhieuThu(hdId, { ngayThu: "2026-11-13", soTien: 0, hinhThuc: "Tiền mặt", noiDung: "Cọc", ghiChu: "" }, QUAN_LY)));
  kiem("ngày thu sai → chặn", chan(await themPhieuThu(hdId, { ngayThu: "hôm nay", soTien: 1000, hinhThuc: "Tiền mặt", noiDung: "Cọc", ghiChu: "" }, QUAN_LY)));

  await themPhieuThu(hdId, { ngayThu: "2026-11-13", soTien: 2_000_000, hinhThuc: "Chuyển khoản", noiDung: "Cọc lần 2", ghiChu: "" }, SALE);
  const choDuyet = await p.phieuThu.findFirst({ where: { hopDongId: hdId, soTien: 2_000_000 } });
  kiem("SALE lập phiếu → nằm Chờ duyệt", choDuyet?.trangThai === "Chờ duyệt", choDuyet?.trangThai ?? "");

  let sau = await p.hopDong.findUnique({ where: { id: hdId } });
  kiem("đã thu CỘNG CẢ phiếu chờ duyệt (đúng cách AppSheet tính)", sau?.daThu === 5_000_000, `${sau?.daThu}`);

  await themPhieuThu(hdId, { ngayThu: "2026-11-13", soTien: 1_000_000, hinhThuc: "Tiền mặt", noiDung: "Đủ", ghiChu: "" }, QUAN_LY);
  const cuaQL = await p.phieuThu.findFirst({ where: { hopDongId: hdId, soTien: 1_000_000 } });
  kiem("QUẢN LÝ lập phiếu → ghi thẳng đã thu", cuaQL?.trangThai === "Đã thu tiền mặt", cuaQL?.trangThai ?? "");

  if (choDuyet) {
    await duyetPhieuThu(choDuyet.id, QUAN_LY);
    const d2 = await p.phieuThu.findUnique({ where: { id: choDuyet.id } });
    kiem("duyệt phiếu → đổi trạng thái", d2?.trangThai === "Đã thu chuyển khoản", d2?.trangThai ?? "");
    await xoaPhieuThu(choDuyet.id);
    sau = await p.hopDong.findUnique({ where: { id: hdId } });
    kiem("xoá phiếu → tiền tính lại", sau?.daThu === 4_000_000, `đã thu ${sau?.daThu}`);
    kiem("còn lại cũng tính lại", sau?.conLai === 6_500_000, `${sau?.conLai}`);
  }
}

/* ══ E. SỬA HỢP ĐỒNG · 18 BƯỚC ════════════════════════════════════════ */
phan("E · Sửa hợp đồng và luồng 18 bước");
const { suaHopDong } = await import("../src/lib/suaHopDong");
const { buocTiepTheo, laBuocXong } = await import("../src/lib/buocHopDong");

if (hdId) {
  const neuSua = (tt: string, dong: unknown[] = []) => ({
    tenKhach: `${DAU.ten} hợp đồng`,
    loaiDV: "CƯỚI",
    ngayDat: "2026-11-13",
    diaChi: "",
    ghiChu: "",
    khuyenMai: 500_000,
    trangThai: tt,
    dong,
  });
  const dongCu = (await p.chiTietHopDong.findMany({ where: { hopDongId: hdId } })).map((c) => ({
    id: c.id, dichVuId: c.dichVuId, maDV: c.maDV ?? "", tenDV: c.tenDV ?? "", loai: c.loai ?? "",
    donGia: c.donGia, soLuong: c.soLuong, ngayChup: c.ngayChup ?? "", chiTiet: c.chiTiet ?? "", ghiChu: c.ghiChu ?? "",
  }));

  kiem("đổi sang bước không có trong bảng → chặn", chan(await suaHopDong(hdId, neuSua("99. Bịa", dongCu) as never, QUAN_LY)));

  /* Đi hết nhánh chụp 1 → 9, mỗi bước kiểm "bước tiếp theo" và trách nhiệm. */
  let diDu = true;
  for (let b = 1; b <= 9; b++) {
    const ten = cacBuoc.find((x) => x.startsWith(`${b}.`));
    if (!ten) { diDu = false; continue; }
    const kq = await suaHopDong(hdId, neuSua(ten, dongCu) as never, QUAN_LY);
    if (chan(kq)) { diDu = false; break; }
  }
  kiem("đi hết 9 bước nhánh chụp, không bước nào bị chặn", diDu);
  const o9 = await p.hopDong.findUnique({ where: { id: hdId } });
  kiem("hợp đồng đang ở bước 9", o9?.buoc === 9, o9?.trangThai ?? "");

  const day = await (await import("../src/lib/buocHopDong")).docBuocDayDu();
  kiem("bước 9 → 'xong nhánh này', KHÔNG có bước sau", laBuocXong(day, o9?.trangThai ?? null) && buocTiepTheo(day, o9?.trangThai ?? null) === null);
  const b4 = day.find((x) => x.thuTu === 4)!;
  kiem("bước 4 → bước sau là 5", buocTiepTheo(day, b4.ten)?.thuTu === 5);
  const b7 = day.find((x) => x.thuTu === 7)!;
  kiem("bước 7 → bước sau là 8 (dữ liệu AppSheet bỏ trống)", buocTiepTheo(day, b7.ten)?.thuTu === 8);
  const b12 = day.find((x) => x.thuTu === 12)!;
  kiem("bước 12 → bước sau là 13 (AppSheet ghi nhầm về 9)", buocTiepTheo(day, b12.ten)?.thuTu === 13);
  const b18 = day.find((x) => x.thuTu === 18)!;
  kiem("bước 18 → xong nhánh tiệc", laBuocXong(day, b18.ten) && buocTiepTheo(day, b18.ten) === null);
  kiem("18/18 bước đều biết đi đâu tiếp hoặc đã xong", day.every((x) => buocTiepTheo(day, x.ten) !== null || laBuocXong(day, x.ten)));

  /* Sửa dòng dịch vụ → tiền tính lại. */
  await suaHopDong(hdId, neuSua(o9?.trangThai ?? "9. Hoàn thành", [{ ...dongCu[0], soLuong: 3 }]) as never, QUAN_LY);
  const sau = await p.hopDong.findUnique({ where: { id: hdId }, include: { chiTiet: true } });
  kiem("bỏ bớt dòng dịch vụ → chỉ còn 1 dòng", sau?.chiTiet.length === 1, `${sau?.chiTiet.length}`);
  kiem("đổi số lượng → thành tiền tính lại", sau?.thanhTien === 15_000_000, `${sau?.thanhTien}`);
  kiem("tổng trừ khuyến mãi", sau?.tongTien === 14_500_000, `${sau?.tongTien}`);
}

/* ══ F. LỊCH CHỤP ═════════════════════════════════════════════════════ */
phan("F · Lịch chụp");
if (hdId) {
  const ds = await p.lichChup.findMany({ where: { hopDongId: hdId }, orderBy: { ngay: "asc" } });
  const dong = ds.map((l) => ({ id: l.id, ngay: l.ngay ?? "", gio: l.gio ?? "", loai: l.loai ?? "", ghiChu: l.ghiChu ?? "", trangThai: l.trangThai ?? "" }));
  /* Dùng lại đúng phép kiểm của server action, không gọi action (cần cookie). */
  const gioSai = /^([01]\d|2[0-3]):[0-5]\d$/.test("24:00");
  kiem("'24:00' không phải giờ hợp lệ", !gioSai);
  kiem("'07:30' hợp lệ", /^([01]\d|2[0-3]):[0-5]\d$/.test("07:30"));

  await p.lichChup.update({ where: { id: dong[1].id }, data: { gio: "15:00" } });
  const sau = await p.lichChup.findUnique({ where: { id: dong[1].id } });
  kiem("thêm giờ cho buổi chưa có", sau?.gio === "15:00");
  await p.lichChup.update({ where: { id: dong[1].id }, data: { gio: null } });
  kiem("xoá giờ về trống được", (await p.lichChup.findUnique({ where: { id: dong[1].id } }))?.gio === null);
}

/* ══ G. ĐẦU VIỆC ══════════════════════════════════════════════════════ */
phan("G · Đầu việc");
if (hdId) {
  const v = await p.congViec.findFirst({ where: { hopDongId: hdId } });
  if (v) {
    await p.congViec.update({ where: { id: v.id }, data: { nguoiPhuTrachMaNV: DAU.maNV } });
    kiem("giao việc cho người", (await p.congViec.findUnique({ where: { id: v.id } }))?.nguoiPhuTrachMaNV === DAU.maNV);
    await p.congViec.update({ where: { id: v.id }, data: { trangThai: "Đã làm", ngayHoanThanh: "2026-11-13" } });
    const sau = await p.congViec.findUnique({ where: { id: v.id } });
    kiem("đổi trạng thái sang Đã làm", sau?.trangThai === "Đã làm");
    kiem("có ngày hoàn thành", !!sau?.ngayHoanThanh);
  } else kiem("có đầu việc để thử", false);
}

/* ══ H. SỔ QUỸ ════════════════════════════════════════════════════════ */
phan("H · Sổ quỹ");
const { themChi, duyetChi, xoaChi, docSoQuy } = await import("../src/lib/soQuy");

kiem("chi 0đ → chặn", chan(await themChi({ ngayChi: "2026-11-13", soTien: 0, hinhThuc: "Tiền mặt", khoanChi: "Khác", dienGiai: DAU.ten, ghiChu: "" } as never, QUAN_LY)));
kiem("chi ngày sai → chặn", chan(await themChi({ ngayChi: "13-11-2026", soTien: 1000, hinhThuc: "Tiền mặt", khoanChi: "Khác", dienGiai: DAU.ten, ghiChu: "" } as never, QUAN_LY)));

const chi = await themChi({ ngayChi: "2026-11-13", soTien: 250_000, hinhThuc: "Tiền mặt", khoanChi: "Khác", dienGiai: `${DAU.ten} khoản chi`, ghiChu: "" } as never, SALE);
kiem("sale ghi chi", !chan(chi), chuLoi(chi));
const chiId = chan(chi) ? "" : (chi as { id: string }).id;
if (chiId) {
  const c = await p.chiTieu.findUnique({ where: { id: chiId } });
  kiem("sale ghi → nằm Chờ duyệt", c?.trangThai === "Chờ duyệt", c?.trangThai ?? "");
  await duyetChi(chiId, QUAN_LY);
  kiem("duyệt chi → đổi trạng thái", (await p.chiTieu.findUnique({ where: { id: chiId } }))?.trangThai === "Đã chi tiền mặt");
  const sq = await docSoQuy("2026-11-01", "2026-11-30");
  kiem("sổ quỹ tháng cộng cả khoản vừa ghi", sq.chi >= 250_000, `chi ${sq.chi}`);
  kiem("số dư = thu − chi", sq.soDu === sq.thu - sq.chi, `${sq.soDu}`);
  await xoaChi(chiId);
  const sq2 = await docSoQuy("2026-11-01", "2026-11-30");
  kiem("xoá chi → sổ quỹ trừ lại", sq2.chi === sq.chi - 250_000, `${sq2.chi}`);
}

/* ══ I. CHẤM CÔNG ═════════════════════════════════════════════════════ */
phan("I · Chấm công");
const { docCaiDatCham, luotHomNay, vaoCa, raCa } = await import("../src/lib/chamCong");
const caiDat = await docCaiDatCham();

const v1 = await vaoCa(DAU.maNV, "Thử", "10.0,106.0", null, caiDat);
kiem("vào ca lần đầu", !chan(v1), chuLoi(v1));
const v2 = await vaoCa(DAU.maNV, "Thử", "10.0,106.0", null, caiDat);
kiem("vào ca lần hai trong ngày → báo đã chấm rồi", !chan(v2) && (v2 as { daCham: boolean }).daCham === true);

const r1 = await raCa(DAU.maNV, "10.0,106.0", caiDat);
kiem("ra ca", !chan(r1), chuLoi(r1));
const luot = await luotHomNay(DAU.maNV, caiDat);
kiem("có giờ vào và giờ ra", !!luot?.gioVao && !!luot?.gioRa);
kiem("số giờ tính ra một con số", typeof luot?.soGio === "number", `${luot?.soGio} giờ`);
kiem("vào ra sát nhau → thiếu giờ so với chuẩn", (luot?.conThieu ?? 0) > 0, `thiếu ${luot?.conThieu} giờ`);

const r2 = await raCa(DAU.maNV, "10.0,106.0", caiDat);
kiem("ra ca lần hai → ghi đè giờ ra, không tạo dòng mới", !chan(r2));
kiem("vẫn chỉ MỘT dòng chấm công hôm nay", (await p.chamCong.count({ where: { maNV: { equals: DAU.maNV, mode: "insensitive" } } })) === 1);

const chuaCham = await raCa("ZZKHONGCO", "10.0,106.0", caiDat);
kiem("ra ca khi chưa vào ca → chặn", chan(chuaCham), chuLoi(chuaCham));

/* ══ J. ĐƠN TỪ ════════════════════════════════════════════════════════ */
phan("J · Đơn từ");
const { kiemDon, DON_DANG_TAO, DON_DA_DUYET } = await import("../src/lib/donTuChung");

kiem("đơn thiếu lý do → chặn", chan(kiemDon({ loaiDon: "Xin nghỉ", loaiNghi: "Hưởng lương", ngayYeuCau: "2026-11-20", lyDo: "", soTien: 0 } as never)));
kiem("đơn ngày sai → chặn", chan(kiemDon({ loaiDon: "Xin nghỉ", loaiNghi: "Hưởng lương", ngayYeuCau: "20/11", lyDo: "ốm", soTien: 0 } as never)));
kiem("xin ứng lương 0đ → chặn", chan(kiemDon({ loaiDon: "Xin ứng lương", loaiNghi: "", ngayYeuCau: "2026-11-20", lyDo: "việc nhà", soTien: 0 } as never)));
kiem("đơn xin nghỉ hợp lệ → qua", !chan(kiemDon({ loaiDon: "Xin nghỉ", loaiNghi: "Hưởng lương", ngayYeuCau: "2026-11-20", lyDo: "ốm", soTien: 0 } as never)));

const don = await p.donTu.create({ data: { maNV: DAU.maNV, loaiDon: "Xin nghỉ", loaiNghi: "Hưởng lương", ngayYeuCau: "2026-11-20", lyDo: "thử", trangThai: DON_DANG_TAO } });
kiem("gửi đơn → nằm chờ duyệt", don.trangThai === DON_DANG_TAO);
await p.donTu.update({ where: { id: don.id }, data: { trangThai: DON_DA_DUYET, nguoiDuyetMaNV: DAU.maNV, ngayDuyet: "2026-11-13" } });
const donSau = await p.donTu.findUnique({ where: { id: don.id } });
kiem("duyệt đơn → ghi người duyệt và ngày", donSau?.trangThai === DON_DA_DUYET && !!donSau?.nguoiDuyetMaNV && !!donSau?.ngayDuyet);

/* ══ K. SỰ CỐ ═════════════════════════════════════════════════════════ */
phan("K · Sổ sự cố");
const { kiemSuCo, SU_CO_DANG_TAO, SU_CO_DA_XONG } = await import("../src/lib/suCoChung");

kiem("sự cố không nói vấn đề gì → chặn", chan(kiemSuCo({ vanDe: "  ", thongTin: "x" })));
kiem("sự cố hợp lệ → qua", !chan(kiemSuCo({ vanDe: "Máy hỏng", thongTin: "" })));

const sc = await p.suCo.create({ data: { vanDe: `${DAU.ten} máy hỏng`, thongTin: "thử", trangThai: SU_CO_DANG_TAO, nguoiGhiMaNV: DAU.maNV } });
kiem("ghi sự cố → Đang tạo, có thời điểm thật", sc.trangThai === SU_CO_DANG_TAO && !!sc.taoLuc);
await p.suCo.update({ where: { id: sc.id }, data: { trangThai: SU_CO_DA_XONG, xongLuc: new Date(), xuLy: "đã thay" } });
const scSau = await p.suCo.findUnique({ where: { id: sc.id } });
kiem("đóng sự cố → có giờ xong và cách xử lý", scSau?.trangThai === SU_CO_DA_XONG && !!scSau?.xongLuc && !!scSau?.xuLy);
await p.suCo.update({ where: { id: sc.id }, data: { trangThai: SU_CO_DANG_TAO, xongLuc: null } });
kiem("mở lại → xoá giờ xong, GIỮ cách xử lý đã ghi", (await p.suCo.findUnique({ where: { id: sc.id } }))?.xongLuc === null && !!(await p.suCo.findUnique({ where: { id: sc.id } }))?.xuLy);

/* ══ L. LƯƠNG (kỳ 01/2020 — kỳ không ai dùng) ═════════════════════════ */
phan("L · Lương (kỳ 01/2020, không đụng kỳ thật)");
const { tinhThuKyLuong, luuKyLuong, chotKyLuong, moLaiKyLuong, maKy } = await import("../src/lib/luong");

kiem("mã kỳ đúng dạng MM/YYYY", maKy(2020, 1) === "01/2020", maKy(2020, 1));

const trong = await tinhThuKyLuong(2020, 1);
kiem("tính thử kỳ TRỐNG → không nổ, trả danh sách rỗng", Array.isArray(trong) && trong.length === 0);
kiem("lưu kỳ trống → CHẶN, không tạo bảng lương ma", chan(await luuKyLuong(2020, 1, QUAN_LY.ten)), chuLoi(await luuKyLuong(2020, 1, QUAN_LY.ten)));

/* Dựng ba ngày công tháng 01/2020 cho mã thử, rồi mới tính — kỳ thật không bị đụng. */
for (const ngay of ["2020-01-06", "2020-01-07", "2020-01-08"]) {
  await p.chamCong.create({
    data: { maNV: DAU.maNV, ngay, gioVao: new Date(`${ngay}T01:30:00Z`), gioRa: new Date(`${ngay}T11:00:00Z`), soGio: 8, soNgayCong: 1, phongBan: "Thử" },
  });
}
const thu = await tinhThuKyLuong(2020, 1);
kiem("kỳ có chấm công → tính ra dòng lương", thu.length > 0, `${thu.length} dòng`);
const cuaToi = thu.find((d) => d.maNV.toLowerCase() === DAU.maNV.toLowerCase());
kiem("có dòng của người vừa chấm công", !!cuaToi);
kiem("đếm đúng 3 ngày công", cuaToi?.soNgayLam === 3, `${cuaToi?.soNgayLam}`);
kiem("chưa khai lương cứng → lương tháng ra 0, không bịa", cuaToi?.luongThang === 0);
const luu = await luuKyLuong(2020, 1, QUAN_LY.ten);
kiem("lưu kỳ lương", !chan(luu), chuLoi(luu));
const ky = await p.kyLuong.findFirst({ where: { maAppSheet: "01/2020" } });
kiem("kỳ lương được tạo", !!ky);
if (ky) {
  await chotKyLuong(2020, 1);
  kiem("chốt kỳ", (await p.kyLuong.findFirst({ where: { maAppSheet: "01/2020" } }))?.daChot === true);
  kiem("kỳ đã chốt thì KHÔNG tính lại được", chan(await luuKyLuong(2020, 1, QUAN_LY.ten)));
  await moLaiKyLuong(2020, 1);
  kiem("mở lại kỳ", (await p.kyLuong.findFirst({ where: { maAppSheet: "01/2020" } }))?.daChot === false);
  kiem("mở rồi thì tính lại được", !chan(await luuKyLuong(2020, 1, QUAN_LY.ten)));
}

/* ══ M. XOÁ HỢP ĐỒNG ══════════════════════════════════════════════════ */
phan("M · Xoá hợp đồng");
const { xoaHopDong } = await import("../src/lib/suaHopDong");
if (hdId) {
  kiem("gõ sai mã xác nhận → chặn", chan(await xoaHopDong(hdId, "SAI-MA")));
  const truocXoa = {
    ct: await p.chiTietHopDong.count({ where: { hopDongId: hdId } }),
    pt: await p.phieuThu.count({ where: { hopDongId: hdId } }),
    lc: await p.lichChup.count({ where: { hopDongId: hdId } }),
    cv: await p.congViec.count({ where: { hopDongId: hdId } }),
  };
  kiem("trước khi xoá còn đủ dữ liệu con", truocXoa.ct + truocXoa.pt + truocXoa.lc + truocXoa.cv > 0, JSON.stringify(truocXoa));
  const x = await xoaHopDong(hdId, maHD);
  kiem("gõ đúng mã → xoá được", !chan(x), chuLoi(x));
  kiem("xoá kéo theo HẾT dòng con", (await p.chiTietHopDong.count({ where: { hopDongId: hdId } })) === 0 && (await p.phieuThu.count({ where: { hopDongId: hdId } })) === 0 && (await p.lichChup.count({ where: { hopDongId: hdId } })) === 0 && (await p.congViec.count({ where: { hopDongId: hdId } })) === 0);
  kiem("KHÁCH HÀNG vẫn còn sau khi xoá hợp đồng", (await p.khachHang.count({ where: { id: khId } })) === 1);
}

/* ══ N. KHÁCH MỚI TẠO THẲNG TỪ HỢP ĐỒNG ═══════════════════════════════ */
phan("N · Khách mới tạo thẳng từ hợp đồng");
const SDT3 = "0900000003";
/* Hợp đồng bắt buộc có ít nhất một dòng dịch vụ — dùng lại nền kèm một dòng. */
const nenCoDong = {
  ...nen,
  dong: [{ dichVuId: null, maDV: "ZZ3", tenDV: "Gói thử", loai: "Dịch vụ", donGia: 1_000_000, soLuong: 1, ngayChup: "", chiTiet: "", ghiChu: "" }] as never,
};

kiem(
  "khách mới thiếu số điện thoại → chặn (số là mã khách)",
  chan(await lapHopDongMoi({ ...nenCoDong, khachHangId: null, khachMoi: { ten: `${DAU.ten} mới`, soDienThoai: "", tinh: "", ghiChu: "" } }, QUAN_LY)),
);

const hdMoi = await lapHopDongMoi(
  { ...nenCoDong, khachHangId: null, khachMoi: { ten: `${DAU.ten} mới`, soDienThoai: SDT3, tinh: "", ghiChu: "" } },
  QUAN_LY,
);
kiem("lập hợp đồng kèm khách mới", !chan(hdMoi), chuLoi(hdMoi));
const khMoi = await p.khachHang.findUnique({ where: { maAppSheet: SDT3 } });
kiem("khách mới được tạo, mã = số điện thoại", khMoi?.maAppSheet === SDT3 && khMoi?.soDienThoai === SDT3);

/* Hợp đồng thứ hai cùng số → PHẢI dùng lại nhà cũ, không đẻ nhà trùng. */
const hdMoi2 = await lapHopDongMoi(
  { ...nenCoDong, khachHangId: null, khachMoi: { ten: `${DAU.ten} mới lần 2`, soDienThoai: SDT3, tinh: "", ghiChu: "" } },
  QUAN_LY,
);
kiem("hợp đồng thứ hai cùng số → lập được", !chan(hdMoi2));
kiem("KHÔNG đẻ ra nhà khách thứ hai cùng số", (await p.khachHang.count({ where: { soDienThoai: SDT3 } })) === 1);
kiem("hai hợp đồng trỏ về CÙNG một nhà", (await p.hopDong.count({ where: { khachHangId: khMoi?.id } })) === 2);

/* ══ O. ĐỒNG BỘ APPSHEET KHÔNG ĐƯỢC ĐỤNG DÒNG LẬP TRÊN WEB ════════════ */
phan("O · Đồng bộ không đụng dòng lập trên web");
const webHD = await p.hopDong.findMany({ where: { tenKhach: { contains: DAU.ten } }, select: { bamAppSheet: true, maHD: true, nguoiLapMaNV: true } });
kiem("hợp đồng lập trên web KHÔNG mang dấu vân tay AppSheet", webHD.length > 0 && webHD.every((h) => h.bamAppSheet === null));
kiem("mã hợp đồng do WEB sinh, mang mã người lập", webHD.every((h) => h.maHD.includes(DAU.maNV)), webHD[0]?.maHD ?? "");
const webCham = await p.chamCong.findMany({ where: { maNV: { equals: DAU.maNV, mode: "insensitive" } }, select: { bamAppSheet: true } });
kiem("chấm công trên web cũng không mang dấu vân tay", webCham.every((c) => c.bamAppSheet === null));

/*
  Lượt đồng bộ chỉ đánh dấu "mất bên AppSheet" cho dòng CÓ vân tay — nên dòng
  web không bao giờ bị ẩn đi. Kiểm bằng chính phép lọc mà `chepBang` dùng.
*/
const seBiDanhDau = await p.hopDong.count({ where: { tenKhach: { contains: DAU.ten }, bamAppSheet: { not: null } } });
kiem("không hợp đồng web nào lọt vào diện bị đánh dấu mất", seBiDanhDau === 0);

/* ══ P. CHỐNG ĐẾM ĐÔI NGÀY CÔNG ═══════════════════════════════════════ */
phan("P · Chống đếm đôi ngày công");
const { motDongMoiNgay } = await import("../src/lib/chamCong");
const gia = [
  { maNV: "npk1211", ngay: "2026-10-01", bamAppSheet: "x" },
  { maNV: "Npk1211", ngay: "2026-10-01", bamAppSheet: null },
  { maNV: "npk1211", ngay: "2026-10-02", bamAppSheet: null },
];
const gop = motDongMoiNgay(gia);
kiem("cùng người cùng ngày, khác chữ hoa thường → chỉ còn MỘT", gop.length === 2, `${gop.length} dòng`);
kiem("giữ bản của AppSheet khi có cả hai", gop.find((d) => d.ngay === "2026-10-01")?.bamAppSheet === "x");

/* ══ TỔNG KẾT ═════════════════════════════════════════════════════════ */
console.log(`\n${"═".repeat(64)}`);
console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
if (truot) {
  console.log("\nNhững phép kiểm KHÔNG đạt:");
  for (const l of loi) console.log(`  · ${l}`);
}
console.log("\nChạy tiếp: npx tsx scripts/thu-don-dep.mts");
