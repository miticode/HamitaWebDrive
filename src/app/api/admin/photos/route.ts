import { NextRequest } from "next/server";
import { quyenAlbum } from "@/lib/quyenAlbum";
import { loadTree } from "@/lib/gallery";

export const runtime = "nodejs";
export const maxDuration = 60;

/** So anh tra ve moi lan — du de chon anh bia ma khong lam nang trinh duyet. */
const PAGE = 60;

/** Danh sach anh cua mot album, de chon anh bia. Chi admin goi duoc. */
export async function GET(req: NextRequest) {
  if (!(await quyenAlbum())) {
    return Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 403 });
  }

  const folderId = req.nextUrl.searchParams.get("folder")?.trim();
  if (!folderId) {
    return Response.json({ error: "Thiếu mã thư mục." }, { status: 400 });
  }

  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0);

  /*
    ?muc= lam hep lai con MOT thu muc con — dung khi chon anh bia cho rieng
    thu muc do. Thieu tham so nay thi tra ve ca album nhu truoc (chon bia cho
    ca album).

    Phai phan biet "khong truyen" voi "truyen chuoi rong": chuoi rong la ma
    THAT cua thu muc goc (anh nam ngay ngoai, khong trong thu muc con nao),
    nen so sanh voi null chu khong dung toan tu hoac-mac-dinh.
  */
  const muc = req.nextUrl.searchParams.get("muc");

  try {
    const tree = await loadTree(folderId);
    const chon = muc === null ? tree.albums : tree.albums.filter((a) => a.id === muc);
    // Gop anh lai, giu nguyen thu tu nhu khach nhin thay.
    const all = chon.flatMap((a) =>
      a.photos.map((p) => ({ id: p.id, name: p.name, album: a.name }))
    );

    /*
      Tra kem danh sach thu muc con — o chon anh bia can no de biet "dat bia
      cho thu muc nao", ma cot subfolders trong database chi luu TEN chu khong
      luu ma. Khong the luu bia theo ten: studio doi ten thu muc tren Drive la
      moi lien ket dut, ma doi ten thi ho doi luon chu khong bao ai.
    */
    return Response.json({
      total: all.length,
      photos: all.slice(offset, offset + PAGE),
      mucs: tree.albums.map((a) => ({
        id: a.id,
        ten: a.name,
        soAnh: a.photos.length,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 502 });
  }
}
