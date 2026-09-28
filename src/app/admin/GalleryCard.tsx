"use client";

import Link from "next/link";
import { useState } from "react";
import type { BiaMuc, Gallery, GoiMuc, ListCount, MucXong } from "@/lib/store";
import { MOC_DEM_LUOT_TAI, MOC_GHI_LAN_BAO, MUI_GIO } from "@/lib/constants";
import { refreshGalleryAction } from "./actions";
import { CaiDatDialog } from "./CaiDatDialog";
import { LogKhach } from "./LogKhach";
import { CopyLink } from "./CopyLink";
import { CoverPicker } from "./CoverPicker";
import { TenAlbum } from "./TenAlbum";
import { MenuThe, MucMenuLink } from "./MenuThe";
import { NutLamMoi } from "./NutLamMoi";
import { NutGuiThongBao } from "./NutGuiThongBao";
import { XoaAlbumDialog } from "./XoaAlbumDialog";

function Stat({
  icon,
  value,
  label,
}: {
  icon: "photo" | "folder" | "heart" | "tai";
  value: number;
  label: string;
}) {
  const paths = {
    photo: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6",
    folder: "M3 7h6l2 2h10v10H3z",
    heart:
      "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
    // Mui ten di xuong cham vao mot vach — bieu tuong tai ve ai cung nhan ra.
    tai: "M12 4v11m0 0 4-4m-4 4-4-4M4 19h16",
  };
  const colors = {
    photo: "text-fg-faint",
    folder: "text-fg-faint",
    heart: "text-rose-500",
    tai: "text-fg-faint",
  };

  return (
    <span className="flex items-center gap-1" title={label}>
      <svg
        viewBox="0 0 24 24"
        className={`size-[15px] shrink-0 ${colors[icon]}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={paths[icon]} />
      </svg>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

/**
 * "7/9 17:40" — theo giờ studio, không theo giờ máy đang mở trang (nguyên tắc 35).
 *
 * Ghép từ `formatToParts` chứ không dùng thẳng chuỗi `format()` trả về: bản
 * tiếng Việt xếp giờ lên TRƯỚC ngày ("17:40 7/9"), đọc ngược với cách người ta
 * nói. Ghép tay thì thứ tự do mình quyết, mà múi giờ vẫn do Intl lo.
 */
function lucGon(iso: string): string {
  const phan = new Intl.DateTimeFormat("vi-VN", {
    timeZone: MUI_GIO,
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const lay = (loai: string) => phan.find((p) => p.type === loai)?.value ?? "";

  return `${lay("day")}/${lay("month")} ${lay("hour")}:${lay("minute")}`;
}

/**
 * Dòng "đã gửi thông báo chưa" — nay là một nhãn nhỏ nằm trên ảnh bìa.
 *
 * Studio yêu cầu 07/09/2026: hai mươi bảy album, bấm gửi rải rác cả ngày, rồi
 * không nhớ đã bấm cho nhà nào. Không nhớ thì hoặc bỏ sót một nhà đang chờ,
 * hoặc gửi lại lần hai làm điện thoại họ rung vô cớ.
 *
 * BA trạng thái chứ không phải hai — đây là chỗ dễ làm sai nhất:
 *
 * - Có mốc → nói thẳng đã gửi lúc nào.
 * - Không có mốc, album tạo TỪ mốc bắt đầu ghi trở đi → chắc chắn chưa gửi.
 * - Không có mốc, album tạo TRƯỚC mốc đó → **chưa rõ**. Hồi ấy chưa ghi lại gì
 *   cả, nên "không có dòng nào" không chứng minh được là chưa gửi. Viết đại là
 *   "chưa gửi" thì studio gửi lại cho một nhà đã nhận rồi — đúng cái phiền
 *   đang muốn dẹp. Cùng cách trang thống kê phân biệt lượt xem (nguyên tắc 29).
 *
 * Trả `null` khi chưa có mốc VÀ không máy nào chờ tin: album đó không gửi được
 * cho ai, nói "chưa gửi" chỉ thành một nhãn nhiễu trên hai phần ba số thẻ.
 */
function trangThaiTin(
  baoTinLuc: string | null,
  ngayTao: string,
  soMay: number,
): { chu: string; giaiThich: string; mau: "xong" | "chua" } | null {
  if (baoTinLuc) {
    return {
      chu: `Đã báo tin ${lucGon(baoTinLuc)}`,
      giaiThich:
        "Lần gần nhất bấm nút gửi cho album này, tính theo giờ Việt Nam. Chỉ ghi khi thật sự có máy nhận được.",
      mau: "xong",
    };
  }

  if (soMay === 0) return null;

  if (new Date(ngayTao) >= MOC_GHI_LAN_BAO) {
    return {
      chu: "Chưa gửi thông báo",
      giaiThich: `Có ${soMay} máy đang chờ tin của album này mà chưa lần nào bấm gửi.`,
      mau: "chua",
    };
  }

  return {
    chu: "Chưa rõ đã gửi tin chưa",
    giaiThich:
      "Album tạo trước ngày web bắt đầu ghi lại việc gửi tin, nên không biết chắc. Bấm gửi một lần là từ đó có mốc rõ ràng.",
    mau: "chua",
  };
}

export function GalleryCard({
  gallery,
  counts,
  mucXong,
  biaMuc,
  goiMuc,
  soMayChoTin,
  baoTinLuc,
  quanLy,
}: {
  gallery: Gallery;
  counts: ListCount[];
  /** Các thư mục khách đã báo chọn xong của album này. */
  mucXong: MucXong[];
  /** Ảnh bìa riêng từng thư mục của album này. */
  biaMuc: BiaMuc[];
  /** Gói ảnh đặt riêng cho từng thư mục của album này. */
  goiMuc: GoiMuc[];
  /** Số máy khách đang chờ nhận thông báo của album này. */
  soMayChoTin: number;
  /** Lần cuối bấm "Gửi thông báo" (chuỗi ISO). null = chưa ghi được lần nào. */
  baoTinLuc: string | null;
  /** Người đang xem là quản lý — chỉ họ thấy nút xoá album (xem quyenAlbumNguyHiem). */
  quanLy: boolean;
}) {
  const title = gallery.clientName ?? gallery.title;
  const chuaDongBo = gallery.syncedAt === null;
  const trangThaiBaoTin = trangThaiTin(
    baoTinLuc,
    gallery.createdAt,
    soMayChoTin,
  );

  /*
    Album tạo trước mốc bắt đầu đếm thì cột `luotTai` luôn là 0 dù khách đã tải
    hết từ lâu. So bằng ngày tạo để phân biệt "chưa ai tải" với "hồi đó chưa
    đếm" — cùng cách trang thống kê phân biệt lượt xem (nguyên tắc 29).
  */
  const demDuocLuotTai = new Date(gallery.createdAt) >= MOC_DEM_LUOT_TAI;
  const [moChonBia, setMoChonBia] = useState(false);
  const [moXoa, setMoXoa] = useState(false);
  /* Cửa sổ cài đặt album — mở bằng nút bánh răng ngoài mặt thẻ. */
  const [moCaiDat, setMoCaiDat] = useState(false);
  const [moLog, setMoLog] = useState(false);

  /*
    Thẻ ngoài KHÔNG có `overflow-hidden`: bảng "…" mở xuống dưới, thẻ mà cắt
    phần tràn thì bảng bị xén mất một nửa. Ảnh bìa tự lo phần bo góc và cắt ảnh
    của nó (`overflow-hidden rounded-t-[3px]` ngay trên thẻ Link) nên bỏ ở thẻ
    ngoài không mất gì.
  */
  return (
    <article className="card group relative flex flex-col">
      {/*
        THẺ ALBUM DỰNG THEO KIỂU GUMP — anh yêu cầu 21/09/2026: ảnh bìa to,
        dưới ảnh chỉ còn tên album và một hàng số liệu nhỏ, mọi việc gom vào
        nút "…". Bản trước có thêm hàng bốn nút và dòng "Mã · gói · Cài đặt"
        đứng riêng; hai thứ đó ăn 107px mỗi thẻ, mà 107px đó chính là phần ảnh
        bìa bị cắt cụt — anh nói "ảnh bìa bị hẹp quá" là vì vậy.

        ẢNH BÌA CAO BAO NHIÊU vẫn là thứ quyết định một màn hình thấy được mấy
        thẻ (nguyên tắc 45). `aspect-[3/2]` một mình không kiểm soát được: cột
        càng rộng bìa càng cao (492px rộng ⇒ 328px cao). Nên chặn thêm TRẦN
        tính theo chiều cao màn hình — phần còn lại của thẻ nay chỉ còn 76px:

            2 × (bìa + 76) + 24 (khe) + 20 (lề trên lưới) ≤ chiều cao ô cuộn
            chiều cao ô cuộn = chiều cao màn hình − 267px

        Giải ra: bìa ≤ 50vh − 232px. Lấy 255 để dư 39px — đủ cho hàng số liệu
        vỡ thành hai dòng ở cả hai hàng thẻ mà vẫn không bị cắt. Ở màn 1080 ra
        285px, gấp đôi bản hôm qua (140px).

        Chỉ chặn từ 1536px trở lên: dưới mốc đó cả trang cuộn bình thường, để
        bìa đúng 3:2 cho đẹp. `min-h-36` là sàn cho màn quá thấp.
      */}
      {/*
        Bấm ảnh bìa là đi qua /xem-thu — cửa đó đóng dấu "người trong tiệm đang
        xem thử" (4 tiếng) rồi mới thả vào trang khách, nên những lượt studio
        tự mở không lọt vào nút "Logs" (anh yêu cầu 28/09/2026). Link CHÉP CHO
        KHÁCH vẫn là /g/[slug] sạch — xem CopyLink.
      */}
      <Link
        href={`/xem-thu/${gallery.slug}`}
        title={`Xem thử trang của khách — /g/${gallery.slug} · tạo ngày ${new Date(gallery.createdAt).toLocaleDateString("vi-VN")}`}
        className="relative block aspect-[3/2] overflow-hidden rounded-t-[3px] bg-bg-soft 2xl:max-h-[calc(50vh-255px)] 2xl:min-h-36"
      >
        {gallery.coverFileId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/img/${gallery.coverFileId}?w=960`}
            alt={title}
            loading="lazy"
            className="size-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center px-4 text-center">
            <p className="text-xs text-fg-faint">
              {chuaDongBo
                ? "Đang dựng ảnh bìa… tải lại trang sau ít phút"
                : "Thư mục chưa có ảnh"}
            </p>
          </div>
        )}

        {!gallery.allowDownload && (
          <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] tracking-wider text-white uppercase backdrop-blur">
            Không cho tải
          </span>
        )}

        {/*
          Ba nhãn trên ảnh bìa — nền đen trong mờ để đọc được trên ảnh sáng.
          Nằm đè lên ảnh thì KHÔNG tốn một ly chiều cao nào của thẻ, đó là cách
          duy nhất giữ đủ thông tin mà ảnh bìa vẫn to.
        */}
        {trangThaiBaoTin && (
          <span
            title={trangThaiBaoTin.giaiThich}
            className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur"
          >
            {/*
              Nhãn nào cũng nền đen trong mờ, chỉ khác cái chấm: vàng là chưa
              nhắn khách, xanh là đã nhắn. Bản đầu để nguyên miếng vàng đậm cho
              "chưa gửi", nhìn trên lưới thì mấy miếng vàng nhảy hẳn ra khỏi
              ảnh — mà đây là lời nhắc, không phải báo động.
            */}
            <span
              aria-hidden
              className={`size-1.5 shrink-0 rounded-full ${
                trangThaiBaoTin.mau === "xong"
                  ? "bg-emerald-400"
                  : "bg-amber-400"
              }`}
            />
            {trangThaiBaoTin.chu}
          </span>
        )}

        {/*
          Nhãn "khách đã chọn xong": mỗi thư mục khách báo xong là MỘT nhãn
          riêng — album năm sáu thư mục thì studio phải biết khách vừa xong cái
          nào. Nhãn mang hẳn chữ "Đã chọn xong" chứ không chỉ tên thư mục: bản
          cũ ghi mỗi "file gốc", ý nghĩa nằm trong tooltip mà trên điện thoại
          thì không rê chuột được.
        */}
        {mucXong.length > 0 && (
          <div className="absolute right-2 bottom-2 left-2 flex flex-wrap items-center gap-1.5">
            {mucXong.map((m) => (
              <span
                key={m.albumId}
                title={`Khách báo xong thư mục "${m.tenMuc}" lúc ${new Date(
                  m.xongLuc,
                ).toLocaleString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                })}`}
                className="flex max-w-full items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur"
              >
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-emerald-400"
                />
                <span className="truncate">
                  {gallery.albumCount > 1
                    ? `Xong · ${m.tenMuc}`
                    : "Đã chọn xong"}
                </span>
              </span>
            ))}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {/*
          Tên chiếm hết phần còn lại, hai nút đứng DÍNH NHAU ở mép phải — anh
          yêu cầu 21/09/2026 ("cho bánh răng nằm sát bên dấu 3 chấm"). Bản đầu
          để cả ba cùng một hàng `justify-between`, tên ngắn thì bánh răng bị
          bỏ lại giữa thẻ còn ba chấm dính mép phải, nhìn như hai thứ rời nhau.
        */}
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <TenAlbum
              galleryId={gallery.id}
              slug={gallery.slug}
              ten={title}
              tenThuMuc={gallery.title}
              lop="truncate font-display text-lg leading-snug transition group-hover:text-accent"
            />
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {/*
            Bánh răng đứng NGOÀI mặt thẻ, cạnh nút "…" — anh yêu cầu
            21/09/2026: "nút cài đặt album đang bất tiện". Trước đó nó là một
            mục trong bảng "…" và bấm vào thì bốn ô cài đặt xổ ngay trong thẻ:
            hai cú bấm mới tới, mà tới rồi thì thẻ phình cao gấp đôi, đẩy cả
            hàng album bên dưới chạy xuống. Nay một cú bấm, mở cửa sổ riêng,
            lưới album đứng yên.
          */}
            {/*
              Nút "Logs" (anh yêu cầu 28/09/2026): xem khách đã mở thư mục nào,
              lần đầu lúc mấy giờ. Để NGOÀI mặt thẻ cạnh bánh răng chứ không
              nhét vào bảng "…" — up ảnh xong là studio muốn ngó ngay, mà thứ
              ngó thường xuyên thì đừng bắt bấm hai lần mới tới.
            */}
            <button
              type="button"
              onClick={() => setMoLog(true)}
              title={`Khách đã mở thư mục nào của "${title}"`}
              className="grid h-11 shrink-0 place-items-center rounded-full px-2 text-[11px] font-medium tracking-wide text-fg-faint uppercase transition hover:bg-bg-soft hover:text-fg sm:h-8"
            >
              Logs
            </button>

            <button
              type="button"
              onClick={() => setMoCaiDat(true)}
              title={`Cài đặt album "${title}" — mã chọn ảnh, lời nhắn, hạn giữ ảnh, gói ảnh`}
              /* 44px trên điện thoại, 32px từ 640px trở lên — cùng luật với `.btn-gon`. */
              className="grid size-11 shrink-0 place-items-center rounded-full text-fg-faint transition hover:bg-bg-soft hover:text-fg sm:size-8"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
              </svg>
              <span className="sr-only">Cài đặt album</span>
            </button>

            <MenuThe ten={title}>
              <CopyLink
                path={`/g/${gallery.slug}`}
                code={gallery.accessCode}
                expiresAt={gallery.expiresAt}
                hien="tin"
                lop="muc-menu"
              />

              <MucMenuLink href={`/admin/${gallery.slug}`}>
                Ảnh khách chọn
              </MucMenuLink>

              <form action={refreshGalleryAction}>
                <input
                  type="hidden"
                  name="folderId"
                  value={gallery.driveFolderId}
                />
                <input type="hidden" name="galleryId" value={gallery.id} />
                {/* Nút nằm trong component riêng để đọc được trạng thái của form. */}
                <NutLamMoi lop="muc-menu" />
              </form>

              {/*
              Nút gửi tin là việc chạm tới điện thoại khách, tách bạch với "Làm
              mới": một cái chỉ đụng số liệu trong nhà, một cái khách nghe
              chuông thật. Bấm vào vẫn có hộp hỏi lại như cũ.
            */}
              <NutGuiThongBao
                galleryId={gallery.id}
                soMay={soMayChoTin}
                lop="muc-menu"
              />

              <span aria-hidden className="my-1 block h-px bg-line" />

              <CopyLink
                path={`/g/${gallery.slug}`}
                code={gallery.accessCode}
                expiresAt={gallery.expiresAt}
                hien="link"
                lop="muc-menu"
              />

              <button
                type="button"
                className="muc-menu"
                onClick={() => setMoChonBia(true)}
              >
                Đổi ảnh bìa
              </button>

              {/* Chỉ quản lý được xoá album — xoá nhầm là mất cả lựa chọn ảnh của khách. */}
              {quanLy && (
                <button
                  type="button"
                  className="muc-menu text-red-700 hover:bg-red-50"
                  onClick={() => setMoXoa(true)}
                >
                  Xoá album
                </button>
              )}
            </MenuThe>
          </div>
        </div>

        {/*
          Hàng số liệu: bên trái là mấy con số của album, bên phải là mã chọn
          ảnh và gói — hai thứ studio hay liếc nhất. Cùng một hàng nên không
          tốn thêm chiều cao; chật quá thì `flex-wrap` tự cho xuống dòng.
        */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          <Stat icon="photo" value={gallery.photoCount} label="Số ảnh" />
          <Stat
            icon="folder"
            value={gallery.albumCount}
            label={
              gallery.subfolders.length > 0
                ? `Thư mục con: ${gallery.subfolders.join(" · ")}`
                : "Số thư mục con"
            }
          />
          {counts.map((c) => (
            <Stat
              key={c.listId}
              icon={c.icon}
              value={c.count}
              label={`${c.name} khách đã chọn`}
            />
          ))}

          {/*
            So tam khach da tai ve. Chi hien khi album CHO TAI va tao tu moc bat
            dau dem tro di — so 0 o hai truong hop kia khong co nghia "khach
            chua tai" (xem MOC_DEM_LUOT_TAI).
          */}
          {gallery.allowDownload && demDuocLuotTai && (
            <Stat
              icon="tai"
              value={gallery.luotTai}
              label={
                gallery.taiLanCuoi
                  ? `Khách đã tải ${gallery.luotTai} tấm · lần cuối ${new Date(
                      gallery.taiLanCuoi,
                    ).toLocaleString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    })}`
                  : "Khách chưa tải tấm nào"
              }
            />
          )}

          <span className="ml-auto truncate text-fg-faint">
            Mã{" "}
            <span className="font-medium text-fg tabular-nums">
              {gallery.accessCode ?? "—"}
            </span>
            {" · "}
            {gallery.soAnhTrongGoi === null
              ? "chưa đặt gói"
              : gallery.soAnhTrongGoi === 0
                ? "gói chỉ lấy file"
                : `gói ${gallery.soAnhTrongGoi} ảnh`}
          </span>
        </div>
      </div>

      {moLog && (
        <LogKhach galleryId={gallery.id} ten={title} baoTinLuc={baoTinLuc} dong={() => setMoLog(false)} />
      )}

      {moCaiDat && (
        <CaiDatDialog
          galleryId={gallery.id}
          ten={title}
          accessCode={gallery.accessCode}
          message={gallery.message}
          createdAt={gallery.createdAt}
          expiresAt={gallery.expiresAt}
          driveFolderId={gallery.driveFolderId}
          soAnhTrongGoi={gallery.soAnhTrongGoi}
          giaAnhThem={gallery.giaAnhThem}
          goiMuc={goiMuc}
          onDong={() => setMoCaiDat(false)}
        />
      )}

      {moXoa && quanLy && (
        <XoaAlbumDialog
          galleryId={gallery.id}
          ten={title}
          onDong={() => setMoXoa(false)}
        />
      )}

      {moChonBia && (
        <CoverPicker
          galleryId={gallery.id}
          folderId={gallery.driveFolderId}
          title={title}
          coverFileId={gallery.coverFileId}
          coverPinned={gallery.coverPinned}
          biaMuc={biaMuc}
          onClose={() => setMoChonBia(false)}
        />
      )}
    </article>
  );
}
