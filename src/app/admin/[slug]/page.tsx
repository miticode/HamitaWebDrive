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
import { goiYHopDong, hopDongCuaAlbum } from "@/lib/noiAlbum";
import { NutDoiTong } from "../NutDoiTong";
import { ExportButton } from "./ExportButton";
import { LuoiAnhChon } from "./LuoiAnhChon";
import { GanHopDong } from "./GanHopDong";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function gomTheoAlbum(anh: Selection[]) {
  const groups = new Map<string, Selection[]>();
  for (const a of anh) {
    const list = groups.get(a.albumName);
    if (list) list.push(a);
    else groups.set(a.albumName, [a]);
  }
  return [...groups.entries()];
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
                lines={gomTheoAlbum(anh).flatMap(([album, rows]) => [
                  `# ${album} (${rows.length} ảnh)`,
                  ...rows.map((r) => r.fileName),
                  "",
                ])}
                maSo={anh.map((r) => maSoFile(r.fileName)).join(" ")}
              />
            </div>

            {gomTheoAlbum(anh).map(([album, rows]) => (
              <div key={album} className="mt-6">
                <h3 className="eyebrow">
                  {album} · {rows.length} ảnh
                </h3>
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
