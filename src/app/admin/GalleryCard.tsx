"use client";

import Link from "next/link";
import { useState } from "react";
import type { BiaMuc, Gallery, GoiMuc, ListCount, MucXong } from "@/lib/store";
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
import { ThoiHan } from "./ThoiHan";
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
    <span className="flex items-center gap-1.5" title={label}>
      <svg
        viewBox="0 0 24 24"
        className={`size-[17px] shrink-0 ${colors[icon]}`}
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
  /*
    Khối cài đặt thu gọn mặc định (17/09/2026). Năm dòng cài đặt đứng sẵn trên
    mọi thẻ làm lưới dài và rối; anh muốn lưới album thoáng như Gump. Dòng tóm
    tắt ngay trên nút vẫn cho thấy mã và gói — hai thứ hay cần liếc nhất.
  */
  const [moCaiDat, setMoCaiDat] = useState(false);

  return (
    <article className="card group relative flex flex-col overflow-hidden">
      {/*
        Anh bia CAO BAO NHIEU la thu quyet dinh mot man hinh thay duoc may the.

        Anh yeu cau 21/09/2026: mo /admin la phai thay tron SAU album dau, truoc
        do hang thu hai bi o cuon cat ngang. Do tren man 1920x1080: o cuon cao
        813px, moi the 682px — hai hang can 1388px, thua gap ruoi.

        `aspect-[3/2]` mot minh khong kiem soat duoc chieu cao: cot cang rong
        anh bia cang cao (492px rong => 328px cao). Nen chan them TRAN chieu cao
        tinh theo chinh chieu cao man hinh — phan con lai cua the (chu, so lieu,
        hang cai dat, hang nut) do duoc la 222px, nen:
            2 x (bia + 222) + 24 (khe) + 20 (le tren luoi) <= chieu cao o cuon
        Chieu cao o cuon = chieu cao man hinh - 267px (dau trang + o tim + hang
        loc + le duoi). Giai ra: bia <= 50vh - 378px. Tru thanh 400 cho du 45px
        du phong — ten album dai hai dong hay hang nut vo doi la con cho.

        Chi chan tu 1536px tro len: duoi moc do ca trang cuon binh thuong
        (nguyen tac 45), khong co gi de cat nen anh bia cu de to cho de nhin.
        `min-h-28` la san: man qua thap thi cung khong bop bia thanh mot vach.
      */}
      <Link
        href={`/g/${gallery.slug}`}
        title={`/g/${gallery.slug} · tạo ngày ${new Date(gallery.createdAt).toLocaleDateString("vi-VN")}`}
        className="relative block aspect-[3/2] overflow-hidden bg-bg-soft 2xl:max-h-[calc(50vh-400px)] 2xl:min-h-28"
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
          Nhan "khach da chon xong" nam TREN anh bia, khong con dung canh ten
          album nua (21/09/2026).

          Ly do la chieu cao: dung canh ten thi the nao cung day ten xuong dong
          thu hai — do duoc the cao them 30px, va chi can the nao trong sau the
          dau co nhan la hang thu hai bi o cuon cat mat. Nam de len anh bia thi
          khong ton them mot ly chieu cao nao ca.

          Van la thu de thay nhat trong the: nen den trong mo tren anh sang.
          Moi thu muc khach bao xong van la MOT nhan rieng nhu cu — album nam
          sau thu muc thi studio phai biet khach vua xong cai nao.
        */}
        {mucXong.length > 0 && (
          <div className="absolute right-2 bottom-2 left-2 flex flex-wrap items-center justify-start gap-1.5">
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
                {/*
                  Nhan PHAI mang chu "Da chon xong", khong chi ten thu muc.

                  Truoc day nhan chi ghi "file gốc" — y nghia nam trong tooltip,
                  phai RE CHUOT moi thay. Tren dien thoai khong re duoc, ma day
                  lai la thu studio can liec mot cai la biet: nha nao xong roi,
                  san sang giao in.

                  Album mot thu muc thi bo ten di: da biet la album nao roi,
                  them ten thu muc chi lam nhan dai ra ma khong noi them gi.
                  Album nhieu thu muc thi ten la phan quan trong nhat — no tra
                  loi "xong CAI NAO trong tam cai".
                */}
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
        <TenAlbum
          galleryId={gallery.id}
          slug={gallery.slug}
          ten={title}
          tenThuMuc={gallery.title}
        />

        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-fg-muted">
          <Stat icon="photo" value={gallery.photoCount} label="Số ảnh" />
          {/*
            Ten cac thu muc con chuyen han vao chu thich cua chinh con so nay
            (21/09/2026). Truoc do chung dung rieng mot dong chu nho duoi hang
            so lieu, an 24px chieu cao cua MOI the — ma do la dong it nguoi doc
            nhat: can biet ten thu muc thi bam vao album xem.
          */}
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

          {/*
            Trang thai gui tin ve NAM CHUNG hang so lieu, day ve mep phai
            (21/09/2026). No von dung rieng mot dong duoi cung the, ton 26px.
            Hang so lieu chi dung het chung mot phan ba be ngang the nen con
            thua cho; `ml-auto` day sang phai de mat van doc thanh hai cum.
            Chat qua thi `flex-wrap` tu cho no xuong dong — khong bi cat cut.
          */}
          {trangThaiBaoTin && (
            <span
              className={`ml-auto text-[11px] ${
                trangThaiBaoTin.mau === "xong" ? "text-accent" : "text-fg-faint"
              }`}
              title={trangThaiBaoTin.giaiThich}
            >
              {trangThaiBaoTin.chu}
            </span>
          )}
        </div>

        {/*
          Bon dong cai dat gop vao mot khung, cung do rong nhan (w-24 o tung
          component con) de thang cot — truoc day moi thu tu them mot dong
          rieng voi mt-2 cua rieng no, xep chong len nhau khong thang hang,
          nhin nhu mot danh sach roi rac thay vi mot bang cai dat.
        */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-bg-soft px-3.5 py-2.5 text-sm text-fg-muted">
          <span className="min-w-0 truncate">
            Mã <span className="font-medium text-fg tabular-nums">{gallery.accessCode ?? "—"}</span>
            {" · "}
            {gallery.soAnhTrongGoi === null
              ? "chưa đặt gói"
              : gallery.soAnhTrongGoi === 0
                ? "gói chỉ lấy file"
                : `gói ${gallery.soAnhTrongGoi} ảnh`}
          </span>
          <button
            type="button"
            onClick={() => setMoCaiDat((m) => !m)}
            aria-expanded={moCaiDat}
            className="shrink-0 font-medium text-fg underline underline-offset-4 hover:text-accent"
          >
            {moCaiDat ? "Thu gọn" : "Cài đặt"}
          </button>
        </div>

        {moCaiDat && (
        <div className="mt-2 divide-y divide-line rounded-md border border-line px-3">
          <AccessControl galleryId={gallery.id} code={gallery.accessCode} />
          <LoiNhan galleryId={gallery.id} message={gallery.message} />
          <ThoiHan
            galleryId={gallery.id}
            createdAt={gallery.createdAt}
            expiresAt={gallery.expiresAt}
          />
          <GoiAnh
            galleryId={gallery.id}
            folderId={gallery.driveFolderId}
            soAnhTrongGoi={gallery.soAnhTrongGoi}
            giaAnhThem={gallery.giaAnhThem}
            goiMuc={goiMuc}
          />

          {/*
            HAI viec it dung hon don vao day (21/09/2026), de hang nut ngoai mat
            the con dung MOT dong — do la 52px moi the, nhan voi sau the la ca
            mot hang album.

            Chon theo so lan bam trong ngay, khong theo cam tinh: "Chép link"
            gan nhu luon thua vi "Chép tin nhắn" da co san link ben trong;
            "Xoá" thi ca thang moi mot lan. ("Làm mới" cung tung nam trong day,
            nhung anh bao dua tro ra hang ngoai ngay 21/09 — do la nut bam moi
            lan vua up them anh len Drive.)
          */}
          <div className="flex flex-wrap items-center gap-2 py-3">
            <CopyLink
              path={`/g/${gallery.slug}`}
              code={gallery.accessCode}
              expiresAt={gallery.expiresAt}
              hien="link"
            />

            {/* Chỉ quản lý được xoá album — xoá nhầm là mất cả lựa chọn ảnh của khách. */}
            {quanLy && (
              <button
                type="button"
                onClick={() => setMoXoa(true)}
                title={`Xoá album "${title}"`}
                className="btn btn-danger ml-auto"
              >
                Xoá
              </button>
            )}
          </div>
        </div>
        )}

        {/*
          BON nut, VUA DUNG MOT DONG — anh yeu cau 21/09/2026 dua "Làm mới" tro
          ra day.

          Do tren man 1920: long trong the rong 460px, bon nut de nguyen co cu
          het 515px nen vo thanh hai dong, ma hai dong la the cao them 52px va
          hang album thu hai lai bi cat (nguyen tac 45). Hai chu nho lai: khe
          `gap-1.5` thay `gap-2`, va `[&_.btn]:px-2.5` bop le hai ben moi nut
          `.btn` tu 0.8rem con 0.625rem. Chu tren nut khong cat chu nao.

          Them nut nua vao day thi phai do lai chieu cao hang nut (44px la mot
          dong, 96px la hai) truoc khi cho len web.
        */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 [&_.btn]:px-2.5">
          <CopyLink
            path={`/g/${gallery.slug}`}
            code={gallery.accessCode}
            expiresAt={gallery.expiresAt}
            hien="tin"
          />

          <Link href={`/admin/${gallery.slug}`} className="btn">
            Ảnh khách chọn
          </Link>

          <form action={refreshGalleryAction}>
            <input type="hidden" name="folderId" value={gallery.driveFolderId} />
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
        </div>
      </div>

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
