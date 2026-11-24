import { getPrisma } from "@/lib/db";
import { soBuoiCuaGoi } from "@/lib/goiNhieuNgay";
import { homNayStudio } from "@/lib/constants";

/*
  SINH ĐẦU VIỆC CHO MỘT HỢP ĐỒNG, TỪ BẢNG ĐẦU VIỆC CỦA DỊCH VỤ.

  Vì sao có tệp này — anh báo 23/11/2026: "những hợp đồng tạo sẵn bên AppSheet
  khi đồng bộ qua thì không tự động sinh đầu việc trên lịch chụp".

  Đúng vậy. Web vốn chỉ sinh đầu việc lúc LẬP hợp đồng trên web, mà phép tính
  ấy nằm trong `FormHopDongMoi` — tức chạy ở máy người dùng. Hợp đồng chép từ
  AppSheet không đi qua form nên không có gì sinh ra.

  Đo 23/11 trên 257 hợp đồng tạo từ 01/09: 133 hợp đồng KHÔNG có đầu việc nào.
  Trong đó 44 sinh được ngay (224 đầu việc), 89 còn lại vì gói chưa khai bảng.

  Tệp này chép đúng phép tính của form sang máy chủ, để cả hai đường — lập trên
  web và chép từ AppSheet — ra cùng một kết quả. KHÔNG đổi quy tắc nào:

  · mỗi dòng bảng đầu việc của dịch vụ thành một đầu việc;
  · `buoiThu` là buổi thứ mấy CỦA GÓI, còn `lichChupId` cần buổi thứ mấy TRONG
    LỊCH của cả hợp đồng — hai số chỉ bằng nhau khi hợp đồng có một dòng dịch
    vụ. `dauLich` là chỗ dời;
  · `buoiThu` để trống = việc hậu kỳ, không gắn buổi nào. Anh chốt 24/11: giữ
    đúng ô đã khai, không tự gắn giùm vào buổi duy nhất;
  · hạn của việc gắn buổi là NGÀY BUỔI ĐÓ, việc hậu kỳ thì theo ngày chụp của
    dòng dịch vụ.
*/

/** Một đầu việc sắp ghi — tách khỏi phần ghi để xem trước mà không đụng database. */
export type ViecSinh = {
  chiTietId: string;
  lichChupId: string | null;
  loai: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  thoiHan: string | null;
};

/** Số thứ tự ở đuôi mã chi tiết ("..._12" → 12). Không có thì xếp cuối. */
function thuTuChiTiet(ma: string): number {
  const m = ma.match(/_(\d+)$/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Tính đầu việc cho NHIỀU hợp đồng một lượt. KHÔNG ghi gì.
 *
 * Gộp chứ không gọi từng hợp đồng một: lần đồng bộ đầu phải xét chín mươi mốt
 * hợp đồng, mà hỏi riêng từng cái là ba lượt đọc database mỗi cái — Neon tính
 * tiền theo thời gian thức nên hai trăm lượt vụn đắt hơn hẳn bốn lượt gọn
 * (nguyên tắc 53).
 *
 * Trả về Map: id hợp đồng → danh sách việc. Hợp đồng không sinh được việc nào
 * thì KHÔNG có khoá trong Map.
 */
export async function tinhDauViecNhieu(hopDongIds: string[]): Promise<Map<string, ViecSinh[]>> {
  const ra = new Map<string, ViecSinh[]>();
  if (hopDongIds.length === 0) return ra;
  const prisma = getPrisma();

  const [chiTiet, lich] = await Promise.all([
    prisma.chiTietHopDong.findMany({
      where: { hopDongId: { in: hopDongIds } },
      select: {
        id: true,
        hopDongId: true,
        maAppSheet: true,
        dichVuId: true,
        tenDV: true,
        ngayChup: true,
        soLuong: true,
      },
    }),
    /*
      Thứ tự dòng lịch phải khớp thứ tự người lập gõ, vì phép dời buổi đếm theo
      đó. `taoLuc` là thứ duy nhất giữ được thứ tự ấy; hai dòng cùng lúc thì
      `id` phân giải cho ổn định giữa các lần chạy.
    */
    prisma.lichChup.findMany({
      where: { hopDongId: { in: hopDongIds } },
      select: { id: true, hopDongId: true, ngay: true },
      orderBy: [{ taoLuc: "asc" }, { id: "asc" }],
    }),
  ]);

  const ctTheoHD = new Map<string, typeof chiTiet>();
  for (const c of chiTiet) {
    const a = ctTheoHD.get(c.hopDongId) ?? [];
    a.push(c);
    ctTheoHD.set(c.hopDongId, a);
  }
  const lichTheoHD = new Map<string, typeof lich>();
  for (const l of lich) {
    if (!l.hopDongId) continue;
    const a = lichTheoHD.get(l.hopDongId) ?? [];
    a.push(l);
    lichTheoHD.set(l.hopDongId, a);
  }

  const dvIds = [...new Set(chiTiet.map((c) => c.dichVuId).filter((x): x is string => !!x))];
  if (dvIds.length === 0) return ra;

  const [gia, buoiCuaDV] = await Promise.all([
    prisma.giaHangMuc.findMany({
      where: { dichVuId: { in: dvIds } },
      orderBy: { taoLuc: "asc" },
      select: { dichVuId: true, hangMuc: true, donGia: true, buoiThu: true },
    }),
    prisma.dichVuBuoi.groupBy({
      by: ["dichVuId"],
      where: { dichVuId: { in: dvIds } },
      _count: { _all: true },
    }),
  ]);
  if (gia.length === 0) return ra;

  const giaTheoDV = new Map<string, typeof gia>();
  for (const g of gia) {
    const a = giaTheoDV.get(g.dichVuId) ?? [];
    a.push(g);
    giaTheoDV.set(g.dichVuId, a);
  }
  const demBuoi = new Map(buoiCuaDV.map((b) => [b.dichVuId, b._count._all]));

  /* Số dòng lịch mà một dòng dịch vụ chiếm — y như `soBuoiCuaDong` trong form. */
  const soBuoiCuaDong = (d: (typeof chiTiet)[number]): number => {
    const gan = (d.dichVuId ? demBuoi.get(d.dichVuId) : 0) ?? 0;
    if (gan > 0) return gan;
    const theoTen = soBuoiCuaGoi(d.tenDV);
    return theoTen >= 2 ? theoTen : 0;
  };

  for (const hopDongId of hopDongIds) {
    const dong = [...(ctTheoHD.get(hopDongId) ?? [])].sort(
      (a, b) => thuTuChiTiet(a.maAppSheet) - thuTuChiTiet(b.maAppSheet),
    );
    if (dong.length === 0) continue;
    const dsLich = lichTheoHD.get(hopDongId) ?? [];

    const viec: ViecSinh[] = [];
    let dauLich = 0;
    for (const d of dong) {
      const bang = d.dichVuId ? (giaTheoDV.get(d.dichVuId) ?? []) : [];
      for (const g of bang) {
        const b = g.buoiThu === null ? null : dauLich + g.buoiThu - 1;
        /* Buổi trỏ ra ngoài lịch (gói khai ba buổi mà lịch mới có hai dòng) thì bỏ gắn. */
        const i = b !== null && b >= 0 && b < dsLich.length ? b : null;
        viec.push({
          chiTietId: d.id,
          lichChupId: i === null ? null : dsLich[i].id,
          loai: g.hangMuc?.trim() || "Việc",
          soLuong: d.soLuong,
          donGia: g.donGia,
          thanhTien: Math.round(g.donGia * d.soLuong),
          thoiHan: (i !== null ? dsLich[i].ngay : null) || d.ngayChup || null,
        });
      }
      dauLich += soBuoiCuaDong(d);
    }
    if (viec.length) ra.set(hopDongId, viec);
  }
  return ra;
}

/** Một hợp đồng. Mảng rỗng = không gói nào trong đó đã khai bảng đầu việc. */
export async function tinhDauViec(hopDongId: string): Promise<ViecSinh[]> {
  return (await tinhDauViecNhieu([hopDongId])).get(hopDongId) ?? [];
}

/**
 * VIỆC CŨ BAO NHIÊU NGÀY THÌ THÔI KHÔNG SINH NỮA.
 *
 * Đo 24/11/2026: 1.481 hợp đồng chép từ AppSheet chưa có đầu việc nào, nhưng
 * phần lớn đã giao xong từ lâu — 1.049 dòng đứng ở bước 12 và 348 dòng ở bước
 * 18. Sinh việc cho chúng chỉ làm bảng đầu việc đầy những dòng không ai làm.
 *
 * Lọc theo NGÀY CHỤP chứ không theo bước: bước bên AppSheet nhiều hợp đồng
 * không ai cập nhật tiếp nên không nói được gì. Lấy mốc 30 ngày thì còn 91
 * hợp đồng — đúng khoảng studio còn đang làm dở.
 */
const NGAY_CON_LAM = 30;

/** Ngày studio, lùi `n` ngày, dạng "YYYY-MM-DD" (nguyên tắc 35). */
function ngayLui(n: number): string {
  const [y, m, d] = homNayStudio().split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - n);
  return t.toISOString().slice(0, 10);
}

export type SoSinhViec = { hopDong: number; them: number; don: number };

/**
 * Chạy ngay sau mỗi lần chép từ AppSheet — anh chốt 24/11/2026.
 *
 * HAI VIỆC, theo đúng thứ tự:
 *
 * 1. DỌN TRÙNG trước. Hợp đồng nào web đã sinh việc giùm mà nay bên AppSheet
 *    đã có đầu việc thật thì bỏ phần web sinh đi — người làm bên kia mới là
 *    bản chính. Không dọn thì một hợp đồng mang hai bộ việc y hệt nhau.
 *
 * 2. SINH cho hợp đồng còn trống.
 *
 * CÁCH NHẬN RA VIỆC DO WEB SINH: không có `maAppSheet`, mà hợp đồng chứa nó
 * thì CÓ. Hợp đồng lập thẳng trên web cũng có việc không mã, nhưng hợp đồng
 * ấy tự nó không mã nên không lọt vào phép lọc này.
 *
 * Quy ước ấy chỉ đứng vững chừng nào web chưa có đường thêm đầu việc tay vào
 * một hợp đồng chép từ AppSheet (24/11/2026: chưa có — nút "Thêm việc vào
 * lịch" tạo dòng LỊCH, không tạo đầu việc). Ngày nào làm nút ấy thì phải thêm
 * một cột đánh dấu, đừng dựa tiếp vào chỗ này.
 */
export async function sinhDauViecKhiDongBo(): Promise<SoSinhViec> {
  const prisma = getPrisma();

  /* 1. Dọn: hợp đồng vừa có việc web sinh, vừa có việc thật từ AppSheet. */
  const don = (
    await prisma.congViec.deleteMany({
      where: {
        bamAppSheet: null,
        hopDong: {
          bamAppSheet: { not: null },
          congViec: { some: { bamAppSheet: { not: null } } },
        },
      },
    })
  ).count;

  /* 2. Sinh cho hợp đồng còn trống và còn trong tầm làm việc. */
  const can = await prisma.hopDong.findMany({
    where: {
      bamAppSheet: { not: null },
      congViec: { none: {} },
      chiTiet: { some: { ngayChup: { gte: ngayLui(NGAY_CON_LAM) } } },
    },
    select: { id: true },
  });
  const tinh = await tinhDauViecNhieu(can.map((h) => h.id));

  let them = 0;
  for (const [hopDongId, ds] of tinh) {
    await prisma.congViec.createMany({
      data: ds.map((v) => ({
        hopDongId,
        chiTietId: v.chiTietId,
        lichChupId: v.lichChupId,
        loai: v.loai,
        soLuong: v.soLuong,
        donGia: v.donGia,
        thanhTien: v.thanhTien,
        thoiHan: v.thoiHan,
        trangThai: "Chưa giao việc",
      })),
    });
    them += ds.length;
  }
  return { hopDong: tinh.size, them, don };
}
