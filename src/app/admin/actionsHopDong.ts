"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { quyenAlbum } from "@/lib/quyenAlbum";
import { layNguoiDung } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { timHopDong, type HopDongGon } from "@/lib/noiAlbum";
import {
  buocSauKhiGuiIn,
  buocSauKhiStudioGuiAnh,
  laLuotGuiHoanThien,
} from "@/lib/buocAnhGoc";
import { nhanhCuaBuoc, nhanhCuaBuoi } from "@/lib/nhanhBuoi";
import { hopDongChoThaoTac } from "@/lib/albumChung";
import { capNhatBuocTuDauBuoi } from "@/lib/trangThaiBuoi";
import { ngayVN } from "@/lib/hopDongChung";
import { tachLink } from "@/lib/guiIn";
import { doiBuocAlbum, type KetQuaDoiBuoc } from "@/lib/doiBuocAlbum";

/**
 * Gắn album ảnh vào hợp đồng, và ô tìm hợp đồng của trang album.
 *
 * Tách khỏi actions.ts cho tệp đó khỏi phình. Ai mở được trang album thì gắn
 * được — đây là việc làm hằng ngày, không phải việc nguy hiểm: gắn nhầm thì
 * bấm "Bỏ gắn" là xong, không mất dữ liệu của ai.
 */

export async function timHopDongAction(q: string): Promise<HopDongGon[]> {
  if (!(await quyenAlbum())) return [];
  return timHopDong(q);
}

export async function ganHopDongAction(
  galleryId: string,
  hopDongId: string | null,
): Promise<{ loi?: string }> {
  if (!(await quyenAlbum())) return { loi: "Chưa đăng nhập." };
  const nguoi = await layNguoiDung();
  const prisma = getPrisma();

  const album = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { id: true, slug: true, title: true, clientName: true, hopDong: { select: { maHD: true, tenKhach: true } } },
  });
  if (!album) return { loi: "Không tìm thấy album." };

  let ten: string | null = null;
  if (hopDongId) {
    const hd = await prisma.hopDong.findUnique({ where: { id: hopDongId }, select: { maHD: true, tenKhach: true } });
    if (!hd) return { loi: "Không tìm thấy hợp đồng." };
    ten = `${hd.tenKhach} (${hd.maHD})`;
  }

  await prisma.gallery.update({ where: { id: galleryId }, data: { hopDongId } });
  await ghiNhatKy({
    nguoi,
    hanhDong: "gan-hop-dong",
    doiTuong: "Gallery",
    doiTuongId: galleryId,
    chiTiet: {
      ten: `${album.clientName ?? album.title}`,
      doi: {
        "hợp đồng": {
          truoc: album.hopDong ? `${album.hopDong.tenKhach} (${album.hopDong.maHD})` : null,
          sau: ten,
        },
      },
    },
  });

  revalidatePath(`/admin/${album.slug}`);
  revalidatePath("/quan-ly/hop-dong");
  if (hopDongId) revalidatePath(`/quan-ly/hop-dong/${hopDongId}`);
  return {};
}

/* ── Gửi ảnh gốc → đổi bước hợp đồng (anh yêu cầu 19/11/2026) ─────────── */

/**
 * Nút "Đã gửi file gốc" / "Đã gửi ảnh hoàn thiện" — dành cho album khách CHƯA
 * BẬT thông báo.
 *
 * Anh yêu cầu 19/11/2026. Đo cùng ngày: 59/182 album không ai bật thông báo,
 * nên nếu việc đổi bước chỉ đi kèm nút gửi tin thì một phần ba album không
 * bao giờ được đổi — đúng cái bệnh quên đổi bước mà anh muốn chữa.
 *
 * MỘT ACTION cho cả hai lượt gửi (ảnh gốc và ảnh hoàn thiện) từ 26/11/2026 —
 * bước hiện tại của hợp đồng quyết lượt nào, xem `buocSauKhiStudioGuiAnh`.
 *
 * KHÔNG gửi gì cho khách, chỉ đánh dấu việc studio đã làm.
 */
export async function daGuiAnhGocAction(galleryId: string): Promise<{ loi?: string } & KetQuaDoiBuoc> {
  if (!(await quyenAlbum())) return { loi: "Chưa đăng nhập." };
  return doiBuocSauKhiGuiTin(galleryId);
}

/**
 * Lõi dùng chung cho cả hai đường của NHÂN VIÊN: nút "Gửi thông báo" ở
 * actions.ts, và nút "Đã gửi file gốc" ngay trên.
 *
 * Quyền: ai mở được trang quản lý album thì làm được — `quyenAlbum()`. Đây là
 * việc hằng ngày của phòng Media, mà chính media là người up ảnh gốc. Bước đổi
 * sai thì sửa lại ở trang hợp đồng, không mất dữ liệu của ai.
 */
export async function doiBuocSauKhiGuiTin(galleryId: string): Promise<KetQuaDoiBuoc> {
  const nguoi = await layNguoiDung();

  /*
    LƯỢT GỬI ẢNH GỐC GIỜ ĐI QUA DẤU TRÊN TỪNG BUỔI — anh yêu cầu 26/11/2026.

    Trước đó nút này đổi bước thẳng, nên một nhà hai ngày cưới mới gửi ảnh gốc
    nhà gái là hợp đồng đã nhảy sang "13. Đã gửi ảnh gốc tiệc, chờ Khách chọn"
    trong khi nhà trai chưa chụp. Vá ở trang hợp đồng mà để nút này nguyên thì
    mâu thuẫn vẫn còn, chỉ là đi cửa khác.

    Lượt gửi ẢNH HOÀN THIỆN (bước 5 → 6) KHÔNG đi đường này: ảnh hoàn thiện
    không thuộc buổi nào cả, nó là sản phẩm của cả hợp đồng sau khi khách chọn.
  */
  const theoBuoi = await danhDauGuiAnhGocTheoBuoi(galleryId, nguoi);
  if (theoBuoi) {
    for (const d of theoBuoi.veLai ?? []) revalidatePath(d);
    return theoBuoi;
  }

  const kq = await doiBuocAlbum(
    galleryId,
    buocSauKhiStudioGuiAnh,
    /*
      Tên hành động theo BƯỚC CŨ, không viết cứng (anh báo 26/11/2026). Cùng
      một nút nhưng hai việc khác hẳn: ở bước 2/3 là gửi ảnh gốc, ở bước 5 là
      gửi ảnh hoàn thiện cho khách duyệt. Ghi chung một tên thì nhật ký nói sai.
    */
    (buocCu) => (laLuotGuiHoanThien(buocCu) ? "doi-buoc-hoan-thien" : "doi-buoc-anh-goc"),
    nguoi,
  );
  for (const d of kq.veLai ?? []) revalidatePath(d);
  return kq;
}

/**
 * Đánh dấu "đã gửi ảnh gốc" cho buổi của album này — anh yêu cầu 26/11/2026.
 *
 * Trả `null` khi KHÔNG phải việc của hàm này (album chưa gắn hợp đồng, hợp
 * đồng chưa gõ bước, hoặc đang ở lượt gửi ảnh hoàn thiện); lúc đó nơi gọi đi
 * tiếp đường cũ.
 *
 * BA CẢNH, ba cách xử khác hẳn nhau:
 *
 *   · còn đúng MỘT buổi cùng nhánh chưa đánh dấu → tick luôn buổi ấy. Không
 *     mơ hồ gì: album này gắn hợp đồng này, hợp đồng chỉ còn một buổi chờ.
 *   · còn NHIỀU buổi → không đoán. Nhà hai ngày cưới mà tick bừa thì một nửa
 *     khả năng là gắn nhà gái vào nhà trai, rồi hợp đồng lên bước 13 sai y
 *     như trước. Nói rõ còn mấy buổi và chỉ đường sang trang hợp đồng.
 *   · KHÔNG còn buổi nào → mọi buổi đã đánh dấu rồi; trả về `giuBuoc` để nút
 *     nói "giữ nguyên" thay vì im lặng.
 */
async function danhDauGuiAnhGocTheoBuoi(
  galleryId: string,
  nguoi: Awaited<ReturnType<typeof layNguoiDung>>,
): Promise<KetQuaDoiBuoc | null> {
  const prisma = getPrisma();
  const album = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { slug: true },
  });
  if (!album) return null;

  /*
    MỘT CỬA DUY NHẤT, không đọc thẳng `Gallery.hopDongId` — anh chốt
    27/11/2026 cho album dùng chung. Nút này nói về CẢ ALBUM chứ không về một
    thư mục nào, nên khi album mang nhiều hợp đồng thì nó không đủ thông tin
    và phải nói ra thay vì đoán.
  */
  const chon = await hopDongChoThaoTac(galleryId);
  if ("lyDo" in chon) {
    return chon.lyDo === "chua-gan" ? null : { khongRoHopDong: chon.lyDo };
  }
  const hd = await prisma.hopDong.findUnique({
    where: { id: chon.hopDongId },
    select: {
      id: true,
      tenKhach: true,
      maHD: true,
      buoc: true,
      trangThai: true,
      lich: { select: { id: true, loai: true, ngay: true, daGuiAnhGoc: true } },
    },
  });
  if (!hd) return null;

  const nhanh = nhanhCuaBuoc(hd.buoc);
  /* Chưa gõ bước, hoặc đang ở lượt ảnh hoàn thiện — để đường cũ lo. */
  if (nhanh === null || laLuotGuiHoanThien(hd.buoc)) return null;

  const cungNhanh = hd.lich.filter((l) => nhanhCuaBuoi(l.loai) === nhanh);
  /* Hợp đồng không có buổi nào thuộc nhánh này thì không có gì để tick. */
  if (cungNhanh.length === 0) return null;

  const chuaDanhDau = cungNhanh.filter((l) => l.daGuiAnhGoc === null);
  const veLai = [`/admin/${album.slug}`, "/quan-ly/hop-dong", `/quan-ly/hop-dong/${hd.id}`];

  if (chuaDanhDau.length === 0) {
    return { giuBuoc: { tenKhach: hd.tenKhach, buoc: hd.trangThai ?? "chưa gõ bước" } };
  }
  if (chuaDanhDau.length > 1) {
    return { canTickBuoi: { tenKhach: hd.tenKhach, soBuoi: chuaDanhDau.length, hopDongId: hd.id } };
  }

  const buoi = chuaDanhDau[0];
  await prisma.lichChup.update({ where: { id: buoi.id }, data: { daGuiAnhGoc: new Date() } });
  await ghiNhatKy({
    nguoi,
    hanhDong: "doi-buoc-anh-goc",
    doiTuong: "HopDong",
    doiTuongId: hd.id,
    chiTiet: {
      ten: `${hd.tenKhach} (${hd.maHD})`,
      doi: {
        "đã gửi ảnh gốc": {
          truoc: "chưa",
          sau: `${buoi.loai ?? "buổi"}${buoi.ngay ? ` ${ngayVN(buoi.ngay)}` : ""}`,
        },
      },
    },
  });

  const cu = hd.trangThai ?? "chưa gõ bước";
  const ten = await capNhatBuocTuDauBuoi(hd.id, nguoi);
  return ten
    ? { doiBuoc: { tenKhach: hd.tenKhach, tu: cu, den: ten }, veLai }
    : { giuBuoc: { tenKhach: hd.tenKhach, buoc: cu }, veLai };
}

/* ── Gửi in: dán link rồi chuyển bước (anh yêu cầu 19/11/2026) ─────────── */

/** Một đợt gửi in đã ghi, dạng gọn để trả về trình duyệt. */
export type DotGuiIn = {
  id: string;
  links: string[];
  ghiChu: string | null;
  nguoiTen: string;
  /** Chuỗi ISO — phía trình duyệt tự định dạng theo giờ studio (nguyên tắc 35). */
  luc: string;
};

/**
 * Ghi MỘT đợt gửi in rồi chuyển bước hợp đồng sang 7 (hoặc 16).
 *
 * Anh chốt 19/11/2026: phải dán link trước mới cho bấm chuyển bước. Nên hai
 * việc nằm trong MỘT lượt gọi, không phải hai nút — dán được mà quên bấm thì
 * lại đúng cái bệnh quên đổi bước đang chữa.
 *
 * Ghi đợt TRƯỚC, đổi bước sau. Nếu đổi bước hỏng thì đợt vẫn còn (truy được
 * đã gửi gì), còn làm ngược lại thì hợp đồng nói "đã gửi in" mà không có link
 * nào chứng minh.
 */
export async function guiInAction(
  galleryId: string,
  linkTho: string,
  ghiChu: string,
): Promise<{ loi?: string; dot?: DotGuiIn } & KetQuaDoiBuoc> {
  if (!(await quyenAlbum())) return { loi: "Chưa đăng nhập." };

  const kq = tachLink(linkTho);
  if ("loi" in kq) return kq;

  const nguoi = await layNguoiDung();
  const prisma = getPrisma();

  const album = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { id: true },
  });
  if (!album) return { loi: "Không tìm thấy album." };

  /*
    Hợp đồng nào — hỏi một cửa duy nhất (anh chốt 27/11/2026). Ô "Đợt nào"
    trong popup là chữ tự do ("nhà gái", "photobook"), không phải tên thư mục,
    nên không dùng nó để tra được; album nhiều hợp đồng thì nói ra.
  */
  const chonIn = await hopDongChoThaoTac(galleryId);
  if ("lyDo" in chonIn) {
    return {
      loi:
        chonIn.lyDo === "chua-gan"
          ? "Album chưa gắn hợp đồng."
          : "Album này dùng chung cho nhiều hợp đồng — vào trang hợp đồng gắn thư mục rồi gửi in.",
    };
  }
  const hdIn = await prisma.hopDong.findUnique({
    where: { id: chonIn.hopDongId },
    select: { buoc: true },
  });

  /*
    Kiểm bước Ở ĐÂY nữa, không chỉ dựa vào việc trang đã giấu nút (nguyên tắc
    3). Server action là một đường mạng công khai, mà đây là việc đổi tiến độ
    của cả một nhà khách.
  */
  if (buocSauKhiGuiIn(hdIn?.buoc) === null) {
    return {
      loi: hdIn
        ? "Hợp đồng không ở bước “Chờ Khách duyệt” nên chưa gửi in được."
        : "Album chưa gắn hợp đồng.",
    };
  }

  const dot = await prisma.guiIn.create({
    data: {
      galleryId,
      links: kq.links,
      ghiChu: ghiChu.trim().slice(0, 200) || null,
      nguoiMaNV: nguoi?.maNV ?? null,
      nguoiTen: nguoi?.ten ?? "(không rõ)",
    },
    select: { id: true, links: true, ghiChu: true, nguoiTen: true, luc: true },
  });

  await ghiNhatKy({
    nguoi,
    hanhDong: "gui-in",
    doiTuong: "Gallery",
    doiTuongId: galleryId,
    chiTiet: { ten: dot.ghiChu ?? "Gửi in", so: { "số link": kq.links.length } },
  });

  const buoc = await doiBuocSauKhiGuiIn(galleryId);
  return { dot: { ...dot, luc: dot.luc.toISOString() }, ...buoc };
}

/** Lõi đổi bước của việc gửi in — tách ra để `guiInAction` đọc được dễ. */
async function doiBuocSauKhiGuiIn(galleryId: string): Promise<KetQuaDoiBuoc> {
  const kq = await doiBuocAlbum(galleryId, buocSauKhiGuiIn, "gui-in", await layNguoiDung());
  for (const d of kq.veLai ?? []) revalidatePath(d);
  return kq;
}

/**
 * LỊCH SỬ GỬI IN của một album — anh yêu cầu 19/11/2026, hiện trong cửa sổ Logs.
 *
 * Đọc khi MỞ cửa sổ chứ không tải sẵn theo thẻ, y như `docLogAction`: lưới có
 * mấy chục thẻ mà chín phần mười không ai mở ra xem (nguyên tắc 53).
 */
export async function docGuiInAction(galleryId: string): Promise<{ loi?: string; ds?: DotGuiIn[] }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  try {
    const ds = await getPrisma().guiIn.findMany({
      where: { galleryId },
      select: { id: true, links: true, ghiChu: true, nguoiTen: true, luc: true },
      orderBy: { luc: "asc" },
    });
    return { ds: ds.map((d) => ({ ...d, luc: d.luc.toISOString() })) };
  } catch {
    return { loi: "Không đọc được lịch sử gửi in lúc này." };
  }
}
