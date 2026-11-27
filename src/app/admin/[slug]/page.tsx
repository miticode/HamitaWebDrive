import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { quyenAlbum } from "@/lib/quyenAlbum";
import {
  getGalleryBySlug,
  getLists,
  getMucXong,
  getSelections,
  type Selection,
} from "@/lib/store";
import { maSoFile } from "@/lib/anhIn";
import { chuConLai, lucGon, ngayVietTat, soNgayToiHan } from "@/lib/constants";
import { goiYHopDong, hopDongCuaAlbum } from "@/lib/noiAlbum";
import { moiHopDongCuaAlbum } from "@/lib/albumChung";
import { tachTrangThai } from "@/lib/hopDongChung";
import { getPrisma } from "@/lib/db";
import { NutDoiTong } from "../NutDoiTong";
import { ExportButton, NutChep } from "./ExportButton";
import { LuoiAnhChon } from "./LuoiAnhChon";
import { KhoiMuc } from "./KhoiMuc";
import { GanHopDong } from "./GanHopDong";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/**
 * Gom ảnh theo thư mục con, THƯ MỤC KHÁCH CHỌN GẦN ĐÂY NHẤT ĐỨNG TRƯỚC.
 *
 * Anh yêu cầu 01/10/2026. Trước đó thứ tự là "thư mục nào có tấm đầu tiên
 * trong danh sách thì đứng trước" — tức theo thứ tự database trả về, không
 * mang nghĩa gì với người đang làm việc. Nhà nào cũng vài trăm tấm chia hai
 * ba thư mục, nên thư mục khách vừa động vào bị đẩy xuống tận đáy trang.
 *
 * Mốc so sánh là `createdAt` LỚN NHẤT trong thư mục — lần cuối khách thả tim
 * một tấm ở đó. Dùng lớn nhất chứ không phải nhỏ nhất: câu hỏi của studio là
 * "khách vừa làm gì", không phải "khách bắt đầu từ đâu".
 */
function gomTheoAlbum(anh: Selection[]) {
  const groups = new Map<string, Selection[]>();
  for (const a of anh) {
    const list = groups.get(a.albumName);
    if (list) list.push(a);
    else groups.set(a.albumName, [a]);
  }

  return [...groups.entries()]
    .map(([album, rows]) => ({
      album,
      rows,
      /*
        So chuỗi ISO thay vì dựng Date rồi so số: hai chuỗi ISO cùng dạng thì
        so chữ ra đúng thứ tự thời gian, mà không tạo vài trăm đối tượng Date
        chỉ để tìm một con số lớn nhất.
      */
      moiNhat: rows.reduce((m, r) => (r.createdAt > m ? r.createdAt : m), rows[0].createdAt),
    }))
    .sort((a, b) => b.moiNhat.localeCompare(a.moiNhat));
}

export default async function ResultsPage({ params }: Props) {
  const { slug } = await params;
  if (!(await quyenAlbum())) {
    redirect(`/quan-ly/dang-nhap?tiep=${encodeURIComponent(`/admin/${slug}`)}`);
  }
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) notFound();

  const [lists, selections, hopDong, dsXong] = await Promise.all([
    getLists(gallery.id),
    getSelections(gallery.id),
    hopDongCuaAlbum(gallery.id),
    getMucXong(gallery.id),
  ]);

  /*
    Han lay hinh khach hen, tra theo TEN thu muc (anh yeu cau 05/11/2026).

    Tra theo ten chu khong theo albumId vi trang nay gom anh theo ten thu muc
    luu trong tung lua chon — khong co ma thu muc o day. Doi ten thu muc tren
    Drive thi han roi khoi cho, nhung `setMucXong` cap nhat ten moi lan khach
    bam nen hai ben khop lai ngay lan bao sau.
  */
  const hanTheoMuc = new Map(
    dsXong.filter((m) => m.hanLay).map((m) => [m.tenMuc, m.hanLay as string])
  );
  /*
    Chỉ đi tìm gợi ý khi CHƯA gắn hợp đồng: việc đó quét cả bảng hợp đồng để so
    tên, không có lý do làm lại mỗi lần mở một album đã gắn rồi.
  */
  const goiY = hopDong ? [] : await goiYHopDong(gallery.clientName ?? gallery.title);

  /*
    Mọi hợp đồng dùng chung album, trừ cái đã hiện ở khối gắn ngay trên.
    Đọc tên và bước bằng MỘT lượt, không mỗi hợp đồng một lượt.
  */
  const phan = await moiHopDongCuaAlbum(gallery.id);
  const khacId = phan.map((x) => x.hopDongId).filter((id) => id !== hopDong?.id);
  const chiTiet = khacId.length
    ? await getPrisma().hopDong.findMany({
        where: { id: { in: khacId } },
        select: { id: true, tenKhach: true, loaiDV: true, trangThai: true },
      })
    : [];
  const hopDongKhac = chiTiet.map((h) => ({
    ...h,
    thuMuc: phan.find((x) => x.hopDongId === h.id)?.thuMuc ?? [],
  }));

  // Cung mot cookie voi layout — doc lai de nut hien dung bieu tuong ngay luot dau.
  const tongToi = (await cookies()).get("admin-tong")?.value === "toi";

  return (
    <main className="mx-auto w-full max-w-[128rem] px-5 py-10 sm:px-6 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin" className="eyebrow transition hover:text-accent">
          ← Tất cả album
        </Link>
        <NutDoiTong toiBanDau={tongToi} />
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-6">
        <h1 className="font-display text-2xl font-light sm:text-3xl">
          Ảnh khách chọn — {gallery.clientName ?? gallery.title}
        </h1>
        {selections.length > 0 && (
          <a
            href={`/api/admin/export?slug=${encodeURIComponent(gallery.slug)}`}
            className="btn"
            title="Tải file Excel liệt kê danh sách, thư mục, tên ảnh và ghi chú của mọi ảnh đã chọn"
          >
            Xuất Excel
          </a>
        )}
        {selections.length > 0 && (
          /*
            Nút chính của trang này. Xuất Excel là để lưu đối chiếu, còn đơn
            giao in mới là thứ đưa cho người khác làm — nên nó nổi hơn.
          */
          <Link
            href={`/admin/${gallery.slug}/don-in`}
            className="btn-primary"
            title="Tờ giao cho bên in ảnh: chỉ ảnh phải in, kèm mã số, ghi chú cỡ in và tiền phát sinh"
          >
            Đơn giao in
          </Link>
        )}
      </div>

      <GanHopDong galleryId={gallery.id} dangGan={hopDong} goiY={goiY} />

      {/*
        CÁC HỢP ĐỒNG KHÁC DÙNG CHUNG ALBUM NÀY — anh chốt 27/11/2026.

        Từ khi khách book lần sau dùng lại album cũ (để khỏi cài app lần nữa),
        một album có thể mang ảnh của mấy lần chụp cách nhau hàng năm. Khối
        trên chỉ hiện hợp đồng ĐẦU TIÊN; không bày phần còn lại thì người mở
        album ra thấy mục "Baby - Ngọc Thuỳ" mà không biết nó thuộc hợp đồng
        nào, và vì sao nó nằm ở đây.

        Kèm luôn TÊN THƯ MỤC của từng hợp đồng: đó chính là thứ web dùng để
        biết khách bấm "đã chọn xong" ở mục nào thì hợp đồng nào nhảy bước
        (xem `hopDongChoThaoTac`). Bày ra thì gắn sai còn nhìn thấy mà sửa.
      */}
      {hopDongKhac.length > 0 && (
        <div className="mt-3 rounded-md border border-line bg-bg-raised px-4 py-3 text-sm">
          <p className="eyebrow">Còn dùng chung với</p>
          <ul className="mt-2 grid gap-2">
            {hopDongKhac.map((h) => {
              const { buoc, ten } = tachTrangThai(h.trangThai);
              return (
                <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link
                    href={`/quan-ly/hop-dong/${h.id}`}
                    className="font-medium hover:text-accent"
                  >
                    {h.tenKhach}
                  </Link>
                  <span className="text-xs text-fg-muted">
                    {[h.loaiDV, buoc ? `bước ${buoc}. ${ten}` : ten].filter(Boolean).join(" · ")}
                  </span>
                  <span className="text-xs text-fg-faint">
                    {h.thuMuc.length ? h.thuMuc.join(" · ") : "chưa gắn thư mục nào"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {selections.length === 0 && (
        <p className="mt-10 text-sm text-fg-muted">Khách chưa chọn ảnh nào.</p>
      )}

      {lists.map((list) => {
        const anh = [...selections]
          .filter((s) => s.listId === list.id)
          .sort((a, b) => a.fileName.localeCompare(b.fileName, "vi"));
        if (anh.length === 0) return null;

        return (
          <section key={list.id} className="mt-12">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-light">
                <span
                  className="mr-2 inline-block size-2.5 rounded-full align-middle bg-rose-500"
                />
                {list.name}
                <span className="ml-2 text-lg text-fg-muted">
                  {anh.length} ảnh
                </span>
                {/*
                  So tam co loi dan, dat ngay canh so anh.

                  Loi dan la thu DUY NHAT tren trang nay khong doan duoc tu anh:
                  nhin tam anh thi biet khach chon gi, nhung "in cỡ 40x60" hay
                  "bóp eo" thi khong nhin ra. Neu phai luot het luoi moi biet co
                  ai dan gi khong thi se co hom bo sot — nen dem san o day.
                */}
                {anh.some((a) => a.note) && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-1 align-middle text-xs text-amber-900">
                    {anh.filter((a) => a.note).length} lời dặn
                  </span>
                )}
              </h2>
              <ExportButton
                fileName={`${gallery.slug}-${list.name}`}
                lines={gomTheoAlbum(anh).flatMap(({ album, rows }) => [
                  `# ${album} (${rows.length} ảnh)`,
                  ...rows.map((r) => r.fileName),
                  "",
                ])}
                maSo={anh.map((r) => maSoFile(r.fileName)).join(" ")}
              />
            </div>

            {gomTheoAlbum(anh).map(({ album, rows, moiNhat }, thuTu) => (
              /*
                MỖI THƯ MỤC LÀ MỘT KHỐI CÓ RANH GIỚI NHÌN THẤY ĐƯỢC.

                Anh yêu cầu 01/10/2026: "khó nhìn file nào với file nào". Trước
                đó ranh giới giữa hai thư mục chỉ là một dòng chữ `.eyebrow` cỡ
                11px màu nhạt, đặt cách lưới trên đúng 24px — nhà này 224 tấm
                chia hai thư mục, cuộn qua chỗ giáp ranh là không kịp nhận ra
                mình đã sang thư mục khác.

                Ba thứ cùng làm nên ranh giới, bỏ một thứ là yếu hẳn:
                - đường kẻ ĐẬM (`border-line-strong`) chạy hết bề ngang, trừ
                  khối đầu tiên (ở đó đã có đầu mục danh sách ngay trên);
                - khoảng trống rộng gấp đôi lúc trước (mt-14 thay cho mt-6);
                - tên thư mục in bằng phông tiêu đề cỡ lớn, không còn là nhãn
                  nhỏ màu nhạt.
              */
              /*
                Khối thư mục THU GỌN ĐƯỢC từ 19/11/2026 — anh yêu cầu. Phần
                khung, đầu mục dính và nút thu gọn chuyển sang `KhoiMuc` vì
                việc đóng/mở phải chạy ở máy khách; nội dung đầu mục vẫn dựng
                ở đây và truyền xuống.
              */
              <KhoiMuc
                key={album}
                thuTu={thuTu}
                soAnh={rows.length}
                dauMuc={
                  <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-display text-xl font-light text-fg sm:text-2xl">
                      {album}
                    </span>
                    <span className="eyebrow">{rows.length} ảnh</span>
                    {/*
                      In luôn mốc đã dùng để xếp thứ tự. Studio thấy thư mục
                      này nhảy lên đầu thì biết ngay vì sao, và biết khách vừa
                      động vào lúc nào — không phải đoán từ một thứ tự im lặng.
                    */}
                    <span className="text-xs text-fg-faint">
                      khách chọn gần nhất {lucGon(moiNhat)}
                    </span>

                    {/*
                      HAN LAY HINH khach hen (anh yeu cau 05/11/2026). Dat ngay
                      canh ten thu muc vi day la trang Media ngoi lam viec —
                      the album o luoi ngoai chi de liec, con cho quyet dinh
                      lam cai nao truoc la o day.

                      Tre han thi do han, khong chi doi chu: trong mot trang
                      toan chu xam, mau la thu duy nhat ngan duoc viec luot qua.
                    */}
                    {(() => {
                      const han = hanTheoMuc.get(album);
                      if (!han) return null;
                      const tre = soNgayToiHan(han) < 0;
                      return (
                        <span
                          title={`Khách cần lấy hình ngày ${ngayVietTat(han)}`}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            tre
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          cần lấy {ngayVietTat(han)} · {chuConLai(han)}
                        </span>
                      );
                    })()}

                    {/*
                      Nút chép mã số của RIÊNG thư mục này (anh yêu cầu
                      08/10/2026). Nút ở đầu trang chép mã số cả album — nhà
                      này hai thư mục là ra 238 tấm một lượt, trong khi việc
                      studio làm là đem từng thư mục đi dò ảnh gốc, mà hai thư
                      mục nằm ở hai chỗ khác nhau trên Drive.

                      Đặt ngay trong đầu mục dính (sticky) chứ không để dưới
                      lưới: thư mục vài trăm tấm thì cuộn tới cuối mới gặp nút,
                      còn ở đây nó đi theo màn hình suốt lúc studio đang xem
                      đúng thư mục đó.

                      Mã số lấy theo rows — cùng thứ tự TÊN FILE với danh sách
                      chép ở trên, không phải thứ tự hiển thị (tấm có lời dặn
                      được đẩy lên đầu lưới). Bên in dò file theo tên, nên hai
                      chỗ chép phải cho ra cùng một dãy.
                    */}
                    <NutChep
                      /*
                        NỀN ĐẬM — anh yêu cầu làm nổi bật hơn (08/10/2026).

                        Bản đầu em truyền mỗi `btn-gon`, mà lớp đó CHỈ đổi cỡ
                        chữ và chiều cao chứ không mang viền hay nền nào, nên
                        nút trông y như một dòng chữ xám nằm cạnh ngày tháng.
                        Lỗi của em: `.btn-gon` luôn phải đi kèm một lớp nền.

                        Thử bản tô MÀU NHẤN (viền + chữ #9c7c4f trên nền
                        #f3ede2) và bỏ: đo ra tương phản chữ chỉ **3,33**,
                        dưới mức 4,5 cho chữ nhỏ — đúng cái bẫy đã ghi ở
                        nguyên tắc 25 ("chữ trắng trên #9c7c4f chỉ 3,9:1").
                        Nền đậm đo lại được **16,53** ở tông sáng và **15,24**
                        ở tông tối, nơi nút tự đảo thành nền sáng chữ đen.

                        Không sợ lấn tên thư mục: nút chữ 12px cạnh tiêu đề
                        24px, đo ở 1200px thì nút chỉ 117×32px.
                      */
                      lop="btn-primary min-h-11 gap-1.5 px-3 text-[0.78125rem] sm:min-h-8 sm:px-2.5 sm:py-1 sm:text-xs"
                      nhan={
                        <>
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="size-3.5 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="9" y="9" width="11" height="11" rx="2" />
                            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                          </svg>
                          Chép mã số
                        </>
                      }
                      text={rows.map((r) => maSoFile(r.fileName)).join(" ")}
                    />
                  </h3>
                }
              >
                {/*
                  Lưới tách ra component riêng vì bấm xem to cần chạy ở máy
                  khách. Truyền theo TỪNG NHÓM thư mục chứ không phải cả danh
                  sách: mũi tên trái/phải trong khung xem to chạy trong đúng
                  nhóm đang mở, nên studio lướt hết một thư mục là dừng, không
                  trôi sang thư mục khác lúc nào không hay.

                  Tấm có lời dặn đưa lên đầu thư mục (anh Hamita yêu cầu
                  15/09): lời dặn là việc phải làm thêm, nằm lẫn giữa ba chục
                  tấm thì dễ sót. Các tấm còn lại vẫn theo tên file — sort của
                  JavaScript giữ nguyên thứ tự cũ khi hai tấm ngang nhau. Chỉ
                  đổi chỗ HIỂN THỊ; danh sách tên file để chép vẫn theo tên,
                  vì bên in dò file theo tên.
                */}
                <LuoiAnhChon
                  anh={[...rows]
                    .sort((a, b) => Number(!a.note) - Number(!b.note))
                    .map((r) => ({
                    id: r.id,
                    driveFileId: r.driveFileId,
                    fileName: r.fileName,
                    note: r.note,
                  }))}
                />
              </KhoiMuc>
            ))}
          </section>
        );
      })}
    </main>
  );
}
