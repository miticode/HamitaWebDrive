import { NextRequest } from "next/server";
import { z } from "zod";
import { daMoKhoa } from "@/lib/access";
import {
  getGalleryBySlug,
  getLists,
  getSelections,
  setSelectionNote,
  toggleSelection,
} from "@/lib/store";

export const runtime = "nodejs";

/*
  Ca nha dung chung mot ma nen cung chung mot danh sach chon.
  Truoc day moi may khach mot ma rieng, dan toi hai chuyen do: co dau chon tren
  dien thoai roi mo laptop la mat sach, va hai nguoi cung tim mot tam thi bi dem
  thanh hai. Dung mot moc chung xu ly ca hai cung luc.
*/
const CHUNG = "chung";

/** Doc lai cac anh da chon cua album. */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  const all = await getSelections(gallery.id);
  return Response.json({
    selections: all.map((s) => ({
      listId: s.listId,
      driveFileId: s.driveFileId,
      note: s.note,
    })),
  });
}

const ToggleBody = z.object({
  slug: z.string().min(1),
  listId: z.string().min(1),
  driveFileId: z.string().min(10),
  fileName: z.string().min(1).max(300),
  albumName: z.string().max(300),

  /*
    Trang thai khach muon dat, thay vi de may chu tu lat nguoc.
    KHONG bat buoc co: may khach dang mo san trang voi ban JavaScript cu van
    gui thieu truong nay, va van phai chay dung nhu truoc.
  */
  muon: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = ToggleBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dữ liệu sai" }, { status: 400 });

  const body = parsed.data;
  const gallery = await getGalleryBySlug(body.slug);
  if (!gallery) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  /*
    Kiem tra ma o phia may chu, khong tin phia trinh duyet.
    Neu chi giau nut chon o giao dien thi ai cung goi thang duong nay duoc.
  */
  if (!(await daMoKhoa(gallery.id, gallery.accessCode))) {
    return Response.json({ error: "Cần mã của studio để chọn ảnh" }, { status: 403 });
  }

  // Chan viec gui listId cua gallery khac vao.
  const lists = await getLists(gallery.id);
  if (!lists.some((l) => l.id === body.listId)) {
    return Response.json({ error: "Danh sách không thuộc gallery này" }, { status: 400 });
  }

  const result = await toggleSelection({
    listId: body.listId,
    driveFileId: body.driveFileId,
    fileName: body.fileName,
    albumName: body.albumName,
    visitorId: CHUNG,
    muon: body.muon,
  });

  return Response.json(result);
}

const NoteBody = z.object({
  slug: z.string().min(1),
  listId: z.string().min(1),
  driveFileId: z.string().min(10),
  note: z.string().max(300),
});

/** Ghi chu rieng cho mot anh da chon, vi du "in co 40x60". */
export async function PATCH(req: NextRequest) {
  const parsed = NoteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dữ liệu sai" }, { status: 400 });

  const body = parsed.data;
  const gallery = await getGalleryBySlug(body.slug);
  if (!gallery) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  // Cung mot dieu kien voi chon anh — ghi chu la mot phan cua viec chon.
  if (!(await daMoKhoa(gallery.id, gallery.accessCode))) {
    return Response.json({ error: "Cần mã của studio để ghi chú" }, { status: 403 });
  }

  const lists = await getLists(gallery.id);
  if (!lists.some((l) => l.id === body.listId)) {
    return Response.json({ error: "Danh sách không thuộc gallery này" }, { status: 400 });
  }

  await setSelectionNote(body.listId, body.driveFileId, CHUNG, body.note.trim() || null);
  return Response.json({ ok: true });
}
