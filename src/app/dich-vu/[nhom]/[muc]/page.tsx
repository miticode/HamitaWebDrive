import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { STUDIO_NAME } from "@/lib/constants";
import { docMuc, docNhom } from "@/lib/mucDichVu";
import { docThuMucCongKhai, mucDangCo } from "@/lib/anhGioiThieu";
import { KhungDichVu, LuoiThuMuc, chuNhom } from "../../KhungDichVu";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ nhom: string; muc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const nhom = await docNhom(p.nhom);
  const muc = await docMuc(p.nhom, p.muc);
  if (!nhom || !muc) return {};
  const chu = chuNhom(nhom);
  return {
    title: `${chu.tieuDe} · ${muc.ten} — ${STUDIO_NAME}`,
    description: chu.moTa || undefined,
    alternates: { canonical: `/dich-vu/${nhom.key}/${muc.key}` },
  };
}

/** Một mục của nhóm (/dich-vu/anh-cuoi/nha-gai): các thẻ thư mục, bấm vào mới xem ảnh. */
export default async function MucPage({ params }: Props) {
  const p = await params;
  const nhom = await docNhom(p.nhom);
  const muc = await docMuc(p.nhom, p.muc);
  if (!nhom || !muc) notFound();
  // Nhóm một mục không có đường mục riêng — gom về một địa chỉ.
  if (nhom.muc.length === 1) redirect(`/dich-vu/${nhom.key}`);

  const [co, thuMuc] = await Promise.all([mucDangCo(nhom.key), docThuMucCongKhai(nhom.key, muc.key)]);
  if (thuMuc.length === 0) notFound();

  return (
    <KhungDichVu nhom={nhom} muc={muc.key} mucCo={co}>
      <LuoiThuMuc nhom={nhom.key} thuMuc={thuMuc} />
    </KhungDichVu>
  );
}
