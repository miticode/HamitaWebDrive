"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { boDau } from "@/lib/constants";
import { layNguoiDung, lapHopDong } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { lapHopDongMoi, maNguoiLap, type NguoiLap } from "@/lib/taoHopDong";
import type { DuLieuHopDongMoi } from "@/lib/hopDongChung";

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
): Promise<{ loi: string } | { id: string; maHD: string }> {
  const nguoi = await nguoiDuocLap();
  if (!nguoi) {
    return { loi: "Tài khoản này chưa được lập hợp đồng, hoặc phiên đăng nhập đã hết." };
  }

  const kq = await lapHopDongMoi(du, nguoi);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "lap-hop-dong",
    doiTuong: "HopDong",
    doiTuongId: kq.id,
    // Nhật ký ghi mã và tên khách, KHÔNG ghi số điện thoại.
    chiTiet: { ten: `${kq.maHD} — ${du.tenKhach}`, nguoiLap: maNguoiLap(nguoi) },
  });

  revalidatePath("/quan-ly/hop-dong");
  revalidatePath("/quan-ly/lich");
  revalidatePath("/quan-ly/cong-viec");
  return kq;
}
