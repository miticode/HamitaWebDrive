"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getPrisma } from "@/lib/db";
import { boDau, homNayStudio, MUI_GIO } from "@/lib/constants";
import { layNguoiDung, lapHopDong } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { docCacBuoc } from "@/lib/buocHopDong";
import { demLuotDung } from "@/lib/dichVuHayDung";
import { coGiaoAnh, taoThuMucVaAlbum } from "@/lib/thuMucHopDong";
import { MA_ALBUM } from "@/lib/maAlbum";
import { lapHopDongMoi, maNguoiLap, type NguoiLap } from "@/lib/taoHopDong";
import { ngayVN, type DuLieuHopDongMoi, type DuLieuPhieuThu, type DuLieuSuaHopDong } from "@/lib/hopDongChung";
import { duyetPhieuThu, suaHopDong, themPhieuThu, xoaHopDong, xoaPhieuThu } from "@/lib/suaHopDong";

/**
 * Lập hợp đồng trên web (anh chốt 21/09/2026) và tìm khách cũ cho ô chọn khách.
 *
 * Quyền kiểm Ở ĐÂY mỗi lượt gọi, không tin việc trang đã giấu nút — server
 * action là một đường mạng công khai, ai biết tên hàm cũng gọi được
 * (nguyên tắc 3).
 */

async function nguoiDuocLap(): Promise<NguoiLap | null> {
  const nguoi = await layNguoiDung();
  if (!lapHopDong(nguoi) || !nguoi) return null;
  return {
    id: nguoi.id ?? "",
    ten: nguoi.ten,
    maNV: nguoi.maNV,
    tenDangNhap: nguoi.tenDangNhap ?? "QUANLY",
    laQuanLy: nguoi.vaiTro === "quan-tri",
  };
}

export type KhachTim = {
  id: string;
  ten: string;
  soDienThoai: string | null;
  tinh: string | null;
  soHopDong: number;
};

/**
 * Tìm khách cũ theo tên hoặc số điện thoại.
 *
 * KHÔNG trả cả bảng khách xuống trình duyệt: 1.992 nhà, mỗi nhà một số điện
 * thoại — đó là thứ chỉ nên rời máy chủ theo đúng câu người ta đang gõ, và
 * cũng chỉ với người được xem hợp đồng. Gõ dưới ba chữ thì chưa tìm, tránh mỗi
 * phím một lượt hỏi database (nguyên tắc 53).
 */
export async function timKhachAction(tuKhoa: string): Promise<KhachTim[]> {
  if (!(await nguoiDuocLap())) return [];
  const q = tuKhoa.trim();
  if (q.length < 3) return [];

  const prisma = getPrisma();
  const ds = await prisma.khachHang.findMany({
    where: {
      matBenAppSheet: null,
      OR: [
        { ten: { contains: q, mode: "insensitive" } },
        { soDienThoai: { contains: q.replace(/[^\d+]/g, "") || q } },
        { maAppSheet: { contains: q.replace(/[^\d+]/g, "") || q } },
      ],
    },
    orderBy: { taoLuc: "desc" },
    take: 40,
    select: {
      id: true,
      ten: true,
      soDienThoai: true,
      tinh: true,
      _count: { select: { hopDong: true } },
    },
  });

  /*
    Lọc thêm một lượt KHÔNG DẤU ở máy chủ: `contains` của Postgres không hiểu
    "hong tam" là "Hồng Tâm", mà nhân viên thì gõ không dấu cho nhanh. Chỉ lọc
    trong 40 dòng vừa lấy nên không tốn thêm lượt hỏi nào.
  */
  const khongDau = boDau(q);
  const hop = ds.filter(
    (k) =>
      boDau(k.ten).includes(khongDau) ||
      (k.soDienThoai ?? "").includes(q.replace(/[^\d+]/g, "")),
  );

  return (hop.length ? hop : ds).slice(0, 12).map((k) => ({
    id: k.id,
    ten: k.ten,
    soDienThoai: k.soDienThoai,
    tinh: k.tinh,
    soHopDong: k._count.hopDong,
  }));
}

export async function lapHopDongAction(
  du: DuLieuHopDongMoi,
  /**
   * Mã album người lập chọn trong form, đè lên phép suy từ dịch vụ và lịch.
   *
   * Thêm 18/11/2026: gói "NGÀY CƯỚI/HỎI 1 NGÀY" dùng cho cả cưới lẫn hỏi nên
   * không gắn mã cố định lên dịch vụ được, mà lịch thì 34% ca chỉ ghi "Ngày
   * chụp" chung chung. Người đang ngồi với khách mới biết chắc.
   *
   * `undefined` = form không gửi gì, cứ tự suy. Mảng rỗng = cố ý không mã.
   */
  maAlbum?: string[],
): Promise<{ loi: string } | { id: string; maHD: string }> {
  const nguoi = await nguoiDuocLap();
  if (!nguoi) {
    return { loi: "Tài khoản này chưa được lập hợp đồng, hoặc phiên đăng nhập đã hết." };
  }

  /*
    NGÀY LẬP DO MÁY CHỦ CHỐT, không nhận từ form (anh chốt 14/11/2026).

    Ngày đặt là thời điểm hợp đồng được lập — một dấu thời gian, không phải ô
    người ta điền. Trước đây form cho gõ tay, nghĩa là một cú bấm lùi ngày là
    hợp đồng đứng sai chỗ trong mọi báo cáo doanh thu theo tháng.

    Ép ở ĐÂY chứ không ép trong `kiemHopDongMoi`: hàm kiểm đó được phần SỬA
    mượn lại (`kiemSuaHopDong`), ép trong đó là mỗi lần sửa một hợp đồng cũ
    lại kéo ngày đặt của nó về hôm nay — 2.402 hợp đồng chép từ AppSheet sẽ
    hỏng dần theo từng lần mở ra sửa.
  */
  const kq = await lapHopDongMoi({ ...du, ngayDat: homNayStudio() }, nguoi);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "lap-hop-dong",
    doiTuong: "HopDong",
    doiTuongId: kq.id,
    // Nhật ký ghi mã và tên khách, KHÔNG ghi số điện thoại.
    chiTiet: { ten: `${kq.maHD} — ${du.tenKhach}`, nguoiLap: maNguoiLap(nguoi) },
  });

  /*
    THƯ MỤC DRIVE + ALBUM, CHẠY NỀN (anh chốt 14/11/2026).

    Vì sao chạy nền chứ không chờ: đo thật mất 4,40 giây — ba lượt hỏi Drive
    nối đuôi nhau (tìm thư mục năm, tìm thư mục tháng, tạo thư mục album) rồi
    mới tới database. Bắt người lập ngồi nhìn màn hình thêm bốn giây rưỡi sau
    khi đã bấm xong là trả giá quá đắt cho một thứ họ chưa cần ngay.

    Vì sao được phép hỏng mà không sao: hợp đồng đã lưu xong trước khi tới
    dòng này. Drive rớt mạng hay hết hạn kết nối thì hợp đồng vẫn còn nguyên,
    chỉ là chưa có album — và trang chi tiết hợp đồng có sẵn nút "Tạo thư mục
    Drive & album" để làm lại bằng tay. Tự động hỏng thì vẫn còn đường đi bộ.

    Nhật ký ghi CẢ HAI chiều, thành công lẫn thất bại: chạy nền mà không ghi
    lại thì không ai biết nó có chạy hay không, và lỗi sẽ im lặng nhiều tháng.
  */
  if (coGiaoAnh(du.loaiDV)) {
    after(async () => {
      /* Lọc lại ở máy chủ: trình duyệt gửi gì cũng phải nằm trong bộ mã. */
      const maSach = maAlbum?.filter((x) => MA_ALBUM.some((m) => m.ma === x));
      const album = await taoThuMucVaAlbum(kq.id, undefined, maSach);
      await ghiNhatKy({
        nguoi: { id: nguoi.id || null, ten: nguoi.ten },
        hanhDong: album.ok ? "tao-album-tu-hop-dong" : "tao-album-tu-hop-dong-loi",
        doiTuong: "HopDong",
        doiTuongId: kq.id,
        chiTiet: album.ok
          ? {
              maHD: kq.maHD,
              album: album.tenAlbum,
              thuMuc: album.tenThuMuc,
              thuMucDrive: album.thuMucDrive,
              o: album.ketNoi,
              ...(album.canChiaSe ? { chuaChiaSeVoi: album.canChiaSe } : {}),
            }
          : { maHD: kq.maHD, loi: album.loi },
      }).catch(() => {});
      if (album.ok) revalidatePath(`/quan-ly/hop-dong/${kq.id}`);
    });
  }

  revalidatePath("/quan-ly/hop-dong");
  revalidatePath("/quan-ly/lich");
  revalidatePath("/quan-ly/cong-viec");
  return kq;
}

/**
 * Tạo thư mục Drive và album bằng tay cho một hợp đồng đã có.
 *
 * Đường lui của việc chạy nền ở `lapHopDongAction`, và cũng là cách dùng cho
 * 2.400 hợp đồng lập từ trước ngày có tính năng này.
 */
export async function taoThuMucAlbumAction(
  hopDongId: string,
  /** Tên hiện trên album; bỏ trống thì lấy tên khách trên hợp đồng. */
  ten?: string,
  /**
   * Người bấm đã nhìn thấy album đang có và vẫn muốn tạo thêm.
   *
   * Thêm 15/11/2026 sau khi anh gặp hợp đồng có hai album trùng nhau. Nhật ký
   * cho thấy web tạo một cái lúc lập (05:33:55), người lập bấm nút tạo cái nữa
   * hai mươi giây sau (05:34:15) — vì việc tự tạo chạy nền, trang lúc đó vẫn
   * hiện "Chưa có album nào" kèm nút bấm được ngay.
   *
   * Giấu nút là chưa đủ: server action là đường mạng công khai (nguyên tắc 3),
   * và chính cuộc đua trên kia khiến nút hiện ra đúng lúc không nên hiện. Chặn
   * phải nằm ở đây.
   */
  dongYThemNua?: boolean,
): Promise<
  | { loi: string }
  | { daCo: string[] }
  /** `canChiaSe` khác null = thư mục đã tạo nhưng chưa chia sẻ được, ảnh sẽ không hiện. */
  | { ok: true; slug: string; tenAlbum: string; canChiaSe: string | null }
> {
  const nguoi = await nguoiDuocLap();
  if (!nguoi) return { loi: "Tài khoản này chưa được lập hợp đồng, hoặc phiên đăng nhập đã hết." };

  /*
    KHÔNG chặn cứng, chỉ hỏi lại. Một hợp đồng cưới hai ngày có HAI album thật
    — HER cho nhà gái, HIS cho nhà trai — nên "đã có album rồi" không có nghĩa
    là sai. Thứ cần chặn là bấm vì tưởng chưa có.
  */
  if (!dongYThemNua) {
    const daCo = await getPrisma().gallery.findMany({
      where: { hopDongId },
      select: { title: true, clientName: true },
      orderBy: { createdAt: "asc" },
    });
    if (daCo.length > 0) return { daCo: daCo.map((a) => a.title || a.clientName || "(chưa đặt tên)") };
  }

  const kq = await taoThuMucVaAlbum(hopDongId, ten);
  if (!kq.ok) return { loi: kq.loi };

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "tao-album-tu-hop-dong",
    doiTuong: "HopDong",
    doiTuongId: hopDongId,
    chiTiet: {
      album: kq.tenAlbum,
      thuMuc: kq.tenThuMuc,
      thuMucDrive: kq.thuMucDrive,
      o: kq.ketNoi,
      bangTay: true,
      ...(kq.canChiaSe ? { chuaChiaSeVoi: kq.canChiaSe } : {}),
    },
  });

  revalidatePath(`/quan-ly/hop-dong/${hopDongId}`);
  revalidatePath("/admin");
  return { ok: true, slug: kq.slug, tenAlbum: kq.tenAlbum, canChiaSe: kq.canChiaSe };
}

/* ── Sửa hợp đồng, phiếu thu (anh chốt 23/09/2026) ─────────────────────── */

export async function suaHopDongAction(
  id: string,
  du: DuLieuSuaHopDong,
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDuocLap();
  if (!nguoi) return { loi: "Tài khoản này chưa được sửa hợp đồng, hoặc phiên đăng nhập đã hết." };

  const kq = await suaHopDong(id, du, nguoi);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "sua-hop-dong",
    doiTuong: "HopDong",
    doiTuongId: id,
    chiTiet: { ten: du.tenKhach, soDong: du.dong.length },
  });
  revalidatePath("/quan-ly/hop-dong");
  revalidatePath(`/quan-ly/hop-dong/${id}`);
  return kq;
}

export async function themPhieuThuAction(
  hopDongId: string,
  du: DuLieuPhieuThu,
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDuocLap();
  if (!nguoi) return { loi: "Tài khoản này chưa được lập phiếu thu, hoặc phiên đăng nhập đã hết." };

  const kq = await themPhieuThu(hopDongId, du, nguoi);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "them-phieu-thu",
    doiTuong: "PhieuThu",
    doiTuongId: hopDongId,
    chiTiet: { soTien: du.soTien, hinhThuc: du.hinhThuc, noiDung: du.noiDung },
  });
  revalidatePath(`/quan-ly/hop-dong/${hopDongId}`);
  revalidatePath("/quan-ly/phieu-thu");
  return kq;
}

/**
 * Duyệt phiếu thu — CHỈ quản lý. Sale lập phiếu thì phiếu nằm chờ; người duyệt
 * phải là người khác, không thì bước duyệt chỉ là một cú bấm cho có.
 */
export async function duyetPhieuThuAction(id: string): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDuocLap();
  if (!nguoi?.laQuanLy) return { loi: "Chỉ quản lý mới duyệt được phiếu thu." };

  const kq = await duyetPhieuThu(id, nguoi);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "duyet-phieu-thu",
    doiTuong: "PhieuThu",
    doiTuongId: id,
  });
  revalidatePath("/quan-ly/phieu-thu");
  revalidatePath("/quan-ly/hop-dong");
  return { ok: true };
}

export async function xoaPhieuThuAction(id: string): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDuocLap();
  if (!nguoi?.laQuanLy) return { loi: "Chỉ quản lý mới xoá được phiếu thu." };

  const kq = await xoaPhieuThu(id);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "xoa-phieu-thu",
    doiTuong: "PhieuThu",
    doiTuongId: id,
  });
  revalidatePath("/quan-ly/phieu-thu");
  if (kq.hopDongId) revalidatePath(`/quan-ly/hop-dong/${kq.hopDongId}`);
  return { ok: true };
}

/**
 * Xoá hẳn hợp đồng — CHỈ quản lý, và phải gõ lại đúng mã. Kéo theo phiếu thu,
 * lịch chụp, đầu việc của hợp đồng đó (xem `xoaHopDong`).
 */
export async function xoaHopDongAction(
  id: string,
  maGoLai: string,
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDuocLap();
  if (!nguoi?.laQuanLy) return { loi: "Chỉ quản lý mới xoá được hợp đồng." };

  const kq = await xoaHopDong(id, maGoLai);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "xoa-hop-dong",
    doiTuong: "HopDong",
    doiTuongId: id,
    chiTiet: { ten: kq.maHD },
  });
  revalidatePath("/quan-ly/hop-dong");
  revalidatePath("/quan-ly/phieu-thu");
  revalidatePath("/quan-ly/lich");
  revalidatePath("/quan-ly/cong-viec");
  return { ok: true };
}

/** Một dòng lịch chụp gõ ở trang hợp đồng. */
export type DongLichSua = {
  /** Có id là dòng cũ, không có là dòng vừa thêm. */
  id?: string;
  ngay: string;
  /** "HH:MM" hoặc rỗng. Giờ hẹn có mặt — xem chú thích ở model `LichChup`. */
  gio: string;
  loai: string;
  ghiChu: string;
  trangThai: string;
};

/**
 * Lưu cả cụm lịch chụp của một hợp đồng: dòng cũ thì sửa, dòng mới thì thêm,
 * dòng form không gửi lên nữa thì xoá.
 *
 * Làm "cả cụm" thay vì từng nút thêm/sửa/xoá riêng vì lịch của một hợp đồng
 * thường sửa theo chùm — khách dời ngày là ba buổi dời theo, mỗi buổi một lượt
 * lưu thì nửa chừng hỏng là lịch còn một nửa cũ một nửa mới.
 */
export async function luuLichAction(
  hopDongId: string,
  dong: DongLichSua[],
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDuocLap();
  if (!nguoi) return { loi: "Tài khoản này chưa được sửa lịch, hoặc phiên đăng nhập đã hết." };

  const prisma = getPrisma();
  const hd = await prisma.hopDong.findUnique({
    where: { id: hopDongId },
    select: { tenKhach: true, khachHang: { select: { soDienThoai: true } } },
  });
  if (!hd) return { loi: "Hợp đồng này không còn." };

  const sach: (DongLichSua & { hienThi: string })[] = [];
  for (const [i, d] of dong.entries()) {
    const ngay = String(d.ngay ?? "").trim();
    if (!ngay) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return { loi: `Ngày của dòng ${i + 1} chưa đúng.` };
    /* Giờ KHÔNG bắt buộc — 1.454 buổi cũ đều không có giờ, bắt buộc là chặn mọi lần sửa. */
    const gio = String(d.gio ?? "").trim();
    if (gio && !/^([01]\d|2[0-3]):[0-5]\d$/.test(gio)) return { loi: `Giờ của dòng ${i + 1} chưa đúng.` };
    sach.push({
      id: d.id,
      ngay,
      gio,
      loai: String(d.loai ?? "").trim() || "Ngày chụp",
      ghiChu: String(d.ghiChu ?? "").trim(),
      trangThai: String(d.trangThai ?? "").trim() || "Chưa làm",
      // Dòng chữ vẽ lên lịch, ghép như lúc lập hợp đồng.
      hienThi: [hd.tenKhach, ngayVN(ngay), hd.khachHang?.soDienThoai].filter(Boolean).join(" - "),
    });
  }

  const maNV = maNguoiLap(nguoi);
  await prisma.$transaction(async (tx) => {
    const cu = await tx.lichChup.findMany({ where: { hopDongId }, select: { id: true } });
    const giuLai = new Set(sach.map((d) => d.id).filter(Boolean) as string[]);
    const boDi = cu.filter((c) => !giuLai.has(c.id)).map((c) => c.id);
    if (boDi.length) await tx.lichChup.deleteMany({ where: { id: { in: boDi } } });

    for (const d of sach) {
      const data = {
        ngay: d.ngay,
        gio: d.gio || null,
        loai: d.loai,
        ghiChu: d.ghiChu || null,
        trangThai: d.trangThai,
        hienThi: d.hienThi,
      };
      if (d.id) await tx.lichChup.update({ where: { id: d.id }, data });
      else await tx.lichChup.create({ data: { ...data, hopDongId, nguoiTaoMaNV: maNV } });
    }
  });

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "sua-lich-chup",
    doiTuong: "HopDong",
    doiTuongId: hopDongId,
    chiTiet: { ten: hd.tenKhach, soBuoi: sach.length },
  });
  revalidatePath(`/quan-ly/hop-dong/${hopDongId}`);
  revalidatePath("/quan-ly/lich");
  return { ok: true };
}

export type DuLieuFormHopDong = {
  dichVu: {
    id: string;
    maDV: string;
    ten: string;
    loai: string;
    nhom: string | null;
    donGia: number;
    donVi: string | null;
    chiTiet: string | null;
  }[];
  giaHangMuc: { dichVuId: string; hangMuc: string | null; donGia: number }[];
  /** maDV → số lần đã dùng trong hợp đồng; xếp danh sách lúc duyệt. */
  luotDung: Record<string, number>;
  homNay: string;
  laQuanLy: boolean;
  tenNguoiLap: string;
  /** Mười tám bước, đọc từ bảng `BuocHopDong` (đợt 6). Bảng rỗng thì là `CAC_BUOC`. */
  cacBuoc: string[];
};

/**
 * Bảng dịch vụ và bảng giá hạng mục cho cửa sổ lập hợp đồng (anh yêu cầu
 * 23/09/2026: bấm "Lập hợp đồng" thì mở cửa sổ ngay tại trang, không nhảy sang
 * trang khác).
 *
 * Tải khi BẤM NÚT chứ không tải sẵn lúc mở trang danh sách: 1.018 dịch vụ và
 * 313 dòng bảng giá là hai câu hỏi database mà phần lớn lượt mở trang không
 * dùng tới (nguyên tắc 53). Bù lại, tải xong thì cả cửa sổ lọc ngay trong máy,
 * gõ tìm dịch vụ không tốn thêm lượt nào.
 */
export async function duLieuFormHopDongAction(): Promise<{ loi: string } | DuLieuFormHopDong> {
  const nguoi = await nguoiDuocLap();
  if (!nguoi) return { loi: "Tài khoản này chưa được lập hợp đồng, hoặc phiên đăng nhập đã hết." };

  const prisma = getPrisma();
  const [dichVu, giaHangMuc, luotDung, cacBuoc] = await Promise.all([
    prisma.dichVu.findMany({
      where: { dangDung: true },
      orderBy: [{ loai: "asc" }, { ten: "asc" }],
      select: { id: true, maDV: true, ten: true, loai: true, nhom: true, donGia: true, donVi: true, chiTiet: true, maAlbum: true },
    }),
    prisma.giaHangMuc.findMany({
      orderBy: { taoLuc: "asc" },
      select: { dichVuId: true, hangMuc: true, donGia: true },
    }),
    demLuotDung(),
    docCacBuoc(),
  ]);

  return {
    dichVu,
    giaHangMuc,
    luotDung,
    cacBuoc,
    // Hôm nay theo giờ studio, không theo giờ máy khách (nguyên tắc 35).
    homNay: new Intl.DateTimeFormat("en-CA", {
      timeZone: MUI_GIO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    laQuanLy: nguoi.laQuanLy,
    tenNguoiLap: nguoi.ten,
  };
}
