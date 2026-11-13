"use client";

/**
 * Ô chọn lọc TỰ ÁP DỤNG khi đổi — đợt soát UX, mục P1-2.
 *
 * Đếm trên 11 trang có lọc: 11 trang dùng chip bấm-là-xong, riêng trang Hợp
 * đồng bắt chọn xong rồi bấm thêm nút "Lọc". Mà nó dùng CẢ HAI cùng lúc: hai
 * ô chọn phải bấm nút ở hàng trên, chip "Còn nợ" bấm-là-xong ở hàng dưới —
 * hai thứ cạnh nhau, hành xử khác nhau.
 *
 * Giờ cả web có một quy tắc: đổi lựa chọn = áp dụng ngay. Ô gõ chữ vẫn cần
 * nút Tìm, vì không ai muốn trang nhảy sau mỗi phím.
 *
 * Vẫn là một `<select>` trong `<form>` thật, chỉ thêm một lượt gửi form khi
 * đổi — tắt JavaScript thì nút Tìm bên cạnh vẫn gửi được như cũ.
 */
export function ChonLoc({
  ten,
  nhan,
  giaTri,
  muc,
}: {
  ten: string;
  nhan: string;
  giaTri: string;
  muc: { giaTri: string; chu: string }[];
}) {
  return (
    <select
      name={ten}
      defaultValue={giaTri}
      aria-label={nhan}
      className="input w-auto"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {muc.map((m) => (
        <option key={m.giaTri} value={m.giaTri}>
          {m.chu}
        </option>
      ))}
    </select>
  );
}
