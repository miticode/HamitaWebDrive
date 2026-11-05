/**
 * Tinh tien don giao in.
 *
 * QUY TAC LAY TU DUNG LOI DA NOI VOI KHACH, khong duoc tu dat lai. Buoc 01
 * trong huong dan chon anh (HuongDanChon.tsx) viet nguyen van:
 *
 *   "Thay tam nao ung, anh chi bam TRAI TIM de Hamita IN RA nhe."
 *
 * Va khoi goi anh ngay duoi luoi anh, ba gach dau dong:
 *
 *   "Goi cua anh chi can tim N tam."
 *   "Ghi chu vao anh: anh cong, anh ban, anh bia,..."
 *   "Chi phi phat sinh them tren moi tam anh la 15.000d, da gom ca chinh
 *    sua va in."
 *
 * DOI CAU CHU PHIA KHACH THI PHAI SUA LAI DOAN TRICH NAY. Ca gia tri cua no
 * nam o cho no la ban sao chinh xac cua loi da noi voi khach — trich sai thi
 * nguoi doc sau se suy ra quy tac tu mot cau khong con ai thay tren man hinh.
 * Doan cu o day da lech 2 ngay (studio doi cau chu 07/09, phat hien 09/09).
 * Lan gan nhat: 01/10/2026 anh nang gia len 15.000d va DUA LAI cum "bao gom
 * ca chinh sua va in" — dao nguoc dung quyet dinh 27/09/2026 (ha xuong
 * 10.000d, bo cum do di). Gia nay la MOT TAM IN THEM DA TRON CONG CHINH SUA,
 * khong phai hai khoan cong lai.
 *
 * Suy ra ba dieu, va don in phai theo dung ba dieu do:
 *
 * 1. CHI danh sach "Anh in" (icon heart) moi duoc in va duoc tinh tien. Tu
 *    15/09/2026 cung chi con danh sach do — nut tick ("Anh chon", giu rieng)
 *    da bo; dong tick cu con trong database nhung kho khong tra ra.
 *
 * 2. Dem theo SO TAM RIENG BIET. Mot tam co hai dong van chi la mot tam can
 *    in; dem hai lan la in du va tinh tien khach sai.
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
 * Goi anh ap dung cho MOT thu muc con.
 *
 * Thu muc co dat rieng thi lay so cua no; khong thi lay con so chung cua ca
 * album. Nho quy tac "khong co dong nao = theo goi chung" ma phan lon album —
 * chi mot goi duy nhat — khong sinh them dong nao trong bang GoiMuc.
 *
 * Nhan albumId chu khong nhan ten: phia khach luon co san ma thu muc, ma ma
 * thi khong doi khi studio doi ten tren Drive.
 */
export function goiCuaMuc(
  goiMuc: { albumId: string; soAnh: number }[],
  albumId: string,
  goiChung: number | null
): number | null {
  const rieng = goiMuc.find((g) => g.albumId === albumId);
  /*
    So voi undefined chu khong viet `rieng?.soAnh ?? goiChung` cho gon: goi 0
    tam la mot goi THAT (goi chi lay file). Viet gon thi 0 van chay dung nho
    `??`, nhung ai doc sau de sua thanh `||` la hong ngay ma khong ai thay —
    day dung la cho da vap mot lan (nguyen tac 38).
  */
  return rieng === undefined ? goiChung : rieng.soAnh;
}

/**
 * Goi anh ap dung cho mot thu muc, tim THEO TEN.
 *
 * Chi don giao in dung ban nay: no gom anh theo `Selection.albumName` — ten
 * thu muc luc khach tha tim — va khong duoc goi Drive de tra ma ra ten
 * (nguyen tac 9). Vi vay bang GoiMuc luu ca ten, cap nhat moi lan studio dat
 * lai so.
 *
 * Diem yeu da biet: studio doi ten thu muc tren Drive SAU khi dat goi rieng
 * thi don in khong khop duoc nua va se quay ve goi chung. Sua bang cach mo o
 * "Goi anh" dat lai mot lan — luc do ten moi duoc ghi de.
 */
export function goiCuaMucTheoTen(
  goiMuc: { tenMuc: string; soAnh: number }[],
  tenMuc: string,
  goiChung: number | null
): number | null {
  const rieng = goiMuc.find((g) => g.tenMuc === tenMuc);
  return rieng === undefined ? goiChung : rieng.soAnh;
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

