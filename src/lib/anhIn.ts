/**
 * Tinh tien don giao in.
 *
 * QUY TAC LAY TU DUNG LOI DA NOI VOI KHACH, khong duoc tu dat lai. Buoc 02
 * trong huong dan chon anh (HuongDanChon.tsx) viet nguyen van:
 *
 *   "Thay tam nao ung, anh chi bam TRAI TIM de Hamita IN RA nhe. Con DAU TICK
 *    danh cho nhung tam anh chi muon GIU RIENG cho minh."
 *
 *   "Goi cua anh chi co N tam in. Lo thuong them tam nao ngoai goi thi cu chon
 *    thoai mai, moi tam 12.000d da gom ca chinh sua lan in."
 *
 * Suy ra ba dieu, va don in phai theo dung ba dieu do:
 *
 * 1. CHI danh sach "Anh in" (icon heart) moi duoc in va duoc tinh tien.
 *    Danh sach "Anh chon" (icon check) la anh khach giu rieng — dua vao don in
 *    la in thua, ma tinh tien thi la thu tien thu khach khong dat.
 *
 * 2. Dem theo SO TAM RIENG BIET. Mot tam vua tha tim vua tick van chi la mot
 *    tam can in; dem hai lan la in du va tinh tien khach sai.
 *
 * 3. Khong dat goi (soAnhTrongGoi = null) thi KHONG tinh tien gi ca — luc do
 *    phan huong dan phia khach cung da bo qua doan gia, nen tu dung dua ra mot
 *    con so tien la noi khac voi thu khach doc duoc.
 */

export type TinhTien = {
  /** Tong so tam rieng biet trong danh sach "Anh in". */
  soTam: number;
  /** So tam nam trong goi. null khi album khong dat goi. */
  trongGoi: number | null;
  /** So tam vuot goi. null khi album khong dat goi. */
  vuotGoi: number | null;
  /** Tien phai thu them, tinh bang dong. null khi album khong dat goi. */
  thanhTien: number | null;
};

export function tinhTienIn(
  soTam: number,
  soAnhTrongGoi: number | null,
  giaAnhThem: number
): TinhTien {
  if (soAnhTrongGoi === null) {
    return { soTam, trongGoi: null, vuotGoi: null, thanhTien: null };
  }
  const trongGoi = Math.min(soTam, soAnhTrongGoi);
  const vuotGoi = Math.max(0, soTam - soAnhTrongGoi);
  return { soTam, trongGoi, vuotGoi, thanhTien: vuotGoi * giaAnhThem };
}

/**
 * Bo tien to chu va duoi file, chi giu lai ma so.
 *
 * "HMT06704.jpg" -> "06704", "DD_08601.jpg" -> "08601". Ten khong co tien to
 * chu o dau (vi du "001-002.jpg") giu nguyen — khong doan bua, tranh cat mat
 * mot nua ma so cua file ghep nhieu tam.
 *
 * Day la dinh dang doi Media quen dung de do tim anh trong thu muc goc.
 */
export function maSoFile(tenFile: string): string {
  const khongDuoi = tenFile.replace(/\.[a-z0-9]+$/i, "");
  return khongDuoi.replace(/^[^\d]+/, "") || khongDuoi;
}

/** Viet 12000 thanh "12.000" — cach viet tien quen thuoc voi nguoi Viet. */
export function tien(so: number): string {
  return so.toLocaleString("vi-VN");
}
