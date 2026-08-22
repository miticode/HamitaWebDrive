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

/** "root" la bi danh Google dat cho thu muc goc My Drive. */
const MY_DRIVE_ROOT = "root";
function isFolderId(value: string): boolean {
  return value === MY_DRIVE_ROOT || ID_RE.test(value);
}

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
  imageMediaMetadata?: { width?: number; height?: number };
};

/** Liet ke truc tiep con cua mot thu muc (ca thu muc con lan file). */
async function listChildren(folderId: string): Promise<DriveEntry[]> {
  const out: DriveEntry[] = [];
  let pageToken: string | undefined;

  do {
    const res = await driveFetch("/files", {
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        "nextPageToken, files(id,name,mimeType,size,createdTime,imageMediaMetadata(width,height))",
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
    section,
  };
}

/**
 * Liet ke toan bo anh trong folder, di vao ca thu muc con.
 * Anh trong thu muc con duoc gan `section` = ten thu muc do, de trang xem
 * chia thanh tung muc cho khach.
 */
export async function listImages(folderId: string): Promise<DrivePhoto[]> {
  if (!isFolderId(folderId)) throw new Error("Folder ID khong hop le.");

  const photos: DrivePhoto[] = [];

  async function walk(id: string, section: string | null, depth: number) {
    if (depth > MAX_DEPTH || photos.length >= MAX_PHOTOS) return;

    const entries = await listChildren(id);
    const subfolders: DriveEntry[] = [];

    for (const f of entries) {
      if (f.mimeType === FOLDER_MIME) subfolders.push(f);
      // Bo qua file rac nhu Thumbs.db, .DS_Store — chi nhan mimeType anh.
      else if (f.mimeType.startsWith("image/")) photos.push(toPhoto(f, section));
    }

    for (const sub of subfolders) {
      // Chi lay ten thu muc con cap 1 lam ten muc, cac cap sau gop vao cung muc
      // de khong sinh ra qua nhieu tab cho khach.
      await walk(sub.id, section ?? sub.name, depth + 1);
    }
  }

  await walk(folderId, null, 0);
  return photos.slice(0, MAX_PHOTOS);
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
): Promise<Buffer | null> {
  if (!ID_RE.test(fileId)) throw new Error("File ID khong hop le.");
  const meta = await getFileMeta(fileId);
  if (!meta.thumbnailLink) return null;

  // thumbnailLink ket thuc bang "=s220"; doi thanh kich thuoc minh can.
  const url = meta.thumbnailLink.replace(/=s\d+(-c)?$/, `=s${size}`);
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
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
  const subfolders: DriveEntry[] = [];

  for (const f of entries) {
    if (f.mimeType === FOLDER_MIME) subfolders.push(f);
    else if (f.mimeType.startsWith("image/")) rootPhotos.push(toPhoto(f, null));
  }

  const albums: Album[] = [];
  if (rootPhotos.length > 0) {
    // Khong co thu muc con thi ca gallery chi la mot muc, dat theo ten thu muc
    // goc cho de hieu; con neu co thu muc con thi day chi la phan anh roi.
    albums.push({
      id: "",
      name: subfolders.length === 0 ? name : "Ảnh lẻ",
      photos: rootPhotos,
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
  const subfolders: DriveEntry[] = [];

  for (const f of entries) {
    if (f.mimeType === FOLDER_MIME) subfolders.push(f);
    else if (f.mimeType.startsWith("image/")) photos.push(toPhoto(f, section));
  }

  const nested = await mapLimit(subfolders, 4, (f) =>
    collectPhotos(f.id, section, depth + 1)
  );

  return photos.concat(...nested).slice(0, MAX_PHOTOS);
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


/**
 * Chi liet ke thu muc con cap 1, khong di sau vao trong.
 * Dung cho trang quan tri: chi mot lan goi Drive cho moi gallery, nen danh sach
 * co bao nhieu album cung khong cham. Muon dem ca so anh thi phai duyet het cay,
 * tot kem hon nhieu.
 */
export async function listSubfolders(
  folderId: string
): Promise<Array<{ id: string; name: string }>> {
  if (!isFolderId(folderId)) throw new Error("Folder ID khong hop le.");

  const entries = await listChildren(folderId);
  return entries
    .filter((f) => f.mimeType === FOLDER_MIME)
    .map((f) => ({ id: f.id, name: f.name }));
}

export { mapLimit };
