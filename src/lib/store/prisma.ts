import { getPrisma } from "@/lib/db";
import {
  DEFAULT_LISTS,
  duoiSlug,
  docKhu,
  slugify,
  type CreateGalleryInput,
  type Gallery,
  type MucXong,
  type KhuGioiThieu,
  type Selection,
  type SelectionList,
  type GalleryMeta,
  type Store,
  type ToggleSelectionInput,
} from "./shared";
import { hanMacDinh } from "@/lib/constants";

/** Kho du lieu tren Postgres (Neon) — dung khi da dat DATABASE_URL. */

type GalleryRow = {
  id: string;
  slug: string;
  title: string;
  clientName: string | null;
  message: string | null;
  featured: boolean;
  khuGioiThieu: string;
  driveFolderId: string;
  allowDownload: boolean;
  createdAt: Date;
  coverFileId: string | null;
  coverPinned: boolean;
  photoCount: number;
  albumCount: number;
  subfolders: string[];
  syncedAt: Date | null;
  expiresAt: Date | null;
  selectionsDoneAt: Date | null;
  accessCode: string | null;
  soAnhTrongGoi: number | null;
  giaAnhThem: number;
};

function toGallery(row: GalleryRow): Gallery {
  return {
    ...row,
    khuGioiThieu: docKhu(row.khuGioiThieu),
    createdAt: row.createdAt.toISOString(),
    syncedAt: row.syncedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    selectionsDoneAt: row.selectionsDoneAt?.toISOString() ?? null,
  };
}

type ListRow = {
  id: string;
  galleryId: string;
  name: string;
  icon: string;
  position: number;
};

function toList(row: ListRow): SelectionList {
  return { ...row, icon: row.icon === "check" ? "check" : "heart" };
}

type SelectionRow = {
  id: string;
  listId: string;
  driveFileId: string;
  fileName: string;
  albumName: string;
  visitorId: string;
  note: string | null;
  createdAt: Date;
};

function toMucXong(row: {
  galleryId: string;
  albumId: string;
  tenMuc: string;
  xongLuc: Date;
}): MucXong {
  return { ...row, xongLuc: row.xongLuc.toISOString() };
}

function toSelection(row: SelectionRow): Selection {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export const prismaStore: Store = {
  async listGalleries() {
    const rows = await getPrisma().gallery.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toGallery);
  },

  async getGalleryBySlug(slug: string) {
    const row = await getPrisma().gallery.findUnique({ where: { slug } });
    return row ? toGallery(row) : null;
  },

  async getGalleryById(id: string) {
    const row = await getPrisma().gallery.findUnique({ where: { id } });
    return row ? toGallery(row) : null;
  },

  async createGallery(input: CreateGalleryInput) {
    const prisma = getPrisma();
    const base = slugify(input.clientName || input.title) || "gallery";

    /*
      MOI slug deu co duoi ngau nhien, khong phai chi khi trung ten.
      Album la anh rieng tu cua khach: neu slug chi la ten bo dau thi ai biet
      ten co dau chu re cung mo duoc link. Duoi ngau nhien la thu duy nhat lam
      link kho doan — xem duoiSlug() trong shared.ts.

      Cot slug la unique nen neu (rat hiem) van trung se nem loi P2002; luc do
      thu lai voi duoi khac, thay vi hoi database truoc — tranh ke ho giua luc
      hoi va luc ghi.
    */
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = `${base}-${duoiSlug()}`;
      try {
        const row = await prisma.gallery.create({
          data: {
            ...input,
            slug,
            expiresAt: hanMacDinh(),
            lists: { create: DEFAULT_LISTS },
          },
        });
        return toGallery(row);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code !== "P2002") throw err;
      }
    }
    throw new Error("Không tạo được slug duy nhất cho gallery này.");
  },

  async deleteGallery(id: string) {
    // Cac bang con khai bao onDelete: Cascade nen xoa theo day chuyen.
    await getPrisma().gallery.delete({ where: { id } });
  },

  async getLists(galleryId: string) {
    const rows = await getPrisma().selectionList.findMany({
      where: { galleryId },
      orderBy: { position: "asc" },
    });
    return rows.map(toList);
  },

  async getSelections(galleryId: string) {
    const rows = await getPrisma().selection.findMany({
      where: { list: { galleryId } },
      orderBy: { fileName: "asc" },
    });
    return rows.map(toSelection);
  },

  async updateGalleryMeta(galleryId: string, meta: GalleryMeta) {
    const prisma = getPrisma();
    const hien = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { coverPinned: true },
    });

    // Anh da tu chon anh bia thi lan dong bo sau khong duoc ghi de len.
    const { coverFileId, ...conLai } = meta;
    await prisma.gallery.update({
      where: { id: galleryId },
      data: hien?.coverPinned
        ? { ...conLai, syncedAt: new Date() }
        : { ...conLai, coverFileId, syncedAt: new Date() },
    });
  },

  async setCover(galleryId: string, fileId: string | null) {
    await getPrisma().gallery.update({
      where: { id: galleryId },
      data: { coverFileId: fileId, coverPinned: fileId !== null },
    });
  },

  async listCounts() {
    const prisma = getPrisma();
    /*
      Phai dem theo SO ANH RIENG BIET, khong phai so dong.
      Co dau va chu re cung tim mot tam thi trong bang co hai dong, ma thuc te
      chi can in mot tam — dem theo dong se lam in du va tinh tien khach sai.
    */
    const [lists, grouped] = await Promise.all([
      prisma.selectionList.findMany({ orderBy: { position: "asc" } }),
      prisma.selection.groupBy({ by: ["listId", "driveFileId"] }),
    ]);
    const counts = new Map<string, number>();
    for (const row of grouped) {
      counts.set(row.listId, (counts.get(row.listId) ?? 0) + 1);
    }
    return lists.map((l) => ({
      galleryId: l.galleryId,
      listId: l.id,
      name: l.name,
      icon: l.icon === "check" ? ("check" as const) : ("heart" as const),
      count: counts.get(l.id) ?? 0,
    }));
  },

  async setAccess(galleryId: string, code: string) {
    await getPrisma().gallery.update({
      where: { id: galleryId },
      data: { accessCode: code },
    });
  },

  async setMessage(galleryId: string, message: string | null) {
    await getPrisma().gallery.update({
      where: { id: galleryId },
      data: { message },
    });
  },

  async setClientName(galleryId: string, clientName: string | null) {
    // Chi dong vao clientName; slug giu nguyen nen link da gui khach van song.
    await getPrisma().gallery.update({
      where: { id: galleryId },
      data: { clientName },
    });
  },

  async setFeatured(galleryId: string, featured: boolean) {
    await getPrisma().gallery.update({
      where: { id: galleryId },
      data: { featured },
    });
  },

  async setKhuGioiThieu(galleryId: string, khu: KhuGioiThieu) {
    await getPrisma().gallery.update({
      where: { id: galleryId },
      data: { khuGioiThieu: khu },
    });
  },

  async setGoiAnh(
    galleryId: string,
    soAnhTrongGoi: number | null,
    giaAnhThem: number
  ) {
    await getPrisma().gallery.update({
      where: { id: galleryId },
      data: { soAnhTrongGoi, giaAnhThem },
    });
  },

  async setExpiry(galleryId: string, expiresAt: string | null) {
    await getPrisma().gallery.update({
      where: { id: galleryId },
      data: { expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
  },

  async setSelectionsDone(galleryId: string, xong: boolean) {
    await getPrisma().gallery.update({
      where: { id: galleryId },
      data: { selectionsDoneAt: xong ? new Date() : null },
    });
  },

  async setMucXong(
    galleryId: string,
    albumId: string,
    tenMuc: string,
    xong: boolean
  ) {
    const prisma = getPrisma();
    const khoa = { galleryId_albumId: { galleryId, albumId } };

    if (!xong) {
      // deleteMany chu khong delete: khach bam "chon them" khi chua tung bao
      // xong thi khong co dong nao, va do khong phai loi.
      await prisma.mucXong.deleteMany({ where: { galleryId, albumId } });
      return;
    }

    await prisma.mucXong.upsert({
      where: khoa,
      create: { galleryId, albumId, tenMuc },
      // Bao lai thi cap nhat gio, va cap nhat luon ten neu thu muc da doi ten.
      update: { tenMuc, xongLuc: new Date() },
    });
  },

  async getMucXong(galleryId: string) {
    const rows = await getPrisma().mucXong.findMany({
      where: { galleryId },
      orderBy: { xongLuc: "desc" },
    });
    return rows.map(toMucXong);
  },

  async listMucXong() {
    const rows = await getPrisma().mucXong.findMany({
      orderBy: { xongLuc: "desc" },
    });
    return rows.map(toMucXong);
  },

  async toggleSelection(input: ToggleSelectionInput) {
    const prisma = getPrisma();
    const where = {
      listId_driveFileId_visitorId: {
        listId: input.listId,
        driveFileId: input.driveFileId,
        visitorId: input.visitorId,
      },
    };

    const existing = await prisma.selection.findUnique({ where });

    /*
      Khach noi ro muon gi thi lam dung the, khong lat nguoc.
      Nho vay hai may cung bam "chon" mot tam thi ket qua van la da chon —
      truoc day may thu hai lam mat lua chon cua may thu nhat (xem chu thich
      o ToggleSelectionInput.muon).

      Bo trong `muon` = ban JavaScript cu, van lat nguoc nhu truoc.
    */
    const { muon, ...duLieu } = input;
    const chon = muon ?? !existing;

    if (!chon) {
      if (existing) await prisma.selection.delete({ where });
      return { selected: false };
    }

    // Da co san thi thoi, khong ghi de — giu nguyen ca ghi chu khach da viet.
    if (existing) return { selected: true };

    // Hai cu bam gan nhau tren cung mot anh co the cung chay den day; rang buoc
    // unique lo phan con lai, va ket qua van la "da chon" nen khong can bao loi.
    try {
      await prisma.selection.create({ data: duLieu });
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
    }
    return { selected: true };
  },

  async setSelectionNote(
    listId: string,
    driveFileId: string,
    visitorId: string,
    note: string | null
  ) {
    // updateMany thay vi update: khong nem loi neu chua ton tai dong nay (vi
    // du khach go ghi chu dung luc phieu chon bi bo — im lang bo qua la du).
    await getPrisma().selection.updateMany({
      where: { listId, driveFileId, visitorId },
      data: { note },
    });
  },
};
