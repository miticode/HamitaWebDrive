import { databaseIsConfigured, getPrisma } from "@/lib/db";
import { ghiNhatKy } from "@/lib/nhatKy";
import type { HanhDong } from "@/lib/nhatKyChung";
import { docCacBuoc } from "@/lib/buocHopDong";
import { tenBuocTheoSo } from "@/lib/buocAnhGoc";
import type { NguoiDung } from "@/lib/phienNhanVien";

/*
  ĐỔI BƯỚC HỢP ĐỒNG TỪ PHÍA ALBUM — gom lõi vào một chỗ, 19/11/2026.

  Hai sự kiện khác nhau cùng dẫn tới cùng một việc:

    1. NHÂN VIÊN bấm "Gửi thông báo" hoặc "Đã gửi file gốc" ở trang quản lý
       album  →  bước 2/3 sang 4, hoặc 10/11/12 sang 13.
    2. KHÁCH bấm "đã chọn xong" trên trang album của họ
       →  bước 4 sang 5, hoặc 13 sang 14.

  Hai sự kiện ở hai nơi hoàn toàn khác nhau trong mã nguồn — một cái là server
  action của trang admin, một cái là đường API công khai của khách. Nhưng phần
  việc thì y hệt: tra hợp đồng, tính bước đích, đổi, ghi nhật ký. Chép hai bản
  là sớm muộn lệch nhau một điều kiện, nên để MỘT chỗ và truyền vào phép tính
  bước khác nhau.
*/

/**
 * Người làm ghi vào nhật ký khi chính KHÁCH bấm, không phải nhân viên.
 *
 * Truyền null vào `ghiNhatKy` thì cột người làm ghi "(không rõ)" — đo thật
 * 19/11/2026 và đó là chữ nói SAI: nhân viên đọc nhật ký sẽ tưởng dữ liệu bị
 * lỗi, trong khi sự thật là khách tự báo trên trang album của họ. `id` để null
 * vì khách không có tài khoản nhân viên nào.
 */
export const NGUOI_KHACH = { id: null, ten: "Khách tự báo" } as const;

/** Kết quả đổi bước — nơi gọi dùng để nói cho người bấm biết việc đã xong. */
export type KetQuaDoiBuoc = {
  /** Đã đổi bước thật. */
  doiBuoc?: { tenKhach: string; tu: string; den: string };
  /** Album chưa gắn hợp đồng nên không có gì để đổi. */
  chuaGan?: true;
  /** Có hợp đồng nhưng bước hiện tại không phải chỗ đáng đổi. */
  giuBuoc?: { tenKhach: string; buoc: string };
  /**
   * Những trang cần vẽ lại, chỉ có khi bước đổi thật.
   *
   * Trả về đây chứ không tự gọi `revalidatePath`: hàm này còn được gọi từ
   * đường API của khách, và trộn việc vẽ lại trang quản lý vào lõi thì nơi
   * gọi không còn quyết định được nữa.
   */
  veLai?: string[];
};

/**
 * Đổi bước hợp đồng của một album.
 *
 * `tinhBuoc` nhận bước hiện tại, trả số bước đích hoặc null nếu đừng đổi —
 * đó là chỗ duy nhất hai sự kiện khác nhau.
 *
 * KHÔNG bao giờ ném lỗi, và đây là điều kiện bắt buộc của cả hai nơi gọi:
 *
 *   - Đường nhân viên gọi nó SAU KHI thông báo đã tới điện thoại khách. Nổ ở
 *     đây thì nhân viên thấy báo lỗi, tưởng tin chưa gửi, rồi bấm lại lần hai
 *     làm khách rung vô cớ.
 *   - Đường khách gọi nó sau khi đã ghi "đã chọn xong". Nổ ở đây thì khách
 *     thấy lỗi và tưởng việc báo của mình thất bại, trong khi studio đã nhận
 *     được — việc chính đã xong rồi, phần đổi bước chỉ là tiện thể.
 */
export async function doiBuocAlbum(
  galleryId: string,
  tinhBuoc: (buoc: number | null) => number | null,
  /**
   * Tên hành động ghi vào nhật ký — hoặc một hàm tính nó theo bước CŨ.
   *
   * Nhận cả hàm vì một nút có thể làm hai việc khác tên: nút gửi tin ở bước 2
   * là "đã gửi ảnh gốc", cùng nút ấy ở bước 5 là "đã gửi ảnh hoàn thiện" (anh
   * báo 26/11/2026). Ghi chung một tên thì người đọc nhật ký thấy "đã gửi ảnh
   * gốc" ở một hợp đồng đã qua khâu gốc từ lâu — sai sự thật.
   */
  hanhDong: HanhDong | ((buocCu: number | null) => HanhDong),
  nguoi: Pick<NguoiDung, "id" | "ten"> | null,
): Promise<KetQuaDoiBuoc> {
  try {
    /* Chạy ở máy bằng kho JSON thì không có bảng hợp đồng — im lặng bỏ qua. */
    if (!databaseIsConfigured()) return {};

    const prisma = getPrisma();
    const album = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: {
        slug: true,
        hopDong: { select: { id: true, tenKhach: true, maHD: true, trangThai: true, buoc: true } },
      },
    });
    if (!album?.hopDong) return { chuaGan: true };

    const hd = album.hopDong;
    const cu = hd.trangThai ?? "chưa gõ bước";
    const so = tinhBuoc(hd.buoc);
    if (so === null) return { giuBuoc: { tenKhach: hd.tenKhach, buoc: cu } };

    /* Tên bước lấy từ bảng đang dùng, không viết cứng — xem `tenBuocTheoSo`. */
    const ten = tenBuocTheoSo(await docCacBuoc(), so);
    if (!ten) return { giuBuoc: { tenKhach: hd.tenKhach, buoc: cu } };

    await prisma.hopDong.update({ where: { id: hd.id }, data: { trangThai: ten, buoc: so } });

    /*
      GHI NHẬT KÝ, khác nút "Làm mới" (nút đó cố ý không ghi).

      Đây là đổi tiến độ của cả một nhà khách, và từ nay nó xảy ra ở NGOÀI
      trang hợp đồng. Người mở hợp đồng ra thấy bước đã nhảy mà không ai gõ
      thì phải tra được là ai, lúc nào, từ đâu.

      Khách bấm thì nơi gọi truyền `NGUOI_KHACH` — xem chú thích ở đó.
    */
    await ghiNhatKy({
      nguoi,
      hanhDong: typeof hanhDong === "function" ? hanhDong(hd.buoc) : hanhDong,
      doiTuong: "HopDong",
      doiTuongId: hd.id,
      chiTiet: { ten: `${hd.tenKhach} (${hd.maHD})`, doi: { "trạng thái": { truoc: cu, sau: ten } } },
    });

    return {
      doiBuoc: { tenKhach: hd.tenKhach, tu: cu, den: ten },
      veLai: [`/admin/${album.slug}`, "/quan-ly/hop-dong", `/quan-ly/hop-dong/${hd.id}`],
    };
  } catch {
    /* Nuốt lỗi có chủ ý — xem chú thích trên. */
    return {};
  }
}
