import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { loadTree } from "@/lib/gallery";

export const runtime = "nodejs";
export const maxDuration = 60;

/** So anh tra ve moi lan — du de chon anh bia ma khong lam nang trinh duyet. */
const PAGE = 60;

/** Danh sach anh cua mot album, de chon anh bia. Chi admin goi duoc. */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 403 });
  }

  const folderId = req.nextUrl.searchParams.get("folder")?.trim();
  if (!folderId) {
    return Response.json({ error: "Thiếu mã thư mục." }, { status: 400 });
  }

  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0);

  try {
    const tree = await loadTree(folderId);
    // Gop anh cua moi album lai, giu nguyen thu tu nhu khach nhin thay.
    const all = tree.albums.flatMap((a) =>
      a.photos.map((p) => ({ id: p.id, name: p.name, album: a.name }))
    );

    return Response.json({
      total: all.length,
      photos: all.slice(offset, offset + PAGE),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 502 });
  }
}
