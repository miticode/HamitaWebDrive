/** Anh nam ngay o thu muc goc khong co folder ID, dung ma nay thay the tren URL. */
export const ROOT_ALBUM = "_le";

/** Ten studio hien tren trang khach xem. Doi bang bien moi truong khi can. */
export const STUDIO_NAME =
  process.env.NEXT_PUBLIC_STUDIO_NAME?.trim() || "Hamita Studio";

/**
 * Loi chuc hien o dau album khi studio khong viet loi nhan rieng.
 *
 * Phai chung chung: mot album co the la chup hinh cong, chup album, chup ben
 * nha gai hay nha trai — nhac dich danh "ngay cuoi" se tro khap voi phan lon
 * cac buoi chup.
 */
export const LOI_CHUC_MAC_DINH =
  "Cảm ơn anh chị đã tin tưởng và để Hamita được đồng hành. " +
  "Hamita gửi anh chị trọn bộ ảnh ở đây — mong mỗi lần mở ra, " +
  "anh chị lại thấy nguyên vẹn niềm vui của ngày hôm ấy.";

/**
 * Dia chi goc cua web, dung cho anh xem truoc khi gui link qua Zalo/Facebook.
 * Vercel tu dat VERCEL_PROJECT_PRODUCTION_URL cho ban chinh thuc.
 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return new URL(explicit);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return new URL(`https://${vercel}`);

  return new URL("http://localhost:3000");
}

/**
 * Tran so diem anh cho phep khi doc mot tam anh.
 *
 * Thu vien xu ly anh (sharp) mac dinh chi nhan toi 268 trieu diem anh de tranh
 * "bom nen" — mot tep nho xiu nhung giai nen ra khong lo, du lam het bo nho may
 * chu. Anh in kho lon that su vuot moc do: mot tam mica 60x120cm trong album
 * cua khach do duoc 18000x36000 = 648 trieu diem anh, va truoc khi noi tran nay
 * thi route anh tra ve loi "Input image exceeds pixel limit" sau 30 giay cho.
 *
 * Da do that voi chinh tam do: tai ve 4,5 giay, thu nho 1,9 giay, bo nho dinh
 * diem chi 340 MB — nhe vi thu vien giai nen JPEG thang o ti le thu nho san
 * (shrink-on-load) chu khong bung ca tam ra bo nho.
 *
 * Van dat mot con so cu the thay vi tat han: gap ba lan tam anh lon nhat tung
 * gap, du cho anh in kho lon hon nua ma khong bo han lop chan bom nen.
 */
export const TRAN_DIEM_ANH = 2_000_000_000;

/**
 * Gia mac dinh cho moi tam anh vuot goi, tinh bang dong.
 * Da gom ca chinh sua lan in. Sua duoc cho tung album o trang quan ly.
 */
export const GIA_ANH_THEM_MAC_DINH = 12_000;

/**
 * Viet 12000 thanh "12.000" — cach viet tien quen thuoc voi nguoi Viet.
 *
 * De o day vi CA HAI PHIA cung dung: trang quan ly (o dat goi, don giao in) va
 * trang khach (khoi goi anh, khung hoi dap). Truoc ngay 09/09/2026 ham nay bi
 * chep y het ra BON cho — anhIn.ts, GoiAnh.tsx, HuongDanChon.tsx, hoiDap.ts —
 * moi ban ba dong giong nhau. Doi cach viet tien thi phai nho sua ca bon, ma
 * quen mot cho la hai trang hien hai kieu so cho cung mot gia (nguyen tac 15).
 *
 * `constants.ts` la cho dung: no khong nhap gi ca nen may khach nhap vao cung
 * an toan (nguyen tac 43), va hang so gia `GIA_ANH_THEM_MAC_DINH` ngay tren
 * cung mot cap.
 */
export function tien(so: number): string {
  return so.toLocaleString("vi-VN");
}

/**
 * So ngay giu anh mac dinh — sau moc nay studio du dinh xoa anh khoi Drive.
 * Chi la loi nhac de khach tranh thu tai; het han khong tu chan link.
 */
export const SO_NGAY_GIU_ANH_MAC_DINH = 90;

/**
 * Mui gio cua studio.
 *
 * Moc thoi gian trong database la UTC. Muon biet mot album duoc tao NGAY NAO
 * thi phai quy ve mot mui gio cu the, va mui gio dung o day la cua studio chu
 * khong phai cua may dang mo trang:
 *
 * - Ham chay tren Vercel dung UTC, trinh duyet o Long An dung UTC+7. Album tao
 *   luc 0h30 ngay 1/1 gio Viet Nam la 17h30 ngay 31/12 theo UTC — hai ben se
 *   xep no vao HAI NAM khac nhau, va React bao loi lech giua ban may chu dung
 *   san voi ban may khach dung lai.
 * - Ghim mui gio thi ca hai ben ra cung mot ket qua, va con dung ve nghiep vu:
 *   "album nay tao thang 9" phai tinh theo lich cua studio, khong doi theo noi
 *   nguoi xem dang dung.
 */
export const MUI_GIO = "Asia/Ho_Chi_Minh";
/**
 * "7/9 17:40" — theo gio studio, khong theo gio may dang mo trang
 * (nguyen tac 35).
 *
 * Ghep tu `formatToParts` chu khong dung thang chuoi `format()` tra ve: ban
 * tieng Viet xep gio len TRUOC ngay ("17:40 7/9"), doc nguoc voi cach nguoi ta
 * noi. Ghep tay thi thu tu do minh quyet, ma mui gio van do Intl lo.
 *
 * De o day chu khong o GalleryCard.tsx (noi no ra doi): tu 01/10/2026 trang
 * "Anh khach chon" — mot trang MAY CHU — cung in gio chon gan nhat cua moi thu
 * muc. Hai ban chep tay thi co ngay hai noi in hai kieu cho cung mot moc.
 */
export function lucGon(iso: string): string {
  const phan = new Intl.DateTimeFormat("vi-VN", {
    timeZone: MUI_GIO,
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const lay = (loai: string) => phan.find((p) => p.type === loai)?.value ?? "";

  return `${lay("day")}/${lay("month")} ${lay("hour")}:${lay("minute")}`;
}


/**
 * Moc bat dau dem so anh khach tai ve.
 *
 * Cot `luotTai` mac dinh la 0, nen album tao TRUOC moc nay cung mang so 0 du
 * khach da tai het ve tu lau. Khong phan biet thi trang quan ly se bao "khach
 * chua lay anh" cho nhung nha da lay xong — roi studio giu Drive day mai vi
 * tuong chua ai tai. The album so bang ngay tao de biet co nen hien so hay
 * giau di.
 *
 * De o day chu KHONG phai thongKe.ts (noi co MOC_DEM_LUOT_XEM cung loai): the
 * album chay o may khach, ma thongKe.ts nhap `getPrisma` — nhap qua do la keo
 * ca Prisma vao goi phia khach va vo build.
 */
export const MOC_DEM_LUOT_TAI = new Date("2026-09-06T00:00:00Z");

/** Moc het han mac dinh cho album vua tao: hom nay cong so ngay giu anh. */
export function hanMacDinh(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SO_NGAY_GIU_ANH_MAC_DINH);
  return d;
}

/**
 * Co phai bot xem truoc link khong (Facebook, Zalo, Google...).
 *
 * Dung de KHONG dem chung vao luot xem cua khach: moi lan ai do dan link vao
 * khung chat la bot goi vao trang mot lan. Dem ca vao thi con so "khach da mo
 * link chua" thanh vo nghia — ma do moi la cau hoi studio can tra loi.
 *
 * Danh sach nay khong bao gio day du, va khong can day du: bo sot mot bot chi
 * lam con so cao hon thuc te mot chut, khong lam sai ban chat.
 */
export function laBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // Khong khai bao gi thi gan nhu chac chan la may.
  return /bot|crawler|spider|facebookexternalhit|zalo|slurp|bingpreview|whatsapp|telegram|preview|headless/i.test(
    userAgent
  );
}

/**
 * Moc bat dau ghi lai "da bam Gui thong bao cho album nay".
 *
 * Truoc moc nay khong co gi ghi lai ca, nen album khong co dong nao trong bang
 * `Moc` co the la "chua gui lan nao" MA CUNG co the la "gui roi, hoi do chua
 * ghi". The album phai noi ro hai truong hop do la hai thu khac nhau — bao
 * "chua gui" cho mot nha da nhan tin la lam studio gui lai lan hai, dien thoai
 * khach rung vo co.
 *
 * Cung ly do va cung cach dung voi MOC_DEM_LUOT_TAI trong chinh file nay.
 */
export const MOC_GHI_LAN_BAO = new Date("2026-09-07T00:00:00Z");

/**
 * Bo dau tieng Viet: "Hoàn thiện" → "hoan thien".
 *
 * Dung chung cho o tim album o trang quan ly (go khong dau van tim ra) va cho
 * `laMucHoanThien()` ngay duoi. De o day vi CA HAI PHIA cung dung va file nay
 * khong nhap gi ca (nguyen tac 43).
 */
export function boDau(s: string): string {
  return s
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/*
  Dau hieu mot thu muc chua ANH DA CHINH XONG, khong phai file goc.

  `\b` hai dau cua "pts" la co y: thieu no thi mot ten nhu "scripts" cung khop.
  Con "hoan thien" thi khong can vi khong tu tieng Viet nao chua no ma mang
  nghia khac.
*/
const DAU_HIEU_HOAN_THIEN = /(hoan thien|\bpts\b)/;

/**
 * Thu muc nay la anh DA CHINH XONG hay file goc?
 *
 * Studio yeu cau 09/09/2026. Hai loai thu muc doi hoi khach lam hai viec khac
 * han nhau, nen chu cung phai khac:
 *
 * - **File goc** — khach CHON: luot qua vai tram tam, tha tim tam nao muon in.
 *   Cau hoi dung la "chon xong chua ạ?".
 * - **Hoan thien / PTS** — khach DUYET: Hamita da chinh xong roi, khach xem
 *   lai va gat dau de mang di in. Hoi "chon xong chua" o day la hoi sai viec.
 *
 * Nhan dang bang TEN THU MUC vi do la thu duy nhat co san — thu muc con khong
 * co ban ghi nao trong database (nguyen tac 4, 32), va bat studio danh dau tay
 * tung thu muc thi se co ngay quen.
 *
 * Doi lai phai chap nhan: studio doi ten thu muc tren Drive la doi luon chu
 * khach doc. Do cung la ly do bo dau va khong phan biet hoa thuong — "Hoàn
 * thiện", "hoan thien", "HOÀN THIỆN", "Pts", "pts" deu phai an nhu nhau.
 */
export function laMucHoanThien(tenMuc: string): boolean {
  return DAU_HIEU_HOAN_THIEN.test(boDau(tenMuc));
}
