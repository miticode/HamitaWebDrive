import { getPrisma } from "@/lib/db";
import { boDau } from "@/lib/dichVuChung";

/**
 * GHÉP ALBUM VỚI HỢP ĐỒNG HÀNG LOẠT — thêm 14/11/2026.
 *
 * ━━ Vì sao cần ━━
 *
 * Việc gắn album vào hợp đồng đã làm được từ 16/09/2026, nhưng phải mở từng
 * album rồi bấm. Đo ngày 14/11: **169 album, gắn được 3**. Trong 123 album tạo
 * sau ngày có tính năng, đúng **một** cái được gắn, và nhật ký ghi vỏn vẹn hai
 * lần bấm "Gắn hợp đồng" trong gần hai tháng.
 *
 * Mà mọi thứ định xây tiếp — tiến độ sản xuất, Kanban, tự động giao việc
 * Retouch — đều đứng trên mối nối này. Nền đang 2%.
 *
 * ━━ Ba mức tin cậy, đo từ 166 album thật ━━
 *
 * Chấm điểm bằng số TỪ trùng nhau giữa tên album và tên khách trên hợp đồng.
 * Phân bố điểm cao nhất, kèm khoảng cách với hợp đồng đứng nhì:
 *
 * | Tình trạng | Số album | Xếp mức |
 * |---|---|---|
 * | khớp ≥ 3 từ và hơn nhì ≥ 2 | 53 | **chắc** |
 * | hơn nhì đúng 1 | 29 | gần chắc |
 * | nhiều hợp đồng BẰNG điểm | 83 | phải chọn |
 * | không khớp từ nào | 1 | tìm tay |
 *
 * ━━ Vì sao nhóm "bằng điểm" KHÔNG tự ghép được ━━
 *
 * Soi tay nhóm đó thì ra một quy luật: gần như toàn bộ là **một nhà có hai hợp
 * đồng**:
 *
 *     Album "HIS - HER - Lan Hương & Linh Dương"
 *       → Lan Hương - Linh Dương 3-4/10/2026  (đặt 02/08)
 *       → Lan Hương - Linh Dương 3-4/10/2026  (đặt 21/06)
 *
 * Ngày tháng không tách được, vì cả hai đều là hợp đồng thật của đúng nhà đó —
 * thường là một cho buổi chụp, một cho ngày tiệc. Máy đoán bừa thì tiến độ và
 * tiền của hợp đồng này hiện sang hợp đồng kia.
 *
 * Nên web KHÔNG BAO GIỜ tự ghép. Nó chỉ xếp sẵn từng cặp và để người bấm duyệt
 * — việc 166 album rút từ "mở từng album" xuống còn một buổi bấm.
 */

export type HopDongUngVien = {
  id: string;
  maHD: string;
  tenKhach: string;
  loaiDV: string | null;
  ngayDat: string | null;
  trangThai: string | null;
  conLai: number;
  /** Số từ trùng giữa tên album và tên khách. */
  diem: number;
};

export type MucTinCay = "chac" | "gan-chac" | "cung-nha" | "chon-tay";

export type CapGhep = {
  galleryId: string;
  slug: string;
  tenAlbum: string;
  taoLuc: Date;
  soAnh: number;
  anhBia: string | null;
  muc: MucTinCay;
  /** Ứng viên, điểm cao đứng trước. Nhiều nhất 5. */
  ungVien: HopDongUngVien[];
};

/**
 * Từ bỏ đi khi so tên. Giữ nguyên danh sách của `noiAlbum.ts` — hai chỗ cùng
 * một phép so thì phải cùng một bộ từ, lệch là hai màn hình gợi ý khác nhau.
 */
const BO_QUA = new Set(["his", "her", "gd", "ns", "dn", "hc", "ab", "dh", "tet", "baby", "anh", "chi", "va"]);

function tuCuaTen(s: string): Set<string> {
  return new Set(
    boDau(s)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !BO_QUA.has(t)),
  );
}

/** Ngưỡng "chắc", chọn từ phân bố thật ở chú thích đầu tệp. */
const KHOP_TOI_THIEU = 3;
const HON_NHI_TOI_THIEU = 2;

/**
 * Mọi album CHƯA GẮN, kèm ứng viên hợp đồng và mức tin cậy.
 *
 * Đọc cả bảng hợp đồng một lần rồi so trong bộ nhớ: 2.402 hợp đồng × 166 album
 * là phép so chuỗi thuần, nhanh hơn nhiều so với 166 lượt hỏi database — và
 * database không so được tên tiếng Việt không dấu (cùng lý do với `timKhach`).
 */
export async function capChuaGhep(gioiHan = 300): Promise<CapGhep[]> {
  const prisma = getPrisma();
  const [album, hopDong] = await Promise.all([
    prisma.gallery.findMany({
      where: { hopDongId: null },
      select: { id: true, slug: true, title: true, clientName: true, createdAt: true, photoCount: true, coverFileId: true },
      orderBy: { createdAt: "desc" },
      take: gioiHan,
    }),
    prisma.hopDong.findMany({
      where: { matBenAppSheet: null },
      select: {
        id: true, maHD: true, tenKhach: true, loaiDV: true, ngayDat: true,
        trangThai: true, conLai: true, khachHangId: true,
        khachHang: { select: { ten: true } },
      },
    }),
  ]);

  const hdTu = hopDong.map((h) => ({ h, tu: tuCuaTen(`${h.tenKhach} ${h.khachHang?.ten ?? ""}`) }));

  return album.map((g) => {
    const tu = tuCuaTen(`${g.clientName ?? ""} ${g.title}`);
    const cham = hdTu
      .map(({ h, tu: cua }) => {
        let diem = 0;
        for (const t of tu) if (cua.has(t)) diem++;
        return { h, diem };
      })
      .filter((x) => x.diem > 0)
      .sort((a, b) => b.diem - a.diem || (b.h.ngayDat ?? "").localeCompare(a.h.ngayDat ?? ""));

    const nhat = cham[0]?.diem ?? 0;
    const nhi = cham[1]?.diem ?? 0;
    const bangDiem = cham.filter((x) => x.diem === nhat);

    /*
      Thứ tự xét quan trọng: "cùng nhà" phải đứng TRƯỚC "chắc".

      Khi hai hợp đồng bằng điểm mà cùng một nhà khách, chọn nhầm vẫn còn trong
      nhà đó — nhẹ hơn hẳn chọn nhầm sang nhà khác. Nhưng vẫn là người chọn,
      không phải máy: một cái là hợp đồng chụp, một cái là hợp đồng tiệc.
    */
    let muc: MucTinCay;
    if (nhat === 0) muc = "chon-tay";
    else if (bangDiem.length > 1) {
      const nha = new Set(bangDiem.map((x) => x.h.khachHangId).filter(Boolean));
      muc = nha.size === 1 && bangDiem.length <= 3 ? "cung-nha" : "chon-tay";
    } else if (nhat >= KHOP_TOI_THIEU && nhat - nhi >= HON_NHI_TOI_THIEU) muc = "chac";
    else muc = "gan-chac";

    return {
      galleryId: g.id,
      slug: g.slug,
      tenAlbum: g.clientName ?? g.title,
      taoLuc: g.createdAt,
      soAnh: g.photoCount,
      anhBia: g.coverFileId,
      muc,
      ungVien: cham.slice(0, 5).map((x) => ({
        id: x.h.id,
        maHD: x.h.maHD,
        tenKhach: x.h.tenKhach || x.h.khachHang?.ten || x.h.maHD,
        loaiDV: x.h.loaiDV,
        ngayDat: x.h.ngayDat,
        trangThai: x.h.trangThai,
        conLai: x.h.conLai,
        diem: x.diem,
      })),
    };
  });
}

/** Đếm nhanh số album chưa gắn — cho dòng nhắc ở trang Tổng quan. */
export async function demChuaGhep(): Promise<number> {
  return getPrisma().gallery.count({ where: { hopDongId: null } });
}

export const CHU_MUC: Record<MucTinCay, { ten: string; giai: string }> = {
  chac: { ten: "Khớp rõ", giai: "Tên khớp hẳn một hợp đồng, không hợp đồng nào khác gần bằng." },
  "gan-chac": { ten: "Gần khớp", giai: "Có một hợp đồng nhỉnh hơn, nhưng chênh lệch ít — nhìn lại cho chắc." },
  "cung-nha": { ten: "Cùng một nhà", giai: "Nhà này có nhiều hợp đồng cùng khớp — chọn đúng hợp đồng của album này." },
  "chon-tay": { ten: "Chưa rõ", giai: "Không có hợp đồng nào nổi hẳn lên — tìm tay." },
};

/**
 * Một hợp đồng khớp RÕ với tên album này, hoặc null.
 *
 * Dùng ngay sau khi tạo album để hỏi người tạo một câu — xem `ActionState`
 * trong `src/app/admin/actions.ts`. Ngưỡng y hệt mức "chắc" ở `capChuaGhep`:
 * khớp ≥ 3 từ và hơn hợp đồng đứng nhì ≥ 2 điểm. Không chắc thì trả null, thà
 * im lặng còn hơn hỏi sai.
 */
export async function ghepChacCuaAlbum(
  tenAlbum: string,
): Promise<{ hopDongId: string; tenHopDong: string } | null> {
  const tu = tuCuaTen(tenAlbum);
  if (tu.size === 0) return null;

  const hopDong = await getPrisma().hopDong.findMany({
    where: { matBenAppSheet: null },
    select: { id: true, tenKhach: true, maHD: true, ngayDat: true, khachHang: { select: { ten: true } } },
  });

  const cham = hopDong
    .map((h) => {
      const cua = tuCuaTen(`${h.tenKhach} ${h.khachHang?.ten ?? ""}`);
      let diem = 0;
      for (const t of tu) if (cua.has(t)) diem++;
      return { h, diem };
    })
    .filter((x) => x.diem > 0)
    .sort((a, b) => b.diem - a.diem || (b.h.ngayDat ?? "").localeCompare(a.h.ngayDat ?? ""));

  const nhat = cham[0]?.diem ?? 0;
  const nhi = cham[1]?.diem ?? 0;
  if (nhat < KHOP_TOI_THIEU || nhat - nhi < HON_NHI_TOI_THIEU) return null;

  const h = cham[0].h;
  return { hopDongId: h.id, tenHopDong: h.tenKhach || h.khachHang?.ten || h.maHD };
}
