"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { invalidate } from "@/lib/cache";
import { getFolderName, parseFolderId } from "@/lib/drive";
import { signOut } from "@/lib/auth";
import { quyenAlbum, quyenAlbumNguyHiem } from "@/lib/quyenAlbum";
import { xoaPhienHienTai } from "@/lib/phienNhanVien";
import { docLog } from "@/lib/moMuc";
import { disconnect } from "@/lib/googleAuth";
import { MA_MAC_DINH, sinhMa } from "@/lib/access";
import { chiCoMa, ghepMaVoiTenThuMuc } from "@/lib/maAlbum";
import { GIA_ANH_THEM_MAC_DINH } from "@/lib/constants";
import {
  createGallery,
  deleteGallery,
  getGalleryById,
  setAccess,
  setBiaMuc,
  setClientName,
  setGoiAnh,
  setGoiMuc,
  setCover,
  setExpiry,
  setMessage,
} from "@/lib/store";
import { guiThongBaoAnhMoi, syncAndWarm } from "@/lib/warm";
import { ghiMoc, khoaBaoTin } from "@/lib/moc";
import { khoaDaDoc } from "@/lib/thongBao";

export type ActionState = { error?: string; ok?: string };

/**
 * Đăng xuất khỏi trang quản lý album.
 *
 * Xoá CẢ HAI phiếu: mật khẩu quản lý album và phiên tài khoản nhân viên. Từ
 * 16/09/2026 hai đường đăng nhập gộp làm một, chỉ xoá một bên thì bấm "Đăng
 * xuất" xong vẫn vào lại được như thường, mà người bấm tưởng mình đã ra.
 */
export async function logoutAction() {
  await signOut();
  await xoaPhienHienTai();
  redirect("/quan-ly/dang-nhap");
}

export async function createGalleryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };

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

  /*
    Ten khach, voi hai truong hop dac biet phai don o DAY chu khong phai o giao
    dien — day la cho DUY NHAT moi duong vao database deu di qua, go tay ra
    chuoi nhu vay cung duoc don.

    1. Dau noi lung lo o cuoi ("ĐH -"): nut goi y ma chen san dau noi de nhan
       vien go tiep ten.
    2. CHI CO MA, chua go ten nao — anh bao 23/09/2026: bam "HC" roi bam Tao
       link luon thi album ra ten trong tron, chi con moi chu "HC". Gio web tu
       lay ten thu muc tren Drive ghep vao: "HC - Ngọc Thơ & Minh Anh". Thu muc
       mang san ma thi bo ma cua no di, khong thi ma lap hai lan.

    O de trong han thi van de `null` nhu cu — luc do ca trang quan ly lan trang
    khach cung quay ve dung ten thu muc, khong can chep lai lam gi.
  */
  const goc = String(formData.get("clientName") ?? "").trim();
  const clientName = chiCoMa(goc)
    ? ghepMaVoiTenThuMuc(goc, folderName)
    : goc.replace(/[\s\-–—]+$/, "").trim();

  const gallery = await createGallery({
    title: folderName,
    clientName: clientName || null,
    driveFolderId: folderId,
    allowDownload: formData.get("allowDownload") === "on",
  });

  /*
    Ma dat san la MA_MAC_DINH ("123456"), khong phai ma ngau nhien.

    Studio muon mot ma chung cho de doc qua dien thoai. Nut "Sinh ma moi" van
    sinh ngau nhien nhu cu — neu no cung tra ve 123456 thi bam xong ma khong
    doi, nut thanh vo nghia.
  */
  await setAccess(gallery.id, MA_MAC_DINH);

  // Dung san nhung tam anh dau tien sau khi da tra loi — khach mo link ngay
  // luc nay cung khong phai doi tung tam mot.
  after(() => syncAndWarm(gallery.id, folderId).catch(() => {}));

  revalidatePath("/admin");
  return {
    ok: `Đã tạo gallery cho "${folderName}". Đang dựng sẵn ảnh đầu tiên…`,
  };
}

export async function deleteGalleryAction(formData: FormData) {
  if (!(await quyenAlbumNguyHiem())) return;
  await deleteGallery(String(formData.get("id")));
  revalidatePath("/admin");
}

/** Xoa cache de anh thay ngay folder vua them, khong phai doi het 5 phut. */
export async function refreshGalleryAction(formData: FormData) {
  if (!(await quyenAlbum())) return;
  const folderId = String(formData.get("folderId"));
  const galleryId = String(formData.get("galleryId"));
  // Hai cache rieng: cay anh cho trang khach, va danh sach thu muc con cho trang nay.
  invalidate(`tree:${folderId}`);
  invalidate(`subs:${folderId}`);

  // Doc lai so lieu tu Drive roi dung san anh cua nhung folder vua them.
  after(() => syncAndWarm(galleryId, folderId).catch(() => {}));

  revalidatePath("/admin");
}

/**
 * Gui tin "co anh moi" cho khach da dang ky nhan thong bao cua mot album.
 *
 * NUT RIENG, khong dinh vao "Lam moi" (yeu cau 04/09/2026). Truoc day gop
 * chung nen nhan vien bam "Lam moi" de xem anh da len chua ma khong ngo moi cu
 * bam la mot lan dien thoai khach rung. Hai viec khac han nhau ve hau qua —
 * mot cai chi dung so lieu trong nha, mot cai cham toi khach.
 *
 * KHONG chay trong `after()` nhu Lam moi: studio can biet ngay tin da di duoc
 * toi may may. Gui xong ma im lang thi lan sau khong ai dam bam nua.
 */
export async function guiThongBaoAction(
  galleryId: string,
): Promise<{ error?: string; daGui?: number }> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };

  const g = await getGalleryById(galleryId);
  if (!g) return { error: "Không tìm thấy album." };

  const kq = await guiThongBaoAnhMoi(galleryId, g.slug);

  /*
    Ghi lai MOC DA GUI cho album nay (yeu cau 07/09/2026).

    Van de studio gap: hai muoi bay album, bam gui rai rac ca ngay, roi khong
    ai nho da bam cho nha nao. Khong nho thi hoac bo sot mot nha, hoac gui lai
    lan hai lam dien thoai ho rung vo co.

    CHI ghi khi that su co may nhan duoc. `daGui = 0` nghia la moi phieu deu
    chet (khach go app) — khong mot ai nhan duoc gi, ghi "da gui" luc do la
    dan cho studio yen tam ve mot viec chua xay ra.

    Nuot loi qua `.catch`: ghi moc hong thi cung khong duoc bao la gui that
    bai, vi tin da roi vao dien thoai khach roi. Cung ly do voi `ghiMoc` o
    duong sao luu.
  */
  if (kq.daGui > 0) {
    await ghiMoc(khoaBaoTin(galleryId), new Date()).catch(() => {});
    revalidatePath("/admin");
  }

  return { daGui: kq.daGui };
}

/**
 * Danh dau mot thong bao la da doc — no bien mat khoi khung.
 *
 * Ghi vao bang `Moc` voi khoa mang tien to rieng (xem khoaDaDoc). Ghi vao
 * DATABASE chu khong phai trong trinh duyet: studio mo trang quan ly tren ca
 * may tinh lan dien thoai, danh dau o may nay ma may kia van con hien thi la
 * doc hai lan cho cung mot viec.
 *
 * KHONG revalidate lai trang: khung thong bao tu bo dong do o phia trinh duyet
 * ngay khi bam, con lan tai trang sau thi `docThongBao` da loc san. Goi
 * revalidatePath o day chi lam ca trang ve lai vi mot dong bien mat.
 */
export async function danhDauDaDocAction(
  id: string,
): Promise<{ error?: string }> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };
  if (!id.trim()) return { error: "Thiếu mã thông báo." };

  await ghiMoc(khoaDaDoc(id), new Date());
  return {};
}

/** Ngat ket noi Google Drive — web quay ve dung service account. */
export async function disconnectDriveAction() {
  if (!(await quyenAlbumNguyHiem())) return;
  await disconnect();
  invalidate("subs:");
  invalidate("tree:");
  revalidatePath("/admin");
}

/** Dat anh bia cho album. fileId rong = tro lai tu dong lay tam dau tien. */
export async function setCoverAction(galleryId: string, fileId: string | null) {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };
  await setCover(galleryId, fileId);
  revalidatePath("/admin");
  return {};
}

/** Doi ma chon anh cua album. */
export async function setAccessAction(
  galleryId: string,
  code: string,
): Promise<{ error?: string }> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };

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
  message: string,
): Promise<{ error?: string }> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };

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
  soAnh: string,
): Promise<{ error?: string }> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };

  /*
    Nhan CA SO 0, khong chi tu 1 tro len.

    0 khong phai "chua dat" — no la mot goi that: goi chi lay file anh, khong
    kem tam in nao. Khach van tha tim binh thuong, chi la tam nao cung tinh
    tien in. Phan biet voi de TRONG (null = album khong tinh theo goi, phia
    khach bo han doan gia ca).
  */
  const soSach = soAnh.trim();
  let so: number | null = null;
  if (soSach) {
    so = Number(soSach);
    if (!Number.isInteger(so) || so < 0) {
      return { error: "Số ảnh trong gói phải là số nguyên từ 0 trở lên." };
    }
  }

  await setGoiAnh(galleryId, so, GIA_ANH_THEM_MAC_DINH);
  revalidatePath("/admin");
  // So nay hien o trang khach xem nen phai lam moi ca duong do.
  revalidatePath("/", "layout");
  return {};
}

/**
 * Dat so anh trong goi cho RIENG mot thu muc con cua album.
 *
 * Vi sao co: mot nha khach chup lam nhieu dot cach nhau ca thang — chup cong
 * truoc, it lau sau moi chup cuoi — moi dot mot goi voi so tam in khac nhau
 * (studio yeu cau 10/09/2026). Truoc do ca album chi co mot con so.
 *
 * De TRONG nghia la BO dat rieng: thu muc quay ve dung con so chung cua album.
 * Khong dung 0 cho viec do — 0 la mot goi that (goi chi lay file), giong het
 * cach phan biet o setGoiAnhAction.
 *
 * Ten thu muc luu kem de don giao in doc duoc ma khong phai goi Drive
 * (nguyen tac 9) — xem model GoiMuc trong schema.
 */
export async function setGoiMucAction(
  galleryId: string,
  albumId: string,
  tenMuc: string,
  soAnh: string,
): Promise<{ error?: string }> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };
  if (!tenMuc.trim()) return { error: "Thiếu tên thư mục." };

  const soSach = soAnh.trim();
  let so: number | null = null;
  if (soSach) {
    so = Number(soSach);
    if (!Number.isInteger(so) || so < 0) {
      return { error: "Số ảnh trong gói phải là số nguyên từ 0 trở lên." };
    }
  }

  await setGoiMuc(galleryId, albumId, tenMuc.trim(), so);
  revalidatePath("/admin");
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
  ten: string,
): Promise<{ error?: string }> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };

  const sach = ten.trim();
  if (sach.length > 120) return { error: "Tên dài quá 120 ký tự." };

  await setClientName(galleryId, sach || null);
  revalidatePath("/admin");
  // Ten hien ca o trang khach xem lan the xem truoc luc gui link.
  revalidatePath("/", "layout");
  return {};
}

/*
  setFeaturedAction / setKhuAction đã bỏ 17/09/2026: mọi thứ lên trang giới
  thiệu chọn ở /admin/gioi-thieu (actionsGioiThieu.ts). Cột featured và
  khuGioiThieu của Gallery vẫn còn trong database, không ai đọc nữa.
*/

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
  expiresAt: string | null,
): Promise<{ error?: string }> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };

  if (expiresAt !== null) {
    const t = Date.parse(expiresAt);
    if (Number.isNaN(t)) return { error: "Ngày không hợp lệ." };
  }

  await setExpiry(galleryId, expiresAt);
  revalidatePath("/admin");
  return {};
}

/**
 * Dat anh bia rieng cho mot thu muc con. fileId rong = bo chon, quay ve dung
 * tam dau tien nhu mac dinh.
 */
export async function setBiaMucAction(
  galleryId: string,
  albumId: string,
  fileId: string | null,
): Promise<{ error?: string }> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };

  await setBiaMuc(galleryId, albumId, fileId?.trim() || null);

  /*
    Anh bia thu muc hien o TRANG BIA CUA KHACH, khong phai trang quan ly — nen
    phai lam moi ca hai. Thieu duong cua khach thi studio doi bia xong, mo link
    khach ra van thay tam cu cho toi khi Next tu het han bo nho dem.
  */
  revalidatePath("/admin");
  const g = await getGalleryById(galleryId);
  if (g) revalidatePath(`/g/${g.slug}`);
  return {};
}

/** Sinh ma moi — moi phieu mo album cu tu het hieu luc. */
export async function regenerateCodeAction(galleryId: string) {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };
  await setAccess(galleryId, sinhMa());
  revalidatePath("/admin");
  return {};
}

export type DongLogGon = { albumId: string; tenMuc: string; luc: string };

/**
 * Log "khách đã mở thư mục nào" của một album (anh yêu cầu 28/09/2026).
 *
 * Đọc khi studio bấm nút "Logs" chứ không tải sẵn theo thẻ: lưới có mấy chục
 * album, tải sẵn hết là mấy chục lượt hỏi database mà phần lớn không ai xem
 * (nguyên tắc 53).
 */
export async function docLogAction(
  galleryId: string,
): Promise<{ loi?: string; ds?: DongLogGon[] }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  try {
    const ds = await docLog(galleryId);
    return { ds: ds.map((d) => ({ albumId: d.albumId, tenMuc: d.tenMuc, luc: d.luc.toISOString() })) };
  } catch {
    return { loi: "Không đọc được log lúc này, anh chị thử lại sau ít phút." };
  }
}
