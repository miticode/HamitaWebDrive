"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { layNguoiDung, laQuanTri } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { boDau } from "@/lib/dichVuChung";

/**
 * CRUD cho bộ mã album (tag) — anh yêu cầu 19/11/2026.
 *
 * Quyền: chỉ quản lý. Mã album hiện ở đầu tên mọi album và là thứ bộ lọc ở
 * trang quản lý album dựa vào; thêm bớt một mã là đổi cách cả tiệm xếp ảnh.
 */

async function quanLy() {
  const nguoi = await layNguoiDung();
  return nguoi && laQuanTri(nguoi) ? nguoi : null;
}

/**
 * Bao nhiêu album đang mang mã này.
 *
 * Đếm y như BỘ LỌC ở trang quản lý album: tách tên thành TỪ RỜI rồi khớp
 * theo đầu từ. Nếu đếm bằng `startsWith` trên cả tên thì hụt hẳn — đo
 * 19/11: cách đó ra HIS 0 album, trong khi bộ lọc thật thấy 47, vì tên hay
 * có hai mã ("HIS - HER - Nhã hân") hoặc viết thường ("Her - Minh Ngọc").
 */
async function demAlbum(ma: string): Promise<number> {
  const ds = await getPrisma().gallery.findMany({ select: { title: true, clientName: true } });
  const key = boDau(ma);
  return ds.filter((a) =>
    boDau([a.clientName ?? "", a.title].join(" "))
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .some((t) => t.startsWith(key)),
  ).length;
}

function kiemMa(ma: string): { loi: string } | { ma: string } {
  const sach = ma.trim().replace(/\s+/g, "");
  if (!sach) return { loi: "Thiếu mã." };
  if (sach.length > 12) return { loi: "Mã dài quá, tối đa 12 ký tự." };
  /*
    Cấm dấu nối và khoảng trắng trong mã: mã đứng trước dấu nối trong tên
    album ("HC - Trúc Hà"), nên một mã tự mang dấu nối là cắt tên sai chỗ.
  */
  if (/[-–—]/.test(sach)) return { loi: "Mã không được chứa dấu gạch ngang." };
  return { ma: sach };
}

export async function themMaAlbumAction(ma: string, nghia: string): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được bộ mã." };

  const m = kiemMa(ma);
  if ("loi" in m) return m;

  const prisma = getPrisma();
  const trung = await prisma.maAlbum.findFirst({
    where: { ma: { equals: m.ma, mode: "insensitive" } },
    select: { ma: true },
  });
  if (trung) return { loi: `Đã có mã “${trung.ma}”.` };

  try {
    const sau = await prisma.maAlbum.aggregate({ _max: { thuTu: true } });
    const x = await prisma.maAlbum.create({
      data: { ma: m.ma, nghia: nghia.trim() || null, thuTu: (sau._max.thuTu ?? 0) + 1 },
    });
    await ghiNhatKy({
      nguoi,
      hanhDong: "them-danh-muc",
      doiTuong: "MaAlbum",
      doiTuongId: x.id,
      chiTiet: { ten: `Mã album: ${m.ma}` },
    });
  } catch (loi) {
    if (loi instanceof Prisma.PrismaClientKnownRequestError && loi.code === "P2002") {
      return { loi: `Mã “${m.ma}” vừa có người thêm.` };
    }
    throw loi;
  }
  revalidatePath("/quan-ly/dich-vu");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Sửa một mã.
 *
 * `nghia` và `dangDung` sửa lúc nào cũng được. `ma` CHỈ sửa được khi chưa
 * album nào dùng — anh chốt 19/11.
 *
 * Lý do không cho đổi: mã nằm TRONG tên album, mà tên album là chữ tự do —
 * cùng một mã có cái viết "HIS - ", cái viết "His-", cái viết "HIS-". Sửa
 * hàng loạt là dễ sót hoặc sửa nhầm phần tên khách.
 */
export async function suaMaAlbumAction(
  id: string,
  du: { ma: string; nghia: string; dangDung: boolean },
): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được bộ mã." };

  const m = kiemMa(du.ma);
  if ("loi" in m) return m;

  const prisma = getPrisma();
  const cu = await prisma.maAlbum.findUnique({ where: { id }, select: { ma: true, nghia: true, dangDung: true } });
  if (!cu) return { loi: "Mã này không còn." };

  const doiMa = m.ma.toLowerCase() !== cu.ma.toLowerCase();
  if (doiMa) {
    const dang = await demAlbum(cu.ma);
    if (dang > 0) {
      return {
        loi: `“${cu.ma}” đang có ${dang} album dùng nên không đổi được chữ mã. Sửa phần nghĩa thì vẫn được, hoặc tắt “đang dùng” rồi thêm mã mới.`,
      };
    }
    const trung = await prisma.maAlbum.findFirst({
      where: { ma: { equals: m.ma, mode: "insensitive" }, NOT: { id } },
      select: { ma: true },
    });
    if (trung) return { loi: `Đã có mã “${trung.ma}”.` };
  }

  await prisma.maAlbum.update({
    where: { id },
    data: { ma: m.ma, nghia: du.nghia.trim() || null, dangDung: du.dangDung },
  });
  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-danh-muc",
    doiTuong: "MaAlbum",
    doiTuongId: id,
    chiTiet: {
      ten: `Mã album: ${cu.ma}`,
      doi: {
        ...(doiMa ? { ma: { cu: cu.ma, moi: m.ma } } : {}),
        ...(du.nghia.trim() !== (cu.nghia ?? "") ? { nghia: { cu: cu.nghia, moi: du.nghia.trim() || null } } : {}),
        ...(du.dangDung !== cu.dangDung ? { dangDung: { cu: cu.dangDung, moi: du.dangDung } } : {}),
      },
    },
  });
  revalidatePath("/quan-ly/dich-vu");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Xoá một mã — CHỈ KHI không album, dịch vụ hay loại buổi nào đang dùng.
 *
 * Ba chỗ chứ không phải một: mã còn được gắn sẵn trên dịch vụ (`DichVu
 * .maAlbum`) và trên loại buổi (`LoaiBuoi.maAlbum`). Xoá mà bỏ sót hai chỗ
 * đó thì album sinh ra sau này mang một mã không còn trong bộ, lọc không ra.
 */
export async function xoaMaAlbumAction(id: string): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được bộ mã." };

  const prisma = getPrisma();
  const cu = await prisma.maAlbum.findUnique({ where: { id }, select: { ma: true } });
  if (!cu) return { loi: "Mã này không còn." };

  const [soAlbum, soDichVu, soLoaiBuoi] = await Promise.all([
    demAlbum(cu.ma),
    prisma.dichVu.count({ where: { maAlbum: cu.ma } }),
    prisma.loaiBuoi.count({ where: { maAlbum: cu.ma } }),
  ]);
  if (soAlbum > 0 || soDichVu > 0 || soLoaiBuoi > 0) {
    const ke = [
      soAlbum > 0 ? `${soAlbum} album` : "",
      soDichVu > 0 ? `${soDichVu} dịch vụ` : "",
      soLoaiBuoi > 0 ? `${soLoaiBuoi} loại buổi` : "",
    ].filter(Boolean);
    return {
      loi: `“${cu.ma}” đang có ${ke.join(", ")} dùng nên không xoá được. Tắt “đang dùng” để nó không hiện trong ô chọn nữa.`,
    };
  }

  await prisma.maAlbum.delete({ where: { id } });
  await ghiNhatKy({
    nguoi,
    hanhDong: "xoa-danh-muc",
    doiTuong: "MaAlbum",
    doiTuongId: id,
    chiTiet: { ten: `Mã album: ${cu.ma}` },
  });
  revalidatePath("/quan-ly/dich-vu");
  revalidatePath("/admin");
  return { ok: true };
}

/** Chép bộ mã cứng vào bảng, để không phải gõ tay mười hai mã lần đầu. */
export async function chepMaAlbumAction(): Promise<{ loi?: string; them?: number }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được bộ mã." };

  const prisma = getPrisma();
  const { MA_ALBUM } = await import("@/lib/maAlbum");
  const daCo = new Set(
    (await prisma.maAlbum.findMany({ select: { ma: true } })).map((x) => x.ma.toLowerCase()),
  );
  let thuTu = (await prisma.maAlbum.aggregate({ _max: { thuTu: true } }))._max.thuTu ?? 0;
  let them = 0;
  for (const m of MA_ALBUM) {
    if (daCo.has(m.ma.toLowerCase())) continue;
    thuTu += 1;
    await prisma.maAlbum.create({ data: { ma: m.ma, nghia: m.nghia, thuTu } });
    them += 1;
  }
  if (them > 0) {
    await ghiNhatKy({
      nguoi,
      hanhDong: "them-danh-muc",
      doiTuong: "MaAlbum",
      chiTiet: { ten: "Chép bộ mã album", so: { "mã thêm": them } },
    });
  }
  revalidatePath("/quan-ly/dich-vu");
  return { them };
}
