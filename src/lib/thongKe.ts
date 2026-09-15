import { getPrisma } from "@/lib/db";

/**
 * So lieu cho trang /admin/thong-ke.
 *
 * Doc thang bang getPrisma() thay vi qua lop store: day la nhung phep gop tren
 * TOAN BO du lieu (dem theo gio, gom theo ten thu muc), khong phai thao tac
 * tren mot album — them tung ham vao giao dien store cho rieng trang nay chi
 * lam giao dien do phinh ra ma khong ai dung lai.
 *
 * KHONG goi Drive lan nao, giong trang quan ly (nguyen tac 9).
 */

/**
 * Moc bat dau dem luot xem trang album.
 *
 * Cot `luotXem` mac dinh la 0, nen album tao TRUOC moc nay cung mang so 0 du
 * khach da mo bao nhieu lan. Khong phan biet thi trang thong ke se bao "khach
 * chua mo link" cho nhung album khach da xem tu lau — mot loi khuyen sai dan
 * toi mot cu dien thoai lam phien khach.
 */
export const MOC_DEM_LUOT_XEM = new Date("2026-08-26T00:00:00Z");

/*
  MOC_DEM_LUOT_TAI khong nam o day ma o constants.ts, du no cung loai voi
  MOC_DEM_LUOT_XEM ngay tren.

  Ly do: the album (`GalleryCard.tsx`) can hang so do, ma the album chay o MAY
  KHACH. Nhap tu file nay la keo theo `getPrisma` vao goi phia khach, va
  Turbopack do thang xuong luc build — "the chunking context does not support
  external modules (request: node:module)". Da vap that ngay 06/09/2026.

  Quy tac rut ra: hang so ma ca hai phia cung dung thi de o constants.ts; file
  nao co dinh toi database thi chi server duoc nhap.
*/

/** Bao nhieu ngay khong dong tinh thi coi la khach dang do dang. */
const NGAY_COI_LA_BO_DO = 3;

/** Viet Nam khong doi gio theo mua nen cong thang 7 tieng la du. */
const LECH_GIO_VN = 7;

export type CanNhac = {
  slug: string;
  ten: string;
  /** Vi sao can nhac — cau chu de hien thang len man hinh. */
  lyDo: string;
  /** Bao nhieu ngay roi ke tu moc lien quan. */
  soNgay: number;
  /** Cang lon cang gap, dung de sap xep. */
  mucGap: number;
};

export type ThongKe = {
  canNhac: CanNhac[];
  tongQuan: {
    soAlbum: number;
    soAnh: number;
    soTamDaChon: number;
    soAlbumCoKhachChon: number;
    soAlbumDaXongHet: number;
    /** Tong so tam khach da tai ve tren moi album. */
    soTamDaTai: number;
  };
  thoiGian: {
    /** Trung binh so ngay tu luc tao link toi tam anh dau tien khach chon. */
    ngayToiTamDau: number | null;
    /** Trung binh so ngay tu luc tao link toi luc khach bao chon xong. */
    ngayToiBaoXong: number | null;
    soMauToiTamDau: number;
    soMauToiBaoXong: number;
  };
  /**
   * Ten thu muc va so tam khach da tha tim trong do, nhieu nhat truoc.
   *
   * Kem danh sach ALBUM ME chua thu muc do, moi album dong gop bao nhieu tam
   * — nhieu nhat truoc. Studio yeu cau 10/09/2026: doc "file goc nha trai 289
   * tam" ma khong biet cua nha nao thi khong lam duoc gi tiep.
   */
  thuMucHayChon: {
    ten: string;
    soTam: number;
    album: { ten: string; slug: string; soTam: number }[];
  }[];
  /** 24 o, moi o la so luot chon trong gio do (gio Viet Nam). */
  gioHayChon: number[];
  /** Album chua do duoc luot xem vi tao truoc khi bat dem. */
  soAlbumChuaDoLuotXem: number;
};

function trungBinh(ds: number[]): number | null {
  if (ds.length === 0) return null;
  return ds.reduce((a, b) => a + b, 0) / ds.length;
}

export async function docThongKe(bayGio = new Date()): Promise<ThongKe> {
  const prisma = getPrisma();

  const [galleries, lists, tatCaLuotChon, mucXong] = await Promise.all([
    prisma.gallery.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.selectionList.findMany(),
    prisma.selection.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.mucXong.findMany({ orderBy: { xongLuc: "asc" } }),
  ]);

  const listCuaGallery = new Map(lists.map((l) => [l.id, l]));
  /* Danh sach "Anh in" nhan dien bang BIEU TUONG, khong phai vi tri — xem anhIn.ts. */
  const idListTim = new Set(
    lists.filter((l) => l.icon === "heart").map((l) => l.id)
  );
  /*
    Chi luot tim. Tick da bo ngay 16/09/2026 — dong tick cu con trong database
    nhung khong duoc tinh vao so lieu nao nua.
  */
  const selections = tatCaLuotChon.filter((s) => idListTim.has(s.listId));

  const NGAY = 86_400_000;
  const canNhac: CanNhac[] = [];
  const ngayToiTamDau: number[] = [];
  const ngayToiBaoXong: number[] = [];
  let soAlbumCoKhachChon = 0;
  let soAlbumDaXongHet = 0;
  let soAlbumChuaDoLuotXem = 0;

  for (const g of galleries) {
    const cuaNo = selections.filter(
      (s) => listCuaGallery.get(s.listId)?.galleryId === g.id
    );
    const xongCuaNo = mucXong.filter((m) => m.galleryId === g.id);
    const ten = g.clientName ?? g.title;

    if (cuaNo.length > 0) {
      soAlbumCoKhachChon++;
      ngayToiTamDau.push(
        (cuaNo[0].createdAt.getTime() - g.createdAt.getTime()) / NGAY
      );
    }
    if (xongCuaNo.length > 0) {
      ngayToiBaoXong.push(
        (xongCuaNo[0].xongLuc.getTime() - g.createdAt.getTime()) / NGAY
      );
    }

    /*
      Da bao xong DU so thu muc con thi coi la tron ven — khong nhac nua.
      So sanh voi albumCount chu khong phai "co it nhat mot muc xong": album
      tam thu muc ma khach moi bao xong mot thu muc thi van con viec.
    */
    const xongHet = g.albumCount > 0 && xongCuaNo.length >= g.albumCount;
    if (xongHet) {
      soAlbumDaXongHet++;
      continue;
    }

    const doDuocLuotXem = g.createdAt >= MOC_DEM_LUOT_XEM;
    if (!doDuocLuotXem) soAlbumChuaDoLuotXem++;

    const ngayTuKhiTao = Math.floor(
      (bayGio.getTime() - g.createdAt.getTime()) / NGAY
    );

    if (cuaNo.length === 0) {
      if (doDuocLuotXem && g.luotXem === 0) {
        canNhac.push({
          slug: g.slug,
          ten,
          lyDo: "chưa mở link lần nào",
          soNgay: ngayTuKhiTao,
          mucGap: 100 + ngayTuKhiTao,
        });
      } else if (g.luotXem > 0) {
        canNhac.push({
          slug: g.slug,
          ten,
          lyDo: `đã mở ${g.luotXem} lần nhưng chưa chọn tấm nào`,
          soNgay: ngayTuKhiTao,
          mucGap: 50 + ngayTuKhiTao,
        });
      } else {
        canNhac.push({
          slug: g.slug,
          ten,
          lyDo: "chưa chọn tấm nào",
          soNgay: ngayTuKhiTao,
          mucGap: 40 + ngayTuKhiTao,
        });
      }
      continue;
    }

    /* Co chon roi nhung chua bao xong het — chi nhac khi da im lang mot thoi gian. */
    const lanCuoi = cuaNo[cuaNo.length - 1].createdAt;
    const ngayImLang = Math.floor((bayGio.getTime() - lanCuoi.getTime()) / NGAY);
    if (ngayImLang >= NGAY_COI_LA_BO_DO) {
      const soTam = new Set(cuaNo.map((s) => s.driveFileId)).size;
      canNhac.push({
        slug: g.slug,
        ten,
        lyDo: `chọn dở ${soTam} tấm rồi dừng`,
        soNgay: ngayImLang,
        mucGap: 60 + ngayImLang,
      });
    }
  }

  /*
    Thu muc khach hay tha tim nhat — gop theo TEN thu muc tren khap moi album.

    Van gop theo ten nhu cu, vi muc dich cua bang nay la thay KIEU CHUP nao
    khach hay chon de in. Nhung moi dong con mang theo album me cua no: ten
    thu muc thi nha nao cung dat giong nhau ("file goc", "file goc nha trai"),
    nen chi mot cai ten thi studio khong lan ra duoc la cua khach nao.
  */
  const galleryTheoId = new Map(galleries.map((g) => [g.id, g]));
  const theoThuMuc = new Map<
    string,
    {
      soTam: number;
      album: Map<string, { ten: string; slug: string; soTam: number }>;
    }
  >();
  for (const s of selections) {
    if (!idListTim.has(s.listId)) continue;
    const ten = s.albumName || "(thư mục gốc)";
    const muc = theoThuMuc.get(ten) ?? { soTam: 0, album: new Map() };
    muc.soTam++;

    const g = galleryTheoId.get(listCuaGallery.get(s.listId)?.galleryId ?? "");
    if (g) {
      const a = muc.album.get(g.id) ?? {
        ten: g.clientName ?? g.title,
        slug: g.slug,
        soTam: 0,
      };
      a.soTam++;
      muc.album.set(g.id, a);
    }
    theoThuMuc.set(ten, muc);
  }

  /* Gio khach hay chon, tinh theo gio Viet Nam. */
  const gioHayChon = new Array(24).fill(0) as number[];
  for (const s of selections) {
    gioHayChon[(s.createdAt.getUTCHours() + LECH_GIO_VN) % 24]++;
  }

  return {
    canNhac: canNhac.sort((a, b) => b.mucGap - a.mucGap),
    tongQuan: {
      soAlbum: galleries.length,
      soAnh: galleries.reduce((t, g) => t + g.photoCount, 0),
      soTamDaChon: new Set(selections.map((s) => `${s.listId}:${s.driveFileId}`))
        .size,
      soAlbumCoKhachChon,
      soAlbumDaXongHet,
      soTamDaTai: galleries.reduce((t, g) => t + (g.luotTai ?? 0), 0),
    },
    thoiGian: {
      ngayToiTamDau: trungBinh(ngayToiTamDau),
      ngayToiBaoXong: trungBinh(ngayToiBaoXong),
      soMauToiTamDau: ngayToiTamDau.length,
      soMauToiBaoXong: ngayToiBaoXong.length,
    },
    thuMucHayChon: [...theoThuMuc.entries()]
      .map(([ten, m]) => ({
        ten,
        soTam: m.soTam,
        album: [...m.album.values()].sort((a, b) => b.soTam - a.soTam),
      }))
      .sort((a, b) => b.soTam - a.soTam)
      .slice(0, 8),
    gioHayChon,
    soAlbumChuaDoLuotXem,
  };
}
