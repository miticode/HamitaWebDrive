import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { STUDIO_NAME } from "@/lib/constants";
import { timNhom } from "@/lib/nhomGioiThieu";
import { docThuMucCongKhai, mucDangCo } from "@/lib/anhGioiThieu";
import { KhungDichVu, LuoiThuMuc, chuNhom } from "../KhungDichVu";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ nhom: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const nhom = timNhom((await params).nhom);
  if (!nhom) return {};
  const chu = chuNhom(nhom);
  return {
    title: `${chu.tieuDe} — ${STUDIO_NAME}`,
    description: chu.moTa || undefined,
    alternates: { canonical: `/dich-vu/${nhom.key}` },
  };
}

/**
 * Trang một nhóm dịch vụ (/dich-vu/anh-cuoi), anh yêu cầu 17/09/2026.
 *
 * - Nhóm nhiều mục: chuyển thẳng tới mục ĐẦU TIÊN đang có ảnh.
 * - Nhóm một mục: hiện luôn các thư mục, không có hàng nút.
 *
 * Công khai, KHÔNG dẫn vào album gốc /g/[slug] của nhà khách: link album là
 * bí mật của nhà đó (nguyên tắc 17). Chưa có thư mục nào thì 404 — trang trống
 * làm khách tưởng studio chưa chụp gì.
 */
export default async function NhomPage({ params }: Props) {
  const nhom = timNhom((await params).nhom);
  if (!nhom) notFound();
  const co = await mucDangCo(nhom.key);

  if (nhom.muc.length > 1) {
    const dau = nhom.muc.find((m) => co.has(m.key));
    if (!dau) notFound();
    redirect(`/dich-vu/${nhom.key}/${dau.key}`);
  }

  const muc = nhom.muc[0];
  const thuMuc = await docThuMucCongKhai(nhom.key, muc.key);
  if (thuMuc.length === 0) notFound();

  return (
    <KhungDichVu nhom={nhom} muc={muc.key} mucCo={co}>
      <LuoiThuMuc nhom={nhom.key} thuMuc={thuMuc} />
    </KhungDichVu>
  );
}
