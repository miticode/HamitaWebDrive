import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { daMoKhoa } from "@/lib/access";
import { getGalleryBySlug, setMucXong } from "@/lib/store";
import { buocSauKhiKhachChonXong } from "@/lib/buocAnhGoc";
import { NGUOI_KHACH, doiBuocAlbum } from "@/lib/doiBuocAlbum";
import { laMucHoanThien } from "@/lib/constants";

export const runtime = "nodejs";

const Body = z.object({
  slug: z.string().min(1),
  /** Ma thu muc con. Chuoi rong = anh nam ngay thu muc goc. */
  albumId: z.string().max(200),
  tenMuc: z.string().min(1).max(300),
  /**
   * Dang CU, van phai nhan: may khach dang mo san trang voi ban JavaScript
   * truoc 08/10/2026 chi biet gui truong nay. Bo di la khach dang ngoi chon
   * bam "bao xong" ra loi 400 ma khong hieu vi sao (cung ly do voi truong
   * `muon` o nguyen tac 23).
   */
  xong: z.boolean().optional(),
  /**
   * Dang MOI: khach bao gi.
   *
   * null = GO trang thai (bam "chon them"). `undefined` = khong gui truong
   * nay, luc do quay ve doc `xong`. Hai thu khac nhau nen khong duoc gop.
   */
  loai: z.enum(["xong", "can-sua"]).nullable().optional(),
  /**
   * Ngay khach can lay hinh, dang "yyyy-mm-dd".
   *
   * KHONG gui truong nay = giu nguyen han cu (may khach ban cu, hoac thu muc
   * khong thuoc dien hoi ngay). Gui null = khach bam "chua biet", xoa han.
   * Hai y dinh khac nhau nen khong duoc gop lam mot.
   */
  hanLay: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngay phai dang yyyy-mm-dd")
    .nullable()
    .optional(),
});

/**
 * Khach tu bao ve MOT thu muc — "da xong" hoac "can chinh lai".
 *
 * Truoc day trang thai nay tinh chung ca album: khach chon xong thu muc dau
 * roi sang thu muc thu hai, thi o thu muc thu hai van hien "da bao xong" trong
 * khi ho chua dong vao. Moi thu muc mot trang thai rieng thi dung thuc te hon
 * — studio cung biet duoc khach dang lam toi dau.
 *
 * Cung dieu kien bao mat voi chon anh: phai da mo khoa dung ma, vi day cung la
 * mot phan cua viec chon.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dữ liệu sai" }, { status: 400 });

  const body = parsed.data;
  const gallery = await getGalleryBySlug(body.slug);
  if (!gallery) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  if (!(await daMoKhoa(gallery.id, gallery.accessCode))) {
    return Response.json({ error: "Cần mã của studio để báo" }, { status: 403 });
  }

  /*
    Uu tien `loai` neu may khach co gui, ke ca khi gui null (nghia la go).

    Phai hoi "co mat trong body khong" chu khong phai "co gia tri khong":
    `loai: null` va "khong gui loai" la hai y dinh khac han nhau, ma viet
    `body.loai ?? ...` thi ca hai deu roi vao cung mot nhanh.
  */
  const loai = "loai" in body ? (body.loai ?? null) : body.xong ? "xong" : null;

  await setMucXong(gallery.id, body.albumId, body.tenMuc, {
    loai,
    ...("hanLay" in body ? { hanLay: body.hanLay ?? null } : {}),
  });

  /*
    KHACH BAO "DA CHON XONG" → DOI BUOC HOP DONG (anh yeu cau 19/11/2026).

    Bước 4 "Đã gửi ảnh gốc, chờ Khách chọn" sang 5 "Đang Retouch"; bước 13
    sang 14 bên nhánh tiệc. Trước hôm nay trang hợp đồng chỉ NHẮC một câu để
    người phụ trách tự chuyển — anh đổi ý vì câu nhắc đó cũng bị bỏ qua.

    CHI khi loai === "xong". Hai giá trị kia không phải "chọn xong":
      - "can-sua": khách bấm "cần chỉnh lại" ở thư mục ảnh đã chỉnh. Đó là
        việc KHÁC HẲN, hiện chưa nối bước nào — xem docs/TRANG-THAI-ALBUM.md
        mục 5.2.
      - null: khách bấm "chọn thêm nữa" để gỡ trạng thái. KHÔNG lùi bước về
        4: Media có thể đã bắt đầu retouch từ lúc nhận tin, lùi bước là nói
        sai việc đang làm. Khách chọn thêm thì studio nhìn danh sách là biết.

    VÀ CHỈ VỚI THƯ MỤC FILE GỐC — sửa 19/11/2026 ngay trong ngày làm.

    Bản đầu đổi bước với mọi thư mục `loai = "xong"`, và em lập luận sai rằng
    điều kiện bước đã đủ chặn. Đo lại bảng `MucXong` thì 96/229 thư mục là
    "hoàn thiện · xong" — đó là khách DUYỆT ảnh đã chỉnh, không phải CHỌN
    file gốc. Hợp đồng đứng ở bước 4 mà khách bấm "Đã ok" ở thư mục hoàn
    thiện thì bản đầu đẩy sang 5 "Đang Retouch" — nói sai việc đang làm, vì
    retouch xong rồi, đáng ra là 7 "Gửi in".

    Không phải chuyện hiếm: 54 album đang có cả hai loại thư mục cùng lúc.

    Dùng `laMucHoanThien` y như trang khách dùng để hỏi khách câu khác
    (nguyên tắc 49) — một nguồn phân loại duy nhất cho cả hai phía.

    Đặt SAU `setMucXong`, không phải trước: việc chính là báo cho studio biết
    khách đã chọn xong. Phần đổi bước là tiện thể, không được phép làm hỏng
    việc chính nếu nó gặp sự cố (`doiBuocAlbum` không bao giờ ném lỗi).

    `NGUOI_KHACH` vì người bấm là KHÁCH, không có tài khoản nhân viên nào.
    Truyền null thì nhật ký ghi "(không rõ)" — đo 19/11 và thấy chữ đó nói
    sai, nhân viên đọc sẽ tưởng dữ liệu lỗi.
  */
  if (loai === "xong" && !laMucHoanThien(body.tenMuc)) {
    const kq = await doiBuocAlbum(gallery.id, buocSauKhiKhachChonXong, "doi-buoc-khach-chon", NGUOI_KHACH);
    for (const d of kq.veLai ?? []) revalidatePath(d);
  }

  return Response.json({ ok: true });
}
