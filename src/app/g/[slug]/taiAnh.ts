/*
  Tải ảnh về máy khách.

  iOS KHÔNG cho trang web tự ghi vào app Ảnh — không có API nào làm được việc
  đó. Đường ngắn nhất tới app Ảnh là khay chia sẻ của hệ điều hành
  (`navigator.share` kèm tệp): khách chỉ bấm một cái "Lưu vào Ảnh".

  Trước đây nút tải chỉ là thẻ <a href> nên trên iPhone ảnh mở ra trong trình
  duyệt, khách phải nhấn giữ rồi chọn "Lưu vào Ảnh" — ba bước.
*/

const DUOI_THEO_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
};

/** Tên tệp phải có đuôi đúng, không thì iOS không nhận ra đây là ảnh. */
function tenAnh(ten: string, mime: string): string {
  if (/\.[a-z0-9]{3,4}$/i.test(ten)) return ten;
  return ten + (DUOI_THEO_MIME[mime] ?? ".jpg");
}

export async function taiTep(fileId: string, ten: string): Promise<File> {
  const res = await fetch(`/api/download/${fileId}`);
  // fetch không ném lỗi khi máy chủ trả về 4xx/5xx — phải tự kiểm tra res.ok,
  // bỏ qua là nút báo tải xong trong khi khách không nhận được gì.
  if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);
  const blob = await res.blob();
  const mime = blob.type || "image/jpeg";
  return new File([blob], tenAnh(ten, mime), { type: mime });
}

/** Máy này có mở được khay chia sẻ kèm tệp không (iPhone, Android đời mới). */
export function coKhayChiaSe(file: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  );
}

export type KetQuaChiaSe = "xong" | "khach-huy" | "het-han-cham" | "khong-ho-tro";

export async function moKhayChiaSe(file: File): Promise<KetQuaChiaSe> {
  try {
    await navigator.share({ files: [file] });
    return "xong";
  } catch (err) {
    const ten = (err as Error)?.name;
    if (ten === "AbortError") return "khach-huy";
    /*
      Safari chỉ cho mở khay chia sẻ trong vài giây kể từ cú chạm của khách.
      Tải một tấm ảnh gốc 5–6 MB qua 4G thường lâu hơn thế, lúc đó Safari ném
      NotAllowedError. Nhưng tệp đã nằm sẵn trong bộ nhớ rồi nên chỉ cần khách
      chạm thêm một cái là mở được ngay — xem trạng thái "cho-cham".
    */
    if (ten === "NotAllowedError") return "het-han-cham";
    return "khong-ho-tro";
  }
}

/** Cách tải thông thường — máy tính và Android. Trên iPhone ảnh vào app Tệp. */
export function luuQuaThe(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Thu hồi trễ một nhịp, thu hồi ngay thì trình duyệt chưa kịp đọc xong tệp.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Máy iPhone/iPad — nơi thẻ tải xuống không có tác dụng. */
export function laIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad đời mới tự khai là máy Mac, phải nhìn thêm số điểm chạm.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Giao tệp cho khách bằng cách tốt nhất máy đó làm được.
 *
 * Trả về "cho-cham" khi khay chia sẻ bị từ chối vì quá hạn cú chạm — tệp vẫn
 * nằm sẵn trong bộ nhớ, người gọi chỉ cần hiện một nút để khách chạm lần nữa.
 * Trả về "khong-ho-tro" khi máy không có cách nào nhận tệp.
 */
export async function giaoTepChoKhach(
  file: File
): Promise<"xong" | "cho-cham" | "khong-ho-tro"> {
  if (coKhayChiaSe(file)) {
    const kq = await moKhayChiaSe(file);
    if (kq === "het-han-cham") return "cho-cham";
    if (kq !== "khong-ho-tro") return "xong";
  }

  // Tren iOS the tai xuong khong chay: trinh duyet mo thang tep ra xem, file
  // nen thanh mot man hinh ky tu rac. Tha bao that con hon.
  if (laIOS()) return "khong-ho-tro";

  luuQuaThe(file);
  return "xong";
}
