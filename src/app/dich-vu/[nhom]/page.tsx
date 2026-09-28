import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { STUDIO_NAME } from "@/lib/constants";
import { docNhom } from "@/lib/mucDichVu";
import { NHOM_GIOI_THIEU } from "@/lib/nhomGioiThieu";
import { docThuMucCongKhai, mucDangCo } from "@/lib/anhGioiThieu";
import { KhungDichVu, LuoiThuMuc, chuNhom } from "../KhungDichVu";

/* Bản dựng sẵn, không đọc database mỗi lượt — xem giải thích đầy đủ ở src/app/page.tsx. */
export const revalidate = 86400;

/**
 * Khai trước năm nhóm cố định để Next dựng sẵn trang lúc build.
 *
 * Thiếu hàm này thì Next không biết đoạn `[nhom]` nhận những giá trị nào, nên
 * dựng lại trang mỗi lượt khách ghé — tức đọc database mỗi lượt, đúng cái
 * đang muốn tránh. Đã đo 28/09/2026: không có nó thì trang trả
 * `Cache-Control: no-store`; có rồi thì thành bản dựng sẵn.
 *
 * Danh sách nhóm nằm ngay trong mã nguồn nên khai được, không phải hỏi
 * database. Thêm nhóm mới thì sửa `NHOM_GIOI_THIEU`, chỗ này tự theo.
 */
export function generateStaticParams() {
  return NHOM_GIOI_THIEU.map((n) => ({ nhom: n.key }));
}

type Props = { params: Promise<{ nhom: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const nhom = await docNhom((await params).nhom);
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
  const nhom = await docNhom((await params).nhom);
  if (!nhom) notFound();
  const co = await mucDangCo(nhom.key);

  if (nhom.muc.length > 1) {
    const dau = nhom.muc.find((m: { key: string }) => co.has(m.key));
    if (!dau) notFound();
    redirect(`/dich-vu/${nhom.key}/${dau.key}`);
  }

  // Nhóm bị xoá hết mục ở trang quản lý thì coi như chưa có gì để khoe.
  const muc = nhom.muc[0];
  if (!muc) notFound();
  const thuMuc = await docThuMucCongKhai(nhom.key, muc.key);
  if (thuMuc.length === 0) notFound();

  return (
    <KhungDichVu nhom={nhom} muc={muc.key} mucCo={co}>
      <LuoiThuMuc nhom={nhom.key} thuMuc={thuMuc} />
    </KhungDichVu>
  );
}
