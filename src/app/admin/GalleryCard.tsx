"use client";

import Link from "next/link";
import { useState } from "react";
import type { BiaMuc, Gallery, ListCount, MucXong } from "@/lib/store";
import { MOC_DEM_LUOT_TAI, MOC_GHI_LAN_BAO, MUI_GIO } from "@/lib/constants";
import { refreshGalleryAction } from "./actions";
import { AccessControl } from "./AccessControl";
import { CopyLink } from "./CopyLink";
import { CoverPicker } from "./CoverPicker";
import { LoiNhan } from "./LoiNhan";
import { TenAlbum } from "./TenAlbum";
import { GoiAnh } from "./GoiAnh";
import { NutLamMoi } from "./NutLamMoi";
import { NutGuiThongBao } from "./NutGuiThongBao";
import { AnhTieuBieu } from "./AnhTieuBieu";
import { ThoiHan } from "./ThoiHan";
import { XoaAlbumDialog } from "./XoaAlbumDialog";

function Stat({
  icon,
  value,
  label,
}: {
  icon: "photo" | "folder" | "heart" | "check" | "tai";
  value: number;
  label: string;
}) {
  const paths = {
    photo: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6",
    folder: "M3 7h6l2 2h10v10H3z",
    heart:
      "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
    check: "M20 6.5 9.2 17.3 4 12.1",
    // Mui ten di xuong cham vao mot vach — bieu tuong tai ve ai cung nhan ra.
    tai: "M12 4v11m0 0 4-4m-4 4-4-4M4 19h16",
  };
  const colors = {
    photo: "text-fg-faint",
    folder: "text-fg-faint",
    heart: "text-rose-500",
    check: "text-accent",
    tai: "text-fg-faint",
  };

  return (
    <span className="flex items-center gap-1.5" title={label}>
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

  const lay = (loai: string) =>
    phan.find((p) => p.type === loai)?.value ?? "";

  return `${lay("day")}/${lay("month")} ${lay("hour")}:${lay("minute")}`;
}

/**
 * Dòng "đã gửi thông báo chưa" dưới hàng nút.
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
 * cho ai, nói "chưa gửi" chỉ thành một dòng nhiễu trên hai phần ba số thẻ.
 */
function trangThaiTin(
  baoTinLuc: string | null,
  ngayTao: string,
  soMay: number,
): { chu: string; giaiThich: string; mau: "xong" | "chua" } | null {
  if (baoTinLuc) {
    return {
      chu: `Đã gửi thông báo · ${lucGon(baoTinLuc)}`,
      giaiThich:
        "Lần gần nhất bấm nút gửi cho album này, tính theo giờ Việt Nam. Chỉ ghi khi thật sự có máy nhận được.",
      mau: "xong",
    };
  }

  if (soMay === 0) return null;

  if (new Date(ngayTao) >= MOC_GHI_LAN_BAO) {
    return {
      chu: "Chưa gửi thông báo lần nào",
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
  soMayChoTin,
  baoTinLuc,
}: {
  gallery: Gallery;
  counts: ListCount[];
  /** Các thư mục khách đã báo chọn xong của album này. */
  mucXong: MucXong[];
  /** Ảnh bìa riêng từng thư mục của album này. */
  biaMuc: BiaMuc[];
  /** Số máy khách đang chờ nhận thông báo của album này. */
  soMayChoTin: number;
  /** Lần cuối bấm "Gửi thông báo" (chuỗi ISO). null = chưa ghi được lần nào. */
  baoTinLuc: string | null;
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

  return (
    <article className="card group relative flex flex-col overflow-hidden">
      <Link
        href={`/g/${gallery.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-bg-soft"
      >
        {gallery.coverFileId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/img/${gallery.coverFileId}?w=640`}
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
      </Link>

      {/* Nam ngoai the Link o tren de bam khong bi nhay sang trang khach. */}
      <button
        type="button"
        onClick={() => setMoChonBia(true)}
        title="Đổi ảnh bìa"
        className="absolute top-2 right-2 flex min-h-8 items-center gap-1.5 rounded-full bg-black/55 px-3 text-xs text-white backdrop-blur transition hover:bg-black/75"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[14px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6" />
        </svg>
        Đổi bìa
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <TenAlbum
            galleryId={gallery.id}
            slug={gallery.slug}
            ten={title}
            tenThuMuc={gallery.title}
          />

          {/*
            Mỗi thư mục khách báo xong là một nhãn riêng. Trước đây chỉ có một
            nhãn "Đã chọn xong" cho cả album, nên album năm sáu thư mục thì
            studio không biết khách mới xong cái nào — mà đó lại chính là thứ
            cần biết để bắt tay làm.
          */}
          {mucXong.length > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
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
                  className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                >
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-emerald-500"
                  />
                  {/*
                    Nhan PHAI mang chu "Da chon xong", khong chi ten thu muc.

                    Truoc day nhan chi ghi "file gốc" — y nghia nam trong
                    tooltip, phai RE CHUOT moi thay. Tren dien thoai khong re
                    duoc, ma day lai la thu studio can liec mot cai la biet:
                    nha nao xong roi, san sang giao in.

                    Album mot thu muc thi bo ten di: da biet la album nao roi,
                    them ten thu muc chi lam nhan dai ra ma khong noi them gi.
                    Album nhieu thu muc thi ten la phan quan trong nhat — no
                    tra loi "xong CAI NAO trong tam cai".
                  */}
                  <span className="max-w-[12rem] truncate">
                    {gallery.albumCount > 1
                      ? `Xong · ${m.tenMuc}`
                      : "Đã chọn xong"}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
          <Stat icon="photo" value={gallery.photoCount} label="Số ảnh" />
          <Stat
            icon="folder"
            value={gallery.albumCount}
            label="Số thư mục con"
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
            So tam khach da tai ve.

            Chi hien khi album CHO TAI: album da tat quyen tai thi con so luon
            bang 0, hien ra chi thanh mot o rong lam nhieu hang so lieu.

            Album tao truoc mốc bắt đầu đếm cũng giấu đi thay vì hiện số 0 —
            0 ở đó không có nghĩa "khách chưa tải" mà là "hồi đó chưa đếm", mà
            studio nhìn số 0 thì đâu biết phân biệt (xem MOC_DEM_LUOT_TAI).
          */}
          {gallery.allowDownload && demDuocLuotTai && (
            <Stat
              icon="tai"
              value={gallery.luotTai}
              label={
                gallery.taiLanCuoi
                  ? `Khách đã tải ${gallery.luotTai} tấm · lần cuối ${new Date(
                      gallery.taiLanCuoi
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
        </div>

        {gallery.subfolders.length > 0 && (
          <p className="mt-2 line-clamp-2 text-xs text-fg-faint">
            {gallery.subfolders.join(" · ")}
          </p>
        )}

        {/*
          Bon dong cai dat gop vao mot khung, cung do rong nhan (w-24 o tung
          component con) de thang cot — truoc day moi thu tu them mot dong
          rieng voi mt-2 cua rieng no, xep chong len nhau khong thang hang,
          nhin nhu mot danh sach roi rac thay vi mot bang cai dat.
        */}
        <div className="mt-3 divide-y divide-line rounded-md border border-line px-3">
          <AccessControl galleryId={gallery.id} code={gallery.accessCode} />
          <LoiNhan galleryId={gallery.id} message={gallery.message} />
          <ThoiHan
            galleryId={gallery.id}
            createdAt={gallery.createdAt}
            expiresAt={gallery.expiresAt}
          />
          <GoiAnh
            galleryId={gallery.id}
            soAnhTrongGoi={gallery.soAnhTrongGoi}
            giaAnhThem={gallery.giaAnhThem}
          />
          <AnhTieuBieu
            galleryId={gallery.id}
            featured={gallery.featured}
            khuHienTai={gallery.khuGioiThieu}
            coTheHien={gallery.coverFileId !== null}
          />
        </div>

        <p className="mt-3 truncate text-xs text-fg-faint">
          /g/{gallery.slug} ·{" "}
          {new Date(gallery.createdAt).toLocaleDateString("vi-VN")}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <CopyLink
            path={`/g/${gallery.slug}`}
            code={gallery.accessCode}
            expiresAt={gallery.expiresAt}
          />

          <Link href={`/admin/${gallery.slug}`} className="btn">
            Ảnh khách chọn
          </Link>

          <form action={refreshGalleryAction}>
            <input
              type="hidden"
              name="folderId"
              value={gallery.driveFolderId}
            />
            <input type="hidden" name="galleryId" value={gallery.id} />
            {/* Nút nằm trong component riêng để đọc được trạng thái của form. */}
            <NutLamMoi />
          </form>

          {/*
            Nút gửi tin đứng NGAY CẠNH nút "Làm mới" nhưng là hai nút tách bạch.
            Đặt cạnh nhau vì hai việc thường đi liền: đọc lại Drive xong, thấy
            ảnh đã lên đủ thì mới nhắn khách. Tách ra vì hậu quả khác hẳn nhau —
            một cái chỉ đụng số liệu trong nhà, một cái chạm tới điện thoại khách.
          */}
          <NutGuiThongBao galleryId={gallery.id} soMay={soMayChoTin} />

          <button
            type="button"
            onClick={() => setMoXoa(true)}
            title={`Xoá album "${title}"`}
            className="btn btn-danger ml-auto"
          >
            Xoá
          </button>
        </div>

        {trangThaiBaoTin && (
          <p
            className={`mt-2 text-[11px] leading-relaxed ${
              trangThaiBaoTin.mau === "xong" ? "text-accent" : "text-fg-faint"
            }`}
            title={trangThaiBaoTin.giaiThich}
          >
            {trangThaiBaoTin.chu}
          </p>
        )}
      </div>

      {moXoa && (
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
