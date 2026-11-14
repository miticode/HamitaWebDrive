/**
 * ĐÀO SÂU PHẦN TIỀN của hợp đồng — các trường hợp biên mà kịch bản chung
 * (`thu-toan-bo.mts`) không với tới.
 *
 *   npx tsx scripts/thu-tien.mts
 *   npx tsx scripts/thu-don-dep.mts   ← LUÔN chạy sau
 *
 * Vì sao tách riêng: tiền là chỗ sai thì đau nhất và lâu phát hiện nhất. Một
 * đồng lệch trong 2.400 hợp đồng không ai nhìn ra, tới khi đối chiếu công nợ
 * cuối năm mới lòi.
 *
 * Nguyên tắc chung của cả web: TIỀN DO MÁY CHỦ CỘNG, không nhận con số trình
 * duyệt gửi lên. Mọi phép kiểm dưới đây soi đúng điều đó.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { DAU } from "./thu-dau";

const { getPrisma } = await import("../src/lib/db");
const { lapHopDongMoi } = await import("../src/lib/taoHopDong");
const { suaHopDong, themPhieuThu, xoaPhieuThu, duyetPhieuThu } = await import("../src/lib/suaHopDong");

const p = getPrisma();

let dat = 0;
let truot = 0;
const loi: string[] = [];
function kiem(ten: string, dung: boolean, them = "") {
  if (dung) {
    dat++;
    console.log(`  ✓ ${ten}${them ? ` — ${them}` : ""}`);
  } else {
    truot++;
    loi.push(`${ten}${them ? ` — ${them}` : ""}`);
    console.log(`  ✗ ${ten}${them ? ` — ${them}` : ""}`);
  }
}
const phan = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 58 - s.length))}`);
const chan = (kq: unknown): boolean => !!kq && typeof kq === "object" && "loi" in (kq as object);
const chuLoi = (kq: unknown): string => (chan(kq) ? (kq as { loi: string }).loi : "");

const AI = { id: "zz", ten: DAU.ten, maNV: DAU.maNV, tenDangNhap: "zztest", laQuanLy: true };

/* Nền sạch — xem chú thích cùng việc ở `thu-toan-bo.mts`. */
const ban = await p.hopDong.count({ where: { tenKhach: { contains: DAU.ten } } });
if (ban) {
  console.error(`Còn ${ban} hợp đồng thử của lần trước. Chạy: npx tsx scripts/thu-don-dep.mts`);
  process.exit(1);
}

type Dong = { donGia: number; soLuong: number; tenDV?: string };
const nen = (dong: Dong[], khuyenMai = 0, thu: number[] = []) => ({
  khachHangId: null,
  khachMoi: { ten: `${DAU.ten} tiền`, soDienThoai: DAU.sdt, tinh: "", ghiChu: "" },
  tenKhach: `${DAU.ten} tiền`,
  loaiDV: "CƯỚI",
  ngayDat: "2026-11-14",
  diaChi: "",
  ghiChu: "",
  khuyenMai,
  trangThai: "1. Chưa có ngày chụp",
  dong: dong.map((d, i) => ({
    dichVuId: null,
    maDV: `ZZ${i}`,
    tenDV: d.tenDV ?? `Gói ${i}`,
    loai: "Dịch vụ",
    donGia: d.donGia,
    soLuong: d.soLuong,
    ngayChup: "",
    chiTiet: "",
    ghiChu: "",
  })),
  thu: thu.map((s) => ({ ngayThu: "2026-11-14", soTien: s, hinhThuc: "Tiền mặt", noiDung: "Cọc", ghiChu: "" })),
  lich: [],
  viec: [],
});

/**
 * Xoá sạch một hợp đồng thử, KỂ CẢ các dòng con.
 *
 * Không dùng `p.hopDong.delete` trần: `PhieuThu`, `LichChup` và `CongViec` nối
 * với hợp đồng bằng `onDelete: SetNull`, nên xoá hợp đồng chỉ gỡ liên kết chứ
 * không xoá chúng — để lại phiếu thu mồ côi mang tiền thật mà không thuộc hợp
 * đồng nào. Bản đầu của kịch bản này mắc đúng lỗi đó, để sót một phiếu
 * 2.000.000đ (tìm ra khi soát rộng 14/11).
 *
 * Hàm `xoaHopDong` thật của web thì xoá đúng — nó deleteMany từng bảng con
 * trong một transaction. Chỉ script này đi tắt.
 */
async function xoaSach(id: string) {
  await p.phieuThu.deleteMany({ where: { hopDongId: id } });
  await p.lichChup.deleteMany({ where: { hopDongId: id } });
  await p.congViec.deleteMany({ where: { hopDongId: id } });
  await p.chiTietHopDong.deleteMany({ where: { hopDongId: id } });
  await p.hopDong.delete({ where: { id } });
}

/** Lập một hợp đồng rồi trả về bản ghi đã lưu, kèm id để xoá sau. */
async function lap(dong: Dong[], khuyenMai = 0, thu: number[] = []) {
  const kq = await lapHopDongMoi(nen(dong, khuyenMai, thu) as never, AI);
  if (chan(kq)) return { loi: chuLoi(kq) };
  const id = (kq as { id: string }).id;
  const hd = await p.hopDong.findUnique({ where: { id }, include: { chiTiet: true, phieuThu: true } });
  return { id, maHD: (kq as { maHD: string }).maHD, hd: hd! };
}

/* ══ 1. PHÉP CỘNG CƠ BẢN ══════════════════════════════════════════════ */
phan("1 · Phép cộng cơ bản");
{
  const r = await lap([{ donGia: 3_000_000, soLuong: 2 }, { donGia: 1_500_000, soLuong: 1 }], 500_000, [2_000_000]);
  if ("loi" in r) kiem("lập được", false, r.loi);
  else {
    kiem("thành tiền = Σ(đơn giá × số lượng)", r.hd.thanhTien === 7_500_000, `${r.hd.thanhTien}`);
    kiem("tổng = thành tiền − khuyến mãi", r.hd.tongTien === 7_000_000, `${r.hd.tongTien}`);
    kiem("đã thu = Σ phiếu thu", r.hd.daThu === 2_000_000, `${r.hd.daThu}`);
    kiem("còn lại = tổng − đã thu", r.hd.conLai === 5_000_000, `${r.hd.conLai}`);
    kiem("từng dòng tự tính thành tiền", r.hd.chiTiet.find((c) => c.donGia === 3_000_000)?.thanhTien === 6_000_000);
    await xoaSach(r.id);
  }
}

/* ══ 2. MÁY CHỦ KHÔNG TIN CON SỐ TRÌNH DUYỆT GỬI ══════════════════════ */
phan("2 · Máy chủ không tin con số trình duyệt gửi");
{
  /* Gửi kèm thành tiền/tổng tiền BỊA — máy chủ phải bỏ qua và tự cộng. */
  const du = {
    ...nen([{ donGia: 1_000_000, soLuong: 1 }]),
    thanhTien: 999_999_999,
    tongTien: 1,
    daThu: 999_999_999,
    conLai: -500,
  };
  const kq = await lapHopDongMoi(du as never, AI);
  if (chan(kq)) kiem("lập được khi form gửi kèm số bịa", false, chuLoi(kq));
  else {
    const id = (kq as { id: string }).id;
    const hd = await p.hopDong.findUnique({ where: { id } });
    kiem("BỎ QUA thành tiền trình duyệt gửi", hd?.thanhTien === 1_000_000, `${hd?.thanhTien}`);
    kiem("BỎ QUA tổng tiền trình duyệt gửi", hd?.tongTien === 1_000_000, `${hd?.tongTien}`);
    kiem("BỎ QUA đã thu trình duyệt gửi", hd?.daThu === 0, `${hd?.daThu}`);
    kiem("còn lại tính lại, không âm bịa", hd?.conLai === 1_000_000, `${hd?.conLai}`);
    await xoaSach(id);
  }
}

/* ══ 3. KHUYẾN MÃI ════════════════════════════════════════════════════ */
phan("3 · Khuyến mãi");
{
  kiem("khuyến mãi ÂM → chặn", chan(await lapHopDongMoi(nen([{ donGia: 1_000_000, soLuong: 1 }], -1) as never, AI)));
  kiem(
    "khuyến mãi LỚN HƠN tiền hàng → chặn",
    chan(await lapHopDongMoi(nen([{ donGia: 1_000_000, soLuong: 1 }], 2_000_000) as never, AI)),
    chuLoi(await lapHopDongMoi(nen([{ donGia: 1_000_000, soLuong: 1 }], 2_000_000) as never, AI)),
  );
  const r = await lap([{ donGia: 1_000_000, soLuong: 1 }], 1_000_000);
  if ("loi" in r) kiem("khuyến mãi BẰNG tiền hàng → tổng 0", false, r.loi);
  else {
    kiem("khuyến mãi BẰNG tiền hàng → tổng 0đ", r.hd.tongTien === 0, `${r.hd.tongTien}`);
    kiem("còn lại cũng 0", r.hd.conLai === 0);
    await xoaSach(r.id);
  }
}

/* ══ 4. SỐ LƯỢNG VÀ LÀM TRÒN ══════════════════════════════════════════ */
phan("4 · Số lượng và làm tròn");
{
  kiem("số lượng 0 → chặn", chan(await lapHopDongMoi(nen([{ donGia: 1_000_000, soLuong: 0 }]) as never, AI)));
  kiem("số lượng âm → chặn", chan(await lapHopDongMoi(nen([{ donGia: 1_000_000, soLuong: -2 }]) as never, AI)));
  kiem("số lượng 1001 → chặn", chan(await lapHopDongMoi(nen([{ donGia: 1_000, soLuong: 1001 }]) as never, AI)));
  kiem("đơn giá âm → chặn", chan(await lapHopDongMoi(nen([{ donGia: -1, soLuong: 1 }]) as never, AI)));

  /* Số lượng LẺ — bên AppSheet có dòng 0,5 ngày công, 1,5 giờ makeup. */
  const r = await lap([{ donGia: 1_000_000, soLuong: 1.5 }]);
  if ("loi" in r) kiem("số lượng lẻ 1,5 nhận được", false, r.loi);
  else {
    kiem("số lượng lẻ 1,5 nhận được", true);
    kiem("1.000.000 × 1,5 = 1.500.000", r.hd.thanhTien === 1_500_000, `${r.hd.thanhTien}`);
    await xoaSach(r.id);
  }

  /* Làm tròn: 333.333 × 3 = 999.999 chứ không phải 1.000.000. */
  const r2 = await lap([{ donGia: 333_333, soLuong: 3 }]);
  if ("loi" in r2) kiem("phép nhân lẻ", false, r2.loi);
  else {
    kiem("333.333 × 3 = 999.999, không tự làm tròn lên", r2.hd.thanhTien === 999_999, `${r2.hd.thanhTien}`);
    await xoaSach(r2.id);
  }

  /* Đơn giá lẻ × số lượng lẻ — chỗ dễ ra số thập phân nhất. */
  const r3 = await lap([{ donGia: 333_333, soLuong: 1.5 }]);
  if ("loi" in r3) kiem("đơn giá lẻ × số lượng lẻ", false, r3.loi);
  else {
    kiem("333.333 × 1,5 làm tròn thành SỐ NGUYÊN", Number.isInteger(r3.hd.thanhTien), `${r3.hd.thanhTien}`);
    kiem("và bằng 500.000 (làm tròn 499.999,5)", r3.hd.thanhTien === 500_000, `${r3.hd.thanhTien}`);
    await xoaSach(r3.id);
  }
}

/* ══ 5. SỐ RẤT LỚN ════════════════════════════════════════════════════ */
phan("5 · Số rất lớn");
{
  kiem("đơn giá 1 tỉ → chặn (trần 999.999.999)", chan(await lapHopDongMoi(nen([{ donGia: 1_000_000_000, soLuong: 1 }]) as never, AI)));
  /* Nhiều dòng cộng lại vượt một tỉ thì phải lưu được — trần là của TỪNG dòng. */
  const r = await lap([
    { donGia: 999_999_999, soLuong: 1 },
    { donGia: 999_999_999, soLuong: 1 },
  ]);
  if ("loi" in r) kiem("hai dòng cận trần cộng lại", false, r.loi);
  else {
    kiem("hai dòng 999.999.999 cộng được, không tràn", r.hd.thanhTien === 1_999_999_998, `${r.hd.thanhTien}`);
    kiem("vẫn là số nguyên chính xác", Number.isSafeInteger(r.hd.thanhTien));
    await xoaSach(r.id);
  }
}

/* ══ 6. PHIẾU THU ═════════════════════════════════════════════════════ */
phan("6 · Phiếu thu");
{
  const r = await lap([{ donGia: 10_000_000, soLuong: 1 }], 0, [3_000_000]);
  if ("loi" in r) {
    kiem("lập để thử phiếu thu", false, r.loi);
  } else {
    const { id } = r;
    /* Thu VƯỢT tổng tiền — khách trả dư, web phải cho và để còn lại ÂM. */
    await themPhieuThu(id, { ngayThu: "2026-11-14", soTien: 9_000_000, hinhThuc: "Tiền mặt", noiDung: "Đủ", ghiChu: "" } as never, AI);
    let hd = await p.hopDong.findUnique({ where: { id } });
    kiem("thu vượt tổng → đã thu cộng đủ", hd?.daThu === 12_000_000, `${hd?.daThu}`);
    kiem("còn lại ÂM, không bị kẹp về 0", hd?.conLai === -2_000_000, `${hd?.conLai}`);

    /* Nhiều phiếu nhỏ — kiểm cộng dồn không sai. */
    for (const s of [1, 2, 3, 97]) {
      await themPhieuThu(id, { ngayThu: "2026-11-14", soTien: s, hinhThuc: "Tiền mặt", noiDung: "lẻ", ghiChu: "" } as never, AI);
    }
    hd = await p.hopDong.findUnique({ where: { id } });
    kiem("cộng thêm 4 phiếu lẻ (1+2+3+97)", hd?.daThu === 12_000_103, `${hd?.daThu}`);

    /* Xoá một phiếu → trừ lại đúng. */
    const pt = await p.phieuThu.findFirst({ where: { hopDongId: id, soTien: 97 } });
    await xoaPhieuThu(pt!.id);
    hd = await p.hopDong.findUnique({ where: { id } });
    kiem("xoá phiếu 97đ → trừ đúng 97", hd?.daThu === 12_000_006, `${hd?.daThu}`);

    /* Phiếu CHỜ DUYỆT vẫn tính vào đã thu — đúng cách AppSheet tính. */
    const SALE = { ...AI, laQuanLy: false };
    await themPhieuThu(id, { ngayThu: "2026-11-14", soTien: 500_000, hinhThuc: "Chuyển khoản", noiDung: "Cọc", ghiChu: "" } as never, SALE);
    hd = await p.hopDong.findUnique({ where: { id } });
    kiem("phiếu CHỜ DUYỆT đã cộng vào đã thu", hd?.daThu === 12_500_006, `${hd?.daThu}`);
    const cho = await p.phieuThu.findFirst({ where: { hopDongId: id, trangThai: "Chờ duyệt" } });
    await duyetPhieuThu(cho!.id, AI);
    hd = await p.hopDong.findUnique({ where: { id } });
    kiem("duyệt rồi thì đã thu KHÔNG đổi (không cộng hai lần)", hd?.daThu === 12_500_006, `${hd?.daThu}`);

    kiem("phiếu thu quá 999.999.999 → chặn", chan(await themPhieuThu(id, { ngayThu: "2026-11-14", soTien: 1_000_000_000, hinhThuc: "Tiền mặt", noiDung: "x", ghiChu: "" } as never, AI)));
    kiem("phiếu thu ÂM → chặn", chan(await themPhieuThu(id, { ngayThu: "2026-11-14", soTien: -100, hinhThuc: "Tiền mặt", noiDung: "x", ghiChu: "" } as never, AI)));
    kiem("hình thức thu lạ → chặn", chan(await themPhieuThu(id, { ngayThu: "2026-11-14", soTien: 100, hinhThuc: "Thẻ tín dụng", noiDung: "x", ghiChu: "" } as never, AI)));

    await xoaSach(id);
  }
}

/* ══ 7. SỬA HỢP ĐỒNG — TIỀN PHẢI TÍNH LẠI ═════════════════════════════ */
phan("7 · Sửa hợp đồng, tiền tính lại");
{
  const r = await lap([{ donGia: 5_000_000, soLuong: 2 }, { donGia: 1_000_000, soLuong: 1 }], 1_000_000, [4_000_000]);
  if ("loi" in r) {
    kiem("lập để thử sửa", false, r.loi);
  } else {
    const { id } = r;
    const cu = await p.chiTietHopDong.findMany({ where: { hopDongId: id }, orderBy: { donGia: "desc" } });
    const nenSua = (dong: unknown[], km = 1_000_000) => ({
      tenKhach: `${DAU.ten} tiền`,
      loaiDV: "CƯỚI",
      ngayDat: "2026-11-14",
      diaChi: "",
      ghiChu: "",
      khuyenMai: km,
      trangThai: "1. Chưa có ngày chụp",
      dong,
    });
    const nhu = (c: (typeof cu)[number], sua: Partial<{ donGia: number; soLuong: number }> = {}) => ({
      id: c.id, dichVuId: c.dichVuId, maDV: c.maDV ?? "", tenDV: c.tenDV ?? "", loai: c.loai ?? "",
      donGia: sua.donGia ?? c.donGia, soLuong: sua.soLuong ?? c.soLuong,
      ngayChup: c.ngayChup ?? "", chiTiet: c.chiTiet ?? "", ghiChu: c.ghiChu ?? "",
    });

    /* Đổi số lượng dòng lớn: 2 → 3. */
    await suaHopDong(id, nenSua([nhu(cu[0], { soLuong: 3 }), nhu(cu[1])]) as never, AI);
    let hd = await p.hopDong.findUnique({ where: { id } });
    kiem("đổi số lượng → thành tiền tính lại", hd?.thanhTien === 16_000_000, `${hd?.thanhTien}`);
    kiem("đã thu GIỮ NGUYÊN khi sửa dòng dịch vụ", hd?.daThu === 4_000_000, `${hd?.daThu}`);
    kiem("còn lại tính lại theo tổng mới", hd?.conLai === 11_000_000, `${hd?.conLai}`);

    /* Bỏ một dòng. */
    await suaHopDong(id, nenSua([nhu(cu[0], { soLuong: 3 })]) as never, AI);
    const hdCt = await p.hopDong.findUnique({ where: { id }, include: { chiTiet: true } });
    hd = hdCt;
    kiem("bỏ một dòng → chỉ còn một dòng", hdCt?.chiTiet.length === 1);
    kiem("thành tiền trừ đúng phần đã bỏ", hd?.thanhTien === 15_000_000, `${hd?.thanhTien}`);

    /*
      Sửa sao cho tiền hàng THẤP HƠN khuyến mãi cũ. `kiemSuaHopDong` chặn ở
      cửa trước; nếu lọt thì `tinhLaiTien` còn kẹp khuyến mãi xuống bằng tiền
      hàng — hai lớp, vì tổng tiền âm là con số không bao giờ được phép có.
    */
    const kq = await suaHopDong(id, nenSua([nhu(cu[0], { donGia: 100, soLuong: 1 })], 1_000_000) as never, AI);
    kiem("sửa cho khuyến mãi > tiền hàng → chặn", chan(kq), chuLoi(kq));
    hd = await p.hopDong.findUnique({ where: { id } });
    kiem("và hợp đồng KHÔNG bị đổi gì sau lần chặn đó", hd?.thanhTien === 15_000_000, `${hd?.thanhTien}`);
    kiem("tổng tiền không bao giờ âm", (hd?.tongTien ?? 0) >= 0, `${hd?.tongTien}`);

    await xoaSach(id);
  }
}

/* ══ 8. DANH SÁCH DV GHI LẠI THEO DÒNG ════════════════════════════════ */
phan("8 · Danh sách dịch vụ bám theo các dòng");
{
  const r = await lap([
    { donGia: 1_000_000, soLuong: 1, tenDV: "Gói A" },
    { donGia: 2_000_000, soLuong: 1, tenDV: "Gói B" },
  ]);
  if ("loi" in r) kiem("lập để thử danh sách DV", false, r.loi);
  else {
    kiem("danh sách DV gồm cả hai gói", (r.hd.danhSachDV ?? "").includes("Gói A") && (r.hd.danhSachDV ?? "").includes("Gói B"), r.hd.danhSachDV ?? "");
    await xoaSach(r.id);
  }
}

/* ══ 9. KHÔNG ĐƯỢC ĐỂ LẠI RÁC ════════════════════════════════════════ */
phan("9 · Kịch bản tự dọn sạch");
{
  const moCoi = await p.phieuThu.count({ where: { hopDongId: null, nguoiTaoMaNV: DAU.maNV } });
  kiem("không để lại phiếu thu mồ côi nào", moCoi === 0, `${moCoi}`);
  const con = await p.hopDong.count({ where: { tenKhach: { contains: DAU.ten } } });
  kiem("không để lại hợp đồng thử nào", con === 0, `${con}`);
}

/* ══ TỔNG KẾT ═════════════════════════════════════════════════════════ */
console.log(`\n${"═".repeat(62)}`);
console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
if (truot) {
  console.log("\nKhông đạt:");
  for (const l of loi) console.log(`  · ${l}`);
}
console.log("\nChạy tiếp: npx tsx scripts/thu-don-dep.mts");
