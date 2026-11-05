import { NextRequest } from "next/server";
import { z } from "zod";
import { daMoKhoa } from "@/lib/access";
import { getGalleryBySlug, setMucXong } from "@/lib/store";

export const runtime = "nodejs";

const Body = z.object({
  slug: z.string().min(1),
  /** Ma thu muc con. Chuoi rong = anh nam ngay thu muc goc. */
  albumId: z.string().max(200),
  tenMuc: z.string().min(1).max(300),
  /**
   * Dang CU, van phai nhan: may khach dang mo san trang voi ban JavaScript
   * truoc 08/10/2026 chi biet gui truong nay. Bo di la khach dang ngoi chon
   * bam "bao xong" ra loi 400 ma khong hieu vi sao (cung ly do voi truong
   * `muon` o nguyen tac 23).
   */
  xong: z.boolean().optional(),
  /**
   * Dang MOI: khach bao gi.
   *
   * null = GO trang thai (bam "chon them"). `undefined` = khong gui truong
   * nay, luc do quay ve doc `xong`. Hai thu khac nhau nen khong duoc gop.
   */
  loai: z.enum(["xong", "can-sua"]).nullable().optional(),
  /**
   * Ngay khach can lay hinh, dang "yyyy-mm-dd".
   *
   * KHONG gui truong nay = giu nguyen han cu (may khach ban cu, hoac thu muc
   * khong thuoc dien hoi ngay). Gui null = khach bam "chua biet", xoa han.
   * Hai y dinh khac nhau nen khong duoc gop lam mot.
   */
  hanLay: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngay phai dang yyyy-mm-dd")
    .nullable()
    .optional(),
});

/**
 * Khach tu bao ve MOT thu muc — "da xong" hoac "can chinh lai".
 *
 * Truoc day trang thai nay tinh chung ca album: khach chon xong thu muc dau
 * roi sang thu muc thu hai, thi o thu muc thu hai van hien "da bao xong" trong
 * khi ho chua dong vao. Moi thu muc mot trang thai rieng thi dung thuc te hon
 * — studio cung biet duoc khach dang lam toi dau.
 *
 * Cung dieu kien bao mat voi chon anh: phai da mo khoa dung ma, vi day cung la
 * mot phan cua viec chon.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dữ liệu sai" }, { status: 400 });

  const body = parsed.data;
  const gallery = await getGalleryBySlug(body.slug);
  if (!gallery) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  if (!(await daMoKhoa(gallery.id, gallery.accessCode))) {
    return Response.json({ error: "Cần mã của studio để báo" }, { status: 403 });
  }

  /*
    Uu tien `loai` neu may khach co gui, ke ca khi gui null (nghia la go).

    Phai hoi "co mat trong body khong" chu khong phai "co gia tri khong":
    `loai: null` va "khong gui loai" la hai y dinh khac han nhau, ma viet
    `body.loai ?? ...` thi ca hai deu roi vao cung mot nhanh.
  */
  const loai = "loai" in body ? (body.loai ?? null) : body.xong ? "xong" : null;

  await setMucXong(gallery.id, body.albumId, body.tenMuc, {
    loai,
    ...("hanLay" in body ? { hanLay: body.hanLay ?? null } : {}),
  });
  return Response.json({ ok: true });
}
