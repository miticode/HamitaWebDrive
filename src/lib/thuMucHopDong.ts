import { getUserAccessToken } from "@/lib/googleAuth";
import { getPrisma } from "@/lib/db";
import { createGallery, setAccess } from "@/lib/store";
import { MA_MAC_DINH } from "@/lib/access";
import { MUI_GIO } from "@/lib/constants";
import { ganNhieuMa } from "@/lib/maAlbum";
import { maAlbumTheoBuoi } from "@/lib/goiNhieuNgay";

/**
 * LẬP HỢP ĐỒNG XONG THÌ CÓ SẴN THƯ MỤC DRIVE VÀ ALBUM — anh yêu cầu 14/11/2026.
 *
 * ━━ Vì sao đáng làm, bằng số ━━
 *
 * Đo ngày 14/11: **170 album, chỉ 5 cái gắn được hợp đồng** (0%). Mối nối
 * album ↔ hợp đồng là nền của mọi thứ định xây tiếp — tiến độ sản xuất, giao
 * việc Retouch, xem khách chọn ảnh tới đâu ngay trên hợp đồng — mà nền đang
 * gần bằng không, vì gắn tay thì không ai nhớ.
 *
 * Album sinh ra TỪ hợp đồng thì đã gắn sẵn. Đây là cách sửa tận gốc, thay vì
 * thêm một màn hình ghép nữa.
 *
 * ━━ Đi đúng nếp thư mục của tiệm, không bịa nếp mới ━━
 *
 * Soát 40 album mới nhất trên Drive thật thì ra cây này:
 *
 *     Drive của tôi
 *     └ 2026
 *       └ T1 … T12            ← một thư mục mỗi tháng, đủ cả 12
 *         └ "HIS - Minh Ngọc & Công Khoa"   ← album
 *
 * Nên web tìm thư mục năm, rồi thư mục tháng, thiếu cái nào thì tạo cái đó,
 * cuối cùng mới tạo thư mục album. Tạo bừa một thư mục ở gốc Drive là tiệm có
 * hai nếp xếp ảnh, và cái nếp mới đó chỉ máy hiểu.
 *
 * ━━ Tháng nào ━━
 *
 * Tháng của BUỔI CHỤP ĐẦU TIÊN nếu hợp đồng đã có lịch; chưa có lịch thì tháng
 * lập hợp đồng. Ảnh xếp theo tháng chụp mới đúng nghĩa thư mục "T11" — một
 * hợp đồng PreWedding ký tháng 11 mà chụp tháng 5 thì ảnh của nó thuộc T5.
 *
 * ━━ Quyền ━━
 *
 * Kết nối "default" xin `drive.readonly` + `drive.file`. Phần `drive.file` chỉ
 * cho đụng tệp DO CHÍNH WEB TẠO, nên thư mục web tạo thì web sửa và xoá được,
 * còn ảnh cưới của tiệm vẫn nằm ngoài tầm với — đúng như trước. Đã thử thật
 * 14/11 (tạo thư mục con trong T11, đặt quyền chia sẻ, xoá sạch): 5/5 đạt.
 */

/* ── Loại hợp đồng nào có giao ảnh ────────────────────────────────────── */

/**
 * Hai loại KHÔNG sinh album, kể tên thẳng thay vì kể tên mười một loại kia:
 * thêm loại mới sau này thì mặc định là có ảnh, an toàn hơn — thừa một thư mục
 * rỗng còn hơn thiếu album của một nhà thật.
 *
 * "Khách lẻ" là thuê váy áo lẻ, "Mâm quả" là dịch vụ mâm quả — cả hai đều
 * không có tấm ảnh nào để giao. Anh chốt 14/11: chỉ tạo cho loại có giao ảnh,
 * đỡ khoảng 30 thư mục rỗng mỗi tháng (đo: ~86 hợp đồng/tháng, ~57 album).
 */
export const LOAI_HD_KHONG_ANH: readonly string[] = ["Khách lẻ", "Mâm quả"];

export function coGiaoAnh(loaiDV: string | null | undefined): boolean {
  const l = (loaiDV ?? "").trim();
  return l !== "" && !LOAI_HD_KHONG_ANH.includes(l);
}

/* ── Nói chuyện với Drive ─────────────────────────────────────────────── */

const LOAI_THU_MUC = "application/vnd.google-apps.folder";

class LoiDrive extends Error {}

async function goi(token: string, url: string, init?: RequestInit) {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!r.ok) throw new LoiDrive(`Drive trả về ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

/**
 * Thư mục tên `ten` nằm trong `cha`, chưa có thì tạo.
 *
 * `cha` để trống nghĩa là gốc "Drive của tôi". Lọc thêm `'me' in owners` để
 * không vớ phải một thư mục trùng tên ai đó chia sẻ vào.
 */
async function timHoacTao(token: string, ten: string, cha?: string): Promise<string> {
  const q = [
    `name = '${ten.replace(/'/g, "\\'")}'`,
    `mimeType = '${LOAI_THU_MUC}'`,
    "trashed = false",
    "'me' in owners",
    cha ? `'${cha}' in parents` : "'root' in parents",
  ].join(" and ");

  const tim = (await goi(
    token,
    `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q, fields: "files(id)", pageSize: "1" })}`,
  )) as { files?: { id: string }[] };
  const co = tim.files?.[0]?.id;
  if (co) return co;

  const tao = (await goi(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: ten, mimeType: LOAI_THU_MUC, ...(cha ? { parents: [cha] } : {}) }),
  })) as { id: string };
  return tao.id;
}

/** Năm và tháng (1–12) của một ngày "YYYY-MM-DD", hoặc của hôm nay theo giờ studio. */
function namThang(ngay?: string | null): { nam: number; thang: number } {
  const s = (ngay ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (m) return { nam: Number(m[1]), thang: Number(m[2]) };
  const homNay = new Date().toLocaleDateString("sv-SE", { timeZone: MUI_GIO });
  return { nam: Number(homNay.slice(0, 4)), thang: Number(homNay.slice(5, 7)) };
}

export type KetQuaTaoThuMuc =
  | { ok: true; galleryId: string; slug: string; thuMucDrive: string; tenThuMuc: string }
  | { ok: false; loi: string };

/**
 * Tạo thư mục Drive + album web cho một hợp đồng vừa lập.
 *
 * KHÔNG BAO GIỜ NÉM LỖI RA NGOÀI: hợp đồng đã lưu xong rồi mới gọi hàm này.
 * Drive hỏng, mạng rớt hay hết hạn kết nối đều không được phép làm hỏng một
 * hợp đồng đã có thật — người lập chỉ cần biết là album chưa tạo được và tạo
 * tay như cũ.
 */
export async function taoThuMucVaAlbum(
  hopDongId: string,
  /**
   * Tên hiện trên album và trên thư mục Drive. Bỏ trống thì lấy tên khách ghi
   * trên hợp đồng.
   *
   * Vì sao cho đặt khác (anh yêu cầu 14/11/2026): album của tiệm đặt tên kèm
   * mã ở đầu — "HIS - Minh Ngọc & Công Khoa", "HC - Trúc Hà & Hữu Lợi" — mà
   * mã đó nói buổi chụp nào, thứ hợp đồng không biết. Một hợp đồng CƯỚI có
   * thể là hình cổng, là nhà trai, là album; `loaiDV` không suy ra nổi, và
   * đoán bừa thì bộ lọc theo mã ở trang quản lý album bắt trượt.
   */
  tenTuChon?: string,
): Promise<KetQuaTaoThuMuc> {
  try {
    const prisma = getPrisma();
    const hd = await prisma.hopDong.findUnique({
      where: { id: hopDongId },
      select: {
        id: true,
        maHD: true,
        tenKhach: true,
        loaiDV: true,
        ngayDat: true,
        /*
          Đọc ĐỦ lịch kèm loại buổi, không chỉ buổi đầu.

          Buổi đầu để biết tháng (xem chú thích đầu tệp); còn loại của từng
          buổi để biết hợp đồng này cần mấy album và mang mã gì — "nhà gái"
          ra HER, "nhà trai" ra HIS (anh yêu cầu 15/11/2026).
        */
        lich: {
          select: { ngay: true, loai: true },
          where: { ngay: { not: null } },
          orderBy: { ngay: "asc" },
        },
      },
    });
    if (!hd) return { ok: false, loi: "Hợp đồng này không còn." };

    /*
      KHÔNG lọc loại hợp đồng ở đây, cố ý.

      `coGiaoAnh` là phép lọc của việc TỰ ĐỘNG — xem `lapHopDongAction`, nó
      hỏi trước rồi mới gọi hàm này. Nhét phép lọc vào trong đây nữa thì nút
      "Tạo thư mục Drive & album" trên trang hợp đồng cũng bị chặn theo, mà
      nút đó là người đang ngồi đó chủ động bấm: họ biết rõ hợp đồng này cần
      album hơn web biết. Máy đoán giùm thì được, máy cấm thì không.
    */

    const tenGoc = (tenTuChon ?? "").trim() || hd.tenKhach.trim();
    if (!tenGoc) return { ok: false, loi: "Chưa có tên để đặt cho album." };

    /*
      MỘT ALBUM, MANG ĐỦ MÃ CỦA CÁC BUỔI — anh chốt 15/11/2026.

      Gói tiệc cưới 2 ngày là hai buổi, nhà gái và nhà trai. Bản đầu em làm ra
      HAI album riêng; anh bảo sai: ảnh của MỘT NHÀ thì nằm một chỗ, hai mã
      chỉ nói album đó có cả phần nhà trai lẫn nhà gái. Nên ra "HIS - HER -
      Minh Trí & Tấn Đạt", đúng nếp tiệm vốn đã đặt ("HIS - HER - Nhã hân &
      Tân Lộc", 11/11/2026).

      Mã suy từ LOẠI BUỔI trong lịch chụp, không suy từ loại hợp đồng: cùng là
      hợp đồng CƯỚI mà có nhà chỉ chụp một bên. Lịch là thứ người lập vừa điền
      tay, nên nó nói đúng nhà này chụp những đâu.

      Người bấm nút tạo tay mà tự đặt tên thì KHÔNG đụng vào: họ gõ sẵn mã rồi.
    */
    const maTuLich = tenTuChon
      ? []
      : [...new Set(hd.lich.map((l) => maAlbumTheoBuoi(l.loai)).filter((m): m is string => !!m))];
    const ten = maTuLich.length > 0 ? ganNhieuMa(tenGoc, maTuLich) : tenGoc;

    const token = await getUserAccessToken().catch(() => null);
    if (!token) return { ok: false, loi: "Chưa kết nối Google Drive, hoặc kết nối đã hỏng." };

    /* Tháng chụp nếu có, không thì tháng lập — xem chú thích đầu tệp. */
    const { nam, thang } = namThang(hd.lich[0]?.ngay ?? hd.ngayDat);
    const idNam = await timHoacTao(token, String(nam));
    const idThang = await timHoacTao(token, `T${thang}`, idNam);

    /*
      Thư mục album: tạo thẳng, KHÔNG tìm trước.

      Hai nhà trùng tên là chuyện có thật ("Lan Hương - Linh Dương" có hai hợp
      đồng), và mỗi hợp đồng phải có thư mục riêng của nó. Dùng lại thư mục
      cùng tên là ảnh của hai đám trộn vào nhau — hỏng nặng hơn nhiều so với
      việc Drive có hai thư mục trùng tên, thứ Drive vốn cho phép.
    */
    const tao = (await goi(token, "https://www.googleapis.com/drive/v3/files?fields=id,name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: ten, mimeType: LOAI_THU_MUC, parents: [idThang] }),
    })) as { id: string; name: string };

    /*
      Album web: tạo rồi gắn hợp đồng ngay trong cùng một lượt.

      `allowDownload: true` — anh chốt 14/11/2026 là cho tải ngay. Quyền này
      vốn bật/tắt được bất cứ lúc nào ở cửa sổ Cài đặt (nguyên tắc 60), nên
      mặc định bật chỉ là chọn phía đỡ phải nhớ: album chưa gửi thông báo thì
      chưa ai có link mà tải, còn lúc giao ảnh thì khỏi phải bật thêm bước.
    */
    const album = await createGallery({
      title: tao.name,
      clientName: ten,
      driveFolderId: tao.id,
      allowDownload: true,
    });
    await setAccess(album.id, MA_MAC_DINH);
    await prisma.gallery.update({ where: { id: album.id }, data: { hopDongId: hd.id } });

    return { ok: true, galleryId: album.id, slug: album.slug, thuMucDrive: tao.id, tenThuMuc: tao.name };
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) };
  }
}
