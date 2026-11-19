/*
  GỬI IN — phép kiểm link, để Ở ĐÂY chứ không trong tệp server action.

  Tệp `"use server"` chỉ được xuất ra hàm async: xuất một hàm đồng bộ thì bản
  dựng đổ ngay với "Server Actions must be async functions" (vấp thật
  19/11/2026). Cùng lý do với `TRANG_THAI_VIEC` trong hopDongChung.ts.
*/

/**
 * Tách các link người dùng dán thành danh sách.
 *
 * Nhận cả xuống dòng, dấu phẩy và khoảng trắng: Media copy từ Zalo ra thì mỗi
 * nơi một kiểu, bắt họ đúng một định dạng là chắc chắn có lần dán hỏng.
 *
 * KHÔNG đòi phải là link Drive. Anh nói "link drive", nhưng chặn theo tên miền
 * thì một hôm xưởng đổi cách nhận (link Zalo, link một dịch vụ khác) là nút
 * đứng hẳn. Chỉ đòi là một địa chỉ http(s) hợp lệ — đủ để loại chữ gõ bừa mà
 * không khoá studio vào một dịch vụ.
 *
 * THIẾU "https://" THÌ TỰ THÊM. Copy link từ Zalo rất hay ra dạng
 * "drive.google.com/drive/folders/abc" — báo lỗi ở đó thì Media phải tự sửa
 * từng dòng, mà họ không có lý do gì để biết vì sao web không nhận.
 *
 * Chỉ thêm khi chuỗi TRÔNG NHƯ tên miền: có dấu chấm, và phần trước dấu gạch
 * chéo đầu tiên không chứa khoảng trắng. Thêm vô điều kiện thì "abc" cũng
 * thành "https://abc" — hợp lệ về cú pháp nên rác lọt hết vào danh sách.
 */
/** Chuỗi này trông như một tên miền (kèm đường dẫn) chứ không phải chữ gõ bừa? */
function laTenMien(x: string): boolean {
  const chu = x.split(/[/?#]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(chu);
}

export function tachLink(tho: string): { loi: string } | { links: string[] } {
  const phan = tho
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (phan.length === 0) return { loi: "Chưa dán link nào." };
  if (phan.length > 20) return { loi: "Nhiều link quá, tối đa 20 link một đợt." };

  const links: string[] = [];
  for (const x of phan) {
    if (x.length > 500) return { loi: "Có một link dài quá mức, anh chị kiểm lại giúp." };
    const day = /^[a-z][a-z0-9+.-]*:\/\//i.test(x) ? x : laTenMien(x) ? `https://${x}` : x;
    let u: URL;
    try {
      u = new URL(day);
    } catch {
      return { loi: `“${x.slice(0, 40)}” không phải một link.` };
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { loi: `“${x.slice(0, 40)}” không phải link web.` };
    }
    /* Dán hai lần cùng một link trong một đợt thì giữ một — không phải lỗi. */
    if (!links.includes(u.toString())) links.push(u.toString());
  }
  return { links };
}

