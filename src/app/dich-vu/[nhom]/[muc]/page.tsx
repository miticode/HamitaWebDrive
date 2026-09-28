import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { STUDIO_NAME } from "@/lib/constants";
import { docMuc, docNhom, docNhomCoMuc } from "@/lib/mucDichVu";
import { docThuMucCongKhai, mucDangCo } from "@/lib/anhGioiThieu";
import { KhungDichVu, LuoiThuMuc, chuNhom } from "../../KhungDichVu";

/* Bản dựng sẵn, không đọc database mỗi lượt — xem giải thích đầy đủ ở src/app/page.tsx. */
export const revalidate = 86400;

/**
 * Khai trước mọi mục đang có, đọc database MỘT LẦN lúc build.
 *
 * Khác trang nhóm ở chỗ danh sách mục do studio tự tạo nên phải hỏi database.
 * Đổi lại, cả ngày sau đó không phải hỏi lần nào nữa.
 *
 * Mục studio vừa tạo mà chưa dựng lại thì Next vẫn phục vụ được (dựng ngay lúc
 * khách ghé), chỉ là lượt đó có đọc database — chấp nhận, vì tạo mục là việc
 * dăm bữa nửa tháng, còn bot thì quét suốt ngày.
 */
export async function generateStaticParams() {
  const nhomCoMuc = await docNhomCoMuc();
  return nhomCoMuc.flatMap((n) => n.muc.map((m) => ({ nhom: n.key, muc: m.key })));
}

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
