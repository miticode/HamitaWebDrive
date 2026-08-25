import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  DEFAULT_LISTS,
  duoiSlug,
  slugify,
  type CreateGalleryInput,
  type Gallery,
  type Selection,
  type SelectionList,
  type GalleryMeta,
  type Store,
  type ToggleSelectionInput,
} from "./shared";
import { GIA_ANH_THEM_MAC_DINH, hanMacDinh } from "@/lib/constants";

/**
 * Kho du lieu bang file JSON — chi dung khi chay o may.
 * Vercel co he thong file chi doc nen khi da dat DATABASE_URL thi
 * src/lib/store/index.ts se chuyen sang ban Postgres.
 */

type Db = {
  galleries: Gallery[];
  lists: SelectionList[];
  selections: Selection[];
};

const FILE = join(process.cwd(), "data", "db.json");
const EMPTY: Db = { galleries: [], lists: [], selections: [] };

async function readFromDisk(): Promise<Db> {
  try {
    return { ...EMPTY, ...JSON.parse(await readFile(FILE, "utf8")) };
  } catch {
    return structuredClone(EMPTY);
  }
}

/**
 * Ghi ra file tam roi doi ten de len file that, de file that khong bao gio
 * o trang thai cat do dang.
 */
async function writeToDisk(db: Db): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true });
  const temp = `${FILE}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(db, null, 2), "utf8");
  await rename(temp, FILE);
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Cho MOI thao tac cham vao file di qua mot hang doi duy nhat.
 *
 * Chi khoa luc ghi la khong du: tren Windows, doi ten de len file dang co
 * tien trinh khac mo de doc se bao EPERM; con neu ghi thang thi request doc
 * dung luc do se thay file rong va tuong la khong co gallery nao.
 *
 * Luu y: khong duoc goi mot ham da khoa tu ben trong mot ham da khoa khac,
 * se treo. Cac ham duoi day khong ham nao goi ham nao.
 */
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

export const jsonStore: Store = {
  listGalleries() {
    return withLock(async () => {
      const db = await readFromDisk();
      return [...db.galleries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  },

  getGalleryBySlug(slug: string) {
    return withLock(async () => {
      const db = await readFromDisk();
      return db.galleries.find((g) => g.slug === slug) ?? null;
    });
  },

  getGalleryById(id: string) {
    return withLock(async () => {
      const db = await readFromDisk();
      return db.galleries.find((g) => g.id === id) ?? null;
    });
  },

  createGallery(input: CreateGalleryInput) {
    return withLock(async () => {
      const db = await readFromDisk();

      const base = slugify(input.clientName || input.title) || "gallery";

      /*
        MOI slug deu co duoi ngau nhien, khong phai chi khi trung ten — neu chi
        la ten bo dau thi ai biet ten khach cung doan ra link album rieng tu cua
        ho. Giong het ban Postgres, xem duoiSlug() trong shared.ts.
      */
      let slug = `${base}-${duoiSlug()}`;
      while (db.galleries.some((g) => g.slug === slug)) {
        slug = `${base}-${duoiSlug()}`;
      }

      const gallery: Gallery = {
        id: randomUUID(),
        slug,
        title: input.title,
        clientName: input.clientName,
        message: null,
        featured: false,
        laBaby: false,
        soAnhTrongGoi: null,
        giaAnhThem: GIA_ANH_THEM_MAC_DINH,
        driveFolderId: input.driveFolderId,
        allowDownload: input.allowDownload,
        createdAt: new Date().toISOString(),
        coverFileId: null,
        coverPinned: false,
        photoCount: 0,
        albumCount: 0,
        subfolders: [],
        syncedAt: null,
        expiresAt: hanMacDinh().toISOString(),
        selectionsDoneAt: null,
        accessCode: null,
      };

      db.galleries.push(gallery);
      for (const list of DEFAULT_LISTS) {
        db.lists.push({ id: randomUUID(), galleryId: gallery.id, ...list });
      }

      await writeToDisk(db);
      return gallery;
    });
  },

  deleteGallery(id: string) {
    return withLock(async () => {
      const db = await readFromDisk();
      const listIds = new Set(db.lists.filter((l) => l.galleryId === id).map((l) => l.id));

      db.galleries = db.galleries.filter((g) => g.id !== id);
      db.lists = db.lists.filter((l) => l.galleryId !== id);
      db.selections = db.selections.filter((s) => !listIds.has(s.listId));

      await writeToDisk(db);
    });
  },

  getLists(galleryId: string) {
    return withLock(async () => {
      const db = await readFromDisk();
      return db.lists
        .filter((l) => l.galleryId === galleryId)
        .sort((a, b) => a.position - b.position);
    });
  },

  getSelections(galleryId: string) {
    return withLock(async () => {
      const db = await readFromDisk();
      const listIds = new Set(
        db.lists.filter((l) => l.galleryId === galleryId).map((l) => l.id)
      );
      return db.selections.filter((s) => listIds.has(s.listId));
    });
  },

  updateGalleryMeta(galleryId: string, meta: GalleryMeta) {
    return withLock(async () => {
      const db = await readFromDisk();
      const gallery = db.galleries.find((g) => g.id === galleryId);
      if (!gallery) return;

      // Anh da tu chon anh bia thi lan dong bo sau khong duoc ghi de len.
      const { coverFileId, ...conLai } = meta;
      Object.assign(gallery, conLai, { syncedAt: new Date().toISOString() });
      if (!gallery.coverPinned) gallery.coverFileId = coverFileId;

      await writeToDisk(db);
    });
  },

  setCover(galleryId: string, fileId: string | null) {
    return withLock(async () => {
      const db = await readFromDisk();
      const gallery = db.galleries.find((g) => g.id === galleryId);
      if (!gallery) return;
      gallery.coverFileId = fileId;
      gallery.coverPinned = fileId !== null;
      await writeToDisk(db);
    });
  },

  listCounts() {
    return withLock(async () => {
      const db = await readFromDisk();
      return db.lists
        .sort((a, b) => a.position - b.position)
        .map((l) => ({
          galleryId: l.galleryId,
          listId: l.id,
          name: l.name,
          icon: l.icon,
          // Dem theo so anh rieng biet, khong phai so dong — hai nguoi cung
          // tim mot tam thi van chi la mot tam can in.
          count: new Set(
            db.selections.filter((s) => s.listId === l.id).map((s) => s.driveFileId)
          ).size,
        }));
    });
  },

  setAccess(galleryId: string, code: string) {
    return withLock(async () => {
      const db = await readFromDisk();
      const g = db.galleries.find((x) => x.id === galleryId);
      if (!g) return;
      g.accessCode = code;
      await writeToDisk(db);
    });
  },

  setMessage(galleryId: string, message: string | null) {
    return withLock(async () => {
      const db = await readFromDisk();
      const g = db.galleries.find((x) => x.id === galleryId);
      if (!g) return;
      g.message = message;
      await writeToDisk(db);
    });
  },

  setClientName(galleryId: string, clientName: string | null) {
    return withLock(async () => {
      const db = await readFromDisk();
      const g = db.galleries.find((x) => x.id === galleryId);
      if (!g) return;
      // Chi dong vao clientName; slug giu nguyen nen link da gui khach van song.
      g.clientName = clientName;
      await writeToDisk(db);
    });
  },

  setFeatured(galleryId: string, featured: boolean) {
    return withLock(async () => {
      const db = await readFromDisk();
      const g = db.galleries.find((x) => x.id === galleryId);
      if (!g) return;
      g.featured = featured;
      await writeToDisk(db);
    });
  },

  setBaby(galleryId: string, laBaby: boolean) {
    return withLock(async () => {
      const db = await readFromDisk();
      const g = db.galleries.find((x) => x.id === galleryId);
      if (!g) return;
      g.laBaby = laBaby;
      await writeToDisk(db);
    });
  },

  setGoiAnh(galleryId: string, soAnhTrongGoi: number | null, giaAnhThem: number) {
    return withLock(async () => {
      const db = await readFromDisk();
      const g = db.galleries.find((x) => x.id === galleryId);
      if (!g) return;
      g.soAnhTrongGoi = soAnhTrongGoi;
      g.giaAnhThem = giaAnhThem;
      await writeToDisk(db);
    });
  },

  setExpiry(galleryId: string, expiresAt: string | null) {
    return withLock(async () => {
      const db = await readFromDisk();
      const g = db.galleries.find((x) => x.id === galleryId);
      if (!g) return;
      g.expiresAt = expiresAt;
      await writeToDisk(db);
    });
  },

  setSelectionsDone(galleryId: string, xong: boolean) {
    return withLock(async () => {
      const db = await readFromDisk();
      const g = db.galleries.find((x) => x.id === galleryId);
      if (!g) return;
      g.selectionsDoneAt = xong ? new Date().toISOString() : null;
      await writeToDisk(db);
    });
  },

  toggleSelection(input: ToggleSelectionInput) {
    return withLock(async () => {
      const db = await readFromDisk();
      const index = db.selections.findIndex(
        (s) =>
          s.listId === input.listId &&
          s.driveFileId === input.driveFileId &&
          s.visitorId === input.visitorId
      );

      if (index >= 0) {
        db.selections.splice(index, 1);
        await writeToDisk(db);
        return { selected: false };
      }

      db.selections.push({
        id: randomUUID(),
        ...input,
        note: null,
        createdAt: new Date().toISOString(),
      });

      await writeToDisk(db);
      return { selected: true };
    });
  },

  setSelectionNote(
    listId: string,
    driveFileId: string,
    visitorId: string,
    note: string | null
  ) {
    return withLock(async () => {
      const db = await readFromDisk();
      const sel = db.selections.find(
        (s) =>
          s.listId === listId &&
          s.driveFileId === driveFileId &&
          s.visitorId === visitorId
      );
      if (!sel) return;
      sel.note = note;
      await writeToDisk(db);
    });
  },
};
