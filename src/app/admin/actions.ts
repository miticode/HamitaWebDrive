"use server";

import { revalidatePath } from "next/cache";
import { ghepChacCuaAlbum } from "@/lib/ghepAlbum";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { invalidate } from "@/lib/cache";
import { getFolderName, parseFolderId } from "@/lib/drive";
import { signOut } from "@/lib/auth";
import { quyenAlbum, quyenAlbumNguyHiem, quyenXoaAlbum } from "@/lib/quyenAlbum";
import { layNguoiDung, xoaPhienHienTai } from "@/lib/phienNhanVien";
import { ghiNhatKy, type HanhDong } from "@/lib/nhatKy";
import { docLog, docViecStudio } from "@/lib/moMuc";
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
  setChoTai,
  setMucXong,
  setGoiAnh,
  setGoiMuc,
  setCover,
  setExpiry,
  setMessage,
} from "@/lib/store";
import { guiThongBaoAnhMoi, syncAndWarm } from "@/lib/warm";
import { ghiMoc, khoaBaoTin } from "@/lib/moc";
import { khoaDaDoc } from "@/lib/thongBao";

export type ActionState = {
  error?: string;
  ok?: string;
  /**
   * Hợp đồng khớp rõ với album vừa tạo — hỏi ngay lúc này thay vì để tồn.
   *
   * Đo 14/11/2026: 123 album tạo sau ngày có tính năng gắn, đúng MỘT cái được
   * gắn. Không phải vì khó, mà vì gắn là một việc rời: tạo xong album là người
   * ta sang việc khác, chẳng ai quay lại mở từng album để bấm. Hỏi ngay lúc
   * vừa tạo thì người đang còn nhớ album này của nhà nào.
   *
   * Chỉ gợi ý khi CHẮC (xem `ghepAlbum.ts`), và vẫn là người bấm.
   */
  goiYGhep?: { galleryId: string; hopDongId: string; tenHopDong: string };
};

/**
 * Đăng xuất khỏi trang quản lý album.
 *
 * Xoá CẢ HAI phiếu: mật khẩu quản lý album và phiên tài khoản nhân viên. Từ
 * 16/09/2026 hai đường đăng nhập gộp làm một, chỉ xoá một bên thì bấm "Đăng
 * xuất" xong vẫn vào lại được như thường, mà người bấm tưởng mình đã ra.
 */
/**
 * Ghi một việc vừa làm trên trang album vào Nhật ký thao tác (anh yêu cầu
 * 28/09/2026).
 *
 * Trước đó nhật ký chỉ theo dõi phần CRM; cả mảng ảnh — nơi phòng Media làm
 * việc suốt ngày — không ghi gì, nên xoá nhầm một album là không truy được ai.
 *
 * Người đăng nhập bằng MẬT KHẨU QUẢN LÝ CHUNG không gắn với nhân viên nào,
 * nên ghi rõ là tài khoản chung thay vì để "(không rõ)" — đọc lại còn biết
 * đường mà hỏi.
 */
async function ghiViecAlbum(
  hanhDong: HanhDong,
  galleryId: string | null,
  chiTiet?: Record<string, unknown>,
): Promise<void> {
  const nguoi = await layNguoiDung();
  await ghiNhatKy({
    nguoi: nguoi ? { id: nguoi.id, ten: nguoi.ten } : { id: null, ten: "Tài khoản quản lý chung" },
    hanhDong,
    doiTuong: "album",
    doiTuongId: galleryId ?? undefined,
    chiTiet,
  });
}

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

  await ghiViecAlbum("tao-album", gallery.id, { ten: clientName || folderName, thuMucDrive: folderId });

  revalidatePath("/admin");

  /* Hợp đồng khớp rõ với album vừa tạo — xem chú thích ở `ActionState`. */
  const ghep = await ghepChacCuaAlbum(clientName || folderName);

  return {
    ...(ghep ? { goiYGhep: { galleryId: gallery.id, ...ghep } } : {}),
    ok: `Đã tạo gallery cho "${folderName}". Đang dựng sẵn ảnh đầu tiên…`,
  };
}

export async function deleteGalleryAction(formData: FormData) {
  // Quản lý + phòng Media (anh chốt 28/09/2026) — xem quyenXoaAlbum.
  if (!(await quyenXoaAlbum())) return;
  const id = String(formData.get("id"));
  // Đọc tên TRƯỚC khi xoá: xoá xong thì không còn gì để mà ghi vào nhật ký.
  const g = await getGalleryById(id).catch(() => null);
  await deleteGallery(id);
  await ghiViecAlbum("xoa-album", id, {
    ten: g?.clientName ?? g?.title ?? "(không đọc được tên)",
    thuMucDrive: g?.driveFolderId,
  });
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

  /*
    KHONG ghi nhat ky (anh yeu cau 15/10/2026).

    "Lam moi" la thao tac nhan vien bam lien tuc trong luc doi Drive len anh —
    mot lan up anh co the bam nam bay cai trong vai phut. Ghi het vao nhat ky
    thi khung "Studio da lam" (chi lay 30 dong gan nhat) toan mot cau "Doc lai
    album tu Drive", day chim nhung viec that su can truy: ai tao album, ai
    xoa, ai bam gui thong bao cho khach.

    Bo ghi cung bot mot luot GHI database moi lan bam — nguyen tac 53, Neon
    tinh tien theo thoi gian thuc.

    Nhung dong CU van nam trong bang NhatKy; docViecStudio() loc chung ra.
  */

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
  /*
    Ghi nhật ký cả khi KHÔNG máy nào nhận được (anh yêu cầu 28/09/2026): mốc
    "đã báo tin" thì chỉ ghi khi có người nhận, còn nhật ký là để trả lời "ai
    đã bấm nút này lúc mấy giờ" — bấm hụt cũng là đã bấm.
  */
  await ghiViecAlbum("gui-thong-bao", galleryId, { daGui: kq.daGui, ten: g.clientName ?? g.title });

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

/**
 * Ngat ket noi KHO ANH CRM (tai khoan Drive thu hai).
 *
 * Khong dung chung ham voi `disconnectDriveAction`: ngat nham ket noi goc la
 * moi album dang chay ngung hien anh ngay. Hai nut rieng, hai ham rieng, khong
 * co tham so nao de bam nham.
 *
 * Cung khong can xoa bo nho dem `tree:`/`subs:` — kho anh khong dinh gi toi
 * cay thu muc Drive cua album khach.
 */
export async function disconnectKhoAction() {
  if (!(await quyenAlbumNguyHiem())) return;
  await disconnect("kho");
  revalidatePath("/admin");
}

/** Dat anh bia cho album. fileId rong = tro lai tu dong lay tam dau tien. */
export async function setCoverAction(galleryId: string, fileId: string | null) {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };
  await setCover(galleryId, fileId);
  await ghiViecAlbum("sua-album", galleryId, { doi: "ảnh bìa" });
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
  // KHÔNG ghi chính cái mã vào nhật ký — nhật ký là thứ nhiều người đọc được.
  await ghiViecAlbum("sua-album", galleryId, { doi: "mã chọn ảnh" });
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
  await ghiViecAlbum("sua-album", galleryId, { doi: "lời nhắn", coNoiDung: noiDung.length > 0 });
  revalidatePath("/admin");
  return {};
}

/**
 * Studio bao "Media da sua xong" — go nhan "khach can chinh lai" cua mot thu muc.
 *
 * Anh chot 08/10/2026: studio tu bam dep chu khong doi khach bam. Ly do chon
 * duong nay: Media sua xong la up anh moi len Drive ngay luc do, nen ho dang o
 * truoc may va dep duoc lien — con cho khach vao bam "da ok" thi co nha quen,
 * va cai nhan vang nam lai mai tren the.
 *
 * XOA HAN DONG, khong doi ve "xong": khach chua duyet ban moi thi khong duoc
 * thay mat ho noi la da duyet. Sau khi go, thu muc tro ve trang thai chua bao
 * gi — khach mo lai se thay loi moi duyet nhu lan dau, dung thuc te.
 *
 * Quyen `quyenAlbum()` nhu moi viec thuong ngay cua album: ca tiem lam album
 * (nguyen tac 51), va bam nham thi chi mat mot nhan, khach bao lai duoc.
 */
export async function goCanSuaAction(
  galleryId: string,
  albumId: string,
  tenMuc: string,
): Promise<{ error?: string }> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };

  await setMucXong(galleryId, albumId, tenMuc, { loai: null });
  await ghiViecAlbum("sua-album", galleryId, {
    doi: "gỡ nhãn khách cần chỉnh lại",
    thuMuc: tenMuc,
  });
  revalidatePath("/admin");
  return {};
}

/**
 * Bat/tat quyen tai anh cua mot album.
 *
 * Them 02/10/2026 theo yeu cau cua anh. Truoc do co nay chi dat duoc mot lan
 * luc tao link (o tich trong khung "Tao link moi") roi khong con duong nao
 * doi — nha nao luc tao quen tich thi khach vinh vien khong tai duoc anh.
 *
 * Quyen: quyenAlbum() nhu moi cai dat khac cua album, KHONG phai
 * quyenAlbumNguyHiem(). Bat nham thi tat lai duoc ngay, khac han voi xoa album
 * hay ngat ket noi Drive — nhung thu khong lui lai duoc moi can quan ly.
 *
 * Phai revalidate CA duong trang khach: nut tai anh, dong dem nguoc va nut
 * "Tai ca thu muc" deu doc co nay, nen tat o day ma trang khach con giu ban
 * dung san thi khach van thay nut tai trong vai phut (nguyen tac 58).
 */
export async function setChoTaiAction(
  galleryId: string,
  choTai: boolean,
): Promise<{ error?: string }> {
  if (!(await quyenAlbum())) return { error: "Chưa đăng nhập." };

  await setChoTai(galleryId, choTai);
  await ghiViecAlbum("sua-album", galleryId, {
    doi: "cho khách tải ảnh",
    choTai,
  });
  revalidatePath("/admin");
  revalidatePath("/", "layout");
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
  await ghiViecAlbum("sua-album", galleryId, { doi: "gói ảnh", soAnhTrongGoi: so });
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
  await ghiViecAlbum("sua-album", galleryId, { doi: "tên album", tenMoi: sach });
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
  await ghiViecAlbum("sua-album", galleryId, { doi: "hạn giữ ảnh", hanMoi: expiresAt });
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
  await ghiViecAlbum("sua-album", galleryId, { doi: "sinh mã chọn ảnh mới" });
  revalidatePath("/admin");
  return {};
}

export type DongLogGon = { albumId: string; tenMuc: string; luc: string };
export type ViecStudioGon = { hanhDong: string; nguoiTen: string; luc: string; daGui?: number };

/**
 * Log "khách đã mở thư mục nào" của một album (anh yêu cầu 28/09/2026).
 *
 * Đọc khi studio bấm nút "Logs" chứ không tải sẵn theo thẻ: lưới có mấy chục
 * album, tải sẵn hết là mấy chục lượt hỏi database mà phần lớn không ai xem
 * (nguyên tắc 53).
 */
export async function docLogAction(
  galleryId: string,
): Promise<{ loi?: string; ds?: DongLogGon[]; viec?: ViecStudioGon[] }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  try {
    const [ds, viec] = await Promise.all([docLog(galleryId), docViecStudio(galleryId)]);
    return {
      ds: ds.map((d) => ({ albumId: d.albumId, tenMuc: d.tenMuc, luc: d.luc.toISOString() })),
      viec: viec.map((v) => {
        const ct = v.chiTiet as { daGui?: number } | null;
        return {
          hanhDong: v.hanhDong,
          nguoiTen: v.nguoiTen,
          luc: v.luc.toISOString(),
          daGui: typeof ct?.daGui === "number" ? ct.daGui : undefined,
        };
      }),
    };
  } catch {
    return { loi: "Không đọc được log lúc này, anh chị thử lại sau ít phút." };
  }
}
