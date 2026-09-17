import { notFound, redirect } from "next/navigation";
import { MUC_ANH_CUOI } from "@/lib/anhCuoi";
import { mucDangCo } from "@/lib/anhGioiThieu";

export const dynamic = "force-dynamic";

/**
 * /anh-cuoi không có nội dung riêng: đưa thẳng tới mục ĐẦU TIÊN đang có ảnh,
 * theo thứ tự trong MUC_ANH_CUOI. Mục nào chưa có thư mục thì bỏ qua — mở ra
 * một mục trống là khách tưởng studio chưa chụp gì.
 */
export default async function AnhCuoiPage() {
  const co = await mucDangCo();
  const dau = MUC_ANH_CUOI.find((m) => co.has(m.key));
  if (!dau) notFound();
  redirect(`/anh-cuoi/${dau.key}`);
}
