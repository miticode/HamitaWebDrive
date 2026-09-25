"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { databaseIsConfigured, getPrisma } from "@/lib/db";
import { doiHienTrenTrang, doiThuTuDoiNgu } from "@/lib/doiNgu";
import { dangXuatMoiMay, signIn, signOut } from "@/lib/auth";
import {
  clearFailures,
  clientIp,
  LOCK_MINUTES,
  recordFailure,
  remainingAttempts,
} from "@/lib/rateLimit";
import {
  bamMatKhau,
  khopMatKhau,
  kiemChoCo,
  kiemMatKhauMoi,
  taoMatKhauTam,
} from "@/lib/matKhau";
import {
  laQuanTri,
  layNguoiDung,
  taoPhien,
  xoaMoiPhien,
  xoaPhienHienTai,
} from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { quyenAlbumNguyHiem } from "@/lib/quyenAlbum";
import {
  chuanSoDienThoai,
  chuanTenDangNhap,
  kiemTenDangNhap,
  laVaiTro,
} from "@/lib/nhanVienChung";

export type KetQua = { loi?: string; ok?: string };

/**
 * Đăng nhập xong thì vào đâu — studio chốt 16/09/2026: TRANG QUẢN LÝ ALBUM.
 *
 * Đó là việc cả tiệm mở ra mỗi ngày; phần quản lý studio (hợp đồng, nhân
 * viên…) tra thỉnh thoảng, vào bằng link "Quản lý studio" ngay đầu trang album.
 * Ai bấm vào một link cụ thể rồi mới đăng nhập thì vẫn quay lại đúng link đó
 * (ô ẩn "tiep"), không bị ném về đây.
 */
const TRANG_DAU = "/admin";

/**
 * Đường quay lại sau khi đăng nhập (ô ẩn "tiep").
 *
 * CHỈ nhận đường trong chính web này: phải bắt đầu bằng một dấu "/" và không
 * phải "//". Nhận bừa thì ai đó gửi link /quan-ly/dang-nhap?tiep=https://web-gia
 * là đăng nhập xong người dùng bị ném sang web của họ, tưởng vẫn đang ở đây.
 */
function duongQuayLai(form: FormData): string | null {
  const t = String(form.get("tiep") ?? "").trim();
  return /^\/(?!\/)[\w\-./?=&%]*$/.test(t) ? t : null;
}

const SAI_CHUNG =
  "Tên đăng nhập hoặc mật khẩu không đúng. Chưa có mật khẩu thì nhờ quản lý cấp giúp.";

/**
 * Đăng nhập phần quản lý studio.
 *
 * Tên "admin" + mật khẩu quản lý album = sếp, đi đúng đường đăng nhập của
 * trang /admin (cùng mật khẩu, cùng bộ đếm chặn dò theo địa chỉ mạng).
 *
 * Còn lại là nhân viên. Bộ đếm sai tính theo TỪNG TÀI KHOẢN (khoá "tk:<tên>"),
 * không theo địa chỉ mạng: cả tiệm dùng chung một wifi, tính theo địa chỉ thì
 * một nhân viên gõ sai vài lần là khoá luôn cả tiệm — kể cả trang quản lý
 * album của sếp. Mật khẩu tạm dài 10 ký tự ngẫu nhiên và mật khẩu tự đặt bị
 * cấm trùng số điện thoại, nên giới hạn theo tài khoản là đủ chặn dò.
 */
export async function dangNhapAction(_truoc: KetQua, form: FormData): Promise<KetQua> {
  const ten = chuanTenDangNhap(String(form.get("tenDangNhap") ?? ""));
  const matKhau = String(form.get("matKhau") ?? "");
  if (!ten || !matKhau) {
    return { loi: "Anh chị nhập đủ tên đăng nhập và mật khẩu giúp em." };
  }

  if (ten === "admin") {
    const ip = await clientIp();
    if ((await remainingAttempts(ip)) === 0) {
      return { loi: `Sai quá nhiều lần. Thử lại sau ${LOCK_MINUTES} phút.` };
    }
    if (!(await signIn(matKhau))) {
      await recordFailure(ip);
      return { loi: SAI_CHUNG };
    }
    await clearFailures(ip);
    await ghiNhatKy({ nguoi: { id: null, ten: "Quản lý" }, hanhDong: "dang-nhap" });
    redirect(duongQuayLai(form) ?? TRANG_DAU);
  }

  if (!databaseIsConfigured()) {
    return { loi: "Đăng nhập nhân viên cần database, máy này đang chạy bằng file." };
  }

  const khoa = `tk:${ten}`;
  if ((await remainingAttempts(khoa)) === 0) {
    return {
      loi: `Tài khoản này gõ sai quá nhiều lần. Thử lại sau ${LOCK_MINUTES} phút, hoặc nhờ quản lý cấp lại mật khẩu.`,
    };
  }

  const prisma = getPrisma();
  const nv = await prisma.nhanVien.findUnique({ where: { tenDangNhap: ten } });

  let dung = false;
  if (nv?.matKhau && nv.dangLam) {
    dung = await khopMatKhau(matKhau, nv.matKhau);
  } else {
    await kiemChoCo(matKhau);
  }

  if (!nv || !dung) {
    await recordFailure(khoa);
    if (nv) {
      await ghiNhatKy({
        nguoi: { id: nv.id, ten: nv.ten },
        hanhDong: "dang-nhap-sai",
        doiTuong: "NhanVien",
        doiTuongId: nv.id,
      });
    }
    return { loi: SAI_CHUNG };
  }

  await clearFailures(khoa);
  await taoPhien(nv.id);
  await prisma.nhanVien.update({ where: { id: nv.id }, data: { dangNhapLuc: new Date() } });
  await ghiNhatKy({ nguoi: { id: nv.id, ten: nv.ten }, hanhDong: "dang-nhap" });
  if (nv.doiMatKhau) redirect("/quan-ly/doi-mat-khau");
  // Bấm vào link nào thì quay lại đúng link đó; còn lại về trang đầu.
  redirect(duongQuayLai(form) ?? TRANG_DAU);
}

/**
 * Đá MỌI MÁY ra khỏi hệ thống — cả máy đang giữ phiếu mật khẩu chung lẫn máy
 * đang đăng nhập bằng tài khoản. Chỉ quản lý bấm được.
 *
 * Không đổi mật khẩu của ai: người còn mật khẩu chỉ việc đăng nhập lại. Tài
 * khoản chưa được cấp mật khẩu thì từ đây không vào được cho tới khi quản lý
 * cấp — đó chính là điều studio muốn khi bấm nút này.
 */
export async function dangXuatMoiMayAction(): Promise<void> {
  const nguoi = await layNguoiDung();
  if (!(await quyenAlbumNguyHiem())) return;
  const { soPhien } = await dangXuatMoiMay();
  await ghiNhatKy({
    nguoi,
    hanhDong: "dang-xuat-moi-may",
    chiTiet: { ten: "Đăng xuất mọi máy", so: { "phiên tài khoản bị xoá": soPhien } },
  });
  // Xoá luôn phiếu của chính người vừa bấm, không thì họ tưởng mình là ngoại lệ.
  await signOut();
  redirect("/quan-ly/dang-nhap");
}

export async function dangXuatAction(): Promise<void> {
  const nguoi = await layNguoiDung();
  await xoaPhienHienTai();
  // Quản trị chung thì xoá luôn phiên mật khẩu quản lý — không thì bấm đăng
  // xuất xong vẫn đang đăng nhập.
  if (nguoi && nguoi.id === null) await signOut();
  if (nguoi) await ghiNhatKy({ nguoi, hanhDong: "dang-xuat" });
  redirect("/quan-ly/dang-nhap");
}

/**
 * Nhân viên đổi mật khẩu của chính mình.
 *
 * Lần đầu đăng nhập bằng mật khẩu tạm thì không hỏi lại mật khẩu cũ — họ vừa
 * gõ nó xong. Những lần sau phải có mật khẩu hiện tại, để ai nhặt được điện
 * thoại đang mở sẵn trang cũng không đổi mật khẩu chiếm tài khoản được.
 */
export async function doiMatKhauAction(_truoc: KetQua, form: FormData): Promise<KetQua> {
  const nguoi = await layNguoiDung();
  if (!nguoi) redirect("/quan-ly/dang-nhap");
  if (!nguoi.id) {
    return { loi: "Tài khoản quản lý chung dùng mật khẩu quản lý album, không đổi ở đây." };
  }

  const prisma = getPrisma();
  const nv = await prisma.nhanVien.findUnique({ where: { id: nguoi.id } });
  if (!nv?.matKhau) redirect("/quan-ly/dang-nhap");

  const cu = String(form.get("matKhauCu") ?? "");
  const moi = String(form.get("matKhauMoi") ?? "");
  const nhapLai = String(form.get("nhapLai") ?? "");

  if (!nv.doiMatKhau && !(await khopMatKhau(cu, nv.matKhau))) {
    return { loi: "Mật khẩu hiện tại không đúng." };
  }
  const loi = kiemMatKhauMoi(moi, nv);
  if (loi) return { loi };
  if (moi !== nhapLai) return { loi: "Hai lần nhập mật khẩu mới không giống nhau." };
  if (await khopMatKhau(moi, nv.matKhau)) {
    return { loi: "Mật khẩu mới phải khác mật khẩu đang dùng." };
  }

  await prisma.nhanVien.update({
    where: { id: nv.id },
    data: { matKhau: await bamMatKhau(moi), doiMatKhau: false },
  });
  // Văng mọi máy khác ra, rồi mở lại phiên cho chính máy này.
  await xoaMoiPhien(nv.id);
  await taoPhien(nv.id);
  await ghiNhatKy({ nguoi, hanhDong: "doi-mat-khau", doiTuong: "NhanVien", doiTuongId: nv.id });

  if (nv.doiMatKhau) redirect(TRANG_DAU);
  return { ok: "Đã đổi mật khẩu. Các máy khác đang đăng nhập tài khoản này đã bị đăng xuất." };
}

/**
 * Quản lý cấp (hoặc cấp lại) mật khẩu tạm cho một nhân viên.
 *
 * Mật khẩu tạm CHỈ trả về đúng lần này để quản lý chép gửi qua Zalo — không
 * lưu dạng đọc được ở đâu cả, không ghi vào nhật ký. Nhân viên bị bắt đổi
 * ngay lần đầu đăng nhập, và mọi máy đang đăng nhập tài khoản đó bị văng ra.
 */
export async function capMatKhauAction(
  nhanVienId: string,
): Promise<{ loi?: string; matKhau?: string }> {
  const nguoi = await layNguoiDung();
  if (!laQuanTri(nguoi)) return { loi: "Chỉ quản lý mới cấp được mật khẩu." };

  const prisma = getPrisma();
  const nv = await prisma.nhanVien.findUnique({ where: { id: nhanVienId } });
  if (!nv) return { loi: "Không tìm thấy nhân viên." };
  if (!nv.dangLam) {
    return { loi: `${nv.ten} đang ở trạng thái đã nghỉ. Sửa lại thành đang làm rồi mới cấp mật khẩu.` };
  }

  const matKhau = taoMatKhauTam();
  await prisma.nhanVien.update({
    where: { id: nv.id },
    data: { matKhau: await bamMatKhau(matKhau), doiMatKhau: true },
  });
  await xoaMoiPhien(nv.id);
  await ghiNhatKy({
    nguoi,
    hanhDong: "cap-mat-khau",
    doiTuong: "NhanVien",
    doiTuongId: nv.id,
    chiTiet: { ten: nv.ten },
  });

  revalidatePath("/quan-ly/nhan-vien");
  return { matKhau };
}

export type DuLieuNhanVien = {
  ten: string;
  tenDangNhap: string;
  soDienThoai: string;
  phongBan: string;
  chucVu: string;
  loaiNV: string;
  vaiTro: string;
  dangLam: boolean;
};

/** Kiểm và chuẩn hoá dữ liệu từ ô sửa. Trả về câu lỗi, hoặc dữ liệu đã sạch. */
async function kiemDuLieu(
  du: DuLieuNhanVien,
  boQuaId: string | null,
): Promise<{ loi: string } | { sach: Omit<DuLieuNhanVien, "soDienThoai"> & { soDienThoai: string | null } }> {
  const ten = du.ten.trim();
  if (!ten) return { loi: "Thiếu tên nhân viên." };
  if (ten.length > 100) return { loi: "Tên dài quá." };

  const tenDangNhap = chuanTenDangNhap(du.tenDangNhap);
  const loiTen = kiemTenDangNhap(tenDangNhap);
  if (loiTen) return { loi: loiTen };

  const trung = await getPrisma().nhanVien.findFirst({
    where: { tenDangNhap, ...(boQuaId ? { NOT: { id: boQuaId } } : {}) },
    select: { ten: true },
  });
  if (trung) return { loi: `Tên đăng nhập này ${trung.ten} đang dùng rồi.` };

  const soGo = du.soDienThoai.trim();
  const soDienThoai = chuanSoDienThoai(soGo);
  if (soGo && !soDienThoai) return { loi: "Số điện thoại chưa đúng (10 số, bắt đầu bằng 0)." };

  if (!laVaiTro(du.vaiTro)) {
    return { loi: "Vai trò không hợp lệ." };
  }

  return {
    sach: {
      ten,
      tenDangNhap,
      soDienThoai: soDienThoai || null,
      phongBan: du.phongBan.trim(),
      chucVu: du.chucVu.trim(),
      loaiNV: du.loaiNV.trim(),
      vaiTro: du.vaiTro,
      dangLam: du.dangLam,
    },
  };
}

export async function themNhanVienAction(
  du: DuLieuNhanVien,
): Promise<{ loi?: string }> {
  const nguoi = await layNguoiDung();
  if (!laQuanTri(nguoi)) return { loi: "Chỉ quản lý mới thêm được nhân viên." };

  const kq = await kiemDuLieu(du, null);
  if ("loi" in kq) return kq;

  const s = kq.sach;
  const nv = await getPrisma().nhanVien.create({
    data: {
      ...s,
      phongBan: s.phongBan || null,
      chucVu: s.chucVu || null,
      loaiNV: s.loaiNV || null,
    },
  });
  await ghiNhatKy({
    nguoi,
    hanhDong: "them-nhan-vien",
    doiTuong: "NhanVien",
    doiTuongId: nv.id,
    chiTiet: { ten: nv.ten },
  });
  revalidatePath("/quan-ly/nhan-vien");
  return {};
}

/** Tên cột → chữ hiện trong nhật ký, cho quản lý đọc được "đổi gì". */
const TEN_COT: Record<string, string> = {
  ten: "tên",
  tenDangNhap: "tên đăng nhập",
  soDienThoai: "số điện thoại",
  phongBan: "phòng ban",
  chucVu: "chức vụ",
  loaiNV: "loại",
  vaiTro: "vai trò",
  dangLam: "đang làm",
};

export async function suaNhanVienAction(
  nhanVienId: string,
  du: DuLieuNhanVien,
): Promise<{ loi?: string }> {
  const nguoi = await layNguoiDung();
  if (!laQuanTri(nguoi)) return { loi: "Chỉ quản lý mới sửa được thông tin nhân viên." };

  const prisma = getPrisma();
  const cu = await prisma.nhanVien.findUnique({ where: { id: nhanVienId } });
  if (!cu) return { loi: "Không tìm thấy nhân viên." };

  /*
    Không cho tự hạ quyền hay tự đánh dấu nghỉ việc chính mình: bấm nhầm một
    cái là tự khoá mình ngoài trang quản lý nhân viên, không còn ai sửa lại được
    ngoài người cầm mật khẩu quản lý chung.
  */
  if (nguoi?.id === nhanVienId && (du.vaiTro !== "quan-tri" || !du.dangLam)) {
    return { loi: "Không tự hạ quyền hay tự đánh dấu nghỉ việc cho chính mình được." };
  }

  const kq = await kiemDuLieu(du, nhanVienId);
  if ("loi" in kq) return kq;
  const s = kq.sach;
  const moi = {
    ...s,
    phongBan: s.phongBan || null,
    chucVu: s.chucVu || null,
    loaiNV: s.loaiNV || null,
  };

  const doi: Record<string, { truoc: unknown; sau: unknown }> = {};
  for (const k of Object.keys(TEN_COT) as (keyof typeof moi)[]) {
    if (cu[k] !== moi[k]) doi[TEN_COT[k]] = { truoc: cu[k], sau: moi[k] };
  }
  if (Object.keys(doi).length === 0) return {};

  await prisma.nhanVien.update({ where: { id: nhanVienId }, data: moi });
  // Nghỉ việc hoặc bị hạ quyền thì văng khỏi mọi máy ngay, không đợi phiên hết hạn.
  if (!moi.dangLam || (cu.vaiTro === "quan-tri" && moi.vaiTro !== "quan-tri")) {
    await xoaMoiPhien(nhanVienId);
  }
  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-nhan-vien",
    doiTuong: "NhanVien",
    doiTuongId: nhanVienId,
    chiTiet: { ten: cu.ten, doi },
  });
  revalidatePath("/quan-ly/nhan-vien");
  return {};
}

/**
 * Bật/tắt hiện một người ở khu "Đội ngũ" trên trang giới thiệu (anh yêu cầu
 * 25/09/2026). CHỈ QUẢN LÝ: đưa tên và mặt một người ra trang công khai là
 * quyết định của studio, không phải của chính người đó.
 */
export async function doiHienTrenTrangAction(id: string, hien: boolean): Promise<{ loi?: string }> {
  const nguoi = await layNguoiDung();
  if (!laQuanTri(nguoi)) return { loi: "Chỉ quản lý mới đổi được mục này." };

  const kq = await doiHienTrenTrang(id, hien);
  if (kq.loi) return kq;
  revalidatePath("/quan-ly/nhan-vien");
  revalidatePath("/");
  return {};
}

/** Sắp thứ tự người trong khu "Đội ngũ" (chỉ quản lý). */
export async function doiThuTuDoiNguAction(id: string, len: boolean): Promise<{ loi?: string }> {
  const nguoi = await layNguoiDung();
  if (!laQuanTri(nguoi)) return { loi: "Chỉ quản lý mới đổi được mục này." };
  const kq = await doiThuTuDoiNgu(id, len);
  if (kq.loi) return kq;
  revalidatePath("/quan-ly/nhan-vien");
  revalidatePath("/");
  return {};
}
