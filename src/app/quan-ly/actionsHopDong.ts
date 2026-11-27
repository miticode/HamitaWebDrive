"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getPrisma } from "@/lib/db";
import { phangBuoi } from "@/lib/dichVuChung";
import { boDau, homNayStudio, MUI_GIO } from "@/lib/constants";
import { layNguoiDung, lapHopDong } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { docCacBuoc } from "@/lib/buocHopDong";
import { demLuotDung } from "@/lib/dichVuHayDung";
import {
  capNhatBuocDaChup,
  capNhatBuocTheoNgay,
  capNhatBuocTuDauBuoi,
  capNhatChuyenNhanh,
} from "@/lib/trangThaiBuoi";
import { buocSauKhiGiaoKhach, buocSauKhiNhanHinhIn, tenBuocTheoSo } from "@/lib/buocAnhGoc";
import { coGiaoAnh, taoThuMucVaAlbum } from "@/lib/thuMucHopDong";
import { docLoaiBuoi } from "@/lib/loaiBuoi";
import { docBaDanhMuc } from "@/lib/danhMuc";
import { docMaAlbum } from "@/lib/docMaAlbum";
import { lapHopDongMoi, maNguoiLap, type NguoiLap } from "@/lib/taoHopDong";
import {
  LY_DO_TRONG_NGAY,
  ngayVN,
  type DuLieuHopDongMoi,
  type DuLieuPhieuThu,
  type DuLieuSuaHopDong,
} from "@/lib/hopDongChung";
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
    CHỈNH BƯỚC 1 ↔ 2 NGAY LÚC LẬP — anh yêu cầu 27/11/2026.

    Bước lúc lập do người lập CHỌN trong form, nên họ có thể chọn "1. Chưa có
    ngày chụp" rồi điền ngày vào lịch ngay bên dưới, hoặc chọn "2. Đã có ngày
    chụp" mà để lịch trống. Đo 27/11: 4 hợp đồng ở cảnh đầu, 5 ở cảnh sau.

    Chỉnh ở đây thì hợp đồng không bao giờ sinh ra đã sai; chờ tới lần sửa
    lịch đầu tiên mới chỉnh thì những nhà không ai đụng vào lịch sẽ sai mãi.
  */
  await capNhatChuyenNhanh(kq.id, { id: nguoi.id || null, ten: nguoi.ten });
  await capNhatBuocTheoNgay(kq.id, { id: nguoi.id || null, ten: nguoi.ten });

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
      /*
        Lọc lại ở máy chủ: trình duyệt gửi gì cũng phải nằm trong bộ mã.

        Đọc bộ mã TỪ BẢNG, không dùng bộ cứng — từ 19/11/2026 quản lý tự thêm
        mã được, và một mã vừa thêm phải dùng được ngay.
      */
      const boMaThat = await docMaAlbum();
      const maSach = maAlbum?.filter((x) => boMaThat.some((m) => m.ma === x));
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
              ...(album.gopVaoAlbumCu
                ? { gopVaoAlbumCu: album.gopVaoAlbumCu.tenAlbumCu }
                : {}),
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
  | {
      ok: true;
      slug: string;
      tenAlbum: string;
      canChiaSe: string | null;
      /** Khác null = không tạo album mới mà gộp vào album sẵn có của khách. */
      gopVaoAlbumCu: { tenAlbumCu: string; tenLoiTat: string } | null;
    }
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
      /*
        Ghi rõ đã gộp vào album nào — đây là chỗ web quyết KHÔNG tạo album
        mới, mà người bấm nút thì đang chờ một album mới hiện ra. Không ghi
        lại thì sau này không ai tra được vì sao nhà này chỉ có một album
        trong khi có ba hợp đồng.
      */
      ...(kq.gopVaoAlbumCu ? { gopVaoAlbumCu: kq.gopVaoAlbumCu.tenAlbumCu } : {}),
    },
  });

  revalidatePath(`/quan-ly/hop-dong/${hopDongId}`);
  revalidatePath("/admin");
  return {
    ok: true,
    slug: kq.slug,
    tenAlbum: kq.tenAlbum,
    canChiaSe: kq.canChiaSe,
    gopVaoAlbumCu: kq.gopVaoAlbumCu,
  };
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
  /** "" hoặc "YYYY-MM-DD". Rỗng = buổi đã bán nhưng chưa biết ngày. */
  ngay: string;
  /** "HH:MM" hoặc rỗng. Giờ hẹn có mặt — xem chú thích ở model `LichChup`. */
  gio: string;
  loai: string;
  /** Chỉ có nghĩa khi `ngay` rỗng — xem `LY_DO_TRONG_NGAY`. */
  lyDoTrong: string;
  ghiChu: string;
  trangThai: string;
  /*
    HAI DẤU CỦA RIÊNG BUỔI NÀY — anh yêu cầu 26/11/2026. Boolean ở đây, còn
    database lưu MỐC THỜI GIAN: form chỉ cần biết tick hay không, nhưng "đã
    giao lúc nào" trả lời được cả câu "đã giao chưa", còn ngược lại thì không.
  */
  daGiaoVay: boolean;
  daGuiAnhGoc: boolean;
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
    const loaiBuoi = String(d.loai ?? "").trim();
    /* Dòng trống trơn thì bỏ; có loại buổi mà chưa có ngày thì GIỮ — xem `kiemHopDongMoi`. */
    if (!ngay && !loaiBuoi) continue;
    if (ngay && !/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return { loi: `Ngày của dòng ${i + 1} chưa đúng.` };
    /* Giờ KHÔNG bắt buộc — 1.454 buổi cũ đều không có giờ, bắt buộc là chặn mọi lần sửa. */
    const gio = String(d.gio ?? "").trim();
    if (gio && !/^([01]\d|2[0-3]):[0-5]\d$/.test(gio)) return { loi: `Giờ của dòng ${i + 1} chưa đúng.` };
    sach.push({
      id: d.id,
      ngay,
      gio,
      loai: loaiBuoi || "Ngày chụp",
      /* Có ngày rồi thì lý do vô nghĩa — xoá kẻo còn sót "đã hoãn" từ lần trước. */
      lyDoTrong: ngay ? "" : String(d.lyDoTrong ?? "").trim() || LY_DO_TRONG_NGAY[0],
      ghiChu: String(d.ghiChu ?? "").trim(),
      trangThai: String(d.trangThai ?? "").trim() || "Chưa làm",
      daGiaoVay: !!d.daGiaoVay,
      daGuiAnhGoc: !!d.daGuiAnhGoc,
      // Dòng chữ vẽ lên lịch, ghép như lúc lập hợp đồng.
      hienThi: [hd.tenKhach, ngay ? ngayVN(ngay) : "chưa có ngày", hd.khachHang?.soDienThoai]
        .filter(Boolean)
        .join(" - "),
    });
  }

  const maNV = maNguoiLap(nguoi);
  await prisma.$transaction(async (tx) => {
    /*
      Đọc cả hai mốc cũ để KHÔNG GHI ĐÈ THỜI GIAN. Tick vẫn bật mà mỗi lần
      lưu lịch lại đặt `new Date()` thì "đã gửi ảnh gốc 20/11" biến thành
      "26/11" chỉ vì ai đó sửa ghi chú của buổi — mất luôn mốc thật.
    */
    const cu = await tx.lichChup.findMany({
      where: { hopDongId },
      select: { id: true, daGiaoVay: true, daGuiAnhGoc: true },
    });
    const mocCu = new Map(cu.map((c) => [c.id, c]));
    const giuLai = new Set(sach.map((d) => d.id).filter(Boolean) as string[]);
    const boDi = cu.filter((c) => !giuLai.has(c.id)).map((c) => c.id);
    if (boDi.length) await tx.lichChup.deleteMany({ where: { id: { in: boDi } } });

    const bayGio = new Date();
    for (const d of sach) {
      const truoc = d.id ? mocCu.get(d.id) : undefined;
      const data = {
        ngay: d.ngay || null,
        gio: d.gio || null,
        loai: d.loai,
        lyDoTrong: d.lyDoTrong || null,
        ghiChu: d.ghiChu || null,
        trangThai: d.trangThai,
        hienThi: d.hienThi,
        daGiaoVay: d.daGiaoVay ? (truoc?.daGiaoVay ?? bayGio) : null,
        daGuiAnhGoc: d.daGuiAnhGoc ? (truoc?.daGuiAnhGoc ?? bayGio) : null,
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

  const nguoiGon = { id: nguoi.id || null, ten: nguoi.ten };

  /*
    BỐN PHÉP ĐỔI BƯỚC, chạy theo đúng thứ tự để một lượt lưu đẩy được tới đích
    thay vì phải lưu mấy lần:

      → 10    chuyển sang nhánh tiệc         (anh yêu cầu 27/11/2026)
      1 ↔ 2   lịch có ngày hay chưa
      → 3/12  mọi buổi đã chụp xong
      → 4/13  mọi buổi đã đánh dấu gửi ảnh gốc

    CHUYỂN NHÁNH ĐỨNG ĐẦU, không phải 1 ↔ 2: nhà chỉ có buổi tiệc mà đứng ở
    bước 1 thì phải sang 10, chứ để phép 1 ↔ 2 chạy trước là đẩy nó sâu thêm
    một nấc vào nhánh sai rồi mắc kẹt ở đó — đúng cảnh hai hợp đồng đo được
    sáng 27/11.

    Cả bốn đều tự từ chối khi bước hiện tại không phải chỗ của mình, nên gọi
    thừa không hại gì — nhưng gọi NGƯỢC thứ tự thì hại.
  */
  await capNhatChuyenNhanh(hopDongId, nguoiGon);
  await capNhatBuocTheoNgay(hopDongId, nguoiGon);

  /*
    Người tự tay đánh dấu buổi cuối là "Hoàn thành" thì hợp đồng cũng phải
    sang chặng Chụp, y như khi thợ bấm xong đầu việc — không thì cùng một
    việc mà làm bằng hai đường lại ra hai kết quả.
  */
  await capNhatBuocDaChup(hopDongId, nguoiGon);

  /*
    Rồi tính lại bước từ DẤU TRÊN TỪNG BUỔI — anh yêu cầu 26/11/2026.

    Chạy SAU `capNhatBuocDaChup` chứ không trước: cái kia nâng lên 3/12, cái
    này nâng tiếp lên 4/13. Cả hai đều chỉ nâng nên không giẫm chân nhau,
    nhưng chạy ngược thứ tự thì phải lưu hai lần mới tới đích.
  */
  await capNhatBuocTuDauBuoi(hopDongId, nguoiGon);

  revalidatePath(`/quan-ly/hop-dong/${hopDongId}`);
  revalidatePath("/quan-ly/lich");
  revalidatePath("/quan-ly/hop-dong");
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
    /*
      Buổi chụp mặc định, đã làm phẳng thành mảng tên.

      PHẢI khai ở đây, không được quên: `phangBuoi` có trả về trường này,
      nhưng kiểu khai báo thiếu thì TypeScript lặng lẽ cắt nó đi khi gán, và
      cửa sổ lập hợp đồng mất danh sách mà không ai báo. Đúng loại lỗi đã xảy
      ra hôm 18/11 với danh sách loại buổi.
    */
    buoi: string[];
  }[];
  giaHangMuc: { dichVuId: string; hangMuc: string | null; donGia: number; buoiThu: number | null }[];
  /** Loại buổi chụp đang dùng, đọc từ bảng `LoaiBuoi`. */
  loaiBuoi: { ten: string; maAlbum: string | null }[];
  /** Ba danh mục nhỏ, đọc từ bảng `DanhMuc`. */
  danhMuc: { loaiHopDong: string[]; hinhThucThu: string[]; noiDungThu: string[] };
  /** Bộ mã album, đọc từ bảng `MaAlbum`. */
  boMa: { ma: string; nghia: string | null }[];
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
  const [dichVu, giaHangMuc, luotDung, cacBuoc, loaiBuoi, danhMuc, boMa] = await Promise.all([
    prisma.dichVu.findMany({
      where: { dangDung: true },
      orderBy: [{ loai: "asc" }, { ten: "asc" }],
      select: {
        id: true, maDV: true, ten: true, loai: true, nhom: true, donGia: true, donVi: true,
        chiTiet: true,
        buoi: { select: { loaiBuoi: { select: { ten: true } } }, orderBy: { thuTu: "asc" } },
      },
    }),
    prisma.giaHangMuc.findMany({
      orderBy: { taoLuc: "asc" },
      select: { dichVuId: true, hangMuc: true, donGia: true, buoiThu: true },
    }),
    demLuotDung(),
    docCacBuoc(),
    docLoaiBuoi(),
    docBaDanhMuc(),
    docMaAlbum(),
  ]);

  return {
    dichVu: phangBuoi(dichVu),
    giaHangMuc,
    luotDung,
    cacBuoc,
    loaiBuoi,
    danhMuc,
    boMa,
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

/* ── Hai khâu cuối: nhận hình in, giao khách (anh yêu cầu 27/11/2026) ─── */

/**
 * Xác nhận HÌNH IN ĐÃ VỀ TIỆM, hoặc ĐÃ GIAO CHO KHÁCH.
 *
 * Một action cho cả hai việc, vì chúng y hệt nhau về phần máy móc: tra bước,
 * tính bước đích, đổi, ghi nhật ký. Thứ duy nhất khác là phép tính bước và
 * tên hành động — truyền vào bằng `viec`.
 *
 * KIỂM BƯỚC Ở MÁY CHỦ, không chỉ dựa vào việc trang đã giấu nút (nguyên tắc
 * 3): server action là một đường mạng công khai, mà đây là đổi tiến độ của cả
 * một nhà khách, lại đúng vào hai bước cuối — bấm nhầm là hợp đồng báo "hoàn
 * thành" trong khi khách chưa cầm hình.
 */
export async function xacNhanKhauCuoiAction(
  hopDongId: string,
  viec: "nhan-hinh" | "giao-khach",
): Promise<{ loi: string } | { ok: true; den: string }> {
  const nguoi = await nguoiDuocLap();
  if (!nguoi) return { loi: "Tài khoản này chưa được sửa hợp đồng, hoặc phiên đăng nhập đã hết." };

  const prisma = getPrisma();
  const hd = await prisma.hopDong.findUnique({
    where: { id: hopDongId },
    select: { maHD: true, tenKhach: true, buoc: true, trangThai: true },
  });
  if (!hd) return { loi: "Hợp đồng này không còn." };

  const tinh = viec === "nhan-hinh" ? buocSauKhiNhanHinhIn : buocSauKhiGiaoKhach;
  const dich = tinh(hd.buoc);
  if (dich === null) {
    return {
      loi:
        viec === "nhan-hinh"
          ? "Hợp đồng không ở bước “Gửi in” nên chưa xác nhận nhận hình được."
          : "Hợp đồng không ở bước “Đã nhận hình in” nên chưa xác nhận giao khách được.",
    };
  }

  const ten = tenBuocTheoSo(await docCacBuoc(), dich);
  if (!ten) return { loi: "Bảng bước không có bước này — nhờ anh chị kiểm lại ở Quản lý dịch vụ." };

  const cu = hd.trangThai ?? "chưa gõ bước";
  await prisma.hopDong.update({ where: { id: hopDongId }, data: { trangThai: ten, buoc: dich } });

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: viec === "nhan-hinh" ? "doi-buoc-nhan-hinh" : "doi-buoc-giao-khach",
    doiTuong: "HopDong",
    doiTuongId: hopDongId,
    chiTiet: {
      ten: `${hd.tenKhach} (${hd.maHD})`,
      doi: { "trạng thái": { truoc: cu, sau: ten } },
    },
  });

  revalidatePath(`/quan-ly/hop-dong/${hopDongId}`);
  revalidatePath("/quan-ly/hop-dong");
  return { ok: true, den: ten };
}
