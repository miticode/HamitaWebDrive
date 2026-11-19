"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { layNguoiDung, laQuanTri } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { docMaAlbum } from "@/lib/docMaAlbum";

/**
 * Quản lý LOẠI BUỔI CHỤP — anh yêu cầu 18/11/2026.
 *
 * Quyền: chỉ quản lý. Đây là danh mục dùng chung cho cả tiệm, đổi một dòng ở
 * đây là đổi ô chọn của mọi người đang lập hợp đồng, và còn kéo theo mã album.
 *
 * Quyền kiểm Ở ĐÂY mỗi lượt gọi, không tin việc trang đã giấu nút — server
 * action là một đường mạng công khai (nguyên tắc 3).
 */

async function quanLy() {
  const nguoi = await layNguoiDung();
  return nguoi && laQuanTri(nguoi) ? nguoi : null;
}

function kiemTen(ten: string): { loi: string } | { ten: string } {
  const sach = ten.trim().replace(/[ \t]+/g, " ");
  if (!sach) return { loi: "Thiếu tên loại buổi." };
  if (sach.length > 60) return { loi: "Tên dài quá, tối đa 60 ký tự." };
  return { ten: sach };
}

async function kiemMa(ma: string): Promise<{ loi: string } | { ma: string | null }> {
  const sach = ma.trim();
  if (!sach) return { ma: null };
  /* Đọc bảng, không dùng bộ cứng: mã vừa thêm phải gắn được ngay (19/11/2026). */
  if (!(await docMaAlbum()).some((m) => m.ma === sach)) return { loi: "Mã album không có trong bộ mã." };
  return { ma: sach };
}

export async function themLoaiBuoiAction(ten: string, maAlbum: string): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được danh mục này." };

  const t = kiemTen(ten);
  if ("loi" in t) return t;
  const m = await kiemMa(maAlbum);
  if ("loi" in m) return m;

  const prisma = getPrisma();
  /* Trùng tên khác hoa thường cũng chặn: "nhà gái" và "Nhà Gái" nhìn là một. */
  const trung = await prisma.loaiBuoi.findFirst({
    where: { ten: { equals: t.ten, mode: "insensitive" } },
    select: { ten: true },
  });
  if (trung) return { loi: `Đã có loại “${trung.ten}”.` };

  try {
    const sau = await prisma.loaiBuoi.aggregate({ _max: { thuTu: true } });
    const x = await prisma.loaiBuoi.create({
      data: { ten: t.ten, maAlbum: m.ma, thuTu: (sau._max.thuTu ?? 0) + 1 },
    });
    await ghiNhatKy({
      nguoi,
      hanhDong: "them-loai-buoi",
      doiTuong: "LoaiBuoi",
      doiTuongId: x.id,
      chiTiet: { ten: t.ten, maAlbum: m.ma },
    });
  } catch (loi) {
    if (loi instanceof Prisma.PrismaClientKnownRequestError && loi.code === "P2002") {
      return { loi: `Loại “${t.ten}” vừa có người thêm.` };
    }
    throw loi;
  }
  revalidatePath("/quan-ly/loai-buoi");
  return { ok: true };
}

/**
 * Sửa một loại. Đổi tên thì CẬP NHẬT LUÔN mọi dòng lịch mang tên cũ.
 *
 * Anh chốt 18/11/2026. Cột `LichChup.loai` lưu chữ chứ không lưu id, nên đổi
 * tên mà bỏ mặc lịch cũ thì những buổi đó thành loại "mồ côi": lọc theo loại
 * không ra, và album của chúng mất mã.
 *
 * Hai việc nằm trong MỘT transaction: đổi được tên mà lỡ dở phần lịch thì còn
 * tệ hơn không đổi gì.
 */
export async function suaLoaiBuoiAction(
  id: string,
  du: { ten: string; maAlbum: string; dangDung: boolean },
): Promise<{ loi?: string; ok?: true; doiLich?: number }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được danh mục này." };

  const t = kiemTen(du.ten);
  if ("loi" in t) return t;
  const m = await kiemMa(du.maAlbum);
  if ("loi" in m) return m;

  const prisma = getPrisma();
  const cu = await prisma.loaiBuoi.findUnique({ where: { id }, select: { ten: true, maAlbum: true, dangDung: true } });
  if (!cu) return { loi: "Loại này không còn." };

  if (t.ten.toLowerCase() !== cu.ten.toLowerCase()) {
    const trung = await prisma.loaiBuoi.findFirst({
      where: { ten: { equals: t.ten, mode: "insensitive" }, NOT: { id } },
      select: { ten: true },
    });
    if (trung) return { loi: `Đã có loại “${trung.ten}”.` };
  }

  let doiLich = 0;
  await prisma.$transaction(async (tx) => {
    await tx.loaiBuoi.update({ where: { id }, data: { ten: t.ten, maAlbum: m.ma, dangDung: du.dangDung } });
    if (t.ten !== cu.ten) {
      const kq = await tx.lichChup.updateMany({ where: { loai: cu.ten }, data: { loai: t.ten } });
      doiLich = kq.count;
    }
  });

  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-loai-buoi",
    doiTuong: "LoaiBuoi",
    doiTuongId: id,
    chiTiet: {
      ten: cu.ten,
      doi: {
        ...(t.ten !== cu.ten ? { ten: { cu: cu.ten, moi: t.ten }, soLichDoiTheo: doiLich } : {}),
        ...(m.ma !== cu.maAlbum ? { maAlbum: { cu: cu.maAlbum, moi: m.ma } } : {}),
        ...(du.dangDung !== cu.dangDung ? { dangDung: { cu: cu.dangDung, moi: du.dangDung } } : {}),
      },
    },
  });
  revalidatePath("/quan-ly/loai-buoi");
  revalidatePath("/quan-ly/lich");
  return { ok: true, doiLich };
}

/**
 * Xoá một loại — CHỈ KHI chưa có buổi nào dùng.
 *
 * Anh chốt 18/11/2026: loại còn lịch thì chặn, chỉ cho tắt "đang dùng". Xoá
 * đi thì 461 buổi mang chữ "Ngày chụp" vẫn còn nguyên chữ đó mà không còn
 * loại nào giải thích chúng là gì — mất một đầu của mối nối, không lấy lại
 * được.
 */
export async function xoaLoaiBuoiAction(id: string): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được danh mục này." };

  const prisma = getPrisma();
  const cu = await prisma.loaiBuoi.findUnique({ where: { id }, select: { ten: true } });
  if (!cu) return { loi: "Loại này không còn." };

  const dang = await prisma.lichChup.count({ where: { loai: cu.ten } });
  if (dang > 0) {
    return {
      loi: `“${cu.ten}” đang có ${dang} buổi dùng nên không xoá được. Tắt “đang dùng” để nó không hiện trong ô chọn nữa.`,
    };
  }

  await prisma.loaiBuoi.delete({ where: { id } });
  await ghiNhatKy({
    nguoi,
    hanhDong: "xoa-loai-buoi",
    doiTuong: "LoaiBuoi",
    doiTuongId: id,
    chiTiet: { ten: cu.ten },
  });
  revalidatePath("/quan-ly/loai-buoi");
  return { ok: true };
}

/**
 * Chép 15 loại đang dùng thật vào bảng, để không phải gõ tay lần đầu.
 *
 * Gồm 12 loại của bảng cứng cộng ba loại chỉ có trong dữ liệu — "Chụp sự
 * kiện", "Chụp chịu lạy", "chụp đầy tháng". Chạy nhiều lần cũng được: loại
 * nào đã có thì bỏ qua.
 */
export async function chepLoaiBuoiAction(): Promise<{ loi?: string; them?: number }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được danh mục này." };

  const prisma = getPrisma();
  /* Lấy từ DỮ LIỆU THẬT, không chép bảng cứng: dữ liệu mới là thứ đang dùng. */
  const nhom = await prisma.lichChup.groupBy({ by: ["loai"], _count: { _all: true } });
  const { LOAI_LICH } = await import("@/lib/hopDongChung");
  const { MA_ALBUM_THEO_BUOI } = await import("@/lib/goiNhieuNgay");

  const ten = [
    ...LOAI_LICH,
    ...nhom.map((n) => n.loai).filter((x): x is string => !!x && x.trim() !== ""),
  ];
  const daCo = new Set(
    (await prisma.loaiBuoi.findMany({ select: { ten: true } })).map((x) => x.ten.toLowerCase()),
  );

  let them = 0;
  let thuTu = (await prisma.loaiBuoi.aggregate({ _max: { thuTu: true } }))._max.thuTu ?? 0;
  for (const t of ten) {
    if (daCo.has(t.toLowerCase())) continue;
    daCo.add(t.toLowerCase());
    thuTu += 1;
    await prisma.loaiBuoi.create({
      data: { ten: t, maAlbum: MA_ALBUM_THEO_BUOI[t.trim().toLowerCase()] ?? null, thuTu },
    });
    them += 1;
  }

  if (them > 0) {
    await ghiNhatKy({
      nguoi,
      hanhDong: "them-loai-buoi",
      doiTuong: "LoaiBuoi",
      chiTiet: { ten: "Chép loại buổi đang dùng", so: { "loại thêm": them } },
    });
  }
  revalidatePath("/quan-ly/loai-buoi");
  return { them };
}
