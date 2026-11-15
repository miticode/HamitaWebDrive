import { notFound } from "next/navigation";
import { batBuocDangNhap, batBuocQuyen, xemHopDong } from "@/lib/phienNhanVien";
import { docToHopDong } from "@/lib/toHopDong";
import { ToGiay } from "./ToGiay";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export const metadata = { robots: { index: false, follow: false } };

/*
  TỜ HỢP ĐỒNG ĐỂ IN — anh yêu cầu 15/11/2026, chép mẫu AppSheet đang dùng.

  NẰM NGOÀI nhóm `(he-thong)` có chủ đích: nhóm đó bọc sẵn thanh bên và thanh
  trên của phần quản lý. Ở trong nhóm thì phải viết CSS để giấu hai thanh đó
  lúc in, mà giấu bằng CSS thì trên màn hình vẫn thấy — người lập nhìn tờ giấy
  qua một cái khung quản lý, không biết mình đang xem đúng thứ sắp in ra hay
  không. Ở ngoài nhóm thì cái nhìn thấy đúng bằng cái in ra.

  Quyền: đúng như trang chi tiết hợp đồng — quản lý và sale. Tờ này có đủ tiền
  nong và số điện thoại khách, không nới hơn trang kia được.
*/
export default async function InHopDongPage({ params }: Props) {
  const nguoi = await batBuocDangNhap();
  batBuocQuyen(xemHopDong(nguoi));
  const { id } = await params;
  const to = await docToHopDong(id);
  if (!to) notFound();

  return <ToGiay to={to} quayVe={`/quan-ly/hop-dong/${id}`} />;
}
