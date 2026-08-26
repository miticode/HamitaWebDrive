export type Gallery = {
  id: string;
  slug: string;
  title: string;
  clientName: string | null;
  /** Loi nhan rieng cho khach nay. null = dung loi chuc chung. */
  message: string | null;
  /** Cho phep dua anh bia len trang gioi thieu cong khai. */
  featured: boolean;
  /**
   * Album thuoc mang chup be (Hami Baby) chu khong phai mang cuoi.
   * Chi co y nghia khi featured bat — quyet dinh anh bia roi vao khu nao tren
   * trang gioi thieu.
   */
  laBaby: boolean;
  /**
   * Album nay la phim truong cua studio, khong phai anh cua khach.
   * Xem chu thich day du o model Gallery trong schema.prisma.
   */
  laPhimTruong: boolean;
  /** Moc studio du dinh xoa anh (ISO). null = khong dat han. */
  expiresAt: string | null;
  /** Khach tu bao da chon xong luc nao (ISO). null = chua bao. */
  selectionsDoneAt: string | null;
  /**
   * So anh in da bao gom trong goi khach mua. null = khong noi toi goi, phan
   * huong dan o trang khach se bo qua doan gia ca.
   */
  soAnhTrongGoi: number | null;
  /** Gia moi tam vuot goi (dong), da gom chinh sua lan in. */
  giaAnhThem: number;
  driveFolderId: string;
  allowDownload: boolean;
  createdAt: string;
} & GalleryMeta & {
  coverPinned: boolean;
  syncedAt: string | null;
  accessCode: string | null;
};

/**
 * So lieu chup lai tu Drive, luu trong database.
 * Trang quan tri doc thang tu day thay vi duyet lai cay thu muc moi lan mo.
 */
export type GalleryMeta = {
  coverFileId: string | null;
  photoCount: number;
  albumCount: number;
  subfolders: string[];
};

/** So anh khach da chon trong tung danh sach, gom cho ca danh sach gallery. */
export type ListCount = {
  galleryId: string;
  listId: string;
  name: string;
  icon: "heart" | "check";
  count: number;
};

/** Mot danh sach chon anh, vi du "Ảnh in" (tim) hoac "Ảnh chọn" (tick). */
export type SelectionList = {
  id: string;
  galleryId: string;
  name: string;
  icon: "heart" | "check";
  position: number;
};

export type Selection = {
  id: string;
  listId: string;
  driveFileId: string;
  /** Luu kem ten file va ten album de xuat danh sach duoc ke ca khi anh bi go khoi Drive. */
  fileName: string;
  albumName: string;
  visitorId: string;
  note: string | null;
  createdAt: string;
};

/** Mot thu muc con khach da bao chon xong. */
export type MucXong = {
  galleryId: string;
  /** Chuoi rong = anh nam ngay thu muc goc. */
  albumId: string;
  tenMuc: string;
  /** Luc bao, dang ISO. */
  xongLuc: string;
};

export type CreateGalleryInput = {
  title: string;
  clientName: string | null;
  driveFolderId: string;
  allowDownload: boolean;
};

export type ToggleSelectionInput = {
  listId: string;
  driveFileId: string;
  fileName: string;
  albumName: string;
  visitorId: string;

  /**
   * Trang thai khach MUON dat sau cu bam: true = chon, false = bo chon.
   *
   * Vi sao can noi ro thay vi cu lat nguoc: ca nha dung chung mot danh sach,
   * nen hai may co the cung bam mot tam. May thu hai van dang giu trang thai
   * cu ("tam nay chua chon") nen cu bam cua ho la "chon"; neu may chu lat
   * nguoc theo database thi no lai XOA dung tam nguoi kia vua chon — bam tim
   * ma thanh bo tim, va khong ai thay gi bat thuong.
   *
   * Da do that tren ban dang chay ngay 26/08/2026: hai lan POST lien tiep cung
   * mot tam tra ve {selected:true} roi {selected:false}.
   *
   * Bo trong = lat nguoc nhu cu. Giu duong lui nay cho nhung may khach dang mo
   * san trang voi ban JavaScript cu, chua tai lai.
   */
  muon?: boolean;
};

/**
 * Ba khu tren trang gioi thieu. Mot album chi thuoc dung MOT khu.
 *
 * "cuoi" va "baby" gop ANH BIA cua nhieu album vao mot luoi. "phimtruong" thi
 * doc thang nhieu anh tu trong mot album duy nhat ra — xem schema.prisma.
 */
export type KhuGioiThieu = "cuoi" | "baby" | "phimtruong";

/** Hai kho du lieu (JSON khi chay o may, Postgres khi len mang) deu theo giao dien nay. */
export type Store = {
  listGalleries(): Promise<Gallery[]>;
  getGalleryBySlug(slug: string): Promise<Gallery | null>;
  /** Lay theo ma noi bo — dung o nhung cho chi cam ma, nhu luc dong bo Drive. */
  getGalleryById(id: string): Promise<Gallery | null>;
  createGallery(input: CreateGalleryInput): Promise<Gallery>;
  deleteGallery(id: string): Promise<void>;
  getLists(galleryId: string): Promise<SelectionList[]>;
  getSelections(galleryId: string): Promise<Selection[]>;
  updateGalleryMeta(galleryId: string, meta: GalleryMeta): Promise<void>;
  /** Dat anh bia do nguoi dung chon; null = tro lai tu dong lay tam dau tien. */
  setCover(galleryId: string, fileId: string | null): Promise<void>;
  /** Doi ma chon anh cua album. */
  setAccess(galleryId: string, code: string): Promise<void>;

  setMessage(galleryId: string, message: string | null): Promise<void>;

  /**
   * Doi ten khach hien tren album. null = quay ve dung ten thu muc tren Drive.
   * KHONG dung toi slug: link da gui khach van song nguyen.
   */
  setClientName(galleryId: string, clientName: string | null): Promise<void>;

  setFeatured(galleryId: string, featured: boolean): Promise<void>;

  /**
   * Xep album vao khu nao tren trang gioi thieu.
   *
   * Mot ham thay vi hai co chuyen (setBaby + setPhimTruong): ba khu la ba lua
   * chon LOAI TRU NHAU, de hai co roi rac thi bat duoc ca hai cung luc va
   * khong ai biet album do se hien o dau.
   */
  setKhuGioiThieu(galleryId: string, khu: KhuGioiThieu): Promise<void>;

  /**
   * Dat so anh trong goi va gia moi tam vuot goi.
   * soAnhTrongGoi = null nghia la khong noi toi goi o trang khach.
   */
  setGoiAnh(
    galleryId: string,
    soAnhTrongGoi: number | null,
    giaAnhThem: number
  ): Promise<void>;

  setExpiry(galleryId: string, expiresAt: string | null): Promise<void>;

  /** Khach bao da chon xong hay chua. */
  setSelectionsDone(galleryId: string, xong: boolean): Promise<void>;

  /**
   * Khach bao da chon xong cho MOT thu muc con (hoac bo bao de chon them).
   * Tinh rieng tung thu muc — xem model MucXong trong schema.
   */
  setMucXong(
    galleryId: string,
    albumId: string,
    tenMuc: string,
    xong: boolean
  ): Promise<void>;

  /** Cac thu muc khach da bao xong cua mot album. */
  getMucXong(galleryId: string): Promise<MucXong[]>;

  /** Cac thu muc da bao xong cua MOI album — trang quan ly doc mot lan. */
  listMucXong(): Promise<MucXong[]>;
  listCounts(): Promise<ListCount[]>;
  /**
   * Chon hoac bo chon mot anh.
   *
   * Tra ve trang thai THAT SU trong database sau khi ghi, khong phai thu phia
   * trinh duyet doan — phia goi bat buoc phai lay ket qua nay lam chuan, vi
   * mot may khac co the vua doi trang thai cua chinh tam do.
   */
  toggleSelection(input: ToggleSelectionInput): Promise<{ selected: boolean }>;
  /** Ghi chu rieng cho mot anh da chon, vi du "in co 40x60". null = xoa ghi chu. */
  setSelectionNote(
    listId: string,
    driveFileId: string,
    visitorId: string,
    note: string | null
  ): Promise<void>;
};

/** Hai danh sach mac dinh tao kem moi gallery. */
export const DEFAULT_LISTS = [
  { name: "Ảnh in", icon: "heart" as const, position: 0 },
  { name: "Ảnh chọn", icon: "check" as const, position: 1 },
];

const VIETNAMESE_MAP: Record<string, string> = { đ: "d", Đ: "d" };

/*
  Chu cai dung cho duoi ngau nhien cua slug. Bo l/o/0/1 cho khoi nhin nham khi
  anh doc link qua dien thoai cho khach.
*/
const CHU_DUOI = "abcdefghijkmnpqrstuvwxyz23456789";

/**
 * Duoi ngau nhien gan vao cuoi moi slug: "le-han" -> "le-han-k7m2xq".
 *
 * Ly do phai co: truoc day slug lay thang tu ten khach, nghia la ai biet ten
 * co dau chu re la doan ra link va xem duoc ca bo anh cuoi. Album deu la anh
 * rieng tu cua khach nen link phai kho doan, khong the chi dua vao viec "it ai
 * nghi ra".
 *
 * 32^6 la hon mot ty to hop — cong voi viec phai doan dung ca ten, du de khong
 * ai mo trung.
 *
 * Dung crypto toan cuc (co san ca o Node lan trinh duyet) thay vi node:crypto,
 * vi file nay con duoc cac component phia khach lay kieu du lieu.
 */
export function duoiSlug(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHU_DUOI[b % CHU_DUOI.length]).join("");
}

/** Bien ten khach thanh chuoi dung duoc tren URL: "Vũ Phương" -> "vu-phuong". */
export function slugify(input: string): string {
  return input
    .replace(/[đĐ]/g, (c) => VIETNAMESE_MAP[c])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
