"use client";

import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { boDau as bo_dau } from "@/lib/constants";
import { MA_ALBUM, type MaAlbum } from "@/lib/maAlbum";
import type { BiaMuc, Gallery, GoiMuc, ListCount, MucXong } from "@/lib/store";
import { GalleryCard } from "./GalleryCard";
import { LocTheoThang, hopMoc, type MocLoc } from "./LocTheoThang";

/*
  Bo ma nhan lay tu MOT nguon dung chung voi o tao link (src/lib/maAlbum.ts).

  Truoc day o day co bang rieng, gõ tay. Them ma moi thi phai nho sua ca hai
  cho — quen mot cho la nhan vien dat ten bang ma moi ma loc lai khong ra.
*/
/*
  Bộ mã dùng cho hàng nút lọc. Từ 19/11/2026 nó đến từ bảng `MaAlbum` qua
  prop `boMa`; dòng dưới chỉ còn là mặc định khi bảng rỗng.
*/
const NHAN_MAC_DINH = MA_ALBUM.map((m) => m.ma);

/*
  Lọc theo tiến độ chọn ảnh (anh yêu cầu 17/09/2026). HAI nhóm: bản đầu có
  thêm nút "Xong một phần", anh bảo bỏ cùng ngày. Khách báo xong DÙ CHỈ MỘT
  thư mục là album tính "Đã chọn xong" (anh chốt 17/09) — khớp với nhãn xanh
  trên thẻ: thẻ có nhãn nào thì nằm ở nút đó. Muốn biết còn thư mục nào chưa
  xong thì đọc nhãn trên thẻ. Đo lúc làm: 12/49 album mới xong một phần.

  Tính theo bảng MucXong (khách bấm báo xong), không theo số tim: thả tim rồi
  chưa báo thì khách vẫn đang chọn.
*/
type TienDo = "chua" | "xong";
const TIEN_DO: { key: TienDo; ten: string }[] = [
  { key: "chua", ten: "Chưa chọn xong" },
  { key: "xong", ten: "Đã chọn xong" },
];

function tienDoCua(g: Gallery, mucXong: MucXong[]): TienDo {
  return mucXong.some((m) => m.galleryId === g.id) ? "xong" : "chua";
}

/** Hien bao nhieu the truoc khi phai bam "xem them". */
const TRANG = 24;

/** Chuoi de doi chieu cho mot album: ten khach, ten thu muc goc, duong dan, ten cac thu muc con. */
function kho_chu(g: Gallery): string {
  return bo_dau(
    [g.clientName ?? "", g.title, g.slug, ...g.subfolders].join(" "),
  );
}

/**
 * Cac tu roi trong TEN album — chi dung cho viec loc theo ma nhan.
 *
 * Co tinh khong lay ten thu muc con: nhieu album co thu muc "file hoàn thiện HC",
 * neu tinh ca do thi bam ma "HC" se ra ca nhung album khong he mang ma do.
 * Rieng o go chu van tim ca trong ten thu muc con, vi do la tim tu do.
 */
function cac_tu(g: Gallery): string[] {
  return bo_dau([g.clientName ?? "", g.title].join(" "))
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function AlbumList({
  galleries,
  counts,
  mucXong,
  biaMuc,
  goiMuc,
  soMayChoTin,
  baoTinLuc,
  thongBao,
  boMa,
  duocXoa,
  heThong,
}: {
  galleries: Gallery[];
  counts: ListCount[];
  /** Các thư mục khách đã báo chọn xong, của mọi album. */
  mucXong: MucXong[];
  /** Ảnh bìa riêng của từng thư mục, của mọi album. */
  biaMuc: BiaMuc[];
  goiMuc: GoiMuc[];
  /** So may dang cho nhan thong bao, tra theo id album. */
  soMayChoTin: Record<string, number>;
  /**
   * Lan cuoi bam "Gui thong bao" cua tung album (chuoi ISO), tra theo id.
   * Khong co khoa nghia la chua ghi duoc lan gui nao — xem GalleryCard de biet
   * vi sao khong the doc thang do la "chua gui bao gio".
   */
  baoTinLuc: Record<string, string>;
  /**
   * Bộ mã album cho hàng nút lọc, đọc từ bảng `MaAlbum` (19/11/2026).
   * Thiếu thì dùng bộ cứng — hàng lọc không bao giờ được phép rỗng.
   */
  boMa?: readonly MaAlbum[];
  duocXoa: boolean;
  /**
   * Khung "Thông báo", dựng sẵn ở máy chủ rồi truyền xuống.
   *
   * Nhận thành phần đã dựng chứ không nhận dữ liệu thô: nó đọc thẳng database,
   * mà file này chạy ở máy khách — nhập vào đây là kéo Prisma sang phía khách
   * và Turbopack đổ ngay lúc build (nguyên tắc 43).
   */
  thongBao: ReactNode;
  /** Drive, sao lưu, kho ảnh — chỉ dựng ở màn từ 1536px (xem ChiManLon ở page.tsx). */
  heThong: ReactNode;
}) {
  const [tuKhoa, setTuKhoa] = useState("");
  const [nhan, setNhan] = useState<string | null>(null);
  const [moc, setMoc] = useState<MocLoc>(null);
  const [tienDo, setTienDo] = useState<TienDo | null>(null);
  const [hienBaoNhieu, setHienBaoNhieu] = useState(TRANG);

  // Go nhanh tren danh sach dai thi de giat; deferred cho phan go muot truoc,
  // danh sach cap nhat sau mot nhip.
  const tuKhoaCho = useDeferredValue(tuKhoa);

  const chiMuc = useMemo(
    () =>
      galleries.map((g) => ({
        g,
        chu: kho_chu(g),
        tu: cac_tu(g),
        tienDo: tienDoCua(g, mucXong),
      })),
    [galleries, mucXong],
  );

  const ngayTao = useMemo(() => galleries.map((g) => g.createdAt), [galleries]);

  // Chi hien nhung ma nhan that su co album, kem so luong.
  const nhanCoDung = useMemo(
    () =>
      (boMa ? boMa.map((m) => m.ma) : NHAN_MAC_DINH).map((ma) => {
        const key = bo_dau(ma);
        return {
          ma,
          key,
          so: chiMuc.filter((m) => m.tu.some((t) => t.startsWith(key))).length,
        };
      }).filter((n) => n.so > 0),
    /* `boMa` nằm trong danh sách phụ thuộc: thêm một mã ở trang Quản lý dịch
       vụ mà quên nó thì hàng lọc không hiện mã mới cho tới lần tải lại sau. */
    [chiMuc, boMa],
  );

  const ketQua = useMemo(() => {
    let ds = chiMuc;

    if (moc) ds = ds.filter((m) => hopMoc(m.g.createdAt, moc));

    if (tienDo) ds = ds.filter((m) => m.tienDo === tienDo);

    if (nhan) {
      // So khop theo dau tu, khong phai chuoi con: "hc" khop "hc Ngọc Thơ"
      // nhung khong khop "thach" — tranh ket qua thua.
      ds = ds.filter((m) => m.tu.some((t) => t.startsWith(nhan)));
    }

    const q = bo_dau(tuKhoaCho.trim());
    if (q) {
      // Moi tu trong o tim deu phai co mat, khong cần đúng thứ tự.
      const phan = q.split(/\s+/).filter(Boolean);
      ds = ds.filter((m) => phan.every((p) => m.chu.includes(p)));
    }

    return ds.map((m) => m.g);
  }, [chiMuc, moc, nhan, tienDo, tuKhoaCho]);

  const countsOf = (galleryId: string) =>
    counts.filter((c) => c.galleryId === galleryId);
  const dangLoc =
    Boolean(nhan) ||
    Boolean(moc) ||
    Boolean(tienDo) ||
    tuKhoa.trim().length > 0;

  const boHetLoc = () => {
    setNhan(null);
    setTienDo(null);
    setTuKhoa("");
    doiMoc(null);
  };

  const doiMoc = (m: MocLoc) => {
    setMoc(m);
    setHienBaoNhieu(TRANG);
  };

  /*
    Cây lọc theo tháng VÀ khung thông báo đứng chung MỘT CỘT RIÊNG bên trái.

    Trang này vốn chia hai cột: danh sách album bên trái, ô "Tạo link mới" bên
    phải. Trên màn hình rộng, hai cột đó dồn về giữa và chừa một dải trống dài
    dọc mép trái — đúng chỗ anh chỉ. Khung thông báo dọn sang đây ngày
    07/09/2026 theo yêu cầu studio; trước đó nó nằm dưới ô "Tạo link mới".

    CHỈ thành cột riêng từ 1536px trở lên, không phải 1024px. Cột rộng 17rem,
    cộng khoảng cách là 292px lấy thẳng từ phần dành cho thẻ album. Đo trên màn
    1024px: mỗi thẻ tụt từ 306px xuống còn 182px — chật tới mức mã chọn ảnh và
    mấy hàng "Hạn giữ ảnh", "Gói ảnh" tràn dòng hết. Từ 1536px thì thẻ vẫn còn
    trên 290px, gần như không đổi, nên đó mới là chỗ đặt được.

    Dưới mốc đó cột này nằm NGANG phía trên danh sách, cây lọc và khung thông
    báo chia đôi hàng, và cả dải tự cuộn khi cao quá 18rem — không thì một hôm
    có mười thông báo là thẻ album bị đẩy khuất hết. Dưới 1536px trang vẫn cuộn
    bình thường như cũ, chỉ từ 1536px mới khoá chiều cao lại.
  */
  return (
    <div className="grid items-start gap-5 2xl:h-full 2xl:min-h-0 2xl:grid-cols-[19rem_minmax(0,1fr)] 2xl:items-stretch">
      <aside className="grid max-h-72 content-start gap-4 overflow-y-auto sm:grid-cols-2 2xl:h-full 2xl:max-h-none 2xl:min-h-0 2xl:grid-cols-1">
        <div className="hidden min-w-0 2xl:block">{heThong}</div>
        <LocTheoThang ngayTao={ngayTao} moc={moc} doiMoc={doiMoc} />
        {/*
          Bọc trong một thẻ chứ không thả `{thongBao}` trần: hai thẻ con tĩnh
          của `<aside>` biên dịch thành một MẢNG, mà phần tử dựng sẵn từ trang
          cha rơi vào vị trí mảng thì React đòi `key` — cảnh báo hiện thật trong
          console lúc chạy thử.
        */}
        <div className="min-w-0">{thongBao}</div>
      </aside>

      <div className="min-w-0 2xl:flex 2xl:min-h-0 2xl:flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="eyebrow">
            Album đã tạo ·{" "}
            {dangLoc
              ? `${ketQua.length}/${galleries.length}`
              : galleries.length}
          </h2>
        </div>

        <div className="relative mt-3">
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-fg-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={tuKhoa}
            onChange={(e) => {
              setTuKhoa(e.target.value);
              setHienBaoNhieu(TRANG);
            }}
            placeholder="Tìm theo tên cô dâu chú rể, hoặc mã HC, ĐH…"
            aria-label="Tìm album"
            className="input pl-10"
          />
          {tuKhoa && (
            <button
              type="button"
              onClick={() => setTuKhoa("")}
              aria-label="Xoá ô tìm"
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-fg-faint transition hover:bg-bg-soft hover:text-fg"
            >
              ✕
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {TIEN_DO.map((t) => {
            const dang = tienDo === t.key;
            const so = chiMuc.filter((m) => m.tienDo === t.key).length;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={dang}
                onClick={() => {
                  setTienDo(dang ? null : t.key);
                  setHienBaoNhieu(TRANG);
                }}
                className={`flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs tracking-wide transition ${
                  dang
                    ? "border-transparent bg-fg text-bg"
                    : "border-line-strong bg-bg-raised text-fg-muted hover:border-accent hover:text-fg"
                }`}
              >
                <span
                  aria-hidden
                  className={`size-1.5 rounded-full ${
                    t.key === "xong" ? "bg-emerald-500" : "bg-fg-faint"
                  }`}
                />
                {t.ten} <span className="opacity-60">{so}</span>
              </button>
            );
          })}
          {nhanCoDung.length > 0 && (
            <span aria-hidden className="mx-1 h-5 w-px bg-line-strong" />
          )}
          {nhanCoDung.map((n) => {
            const dang = nhan === n.key;
            return (
              <button
                key={n.ma}
                type="button"
                onClick={() => {
                  setNhan(dang ? null : n.key);
                  setHienBaoNhieu(TRANG);
                }}
                className={`min-h-8 rounded-full border px-3 text-xs tracking-wide transition ${
                  dang
                    ? "border-transparent bg-fg text-bg"
                    : "border-line-strong bg-bg-raised text-fg-muted hover:border-accent hover:text-fg"
                }`}
              >
                {n.ma} <span className="opacity-60">{n.so}</span>
              </button>
            );
          })}
          {dangLoc && (
            <button
              type="button"
              onClick={boHetLoc}
              className="min-h-8 px-2 text-xs text-fg-faint underline underline-offset-2 hover:text-accent"
            >
              bỏ lọc
            </button>
          )}
        </div>

        {/*
          ĐÂY là ô cuộn duy nhất của trang từ 1536px trở lên.

          Ô tìm và hàng mã lọc nằm NGOÀI nó: chúng là công cụ để lọc lưới bên
          dưới, cuộn mất công cụ đi trong lúc đang xem kết quả thì phải cuộn
          ngược lên mới sửa được từ khoá.

          `pr-1` chừa chỗ cho thanh cuộn khỏi đè lên mép thẻ; `pb-2` để hàng
          thẻ cuối không dính sát đáy.
        */}
        <div className="2xl:min-h-0 2xl:flex-1 2xl:overflow-y-auto 2xl:pr-1 2xl:pb-2">
          {ketQua.length === 0 ? (
            <div className="mt-10 text-center">
              <p className="font-display text-2xl">Không tìm thấy album nào</p>
              <p className="mt-2 text-sm text-fg-muted">
                Thử gõ ít chữ hơn, bỏ mã lọc hay nút tiến độ, hoặc chọn tháng
                khác. Ô tìm không cần gõ dấu.
              </p>
              {dangLoc && (
                <button type="button" onClick={boHetLoc} className="btn mt-5">
                  Bỏ hết bộ lọc
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {ketQua.slice(0, hienBaoNhieu).map((g) => (
                  <GalleryCard
                    key={g.id}
                    gallery={g}
                    counts={countsOf(g.id)}
                    mucXong={mucXong.filter((m) => m.galleryId === g.id)}
                    biaMuc={biaMuc.filter((b) => b.galleryId === g.id)}
                    goiMuc={goiMuc.filter((x) => x.galleryId === g.id)}
                    soMayChoTin={soMayChoTin[g.id] ?? 0}
                    baoTinLuc={baoTinLuc[g.id] ?? null}
                    duocXoa={duocXoa}
                  />
                ))}
              </div>

              {ketQua.length > hienBaoNhieu && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setHienBaoNhieu((n) => n + TRANG)}
                    className="btn"
                  >
                    Xem thêm {ketQua.length - hienBaoNhieu} album
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
