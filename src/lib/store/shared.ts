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
  /** Moc studio du dinh xoa anh (ISO). null = khong dat han. */
  expiresAt: string | null;
  /** Khach tu bao da chon xong luc nao (ISO). null = chua bao. */
  selectionsDoneAt: string | null;
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
};

/** Hai kho du lieu (JSON khi chay o may, Postgres khi len mang) deu theo giao dien nay. */
export type Store = {
  listGalleries(): Promise<Gallery[]>;
  getGalleryBySlug(slug: string): Promise<Gallery | null>;
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

  setFeatured(galleryId: string, featured: boolean): Promise<void>;

  /** Xep album vao mang chup be (true) hay mang cuoi (false). */
  setBaby(galleryId: string, laBaby: boolean): Promise<void>;

  setExpiry(galleryId: string, expiresAt: string | null): Promise<void>;

  /** Khach bao da chon xong hay chua. */
  setSelectionsDone(galleryId: string, xong: boolean): Promise<void>;
  listCounts(): Promise<ListCount[]>;
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
