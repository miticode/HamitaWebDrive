import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { quyenAlbum } from "@/lib/quyenAlbum";
import {
  getGalleryBySlug,
  getLists,
  getSelections,
  type Selection,
} from "@/lib/store";
import { maSoFile } from "@/lib/anhIn";
import { lucGon } from "@/lib/constants";
import { goiYHopDong, hopDongCuaAlbum } from "@/lib/noiAlbum";
import { NutDoiTong } from "../NutDoiTong";
import { ExportButton } from "./ExportButton";
import { LuoiAnhChon } from "./LuoiAnhChon";
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

  const [lists, selections, hopDong] = await Promise.all([
    getLists(gallery.id),
    getSelections(gallery.id),
    hopDongCuaAlbum(gallery.id),
  ]);
  /*
    Chỉ đi tìm gợi ý khi CHƯA gắn hợp đồng: việc đó quét cả bảng hợp đồng để so
    tên, không có lý do làm lại mỗi lần mở một album đã gắn rồi.
  */
  const goiY = hopDong ? [] : await goiYHopDong(gallery.clientName ?? gallery.title);

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
              <div
                key={album}
                className={
                  thuTu === 0
                    ? "mt-6"
                    : "mt-14 border-t border-line-strong pt-10"
                }
              >
                {/*
                  Đầu mục DÍNH LẠI khi cuộn (`sticky top-0`).

                  Đây là thứ trả lời đúng câu hỏi "đang xem thư mục nào" ở
                  giữa một lưới trăm tấm: kẻ ngang chỉ nói được chỗ giáp ranh,
                  cuộn qua rồi thì không còn gì trên màn hình nhắc nữa.

                  Nền phải ĐẶC (`bg-bg`), không để trong suốt: ảnh chạy phía
                  dưới sẽ lộ qua và chữ không đọc nổi. Kéo rộng ra hai bên
                  bằng lề âm rồi bù lại bằng padding, để dải nền che trọn bề
                  ngang chứ không để ảnh ló ra ở mép.
                */}
                <div className="sticky top-0 z-10 -mx-5 bg-bg px-5 py-3 sm:-mx-6 sm:px-6">
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
                  </h3>
                </div>
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
              </div>
            ))}
          </section>
        );
      })}
    </main>
  );
}
