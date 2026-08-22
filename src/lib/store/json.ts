import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  DEFAULT_LISTS,
  slugify,
  type CreateGalleryInput,
  type Gallery,
  type Selection,
  type SelectionList,
  type GalleryMeta,
  type Store,
  type ToggleSelectionInput,
} from "./shared";

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

  createGallery(input: CreateGalleryInput) {
    return withLock(async () => {
      const db = await readFromDisk();

      const base = slugify(input.clientName || input.title) || "gallery";
      let slug = base;
      // Them duoi ngau nhien neu trung, cung de nguoi ngoai kho doan link.
      if (db.galleries.some((g) => g.slug === slug)) {
        slug = `${base}-${randomUUID().slice(0, 6)}`;
      }

      const gallery: Gallery = {
        id: randomUUID(),
        slug,
        title: input.title,
        clientName: input.clientName,
        driveFolderId: input.driveFolderId,
        allowDownload: input.allowDownload,
        createdAt: new Date().toISOString(),
        coverFileId: null,
        coverPinned: false,
        photoCount: 0,
        albumCount: 0,
        subfolders: [],
        syncedAt: null,
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
};
