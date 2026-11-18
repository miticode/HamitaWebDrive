"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { layNguoiDung, laQuanTri } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { CHU_NHOM, COT_DUNG, NHOM, type TenNhom } from "@/lib/danhMuc";

/**
 * CRUD cho các danh mục nhỏ của form lập hợp đồng — anh yêu cầu 18/11/2026.
 *
 * Cùng hai ràng buộc anh đã chốt cho loại buổi chụp:
 *   · Đổi tên thì CẬP NHẬT LUÔN dữ liệu cũ mang tên đó.
 *   · Xoá thì CHẶN khi còn dữ liệu dùng, chỉ cho tắt "đang dùng".
 *
 * Quyền: chỉ quản lý. Đổi một dòng ở đây là đổi ô chọn của cả tiệm.
 */

async function quanLy() {
  const nguoi = await layNguoiDung();
  return nguoi && laQuanTri(nguoi) ? nguoi : null;
}

function laNhom(x: string): x is TenNhom {
  return (Object.values(NHOM) as string[]).includes(x);
}

function kiemTen(ten: string): { loi: string } | { ten: string } {
  const sach = ten.trim().replace(/[ \t]+/g, " ");
  if (!sach) return { loi: "Thiếu tên." };
  if (sach.length > 80) return { loi: "Tên dài quá, tối đa 80 ký tự." };
  return { ten: sach };
}

/** Bao nhiêu bản ghi đang mang giá trị này. */
async function demDung(nhom: TenNhom, ten: string): Promise<number> {
  const { bang, cot } = COT_DUNG[nhom];
  const prisma = getPrisma();
  const where = { [cot]: ten } as never;
  return bang === "hopDong" ? prisma.hopDong.count({ where }) : prisma.phieuThu.count({ where });
}

export async function themDanhMucAction(nhom: string, ten: string): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được danh mục này." };
  if (!laNhom(nhom)) return { loi: "Danh mục không đúng." };

  const t = kiemTen(ten);
  if ("loi" in t) return t;

  const prisma = getPrisma();
  const trung = await prisma.danhMuc.findFirst({
    where: { nhom, ten: { equals: t.ten, mode: "insensitive" } },
    select: { ten: true },
  });
  if (trung) return { loi: `Đã có “${trung.ten}”.` };

  try {
    const sau = await prisma.danhMuc.aggregate({ where: { nhom }, _max: { thuTu: true } });
    const x = await prisma.danhMuc.create({ data: { nhom, ten: t.ten, thuTu: (sau._max.thuTu ?? 0) + 1 } });
    await ghiNhatKy({
      nguoi,
      hanhDong: "them-danh-muc",
      doiTuong: "DanhMuc",
      doiTuongId: x.id,
      chiTiet: { ten: `${CHU_NHOM[nhom].ten}: ${t.ten}` },
    });
  } catch (loi) {
    if (loi instanceof Prisma.PrismaClientKnownRequestError && loi.code === "P2002") {
      return { loi: `“${t.ten}” vừa có người thêm.` };
    }
    throw loi;
  }
  revalidatePath("/quan-ly/dich-vu");
  return { ok: true };
}

/**
 * Sửa một giá trị. Đổi tên thì cập nhật luôn dữ liệu cũ mang tên đó.
 *
 * Hai việc nằm trong MỘT transaction: đổi được tên mà lỡ dở phần dữ liệu thì
 * còn tệ hơn không đổi gì — 1.110 hợp đồng mang chữ "Khách lẻ" mà chỉ nửa số
 * đó đổi theo là bảng hợp đồng có hai loại cho cùng một việc.
 */
export async function suaDanhMucAction(
  id: string,
  du: { ten: string; dangDung: boolean },
): Promise<{ loi?: string; ok?: true; doiTheo?: number }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được danh mục này." };

  const t = kiemTen(du.ten);
  if ("loi" in t) return t;

  const prisma = getPrisma();
  const cu = await prisma.danhMuc.findUnique({ where: { id }, select: { nhom: true, ten: true, dangDung: true } });
  if (!cu) return { loi: "Giá trị này không còn." };
  if (!laNhom(cu.nhom)) return { loi: "Danh mục không đúng." };

  if (t.ten.toLowerCase() !== cu.ten.toLowerCase()) {
    const trung = await prisma.danhMuc.findFirst({
      where: { nhom: cu.nhom, ten: { equals: t.ten, mode: "insensitive" }, NOT: { id } },
      select: { ten: true },
    });
    if (trung) return { loi: `Đã có “${trung.ten}”.` };
  }

  const { bang, cot } = COT_DUNG[cu.nhom];
  let doiTheo = 0;
  await prisma.$transaction(async (tx) => {
    await tx.danhMuc.update({ where: { id }, data: { ten: t.ten, dangDung: du.dangDung } });
    if (t.ten !== cu.ten) {
      const where = { [cot]: cu.ten } as never;
      const data = { [cot]: t.ten } as never;
      const kq = bang === "hopDong" ? await tx.hopDong.updateMany({ where, data }) : await tx.phieuThu.updateMany({ where, data });
      doiTheo = kq.count;
    }
  });

  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-danh-muc",
    doiTuong: "DanhMuc",
    doiTuongId: id,
    chiTiet: {
      ten: `${CHU_NHOM[cu.nhom].ten}: ${cu.ten}`,
      doi: {
        ...(t.ten !== cu.ten ? { ten: { cu: cu.ten, moi: t.ten }, soBanGhiDoiTheo: doiTheo } : {}),
        ...(du.dangDung !== cu.dangDung ? { dangDung: { cu: cu.dangDung, moi: du.dangDung } } : {}),
      },
    },
  });
  revalidatePath("/quan-ly/dich-vu");
  revalidatePath("/quan-ly/hop-dong");
  return { ok: true, doiTheo };
}

/** Xoá — CHỈ KHI chưa có bản ghi nào mang giá trị này. */
export async function xoaDanhMucAction(id: string): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được danh mục này." };

  const prisma = getPrisma();
  const cu = await prisma.danhMuc.findUnique({ where: { id }, select: { nhom: true, ten: true } });
  if (!cu) return { loi: "Giá trị này không còn." };
  if (!laNhom(cu.nhom)) return { loi: "Danh mục không đúng." };

  const dang = await demDung(cu.nhom, cu.ten);
  if (dang > 0) {
    return {
      loi: `“${cu.ten}” đang có ${dang} bản ghi dùng nên không xoá được. Tắt “đang dùng” để nó không hiện trong ô chọn nữa.`,
    };
  }

  await prisma.danhMuc.delete({ where: { id } });
  await ghiNhatKy({
    nguoi,
    hanhDong: "xoa-danh-muc",
    doiTuong: "DanhMuc",
    doiTuongId: id,
    chiTiet: { ten: `${CHU_NHOM[cu.nhom].ten}: ${cu.ten}` },
  });
  revalidatePath("/quan-ly/dich-vu");
  return { ok: true };
}

/**
 * Chép giá trị đang dùng thật vào bảng, để không phải gõ tay lần đầu.
 *
 * Lấy từ bảng cứng CỘNG những giá trị có thật trong dữ liệu — y như cách chép
 * loại buổi chụp. Riêng nhóm "nội dung thu" chỉ chép bảng cứng: 234 nội dung
 * gõ tay ngoài kia là chữ tự do của từng phiếu, không phải danh mục.
 */
export async function chepDanhMucAction(nhom: string): Promise<{ loi?: string; them?: number }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được danh mục này." };
  if (!laNhom(nhom)) return { loi: "Danh mục không đúng." };

  const prisma = getPrisma();
  const { bangCung } = await import("@/lib/danhMuc");
  const ten: string[] = [...bangCung(nhom)];

  if (nhom !== NHOM.noiDungThu) {
    const { bang, cot } = COT_DUNG[nhom];
    const nhomDL =
      bang === "hopDong"
        ? await prisma.hopDong.groupBy({ by: [cot as "loaiDV"], _count: { _all: true } })
        : await prisma.phieuThu.groupBy({ by: [cot as "hinhThuc"], _count: { _all: true } });
    for (const x of nhomDL as { [k: string]: unknown }[]) {
      const v = x[cot];
      if (typeof v === "string" && v.trim()) ten.push(v);
    }
  }

  const daCo = new Set(
    (await prisma.danhMuc.findMany({ where: { nhom }, select: { ten: true } })).map((x) => x.ten.toLowerCase()),
  );
  let thuTu = (await prisma.danhMuc.aggregate({ where: { nhom }, _max: { thuTu: true } }))._max.thuTu ?? 0;
  let them = 0;
  for (const t of ten) {
    if (daCo.has(t.toLowerCase())) continue;
    daCo.add(t.toLowerCase());
    thuTu += 1;
    await prisma.danhMuc.create({ data: { nhom, ten: t, thuTu } });
    them += 1;
  }

  if (them > 0) {
    await ghiNhatKy({
      nguoi,
      hanhDong: "them-danh-muc",
      doiTuong: "DanhMuc",
      chiTiet: { ten: `Chép ${CHU_NHOM[nhom].ten}`, so: { "giá trị thêm": them } },
    });
  }
  revalidatePath("/quan-ly/dich-vu");
  return { them };
}

/* ── Bước hợp đồng ────────────────────────────────────────────────────── */

/**
 * Sửa một bước. Đổi tên thì cập nhật luôn `HopDong.trangThai` của mọi hợp
 * đồng đang ở bước đó.
 *
 * Nặng tay hơn mấy danh mục kia: 1.057 hợp đồng đang ở bước "12. Đã xong
 * tiệc", 914 ở bước 18. Nên con số báo trước ở giao diện càng phải đúng.
 *
 * SỐ ĐẦU TÊN LÀ THỨ CÓ NGHĨA, không phải trang trí: `tachTrangThai` đọc số đó
 * để biết hợp đồng đang ở bước mấy, và cả web chia nhánh chụp (1–9) với nhánh
 * tiệc (10–18) theo nó. Đổi "12. Đã xong tiệc" thành "Đã xong tiệc" là mọi
 * hợp đồng nhánh tiệc mất số bước.
 */
export async function suaBuocAction(
  id: string,
  du: { ten: string; trachNhiem: string },
): Promise<{ loi?: string; ok?: true; doiTheo?: number }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được danh mục này." };

  const t = kiemTen(du.ten);
  if ("loi" in t) return t;
  if (!/^\d+\./.test(t.ten)) {
    return { loi: "Tên bước phải bắt đầu bằng số và dấu chấm, ví dụ “5. Đang Retouch”." };
  }

  const prisma = getPrisma();
  const cu = await prisma.buocHopDong.findUnique({ where: { id }, select: { ten: true, trachNhiem: true } });
  if (!cu) return { loi: "Bước này không còn." };

  if (t.ten.toLowerCase() !== cu.ten.toLowerCase()) {
    const trung = await prisma.buocHopDong.findFirst({
      where: { ten: { equals: t.ten, mode: "insensitive" }, NOT: { id } },
      select: { ten: true },
    });
    if (trung) return { loi: `Đã có bước “${trung.ten}”.` };
  }

  const soMoi = Number(t.ten.match(/^(\d+)\./)?.[1] ?? 999);
  const trach = du.trachNhiem.trim() || null;
  let doiTheo = 0;
  await prisma.$transaction(async (tx) => {
    await tx.buocHopDong.update({ where: { id }, data: { ten: t.ten, thuTu: soMoi, trachNhiem: trach } });
    if (t.ten !== cu.ten) {
      /* Cập nhật cả `buoc` — cột số tách sẵn, dùng cho bộ lọc và thống kê. */
      const kq = await tx.hopDong.updateMany({
        where: { trangThai: cu.ten },
        data: { trangThai: t.ten, buoc: soMoi },
      });
      doiTheo = kq.count;
    }
  });

  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-danh-muc",
    doiTuong: "BuocHopDong",
    doiTuongId: id,
    chiTiet: {
      ten: `Bước: ${cu.ten}`,
      doi: {
        ...(t.ten !== cu.ten ? { ten: { cu: cu.ten, moi: t.ten }, soHopDongDoiTheo: doiTheo } : {}),
        ...(trach !== cu.trachNhiem ? { trachNhiem: { cu: cu.trachNhiem, moi: trach } } : {}),
      },
    },
  });
  revalidatePath("/quan-ly/dich-vu");
  revalidatePath("/quan-ly/hop-dong");
  return { ok: true, doiTheo };
}

/** Thêm một bước mới. Số đầu tên quyết định thứ tự và nhánh. */
export async function themBuocAction(ten: string, trachNhiem: string): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được danh mục này." };

  const t = kiemTen(ten);
  if ("loi" in t) return t;
  if (!/^\d+\./.test(t.ten)) {
    return { loi: "Tên bước phải bắt đầu bằng số và dấu chấm, ví dụ “19. Đã gửi quà”." };
  }

  const prisma = getPrisma();
  const trung = await prisma.buocHopDong.findFirst({
    where: { ten: { equals: t.ten, mode: "insensitive" } },
    select: { ten: true },
  });
  if (trung) return { loi: `Đã có bước “${trung.ten}”.` };

  const x = await prisma.buocHopDong.create({
    data: {
      ten: t.ten,
      thuTu: Number(t.ten.match(/^(\d+)\./)?.[1] ?? 999),
      trachNhiem: trachNhiem.trim() || null,
    },
  });
  await ghiNhatKy({
    nguoi,
    hanhDong: "them-danh-muc",
    doiTuong: "BuocHopDong",
    doiTuongId: x.id,
    chiTiet: { ten: `Bước: ${t.ten}` },
  });
  revalidatePath("/quan-ly/dich-vu");
  return { ok: true };
}

/** Xoá một bước — CHỈ KHI chưa hợp đồng nào đang ở bước đó. */
export async function xoaBuocAction(id: string): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được danh mục này." };

  const prisma = getPrisma();
  const cu = await prisma.buocHopDong.findUnique({ where: { id }, select: { ten: true } });
  if (!cu) return { loi: "Bước này không còn." };

  const dang = await prisma.hopDong.count({ where: { trangThai: cu.ten } });
  if (dang > 0) {
    return { loi: `“${cu.ten}” đang có ${dang} hợp đồng ở bước này nên không xoá được.` };
  }

  await prisma.buocHopDong.delete({ where: { id } });
  await ghiNhatKy({
    nguoi,
    hanhDong: "xoa-danh-muc",
    doiTuong: "BuocHopDong",
    doiTuongId: id,
    chiTiet: { ten: `Bước: ${cu.ten}` },
  });
  revalidatePath("/quan-ly/dich-vu");
  return { ok: true };
}
