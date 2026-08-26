"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { invalidate } from "@/lib/cache";
import { getFolderName, parseFolderId } from "@/lib/drive";
import { isAdmin, signIn, signOut } from "@/lib/auth";
import { disconnect } from "@/lib/googleAuth";
import { sinhMa } from "@/lib/access";
import { GIA_ANH_THEM_MAC_DINH } from "@/lib/constants";
import {
  LOCK_MINUTES,
  clearFailures,
  clientIp,
  recordFailure,
  remainingAttempts,
} from "@/lib/rateLimit";
import type { KhuGioiThieu } from "@/lib/store";
import {
  createGallery,
  deleteGallery,
  setAccess,
  setKhuGioiThieu,
  setClientName,
  setGoiAnh,
  setCover,
  setExpiry,
  setFeatured,
  setMessage,
} from "@/lib/store";
import { syncAndWarm } from "@/lib/warm";

export type ActionState = { error?: string; ok?: string };

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ip = await clientIp();

  const left = await remainingAttempts(ip);
  if (left === 0) {
    return {
      error: `Sai quá nhiều lần. Thử lại sau ${LOCK_MINUTES} phút.`,
    };
  }

  const password = String(formData.get("password") ?? "");
  if (!(await signIn(password))) {
    await recordFailure(ip);
    const remaining = left - 1;
    return {
      error:
        remaining > 0
          ? `Mật khẩu không đúng. Còn ${remaining} lần thử.`
          : `Sai quá nhiều lần. Thử lại sau ${LOCK_MINUTES} phút.`,
    };
  }

  await clearFailures(ip);
  redirect("/admin");
}

export async function logoutAction() {
  await signOut();
  redirect("/admin");
}

export async function createGalleryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await isAdmin())) return { error: "Chưa đăng nhập." };

  const link = String(formData.get("driveLink") ?? "").trim();
  const folderId = parseFolderId(link);
  if (!folderId) {
    return {
      error: link
        ? "Không đọc được folder ID từ link này. Kiểm tra lại địa chỉ đã copy."
        : "Hãy dán link folder Drive.",
    };
  }

  let folderName: string;
  try {
    // Goi thu Drive ngay luc tao de bao loi som, thay vi de khach mo link moi vo.
    folderName = await getFolderName(folderId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: message.includes("404")
        ? "Không mở được folder. Kiểm tra đã share folder cho service account chưa."
        : message,
    };
  }

  const clientName = String(formData.get("clientName") ?? "").trim();

  const gallery = await createGallery({
    title: folderName,
    clientName: clientName || null,
    driveFolderId: folderId,
    allowDownload: formData.get("allowDownload") === "on",
  });

  // Ma sinh san de anh khoi phai nghi; sua lai duoc bat cu luc nao.
  await setAccess(gallery.id, sinhMa());

  // Dung san nhung tam anh dau tien sau khi da tra loi — khach mo link ngay
  // luc nay cung khong phai doi tung tam mot.
  after(() => syncAndWarm(gallery.id, folderId).catch(() => {}));

  revalidatePath("/admin");
  return {
    ok: `Đã tạo gallery cho "${folderName}". Đang dựng sẵn ảnh đầu tiên…`,
  };
}

export async function deleteGalleryAction(formData: FormData) {
  if (!(await isAdmin())) return;
  await deleteGallery(String(formData.get("id")));
  revalidatePath("/admin");
}

/** Xoa cache de anh thay ngay folder vua them, khong phai doi het 5 phut. */
export async function refreshGalleryAction(formData: FormData) {
  if (!(await isAdmin())) return;
  const folderId = String(formData.get("folderId"));
  const galleryId = String(formData.get("galleryId"));
  // Hai cache rieng: cay anh cho trang khach, va danh sach thu muc con cho trang nay.
  invalidate(`tree:${folderId}`);
  invalidate(`subs:${folderId}`);

  // Doc lai so lieu tu Drive roi dung san anh cua nhung folder vua them.
  after(() => syncAndWarm(galleryId, folderId).catch(() => {}));

  revalidatePath("/admin");
}

/** Ngat ket noi Google Drive — web quay ve dung service account. */
export async function disconnectDriveAction() {
  if (!(await isAdmin())) return;
  await disconnect();
  invalidate("subs:");
  invalidate("tree:");
  revalidatePath("/admin");
}

/** Dat anh bia cho album. fileId rong = tro lai tu dong lay tam dau tien. */
export async function setCoverAction(galleryId: string, fileId: string | null) {
  if (!(await isAdmin())) return { error: "Chưa đăng nhập." };
  await setCover(galleryId, fileId);
  revalidatePath("/admin");
  return {};
}

/** Doi ma chon anh cua album. */
export async function setAccessAction(
  galleryId: string,
  code: string
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: "Chưa đăng nhập." };

  const ma = code.trim().toUpperCase();
  if (ma.length < 4) return { error: "Mã phải có ít nhất 4 ký tự." };

  await setAccess(galleryId, ma);
  revalidatePath("/admin");
  return {};
}

/**
 * Loi nhan hien o dau album cua khach nay.
 *
 * De trong thi khach thay loi chuc chung — phan lon album khong can viet gi
 * rieng, nen bo trong la trang thai binh thuong chu khong phai thieu sot.
 */
export async function setMessageAction(
  galleryId: string,
  message: string
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: "Chưa đăng nhập." };

  const noiDung = message.trim();
  if (noiDung.length > 500) return { error: "Lời nhắn dài quá 500 ký tự." };

  await setMessage(galleryId, noiDung || null);
  revalidatePath("/admin");
  return {};
}

/**
 * Dat so anh in co san trong goi cua album nay.
 *
 * So nay hien o phan huong dan chon anh phia khach, buoc "tha tim anh muon
 * in". Moi goi moi khac nen phai dat rieng tung album — de trong thi phan
 * huong dan bo qua han doan gia ca, chi noi cach chon.
 *
 * Gia moi tam vuot goi KHONG dat o day: no la con so co dinh cua studio
 * (GIA_ANH_THEM_MAC_DINH trong constants.ts), giong nhau o moi goi. Cho sua
 * rieng tung album chi tao them mot o de go nham ma khong duoc loi gi; muon
 * doi gia thi sua mot cho trong constants.ts la doi ca he thong.
 */
export async function setGoiAnhAction(
  galleryId: string,
  soAnh: string
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: "Chưa đăng nhập." };

  const soSach = soAnh.trim();
  let so: number | null = null;
  if (soSach) {
    so = Number(soSach);
    if (!Number.isInteger(so) || so < 1) {
      return { error: "Số ảnh trong gói phải là số nguyên từ 1 trở lên." };
    }
  }

  await setGoiAnh(galleryId, so, GIA_ANH_THEM_MAC_DINH);
  revalidatePath("/admin");
  // So nay hien o trang khach xem nen phai lam moi ca duong do.
  revalidatePath("/", "layout");
  return {};
}

/**
 * Doi ten album hien cho khach.
 *
 * De trong thi quay ve dung ten thu muc tren Drive — do la trang thai binh
 * thuong luc moi tao link, khong phai thieu sot.
 *
 * KHONG dung toi slug: slug da sinh luc tao link va co the anh da gui cho
 * khach roi. Doi ten ma keo theo doi slug thi moi link da gui deu chet, va
 * khong co cach nao bao cho nhung nguoi da nhan link biet.
 */
export async function setClientNameAction(
  galleryId: string,
  ten: string
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: "Chưa đăng nhập." };

  const sach = ten.trim();
  if (sach.length > 120) return { error: "Tên dài quá 120 ký tự." };

  await setClientName(galleryId, sach || null);
  revalidatePath("/admin");
  // Ten hien ca o trang khach xem lan the xem truoc luc gui link.
  revalidatePath("/", "layout");
  return {};
}

/**
 * Cho phep dua anh bia album nay len trang gioi thieu cong khai.
 *
 * Mac dinh TAT. Anh cuoi la anh cua khach, phai do studio chu dong chon tung
 * album mot moi dua ra ngoai — khong tu dong lay het.
 */
export async function setFeaturedAction(
  galleryId: string,
  featured: boolean
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: "Chưa đăng nhập." };
  await setFeatured(galleryId, featured);
  revalidatePath("/admin");
  revalidatePath("/");
  return {};
}

/**
 * Xep album vao khu nao tren trang gioi thieu: anh cuoi, chup be, hay phim truong.
 *
 * Studio co nhieu mang va khach cua tung mang khac han nhau: nguoi tim chup
 * cuoi khong di tim chup thoi noi, con nguoi hoi thue phim truong lai la mot
 * nhom khac nua. Nen tren trang gioi thieu moi mang mot khu rieng.
 *
 * Ba khu LOAI TRU NHAU nen chi mot ham duy nhat, khong tach thanh hai cong
 * tac roi rac — de roi rac thi bat duoc ca "la be" lan "la phim truong" cung
 * luc va khong ai doan duoc album do hien o dau.
 *
 * Chi co y nghia khi album da bat "dua len trang gioi thieu".
 */
export async function setKhuAction(
  galleryId: string,
  khu: KhuGioiThieu
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: "Chưa đăng nhập." };
  await setKhuGioiThieu(galleryId, khu);
  revalidatePath("/admin");
  revalidatePath("/");
  return {};
}

/**
 * Dat moc het han cho album — thoi diem studio du dinh xoa anh khoi Drive.
 *
 * Khach thay dem nguoc de tranh thu tai ve. Day chi la loi nhac: het han khong
 * tu chan link, vi anh nam tren Drive, xoa hay khong la do studio.
 *
 * Nhan ISO string (do trang quan ly tinh tu ngay tao + so ngay) hoac null de bo
 * moc han.
 */
export async function setExpiryAction(
  galleryId: string,
  expiresAt: string | null
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: "Chưa đăng nhập." };

  if (expiresAt !== null) {
    const t = Date.parse(expiresAt);
    if (Number.isNaN(t)) return { error: "Ngày không hợp lệ." };
  }

  await setExpiry(galleryId, expiresAt);
  revalidatePath("/admin");
  return {};
}

/** Sinh ma moi — moi phieu mo album cu tu het hieu luc. */
export async function regenerateCodeAction(galleryId: string) {
  if (!(await isAdmin())) return { error: "Chưa đăng nhập." };
  await setAccess(galleryId, sinhMa());
  revalidatePath("/admin");
  return {};
}
