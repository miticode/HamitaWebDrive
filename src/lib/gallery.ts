import { cached } from "@/lib/cache";
import {
  getGalleryTree,
  type GalleryTree,
} from "@/lib/drive";

/**
 * Doc cay thu muc cua gallery, co cache ngan.
 * 5 phut la doi trong so giua "anh tha folder moi vao Drive thi khach thay ngay"
 * va "khong goi Drive moi lan co nguoi mo trang".
 */
const TTL_MS = 5 * 60 * 1000;

export function loadTree(folderId: string): Promise<GalleryTree> {
  return cached(`tree:${folderId}`, TTL_MS, () => getGalleryTree(folderId));
}


