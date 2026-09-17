import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ duong?: string[] }> };

/**
 * Đường cũ /anh-cuoi (17/09/2026, dùng vài tiếng trước khi gom mọi dịch vụ về
 * /dich-vu). Giữ lại để link đã gửi khách không chết:
 *   /anh-cuoi            → /dich-vu/anh-cuoi
 *   /anh-cuoi/<mục>      → /dich-vu/anh-cuoi/<mục>
 *   /anh-cuoi/<mục>/<id> → /dich-vu/anh-cuoi/anh/<id>
 */
export default async function AnhCuoiCu({ params }: Props) {
  const [muc, id] = (await params).duong ?? [];
  if (id) permanentRedirect(`/dich-vu/anh-cuoi/anh/${encodeURIComponent(id)}`);
  if (muc) permanentRedirect(`/dich-vu/anh-cuoi/${encodeURIComponent(muc)}`);
  permanentRedirect("/dich-vu/anh-cuoi");
}
