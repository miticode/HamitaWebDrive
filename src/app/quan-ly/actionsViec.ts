"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { layNguoiDung, laQuanTri } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { khoaCuaToi } from "@/lib/hopDongMayChu";
import { MUI_GIO } from "@/lib/constants";
import { TRANG_THAI_VIEC } from "@/lib/hopDongChung";

/**
 * Giao đầu việc cho người, và đổi trạng thái việc — anh chốt 23/09/2026.
 *
 * Trước đó web chỉ XEM được đầu việc (bản chép từ AppSheet), nên từ lúc hợp
 * đồng lập thẳng trên web thì mọi đầu việc sinh ra đều nằm mãi ở "Chưa giao
 * việc": không ai giao được cho ai.
 *
 * AI ĐƯỢC LÀM GÌ (theo đúng bảng quyền anh chốt 21/09 ở nguyên tắc 52):
 * - Quản lý: giao việc cho bất kỳ ai, đổi trạng thái mọi việc.
 * - Người khác: **tự nhận** việc CHƯA GIAO cho ai (anh muốn ai rảnh thì nhận),
 *   và đổi trạng thái việc đang ghi tên mình. Không đụng được việc của người
 *   khác — kiểm ở máy chủ chứ không chỉ giấu nút (nguyên tắc 3).
 */

/** Hôm nay theo giờ studio, dạng "YYYY-MM-DD". */
function homNay(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MUI_GIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function nguoiDangDung() {
  const nguoi = await layNguoiDung();
  // Người đang cầm mật khẩu tạm chưa được làm gì ngoài đổi mật khẩu.
  return nguoi && !nguoi.doiMatKhau ? nguoi : null;
}

/**
 * Việc này người đang đăng nhập có được đụng vào không.
 *
 * `khoa` là mã nhân viên, hoặc tên đăng nhập với người chưa có mã (học viên) —
 * xem `khoaNguoi` trong `hopDongMayChu.ts`.
 */
function duocDung(
  viec: { nguoiPhuTrachMaNV: string | null },
  khoa: string | null,
  quanTri: boolean,
): boolean {
  if (quanTri) return true;
  if (!viec.nguoiPhuTrachMaNV) return true; // Việc chưa giao: ai rảnh thì nhận.
  return !!khoa && viec.nguoiPhuTrachMaNV.toLowerCase() === khoa.toLowerCase();
}

/**
 * ĐÃ ĐÁNH DẤU XONG THÌ NGƯỜI THƯỜNG KHÔNG ĐỤNG VÀO NỮA — anh chốt 24/11/2026.
 *
 * Lý do là TIỀN, không phải kỷ luật. Đánh dấu "Đã làm" là lúc web ghi ngày
 * hoàn thành, mà lương sản phẩm chính là tổng tiền công những việc có ngày
 * hoàn thành trong tháng (xem `tinhThuKyLuong`). Mở lại việc thì ngày ấy bị
 * xoá, tức tiền rút khỏi lương tháng đó — và đổi qua đổi lại vài lần thì
 * không còn ai biết con số nào là con số thật.
 *
 * Quản lý vẫn mở lại được: tick nhầm là chuyện có thật, chặn cứng cả hai phía
 * thì lối thoát duy nhất là xoá đầu việc rồi tạo lại, tệ hơn nhiều. Mọi lượt
 * mở lại đều vào nhật ký như trước.
 */
function daDanhDauXong(trangThai: string | null): boolean {
  return trangThai === "Đã làm";
}

/** Câu từ chối dùng chung cho cả hai action, để hai nơi không nói hai kiểu. */
const LOI_DA_XONG =
  "Việc này đã đánh dấu xong rồi nên không tự sửa lại được — nhờ quản lý mở giúp.";

export async function giaoViecAction(
  id: string,
  /** Mã nhân viên, hoặc tên đăng nhập với người chưa có mã. Rỗng = gỡ người. */
  khoaNhan: string,
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDangDung();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp em." };
  const quanTri = laQuanTri(nguoi);

  const prisma = getPrisma();
  const viec = await prisma.congViec.findUnique({
    where: { id },
    select: { nguoiPhuTrachMaNV: true, trangThai: true, loai: true },
  });
  if (!viec) return { loi: "Đầu việc này không còn." };
  const khoaToi = khoaCuaToi(nguoi);
  if (!duocDung(viec, khoaToi, quanTri)) {
    return { loi: "Việc này đang của người khác — nhờ quản lý chuyển giúp." };
  }
  if (!quanTri && daDanhDauXong(viec.trangThai)) return { loi: LOI_DA_XONG };

  const ma = khoaNhan.trim();
  // Người thường chỉ được nhận về mình, không được đẩy sang người khác.
  if (!quanTri && ma && ma.toLowerCase() !== (khoaToi ?? "").toLowerCase()) {
    return { loi: "Anh chị chỉ nhận việc về mình được thôi." };
  }
  if (!quanTri && !ma) return { loi: "Chỉ quản lý mới gỡ người khỏi việc được." };
  /*
    Nhận ra người theo MÃ hoặc TÊN ĐĂNG NHẬP — học viên chưa có mã vẫn nhận
    được việc (anh chốt 14/11). Vẫn phải là người CÒN LÀM: giao việc cho người
    đã nghỉ là việc treo mãi không ai làm.
  */
  if (
    ma &&
    !(await prisma.nhanVien.findFirst({
      where: { dangLam: true, OR: [{ maNV: ma }, { tenDangNhap: ma }] },
      select: { id: true },
    }))
  ) {
    return { loi: "Không tìm thấy nhân viên đang làm nào khớp." };
  }

  await prisma.congViec.update({
    where: { id },
    data: {
      nguoiPhuTrachMaNV: ma || null,
      /*
        Giao việc mà trạng thái còn "Chưa giao việc" thì đẩy luôn sang "Đang
        làm": để nguyên thì bảng nói một đằng (có tên người) mà cột trạng thái
        nói một nẻo (chưa giao).
      */
      trangThai: ma && viec.trangThai === "Chưa giao việc" ? "Đang làm" : viec.trangThai,
    },
  });

  await ghiNhatKy({
    nguoi: { id: nguoi.id, ten: nguoi.ten },
    hanhDong: "giao-dau-viec",
    doiTuong: "CongViec",
    doiTuongId: id,
    chiTiet: { viec: viec.loai ?? "", giaoCho: ma || "(gỡ người)" },
  });
  revalidatePath("/quan-ly/cong-viec");
  return { ok: true };
}

export async function doiTrangThaiViecAction(
  id: string,
  trangThai: string,
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDangDung();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp em." };
  if (!(TRANG_THAI_VIEC as readonly string[]).includes(trangThai)) {
    return { loi: "Trạng thái không có trong bảng." };
  }

  const prisma = getPrisma();
  const viec = await prisma.congViec.findUnique({
    where: { id },
    select: { nguoiPhuTrachMaNV: true, loai: true, ngayHoanThanh: true, trangThai: true },
  });
  if (!viec) return { loi: "Đầu việc này không còn." };
  const quanTri = laQuanTri(nguoi);
  if (!duocDung(viec, khoaCuaToi(nguoi), quanTri)) {
    return { loi: "Việc này đang của người khác — nhờ quản lý đổi giúp." };
  }
  if (!quanTri && daDanhDauXong(viec.trangThai)) return { loi: LOI_DA_XONG };

  await prisma.congViec.update({
    where: { id },
    data: {
      trangThai,
      /*
        Ngày hoàn thành ghi khi chuyển sang "Đã làm", và XOÁ khi mở lại việc —
        để lại ngày cũ trên một việc đang làm dở là con số nói dối.
      */
      ngayHoanThanh: trangThai === "Đã làm" ? (viec.ngayHoanThanh ?? homNay()) : null,
    },
  });

  await ghiNhatKy({
    nguoi: { id: nguoi.id, ten: nguoi.ten },
    hanhDong: "doi-trang-thai-viec",
    doiTuong: "CongViec",
    doiTuongId: id,
    chiTiet: { viec: viec.loai ?? "", trangThai },
  });
  revalidatePath("/quan-ly/cong-viec");
  return { ok: true };
}
