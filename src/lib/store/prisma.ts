import { getPrisma } from "@/lib/db";
import {
  DEFAULT_LISTS,
  duoiSlug,
  docKhu,
  slugify,
  type BiaMuc,
  type CreateGalleryInput,
  type Gallery,
  type GoiMuc,
  type MucXong,
  type KhuGioiThieu,
  type Selection,
  type SelectionList,
  type GalleryMeta,
  type Store,
  type ToggleSelectionInput,
} from "./shared";
import { hanMacDinh } from "@/lib/constants";
import { xoaMocCuaAlbum } from "@/lib/moc";

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
  luotXem: number;
  xemLanDau: Date | null;
  xemLanCuoi: Date | null;
  luotTai: number;
  taiLanCuoi: Date | null;
  coverFileId: string | null;
  coverPinned: boolean;
  photoCount: number;
  albumCount: number;
  subfolders: string[];
  dungLuongMB: number;
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
    xemLanDau: row.xemLanDau?.toISOString() ?? null,
    xemLanCuoi: row.xemLanCuoi?.toISOString() ?? null,
    taiLanCuoi: row.taiLanCuoi?.toISOString() ?? null,
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
  // Kho chi tra ra danh sach tim (xem getLists), nen bieu tuong luon la tim.
  return { ...row, icon: "heart" };
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

/**
 * Bo bot cot id cua database.
 *
 * Khong dung `...row` nhu toMucXong: hang tra ve tu Prisma con mang ca `id`
 * rieng cua dong, ma phia goi khong can — de lot ra thi mot ngay nao do co
 * nguoi tuong do la ma anh roi truyen nham vao /api/img.
 */
function toBiaMuc(row: { galleryId: string; albumId: string; fileId: string }): BiaMuc {
  return { galleryId: row.galleryId, albumId: row.albumId, fileId: row.fileId };
}

function toGoiMuc(row: {
  galleryId: string;
  albumId: string;
  tenMuc: string;
  soAnh: number;
}): GoiMuc {
  return {
    galleryId: row.galleryId,
    albumId: row.albumId,
    tenMuc: row.tenMuc,
    soAnh: row.soAnh,
  };
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

    /*
      Bang `Moc` KHONG nam trong day chuyen do — no khong co quan he nao toi
      Gallery — nen phai don tay, khong thi dau moc "da gui thong bao" va "da
      doc thong bao" cua album nay nam lai vinh vien. Xem xoaMocCuaAlbum().

      Dat SAU khi xoa album: xoa album that bai thi khong nen dong dau moc di.
    */
    await xoaMocCuaAlbum(id);
  },

  async getLists(galleryId: string) {
    /*
      CHI danh sach trai tim. Tick ("Ảnh chọn") da bo ngay 16/09/2026 — dong cu
      van con trong database (khong xoa lua chon cua khach) nhung khong tra ra:
      trang khach khong ve nut tick, duong nhan luot chon tu choi luot tick gui
      len tu trinh duyet con mo ban cu, trang quan ly va don in khong con thay.
    */
    const rows = await getPrisma().selectionList.findMany({
      where: { galleryId, icon: "heart" },
      orderBy: { position: "asc" },
    });
    return rows.map(toList);
  },

  async getSelections(galleryId: string) {
    const rows = await getPrisma().selection.findMany({
      // Chi luot tim — cung ly do voi getLists.
      where: { list: { galleryId, icon: "heart" } },
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
      // Chi danh sach tim — tick da bo, xem getLists.
      prisma.selectionList.findMany({ where: { icon: "heart" }, orderBy: { position: "asc" } }),
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
      icon: "heart" as const,
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

  async ghiLuotXem(galleryId: string) {
    /*
      Viet bang SQL thang thay vi prisma.update vi can COALESCE: "xemLanDau"
      chi duoc dat MOT lan roi giu nguyen mai, con "xemLanCuoi" thi lan nao
      cung doi. Prisma khong co cach dien dat "chi dat neu dang trong" trong
      mot lenh update.

      Lam mot luot chu khong doc truoc roi ghi sau: hai khach mo cung luc thi
      ban doc-roi-ghi se dem thieu mot luot.
    */
    const luc = new Date();
    await getPrisma().$executeRaw`
      UPDATE "Gallery"
      SET "luotXem" = "luotXem" + 1,
          "xemLanDau" = COALESCE("xemLanDau", ${luc}),
          "xemLanCuoi" = ${luc}
      WHERE "id" = ${galleryId}
    `;
  },

  async ghiLuotTai(galleryId: string, soTam: number) {
    /*
      Cong SO TAM chu khong phai cong 1: nut "Tai ca thu muc" tai tung tam mot
      qua cung duong nay, nen cong theo luot goi la con so dung — nhung goi
      ham nay tu mot cho khac voi so tam lon hon 1 thi van phai cong dung.

      Viet bang SQL thang, cung ly do voi ghiLuotXem: mot luot thay vi doc rooi
      ghi, de hai khach tai cung luc khong dem thieu.
    */
    await getPrisma().$executeRaw`
      UPDATE "Gallery"
      SET "luotTai" = "luotTai" + ${soTam},
          "taiLanCuoi" = ${new Date()}
      WHERE "id" = ${galleryId}
    `;
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

  async setBiaMuc(galleryId: string, albumId: string, fileId: string | null) {
    const prisma = getPrisma();

    if (!fileId) {
      // deleteMany chu khong delete: bo chon khi chua tung chon thi khong co
      // dong nao, va do khong phai loi — cung ly do voi setMucXong.
      await prisma.biaMuc.deleteMany({ where: { galleryId, albumId } });
      return;
    }

    await prisma.biaMuc.upsert({
      where: { galleryId_albumId: { galleryId, albumId } },
      create: { galleryId, albumId, fileId },
      update: { fileId },
    });
  },

  async getBiaMuc(galleryId: string) {
    const rows = await getPrisma().biaMuc.findMany({ where: { galleryId } });
    return rows.map(toBiaMuc);
  },

  async listBiaMuc() {
    const rows = await getPrisma().biaMuc.findMany();
    return rows.map(toBiaMuc);
  },

  async setGoiMuc(
    galleryId: string,
    albumId: string,
    tenMuc: string,
    soAnh: number | null
  ) {
    const prisma = getPrisma();

    if (soAnh === null) {
      /*
        deleteMany chu khong delete: bo dat rieng khi chua tung dat thi khong
        co dong nao, va do khong phai loi — cung ly do voi setBiaMuc.
      */
      await prisma.goiMuc.deleteMany({ where: { galleryId, albumId } });
      return;
    }

    await prisma.goiMuc.upsert({
      where: { galleryId_albumId: { galleryId, albumId } },
      create: { galleryId, albumId, tenMuc, soAnh },
      // Cap nhat luon ten neu thu muc da doi ten tren Drive.
      update: { tenMuc, soAnh },
    });
  },

  async getGoiMuc(galleryId: string) {
    const rows = await getPrisma().goiMuc.findMany({ where: { galleryId } });
    return rows.map(toGoiMuc);
  },

  async listGoiMuc() {
    const rows = await getPrisma().goiMuc.findMany();
    return rows.map(toGoiMuc);
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
