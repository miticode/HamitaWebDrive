import { JWT } from "google-auth-library";
import { getUserAccessToken } from "@/lib/googleAuth";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const API = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Gioi han an toan khi di vao thu muc con. */
const MAX_DEPTH = 4;
const MAX_PHOTOS = 5000;

export type DrivePhoto = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdTime: string;
  /**
   * Gio may anh bam may, doc tu EXIF — dang "2026:05:17 11:50:54", KHONG kem
   * mui gio. null khi anh khong mang EXIF (anh xuat lai tu phan mem chinh sua
   * thuong mat sach). Khac han `createdTime` la luc tep duoc up len Drive:
   * do that tren 198 anh, gio up xao tron hoan toan (10:24, 10:25, 10:23...)
   * trong khi gio chup tang deu.
   */
  chupLuc: string | null;
  /** Ten thu muc con chua anh. null = nam ngay o thu muc goc. */
  section: string | null;
};

let client: JWT | null = null;

/**
 * Doc credentials cua Service Account tu env.
 * Chap nhan ca JSON thuan lan chuoi base64 (base64 de dan vao .env hon,
 * vi private key co xuong dong).
 */
function loadCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error(
      "Thieu GOOGLE_SERVICE_ACCOUNT_JSON trong .env.local. Xem huong dan o README."
    );
  }
  const json = raw.startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");

  const parsed = JSON.parse(json) as { client_email?: string; private_key?: string };
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("File service account khong hop le: thieu client_email hoac private_key.");
  }
  return { email: parsed.client_email, key: parsed.private_key };
}

function getClient(): JWT {
  if (!client) {
    const { email, key } = loadCredentials();
    client = new JWT({ email, key, scopes: SCOPES });
  }
  return client;
}

export function serviceAccountEmail(): string {
  return loadCredentials().email;
}

/** Access token cua service account, hoac null neu chua khai bao. */
async function serviceAccountToken(): Promise<string | null> {
  try {
    const t = await getClient().getAccessToken();
    return t.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Goi Drive API, uu tien tai khoan Google cua studio (neu da ket noi).
 *
 * Neu ket noi do thieu quyen — hay gap khi nguoi dung khong tich o "cho phep
 * xem Drive" tren man hinh dong y cua Google — thi quay ve service account
 * thay vi de ca web chet theo mot ket noi hong.
 */
async function driveFetch(path: string, params: Record<string, string>) {
  const url = `${API}${path}?${new URLSearchParams(params)}`;
  const asUser = await getUserAccessToken().catch(() => null);

  if (asUser) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${asUser}` } });
    if (res.ok) return res;

    const body = await res.text();
    const thieuQuyen = res.status === 403 && /insufficient/i.test(body);
    if (!thieuQuyen) {
      throw new Error(`Drive API ${res.status}: ${body.slice(0, 300)}`);
    }
  }

  const asService = await serviceAccountToken();
  if (!asService) {
    throw new Error(
      "Kết nối Google Drive thiếu quyền đọc Drive. Vào trang quản trị bấm “Kết nối lại” và nhớ tích ô cho phép xem Google Drive."
    );
  }

  const res = await fetch(url, { headers: { Authorization: `Bearer ${asService}` } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

const ID_RE = /^[A-Za-z0-9_-]{10,}$/;

/** Tach folder ID tu duong link Drive (hoac nhan luon ID neu dan ID). */
export function parseFolderId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (ID_RE.test(value)) return value;

  const patterns = [
    /\/folders\/([A-Za-z0-9_-]+)/,
    /[?&]id=([A-Za-z0-9_-]+)/,
    /\/d\/([A-Za-z0-9_-]+)/,
  ];
  for (const re of patterns) {
    const m = value.match(re);
    if (m) return m[1];
  }
  return null;
}

type DriveEntry = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  imageMediaMetadata?: { width?: number; height?: number; time?: string };
  /** Chi co voi LOI TAT — xem `thuMucDich`. */
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
};

/** Mime cua mot LOI TAT Drive. */
const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";

/*
  LOI TAT (shortcut) DUOC COI NHU THU MUC THAT — anh chot 27/11/2026.

  Anh muon moi anh cua mot khach nam chung MOT album, ke ca anh chup cach nhau
  may nam, vi moi album sinh mot app rieng tren may khach: "neu bat khach cai
  app them lan nua thi bat tien".

  Cai vuong: kho Drive xep theo NAM/THANG lap hop dong, nen anh chup be nam
  2028 roi vao `2028/03/`, con album cuoi nam o `2026/11/` — hai cho khac
  nhau, ma mot album chi doc duoc MOT thu muc goc.

  Loi tat go dung cho do: thu muc that van nam dung nep nam/thang, con trong
  thu muc album cu dat mot loi tat tro sang no. Google bo tinh nang "mot thu
  muc nam hai cho" tu 2020 va thay bang chinh loi tat, nen day la duong duy
  nhat Drive con cho.

  Da thu that tren Drive cua tiem 27/11 truoc khi viet doan nay: tao duoc loi
  tat voi dung quyen web dang co, `shortcutDetails.targetId` doc ra dung dich,
  va di theo no liet ke duoc noi dung — roi xoa sach, do lai xac nhan khong
  con gi.

  CHI NHAN LOI TAT TRO TOI THU MUC. Loi tat tro toi mot TAM ANH thi bo qua:
  chua gap trong kho, ma nhan bua thi mot tam anh co the dem hai lan neu no
  vua nam trong thu muc vua co loi tat o cho khac.
*/
function thuMucDich(f: DriveEntry): { id: string; name: string } | null {
  if (f.mimeType === FOLDER_MIME) return { id: f.id, name: f.name };
  if (
    f.mimeType === SHORTCUT_MIME &&
    f.shortcutDetails?.targetMimeType === FOLDER_MIME &&
    f.shortcutDetails.targetId
  ) {
    /* Ten lay tu LOI TAT chu khong tu dich: studio dat ten loi tat de noi ro
       day la anh lan chup nao ("Anh chup be 2028"), con thu muc that mang ten
       theo nep kho. */
    return { id: f.shortcutDetails.targetId, name: f.name };
  }
  return null;
}

/** Liet ke truc tiep con cua mot thu muc (ca thu muc con lan file). */
async function listChildren(folderId: string): Promise<DriveEntry[]> {
  const out: DriveEntry[] = [];
  let pageToken: string | undefined;

  do {
    const res = await driveFetch("/files", {
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        "nextPageToken, files(id,name,mimeType,size,createdTime," +
        "imageMediaMetadata(width,height,time),shortcutDetails(targetId,targetMimeType))",
      orderBy: "folder,name_natural",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      ...(pageToken ? { pageToken } : {}),
    });
    const data = (await res.json()) as {
      nextPageToken?: string;
      files?: DriveEntry[];
    };
    out.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return out;
}

function toPhoto(f: DriveEntry, section: string | null): DrivePhoto {
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: Number(f.size ?? 0),
    width: f.imageMediaMetadata?.width ?? null,
    height: f.imageMediaMetadata?.height ?? null,
    createdTime: f.createdTime,
    chupLuc: f.imageMediaMetadata?.time ?? null,
    section,
  };
}

/**
 * Sap anh theo GIO CHUP, khong phai theo ten file.
 *
 * Anh yeu cau 04/10/2026: "1 bo hinh nhung nhieu may chup nen co nhieu ma so
 * anh khac nhau, up len bi nhay anh tum lum". Do that tren thu muc "File goc
 * DH" (1000 anh, hai may Sony):
 *
 *   theo TEN  — hai may thanh hai khoi roi (1 lan doi may), anh dau 10:00 ma
 *               giua thu muc lai tut ve 09:09: khach dang xem thi thoi gian
 *               nhay nguoc, va ca buoi le bi ke lai hai lan theo hai goc may.
 *   theo GIO  — 136 lan doi may, dan xen tu nhien; anh dau 07:27 la tam som
 *               nhat that, va mach anh chay dung thu tu buoi le.
 *
 * Ngay trong MOT may ten cung da sai: DY_00235 (12:17 trua) dung truoc
 * DY_09462 (07:27 sang) vi so file reset vong.
 *
 * KHONG TON THEM LAN GOI DRIVE NAO: `imageMediaMetadata.time` nam san trong
 * cung loi goi liet ke tep, y het width/height (nguyen tac 24).
 *
 * NHUNG THU MUC ANH DA CHINH THI GIU NGUYEN THEO TEN — day la phan quan trong
 * nhat cua ham nay. Do 18 thu muc that: anh file goc co gio chup 99,7%
 * (8.031/8.059), con anh hoan thien thi MAT SACH (photobook 11/11, file hoan
 * thien ptb 14/14) vi xuat lai tu phan mem chinh sua la bay EXIF. O nhung thu
 * muc do ten file moi la thu mang thu tu — trang 1, trang 2 cua quyen
 * photobook — nen sap theo gio se dao lon ca quyen sach.
 *
 * Vi vay: qua nua so anh co gio chup thi moi sap theo gio. Khoang cach giua
 * hai nhom la ~100% va 0% nen moc o giua rat an toan; dung mot moc chu khong
 * bat studio danh dau tay tung thu muc (ho se quen — cung ly do voi
 * `laMucHoanThien`, nguyen tac 49).
 *
 * Tam le khong co gio chup trong mot thu muc CO gio chup thi xep CUOI theo
 * ten: khong biet no chup luc nao nen khong the xen vao giua mach, ma bo ra
 * ngoai thi khach mat anh.
 *
 * So sanh CHUOI chu khong dung Date: Drive tra ve dang "2026:05:17 11:50:54",
 * cung mot khuon va so co so 0 dung dau, nen so chu da ra dung thu tu thoi
 * gian — khoi dung 1000 doi tuong Date chi de sap mot lan.
 *
 * Gio trong EXIF la gio cua MAY ANH, khong kem mui gio. Hai may dat lech gio
 * thi tron ra sai — da do thu muc tren, hai may khop nhau nen khong van de,
 * nhung do la thu studio phai giu dung chu web khong doan duoc.
 */
function sapAnh(photos: DrivePhoto[]): DrivePhoto[] {
  const coGio = photos.filter((p) => p.chupLuc).length;
  if (coGio * 2 <= photos.length) return photos;

  return [...photos].sort((a, b) => {
    if (a.chupLuc && b.chupLuc) return a.chupLuc.localeCompare(b.chupLuc);
    if (a.chupLuc) return -1;
    if (b.chupLuc) return 1;
    return a.name.localeCompare(b.name, "vi", { numeric: true });
  });
}


export async function getFolderName(folderId: string): Promise<string> {
  const res = await driveFetch(`/files/${encodeURIComponent(folderId)}`, {
    fields: "name",
    supportsAllDrives: "true",
  });
  return ((await res.json()) as { name: string }).name;
}

export async function getFileMeta(fileId: string) {
  const res = await driveFetch(`/files/${encodeURIComponent(fileId)}`, {
    fields: "id,name,mimeType,size,thumbnailLink",
    supportsAllDrives: "true",
  });
  return (await res.json()) as {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    thumbnailLink?: string;
  };
}

/**
 * Lay ban thumbnail Google dung san.
 * Nhanh hon nhieu so voi tai ban goc: anh 1.3MB chi de dung lam o luoi 640px
 * la lang phi bang thong va thoi gian. Tra ve null neu Drive chua sinh thumbnail.
 */
export async function fetchThumbnail(
  fileId: string,
  size: number
): Promise<{ du: Buffer; kieu: string } | null> {
  if (!ID_RE.test(fileId)) throw new Error("File ID khong hop le.");
  const meta = await getFileMeta(fileId);
  if (!meta.thumbnailLink) return null;

  /*
    thumbnailLink ket thuc bang "=s220"; doi thanh kich thuoc minh can.

    Hau to "-rw" bao Google tra ve WEBP thay vi JPEG — dung thu ma truoc day
    phai chay sharp de tao ra. Da do 28/09/2026 tren 4 anh that, lech so voi
    anh moc (thang 0-255): co 640 sharp hon 0,4 | co 960 hon 0,2 | co 2048
    Google hon 0,4. Chenh duoi 0,5 o moi co, mat nguoi khong thay; rieng co
    khach bam xem to thi ban cua Google NET HON vi nang hon 27%.
  */
  const url = meta.thumbnailLink.replace(/=s\d+(-c)?$/, `=s${size}-rw`);
  const res = await fetch(url);
  if (!res.ok) return null;
  return {
    du: Buffer.from(await res.arrayBuffer()),
    kieu: res.headers.get("content-type") ?? "image/webp",
  };
}

/** Tai nguyen ban goc cua file ve dang buffer. */
export async function downloadFile(fileId: string): Promise<Buffer> {
  if (!ID_RE.test(fileId)) throw new Error("File ID khong hop le.");
  const res = await driveFetch(`/files/${encodeURIComponent(fileId)}`, {
    alt: "media",
    supportsAllDrives: "true",
  });
  return Buffer.from(await res.arrayBuffer());
}

export type Album = {
  /** Drive folder ID cua album. "" nghia la anh nam ngay o thu muc goc. */
  id: string;
  name: string;
  photos: DrivePhoto[];
};

export type GalleryTree = {
  rootId: string;
  name: string;
  albums: Album[];
  totalPhotos: number;
};

/**
 * Doc toan bo cay thu muc cua mot gallery.
 * Moi thu muc con cap 1 tro thanh mot album ("File goc", "File hoan thien",
 * "File nha gai"...). Anh nam sau nhieu cap duoc gop vao album cap 1 gan nhat.
 */
export async function getGalleryTree(rootId: string): Promise<GalleryTree> {
  if (!ID_RE.test(rootId)) throw new Error("Folder ID khong hop le.");

  const [name, entries] = await Promise.all([
    getFolderName(rootId),
    listChildren(rootId),
  ]);

  const rootPhotos: DrivePhoto[] = [];
  const subfolders: { id: string; name: string }[] = [];

  for (const f of entries) {
    const muc = thuMucDich(f);
    if (muc) subfolders.push(muc);
    else if (f.mimeType.startsWith("image/")) rootPhotos.push(toPhoto(f, null));
  }

  const albums: Album[] = [];
  if (rootPhotos.length > 0) {
    // Khong co thu muc con thi ca gallery chi la mot muc, dat theo ten thu muc
    // goc cho de hieu; con neu co thu muc con thi day chi la phan anh roi.
    albums.push({
      id: "",
      name: subfolders.length === 0 ? name : "Ảnh lẻ",
      photos: sapAnh(rootPhotos),
    });
  }

  // Doc cac album song song nhung gioi han so lan goi cung luc, tranh bi
  // Drive tra ve loi 429 khi gallery co nhieu thu muc con.
  const results = await mapLimit(subfolders, 4, async (folder) => ({
    id: folder.id,
    name: folder.name,
    photos: await collectPhotos(folder.id, folder.name, 1),
  }));

  albums.push(...results.filter((a) => a.photos.length > 0));

  return {
    rootId,
    name,
    albums,
    totalPhotos: albums.reduce((sum, a) => sum + a.photos.length, 0),
  };
}

/** Gom moi anh trong mot thu muc va cac thu muc con cua no. */
async function collectPhotos(
  folderId: string,
  section: string,
  depth: number
): Promise<DrivePhoto[]> {
  if (depth > MAX_DEPTH) return [];

  const entries = await listChildren(folderId);
  const photos: DrivePhoto[] = [];
  const subfolders: { id: string; name: string }[] = [];

  for (const f of entries) {
    const muc = thuMucDich(f);
    if (muc) subfolders.push(muc);
    else if (f.mimeType.startsWith("image/")) photos.push(toPhoto(f, section));
  }

  const nested = await mapLimit(subfolders, 4, (f) =>
    collectPhotos(f.id, section, depth + 1)
  );

  return sapAnh(photos.concat(...nested)).slice(0, MAX_PHOTOS);
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}


export { mapLimit };
