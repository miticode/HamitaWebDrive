/*
  Tải ảnh về máy khách.

  iOS KHÔNG cho trang web tự ghi vào app Ảnh — không có API nào làm được việc
  đó. Đường ngắn nhất tới app Ảnh là khay chia sẻ của hệ điều hành
  (`navigator.share` kèm tệp): khách chỉ bấm một cái "Lưu vào Ảnh".

  Trước đây nút tải chỉ là thẻ <a href> nên trên iPhone ảnh mở ra trong trình
  duyệt, khách phải nhấn giữ rồi chọn "Lưu vào Ảnh" — ba bước.
*/

/**
 * Viết dung lượng cho khách đọc: "931 MB", "1,3 GB".
 *
 * Dấu PHẨY thập phân, không phải dấu chấm — người Việt đọc "1,3 GB". Dưới 1 GB
 * thì làm tròn hẳn về MB: khách không cần biết 931,4 MB, và số lẻ ở đó chỉ làm
 * nút dài thêm.
 *
 * Để ở đây vì cả hai nút tải đều dùng — `NutTaiFolder` (máy tính, file nén) và
 * `TaiTungTam` (điện thoại, từng tấm). Trước ngày 09/09/2026 hàm này bị chép y
 * hệt ở cả hai; đổi cách viết một bên là hai nút hiện hai kiểu cho cùng một
 * thư mục.
 */
export function dungLuong(byte: number): string {
  if (byte >= 1024 ** 3)
    return `${(byte / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;
  return `${Math.round(byte / 1024 ** 2)} MB`;
}

/** Một tấm ảnh trong thư mục, đủ thông tin để tải về và đặt tên. */
export type AnhTrongFolder = {
  id: string;
  name: string;
  /** Tên thư mục con chứa ảnh — dùng làm thư mục trong file nén. */
  section: string | null;
};

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

export async function taiTep(
  fileId: string,
  ten: string,
  slug: string,
  /** Cho phép người gọi dừng giữa chừng — dùng khi khách bấm "dừng tải". */
  signal?: AbortSignal
): Promise<File> {
  const res = await fetch(`/api/download/${fileId}?slug=${encodeURIComponent(slug)}`, {
    signal,
  });
  // fetch không ném lỗi khi máy chủ trả về 4xx/5xx — phải tự kiểm tra res.ok,
  // bỏ qua là nút báo tải xong trong khi khách không nhận được gì.
  if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);
  const blob = await res.blob();
  const mime = blob.type || "image/jpeg";
  return new File([blob], tenAnh(ten, mime), { type: mime });
}

/** Máy này có mở được khay chia sẻ kèm tệp không (iPhone, Android đời mới). */
export function coKhayChiaSe(file: File): boolean {
  return coKhayChiaSeNhieu([file]);
}

/**
 * Khay chia sẻ có nhận được CẢ CHỤM tệp này không.
 *
 * Phải hỏi đúng chụm sắp gửi chứ không hỏi một tệp mẫu: `canShare` còn xét cả
 * số lượng và tổng dung lượng, nên một tệp lọt không có nghĩa hai mươi tệp
 * cũng lọt.
 */
export function coKhayChiaSeNhieu(files: File[]): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    files.length > 0 &&
    navigator.canShare({ files })
  );
}

export type KetQuaChiaSe = "xong" | "khach-huy" | "het-han-cham" | "khong-ho-tro";

export async function moKhayChiaSe(file: File): Promise<KetQuaChiaSe> {
  return moKhayChiaSeNhieu([file]);
}

export async function moKhayChiaSeNhieu(files: File[]): Promise<KetQuaChiaSe> {
  try {
    await navigator.share({ files });
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

/**
 * Tải THẲNG một tấm từ máy chủ — không đi qua bộ nhớ trang.
 *
 * PHẢI gọi NGAY trong cú chạm của khách, không được có `await` nào phía trước.
 * Đó là cả lý do hàm này tồn tại: Chrome trên Android **chặn im lặng** mọi
 * lượt tải không gắn với một cú chạm còn hiệu lực. Cách cũ tải ảnh về bộ nhớ
 * trước (`taiTep`) rồi mới bấm thẻ — mà tải một tấm gốc qua 4G mất vài giây,
 * tới lúc bấm thì cú chạm đã hết hạn nên máy bỏ qua, khách bấm mà không thấy
 * gì xảy ra. Anh báo ngày 09/09/2026.
 *
 * Trỏ thẳng vào `/api/download` được vì route đó đã trả kèm
 * `Content-Disposition: attachment` và đúng tên tệp — trình duyệt tự lo phần
 * còn lại bằng trình quản lý tải của nó, kèm luôn thanh tiến độ và thông báo
 * khi xong. Nhẹ hơn hẳn: không giữ tấm ảnh nào trong bộ nhớ trang.
 *
 * KHÔNG dùng được trên iPhone — ở đó thẻ tải xuống không chạy, phải đi khay
 * chia sẻ (nguyên tắc 44, 46).
 */
export function taiThang(fileId: string, ten: string, slug: string): void {
  const a = document.createElement("a");
  a.href = `/api/download/${fileId}?slug=${encodeURIComponent(slug)}`;
  a.download = ten;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Cách tải thông thường — máy tính và Android. Trên iPhone ảnh vào app Tệp.
 *
 * `giuMs`: giữ đường dẫn tạm bao lâu rồi mới thu hồi. Mặc định 10 giây cho một
 * tấm lẻ. Khi tải cả thư mục thì hạ xuống, vì lúc đó hàng chục tấm nối đuôi
 * nhau: giữ lâu là bấy nhiêu tấm cùng nằm trong bộ nhớ điện thoại một lúc.
 */
export function luuQuaThe(file: File, giuMs = 10_000): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Thu hồi trễ một nhịp, thu hồi ngay thì trình duyệt chưa kịp đọc xong tệp.
  setTimeout(() => URL.revokeObjectURL(url), giuMs);
}

/**
 * Máy Android.
 *
 * Ngược hẳn với iPhone: ở đây thẻ tải xuống chạy tốt, ảnh rơi vào thư mục Tải
 * về và các app xem ảnh (Google Photos, Thư viện của máy) đều liệt kê thư mục
 * đó — nên tải lần lượt từng tấm là ảnh vào thẳng album của khách.
 */
export function laAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Đang xem trong trình duyệt NHÚNG của Messenger / Facebook / Zalo / Instagram,
 * chứ không phải Chrome hay Safari thật.
 *
 * Quan trọng với việc tải ảnh: mấy trình duyệt nhúng đó **nuốt lượt tải** —
 * thẻ `<a download>` bấm xong không có gì xảy ra, không lỗi, không thông báo.
 * Anh gặp thật ngày 09/09/2026: mở link từ Messenger, thanh tiến độ chạy đủ
 * 115 tấm, khung báo "Đã lưu xong", mà trong máy không có lấy một tấm.
 *
 * Khách của studio mở link từ Zalo/Messenger là chuyện thường ngày, nên đây
 * KHÔNG phải trường hợp hiếm — phải nói thẳng với khách thay vì để họ chờ.
 */
export function laTrongUngDungKhac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|FB_IAB|Messenger|Instagram|Zalo|Line\/|MicroMessenger/i.test(
    navigator.userAgent
  );
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
  /*
    KHAY CHIA SẺ CHỈ DÀNH CHO iPHONE. Đừng bỏ điều kiện `laIOS()` này.

    Bản cũ hỏi "máy có khay chia sẻ không" rồi mở luôn, với giả định đã ghi
    thành chú thích: "máy tính và Android không dùng khay chia sẻ". Giả định đó
    SAI — Chrome trên Windows có `navigator.share` kèm tệp, nên anh bấm nút tải
    trên máy bàn thì hiện ra bảng "Share using: Nearby Sharing, Paint, Discord…"
    thay vì tải file về. Anh gặp thật ngày 07/09/2026.

    Trên máy tính, tải xuống là việc đã chạy tốt sẵn và đúng thứ khách muốn;
    hỏi họ muốn gửi tấm ảnh đi đâu là chen thêm một câu không ai hỏi. Android
    cũng vậy: ảnh rơi vào thư mục Tải về và app xem ảnh liệt kê ngay
    (nguyên tắc 44). Chỉ iPhone mới thật sự cần khay, vì ở đó thẻ tải xuống
    không chạy.

    *Vì sao lỗi này lọt qua buổi kiểm hôm đó:* trình duyệt nhúng dùng để chạy
    thử **không có Web Share API** — đo lại thấy `navigator.share` là
    `undefined` ngay trên localhost dù `isSecureContext` bằng true. Nên nhánh
    khay chia sẻ không bao giờ chạy trong lúc thử, còn Chrome thật của anh thì
    có. **Đừng kết luận "máy tính không hỗ trợ" từ trình duyệt nhúng.**
  */
  if (laIOS()) {
    if (coKhayChiaSe(file)) {
      const kq = await moKhayChiaSe(file);
      if (kq === "het-han-cham") return "cho-cham";
      if (kq !== "khong-ho-tro") return "xong";
    }
    // Tren iOS the tai xuong khong chay: trinh duyet mo thang tep ra xem, file
    // nen thanh mot man hinh ky tu rac. Tha bao that con hon.
    return "khong-ho-tro";
  }

  luuQuaThe(file);
  return "xong";
}
