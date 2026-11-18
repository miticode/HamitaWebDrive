import { duQuyenDrive, getUserAccessToken, type KetNoi } from "@/lib/googleAuth";
import { emailChiaSe, noiChuaAlbum } from "@/lib/noiChuaAlbum";
import { getPrisma } from "@/lib/db";
import { createGallery, setAccess } from "@/lib/store";
import { MA_MAC_DINH } from "@/lib/access";
import { MUI_GIO } from "@/lib/constants";
import { ganNhieuMa, tenKhongMa } from "@/lib/maAlbum";
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
 * THÁNG LẬP HỢP ĐỒNG — anh chốt 18/11/2026.
 *
 * Từ 14/11 đến 18/11 web lấy tháng của buổi chụp đầu tiên, với lý do "ảnh xếp
 * theo tháng chụp mới đúng nghĩa thư mục T11". Anh bảo không, và lý do của anh
 * mạnh hơn: người lập hợp đồng hôm nay mở Drive ra phải thấy thư mục ở tháng
 * này, chứ không phải đi tìm trong một tháng nào đó của tương lai.
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
/**
 * Tìm thư mục CÓ SẴN theo tên trên ổ của chính tài khoản này.
 *
 * KHÔNG tạo nếu thiếu: "Tiệm Ảnh Nhà Su" và "HAMI BABY" là thư mục thật của
 * tiệm; không thấy thì phải kêu lên, chứ tạo một cái trùng tên là tiệm có hai
 * chỗ chứa ảnh mà chỉ web biết chỗ thứ hai.
 *
 * ━━ Vì sao PHẢI lọc `'me' in owners` ━━
 *
 * Đo 18/11/2026, ngay sau khi anh nới quyền: tìm "HAMI BABY" bằng kết nối kho
 * ra BỐN kết quả —
 *
 *   1VOSi1…  chủ hamitaweddinghouse, ở gốc Drive      ← đúng cái cần
 *   1QXX9a…  chủ hamita.studio, trong "Tháng 3"       ← chia sẻ sang
 *   1xco-P…  chủ hamita.studio, trong "Tháng 2"
 *   1XR42l…  chủ hamita.studio, trong "Tháng 1"
 *
 * Ba cái sau là thư mục con bên Drive ảnh cưới, được chia sẻ nên tài khoản kho
 * cũng thấy. Không lọc thì Google trả cái nào trước là lấy cái đó — hôm ấy là
 * cái trong "Tháng 3". Album sẽ nằm nhầm ổ, và dung lượng trừ vào ổ 2 TB vốn
 * đã dùng 1.892/2.048 GB — đúng thứ việc chia ổ này sinh ra để tránh.
 *
 * Bản đầu em cố ý KHÔNG lọc, với lý do "thư mục có thể do tài khoản khác lập
 * rồi chia sẻ sang". Lý do đó sai ở đây: ổ kho là ổ của tiệm, hai thư mục gốc
 * ấy do chính nó sở hữu.
 *
 * Còn trùng nữa thì KHÔNG chọn bừa — ném lỗi, để người ta vào Drive dọn.
 */
async function timThuMuc(token: string, ten: string): Promise<string | null> {
  const q = [
    `name = '${ten.replace(/'/g, "\'")}'`,
    `mimeType = '${LOAI_THU_MUC}'`,
    "trashed = false",
    "'me' in owners",
  ].join(" and ");
  const tim = (await goi(
    token,
    `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q, fields: "files(id)", pageSize: "10" })}`,
  )) as { files?: { id: string }[] };
  const thay = tim.files ?? [];
  if (thay.length > 1) {
    throw new LoiDrive(
      `Có ${thay.length} thư mục tên “${ten}” trên Kho ảnh CRM. ` +
        "Vào Drive xoá hoặc đổi tên bớt, chỉ để lại một cái, rồi tạo album lại.",
    );
  }
  return thay[0]?.id ?? null;
}

/**
 * Chia sẻ quyền sửa cho tài khoản Drive ảnh cưới.
 *
 * Bắt buộc với thư mục tạo ở Drive kho: album web đọc ảnh bằng kết nối
 * "default", không chia sẻ sang thì trang khách mở ra trắng trơn.
 *
 * `sendNotificationEmail: false` — đây là thao tác nội bộ giữa hai tài khoản
 * của tiệm, mỗi hợp đồng một email thông báo thì hộp thư ngập.
 */
async function chiaSeChoDriveChinh(token: string, thuMucId: string): Promise<void> {
  await goi(token, `https://www.googleapis.com/drive/v3/files/${thuMucId}/permissions?sendNotificationEmail=false`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "user", role: "writer", emailAddress: emailChiaSe() }),
  });
}

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

/**
 * Từ năm này trở đi, hai thư mục mảng trên ổ kho mới có thêm cấp NĂM.
 *
 * Anh chốt 18/11/2026. Cây hiện tại ở đó phẳng — "HAMI BABY / Tháng 1…11",
 * "Tiệm Ảnh Nhà Su / Tháng 3…11", không có năm. Dồn ảnh 2027 vào chính những
 * thư mục ấy là hai năm trộn vào nhau.
 *
 * Vì sao 2027 chứ không phải ngay bây giờ: thêm cấp năm từ hôm nay thì 19 thư
 * mục tháng của 2026 nằm ngoài cây mới, và chỉ có người mới được quyết chuyện
 * kéo ảnh thật đi đâu — không phải web. Anh chọn để nguyên 2026, sang năm bắt
 * đầu nếp mới.
 *
 * Drive ảnh cưới KHÔNG dính mốc này: bên đó vốn đã có cấp năm từ đầu.
 */
const NAM_CO_CAP_NAM = 2027;

export type KetQuaTaoThuMuc =
  | {
      ok: true;
      galleryId: string;
      slug: string;
      thuMucDrive: string;
      /** Tên thư mục trên Drive — KHÔNG mang mã. */
      tenThuMuc: string;
      /** Tên album trên web — có mã (HIS, HER…) nếu lịch suy ra được. */
      tenAlbum: string;
      /** Ổ Drive đã tạo: "default" là ổ ảnh cưới, "kho" là ổ 5 TB. */
      ketNoi: KetNoi;
      /**
       * Khác null = tạo xong nhưng CHƯA chia sẻ được sang tài khoản ảnh cưới,
       * nên trang khách sẽ không đọc nổi ảnh cho tới khi có người chia sẻ tay.
       */
      canChiaSe: string | null;
    }
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
  /**
   * Mã album do NGƯỜI LẬP chọn, đè lên mọi phép suy.
   *
   * Thêm 18/11/2026. Hai nguồn tự suy (tag dịch vụ, loại buổi) lo được
   * 215/325 ca của mấy gói "NGÀY CƯỚI/HỎI 1 NGÀY"; phần còn lại lịch chỉ ghi
   * "Ngày chụp" chung chung, mà chỉ người đang ngồi với khách mới biết hôm
   * đó chụp nhà gái hay đám hỏi.
   *
   * `undefined` = không ai chọn, cứ tự suy như cũ.
   * Mảng RỖNG = người lập cố ý không gắn mã nào — khác hẳn, nên đừng gộp hai
   * trường hợp này lại.
   */
  maTuChon?: readonly string[],
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
          Lịch đọc về CHỈ để lấy loại buổi — "nhà gái" ra mã HER, "nhà trai"
          ra HIS (anh yêu cầu 15/11/2026).

          Không còn dùng để tính tháng nữa: từ 18/11 tháng lấy theo ngày lập
          hợp đồng. Giữ `where ngay not null` cho khỏi đọc về những dòng lịch
          trống người lập bỏ lại.
        */
        lich: {
          select: { ngay: true, loai: true },
          where: { ngay: { not: null } },
          orderBy: { ngay: "asc" },
        },
        /*
          Mã album gắn sẵn trên từng dịch vụ (anh yêu cầu 18/11/2026) — nguồn
          thứ hai của mã, bên cạnh loại buổi trong lịch.

          Chỉ lấy dòng còn gắn được với bảng Dịch vụ. 1.081/6.675 dòng chi tiết
          mang mã KHÔNG còn trong bảng (đo 15/09, xem model ChiTietHopDong),
          những dòng đó `dichVu` là null và không suy ra mã nào — đúng, vì
          không biết chúng từng là dịch vụ gì.
        */
        chiTiet: {
          where: { matBenAppSheet: null },
          select: { dichVu: { select: { maAlbum: true } } },
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

      HAI NGUỒN MÃ, gộp lại rồi bỏ trùng:

        · Mã gắn sẵn trên DỊCH VỤ (anh thêm 18/11/2026) — "BABY TIÊU CHUẨN 1"
          gắn mã Baby, gói Nhà Su gắn NS. Không có nguồn này thì hợp đồng
          Baby hay Nhà Su ra album tên trơn, lọc ở trang quản lý album không
          bao giờ ra.
        · Mã suy từ LOẠI BUỔI trong lịch — nhà gái ra HER, nhà trai ra HIS.

      Không suy từ loại hợp đồng: cùng là hợp đồng CƯỚI mà có nhà chỉ chụp một
      bên, nên lịch nói đúng hơn. Thứ tự trong tên do `ganNhieuMa` xếp theo bộ
      mã, không theo thứ tự gộp ở đây.

      Người bấm nút tạo tay mà tự đặt tên thì KHÔNG đụng vào: họ gõ sẵn mã rồi.
    */
    const ma = tenTuChon
      ? []
      : maTuChon
        ? [...maTuChon]
        : [
            ...new Set([
              /* Mã gắn sẵn trên dịch vụ: Baby, NS, AB… */
              ...hd.chiTiet.map((d) => d.dichVu?.maAlbum ?? null),
              /* Mã suy từ loại buổi: nhà gái ra HER, nhà trai ra HIS. */
              ...hd.lich.map((l) => maAlbumTheoBuoi(l.loai)),
            ].filter((m): m is string => !!m)),
          ];
    const tenAlbum = ma.length > 0 ? ganNhieuMa(tenGoc, ma) : tenGoc;

    /*
      THƯ MỤC DRIVE KHÔNG MANG MÃ — anh chốt 15/11/2026.

      Mã là ký hiệu nội bộ của web, dùng để lọc ở trang quản lý album. Trên
      Drive tiệm xếp theo tên nhà, và cả T11/2026 đang là tên trơn: "Hữu Đức &
      Ngọc Hằng", "Khánh Huy & Mộng Chinh", "Minh Ngọc & Công Khoa". Một thư
      mục "HIS - HER - …" nằm giữa đó là web tự bày ra một nếp thứ hai, chỉ
      web hiểu.

      Bóc mã cả khi người bấm nút TỰ GÕ tên có mã: quy tắc là của Drive, không
      phải của người gõ — họ gõ mã để album web có mã, chứ không phải để thư
      mục có mã.
    */
    const tenThuMuc = tenKhongMa(tenAlbum) || tenAlbum;

    /*
      DRIVE NÀO, THƯ MỤC NÀO — anh yêu cầu 15/11/2026. Xem `noiChuaAlbum.ts`.

      Cưới hỏi giữ nguyên nếp cũ: Drive ảnh cưới, cây "năm / T{tháng chụp}".
      Nhà Su và mảng bé thì sang ổ 5 TB, nằm thẳng trong thư mục có sẵn của
      mảng đó — không dựng thêm cây năm/tháng, vì hai thư mục ấy vốn xếp phẳng.
    */
    const noi = noiChuaAlbum(hd.loaiDV);
    const token = await getUserAccessToken(noi.ketNoi).catch(() => null);
    if (!token) {
      return {
        ok: false,
        loi:
          noi.ketNoi === "kho"
            ? "Chưa kết nối Kho ảnh CRM, hoặc kết nối đã hỏng. Vào Thông tin studio nối lại."
            : "Chưa kết nối Google Drive, hoặc kết nối đã hỏng.",
      };
    }

    /*
      THÁNG NÀO — anh đổi lại 18/11/2026: lấy THÁNG LẬP HỢP ĐỒNG.

      Trước đó web lấy tháng của buổi chụp đầu tiên, với lý do "ảnh xếp theo
      tháng chụp mới đúng nghĩa thư mục T11". Anh bảo không: "đang ở tháng nào
      thì tạo trong folder của tháng đó". Người lập hợp đồng hôm nay muốn mở
      Drive ra thấy thư mục nằm ở tháng này, chứ không phải đi tìm trong một
      tháng nào đó của tương lai.

      Hợp đồng chưa có ngày lập (dữ liệu cũ) thì `namThang` tự lấy hôm nay.
    */
    const { nam, thang } = namThang(hd.ngayDat);

    let idThang: string;
    if (noi.thuMucGoc) {
      const goc = await timThuMuc(token, noi.thuMucGoc);
      if (!goc) {
        /*
          Hai nguyên nhân khác hẳn nhau mà nhìn từ ngoài giống hệt: phiếu cũ
          chưa đủ quyền, hay thư mục bị đổi tên / xoá. Hỏi Google một câu để
          tách ra, vì hai cái cần hai việc khác nhau.

          Đây là chuyện có thật: 18/11/2026 anh lập hợp đồng Baby mà album
          không ra, lý do là phiếu cấp ngày 13/11 vẫn mang quyền cũ.
        */
        const duQuyen = await duQuyenDrive(noi.ketNoi);
        return {
          ok: false,
          loi: duQuyen
            ? `Không thấy thư mục “${noi.thuMucGoc}” trên Kho ảnh CRM. Kiểm tra xem thư mục còn đúng tên đó không.`
            : "Kết nối Kho ảnh CRM chưa đủ quyền (phiếu cũ, cấp trước khi nới quyền). " +
              "Vào trang Quản lý album ảnh, khối “Kho ảnh CRM”, bấm Nối lại rồi lập lại album.",
        };
      }
      /*
        Cây bên ổ kho: "{mảng} / Tháng {n} / {album}", và từ 2027 có thêm cấp
        năm ở giữa. Tên thư mục tháng viết ĐẦY ĐỦ ("Tháng 11") chứ không viết
        tắt như bên Drive ảnh cưới ("T11") — mỗi bên một nếp, chép sai nếp là
        tiệm có hai kiểu tên trong cùng một thư mục.
      */
      const cha = nam >= NAM_CO_CAP_NAM ? await timHoacTao(token, String(nam), goc) : goc;
      idThang = await timHoacTao(token, `Tháng ${thang}`, cha);
    } else {
      /* Drive ảnh cưới: "{năm} / T{tháng}", nếp có sẵn từ đầu. */
      const idNam = await timHoacTao(token, String(nam));
      idThang = await timHoacTao(token, `T${thang}`, idNam);
    }

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
      body: JSON.stringify({ name: tenThuMuc, mimeType: LOAI_THU_MUC, parents: [idThang] }),
    })) as { id: string; name: string };

    /*
      Album web: tạo rồi gắn hợp đồng ngay trong cùng một lượt.

      `allowDownload: true` — anh chốt 14/11/2026 là cho tải ngay. Quyền này
      vốn bật/tắt được bất cứ lúc nào ở cửa sổ Cài đặt (nguyên tắc 60), nên
      mặc định bật chỉ là chọn phía đỡ phải nhớ: album chưa gửi thông báo thì
      chưa ai có link mà tải, còn lúc giao ảnh thì khỏi phải bật thêm bước.
    */
    const album = await createGallery({
      /* Album web mang mã, thư mục Drive thì không — xem chú thích trên. */
      title: tenAlbum,
      clientName: tenAlbum,
      driveFolderId: tao.id,
      allowDownload: true,
    });
    /*
      Thư mục ở Drive kho phải chia sẻ ngược cho tài khoản ảnh cưới NGAY, vì
      album đọc ảnh bằng kết nối đó. Lỗi chia sẻ không được phép làm hỏng cả
      việc tạo — thư mục và album đã có thật rồi; báo lại để người lập chia sẻ
      tay còn hơn ném mất cả hai.
    */
    let canChiaSe: string | null = null;
    if (noi.ketNoi === "kho") {
      try {
        await chiaSeChoDriveChinh(token, tao.id);
      } catch {
        canChiaSe = emailChiaSe();
      }
    }

    await setAccess(album.id, MA_MAC_DINH);
    await prisma.gallery.update({ where: { id: album.id }, data: { hopDongId: hd.id } });

    return {
      ok: true,
      galleryId: album.id,
      slug: album.slug,
      thuMucDrive: tao.id,
      tenThuMuc: tao.name,
      tenAlbum,
      ketNoi: noi.ketNoi,
      canChiaSe,
    };
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) };
  }
}
