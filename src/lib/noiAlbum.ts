import { getPrisma } from "@/lib/db";
import { boDau } from "@/lib/dichVuChung";

/**
 * Nối album ảnh với hợp đồng (đợt 2b, 16/09/2026).
 *
 * AppSheet không biết gì về album ảnh, nên mối nối này là DỮ LIỆU CỦA WEB:
 * nằm ở cột `Gallery.hopDongId`, bộ đồng bộ đêm không bao giờ đụng tới. Nhân
 * viên tự gắn ở trang album; web chỉ gợi ý, không tự gắn — trùng tên khách là
 * chuyện thường (hai nhà cùng tên, một nhà hai hợp đồng), gắn nhầm thì tiền và
 * tiến độ của nhà này hiện sang nhà kia.
 */

export type HopDongGon = {
  id: string;
  maHD: string;
  tenKhach: string;
  loaiDV: string | null;
  ngayDat: string | null;
  trangThai: string | null;
  conLai: number;
  soDienThoai: string | null;
};

export type AlbumGon = {
  id: string;
  slug: string;
  ten: string;
  taoLuc: Date;
  /** Số tấm khách đã thả tim (danh sách "Ảnh in"). */
  soTim: number;
  /** Số thư mục khách đã bấm "đã chọn xong". */
  soMucXong: number;
  /** Lần khách báo chọn xong gần nhất, nếu có. */
  xongLuc: Date | null;
};

const CHON = {
  id: true,
  maHD: true,
  tenKhach: true,
  loaiDV: true,
  ngayDat: true,
  trangThai: true,
  conLai: true,
  khachHang: { select: { soDienThoai: true, ten: true } },
} as const;

type DongHopDong = {
  id: string;
  maHD: string;
  tenKhach: string;
  loaiDV: string | null;
  ngayDat: string | null;
  trangThai: string | null;
  conLai: number;
  khachHang: { soDienThoai: string | null; ten: string } | null;
};

function gon(h: DongHopDong): HopDongGon {
  return {
    id: h.id,
    maHD: h.maHD,
    tenKhach: h.tenKhach || h.khachHang?.ten || h.maHD,
    loaiDV: h.loaiDV,
    ngayDat: h.ngayDat,
    trangThai: h.trangThai,
    conLai: h.conLai,
    soDienThoai: h.khachHang?.soDienThoai ?? null,
  };
}

/**
 * Tách tên thành các từ để so.
 *
 * Bỏ từ một chữ cái và bỏ số: tên album hay mang mã studio và ngày ("HIS -
 * HER- Quốc Phong & Mỹ Lộc", "Hồng Nhung - Hữu Trí 5,6/4"), những mẩu đó trùng
 * nhau ở hàng trăm nhà nên đem so chỉ tạo gợi ý rác.
 */
function tuCuaTen(s: string): Set<string> {
  const BO = new Set(["his", "her", "gd", "ns", "dn", "hc", "ab", "dh", "tet", "baby", "anh", "chi", "va"]);
  return new Set(
    boDau(s)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !BO.has(t)),
  );
}

/** Hợp đồng đã gắn cho album này. */
export async function hopDongCuaAlbum(galleryId: string): Promise<HopDongGon | null> {
  const g = await getPrisma().gallery.findUnique({
    where: { id: galleryId },
    select: { hopDong: { select: CHON } },
  });
  return g?.hopDong ? gon(g.hopDong) : null;
}

/**
 * Vài hợp đồng giống tên album nhất, để nhân viên bấm một cái là xong thay vì
 * phải gõ tìm. Không giống chữ nào thì trả về rỗng — thà không gợi ý còn hơn
 * gợi ý bừa.
 */
export async function goiYHopDong(tenAlbum: string, soLuong = 6): Promise<HopDongGon[]> {
  const tu = tuCuaTen(tenAlbum);
  if (tu.size === 0) return [];
  const ds = await getPrisma().hopDong.findMany({ where: { matBenAppSheet: null }, select: CHON });
  return ds
    .map((h) => {
      const cua = tuCuaTen(`${h.tenKhach} ${h.khachHang?.ten ?? ""}`);
      let diem = 0;
      for (const t of tu) if (cua.has(t)) diem++;
      return { h, diem };
    })
    .filter((x) => x.diem > 0)
    .sort((a, b) => b.diem - a.diem || (b.h.ngayDat ?? "").localeCompare(a.h.ngayDat ?? ""))
    .slice(0, soLuong)
    .map((x) => gon(x.h));
}

/** Tìm hợp đồng theo tên khách, số điện thoại hoặc mã — cho ô tìm khi gắn tay. */
export async function timHopDong(q: string, soLuong = 12): Promise<HopDongGon[]> {
  const tim = boDau(q);
  if (tim.length < 2) return [];
  const so = q.replace(/\D/g, "");
  const ds = await getPrisma().hopDong.findMany({ where: { matBenAppSheet: null }, select: CHON });
  return ds
    .filter(
      (h) =>
        boDau(`${h.maHD} ${h.tenKhach} ${h.khachHang?.ten ?? ""}`).includes(tim) ||
        (so.length >= 3 && (h.khachHang?.soDienThoai ?? "").includes(so)),
    )
    .sort((a, b) => (b.ngayDat ?? "").localeCompare(a.ngayDat ?? ""))
    .slice(0, soLuong)
    .map((h) => gon(h));
}

/**
 * Các album đã gắn vào một hợp đồng, kèm tình trạng chọn ảnh — đây là thứ
 * người mở hợp đồng cần biết: khách chọn tới đâu rồi.
 */
export async function albumCuaHopDong(hopDongId: string): Promise<AlbumGon[]> {
  const prisma = getPrisma();
  const ds = await prisma.gallery.findMany({
    where: { hopDongId },
    select: {
      id: true,
      slug: true,
      title: true,
      clientName: true,
      createdAt: true,
      selectionsDoneAt: true,
      mucXong: { select: { xongLuc: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(
    ds.map(async (g) => {
      const soTim = await prisma.selection.count({
        where: { list: { galleryId: g.id, icon: "heart" } },
      });
      const xong = [...g.mucXong.map((m) => m.xongLuc), ...(g.selectionsDoneAt ? [g.selectionsDoneAt] : [])];
      return {
        id: g.id,
        slug: g.slug,
        ten: g.clientName ?? g.title,
        taoLuc: g.createdAt,
        soTim,
        soMucXong: g.mucXong.length,
        xongLuc: xong.length ? new Date(Math.max(...xong.map((d) => d.getTime()))) : null,
      };
    }),
  );
}
